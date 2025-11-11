#!/usr/bin/env python3

"""Barebones schedule builder using Z3.

Reads schedule entities (classes, teachers, classrooms, subjects, time slots)
from STDIN as JSON and finds a non-conflicting assignment using Z3. The solver
is intentionally simple: it creates one lesson per subject (limited by the
number of available time slots) and assigns a class, teacher and classroom while
ensuring that no teacher, class or room is double-booked for the same slot.

Expected input JSON structure:

{
  "classes": [{"name": "Class A"}, ...],
  "teachers": [{"name": "Teacher 1"}, ...],
  "classrooms": [{"name": "Room 101"}, ...],
  "subjects": [{"name": "Math"}, ...],
  "timeSlots": [
    {"day": "Monday", "start": "08:00", "end": "09:00"},
    ...
  ]
}

The script returns a JSON payload containing the assignments and a schedule
structure grouped by day with minute-based positions suitable for
SimpleSchedule.vue.
"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from z3 import And, AtMost, Implies, Int, Or, Solver, Z3Exception, sat
except ImportError as err:  # pragma: no cover - dependency error surfaced to caller
    sys.stdout.write(
        json.dumps(
            {
                "success": False,
                "error": "Z3 Python bindings are not installed",
                "details": str(err),
                "hint": "Install the z3-solver package: pip install z3-solver",
            }
        )
    )
    sys.exit(0)


WEEKDAY_ALIASES = {
    "monday": 0,
    "mon": 0,
    "måndag": 0,
    "tisdag": 1,
    "tuesday": 1,
    "tue": 1,
    "onsdag": 2,
    "wednesday": 2,
    "wed": 2,
    "torsdag": 3,
    "thursday": 3,
    "thu": 3,
    "fre": 4,
    "fredag": 4,
    "friday": 4,
    "fri": 4,
    "lördag": 5,
    "lordag": 5,
    "lör": 5,
    "saturday": 5,
    "sat": 5,
    "söndag": 6,
    "sondag": 6,
    "sön": 6,
    "sunday": 6,
    "sun": 6,
}

CANONICAL_WEEKDAY_NAMES = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}


def _append_unique(items: List[str], value: Optional[str]) -> None:
    if not value:
        return
    if value not in items:
        items.append(value)


def _coerce_positive_int(value: Any, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{field_name}' must be a positive integer") from None
    if parsed <= 0:
        raise ValueError(f"'{field_name}' must be greater than zero")
    return parsed


def _coerce_non_negative_int(value: Any, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{field_name}' must be a non-negative integer") from None
    if parsed < 0:
        raise ValueError(f"'{field_name}' must be zero or greater")
    return parsed


def _minutes_to_clock(total_minutes: int) -> str:
    hours, minutes = divmod(int(total_minutes), 60)
    return f"{hours:02d}:{minutes:02d}"


def _day_name_to_index(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    normalized = value.strip().lower()
    return WEEKDAY_ALIASES.get(normalized)


def _read_input() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        raise ValueError("No input received by solver")
    return json.loads(raw)


def _extract_name(item: Any, *, strict: bool = False, field_name: str = "") -> str:
    name = ""
    if isinstance(item, str):
        name = item.strip()
    elif isinstance(item, dict):
        raw_name = item.get("name")
        if isinstance(raw_name, str):
            name = raw_name.strip()

    if strict and not name:
        context = f" for {field_name}" if field_name else ""
        raise ValueError(f"Expected a non-empty 'name'{context}")

    return name


def _parse_minutes(value: str) -> int:
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time value: {value}")
    hour, minute = parts
    return int(hour) * 60 + int(minute)


def _prepare_term_configuration(term_data: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(term_data, dict):
        raise ValueError("Term configuration must be provided as an object")

    name = str(term_data.get("name") or term_data.get("label") or "").strip() or None

    start_str = term_data.get("startDate") or term_data.get("start_date")
    if not isinstance(start_str, str) or not start_str.strip():
        raise ValueError("Term configuration requires a 'startDate' in YYYY-MM-DD format")
    try:
        start_date = datetime.strptime(start_str.strip(), "%Y-%m-%d").date()
    except ValueError as err:
        raise ValueError("Term 'startDate' must be provided in YYYY-MM-DD format") from err

    weeks_value = (
        term_data.get("weeks")
        or term_data.get("lengthWeeks")
        or term_data.get("weekCount")
        or term_data.get("numberOfWeeks")
        or 2
    )
    weeks = _coerce_positive_int(weeks_value, "term.weeks")

    days_raw = term_data.get("days") or term_data.get("weekdays")
    if not days_raw:
        days_raw = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    sanitized_days: List[Dict[str, Any]] = []
    seen_indexes = set()
    for item in days_raw:
        idx = _day_name_to_index(str(item))
        if idx is None:
            continue
        if idx >= 5:  # skip weekends for default Swedish school week
            continue
        if idx in seen_indexes:
            continue
        seen_indexes.add(idx)
        sanitized_days.append({"label": CANONICAL_WEEKDAY_NAMES[idx], "index": idx})

    if not sanitized_days:
        raise ValueError("Term 'days' must include at least one valid weekday between Monday and Friday")

    slot_templates = term_data.get("dailySlots") or term_data.get("slots")
    if not slot_templates:
        slot_templates = [
            {"start": "08:30", "end": "09:30"},
            {"start": "09:45", "end": "10:45"},
            {"start": "11:00", "end": "12:00"},
            {"start": "12:45", "end": "13:45"},
            {"start": "14:00", "end": "15:00"},
            {"start": "15:15", "end": "16:15"},
        ]

    sanitized_slots: List[Dict[str, Any]] = []
    for raw_slot in slot_templates:
        if isinstance(raw_slot, dict):
            start = raw_slot.get("start")
            end = raw_slot.get("end")
        elif isinstance(raw_slot, (list, tuple)) and len(raw_slot) >= 2:
            start, end = raw_slot[:2]
        else:
            continue

        if not (isinstance(start, str) and isinstance(end, str)):
            continue

        start_minutes = _parse_minutes(start)
        end_minutes = _parse_minutes(end)
        if end_minutes <= start_minutes:
            raise ValueError(f"Daily slot end time must be after start time ({start} - {end})")

        sanitized_slots.append(
            {
                "start": start,
                "end": end,
                "start_minutes": start_minutes,
                "end_minutes": end_minutes,
                "duration": end_minutes - start_minutes,
            }
        )

    if not sanitized_slots:
        raise ValueError("Term requires at least one valid daily slot with start and end times")

    return {
        "name": name,
        "start_date": start_date,
        "weeks": weeks,
        "days": sanitized_days,
        "slots": sanitized_slots,
    }


def _sanitize_lesson_templates(raw_templates: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_templates, list):
        raise ValueError("lessonTemplates must be provided as an array")

    sanitized: List[Dict[str, Any]] = []
    for idx, item in enumerate(raw_templates):
        if not isinstance(item, dict):
            continue

        class_name = _extract_name(
            item.get("class") or item.get("className"),
            strict=True,
            field_name=f"lessonTemplates[{idx}].class",
        )
        teacher_name = _extract_name(
            item.get("teacher") or item.get("teacherName"),
            strict=True,
            field_name=f"lessonTemplates[{idx}].teacher",
        )
        subject_name = _extract_name(
            item.get("subject") or item.get("subjectName"),
            strict=True,
            field_name=f"lessonTemplates[{idx}].subject",
        )

        if not (class_name and teacher_name and subject_name):
            raise ValueError(
                f"lessonTemplates[{idx}] requires non-empty 'class', 'teacher', and 'subject' fields"
            )

        sessions_value = (
            item.get("sessionsPerWeek")
            or item.get("lessonsPerWeek")
            or item.get("weeklyLessons")
            or item.get("frequencyPerWeek")
        )
        if sessions_value is None:
            raise ValueError(f"lessonTemplates[{idx}] is missing 'sessionsPerWeek'")
        duration_value = item.get("durationMinutes") or item.get("duration") or item.get("lengthMinutes")
        if duration_value is None:
            raise ValueError(f"lessonTemplates[{idx}] is missing 'durationMinutes'")

        sessions_per_week = _coerce_positive_int(
            sessions_value, f"lessonTemplates[{idx}].sessionsPerWeek"
        )
        duration_minutes = _coerce_positive_int(
            duration_value, f"lessonTemplates[{idx}].durationMinutes"
        )

        preferred_room = _extract_name(
            item.get("preferredRoom") or item.get("room") or item.get("classroom")
        )

        allowed_rooms_raw = item.get("allowedRooms") or item.get("rooms") or []
        if isinstance(allowed_rooms_raw, (str, int, float)):
            allowed_rooms_raw = [allowed_rooms_raw]

        allowed_rooms: List[str] = []
        for room_item in allowed_rooms_raw:
            room_name = _extract_name(room_item)
            if room_name:
                allowed_rooms.append(room_name)

        sanitized.append(
            {
                "className": class_name,
                "teacherName": teacher_name,
                "subjectName": subject_name,
                "sessionsPerWeek": sessions_per_week,
                "duration": duration_minutes,
                "preferredRoom": preferred_room,
                "allowedRooms": allowed_rooms,
            }
        )

    if not sanitized:
        raise ValueError("lessonTemplates must include at least one valid entry")

    return sanitized


def _build_term_time_slots(term_cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    start_date = term_cfg["start_date"]
    weeks = term_cfg["weeks"]
    days = term_cfg["days"]
    slot_templates = term_cfg["slots"]

    first_week_dates = {}
    for day in days:
        index = day["index"]
        offset = (index - start_date.weekday()) % 7
        first_week_dates[day["label"]] = start_date + timedelta(days=offset)

    time_slots: List[Dict[str, Any]] = []
    for week_index in range(weeks):
        for day in days:
            base_date = first_week_dates[day["label"]] + timedelta(days=week_index * 7)
            day_key = base_date.strftime("%Y-%m-%d")

            for slot in slot_templates:
                time_slots.append(
                    {
                        "day": day_key,
                        "dayName": day["label"],
                        "dayIndex": day["index"],
                        "weekIndex": week_index,
                        "start": slot["start"],
                        "end": slot["end"],
                        "startMinutes": slot["start_minutes"],
                        "endMinutes": slot["end_minutes"],
                        "duration": slot["duration"],
                    }
                )

    return time_slots


def _normalize_entities(data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    weekend_aliases = {
        "sat": "Saturday",
        "saturday": "Saturday",
        "sun": "Sunday",
        "sunday": "Sunday",
    }

    def is_weekend(day_value: str) -> bool:
        normalized = (day_value or "").strip().lower()
        mapped = weekend_aliases.get(normalized)
        if mapped:
            return mapped in {"Saturday", "Sunday"}
        if len(normalized) == 10 and normalized[4] == "-" and normalized[7] == "-":
            try:
                parsed = datetime.strptime(normalized, "%Y-%m-%d")
                return parsed.weekday() >= 5
            except ValueError:
                return False
        return normalized in {"saturday", "sunday"}
    classes = [_extract_name(item) for item in data.get("classes", [])]
    teachers = [_extract_name(item) for item in data.get("teachers", [])]
    classrooms = [_extract_name(item) for item in data.get("classrooms", [])]
    subjects = [_extract_name(item) for item in data.get("subjects", [])]

    raw_slots = data.get("timeSlots", [])
    time_slots = []
    for slot in raw_slots:
        if isinstance(slot, dict):
            start = slot.get("start")
            end = slot.get("end")
            if not (isinstance(start, str) and isinstance(end, str)):
                continue
            day = slot.get("day")
            if not isinstance(day, str):
                day = "Monday"
            else:
                if is_weekend(day):
                    continue
        elif isinstance(slot, list) and len(slot) >= 2:
            start, end = slot[:2]
            day = slot[2] if len(slot) > 2 else "Monday"
            if not (isinstance(start, str) and isinstance(end, str)):
                continue
            if is_weekend(str(day)):
                continue
        else:
            continue

        start_minutes = _parse_minutes(start)
        end_minutes = _parse_minutes(end)
        if end_minutes <= start_minutes:
            continue
        time_slots.append(
            {
                "day": day.strip() or "Monday",
                "start": start,
                "end": end,
                "startMinutes": start_minutes,
                "endMinutes": end_minutes,
            }
        )

    return {
        "classes": [c for c in classes if c],
        "teachers": [t for t in teachers if t],
        "classrooms": [r for r in classrooms if r],
        "subjects": [s for s in subjects if s],
        "timeSlots": time_slots,
    }


def _validate_entities(entities: Dict[str, List[Any]]) -> None:
    for key in ("classes", "teachers", "classrooms", "subjects", "timeSlots"):
        if not entities[key]:
            raise ValueError(f"Solver requires at least one entry in '{key}'")


def _solve_basic(data: Dict[str, Any], *, debug: bool = False) -> Dict[str, Any]:
    entities = _normalize_entities(data)
    _validate_entities(entities)

    classes = entities["classes"]
    teachers = entities["teachers"]
    classrooms = entities["classrooms"]
    subjects = entities["subjects"]
    time_slots = entities["timeSlots"]

    lesson_count = min(len(subjects), len(time_slots))
    if lesson_count == 0:
        raise ValueError("Not enough subjects or time slots to build a schedule")

    lessons = []
    for idx in range(lesson_count):
        lessons.append(
            {
                "index": idx,
                "subject": subjects[idx],
                "classIndex": idx % len(classes),
            }
        )

    solver = Solver()
    debug_enabled = bool(debug)
    constraint_id = 0

    def add_constraint(expr, label: str) -> None:
        nonlocal constraint_id
        if debug_enabled:
            name = f"{label}_{constraint_id}"
            constraint_id += 1
            solver.assert_and_track(expr, name)
        else:
            solver.add(expr)

    slot_vars = [Int(f"slot_{i}") for i in range(lesson_count)]
    teacher_vars = [Int(f"teacher_{i}") for i in range(lesson_count)]
    room_vars = [Int(f"room_{i}") for i in range(lesson_count)]

    max_slot = len(time_slots) - 1
    max_teacher = len(teachers) - 1
    max_room = len(classrooms) - 1

    for i in range(lesson_count):
        add_constraint(
            And(slot_vars[i] >= 0, slot_vars[i] <= max_slot),
            f"basic_slot_bounds_{i}",
        )
        add_constraint(
            And(teacher_vars[i] >= 0, teacher_vars[i] <= max_teacher),
            f"basic_teacher_bounds_{i}",
        )
        add_constraint(
            And(room_vars[i] >= 0, room_vars[i] <= max_room),
            f"basic_room_bounds_{i}",
        )

    for i in range(lesson_count):
        for j in range(i + 1, lesson_count):
            add_constraint(
                Or(slot_vars[i] != slot_vars[j], teacher_vars[i] != teacher_vars[j]),
                f"basic_teacher_slot_conflict_{i}_{j}",
            )
            add_constraint(
                Or(slot_vars[i] != slot_vars[j], room_vars[i] != room_vars[j]),
                f"basic_room_slot_conflict_{i}_{j}",
            )

            if lessons[i]["classIndex"] == lessons[j]["classIndex"]:
                add_constraint(
                    slot_vars[i] != slot_vars[j],
                    f"basic_class_slot_conflict_{i}_{j}",
                )

    check_result = solver.check()
    if check_result != sat:
        debug_details = ""
        if debug_enabled:
            try:
                unsat_core = [str(item) for item in solver.unsat_core()]
            except Z3Exception:
                unsat_core = []
            stats = solver.statistics()
            stats_summary = {
                str(stats.get_key(i)): stats.get_key_value(i)
                for i in range(stats.size())
            }
            if unsat_core:
                debug_details += f" | UNSAT core: {unsat_core}"
            if stats_summary:
                debug_details += f" | stats: {stats_summary}"
        raise RuntimeError(
            "Z3 could not find a feasible schedule with the provided data" + debug_details
        )

    model = solver.model()

    assignments = []
    schedule_by_day: Dict[str, List[Dict[str, Any]]] = {}

    for lesson in lessons:
        idx = lesson["index"]
        slot_idx = model.eval(slot_vars[idx]).as_long()
        teacher_idx = model.eval(teacher_vars[idx]).as_long()
        room_idx = model.eval(room_vars[idx]).as_long()
        class_idx = lesson["classIndex"]

        slot = time_slots[slot_idx]
        teacher_name = teachers[teacher_idx]
        room_name = classrooms[room_idx]
        class_name = classes[class_idx]
        subject_name = lesson["subject"]

        assignment = {
            "subject": subject_name,
            "class": class_name,
            "teacher": teacher_name,
            "classroom": room_name,
            "timeSlot": {
                "day": slot["day"],
                "start": slot["start"],
                "end": slot["end"],
            },
        }
        assignments.append(assignment)

        schedule_entry = {
            "id": idx,
            "name": f"{subject_name} ({class_name})",
            "startMinutes": slot["startMinutes"],
            "duration": slot["endMinutes"] - slot["startMinutes"],
            "teacher": teacher_name,
            "classroom": room_name,
        }

        schedule_by_day.setdefault(slot["day"], []).append(schedule_entry)

    for day_entries in schedule_by_day.values():
        day_entries.sort(key=lambda item: item["startMinutes"])

    return {
        "success": True,
        "assignments": assignments,
        "scheduleByDay": schedule_by_day,
    }


def _solve_structured(data: Dict[str, Any], *, debug: bool = False) -> Dict[str, Any]:
    term_cfg = _prepare_term_configuration(data.get("term") or {})
    templates = _sanitize_lesson_templates(data.get("lessonTemplates") or [])

    constraints_cfg = data.get("constraints") if isinstance(data.get("constraints"), dict) else {}
    raw_max_class_idle = constraints_cfg.get("maxClassIdleMinutes")
    if raw_max_class_idle is not None:
        max_class_idle_minutes = _coerce_positive_int(raw_max_class_idle, "constraints.maxClassIdleMinutes")
    else:
        max_class_idle_minutes = 120

    raw_max_teacher_idle = constraints_cfg.get("maxTeacherIdleMinutes")
    if raw_max_teacher_idle is not None:
        max_teacher_idle_minutes = _coerce_positive_int(raw_max_teacher_idle, "constraints.maxTeacherIdleMinutes")
    else:
        max_teacher_idle_minutes = 180

    raw_max_class_sessions = constraints_cfg.get("maxClassSessionsPerDay")
    if raw_max_class_sessions is not None:
        max_class_sessions_per_day = _coerce_positive_int(
            raw_max_class_sessions, "constraints.maxClassSessionsPerDay"
        )
    else:
        max_class_sessions_per_day = 5

    raw_max_teacher_sessions = constraints_cfg.get("maxTeacherSessionsPerDay")
    if raw_max_teacher_sessions is not None:
        max_teacher_sessions_per_day = _coerce_positive_int(
            raw_max_teacher_sessions, "constraints.maxTeacherSessionsPerDay"
        )
    else:
        max_teacher_sessions_per_day = 3

    raw_pe_buffer = constraints_cfg.get("physicalEducationBufferMinutes")
    if raw_pe_buffer is not None:
        physical_education_buffer = _coerce_positive_int(
            raw_pe_buffer, "constraints.physicalEducationBufferMinutes"
        )
    else:
        physical_education_buffer = 15

    pe_subjects_raw = constraints_cfg.get("physicalEducationSubjects")
    if isinstance(pe_subjects_raw, list) and pe_subjects_raw:
        physical_education_subjects = {
            str(item).strip().lower() for item in pe_subjects_raw if str(item).strip()
        }
    else:
        physical_education_subjects = {
            "idrott",
            "idrott och hälsa",
            "physical education",
            "pe",
            "gymnastik",
        }

    raw_class_earliest_start = constraints_cfg.get("classEarliestStartMinutes")
    if raw_class_earliest_start is not None:
        earliest_class_start_minutes = _coerce_non_negative_int(
            raw_class_earliest_start, "constraints.classEarliestStartMinutes"
        )
    else:
        earliest_class_start_minutes = 8 * 60

    raw_class_latest_start = constraints_cfg.get("classLatestStartMinutes")
    if raw_class_latest_start is not None:
        latest_class_start_minutes = _coerce_non_negative_int(
            raw_class_latest_start, "constraints.classLatestStartMinutes"
        )
    else:
        latest_class_start_minutes = 10 * 60
    if latest_class_start_minutes < earliest_class_start_minutes:
        raise ValueError(
            "constraints.classLatestStartMinutes must be greater than or equal to constraints.classEarliestStartMinutes"
        )

    classes: List[str] = [_extract_name(item) for item in data.get("classes", []) if _extract_name(item)]
    teachers: List[str] = [_extract_name(item) for item in data.get("teachers", []) if _extract_name(item)]
    classrooms: List[str] = [
        _extract_name(item) for item in data.get("classrooms", []) if _extract_name(item)
    ]
    subjects: List[str] = [_extract_name(item) for item in data.get("subjects", []) if _extract_name(item)]

    available_time_slots = _build_term_time_slots(term_cfg)
    if not available_time_slots:
        raise ValueError("Term configuration did not produce any teaching time slots")

    slot_start_minutes = [slot["startMinutes"] for slot in available_time_slots]
    slot_signature_registry: Dict[tuple, int] = {}

    subject_color_index: Dict[str, int] = {}
    sessions: List[Dict[str, Any]] = []

    for template_index, template in enumerate(templates):
        _append_unique(classes, template["className"])
        _append_unique(teachers, template["teacherName"])
        _append_unique(subjects, template["subjectName"])

        allowed_rooms: List[str] = []
        for room_name in template["allowedRooms"]:
            if room_name not in allowed_rooms:
                allowed_rooms.append(room_name)
                _append_unique(classrooms, room_name)

        preferred_room = template["preferredRoom"]
        if preferred_room:
            _append_unique(classrooms, preferred_room)
            if preferred_room not in allowed_rooms:
                allowed_rooms.insert(0, preferred_room)

        color_seed = subject_color_index.setdefault(
            template["subjectName"], len(subject_color_index)
        )
        color_index = color_seed % 5

        for occurrence_index in range(template["sessionsPerWeek"]):
            for week_index in range(term_cfg["weeks"]):
                sessions.append(
                    {
                        "className": template["className"],
                        "teacherName": template["teacherName"],
                        "subjectName": template["subjectName"],
                        "duration": template["duration"],
                        "weekIndex": week_index,
                        "templateIndex": template_index,
                        "occurrenceIndex": occurrence_index,
                        "colorIndex": color_index,
                        "preferredRoom": preferred_room,
                        "roomDomainNames": allowed_rooms[:],
                        "requiresBufferAfter": template["subjectName"].strip().lower()
                        in physical_education_subjects,
                    }
                )

    if not classrooms:
        classrooms.append("Klassrum A")

    class_indices = {name: idx for idx, name in enumerate(classes)}
    teacher_indices = {name: idx for idx, name in enumerate(teachers)}
    room_indices = {name: idx for idx, name in enumerate(classrooms)}

    total_sessions = len(sessions)
    if total_sessions == 0:
        raise ValueError("lessonTemplates did not produce any sessions to schedule")

    for session in sessions:
        eligible_slots = [
            idx
            for idx, slot in enumerate(available_time_slots)
            if slot["weekIndex"] == session["weekIndex"]
            and slot["duration"] >= session["duration"]
        ]
        if not eligible_slots:
            raise ValueError(
                f"No available time slots for {session['subjectName']} ({session['className']}) "
                f"in week {session['weekIndex'] + 1}"
            )
        session["slotDomain"] = eligible_slots

        room_domain_names = session.get("roomDomainNames") or []
        if room_domain_names:
            room_domain = [room_indices[name] for name in room_domain_names if name in room_indices]
        else:
            room_domain = list(range(len(classrooms)))

        if not room_domain:
            room_domain = list(range(len(classrooms)))

        slot_day_pairs = []
        slot_domain_by_day: Dict[int, List[int]] = defaultdict(list)
        slot_signature_options: List[tuple] = []
        signature_values: List[int] = []
        for slot_index in session["slotDomain"]:
            slot_info = available_time_slots[slot_index]
            day_index = slot_info["dayIndex"]
            slot_day_pairs.append((slot_index, day_index))
            slot_domain_by_day[day_index].append(slot_index)

            signature_key = (day_index, slot_info["start"], slot_info["end"])
            signature_value = slot_signature_registry.setdefault(
                signature_key, len(slot_signature_registry)
            )
            slot_signature_options.append((slot_index, signature_value))
            signature_values.append(signature_value)

        session["roomDomain"] = room_domain
        session["slotDayPairs"] = slot_day_pairs
        session["slotDomainByDay"] = {day: slots[:] for day, slots in slot_domain_by_day.items()}
        session["slotSignatureOptions"] = slot_signature_options
        session["signatureDomain"] = list(dict.fromkeys(signature_values))
        session["possibleDays"] = set(slot_domain_by_day.keys())
        session["classIndex"] = class_indices[session["className"]]
        session["teacherIndex"] = teacher_indices[session["teacherName"]]
        session["bufferMinutes"] = physical_education_buffer if session["requiresBufferAfter"] else 0

    solver = Solver()
    debug_enabled = bool(debug)
    constraint_id = 0

    def add_constraint(expr, label: str) -> None:
        nonlocal constraint_id
        if debug_enabled:
            name = f"{label}_{constraint_id}"
            constraint_id += 1
            solver.assert_and_track(expr, name)
        else:
            solver.add(expr)

    slot_vars = [Int(f"slot_{i}") for i in range(total_sessions)]
    room_vars = [Int(f"room_{i}") for i in range(total_sessions)]
    day_vars = [Int(f"day_{i}") for i in range(total_sessions)]
    signature_vars = [Int(f"signature_{i}") for i in range(total_sessions)]

    class_slot_candidates: Dict[tuple, List[int]] = defaultdict(list)
    teacher_slot_candidates: Dict[tuple, List[int]] = defaultdict(list)
    room_slot_candidates: Dict[tuple, List[int]] = defaultdict(list)
    subject_sessions_by_week_class: Dict[tuple, List[int]] = defaultdict(list)
    teacher_day_candidates: Dict[tuple, List[int]] = defaultdict(list)
    class_day_candidates: Dict[tuple, List[int]] = defaultdict(list)
    template_occurrence_groups: Dict[tuple, List[int]] = defaultdict(list)

    def prohibit_large_idle_gaps(
        indices: List[int],
        day_index: int,
        max_idle_minutes: int,
        label_prefix: str,
    ) -> None:
        if max_idle_minutes is None:
            return
        threshold = max_idle_minutes
        relevant = []
        for idx in indices:
            day_slots = sessions[idx]["slotDomainByDay"].get(day_index, [])
            if day_slots:
                relevant.append((idx, day_slots))
        if len(relevant) <= 1:
            return

        for i in range(len(relevant)):
            idx_a, slots_a = relevant[i]
            duration_a = sessions[idx_a]["duration"]
            for j in range(i + 1, len(relevant)):
                idx_b, slots_b = relevant[j]
                duration_b = sessions[idx_b]["duration"]
                for slot_a in slots_a:
                    start_a = slot_start_minutes[slot_a]
                    end_a = start_a + duration_a
                    for slot_b in slots_b:
                        start_b = slot_start_minutes[slot_b]
                        end_b = start_b + duration_b

                        if start_b >= end_a:
                            gap = start_b - end_a
                            if gap > threshold:
                                add_constraint(
                                    Or(
                                        day_vars[idx_a] != day_index,
                                        day_vars[idx_b] != day_index,
                                        slot_vars[idx_a] != slot_a,
                                        slot_vars[idx_b] != slot_b,
                                    ),
                                    f"{label_prefix}_{idx_a}_{idx_b}_{slot_a}_{slot_b}_ab",
                                )
                        elif start_a >= end_b:
                            gap = start_a - end_b
                            if gap > threshold:
                                add_constraint(
                                    Or(
                                        day_vars[idx_a] != day_index,
                                        day_vars[idx_b] != day_index,
                                        slot_vars[idx_a] != slot_a,
                                        slot_vars[idx_b] != slot_b,
                                    ),
                                    f"{label_prefix}_{idx_a}_{idx_b}_{slot_a}_{slot_b}_ba",
                                )

    def enforce_transition_buffers(
        indices: List[int],
        day_index: int,
        label_prefix: str,
    ) -> None:
        requiring = [
            idx for idx in indices if sessions[idx]["bufferMinutes"] > 0
        ]
        if not requiring:
            return
        for idx_a in requiring:
            buffer_minutes = sessions[idx_a]["bufferMinutes"]
            slots_a = sessions[idx_a]["slotDomainByDay"].get(day_index, [])
            if not slots_a:
                continue
            duration_a = sessions[idx_a]["duration"]
            for idx_b in indices:
                if idx_a == idx_b:
                    continue
                slots_b = sessions[idx_b]["slotDomainByDay"].get(day_index, [])
                if not slots_b:
                    continue
                for slot_a in slots_a:
                    end_a = slot_start_minutes[slot_a] + duration_a
                    for slot_b in slots_b:
                        start_b = slot_start_minutes[slot_b]
                        if start_b < end_a:
                            continue
                        if start_b < end_a + buffer_minutes:
                            add_constraint(
                                Or(
                                    day_vars[idx_a] != day_index,
                                    day_vars[idx_b] != day_index,
                                    slot_vars[idx_a] != slot_a,
                                    slot_vars[idx_b] != slot_b,
                                ),
                                f"{label_prefix}_{idx_a}_{idx_b}_{slot_a}_{slot_b}",
                            )

    for idx, session in enumerate(sessions):
        slot_domain = session["slotDomain"]
        if len(slot_domain) == 1:
            add_constraint(slot_vars[idx] == slot_domain[0], f"slot_domain_fix_{idx}")
        else:
            add_constraint(
                Or(*[slot_vars[idx] == value for value in slot_domain]),
                f"slot_domain_{idx}",
            )

        room_domain = session["roomDomain"]
        if len(room_domain) == 1:
            add_constraint(room_vars[idx] == room_domain[0], f"room_domain_fix_{idx}")
        else:
            add_constraint(
                Or(*[room_vars[idx] == value for value in room_domain]),
                f"room_domain_{idx}",
            )

        signature_domain = session["signatureDomain"]
        if len(signature_domain) == 1:
            add_constraint(
                signature_vars[idx] == signature_domain[0],
                f"signature_domain_fix_{idx}",
            )
        else:
            add_constraint(
                Or(*[signature_vars[idx] == value for value in signature_domain]),
                f"signature_domain_{idx}",
            )

        for slot_index in session["slotDomain"]:
            if slot_start_minutes[slot_index] < earliest_class_start_minutes:
                add_constraint(
                    slot_vars[idx] != slot_index,
                    f"class_earliest_start_block_{idx}_{slot_index}",
                )

        duration_guards = [
            And(
                slot_vars[idx] == slot_index,
                available_time_slots[slot_index]["duration"] >= session["duration"],
            )
            for slot_index in slot_domain
        ]
        add_constraint(Or(*duration_guards), f"slot_duration_guard_{idx}")

        slot_signature_links = [
            And(slot_vars[idx] == slot_index, signature_vars[idx] == signature_value)
            for slot_index, signature_value in session["slotSignatureOptions"]
        ]
        add_constraint(Or(*slot_signature_links), f"slot_signature_link_{idx}")

        add_constraint(
            Or(
                *[
                    And(slot_vars[idx] == slot_index, day_vars[idx] == day_index)
                    for (slot_index, day_index) in session["slotDayPairs"]
                ]
            ),
            f"slot_day_link_{idx}",
        )

        subject_key = (session["classIndex"], session["weekIndex"], session["subjectName"])
        subject_sessions_by_week_class[subject_key].append(idx)

        template_occurrence_groups[
            (session["templateIndex"], session["occurrenceIndex"])
        ].append(idx)

        for slot_index in slot_domain:
            class_slot_candidates[(session["classIndex"], slot_index)].append(idx)
            teacher_slot_candidates[(session["teacherIndex"], slot_index)].append(idx)
            for room_index in session["roomDomain"]:
                room_slot_candidates[(room_index, slot_index)].append(idx)

        for day_index in session["possibleDays"]:
            teacher_day_candidates[(session["teacherIndex"], session["weekIndex"], day_index)].append(
                idx
            )
            class_day_candidates[(session["classIndex"], session["weekIndex"], day_index)].append(
                idx
            )

    for idx in range(total_sessions):
        add_constraint(
            And(day_vars[idx] >= 0, day_vars[idx] <= 6),
            f"day_bounds_{idx}",
        )

    for indices in template_occurrence_groups.values():
        if len(indices) <= 1:
            continue
        base_idx = indices[0]
        for other_idx in indices[1:]:
            add_constraint(
                signature_vars[other_idx] == signature_vars[base_idx],
                f"weekly_pattern_signature_{base_idx}_{other_idx}",
            )
            add_constraint(
                day_vars[other_idx] == day_vars[base_idx],
                f"weekly_pattern_day_{base_idx}_{other_idx}",
            )

    for indices in subject_sessions_by_week_class.values():
        if len(indices) > 1:
            for i in range(len(indices)):
                for j in range(i + 1, len(indices)):
                    add_constraint(
                        day_vars[indices[i]] != day_vars[indices[j]],
                        f"subject_day_spread_{indices[i]}_{indices[j]}",
                    )

    for (class_index, slot_index), indices in class_slot_candidates.items():
        if len(indices) <= 1:
            continue
        terms = [slot_vars[idx] == slot_index for idx in indices]
        add_constraint(
            AtMost(*terms, 1),
            f"class_slot_conflict_{class_index}_{slot_index}",
        )

    for (teacher_index, slot_index), indices in teacher_slot_candidates.items():
        if len(indices) <= 1:
            continue
        terms = [slot_vars[idx] == slot_index for idx in indices]
        add_constraint(
            AtMost(*terms, 1),
            f"teacher_slot_conflict_{teacher_index}_{slot_index}",
        )

    for (room_index, slot_index), indices in room_slot_candidates.items():
        if len(indices) <= 1:
            continue
        terms = [
            And(slot_vars[idx] == slot_index, room_vars[idx] == room_index)
            for idx in indices
        ]
        add_constraint(
            AtMost(*terms, 1),
            f"room_slot_conflict_{room_index}_{slot_index}",
        )

    for (teacher_index, week_index, day_index), indices in teacher_day_candidates.items():
        if len(indices) > max_teacher_sessions_per_day:
            terms = [day_vars[idx] == day_index for idx in indices]
            add_constraint(
                AtMost(*terms, max_teacher_sessions_per_day),
                f"teacher_day_load_{teacher_index}_{week_index}_{day_index}",
            )
        if len(indices) > 1 and max_teacher_idle_minutes is not None:
            prohibit_large_idle_gaps(
                indices,
                day_index,
                max_teacher_idle_minutes,
                f"teacher_idle_{teacher_index}_{week_index}_{day_index}",
            )
        if len(indices) > 1:
            enforce_transition_buffers(
                indices,
                day_index,
                f"teacher_buffer_{teacher_index}_{week_index}_{day_index}",
            )

    for (class_index, week_index, day_index), indices in class_day_candidates.items():
        if len(indices) > max_class_sessions_per_day:
            terms = [day_vars[idx] == day_index for idx in indices]
            add_constraint(
                AtMost(*terms, max_class_sessions_per_day),
                f"class_day_load_{class_index}_{week_index}_{day_index}",
            )
        if len(indices) > 1 and max_class_idle_minutes is not None:
            prohibit_large_idle_gaps(
                indices,
                day_index,
                max_class_idle_minutes,
                f"class_idle_{class_index}_{week_index}_{day_index}",
            )
        if len(indices) > 1:
            enforce_transition_buffers(
                indices,
                day_index,
                f"class_buffer_{class_index}_{week_index}_{day_index}",
            )
        scheduled_terms = [day_vars[idx] == day_index for idx in indices]
        if scheduled_terms:
            window_terms = []
            for idx in indices:
                slot_pairs = []
                for slot_index in sessions[idx]["slotDomainByDay"].get(day_index, []):
                    if slot_start_minutes[slot_index] <= latest_class_start_minutes:
                        slot_pairs.append(
                            And(
                                day_vars[idx] == day_index,
                                slot_vars[idx] == slot_index,
                            )
                        )
                if slot_pairs:
                    window_terms.append(Or(*slot_pairs))
            if window_terms:
                add_constraint(
                    Implies(
                        Or(*scheduled_terms),
                        Or(*window_terms),
                    ),
                    f"class_start_window_{class_index}_{week_index}_{day_index}",
                )
            else:
                for idx in indices:
                    add_constraint(
                        day_vars[idx] != day_index,
                        f"class_start_window_block_{class_index}_{week_index}_{day_index}_{idx}",
                    )

    check_result = solver.check()
    if check_result != sat:
        debug_details = ""
        if debug_enabled:
            try:
                unsat_core = [str(item) for item in solver.unsat_core()]
            except Z3Exception:
                unsat_core = []
            stats = solver.statistics()
            stats_summary = {
                str(stats.get_key(i)): stats.get_key_value(i)
                for i in range(stats.size())
            }
            if unsat_core:
                debug_details += f" | UNSAT core: {unsat_core}"
            if stats_summary:
                debug_details += f" | stats: {stats_summary}"
        raise RuntimeError(
            "Z3 could not satisfy the provided lesson templates within the term configuration"
            + debug_details
        )

    model = solver.model()
    assignments: List[Dict[str, Any]] = []
    schedule_by_day: Dict[str, List[Dict[str, Any]]] = {}

    for idx, session in enumerate(sessions):
        slot_idx = model.eval(slot_vars[idx]).as_long()
        room_idx = model.eval(room_vars[idx]).as_long()

        slot = available_time_slots[slot_idx]
        class_name = session["className"]
        teacher_name = session["teacherName"]
        subject_name = session["subjectName"]
        room_name = classrooms[room_idx]

        start_minutes = slot["startMinutes"]
        end_minutes = start_minutes + session["duration"]

        assignment = {
            "subject": subject_name,
            "class": class_name,
            "teacher": teacher_name,
            "classroom": room_name,
            "durationMinutes": session["duration"],
            "termWeek": session["weekIndex"] + 1,
            "timeSlot": {
                "day": slot["day"],
                "dayName": slot["dayName"],
                "start": _minutes_to_clock(start_minutes),
                "end": _minutes_to_clock(end_minutes),
                "weekIndex": session["weekIndex"] + 1,
            },
        }
        assignments.append(assignment)

        schedule_entry = {
            "id": idx,
            "name": f"{subject_name} ({class_name})",
            "subject": subject_name,
            "classRef": class_name,
            "teacher": teacher_name,
            "classroom": room_name,
            "startMinutes": start_minutes,
            "duration": session["duration"],
            "colorIndex": session["colorIndex"],
            "termWeek": session["weekIndex"] + 1,
        }

        schedule_by_day.setdefault(slot["day"], []).append(schedule_entry)

    for entries in schedule_by_day.values():
        entries.sort(key=lambda item: item["startMinutes"])

    return {
        "success": True,
        "assignments": assignments,
        "scheduleByDay": schedule_by_day,
        "meta": {
            "term": {
                "name": term_cfg.get("name") or "",
                "startDate": term_cfg["start_date"].isoformat(),
                "weeks": term_cfg["weeks"],
                "days": [day["label"] for day in term_cfg["days"]],
            },
            "timeSlots": available_time_slots,
        },
    }


def solve_schedule(data: Dict[str, Any]) -> Dict[str, Any]:
    debug_enabled = bool(
        data.get("debug")
        or data.get("debugMode")
        or data.get("debug_mode")
    )
    if data.get("lessonTemplates"):
        return _solve_structured(data, debug=debug_enabled)
    return _solve_basic(data, debug=debug_enabled)


def main() -> None:
    try:
        data = _read_input()
        result = solve_schedule(data)
        sys.stdout.write(json.dumps(result))
    except Exception as err:  # pragma: no cover - error path surfaced to caller
        sys.stdout.write(
            json.dumps(
                {
                    "success": False,
                    "error": str(err),
                }
            )
        )


if __name__ == "__main__":
    main()

