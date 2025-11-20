<template>
  <div class="constraints-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goBack">← Tillbaka</a>
      <h2 class="page-title">Variabler</h2>
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div class="constraints-container">
      <!-- Klassbegränsningar -->
      <div class="constraint-category">
        <h3 class="category-title">Klassbegränsningar</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Maximal inaktiv tid (minuter):</span>
            <span class="constraint-value">{{ formatMinutes(mergedConstraints.maxClassIdleMinutes) }}</span>
            <span v-if="isDefault('maxClassIdleMinutes')" class="default-badge">Standard</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Maximala sessioner per dag:</span>
            <span class="constraint-value">{{ mergedConstraints.maxClassSessionsPerDay }}</span>
            <span v-if="isDefault('maxClassSessionsPerDay')" class="default-badge">Standard</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Tidigaste starttid:</span>
            <span class="constraint-value">{{ formatMinutesToTime(mergedConstraints.classEarliestStartMinutes) }}</span>
            <span v-if="isDefault('classEarliestStartMinutes')" class="default-badge">Standard</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Senaste starttid:</span>
            <span class="constraint-value">{{ formatMinutesToTime(mergedConstraints.classLatestStartMinutes) }}</span>
            <span v-if="isDefault('classLatestStartMinutes')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>

      <!-- Lärarbegränsningar -->
      <div class="constraint-category">
        <h3 class="category-title">Lärarbegränsningar</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Maximal inaktiv tid (minuter):</span>
            <span class="constraint-value">{{ formatMinutes(mergedConstraints.maxTeacherIdleMinutes) }}</span>
            <span v-if="isDefault('maxTeacherIdleMinutes')" class="default-badge">Standard</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Maximala sessioner per dag:</span>
            <span class="constraint-value">{{ mergedConstraints.maxTeacherSessionsPerDay }}</span>
            <span v-if="isDefault('maxTeacherSessionsPerDay')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>

      <!-- Ämnesfördelning -->
      <div class="constraint-category">
        <h3 class="category-title">Ämnesfördelning</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Inaktivera ämnesfördelning:</span>
            <span class="constraint-value">{{ formatBoolean(mergedConstraints.disableSubjectSpread) }}</span>
            <span v-if="isDefault('disableSubjectSpread')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>

      <!-- Övergångsbuffertar -->
      <div class="constraint-category">
        <h3 class="category-title">Övergångsbuffertar</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Inaktivera övergångsbuffertar:</span>
            <span class="constraint-value">{{ formatBoolean(mergedConstraints.disableTransitionBuffers) }}</span>
            <span v-if="isDefault('disableTransitionBuffers')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>

      <!-- Idrott och hälsa -->
      <div class="constraint-category">
        <h3 class="category-title">Idrott och hälsa</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Buffert efter idrott (minuter):</span>
            <span class="constraint-value">{{ formatMinutes(mergedConstraints.physicalEducationBufferMinutes) }}</span>
            <span v-if="isDefault('physicalEducationBufferMinutes')" class="default-badge">Standard</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Idrottsämnen:</span>
            <span class="constraint-value">{{ formatArray(mergedConstraints.physicalEducationSubjects) }}</span>
            <span v-if="isDefault('physicalEducationSubjects')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>

      <!-- Lunchrast -->
      <div class="constraint-category">
        <h3 class="category-title">Lunchrast</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Aktiverad:</span>
            <span class="constraint-value">{{ formatBoolean(mergedConstraints.lunchBreak.enabled) }}</span>
            <span v-if="isDefaultLunch('enabled')" class="default-badge">Standard</span>
          </div>
          <div v-if="mergedConstraints.lunchBreak.enabled" class="constraint-item">
            <span class="constraint-label">Fönster start:</span>
            <span class="constraint-value">{{ mergedConstraints.lunchBreak.windowStart }}</span>
            <span v-if="isDefaultLunch('windowStart')" class="default-badge">Standard</span>
          </div>
          <div v-if="mergedConstraints.lunchBreak.enabled" class="constraint-item">
            <span class="constraint-label">Fönster slut:</span>
            <span class="constraint-value">{{ mergedConstraints.lunchBreak.windowEnd }}</span>
            <span v-if="isDefaultLunch('windowEnd')" class="default-badge">Standard</span>
          </div>
          <div v-if="mergedConstraints.lunchBreak.enabled" class="constraint-item">
            <span class="constraint-label">Varaktighet (minuter):</span>
            <span class="constraint-value">{{ formatMinutes(mergedConstraints.lunchBreak.durationMinutes) }}</span>
            <span v-if="isDefaultLunch('durationMinutes')" class="default-badge">Standard</span>
          </div>
          <div v-if="mergedConstraints.lunchBreak.enabled" class="constraint-item">
            <span class="constraint-label">Granularitet (minuter):</span>
            <span class="constraint-value">{{ formatMinutes(mergedConstraints.lunchBreak.granularityMinutes) }}</span>
            <span v-if="isDefaultLunch('granularityMinutes')" class="default-badge">Standard</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';

export default defineComponent({
  name: 'ConstraintsPage',
  props: {
    solverOptions: {
      type: Object,
      default: () => null
    },
    presetId: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const errorMessage = ref('');

    // Default values from z3_schedule_solver.py
    const CONSTRAINT_DEFAULTS = {
      maxClassIdleMinutes: 120,           // line 619
      maxTeacherIdleMinutes: 180,         // line 625
      maxClassSessionsPerDay: 5,          // line 633
      maxTeacherSessionsPerDay: 3,        // line 641
      disableSubjectSpread: false,        // line 643
      disableTransitionBuffers: false,    // line 644
      physicalEducationBufferMinutes: 15, // line 652
      physicalEducationSubjects: ['Idrott och hälsa 1', 'Idrott', 'Gymnastik'],
      classEarliestStartMinutes: 480,     // 8*60, line 674
      classLatestStartMinutes: 600,       // 10*60, line 682
      lunchBreak: {
        enabled: true,                    // line 689
        windowStart: '10:30',            // 10*60+30, line 690
        windowEnd: '12:30',              // 12*60+30, line 691
        durationMinutes: 30,              // line 692
        granularityMinutes: 5             // line 693
      }
    };

    // Logging utilities
    const logError = (action, error, details = {}) => {
      console.error('[ConstraintsPage] [ERROR]', action, {
        error: error?.message || String(error),
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...details
      });
    };

    const logInfo = (action, details = {}) => {
      console.log('[ConstraintsPage] [INFO]', action, {
        timestamp: new Date().toISOString(),
        ...details
      });
    };

    const logWarning = (action, details = {}) => {
      console.warn('[ConstraintsPage] [WARN]', action, {
        timestamp: new Date().toISOString(),
        ...details
      });
    };

    // Compute constraints from solverOptions (mirrors ViewerPage.vue lines 882-907)
    const computeConstraintsFromOptions = (options) => {
      if (!options) return {};
      
      try {
        logInfo('COMPUTE_CONSTRAINTS', { hasOptions: !!options });
        const constraints = {};
        
        if (options.relaxedConstraints) {
          constraints.maxClassSessionsPerDay = 6;
          constraints.maxTeacherSessionsPerDay = 6;
          constraints.maxClassIdleMinutes = 300;
          constraints.maxTeacherIdleMinutes = 360;
          constraints.physicalEducationBufferMinutes = 10;
          constraints.physicalEducationSubjects = ['Idrott och hälsa 1', 'Idrott', 'Gymnastik'];
          constraints.disableSubjectSpread = true;
          constraints.disableTransitionBuffers = true;
        }
        
        if (options.includeLunch) {
          constraints.lunchBreak = {
            enabled: true,
            windowStart: '10:30',
            windowEnd: '13:30',
            durationMinutes: 45,
            granularityMinutes: Math.max(5, parseInt(options.lunchGranularity) || 30)
          };
        } else {
          constraints.lunchBreak = { enabled: false };
        }
        
        return constraints;
      } catch (error) {
        logError('COMPUTE_CONSTRAINTS', error, { options });
        return {};
      }
    };

    // Merge computed constraints with defaults
    const mergedConstraints = computed(() => {
      try {
        const computed = computeConstraintsFromOptions(props.solverOptions);
        const merged = {
          ...CONSTRAINT_DEFAULTS,
          ...computed,
          lunchBreak: {
            ...CONSTRAINT_DEFAULTS.lunchBreak,
            ...(computed.lunchBreak || {})
          }
        };
        
        logInfo('MERGE_CONSTRAINTS', { 
          hasComputed: Object.keys(computed).length > 0,
          presetId: props.presetId
        });
        
        return merged;
      } catch (error) {
        logError('MERGE_CONSTRAINTS', error);
        return CONSTRAINT_DEFAULTS;
      }
    });

    // Track which values are defaults
    const computedConstraints = computed(() => {
      return computeConstraintsFromOptions(props.solverOptions);
    });

    const isDefault = (key) => {
      return !(key in computedConstraints.value);
    };

    const isDefaultLunch = (key) => {
      if (!computedConstraints.value.lunchBreak) return true;
      return !(key in computedConstraints.value.lunchBreak);
    };

    // Formatting helpers
    const formatMinutesToTime = (minutes) => {
      if (minutes === null || minutes === undefined) return 'Ingen begränsning';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const formatBoolean = (value) => {
      return value ? 'Aktiverad' : 'Inaktiverad';
    };

    const formatArray = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return 'Inga';
      return arr.join(', ');
    };

    const formatMinutes = (value) => {
      if (value === null || value === undefined) return 'Ingen begränsning';
      return `${value} minuter`;
    };

    // Back navigation
    const goBack = () => {
      try {
        logInfo('NAVIGATE_FROM_CONSTRAINTS', { presetId: props.presetId });
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            page: 'viewer',
            presetId: props.presetId
          } 
        }));
      } catch (error) {
        logError('NAVIGATE_FROM_CONSTRAINTS', error);
        errorMessage.value = 'Kunde inte navigera tillbaka. Försök igen.';
      }
    };

    // Component lifecycle
    onMounted(() => {
      try {
        logInfo('PAGE_LOAD', { 
          presetId: props.presetId,
          hasSolverOptions: !!props.solverOptions
        });
        
        if (!props.solverOptions) {
          logWarning('LOAD_DEFAULTS', { 
            reason: 'No solverOptions provided',
            presetId: props.presetId
          });
        } else {
          logInfo('LOAD_CONSTRAINTS', { 
            relaxedConstraints: props.solverOptions.relaxedConstraints,
            includeLunch: props.solverOptions.includeLunch,
            presetId: props.presetId
          });
        }
      } catch (error) {
        logError('PAGE_LOAD', error, { presetId: props.presetId });
        errorMessage.value = 'Ett fel uppstod vid laddning av sidan.';
      }
    });

    return {
      errorMessage,
      mergedConstraints,
      isDefault,
      isDefaultLunch,
      formatMinutesToTime,
      formatBoolean,
      formatArray,
      formatMinutes,
      goBack
    };
  }
});
</script>

<style scoped>
.constraints-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.top-nav {
  padding: 1.5vh 2vh;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 2vh;
}

.top-nav a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.5vh;
  transition: color 0.2s ease;
}

.top-nav a:hover {
  color: #764ba2;
}

.page-title {
  font-size: 2vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1vh 2vh;
  margin: 1vh 2vh;
  border-radius: 0.6vh;
  font-size: 1.3vh;
}

.constraints-container {
  flex: 1;
  overflow-y: auto;
  padding: 3vh;
  background: transparent;
}

.constraint-category {
  background: #fff;
  border: 0.1vh solid #e2e8f0;
  border-radius: 1vh;
  padding: 2vh;
  margin-bottom: 2vh;
  box-shadow: 0 0.1vh 0.3vh rgba(0, 0, 0, 0.05);
}

.category-title {
  font-size: 1.7vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1.5vh 0;
  padding-bottom: 1vh;
  border-bottom: 0.1vh solid #e2e8f0;
}

.constraint-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.constraint-item {
  display: flex;
  align-items: center;
  padding: 1vh 0;
  border-bottom: 0.1vh solid #f0f0f0;
  font-size: 1.4vh;
}

.constraint-item:last-child {
  border-bottom: none;
}

.constraint-label {
  font-weight: 600;
  color: #4a5568;
  min-width: 25vh;
  flex-shrink: 0;
}

.constraint-value {
  color: #2d3748;
  flex: 1;
}

.default-badge {
  background: #e6fffa;
  color: #047857;
  padding: 0.3vh 0.8vh;
  border-radius: 0.4vh;
  font-size: 1.1vh;
  margin-left: 1vh;
  font-weight: 500;
}
</style>

