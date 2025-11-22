<template>
  <div id="app">
    <div class="bubbles-overlay">
      <div
        v-for="bubble in bubbles"
        :key="bubble.id"
        :data-bubble-id="bubble.id"
        class="bubble"
        :style="bubble.style"
      ></div>
    </div>
    <HomePage v-if="currentPage === 'home'" />
    <CreatorPage v-else-if="currentPage === 'creator'" />
    <ViewerPage v-else-if="currentPage === 'viewer'" :preset-id="selectedPresetId" :initial-data="mockData" :saved-state="viewerPageState" @save-state="handleViewerPageStateSave" />
    <ConstraintsPage v-else-if="currentPage === 'constraints'" :solver-options="constraintsSolverOptions" :preset-id="selectedPresetId" :custom-constraints="constraintsCustomConstraints" :time-slots="globalTimeSlots" />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import HomePage from './components/HomePage.vue';
import CreatorPage from './components/CreatorPage.vue';
import ViewerPage from './components/ViewerPage.vue';
import ConstraintsPage from './components/ConstraintsPage.vue';

export default defineComponent({
  name: 'App',
  components: {
    HomePage,
    CreatorPage,
    ViewerPage,
    ConstraintsPage,
  },
  setup() {
    const currentPage = ref('home');
    const selectedPresetId = ref(null);
    const mockData = ref(null);
    const constraintsSolverOptions = ref(null);
    const constraintsCustomConstraints = ref(null);
    
    // Store constraints globally so ViewerPage can access them when it remounts
    // This is needed because ViewerPage is unmounted when on ConstraintsPage
    const globalCustomConstraints = ref(null);
    const globalConstraintsPresetId = ref(null);
    
    // Store time slots globally so both ViewerPage and ConstraintsPage can access
    const globalTimeSlots = ref([]);
    const globalTimeSlotsPresetId = ref(null);
    
    // Store ViewerPage state globally so it persists when navigating to/from ConstraintsPage
    const viewerPageState = ref(null);
    const bubbles = ref([]);
    let bubbleInterval = null;
    let bubbleIdCounter = 0;
    let scheduledTimeouts = [];

    const createBubble = () => {
      // No limit on bubbles - just create them

      // Use pixel-based positioning with better randomness distribution
      // Much wider size range for variety
      const size = Math.random() * 100 + 20; // Random size between 20px and 120px (much more variety)
      
      // Use multiple random calls to break patterns
      for (let i = 0; i < 3; i++) Math.random();
      
      const randomX = Math.random();
      // Use multiple random calls before Y to break any correlation
      Math.random(); Math.random();
      const randomY = Math.random();
      
      // Ensure full screen coverage - use entire viewport dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Calculate position with padding, ensuring full screen coverage
      const padding = 40;
      const x = randomX * (screenWidth - size - padding * 2) + padding; // Fully random X
      
      // Bias Y distribution towards bottom of screen
      // Using 1 - random^2 creates a bias towards higher Y values (bottom of screen)
      // The higher the power, the stronger the bias towards bottom
      const biasedRandomY = 1 - Math.pow(Math.random(), 1.5); // 1.5 gives moderate bias towards bottom
      const y = biasedRandomY * (screenHeight - size - padding * 2) + padding; // Biased towards bottom
      
      const duration = Math.random() * 25 + 35; // Random duration between 35s and 60s
      const drift = (Math.random() - 0.5) * 40; // Random horizontal drift
      
      // Add extra random calls to improve entropy and break patterns
      Math.random(); Math.random(); Math.random();

      const bubble = {
        id: bubbleIdCounter++,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: `${x}px`,
          top: `${y}px`,
          '--drift': drift,
          'animation-duration': `${duration}s`,
          'animation-delay': '0s',
          opacity: '0',
        },
      };

      bubbles.value.push(bubble);

      // Fade in after a short delay (like the reference site)
      nextTick(() => {
        setTimeout(() => {
          const bubbleIndex = bubbles.value.findIndex(b => b.id === bubble.id);
          if (bubbleIndex !== -1) {
            bubbles.value[bubbleIndex].style.opacity = '1';
          }
        }, 100);
      });

      // Remove bubble after animation completes
      setTimeout(() => {
        const index = bubbles.value.findIndex(b => b.id === bubble.id);
        if (index !== -1) {
          bubbles.value.splice(index, 1);
        }
      }, duration * 1000 + 500);
    };

    // Handle ViewerPage state save events (called via emit from ViewerPage)
    const handleViewerPageStateSave = (state) => {
      if (state && state.presetId) {
        viewerPageState.value = state;
        console.log('[App] Saved ViewerPage state', {
          hasState: !!state,
          presetId: state.presetId,
          hasClasses: state.classes?.length > 0,
          hasTeachers: state.teachers?.length > 0,
          hasTimeSlots: state.timeSlots?.length > 0
        });
      }
    };

    onMounted(() => {
      // Listen for navigation events
      window.addEventListener('navigate', (event) => {
        const previousPage = currentPage.value;
        currentPage.value = event.detail.page;
        selectedPresetId.value = event.detail.presetId || null;
        mockData.value = event.detail.mockData || null;
        
        // Capture solverOptions for constraints page
        if (event.detail.solverOptions) {
          constraintsSolverOptions.value = event.detail.solverOptions;
        }
        
        // Capture customConstraints for constraints page
        if (event.detail.customConstraints) {
          constraintsCustomConstraints.value = event.detail.customConstraints;
          // Also store globally for ViewerPage
          globalCustomConstraints.value = event.detail.customConstraints;
          globalConstraintsPresetId.value = event.detail.presetId || null;
        } else if (event.detail.page !== 'constraints') {
          // Clear customConstraints when navigating away from constraints page
          constraintsCustomConstraints.value = null;
        }
        
        // Capture timeSlots for constraints page
        // Only update if we don't already have time slots for this preset, or if the incoming slots are newer
        if (event.detail.timeSlots) {
          // If we already have time slots for this preset, keep them (they might be more recent from ConstraintsPage)
          // Only update if we don't have any, or if it's a different preset
          if (!globalTimeSlots.value || globalTimeSlots.value.length === 0 || 
              globalTimeSlotsPresetId.value !== event.detail.presetId) {
            globalTimeSlots.value = event.detail.timeSlots;
            globalTimeSlotsPresetId.value = event.detail.presetId || null;
          } else {
            // We have existing time slots for this preset - keep them (they're likely more recent)
            console.log('[App] Keeping existing globalTimeSlots for preset', {
              presetId: event.detail.presetId,
              existingCount: globalTimeSlots.value.length,
              incomingCount: event.detail.timeSlots.length
            });
          }
        }
        
        // Preserve ViewerPage state when navigating to/from constraints
        if (previousPage === 'viewer' && event.detail.page === 'constraints') {
          // State will be saved by ViewerPage before unmounting
          console.log('[App] Navigating to constraints, preserving ViewerPage state', {
            hasState: !!viewerPageState.value
          });
        } else if (previousPage === 'constraints' && event.detail.page === 'viewer') {
          // State will be restored when ViewerPage mounts
          console.log('[App] Navigating back to viewer, will restore state', {
            hasState: !!viewerPageState.value,
            presetId: selectedPresetId.value
          });
        }
      });
      
      // Listen for constraints-updated event (always active since App.vue is always mounted)
      window.addEventListener('constraints-updated', (event) => {
        try {
          const { constraints, presetId } = event.detail;
          console.log('[App] Received constraints-updated event', {
            constraintsCount: Object.keys(constraints || {}).length,
            presetId,
            timestamp: new Date().toISOString(),
            constraints: JSON.stringify(constraints)
          });
          
          // Store globally so ViewerPage can access when it remounts
          globalCustomConstraints.value = constraints;
          globalConstraintsPresetId.value = presetId;
          
          // Also update constraintsCustomConstraints if we're on constraints page
          if (currentPage.value === 'constraints') {
            constraintsCustomConstraints.value = constraints;
          }
          
          // Dispatch to ViewerPage if it's mounted (it will also listen directly)
          // This ensures ViewerPage gets the update even if it's currently mounted
          window.dispatchEvent(new CustomEvent('constraints-updated-viewer', {
            detail: { constraints, presetId }
          }));
          
          console.log('[App] Constraints stored and forwarded', {
            stored: !!globalCustomConstraints.value,
            forwarded: true
          });
        } catch (error) {
          console.error('[App] Error handling constraints-updated event', error, {
            errorMessage: error?.message,
            errorStack: error?.stack
          });
        }
      });
      
      // Listen for requests from ViewerPage to get stored constraints
      window.addEventListener('request-constraints', (event) => {
        try {
          const { presetId } = event.detail;
          console.log('[App] Received request-constraints', {
            requestedPresetId: presetId,
            storedPresetId: globalConstraintsPresetId.value,
            hasStoredConstraints: !!globalCustomConstraints.value
          });
          
          // If presetId matches and we have stored constraints, send them
          if (globalCustomConstraints.value && 
              (!presetId || presetId === globalConstraintsPresetId.value)) {
            console.log('[App] Sending stored constraints to ViewerPage', {
              constraintsCount: Object.keys(globalCustomConstraints.value || {}).length,
              presetId: globalConstraintsPresetId.value
            });
            
            window.dispatchEvent(new CustomEvent('constraints-updated-viewer', {
              detail: { 
                constraints: globalCustomConstraints.value, 
                presetId: globalConstraintsPresetId.value 
              }
            }));
          } else {
            console.log('[App] No matching stored constraints to send', {
              hasStored: !!globalCustomConstraints.value,
              presetIdMatch: presetId === globalConstraintsPresetId.value
            });
          }
        } catch (error) {
          console.error('[App] Error handling request-constraints', error);
        }
      });
      
      // Helper function to normalize day names
      const normalizeDayName = (day) => {
        if (!day || typeof day !== 'string') return 'Monday';
        const dayMap = {
          'monday': 'Monday', 'mon': 'Monday', 'måndag': 'Monday',
          'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tisdag': 'Tuesday',
          'wednesday': 'Wednesday', 'wed': 'Wednesday', 'onsdag': 'Wednesday',
          'thursday': 'Thursday', 'thu': 'Thursday', 'torsdag': 'Thursday',
          'friday': 'Friday', 'fri': 'Friday', 'fredag': 'Friday'
        };
        return dayMap[day.trim().toLowerCase()] || 'Monday';
      };

      // Helper function to normalize time slots to fixed 5-day structure
      const normalizeTimeSlots = (slots, defaultStart = '08:00', defaultEnd = '16:30') => {
        if (!Array.isArray(slots) || slots.length === 0) {
          const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          return weekdays.map(day => ({ day, start: defaultStart, end: defaultEnd }));
        }
        
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const existingMap = new Map();
        
        slots.forEach(slot => {
          if (slot && slot.day) {
            const normalizedDay = normalizeDayName(slot.day);
            if (normalizedDay && slot.start && slot.end) {
              existingMap.set(normalizedDay, { start: slot.start, end: slot.end });
            }
          }
        });
        
        return weekdays.map(day => {
          if (existingMap.has(day)) {
            return { day, ...existingMap.get(day) };
          }
          return { day, start: defaultStart, end: defaultEnd };
        });
      };

      // Listen for time-slots-updated event (always active since App.vue is always mounted)
      window.addEventListener('time-slots-updated', (event) => {
        try {
          const { timeSlots, presetId } = event.detail;
          console.log('[App] Received time-slots-updated event', {
            timeSlotsCount: (timeSlots || []).length,
            presetId,
            currentPage: currentPage.value,
            hasExistingTimeSlots: globalTimeSlots.value.length > 0,
            existingPresetId: globalTimeSlotsPresetId.value,
            timestamp: new Date().toISOString()
          });
          
          // Normalize time slots to fixed 5-day structure before storing
          const normalizedSlots = normalizeTimeSlots(timeSlots || [], '08:00', '16:30');
          
          // If we're on the constraints page, always update (it's a save from ConstraintsPage)
          // Otherwise, only update if we don't have time slots for this preset yet
          // This prevents ViewerPage state restoration from overwriting saved time slots
          const shouldUpdate = currentPage.value === 'constraints' || 
                                !globalTimeSlots.value || 
                                globalTimeSlots.value.length === 0 ||
                                globalTimeSlotsPresetId.value !== presetId;
          
          if (shouldUpdate) {
            // Store globally so ViewerPage can access when it remounts
            globalTimeSlots.value = normalizedSlots;
            globalTimeSlotsPresetId.value = presetId;
            
            console.log('[App] Time slots updated', {
              stored: globalTimeSlots.value.length > 0,
              presetId
            });
          } else {
            console.log('[App] Keeping existing time slots (prevent overwrite from state restoration)', {
              existingCount: globalTimeSlots.value.length,
              incomingCount: normalizedSlots.length,
              presetId
            });
          }
          
          // Always dispatch to ViewerPage so it can sync (even if we didn't update globalTimeSlots)
          // This ensures ViewerPage gets updates from ConstraintsPage
          window.dispatchEvent(new CustomEvent('time-slots-updated-viewer', {
            detail: { timeSlots: normalizedSlots, presetId }
          }));
          
          console.log('[App] Time slots forwarded to ViewerPage', {
            forwarded: true
          });
        } catch (error) {
          console.error('[App] Error handling time-slots-updated event', error, {
            errorMessage: error?.message,
            errorStack: error?.stack
          });
        }
      });
      
      // Listen for requests from ViewerPage to get stored time slots
      window.addEventListener('request-time-slots', (event) => {
        try {
          const { presetId } = event.detail;
          console.log('[App] Received request-time-slots', {
            requestedPresetId: presetId,
            storedPresetId: globalTimeSlotsPresetId.value,
            hasStoredTimeSlots: (globalTimeSlots.value || []).length > 0
          });
          
          // If presetId matches and we have stored time slots, send them
          if (globalTimeSlots.value && globalTimeSlots.value.length > 0 && 
              (!presetId || presetId === globalTimeSlotsPresetId.value)) {
            console.log('[App] Sending stored time slots to ViewerPage', {
              timeSlotsCount: globalTimeSlots.value.length,
              presetId: globalTimeSlotsPresetId.value
            });
            
            window.dispatchEvent(new CustomEvent('time-slots-updated-viewer', {
              detail: { 
                timeSlots: globalTimeSlots.value, 
                presetId: globalTimeSlotsPresetId.value 
              }
            }));
          } else {
            console.log('[App] No matching stored time slots to send', {
              hasStored: (globalTimeSlots.value || []).length > 0,
              presetIdMatch: presetId === globalTimeSlotsPresetId.value
            });
          }
        } catch (error) {
          console.error('[App] Error handling request-time-slots', error);
        }
      });

      // Create initial bubbles immediately (more bubbles, faster)
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createBubble(), i * 100);
      }

      // Create new bubbles at consistent random intervals (1-3 seconds)
      const scheduleNextBubble = () => {
        // Spawn bubbles at random intervals
        const delay = Math.random() * 2000 + 1000; // 1000ms to 3000ms (1-3 seconds)
        
        const timeoutId = setTimeout(() => {
          // Remove this timeout from tracking
          scheduledTimeouts = scheduledTimeouts.filter(id => id !== timeoutId);
          
          // Always create a bubble - no limit
          createBubble();
          
          // Always schedule the next bubble to keep the chain going
          scheduleNextBubble();
        }, delay);
        
        // Track this timeout
        scheduledTimeouts.push(timeoutId);
        bubbleInterval = timeoutId; // Keep the latest one for cleanup
      };

      // Start the scheduling chain
      scheduleNextBubble();
    });

    onUnmounted(() => {
      // Clear all scheduled timeouts and intervals
      scheduledTimeouts.forEach(id => {
        clearTimeout(id);
        clearInterval(id); // Both work, but we call both to be safe
      });
      scheduledTimeouts = [];
      
      if (bubbleInterval) {
        clearTimeout(bubbleInterval);
      }
    });

    return {
      currentPage,
      selectedPresetId,
      mockData,
      constraintsSolverOptions,
      constraintsCustomConstraints,
      globalCustomConstraints,
      globalConstraintsPresetId,
      globalTimeSlots,
      globalTimeSlotsPresetId,
      viewerPageState,
      handleViewerPageStateSave,
      bubbles,
    };
  },
});
</script>

<style>
@import './main.css';

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #fafafa;
}

html {
  background: #fafafa;
}

#app {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.bubbles-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bubble {
  position: fixed;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
  backdrop-filter: blur(2px);
  animation: floatUp linear forwards;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
  transition: opacity 2s ease-in-out;
  pointer-events: none;
  will-change: transform;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  3% {
    opacity: 0.95;
    transform: translateY(-1vh) translateX(0);
  }
  50% {
    transform: translateY(-50vh) translateX(calc(var(--drift, 0) * 1vh));
    opacity: 1;
  }
  97% {
    opacity: 0.95;
  }
  100% {
    transform: translateY(-100vh) translateX(calc(var(--drift, 0) * 1vh));
    opacity: 0;
  }
}


/* Ensure page content is above bubbles */
.home-page,
.creator-page,
.viewer-page,
.preset-selection-page,
.constraints-page {
  position: relative;
  z-index: 1;
  background: transparent;
}
</style>

