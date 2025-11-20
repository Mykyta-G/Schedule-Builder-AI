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
    <ViewerPage v-else-if="currentPage === 'viewer'" :preset-id="selectedPresetId" :initial-data="mockData" />
    <ConstraintsPage v-else-if="currentPage === 'constraints'" :solver-options="constraintsSolverOptions" :preset-id="selectedPresetId" :custom-constraints="constraintsCustomConstraints" />
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

    onMounted(() => {
      // Listen for navigation events
      window.addEventListener('navigate', (event) => {
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

