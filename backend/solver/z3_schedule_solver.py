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
from datetime import datetime
from typing import Any, Dict, List

try:
    from z3 import Int, Or, Solver
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


def solve_schedule(data: Dict[str, Any]) -> Dict[str, Any]:
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

    if solver.check() != 1:  # 1 == sat
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

