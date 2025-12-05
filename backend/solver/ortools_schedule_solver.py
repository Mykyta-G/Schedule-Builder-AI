#!/usr/bin/env python3
"""
OR-Tools CP-SAT Schedule Solver
Replaces Z3 with Google OR-Tools for faster, more reliable scheduling
"""

from ortools.sat.python import cp_model
import json
import sys
from datetime import datetime, timedelta

def parse_time_to_minutes(time_str):
    """Convert HH:MM to minutes since midnight"""
    try:
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    except:
        return 0

def minutes_to_time(minutes):
    """Convert minutes since midnight to HH:MM"""
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def solve_schedule(data):
    """Main solver using OR-Tools CP-SAT"""
    
    try:
        # Parse input
        term = data.get('term', {})
        templates = data.get('lessonTemplates', [])
        constraints_cfg = data.get('constraints', {})
        
        if not term or not templates:
            return {
                "success": False,
                "error": "Missing required data: term or lessonTemplates"
            }
        
        # Extract term info
        start_date_str = term.get('startDate')
        weeks = term.get('weeks', 1)
        days_list = term.get('days', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
        daily_slots = term.get('dailySlots', [])
        
        # Map day names to indices
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_to_idx = {name: idx for idx, name in enumerate(day_names)}
        valid_day_indices = [day_to_idx[d] for d in days_list if d in day_to_idx]
        
        if not valid_day_indices:
            return {"success": False, "error": "No valid days specified"}
        
        if not daily_slots:
            return {"success": False, "error": "No time slots specified"}
        

        # Parse daily slots into start minutes
        slot_start_minutes = []
        slot_end_minutes = []
        for slot in daily_slots:
            slot_start_minutes.append(parse_time_to_minutes(slot['start']))
            slot_end_minutes.append(parse_time_to_minutes(slot['end']))
            
        # Create CP model
        model = cp_model.CpModel()
        
        # Build all sessions
        sessions = []
        all_intervals = []
        
        # Group intervals by resource for conflict checking
        teacher_intervals = {}
        class_intervals = {}
        room_intervals = {} # For preferred rooms
        
        session_id = 0
        minutes_per_day = 24 * 60
        
        for template in templates:
            subject = template.get('subject', 'Unknown')
            class_name = template.get('class', 'Unknown')
            teacher = template.get('teacher', 'Unknown')
            sessions_per_week = template.get('sessionsPerWeek', 1)
            duration = template.get('durationMinutes', 60)
            preferred_room = template.get('preferredRoom', '')
            
            # Fixed constraints for imports
            fixed_day = template.get('fixedDay')
            fixed_time = template.get('fixedTime')
            
            # Initialize resource groups if needed
            if teacher and teacher not in teacher_intervals: teacher_intervals[teacher] = []
            if class_name and class_name not in class_intervals: class_intervals[class_name] = []
            if preferred_room and preferred_room not in room_intervals: room_intervals[preferred_room] = []

            for week in range(weeks):
                for occurrence in range(sessions_per_week):
                    # Decision variables
                    
                    # 1. Day Selection
                    day_var = model.NewIntVarFromDomain(
                        cp_model.Domain.FromValues(valid_day_indices),
                        f'day_{session_id}'
                    )
                    
                    # 2. Key change: Model time as continuous minutes, not slot indices
                    # However, we still want to snap to valid start times if possible
                    # We create a variable for the index of the start time
                    slot_idx_var = model.NewIntVar(0, len(daily_slots) - 1, f'slot_idx_{session_id}')
                    
                    # Map slot_idx to actual start minute using AddElement behavior
                    # Since AddElement only works on arrays of vars or constants
                    local_start_var = model.NewIntVar(0, 24*60, f'local_start_{session_id}')
                    model.AddElement(slot_idx_var, slot_start_minutes, local_start_var)
                    
                    # 3. Global Time Coordinate (Week + Day + Minute)
                    # Global start = (Week * 7 * 1440) + (Day * 1440) + LocalStart
                    week_offset = week * 7 * minutes_per_day
                    
                    # We need a way to add Day * 1440. Since Day is a var, we use a linear expression
                    # global_start_var = week_offset + day_var * 1440 + local_start_var
                    
                    # To use AddNoOverlap, we need IntervalVars.
                    # IntervalVars need start, size, end.
                    # BUT: AddNoOverlap works on a single dimension.
                    # We map everything to a single continuous timeline of minutes from start of term.
                    
                    # Create global start/end variables
                    global_start_var = model.NewIntVar(0, weeks * 7 * minutes_per_day, f'global_start_{session_id}')
                    global_end_var = model.NewIntVar(0, weeks * 7 * minutes_per_day, f'global_end_{session_id}')
                    
                    # Link global start to (day * 1440 + local_start)
                    # Note: We treat each week independently for simplicity in resource grouping usually,
                    # but here we are mapping to absolute time.
                    # Start = week_offset + day_var * 1440 + local_start
                    model.Add(global_start_var == week_offset + day_var * minutes_per_day + local_start_var)
                    model.Add(global_end_var == global_start_var + duration)
                    
                    # Create the Interval Variable
                    interval_var = model.NewIntervalVar(
                        global_start_var, 
                        duration, 
                        global_end_var, 
                        f'interval_{session_id}'
                    )
                    
                    # Apply Fixed Constraints (for Imports)
                    if fixed_day and fixed_day in day_to_idx:
                        # Force day variable
                        model.Add(day_var == day_to_idx[fixed_day])
                        
                    if fixed_time:
                        # Force start time
                        # calculate minutes
                        try:
                            h, m = map(int, fixed_time.split(':'))
                            start_mins = h * 60 + m
                            model.Add(local_start_var == start_mins)
                        except:
                            pass
                    
                    session = {
                        'id': session_id,
                        'subject': subject,
                        'class': class_name,
                        'teacher': teacher,
                        'week': week,
                        'duration': duration,
                        'preferred_room': preferred_room,
                        'day_var': day_var,
                        'slot_var': slot_idx_var, # Kept for compatibility with output
                        'global_start': global_start_var,
                        'interval': interval_var
                    }
                    sessions.append(session)
                    
                    # Add to resource groups for NoOverlap constraints
                    if teacher: teacher_intervals[teacher].append(interval_var)
                    if class_name: class_intervals[class_name].append(interval_var)
                    if preferred_room: room_intervals[preferred_room].append(interval_var)
                    
                    session_id += 1
        
        print(f"Created {len(sessions)} session intervals", file=sys.stderr)
        
        # CONSTRAINTS
        
        # 1. Resource Constraints (No Overlap)
        # This prevents "stacking" completely - no two lessons can share the same time
        for t_name, intervals in teacher_intervals.items():
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)
                
        for c_name, intervals in class_intervals.items():
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)
                
        for r_name, intervals in room_intervals.items():
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)
                
        print("Added NoOverlap constraints for teachers, classes, and rooms", file=sys.stderr)
        
        # 2. Capacity constraints (if specified)
        max_class_sessions = constraints_cfg.get('maxClassSessionsPerDay', 999)
        
        if max_class_sessions < 999:
            # For each class, week, day: count sessions <= max
            classes = list(set(s['class'] for s in sessions))
            for cls in classes:
                for week in range(weeks):
                    for day_idx in valid_day_indices:
                        class_sessions_this_day = [
                            s for s in sessions 
                            if s['class'] == cls and s['week'] == week
                        ]
                        if class_sessions_this_day:
                            day_bools = []
                            for s in class_sessions_this_day:
                                is_this_day = model.NewBoolVar(f'class_{cls}_w{week}_d{day_idx}_s{s["id"]}')
                                model.Add(s['day_var'] == day_idx).OnlyEnforceIf(is_this_day)
                                model.Add(s['day_var'] != day_idx).OnlyEnforceIf(is_this_day.Not())
                                day_bools.append(is_this_day)
                            
                            model.Add(sum(day_bools) <= max_class_sessions)
        
        print("Added capacity constraints", file=sys.stderr)
        
        # OBJECTIVE: Minimize penalties
        penalties = []
        
        # Penalty 1: Prefer early time slots
        for s in sessions:
            penalties.append(s['slot_var'])  # Prefer lower slot indices
        
        if penalties:
            model.Minimize(sum(penalties))
        
        # SOLVE
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60
        solver.parameters.log_search_progress = False
        
        print("Starting solver...", file=sys.stderr)
        status = solver.Solve(model)
        print(f"Solver status: {solver.StatusName(status)}", file=sys.stderr)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            # Extract solution
            assignments = []
            schedule_by_day = {}
            
            # Parse start date
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            else:
                start_date = datetime.now()
            
            for s in sessions:
                day_idx = solver.Value(s['day_var'])
                slot_idx = solver.Value(s['slot_var'])
                
                day_name = day_names[day_idx]
                
                # Get actual assigned time from Global Start
                global_start_val = solver.Value(s['global_start'])
                # Reconstruct local time: global % 1440
                local_start_min = global_start_val % minutes_per_day
                
                # Format time string
                start_time_str = minutes_to_time(local_start_min)
                end_time_str = minutes_to_time(local_start_min + s['duration'])
                
                if start_date_str:
                    week_start = start_date + timedelta(weeks=s['week'])
                    # Fix: Always anchor to the Monday of the current week
                    # This prevents splitting a week (e.g. Fri -> next Mon) if start_date is late in week
                    monday_of_week = week_start - timedelta(days=week_start.weekday())
                    actual_date = monday_of_week + timedelta(days=day_idx)
                else:
                    # Same logic if using current date
                    current_date = start_date + timedelta(weeks=s['week'])
                    monday_of_week = current_date - timedelta(days=current_date.weekday())
                    actual_date = monday_of_week + timedelta(days=day_idx)
                
                assignment = {
                    "subject": s['subject'],
                    "class": s['class'],
                    "teacher": s['teacher'],
                    "classroom": s['preferred_room'],
                    "durationMinutes": s['duration'],
                    "termWeek": s['week'] + 1,
                    "timeSlot": {
                        "day": actual_date.strftime('%Y-%m-%d'),
                        "dayName": day_name,
                        "start": start_time_str,
                        "end": end_time_str,
                        "weekIndex": s['week'] + 1
                    }
                }
                assignments.append(assignment)
                
                if day_name not in schedule_by_day:
                    schedule_by_day[day_name] = []
                
                schedule_by_day[day_name].append({
                    "id": f"session_{s['id']}",
                    "name": s['subject'],
                    "subject": s['subject'],
                    "classRef": s['class'],
                    "teacher": s['teacher'],
                    "classroom": s['preferred_room'],
                    "startMinutes": local_start_min,
                    "duration": s['duration'],
                    "colorIndex": hash(s['subject']) % 10
                })
            
            return {
                "success": True,
                "assignments": assignments,
                "scheduleByDay": schedule_by_day,
                "meta": {
                    "solver": "OR-Tools CP-SAT (Interval)",
                    "status": solver.StatusName(status),
                    "solutionTime": solver.WallTime(),
                    "totalSessions": len(sessions)
                }
            }
        
        else:
            return {
                "success": False,
                "error": f"No feasible schedule found. Status: {solver.StatusName(status)}",
                "details": "The constraints may be too restrictive or there may not be enough time slots."
            }
    
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": f"Solver exception: {str(e)}",
            "traceback": traceback.format_exc()
        }

def main():
    """Main entry point - reads JSON from stdin, outputs JSON to stdout"""
    try:
        # Read input
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # Solve
        result = solve_schedule(data)
        
        # Output result as JSON
        print(json.dumps(result), flush=True)
        
        if result.get('success'):
            sys.exit(0)
        else:
            sys.exit(1)
    
    except Exception as e:
        import traceback
        error_result = {
            "success": False,
            "error": f"Fatal error: {str(e)}",
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
