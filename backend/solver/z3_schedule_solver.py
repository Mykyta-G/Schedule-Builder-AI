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
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from z3 import Int, Or, Solver, sat
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


def _extract_name(item: Any) -> str:
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        name = item.get("name")
        if isinstance(name, str):
            return name.strip()
    return ""


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

        class_name = _extract_name(item.get("class") or item.get("className"))
        teacher_name = _extract_name(item.get("teacher") or item.get("teacherName"))
        subject_name = _extract_name(item.get("subject") or item.get("subjectName"))

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


def _solve_basic(data: Dict[str, Any]) -> Dict[str, Any]:
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

    slot_vars = [Int(f"slot_{i}") for i in range(lesson_count)]
    teacher_vars = [Int(f"teacher_{i}") for i in range(lesson_count)]
    room_vars = [Int(f"room_{i}") for i in range(lesson_count)]

    max_slot = len(time_slots) - 1
    max_teacher = len(teachers) - 1
    max_room = len(classrooms) - 1

    for i in range(lesson_count):
        solver.add(slot_vars[i] >= 0, slot_vars[i] <= max_slot)
        solver.add(teacher_vars[i] >= 0, teacher_vars[i] <= max_teacher)
        solver.add(room_vars[i] >= 0, room_vars[i] <= max_room)

    for i in range(lesson_count):
        for j in range(i + 1, lesson_count):
            solver.add(Or(slot_vars[i] != slot_vars[j], teacher_vars[i] != teacher_vars[j]))
            solver.add(Or(slot_vars[i] != slot_vars[j], room_vars[i] != room_vars[j]))

            if lessons[i]["classIndex"] == lessons[j]["classIndex"]:
                solver.add(slot_vars[i] != slot_vars[j])

    if solver.check() != sat:
        raise RuntimeError("Z3 could not find a feasible schedule with the provided data")

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


def _solve_structured(data: Dict[str, Any]) -> Dict[str, Any]:
    term_cfg = _prepare_term_configuration(data.get("term") or {})
    templates = _sanitize_lesson_templates(data.get("lessonTemplates") or [])

    classes: List[str] = [_extract_name(item) for item in data.get("classes", []) if _extract_name(item)]
    teachers: List[str] = [_extract_name(item) for item in data.get("teachers", []) if _extract_name(item)]
    classrooms: List[str] = [
        _extract_name(item) for item in data.get("classrooms", []) if _extract_name(item)
    ]
    subjects: List[str] = [_extract_name(item) for item in data.get("subjects", []) if _extract_name(item)]

    available_time_slots = _build_term_time_slots(term_cfg)
    if not available_time_slots:
        raise ValueError("Term configuration did not produce any teaching time slots")

    subject_color_index: Dict[str, int] = {}
    sessions: List[Dict[str, Any]] = []

    for template in templates:
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

        color_seed = subject_color_index.setdefault(template["subjectName"], len(subject_color_index))
        color_index = color_seed % 5

        for week_index in range(term_cfg["weeks"]):
            for _ in range(template["sessionsPerWeek"]):
                sessions.append(
                    {
                        "className": template["className"],
                        "teacherName": template["teacherName"],
                        "subjectName": template["subjectName"],
                        "duration": template["duration"],
                        "weekIndex": week_index,
                        "colorIndex": color_index,
                        "preferredRoom": preferred_room,
                        "roomDomainNames": allowed_rooms[:],
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

        session["roomDomain"] = room_domain
        session["classIndex"] = class_indices[session["className"]]
        session["teacherIndex"] = teacher_indices[session["teacherName"]]

    solver = Solver()
    slot_vars = [Int(f"slot_{i}") for i in range(total_sessions)]
    room_vars = [Int(f"room_{i}") for i in range(total_sessions)]

    for idx, session in enumerate(sessions):
        slot_domain = session["slotDomain"]
        if len(slot_domain) == 1:
            solver.add(slot_vars[idx] == slot_domain[0])
        else:
            solver.add(Or(*[slot_vars[idx] == value for value in slot_domain]))

        room_domain = session["roomDomain"]
        if len(room_domain) == 1:
            solver.add(room_vars[idx] == room_domain[0])
        else:
            solver.add(Or(*[room_vars[idx] == value for value in room_domain]))

    for i in range(total_sessions):
        for j in range(i + 1, total_sessions):
            solver.add(Or(slot_vars[i] != slot_vars[j], room_vars[i] != room_vars[j]))

            if sessions[i]["classIndex"] == sessions[j]["classIndex"]:
                solver.add(slot_vars[i] != slot_vars[j])

            if sessions[i]["teacherIndex"] == sessions[j]["teacherIndex"]:
                solver.add(slot_vars[i] != slot_vars[j])

    if solver.check() != sat:
        raise RuntimeError("Z3 could not satisfy the provided lesson templates within the term configuration")

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
    if data.get("lessonTemplates"):
        return _solve_structured(data)
    return _solve_basic(data)


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

