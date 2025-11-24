# Performance Analysis: Z3 Schedule Solver

## Critical Performance Issues

### 1. **Exponential Constraint Explosion in `prohibit_large_idle_gaps`** (Lines 923-976)
**Problem**: Creates constraints for every pair of sessions × every pair of slots
- Complexity: O(n² × m²) where n = sessions, m = slots per session
- Example: 50 sessions × 10 slots each = **122,500 constraints** per teacher/day
- Called for every teacher/day AND class/day combination
- **This is the #1 performance killer**

**Current Logic**:
```python
for i in range(len(relevant)):
    for j in range(i + 1, len(relevant)):
        for slot_a in slots_a:  # Could be 10+ slots
            for slot_b in slots_b:  # Could be 10+ slots
                # Creates constraint for each combination
```

### 2. **Similar Issue in `enforce_transition_buffers`** (Lines 978-1015)
**Problem**: Same O(n² × m²) pattern
- Creates constraints for every session pair × every slot pair
- Only needed for PE subjects, but still creates massive constraint sets

### 3. **Redundant Constraint Generation**
- Idle gap constraints are created even when sessions might not be scheduled on the same day
- Many constraints are logically equivalent but created separately
- No early filtering of impossible slot combinations

### 4. **Inefficient Constraint Patterns**
- Uses `Or(day_vars[idx] != day_index, slot_vars[idx] != slot_a, ...)` pattern repeatedly
- Could use more efficient Z3 patterns like `Implies()` or `Distinct()`

### 5. **Unnecessary Complexity**
- 1500+ lines with deeply nested loops
- Multiple passes over the same data
- Complex nested dictionaries and lookups

## Recommended Optimizations

### Priority 1: Fix Idle Gap Constraints
**Current**: Creates constraints for all slot pairs
**Better**: Only create constraints when slots are actually adjacent or close
- Pre-filter slot pairs that could create gaps
- Use a more efficient constraint pattern
- Consider making this optional or less strict

### Priority 2: Optimize Transition Buffers
- Only check slots that could actually conflict (adjacent time ranges)
- Pre-compute which slot pairs need buffers
- Reduce constraint count by 90%+

### Priority 3: Simplify Constraint Logic
- Use `Implies()` instead of `Or(..., != ...)` patterns where possible
- Batch similar constraints
- Early exit conditions

### Priority 4: Make Constraints Optional/Configurable
- Allow disabling expensive constraints
- Provide "fast mode" that skips non-critical constraints
- Make idle gap checking optional or less strict

## Estimated Impact

**Current**: With 50 sessions × 10 slots = ~500,000+ constraints
**After Optimization**: ~50,000 constraints (10x reduction)
**Solver Time**: Should reduce from minutes to seconds

