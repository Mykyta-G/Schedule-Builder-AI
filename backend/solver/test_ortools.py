#!/usr/bin/env python3
"""Test OR-Tools installation and basic CP-SAT functionality"""

from ortools.sat.python import cp_model
import json

def test_basic_scheduling():
    """Simple test: schedule 2 lessons across 2 days with 2 time slots"""
    
    print("Testing OR-Tools CP-SAT basic scheduling...")
    
    # Create model
    model = cp_model.CpModel()
    
    # Variables: 2 lessons, each needs a day (0=Mon, 1=Tue) and slot (0=morning, 1=afternoon)
    lesson1_day = model.NewIntVar(0, 1, 'lesson1_day')
    lesson1_slot = model.NewIntVar(0, 1, 'lesson1_slot')
    
    lesson2_day = model.NewIntVar(0, 1, 'lesson2_day')
    lesson2_slot = model.NewIntVar(0, 1, 'lesson2_slot')
    
    # Constraint: Can't be at same day AND same slot (would conflict)
    # Create boolean variables for conditions
    same_day = model.NewBoolVar('same_day')
    same_slot = model.NewBoolVar('same_slot')
    
    model.Add(lesson1_day == lesson2_day).OnlyEnforceIf(same_day)
    model.Add(lesson1_day != lesson2_day).OnlyEnforceIf(same_day.Not())
    
    model.Add(lesson1_slot == lesson2_slot).OnlyEnforceIf(same_slot)
    model.Add(lesson1_slot != lesson2_slot).OnlyEnforceIf(same_slot.Not())
    
    # If both same day AND same slot, add violation (we'll minimize this)
    conflict = model.NewBoolVar('conflict')
    model.AddBoolAnd([same_day, same_slot]).OnlyEnforceIf(conflict)
    model.AddBoolOr([same_day.Not(), same_slot.Not()]).OnlyEnforceIf(conflict.Not())
    
    # Minimize conflicts (should be 0 for valid schedule)
    model.Minimize(conflict)
    
    # Solve
    solver = cp_model.CpSolver()
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        print("✅ Solution found!")
        print(f"  Lesson 1: Day {solver.Value(lesson1_day)}, Slot {solver.Value(lesson1_slot)}")
        print(f"  Lesson 2: Day {solver.Value(lesson2_day)}, Slot {solver.Value(lesson2_slot)}")
        return True
    else:
        print("❌ No solution found")
        return False

if __name__ == "__main__":
    print("="*50)
    print("OR-Tools Installation Test")
    print("="*50)
    
    try:
        from ortools import __version__
        print(f"✅ OR-Tools version: {__version__}")
    except:
        print("✅ OR-Tools installed (version detection unavailable)")
    
    print()
    success = test_basic_scheduling()
    print()
    
    if success:
        print("🎉 OR-Tools is working correctly!")
        print("Ready to build the schedule solver.")
    else:
        print("⚠️  OR-Tools test failed - check installation")
    
    print("="*50)
