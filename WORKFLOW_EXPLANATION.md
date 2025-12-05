# Schedule Builder AI - Workflow Explanation

## What It Does
Schedule Builder AI is an Electron application that imports school schedules from SchoolSoft (Swedish school management system) and uses the Z3 theorem prover to rebuild and optimize them with constraint-based scheduling.

## The Workflow

### 1. Import Phase
- **User logs into SchoolSoft** via embedded webview in the app
- **Scrapes schedule data** from the SchoolSoft calendar view
- **Extracts:**
  - Lesson subjects (e.g., "Physics", "Math")
  - Teachers assigned to each lesson
  - Classrooms/rooms
  - Time slots (when lessons currently occur)
  - Class names and student groups

### 2. Data Transformation
- **Parses** HTML from SchoolSoft to extract lesson blocks
- **Groups lessons** by subject + teacher + room
- **Calculates:**
  - Sessions per week (how many times each lesson occurs)
  - Duration in minutes
  - Total weeks in the term
  - Available time slots per day

### 3. Capacity Check (Pre-flight Validation)
- **Formula:** `Available Capacity = weeks × days_per_week × slots_per_day`
- **Compares** required sessions vs. available capacity
- **Alerts user** if schedule is mathematically impossible
- **Example:** If you need 70 sessions but only have 25 time slots → Error before Z3 runs

### 4. Z3 Solver Optimization
- **Sends to Z3 Python solver** via Node.js backend:
  - All lesson templates (what needs to be scheduled)
  - Available time slots
  - Constraints (max lessons per day, lunch breaks, idle time limits)
  - Teachers, classrooms, subjects lists

- **Z3 builds brand new schedule** from scratch:
  - Assigns each lesson to optimal time slot
  - Avoids teacher/room/class conflicts
  - Respects constraints (lunch, max sessions, spreading subjects)
  - Minimizes idle time

### 5. Display Results
- **Shows optimized schedule** in calendar view
- **Schedule may differ from original** SchoolSoft version (it's rebuilt/optimized)
- **All lessons included**, just rearranged for optimal efficiency

## Key Technical Components

### Frontend (Vue.js)
- `SchoolSoftLogin.vue` - Handles import and data extraction
- `ViewerPage.vue` - Schedule display and Z3 trigger
- `ConstraintsPage.vue` - User-configurable scheduling rules

### Backend (Node.js + Python)
- `schoolSoftParser.js` - Parses SchoolSoft HTML
- `z3Solver.js` - Node.js wrapper for Python solver
- `z3_schedule_solver.py` - Python script using Z3 theorem prover

### Data Flow
```
SchoolSoft → HTML Parse → Lesson Templates → Capacity Check → Z3 Solver → Optimized Schedule
```

## Recent Changes

### Problem Solved
- **Issue:** Z3 was trying to honor original SchoolSoft times (`fixedSessions`) while also scheduling all sessions. This created mathematical conflicts (70 sessions needed, only 2 fixed slots → impossible).

- **Solution:** Removed `fixedSessions` from Z3 payload. Now Z3 receives lesson metadata but is free to build completely new schedule.

### Result
- ✅ Imports work successfully
- ✅ Z3 can rebuild/optimize schedules
- ⚠️ Output schedule differs from SchoolSoft original (by design - it's optimized)

## Use Cases
1. **School administrators** want to optimize existing schedules
2. **Import real data** from SchoolSoft instead of manual entry
3. **Test different constraints** (lunch times, max sessions) on real schedules
4. **Reduce teacher/student idle time** through optimization

## Tech Stack
- **Electron** - Desktop app framework
- **Vue.js 3** - Frontend UI
- **Z3 Theorem Prover** - Constraint solving
- **Python 3** - Z3 solver wrapper
- **Node.js** - Backend API
