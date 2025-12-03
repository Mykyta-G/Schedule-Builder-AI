<template>
  <div class="constraints-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goBack">← Tillbaka</a>
      <h2 class="page-title">Variabler</h2>
      <div class="header-actions">
        <div class="edit-actions">
          <button 
            @click="saveConstraints()"
            :disabled="!canSave"
            class="save-btn"
          >
            Spara
          </button>
          <button 
            @click="resetToDefaults()"
            class="reset-btn"
          >
            Återställ till standard
          </button>
          <span v-if="validationErrorCount > 0" class="error-count">
            {{ validationErrorCount }} fel
          </span>
        </div>
      </div>
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
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.maxClassIdleMinutes"
              @input="handleNumberInput('maxClassIdleMinutes', $event)"
              @focus="onFieldFocus('maxClassIdleMinutes')"
              @blur="onFieldBlur('maxClassIdleMinutes')"
              :min="1"
              :max="1440"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.maxClassIdleMinutes.valid,
                'input-edited': editedFields.maxClassIdleMinutes
              }"
            />
            <span v-else class="constraint-value">{{ formatMinutes(activeConstraints.maxClassIdleMinutes) }}</span>
            <span v-if="!fieldValidation.maxClassIdleMinutes.valid" class="validation-error">
              {{ fieldValidation.maxClassIdleMinutes.error }}
            </span>
            <span v-if="isDefault('maxClassIdleMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.maxClassIdleMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Maximala sessioner per dag:</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.maxClassSessionsPerDay"
              @input="handleNumberInput('maxClassSessionsPerDay', $event)"
              @focus="onFieldFocus('maxClassSessionsPerDay')"
              @blur="onFieldBlur('maxClassSessionsPerDay')"
              :min="1"
              :max="20"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.maxClassSessionsPerDay.valid,
                'input-edited': editedFields.maxClassSessionsPerDay
              }"
            />
            <span v-else class="constraint-value">{{ activeConstraints.maxClassSessionsPerDay }}</span>
            <span v-if="!fieldValidation.maxClassSessionsPerDay.valid" class="validation-error">
              {{ fieldValidation.maxClassSessionsPerDay.error }}
            </span>
            <span v-if="isDefault('maxClassSessionsPerDay') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.maxClassSessionsPerDay && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Tidigaste starttid:</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.classEarliestStartMinutes"
              @input="handleTimeMinutesInput('classEarliestStartMinutes', $event)"
              @focus="onFieldFocus('classEarliestStartMinutes')"
              @blur="onFieldBlur('classEarliestStartMinutes')"
              :min="0"
              :max="1440"
              step="15"
              class="constraint-input constraint-input-time"
              :class="{ 
                'input-invalid': !fieldValidation.classEarliestStartMinutes.valid,
                'input-edited': editedFields.classEarliestStartMinutes
              }"
              placeholder="480 (för 08:00)"
            />
            <span v-else class="constraint-value">{{ formatMinutesToTime(activeConstraints.classEarliestStartMinutes) }}</span>
            <span v-if="isEditMode" class="input-hint">
              ({{ formatMinutesToTime(customConstraints.classEarliestStartMinutes) }})
            </span>
            <span v-if="!fieldValidation.classEarliestStartMinutes.valid" class="validation-error">
              {{ fieldValidation.classEarliestStartMinutes.error }}
            </span>
            <span v-if="isDefault('classEarliestStartMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.classEarliestStartMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Senaste starttid:</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.classLatestStartMinutes"
              @input="handleTimeMinutesInput('classLatestStartMinutes', $event)"
              @focus="onFieldFocus('classLatestStartMinutes')"
              @blur="onFieldBlur('classLatestStartMinutes')"
              :min="0"
              :max="1440"
              step="15"
              class="constraint-input constraint-input-time"
              :class="{ 
                'input-invalid': !fieldValidation.classLatestStartMinutes.valid,
                'input-edited': editedFields.classLatestStartMinutes
              }"
              placeholder="600 (för 10:00)"
            />
            <span v-else class="constraint-value">{{ formatMinutesToTime(activeConstraints.classLatestStartMinutes) }}</span>
            <span v-if="isEditMode" class="input-hint">
              ({{ formatMinutesToTime(customConstraints.classLatestStartMinutes) }})
            </span>
            <span v-if="!fieldValidation.classLatestStartMinutes.valid" class="validation-error">
              {{ fieldValidation.classLatestStartMinutes.error }}
            </span>
            <span v-if="isDefault('classLatestStartMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.classLatestStartMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Lärarbegränsningar -->
      <div class="constraint-category">
        <h3 class="category-title">Lärarbegränsningar</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Maximal inaktiv tid (minuter):</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.maxTeacherIdleMinutes"
              @input="handleNumberInput('maxTeacherIdleMinutes', $event)"
              @focus="onFieldFocus('maxTeacherIdleMinutes')"
              @blur="onFieldBlur('maxTeacherIdleMinutes')"
              :min="1"
              :max="1440"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.maxTeacherIdleMinutes.valid,
                'input-edited': editedFields.maxTeacherIdleMinutes
              }"
            />
            <span v-else class="constraint-value">{{ formatMinutes(activeConstraints.maxTeacherIdleMinutes) }}</span>
            <span v-if="!fieldValidation.maxTeacherIdleMinutes.valid" class="validation-error">
              {{ fieldValidation.maxTeacherIdleMinutes.error }}
            </span>
            <span v-if="isDefault('maxTeacherIdleMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.maxTeacherIdleMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Maximala sessioner per dag:</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.maxTeacherSessionsPerDay"
              @input="handleNumberInput('maxTeacherSessionsPerDay', $event)"
              @focus="onFieldFocus('maxTeacherSessionsPerDay')"
              @blur="onFieldBlur('maxTeacherSessionsPerDay')"
              :min="1"
              :max="20"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.maxTeacherSessionsPerDay.valid,
                'input-edited': editedFields.maxTeacherSessionsPerDay
              }"
            />
            <span v-else class="constraint-value">{{ activeConstraints.maxTeacherSessionsPerDay }}</span>
            <span v-if="!fieldValidation.maxTeacherSessionsPerDay.valid" class="validation-error">
              {{ fieldValidation.maxTeacherSessionsPerDay.error }}
            </span>
            <span v-if="isDefault('maxTeacherSessionsPerDay') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.maxTeacherSessionsPerDay && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Ämnesfördelning -->
      <div class="constraint-category">
        <h3 class="category-title">Ämnesfördelning</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Inaktivera ämnesfördelning:</span>
            <label v-if="isEditMode" class="toggle-switch">
              <input
                type="checkbox"
                v-model="customConstraints.disableSubjectSpread"
                @change="handleBooleanInput('disableSubjectSpread', $event)"
                @focus="onFieldFocus('disableSubjectSpread')"
                @blur="onFieldBlur('disableSubjectSpread')"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">{{ formatBoolean(customConstraints.disableSubjectSpread) }}</span>
            </label>
            <span v-else class="constraint-value">{{ formatBoolean(activeConstraints.disableSubjectSpread) }}</span>
            <span v-if="isDefault('disableSubjectSpread') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.disableSubjectSpread && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Övergångsbuffertar -->
      <div class="constraint-category">
        <h3 class="category-title">Övergångsbuffertar</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Inaktivera övergångsbuffertar:</span>
            <label v-if="isEditMode" class="toggle-switch">
              <input
                type="checkbox"
                v-model="customConstraints.disableTransitionBuffers"
                @change="handleBooleanInput('disableTransitionBuffers', $event)"
                @focus="onFieldFocus('disableTransitionBuffers')"
                @blur="onFieldBlur('disableTransitionBuffers')"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">{{ formatBoolean(customConstraints.disableTransitionBuffers) }}</span>
            </label>
            <span v-else class="constraint-value">{{ formatBoolean(activeConstraints.disableTransitionBuffers) }}</span>
            <span v-if="isDefault('disableTransitionBuffers') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.disableTransitionBuffers && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Idrott och hälsa -->
      <div class="constraint-category">
        <h3 class="category-title">Idrott och hälsa</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Buffert efter idrott (minuter):</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.physicalEducationBufferMinutes"
              @input="handleNumberInput('physicalEducationBufferMinutes', $event)"
              @focus="onFieldFocus('physicalEducationBufferMinutes')"
              @blur="onFieldBlur('physicalEducationBufferMinutes')"
              :min="1"
              :max="120"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.physicalEducationBufferMinutes.valid,
                'input-edited': editedFields.physicalEducationBufferMinutes
              }"
            />
            <span v-else class="constraint-value">{{ formatMinutes(activeConstraints.physicalEducationBufferMinutes) }}</span>
            <span v-if="!fieldValidation.physicalEducationBufferMinutes.valid" class="validation-error">
              {{ fieldValidation.physicalEducationBufferMinutes.error }}
            </span>
            <span v-if="isDefault('physicalEducationBufferMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.physicalEducationBufferMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div class="constraint-item">
            <span class="constraint-label">Idrottsämnen:</span>
            <textarea
              v-if="isEditMode"
              v-model="physicalEducationSubjectsText"
              @input="handleArrayInput('physicalEducationSubjects', $event)"
              @focus="onFieldFocus('physicalEducationSubjects')"
              @blur="onFieldBlur('physicalEducationSubjects')"
              class="constraint-input constraint-input-array"
              :class="{ 
                'input-invalid': !fieldValidation.physicalEducationSubjects.valid,
                'input-edited': editedFields.physicalEducationSubjects
              }"
              placeholder="Idrott och hälsa 1, Idrott, Gymnastik"
              rows="2"
            ></textarea>
            <span v-else class="constraint-value">{{ formatArray(activeConstraints.physicalEducationSubjects) }}</span>
            <span v-if="isEditMode" class="input-hint">
              Separera med kommatecken
            </span>
            <span v-if="!fieldValidation.physicalEducationSubjects.valid" class="validation-error">
              {{ fieldValidation.physicalEducationSubjects.error }}
            </span>
            <span v-if="isDefault('physicalEducationSubjects') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.physicalEducationSubjects && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Lunchrast -->
      <div class="constraint-category">
        <h3 class="category-title">Lunchrast</h3>
        <div class="constraint-items">
          <div class="constraint-item">
            <span class="constraint-label">Aktiverad:</span>
            <label v-if="isEditMode" class="toggle-switch">
              <input
                type="checkbox"
                v-model="customConstraints.lunchBreak.enabled"
                @change="handleBooleanInput('lunchBreak.enabled', $event)"
                @focus="onFieldFocus('lunchBreak.enabled')"
                @blur="onFieldBlur('lunchBreak.enabled')"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">{{ formatBoolean(customConstraints.lunchBreak.enabled) }}</span>
            </label>
            <span v-else class="constraint-value">{{ formatBoolean(activeConstraints.lunchBreak.enabled) }}</span>
            <span v-if="isDefaultLunch('enabled') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.lunchBreak.enabled && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div v-if="activeConstraints.lunchBreak.enabled || isEditMode" class="constraint-item">
            <span class="constraint-label">Fönster start:</span>
            <input
              v-if="isEditMode"
              type="text"
              v-model="customConstraints.lunchBreak.windowStart"
              @input="handleTimeStringInput('lunchBreak.windowStart', $event)"
              @focus="onFieldFocus('lunchBreak.windowStart')"
              @blur="onFieldBlur('lunchBreak.windowStart')"
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              placeholder="10:30"
              class="constraint-input constraint-input-time-string"
              :class="{ 
                'input-invalid': !fieldValidation.lunchBreak.windowStart.valid,
                'input-edited': editedFields.lunchBreak.windowStart
              }"
              maxlength="5"
            />
            <span v-else class="constraint-value">{{ activeConstraints.lunchBreak.windowStart }}</span>
            <span v-if="!fieldValidation.lunchBreak.windowStart.valid" class="validation-error">
              {{ fieldValidation.lunchBreak.windowStart.error }}
            </span>
            <span v-if="isDefaultLunch('windowStart') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.lunchBreak.windowStart && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div v-if="activeConstraints.lunchBreak.enabled || isEditMode" class="constraint-item">
            <span class="constraint-label">Fönster slut:</span>
            <input
              v-if="isEditMode"
              type="text"
              v-model="customConstraints.lunchBreak.windowEnd"
              @input="handleTimeStringInput('lunchBreak.windowEnd', $event)"
              @focus="onFieldFocus('lunchBreak.windowEnd')"
              @blur="onFieldBlur('lunchBreak.windowEnd')"
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              placeholder="13:30"
              class="constraint-input constraint-input-time-string"
              :class="{ 
                'input-invalid': !fieldValidation.lunchBreak.windowEnd.valid,
                'input-edited': editedFields.lunchBreak.windowEnd
              }"
              maxlength="5"
            />
            <span v-else class="constraint-value">{{ activeConstraints.lunchBreak.windowEnd }}</span>
            <span v-if="!fieldValidation.lunchBreak.windowEnd.valid" class="validation-error">
              {{ fieldValidation.lunchBreak.windowEnd.error }}
            </span>
            <span v-if="isDefaultLunch('windowEnd') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.lunchBreak.windowEnd && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div v-if="activeConstraints.lunchBreak.enabled || isEditMode" class="constraint-item">
            <span class="constraint-label">Varaktighet (minuter):</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.lunchBreak.durationMinutes"
              @input="handleNumberInput('lunchBreak.durationMinutes', $event)"
              @focus="onFieldFocus('lunchBreak.durationMinutes')"
              @blur="onFieldBlur('lunchBreak.durationMinutes')"
              :min="1"
              :max="120"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.lunchBreak.durationMinutes.valid,
                'input-edited': editedFields.lunchBreak.durationMinutes
              }"
            />
            <span v-else class="constraint-value">{{ formatMinutes(activeConstraints.lunchBreak.durationMinutes) }}</span>
            <span v-if="!fieldValidation.lunchBreak.durationMinutes.valid" class="validation-error">
              {{ fieldValidation.lunchBreak.durationMinutes.error }}
            </span>
            <span v-if="isDefaultLunch('durationMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.lunchBreak.durationMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
          <div v-if="activeConstraints.lunchBreak.enabled || isEditMode" class="constraint-item">
            <span class="constraint-label">Granularitet (minuter):</span>
            <input
              v-if="isEditMode"
              type="number"
              v-model.number="customConstraints.lunchBreak.granularityMinutes"
              @input="handleNumberInput('lunchBreak.granularityMinutes', $event)"
              @focus="onFieldFocus('lunchBreak.granularityMinutes')"
              @blur="onFieldBlur('lunchBreak.granularityMinutes')"
              :min="1"
              :max="60"
              step="1"
              class="constraint-input constraint-input-number"
              :class="{ 
                'input-invalid': !fieldValidation.lunchBreak.granularityMinutes.valid,
                'input-edited': editedFields.lunchBreak.granularityMinutes
              }"
            />
            <span v-else class="constraint-value">{{ formatMinutes(activeConstraints.lunchBreak.granularityMinutes) }}</span>
            <span v-if="!fieldValidation.lunchBreak.granularityMinutes.valid" class="validation-error">
              {{ fieldValidation.lunchBreak.granularityMinutes.error }}
            </span>
            <span v-if="isDefaultLunch('granularityMinutes') && !isEditMode" class="default-badge">Standard</span>
            <span v-if="editedFields.lunchBreak.granularityMinutes && isEditMode" class="edited-badge">Redigerad</span>
          </div>
        </div>
      </div>

      <!-- Starttid -->
      <div class="constraint-category">
        <h3 class="category-title">Starttid</h3>
        <div class="constraint-items">
          <div v-for="(slot, index) in timeSlots" :key="slot.day" class="time-slot-row">
            <div class="time-slot-day-locked">{{ slot.day }}</div>
            <input 
              v-model="slot.start" 
              type="text" 
              placeholder="08:00" 
              class="time-slot-input" 
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              @input="validateTimeSlots"
              @blur="validateTimeSlots"
            />
            <span class="time-separator">-</span>
            <input 
              v-model="slot.end" 
              type="text" 
              placeholder="16:30" 
              class="time-slot-input" 
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
              @input="validateTimeSlots"
              @blur="validateTimeSlots"
            />
          </div>
          <div v-if="!timeSlotsValidation.valid" class="validation-error">
            {{ timeSlotsValidation.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, computed, onMounted } from 'vue';
import { 
  logTimeSlotValidationError, 
  logTimeSlotInit, 
  logTimeSlotSave, 
  logTimeSlotStructureError 
} from '../utils/errorLogger';

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
    },
    customConstraints: {
      type: Object,
      default: () => null
    },
    timeSlots: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const errorMessage = ref('');

    // Main editable constraints object - mirrors solver constraint structure exactly
    const customConstraints = reactive({
      maxClassIdleMinutes: null,
      maxTeacherIdleMinutes: null,
      maxClassSessionsPerDay: null,
      maxTeacherSessionsPerDay: null,
      disableSubjectSpread: null,
      disableTransitionBuffers: null,
      physicalEducationBufferMinutes: null,
      physicalEducationSubjects: null,
      classEarliestStartMinutes: null,
      classLatestStartMinutes: null,
      lunchBreak: {
        enabled: null,
        windowStart: null,
        windowEnd: null,
        durationMinutes: null,
        granularityMinutes: null
      }
    });

    // Original values snapshot - for cancel functionality
    const originalConstraints = ref(null);

    // Track which fields have been manually edited
    const editedFields = reactive({
      maxClassIdleMinutes: false,
      maxTeacherIdleMinutes: false,
      maxClassSessionsPerDay: false,
      maxTeacherSessionsPerDay: false,
      disableSubjectSpread: false,
      disableTransitionBuffers: false,
      physicalEducationBufferMinutes: false,
      physicalEducationSubjects: false,
      classEarliestStartMinutes: false,
      classLatestStartMinutes: false,
      lunchBreak: {
        enabled: false,
        windowStart: false,
        windowEnd: false,
        durationMinutes: false,
        granularityMinutes: false
      }
    });

    // Track validation state for each field
    const fieldValidation = reactive({
      maxClassIdleMinutes: { valid: true, error: null, warning: null },
      maxTeacherIdleMinutes: { valid: true, error: null, warning: null },
      maxClassSessionsPerDay: { valid: true, error: null, warning: null },
      maxTeacherSessionsPerDay: { valid: true, error: null, warning: null },
      disableSubjectSpread: { valid: true, error: null, warning: null },
      disableTransitionBuffers: { valid: true, error: null, warning: null },
      physicalEducationBufferMinutes: { valid: true, error: null, warning: null },
      physicalEducationSubjects: { valid: true, error: null, warning: null },
      classEarliestStartMinutes: { valid: true, error: null, warning: null },
      classLatestStartMinutes: { valid: true, error: null, warning: null },
      lunchBreak: {
        enabled: { valid: true, error: null, warning: null },
        windowStart: { valid: true, error: null, warning: null },
        windowEnd: { valid: true, error: null, warning: null },
        durationMinutes: { valid: true, error: null, warning: null },
        granularityMinutes: { valid: true, error: null, warning: null }
      }
    });

    // Time slots management
    const timeSlots = ref([]);
    const originalTimeSlots = ref(null); // Track original time slots for change detection
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlotsValidation = ref({ valid: true, error: null });

    // Edit mode state - always enabled for direct editing
    const isEditMode = ref(true);
    const editingFieldId = ref(null);

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

    // Enhanced logging utilities with context
    const logError = (action, error, details = {}) => {
      const logData = {
        component: 'ConstraintsPage',
        action,
        error: {
          message: error?.message || String(error),
          stack: error?.stack,
          name: error?.name
        },
        timestamp: new Date().toISOString(),
        presetId: props.presetId,
        hasSolverOptions: !!props.solverOptions,
        ...details
      };
      console.error('[ConstraintsPage] [ERROR]', action, logData);
      return logData;
    };

    const logInfo = (action, details = {}) => {
      const logData = {
        component: 'ConstraintsPage',
        action,
        timestamp: new Date().toISOString(),
        presetId: props.presetId,
        hasSolverOptions: !!props.solverOptions,
        ...details
      };
      console.log('[ConstraintsPage] [INFO]', action, logData);
      return logData;
    };

    const logWarning = (action, details = {}) => {
      const logData = {
        component: 'ConstraintsPage',
        action,
        timestamp: new Date().toISOString(),
        presetId: props.presetId,
        hasSolverOptions: !!props.solverOptions,
        ...details
      };
      console.warn('[ConstraintsPage] [WARN]', action, logData);
      return logData;
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

    // Get final constraints to display/use (custom if edited, else computed/default)
    const activeConstraints = computed(() => {
      const merged = mergedConstraints.value;
      const active = {};
      
      Object.keys(customConstraints).forEach(key => {
        if (key === 'lunchBreak') {
          active.lunchBreak = {
            enabled: editedFields.lunchBreak.enabled 
              ? customConstraints.lunchBreak.enabled 
              : merged.lunchBreak.enabled,
            windowStart: editedFields.lunchBreak.windowStart
              ? customConstraints.lunchBreak.windowStart
              : merged.lunchBreak.windowStart,
            windowEnd: editedFields.lunchBreak.windowEnd
              ? customConstraints.lunchBreak.windowEnd
              : merged.lunchBreak.windowEnd,
            durationMinutes: editedFields.lunchBreak.durationMinutes
              ? customConstraints.lunchBreak.durationMinutes
              : merged.lunchBreak.durationMinutes,
            granularityMinutes: editedFields.lunchBreak.granularityMinutes
              ? customConstraints.lunchBreak.granularityMinutes
              : merged.lunchBreak.granularityMinutes
          };
        } else {
          active[key] = editedFields[key] 
            ? customConstraints[key] 
            : merged[key];
        }
      });
      
      return active;
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

    // Initialize customConstraints from mergedConstraints or from saved customConstraints
    const initializeConstraints = () => {
      try {
        logInfo('INIT_CONSTRAINTS', { 
          hasSolverOptions: !!props.solverOptions,
          hasCustomConstraints: !!props.customConstraints,
          presetId: props.presetId
        });
        
        // If we have saved customConstraints from ViewerPage, merge them with defaults
        // Otherwise use merged constraints from solverOptions
        let baseConstraints;
        if (props.customConstraints && Object.keys(props.customConstraints).length > 0) {
          // Merge saved customConstraints with defaults
          baseConstraints = {
            ...CONSTRAINT_DEFAULTS,
            ...props.customConstraints,
            lunchBreak: {
              ...CONSTRAINT_DEFAULTS.lunchBreak,
              ...(props.customConstraints.lunchBreak || {})
            }
          };
          logInfo('INIT_CONSTRAINTS_FROM_SAVED', {
            constraintsCount: Object.keys(props.customConstraints).length
          });
        } else {
          baseConstraints = mergedConstraints.value;
        }
        
        customConstraints.maxClassIdleMinutes = baseConstraints.maxClassIdleMinutes;
        customConstraints.maxTeacherIdleMinutes = baseConstraints.maxTeacherIdleMinutes;
        customConstraints.maxClassSessionsPerDay = baseConstraints.maxClassSessionsPerDay;
        customConstraints.maxTeacherSessionsPerDay = baseConstraints.maxTeacherSessionsPerDay;
        customConstraints.disableSubjectSpread = baseConstraints.disableSubjectSpread;
        customConstraints.disableTransitionBuffers = baseConstraints.disableTransitionBuffers;
        customConstraints.physicalEducationBufferMinutes = baseConstraints.physicalEducationBufferMinutes;
        customConstraints.physicalEducationSubjects = Array.isArray(baseConstraints.physicalEducationSubjects) 
          ? [...baseConstraints.physicalEducationSubjects]
          : [];
        customConstraints.classEarliestStartMinutes = baseConstraints.classEarliestStartMinutes;
        customConstraints.classLatestStartMinutes = baseConstraints.classLatestStartMinutes;
        customConstraints.lunchBreak = {
          enabled: baseConstraints.lunchBreak.enabled,
          windowStart: baseConstraints.lunchBreak.windowStart,
          windowEnd: baseConstraints.lunchBreak.windowEnd,
          durationMinutes: baseConstraints.lunchBreak.durationMinutes,
          granularityMinutes: baseConstraints.lunchBreak.granularityMinutes
        };
        
        // Only reset editedFields if we don't have a saved snapshot
        if (!originalConstraints.value) {
          Object.keys(editedFields).forEach(key => {
            if (key !== 'lunchBreak') {
              editedFields[key] = false;
            }
          });
          Object.keys(editedFields.lunchBreak).forEach(key => {
            editedFields.lunchBreak[key] = false;
          });
        }
        
        // Store original snapshot if not already stored
        if (!originalConstraints.value) {
          originalConstraints.value = JSON.parse(JSON.stringify(customConstraints));
        }
        
        resetValidationErrors();
        
        logInfo('INIT_CONSTRAINTS_COMPLETE', { 
          constraintsCount: Object.keys(customConstraints).length,
          presetId: props.presetId
        });
      } catch (error) {
        logError('INIT_CONSTRAINTS', error, { presetId: props.presetId });
        errorMessage.value = 'Kunde inte initiera begränsningar.';
      }
    };

    // Reset all validation errors to valid state
    const resetValidationErrors = () => {
      Object.keys(fieldValidation).forEach(key => {
        if (key !== 'lunchBreak') {
          fieldValidation[key] = { valid: true, error: null, warning: null };
        }
      });
      Object.keys(fieldValidation.lunchBreak).forEach(key => {
        fieldValidation.lunchBreak[key] = { valid: true, error: null, warning: null };
      });
    };

    // Track if any changes have been made since last save
    const hasUnsavedChanges = computed(() => {
      // Check constraints changes
      if (originalConstraints.value) {
        const current = JSON.stringify(customConstraints);
        const original = JSON.stringify(originalConstraints.value);
        if (current !== original) return true;
      }
      
      // Check time slots changes
      if (originalTimeSlots.value) {
        const current = JSON.stringify(timeSlots.value);
        const original = JSON.stringify(originalTimeSlots.value);
        if (current !== original) return true;
      } else if (timeSlots.value.length > 0) {
        // If we have time slots but no original snapshot, consider it changed
        return true;
      }
      
      return false;
    });

    // Track if any field is currently invalid
    const hasValidationErrors = computed(() => {
      const checkField = (field) => {
        if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
          return Object.keys(field).some(key => {
            const val = field[key];
            return val !== null && val !== undefined && checkField(val);
          });
        }
        return field && typeof field === 'object' && field.valid === false;
      };
      return checkField(fieldValidation);
    });

    // Count total validation errors
    const validationErrorCount = computed(() => {
      let count = 0;
      const countErrors = (field) => {
        if (!field) return; // Safety check for null/undefined
        if (typeof field === 'object' && !Array.isArray(field)) {
          Object.values(field).forEach(val => {
            if (val !== null && val !== undefined) {
              countErrors(val);
            }
          });
        } else if (field && typeof field === 'object' && 'valid' in field && field.valid === false) {
          count++;
        }
      };
      try {
        countErrors(fieldValidation);
      } catch (error) {
        logError('VALIDATION_ERROR_COUNT', error);
        return 0;
      }
      return count;
    });

    // Check if save is allowed
    const canSave = computed(() => {
      // Edit mode is always enabled, so we don't need to check it
      return hasUnsavedChanges.value && 
             !hasValidationErrors.value && 
             validationErrorCount.value === 0;
    });

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

    // Edit mode functions (kept for compatibility, but edit mode is always on)
    const enterEditMode = () => {
      // Edit mode is always enabled, so this is a no-op
      logInfo('ENTER_EDIT_MODE', { note: 'Edit mode is always enabled' });
    };

    const exitEditMode = () => {
      try {
        logInfo('EXIT_EDIT_MODE', { 
          hadUnsavedChanges: hasUnsavedChanges.value
        });
        
        isEditMode.value = false;
        editingFieldId.value = null;
      } catch (error) {
        logError('EXIT_EDIT_MODE', error);
      }
    };

    // Field focus/blur handlers
    const onFieldFocus = (fieldPath) => {
      editingFieldId.value = fieldPath;
      logInfo('FIELD_FOCUS', { field: fieldPath });
    };

    const onFieldBlur = (fieldPath) => {
      validateField(fieldPath);
      editingFieldId.value = null;
      logInfo('FIELD_BLUR', { field: fieldPath });
    };

    // Parse time string "HH:MM" to minutes
    const parseTimeStringToMinutes = (timeString) => {
      try {
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }
        return hours * 60 + minutes;
      } catch (error) {
        logError('PARSE_TIME_STRING', error, { timeString });
        return null;
      }
    };

    // Validation functions
    const validateIdleMinutes = (field, value) => {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Värdet får inte vara tomt', warning: null };
      }
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Måste vara ett nummer', warning: null };
      }
      if (numValue <= 0) {
        return { valid: false, error: 'Måste vara större än 0', warning: null };
      }
      if (numValue > 1440) {
        return { valid: false, error: 'Får inte överstiga 1440 minuter (24 timmar)', warning: null };
      }
      let warning = null;
      if (numValue < 30) {
        warning = 'Mycket lågt värde. Rekommenderat: 60-600 minuter.';
      } else if (numValue > 600) {
        warning = 'Mycket högt värde. Rekommenderat: 60-600 minuter.';
      }
      return { valid: true, error: null, warning };
    };

    const validateSessionsPerDay = (field, value) => {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Värdet får inte vara tomt', warning: null };
      }
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Måste vara ett nummer', warning: null };
      }
      if (numValue <= 0) {
        return { valid: false, error: 'Måste vara större än 0', warning: null };
      }
      if (numValue > 20) {
        return { valid: false, error: 'Får inte överstiga 20 sessioner per dag', warning: null };
      }
      let warning = null;
      if (numValue > 10) {
        warning = 'Mycket högt värde. Rekommenderat: 1-10 sessioner per dag.';
      }
      return { valid: true, error: null, warning };
    };

    const validateClassStartTime = (field, value, allConstraints) => {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Värdet får inte vara tomt', warning: null };
      }
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Måste vara ett nummer', warning: null };
      }
      if (numValue < 0) {
        return { valid: false, error: 'Måste vara 0 eller större', warning: null };
      }
      if (numValue > 1440) {
        return { valid: false, error: 'Får inte överstiga 1440 minuter (24:00)', warning: null };
      }
      if (field === 'classEarliestStartMinutes') {
        const latest = allConstraints.classLatestStartMinutes;
        if (latest !== null && latest !== undefined && numValue >= latest) {
          return { 
            valid: false, 
            error: 'Tidigaste starttid måste vara före senaste starttid', 
            warning: null 
          };
        }
      } else if (field === 'classLatestStartMinutes') {
        const earliest = allConstraints.classEarliestStartMinutes;
        if (earliest !== null && earliest !== undefined && numValue <= earliest) {
          return { 
            valid: false, 
            error: 'Senaste starttid måste vara efter tidigaste starttid', 
            warning: null 
          };
        }
      }
      return { valid: true, error: null, warning: null };
    };

    const validateBufferMinutes = (field, value) => {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Värdet får inte vara tomt', warning: null };
      }
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Måste vara ett nummer', warning: null };
      }
      if (numValue <= 0) {
        return { valid: false, error: 'Måste vara större än 0', warning: null };
      }
      if (numValue > 120) {
        return { valid: false, error: 'Får inte överstiga 120 minuter', warning: null };
      }
      let warning = null;
      if (numValue < 5 || numValue > 60) {
        warning = 'Rekommenderat värde: 5-60 minuter.';
      }
      return { valid: true, error: null, warning };
    };

    const validateSubjectArray = (field, value) => {
      if (!Array.isArray(value)) {
        return { valid: false, error: 'Måste vara en lista med ämnen', warning: null };
      }
      if (value.length === 0) {
        return { valid: false, error: 'Måste innehålla minst ett ämne', warning: null };
      }
      const hasEmpty = value.some(subject => !subject || subject.trim().length === 0);
      if (hasEmpty) {
        return { valid: false, error: 'Alla ämnen måste ha ett namn', warning: null };
      }
      return { valid: true, error: null, warning: null };
    };

    const validateTimeString = (fieldPath, value, allConstraints) => {
      if (!value || value.trim().length === 0) {
        return { valid: false, error: 'Tid får inte vara tom', warning: null };
      }
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(value.trim())) {
        return { valid: false, error: 'Ogiltigt tidsformat. Använd HH:MM (t.ex. 10:30)', warning: null };
      }
      const [, field] = fieldPath.split('.');
      const lunchBreak = allConstraints.lunchBreak;
      
      if (field === 'windowStart' && lunchBreak.windowEnd) {
        const startMinutes = parseTimeStringToMinutes(value);
        const endMinutes = parseTimeStringToMinutes(lunchBreak.windowEnd);
        if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
          return { 
            valid: false, 
            error: 'Starttid måste vara före sluttid', 
            warning: null 
          };
        }
      } else if (field === 'windowEnd' && lunchBreak.windowStart) {
        const startMinutes = parseTimeStringToMinutes(lunchBreak.windowStart);
        const endMinutes = parseTimeStringToMinutes(value);
        if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
          return { 
            valid: false, 
            error: 'Sluttid måste vara efter starttid', 
            warning: null 
          };
        }
        if (lunchBreak.durationMinutes) {
          const windowDuration = endMinutes - startMinutes;
          if (lunchBreak.durationMinutes >= windowDuration) {
            return { 
              valid: false, 
              error: `Lunchvaraktighet (${lunchBreak.durationMinutes} min) måste vara kortare än fönstret (${windowDuration} min)`, 
              warning: null 
            };
          }
        }
      }
      return { valid: true, error: null, warning: null };
    };

    const validateLunchMinutes = (fieldPath, value, allConstraints) => {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Värdet får inte vara tomt', warning: null };
      }
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        return { valid: false, error: 'Måste vara ett nummer', warning: null };
      }
      if (numValue <= 0) {
        return { valid: false, error: 'Måste vara större än 0', warning: null };
      }
      const [, field] = fieldPath.split('.');
      const lunchBreak = allConstraints.lunchBreak;
      
      if (field === 'durationMinutes') {
        if (numValue > 120) {
          return { valid: false, error: 'Får inte överstiga 120 minuter', warning: null };
        }
        if (lunchBreak.windowStart && lunchBreak.windowEnd) {
          const startMinutes = parseTimeStringToMinutes(lunchBreak.windowStart);
          const endMinutes = parseTimeStringToMinutes(lunchBreak.windowEnd);
          if (startMinutes !== null && endMinutes !== null) {
            const windowDuration = endMinutes - startMinutes;
            if (numValue >= windowDuration) {
              return { 
                valid: false, 
                error: `Varaktighet (${numValue} min) måste vara kortare än fönstret (${windowDuration} min)`, 
                warning: null 
              };
            }
          }
        }
      } else if (field === 'granularityMinutes') {
        if (numValue > 60) {
          return { valid: false, error: 'Får inte överstiga 60 minuter', warning: null };
        }
        let warning = null;
        if (numValue < 5 || numValue > 30) {
          warning = 'Rekommenderat värde: 5-30 minuter.';
        }
        return { valid: true, error: null, warning };
      }
      return { valid: true, error: null, warning: null };
    };

    const validateBoolean = (field, value) => {
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Måste vara true eller false', warning: null };
      }
      return { valid: true, error: null, warning: null };
    };

    const validateLunchBreakField = (fieldPath, value, allConstraints) => {
      const [, field] = fieldPath.split('.');
      
      if (field === 'windowStart' || field === 'windowEnd') {
        return validateTimeString(fieldPath, value, allConstraints);
      } else if (field === 'durationMinutes' || field === 'granularityMinutes') {
        return validateLunchMinutes(fieldPath, value, allConstraints);
      } else if (field === 'enabled') {
        return validateBoolean(fieldPath, value);
      }
      
      return { valid: true, error: null, warning: null };
    };

    const validateField = (fieldPath) => {
      try {
        const [parent, child] = fieldPath.includes('.') ? fieldPath.split('.') : [fieldPath, null];
        const value = child ? customConstraints[parent][child] : customConstraints[parent];
        const active = activeConstraints.value;
        
        let validation = { valid: true, error: null, warning: null };
        
        if (fieldPath === 'maxClassIdleMinutes' || fieldPath === 'maxTeacherIdleMinutes') {
          validation = validateIdleMinutes(fieldPath, value);
        } else if (fieldPath === 'maxClassSessionsPerDay' || fieldPath === 'maxTeacherSessionsPerDay') {
          validation = validateSessionsPerDay(fieldPath, value);
        } else if (fieldPath === 'classEarliestStartMinutes' || fieldPath === 'classLatestStartMinutes') {
          validation = validateClassStartTime(fieldPath, value, active);
        } else if (fieldPath === 'physicalEducationBufferMinutes') {
          validation = validateBufferMinutes(fieldPath, value);
        } else if (fieldPath === 'physicalEducationSubjects') {
          validation = validateSubjectArray(fieldPath, value);
        } else if (fieldPath.startsWith('lunchBreak.')) {
          validation = validateLunchBreakField(fieldPath, value, active);
        } else if (fieldPath === 'disableSubjectSpread' || fieldPath === 'disableTransitionBuffers') {
          validation = validateBoolean(fieldPath, value);
        }
        
        if (child) {
          fieldValidation[parent][child] = validation;
        } else {
          fieldValidation[parent] = validation;
        }
        
        if (!validation.valid) {
          logError('VALIDATE_FIELD', new Error(validation.error), { fieldPath, value });
        }
        
        return validation;
      } catch (error) {
        logError('VALIDATE_FIELD', error, { fieldPath });
        return { valid: false, error: 'Valideringsfel uppstod', warning: null };
      }
    };

    const validateAllConstraints = () => {
      const errors = [];
      
      Object.keys(customConstraints).forEach(key => {
        if (key !== 'lunchBreak') {
          const validation = validateField(key);
          if (!validation.valid) {
            errors.push({ field: key, error: validation.error });
          }
        }
      });
      
      Object.keys(customConstraints.lunchBreak).forEach(key => {
        const validation = validateField(`lunchBreak.${key}`);
        if (!validation.valid) {
          errors.push({ field: `lunchBreak.${key}`, error: validation.error });
        }
      });
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    };

    // Build constraints for solver - include all edited constraints
    const buildConstraintsForSolver = () => {
      const active = activeConstraints.value;
      const constraints = {};
      
      // Include all constraints that have been edited, regardless of whether they match defaults
      // This ensures user edits are always saved
      if (editedFields.maxClassIdleMinutes || active.maxClassIdleMinutes !== null) {
        constraints.maxClassIdleMinutes = active.maxClassIdleMinutes;
      }
      
      if (editedFields.maxClassSessionsPerDay || active.maxClassSessionsPerDay !== null) {
        constraints.maxClassSessionsPerDay = active.maxClassSessionsPerDay;
      }
      
      // Always include start time constraints if they're set (they're critical)
      if (editedFields.classEarliestStartMinutes || active.classEarliestStartMinutes !== null) {
        constraints.classEarliestStartMinutes = active.classEarliestStartMinutes;
        logInfo('INCLUDING_EARLIEST_START', {
          value: active.classEarliestStartMinutes,
          formatted: `${Math.floor(active.classEarliestStartMinutes/60)}:${String(active.classEarliestStartMinutes%60).padStart(2,'0')}`
        });
      }
      
      if (active.classLatestStartMinutes !== null && active.classLatestStartMinutes !== undefined) {
        constraints.classLatestStartMinutes = active.classLatestStartMinutes;
        logInfo('INCLUDING_LATEST_START', {
          value: active.classLatestStartMinutes,
          formatted: `${Math.floor(active.classLatestStartMinutes/60)}:${String(active.classLatestStartMinutes%60).padStart(2,'0')}`
        });
      }
      
      if (active.maxTeacherIdleMinutes !== null && active.maxTeacherIdleMinutes !== undefined) {
        constraints.maxTeacherIdleMinutes = active.maxTeacherIdleMinutes;
      }
      
      if (active.maxTeacherSessionsPerDay !== null && active.maxTeacherSessionsPerDay !== undefined) {
        constraints.maxTeacherSessionsPerDay = active.maxTeacherSessionsPerDay;
      }
      
      if (active.disableSubjectSpread !== null && active.disableSubjectSpread !== undefined) {
        constraints.disableSubjectSpread = active.disableSubjectSpread;
      }
      
      if (active.disableTransitionBuffers !== null && active.disableTransitionBuffers !== undefined) {
        constraints.disableTransitionBuffers = active.disableTransitionBuffers;
      }
      
      if (active.physicalEducationBufferMinutes !== null && active.physicalEducationBufferMinutes !== undefined) {
        constraints.physicalEducationBufferMinutes = active.physicalEducationBufferMinutes;
      }
      
      if (active.physicalEducationSubjects !== null && active.physicalEducationSubjects !== undefined && Array.isArray(active.physicalEducationSubjects) && active.physicalEducationSubjects.length > 0) {
        constraints.physicalEducationSubjects = active.physicalEducationSubjects;
      }
      
      // Include lunch break if any field was edited
      const lunchEdited = Object.values(editedFields.lunchBreak).some(v => v);
      if (lunchEdited) {
        constraints.lunchBreak = {
          enabled: active.lunchBreak.enabled,
          windowStart: active.lunchBreak.windowStart,
          windowEnd: active.lunchBreak.windowEnd,
          durationMinutes: active.lunchBreak.durationMinutes,
          granularityMinutes: active.lunchBreak.granularityMinutes
        };
      }
      
      logInfo('BUILD_CONSTRAINTS_FOR_SOLVER', {
        constraintsCount: Object.keys(constraints).length,
        editedFieldsCount: Object.values(editedFields).filter(v => v === true).length + 
                          Object.values(editedFields.lunchBreak).filter(v => v === true).length
      });
      
      return constraints;
    };

    const getEditedFieldsMap = () => {
      return {
        maxClassIdleMinutes: editedFields.maxClassIdleMinutes,
        maxTeacherIdleMinutes: editedFields.maxTeacherIdleMinutes,
        maxClassSessionsPerDay: editedFields.maxClassSessionsPerDay,
        maxTeacherSessionsPerDay: editedFields.maxTeacherSessionsPerDay,
        disableSubjectSpread: editedFields.disableSubjectSpread,
        disableTransitionBuffers: editedFields.disableTransitionBuffers,
        physicalEducationBufferMinutes: editedFields.physicalEducationBufferMinutes,
        physicalEducationSubjects: editedFields.physicalEducationSubjects,
        classEarliestStartMinutes: editedFields.classEarliestStartMinutes,
        classLatestStartMinutes: editedFields.classLatestStartMinutes,
        lunchBreak: { ...editedFields.lunchBreak }
      };
    };

    // Save constraints
    const saveConstraints = async () => {
      try {
        logInfo('SAVE_CONSTRAINTS_START', { 
          hasUnsavedChanges: hasUnsavedChanges.value,
          validationErrors: hasValidationErrors.value,
          errorCount: validationErrorCount.value
        });
        
        const validationResult = validateAllConstraints();
        const timeSlotsValid = validateTimeSlots();
        
        if (!validationResult.valid || !timeSlotsValid) {
          const errors = [...validationResult.errors];
          if (!timeSlotsValid) {
            errors.push({ field: 'timeSlots', error: timeSlotsValidation.value.error });
          }
          logError('SAVE_CONSTRAINTS_VALIDATION_FAILED', new Error('Validation failed'), {
            errors: errors,
            errorCount: errors.length
          });
          errorMessage.value = `${errors.length} fel måste åtgärdas innan sparning.`;
          scrollToFirstError();
          return;
        }
        
        const constraintsToSave = buildConstraintsForSolver();
        
        if (!constraintsToSave || Object.keys(constraintsToSave).length === 0) {
          logWarning('SAVE_CONSTRAINTS_EMPTY', {});
          errorMessage.value = 'Inga begränsningar att spara.';
          return;
        }
        
        // Emit constraints-updated event - App.vue will capture it (always mounted)
        // and ViewerPage will also capture it if currently mounted
        const eventDetail = {
          constraints: constraintsToSave,
          presetId: props.presetId,
          editedFields: getEditedFieldsMap(),
          timestamp: new Date().toISOString()
        };
        
        logInfo('DISPATCHING_CONSTRAINTS_UPDATED_EVENT', {
          constraintsCount: Object.keys(constraintsToSave).length,
          presetId: props.presetId,
          constraints: JSON.stringify(constraintsToSave),
          editedFieldsCount: Object.values(getEditedFieldsMap()).filter(v => v === true || (typeof v === 'object' && Object.values(v).some(vv => vv === true))).length
        });
        
        window.dispatchEvent(new CustomEvent('constraints-updated', {
          detail: eventDetail
        }));
        
        logInfo('CONSTRAINTS_UPDATED_EVENT_DISPATCHED', {
          constraintsCount: Object.keys(constraintsToSave).length,
          presetId: props.presetId,
          eventDispatched: true
        });
        
        // Time slots are already validated above (line 1362), so we can safely dispatch
        // Emit time-slots-updated event with validated data
        const timeSlotsToDispatch = JSON.parse(JSON.stringify(timeSlots.value));
        window.dispatchEvent(new CustomEvent('time-slots-updated', {
          detail: {
            timeSlots: timeSlotsToDispatch,
            presetId: props.presetId,
            timestamp: new Date().toISOString()
          }
        }));
        
        logTimeSlotSave('SAVE_TIME_SLOTS_SUCCESS', timeSlotsToDispatch, true);
        logInfo('TIME_SLOTS_UPDATED_EVENT_DISPATCHED', {
          timeSlotsCount: timeSlotsToDispatch.length,
          presetId: props.presetId
        });
        
        // Also update navigation state so if user navigates back, constraints are preserved
        // But don't navigate away automatically - let user stay on page
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: {
            page: 'constraints', // Stay on constraints page
            presetId: props.presetId,
            solverOptions: props.solverOptions,
            customConstraints: constraintsToSave // Pass back so they persist
          }
        }));
        
        // Update original snapshots (changes are now saved)
        originalConstraints.value = JSON.parse(JSON.stringify(customConstraints));
        originalTimeSlots.value = JSON.parse(JSON.stringify(timeSlots.value));
        
        // Don't exit edit mode - keep it always enabled
        // exitEditMode();
        
        logInfo('SAVE_CONSTRAINTS_SUCCESS', { 
          constraintsCount: Object.keys(constraintsToSave).length,
          presetId: props.presetId,
          constraints: JSON.stringify(constraintsToSave)
        });
        
        errorMessage.value = '';
        
        // Show success message briefly
        const successMsg = 'Begränsningar sparade!';
        errorMessage.value = successMsg;
        setTimeout(() => {
          if (errorMessage.value === successMsg) {
            errorMessage.value = '';
          }
        }, 2000);
      } catch (error) {
        logError('SAVE_CONSTRAINTS', error, {
          customConstraints: JSON.stringify(customConstraints),
          presetId: props.presetId
        });
        errorMessage.value = 'Kunde inte spara begränsningar. Försök igen.';
      }
    };

    // Reset to defaults
    const resetToDefaults = () => {
      try {
        logInfo('RESET_TO_DEFAULTS', { 
          hadUnsavedChanges: hasUnsavedChanges.value
        });
        
        customConstraints.maxClassIdleMinutes = CONSTRAINT_DEFAULTS.maxClassIdleMinutes;
        customConstraints.maxTeacherIdleMinutes = CONSTRAINT_DEFAULTS.maxTeacherIdleMinutes;
        customConstraints.maxClassSessionsPerDay = CONSTRAINT_DEFAULTS.maxClassSessionsPerDay;
        customConstraints.maxTeacherSessionsPerDay = CONSTRAINT_DEFAULTS.maxTeacherSessionsPerDay;
        customConstraints.disableSubjectSpread = CONSTRAINT_DEFAULTS.disableSubjectSpread;
        customConstraints.disableTransitionBuffers = CONSTRAINT_DEFAULTS.disableTransitionBuffers;
        customConstraints.physicalEducationBufferMinutes = CONSTRAINT_DEFAULTS.physicalEducationBufferMinutes;
        customConstraints.physicalEducationSubjects = [...CONSTRAINT_DEFAULTS.physicalEducationSubjects];
        customConstraints.classEarliestStartMinutes = CONSTRAINT_DEFAULTS.classEarliestStartMinutes;
        customConstraints.classLatestStartMinutes = CONSTRAINT_DEFAULTS.classLatestStartMinutes;
        customConstraints.lunchBreak = {
          enabled: CONSTRAINT_DEFAULTS.lunchBreak.enabled,
          windowStart: CONSTRAINT_DEFAULTS.lunchBreak.windowStart,
          windowEnd: CONSTRAINT_DEFAULTS.lunchBreak.windowEnd,
          durationMinutes: CONSTRAINT_DEFAULTS.lunchBreak.durationMinutes,
          granularityMinutes: CONSTRAINT_DEFAULTS.lunchBreak.granularityMinutes
        };
        
        Object.keys(editedFields).forEach(key => {
          if (key !== 'lunchBreak') {
            editedFields[key] = true;
          }
        });
        Object.keys(editedFields.lunchBreak).forEach(key => {
          editedFields.lunchBreak[key] = true;
        });
        
        validateAllConstraints();
        originalConstraints.value = JSON.parse(JSON.stringify(customConstraints));
        
        logInfo('RESET_TO_DEFAULTS_COMPLETE', {});
      } catch (error) {
        logError('RESET_TO_DEFAULTS', error);
        errorMessage.value = 'Kunde inte återställa till standardvärden.';
      }
    };

    const scrollToFirstError = () => {
      try {
        const firstErrorField = document.querySelector('.input-invalid');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      } catch (error) {
        logError('SCROLL_TO_FIRST_ERROR', error);
      }
    };

    // Input handlers
    const handleNumberInput = (field, event) => {
      try {
        const value = event.target.value;
        const numValue = parseInt(value, 10);
        
        // Handle nested fields (lunchBreak.durationMinutes, lunchBreak.granularityMinutes)
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          editedFields[parent][child] = true;
          customConstraints[parent][child] = isNaN(numValue) ? null : numValue;
          validateField(field);
          // Cross-validate lunch break fields
          if (child === 'durationMinutes') {
            validateField('lunchBreak.windowStart');
            validateField('lunchBreak.windowEnd');
          }
        } else {
          editedFields[field] = true;
          customConstraints[field] = isNaN(numValue) ? null : numValue;
          validateField(field);
        }
        
        logInfo('NUMBER_INPUT', { field, value: numValue });
      } catch (error) {
        logError('NUMBER_INPUT', error, { field, value: event.target.value });
      }
    };

    const handleTimeMinutesInput = (field, event) => {
      try {
        const value = event.target.value;
        const numValue = parseInt(value, 10);
        editedFields[field] = true;
        customConstraints[field] = isNaN(numValue) ? null : numValue;
        if (field === 'classEarliestStartMinutes') {
          validateField('classLatestStartMinutes');
        } else if (field === 'classLatestStartMinutes') {
          validateField('classEarliestStartMinutes');
        }
        validateField(field);
        logInfo('TIME_MINUTES_INPUT', { field, value: numValue, formatted: formatMinutesToTime(numValue) });
      } catch (error) {
        logError('TIME_MINUTES_INPUT', error, { field });
      }
    };

    const handleTimeStringInput = (fieldPath, event) => {
      try {
        const value = event.target.value.trim();
        const [parent, child] = fieldPath.split('.');
        editedFields[parent][child] = true;
        customConstraints[parent][child] = value;
        if (value && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
          if (child === 'windowStart') {
            validateField('lunchBreak.windowEnd');
            validateField('lunchBreak.durationMinutes');
          } else if (child === 'windowEnd') {
            validateField('lunchBreak.windowStart');
            validateField('lunchBreak.durationMinutes');
          }
        }
        validateField(fieldPath);
        logInfo('TIME_STRING_INPUT', { field: fieldPath, value });
      } catch (error) {
        logError('TIME_STRING_INPUT', error, { field: fieldPath });
      }
    };

    const handleBooleanInput = (field, event) => {
      try {
        const value = event.target.checked;
        
        // Handle nested fields (lunchBreak.enabled)
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          editedFields[parent][child] = true;
          customConstraints[parent][child] = value;
        } else {
          editedFields[field] = true;
          customConstraints[field] = value;
        }
        
        validateField(field);
        logInfo('BOOLEAN_INPUT', { field, value });
      } catch (error) {
        logError('BOOLEAN_INPUT', error, { field });
      }
    };

    // Computed property for physical education subjects text input
    const physicalEducationSubjectsText = computed({
      get: () => {
        return Array.isArray(customConstraints.physicalEducationSubjects)
          ? customConstraints.physicalEducationSubjects.join(', ')
          : '';
      },
      set: (value) => {
        const parsed = value.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
        editedFields.physicalEducationSubjects = true;
        customConstraints.physicalEducationSubjects = parsed;
        validateField('physicalEducationSubjects');
      }
    });

    const handleArrayInput = (field, event) => {
      try {
        const value = event.target.value;
        const parsed = value.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
        editedFields[field] = true;
        customConstraints[field] = parsed;
        validateField(field);
        logInfo('ARRAY_INPUT', { field, count: parsed.length });
      } catch (error) {
        logError('ARRAY_INPUT', error, { field });
      }
    };

    // Helper function to normalize day names to standard English format
    const normalizeDayName = (day) => {
      if (!day || typeof day !== 'string') return 'Monday';
      
      const dayMap = {
        'monday': 'Monday', 'mon': 'Monday', 'måndag': 'Monday',
        'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tisdag': 'Tuesday',
        'wednesday': 'Wednesday', 'wed': 'Wednesday', 'onsdag': 'Wednesday',
        'thursday': 'Thursday', 'thu': 'Thursday', 'torsdag': 'Thursday',
        'friday': 'Friday', 'fri': 'Friday', 'fredag': 'Friday'
      };
      
      const normalized = day.trim().toLowerCase();
      return dayMap[normalized] || 'Monday'; // Default fallback
    };

    // Create default time slots structure (5 weekdays)
    const createDefaultTimeSlots = (defaultStart = '08:00', defaultEnd = '16:30') => {
      return daysOfWeek.map(day => ({
        day,
        start: defaultStart,
        end: defaultEnd
      }));
    };

    // Migrate existing time slots to fixed 5-day structure
    const migrateTimeSlotsToFixedStructure = (existingSlots, defaultStart = '08:00', defaultEnd = '16:30') => {
      try {
        // Step 1: Create map of existing slots by normalized day name
        const existingMap = new Map();
        if (Array.isArray(existingSlots)) {
          existingSlots.forEach(slot => {
            if (slot && slot.day) {
              const normalizedDay = normalizeDayName(slot.day);
              if (normalizedDay && slot.start && slot.end) {
                existingMap.set(normalizedDay, { start: slot.start, end: slot.end });
              }
            }
          });
        }
        
        // Step 2: Build fixed structure with 5 weekdays
        // Find the start time from other days (excluding Monday) to normalize Monday
        // Use Tuesday's start time if available, otherwise use defaultStart
        let normalizedStart = defaultStart;
        if (existingMap.has('Tuesday')) {
          normalizedStart = existingMap.get('Tuesday').start;
        } else if (existingMap.has('Wednesday')) {
          normalizedStart = existingMap.get('Wednesday').start;
        } else if (existingMap.has('Thursday')) {
          normalizedStart = existingMap.get('Thursday').start;
        } else if (existingMap.has('Friday')) {
          normalizedStart = existingMap.get('Friday').start;
        }
        
        const result = daysOfWeek.map(day => {
          if (day === 'Monday') {
            // Always normalize Monday to match other days' start time
            const mondaySlot = existingMap.has(day) ? existingMap.get(day) : { start: defaultStart, end: defaultEnd };
            return { day, start: normalizedStart, end: mondaySlot.end || defaultEnd };
          }
          if (existingMap.has(day)) {
            return { day, ...existingMap.get(day) };
          }
          return { day, start: defaultStart, end: defaultEnd };
        });
        
        // Step 3: Log migration actions
        const preservedDays = Array.from(existingMap.keys());
        const createdDays = daysOfWeek.filter(d => !existingMap.has(d));
        logTimeSlotInit('MIGRATE_TO_FIXED_STRUCTURE', {
          component: 'ConstraintsPage',
          inputCount: existingSlots?.length || 0,
          outputCount: result.length,
          preservedDays,
          createdDays,
          presetId: props.presetId
        });
        
        return result;
      } catch (error) {
        logError('MIGRATE_TIME_SLOTS', error, { existingSlots });
        // Fallback to defaults
        return createDefaultTimeSlots(defaultStart, defaultEnd);
      }
    };

    // Initialize time slots with fixed 5-day structure
    const initializeTimeSlots = () => {
      try {
        // If we have props.timeSlots, migrate them to fixed structure
        if (props.timeSlots && Array.isArray(props.timeSlots) && props.timeSlots.length > 0) {
          const migrated = migrateTimeSlotsToFixedStructure(props.timeSlots, '08:00', '16:30');
          timeSlots.value = migrated;
          logTimeSlotInit('INIT_FROM_PROPS', {
            component: 'ConstraintsPage',
            inputCount: props.timeSlots.length,
            outputCount: migrated.length,
            presetId: props.presetId
          });
        } else {
          // Initialize with defaults
          timeSlots.value = createDefaultTimeSlots('08:00', '16:30');
          logTimeSlotInit('INIT_WITH_DEFAULTS', {
            component: 'ConstraintsPage',
            outputCount: timeSlots.value.length,
            presetId: props.presetId
          });
        }
        
        // Validate after initialization
        validateTimeSlots();
        
        // Initialize original snapshot if not already set
        if (!originalTimeSlots.value) {
          originalTimeSlots.value = JSON.parse(JSON.stringify(timeSlots.value));
        }
      } catch (error) {
        logError('INITIALIZE_TIME_SLOTS', error, { presetId: props.presetId });
        // Fallback to defaults
        timeSlots.value = createDefaultTimeSlots('08:00', '16:30');
        validateTimeSlots();
        // Initialize original snapshot even on error
        if (!originalTimeSlots.value) {
          originalTimeSlots.value = JSON.parse(JSON.stringify(timeSlots.value));
        }
      }
    };

    const markTimeSlotsEdited = () => {
      // Mark as edited for save tracking
      // Time slots are always considered edited when changed
    };

    // Validate time slots - enforce exactly 5 weekdays
    const validateTimeSlots = () => {
      // Check 1: Exactly 5 entries required
      if (timeSlots.value.length !== 5) {
        const errorMsg = `Exactly 5 time slots required (Monday-Friday). Found ${timeSlots.value.length}.`;
        timeSlotsValidation.value = { valid: false, error: errorMsg };
        logTimeSlotStructureError(5, timeSlots.value.length, {
          timeSlots: timeSlots.value,
          days: timeSlots.value.map(s => s.day)
        });
        return false;
      }
      
      // Check 2: All 5 weekdays must be present
      const days = timeSlots.value.map(s => s.day);
      const missingDays = daysOfWeek.filter(d => !days.includes(d));
      if (missingDays.length > 0) {
        const errorMsg = `Missing required days: ${missingDays.join(', ')}`;
        timeSlotsValidation.value = { valid: false, error: errorMsg };
        logTimeSlotValidationError(null, null, null, errorMsg, 'MISSING_DAYS');
        return false;
      }
      
      // Check 3: No duplicate days
      const uniqueDays = new Set(days);
      if (uniqueDays.size !== 5) {
        const duplicates = days.filter((d, i) => days.indexOf(d) !== i);
        const errorMsg = `Duplicate days detected: ${[...new Set(duplicates)].join(', ')}`;
        timeSlotsValidation.value = { valid: false, error: errorMsg };
        logTimeSlotValidationError(null, null, null, errorMsg, 'DUPLICATE_DAYS');
        return false;
      }
      
      // Check 4: Each entry has valid start/end times
      for (let i = 0; i < timeSlots.value.length; i++) {
        const slot = timeSlots.value[i];
        if (!slot.day || !slot.start || !slot.end) {
          const errorMsg = `Time slot ${i + 1} (${slot.day || 'unknown'}): Start and end times are required`;
          timeSlotsValidation.value = { valid: false, error: errorMsg };
          logTimeSlotValidationError(slot.day, slot.start, slot.end, errorMsg, 'MISSING_TIMES');
          return false;
        }
        
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
          const errorMsg = `Time slot ${i + 1} (${slot.day}): Invalid time format. Use HH:MM (e.g., 08:00)`;
          timeSlotsValidation.value = { valid: false, error: errorMsg };
          logTimeSlotValidationError(slot.day, slot.start, slot.end, errorMsg, 'INVALID_FORMAT');
          return false;
        }
        
        const startMinutes = parseTimeStringToMinutes(slot.start);
        const endMinutes = parseTimeStringToMinutes(slot.end);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
          const errorMsg = `Time slot ${i + 1} (${slot.day}): End time must be after start time`;
          timeSlotsValidation.value = { valid: false, error: errorMsg };
          logTimeSlotValidationError(slot.day, slot.start, slot.end, errorMsg, 'INVALID_TIME_RANGE');
          return false;
        }
      }
      
      timeSlotsValidation.value = { valid: true, error: null };
      return true;
    };

    // Back navigation
    const goBack = () => {
      try {
        logInfo('NAVIGATE_FROM_CONSTRAINTS', { presetId: props.presetId });
        // Pass back solverOptions and customConstraints so ViewerPage can restore them
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            page: 'viewer',
            presetId: props.presetId,
            solverOptions: props.solverOptions,
            customConstraints: props.customConstraints
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
        
        // Initialize constraints first
        initializeConstraints();
        
        // Initialize time slots with fixed 5-day structure
        initializeTimeSlots();
        
        // Store original snapshots for cancel functionality and change tracking
        if (!originalConstraints.value) {
          originalConstraints.value = JSON.parse(JSON.stringify(customConstraints));
        }
        if (!originalTimeSlots.value) {
          originalTimeSlots.value = JSON.parse(JSON.stringify(timeSlots.value));
        }
        
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
      activeConstraints,
      isDefault,
      isDefaultLunch,
      formatMinutesToTime,
      formatBoolean,
      formatArray,
      formatMinutes,
      goBack,
      isEditMode,
      canSave,
      hasUnsavedChanges,
      validationErrorCount,
      enterEditMode,
      exitEditMode,
      saveConstraints,
      resetToDefaults,
      customConstraints,
      editedFields,
      fieldValidation,
      onFieldFocus,
      onFieldBlur,
      handleNumberInput,
      handleTimeMinutesInput,
      handleTimeStringInput,
      handleBooleanInput,
      handleArrayInput,
      physicalEducationSubjectsText,
      parseTimeStringToMinutes,
      timeSlots,
      daysOfWeek,
      timeSlotsValidation
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

.edited-badge {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.3vh 0.8vh;
  border-radius: 0.4vh;
  font-size: 1.1vh;
  margin-left: 1vh;
  font-weight: 500;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1vh;
}

.edit-mode-btn, .save-btn, .reset-btn {
  padding: 0.8vh 1.5vh;
  border: none;
  border-radius: 0.5vh;
  font-size: 1.4vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-mode-btn {
  background: #667eea;
  color: white;
}

.edit-mode-btn:hover {
  background: #5568d3;
}

.save-btn {
  background: #10b981;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
}

.save-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.reset-btn {
  background: #f59e0b;
  color: white;
}

.reset-btn:hover {
  background: #d97706;
}

.edit-actions {
  display: flex;
  align-items: center;
  gap: 1vh;
}

.error-count {
  color: #dc2626;
  font-weight: 600;
  font-size: 1.3vh;
  padding: 0.5vh 1vh;
  background: #fef2f2;
  border-radius: 0.4vh;
}

.constraint-input {
  padding: 0.6vh 1vh;
  border: 0.1vh solid #d1d5db;
  border-radius: 0.4vh;
  font-size: 1.4vh;
  font-family: inherit;
  color: #2d3748;
  background: white;
  transition: all 0.2s ease;
  min-width: 15vh;
}

.constraint-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.2vh rgba(102, 126, 234, 0.1);
}

.constraint-input.input-invalid {
  border-color: #dc2626;
  background: #fef2f2;
}

.constraint-input.input-edited {
  border-color: #3b82f6;
  background: #eff6ff;
}

.constraint-input-number {
  width: 12vh;
}

.constraint-input-time {
  width: 12vh;
}

.constraint-input-time-string {
  width: 10vh;
  text-align: center;
}

.constraint-input-array {
  width: 30vh;
  resize: vertical;
  font-family: inherit;
}

.validation-error {
  font-size: 1.2vh;
  color: #e53e3e;
  margin-left: 1vh;
  display: flex;
  align-items: center;
  gap: 0.5vh;
  font-weight: 500;
}

.input-hint {
  font-size: 1.2vh;
  color: #718096;
  margin-left: 1vh;
  font-style: italic;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 1vh;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 4.5vh;
  height: 2.5vh;
  background: #cbd5e0;
  border-radius: 1.5vh;
  transition: background 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 2vh;
  height: 2vh;
  border-radius: 50%;
  background: white;
  top: 0.25vh;
  left: 0.25vh;
  transition: transform 0.3s ease;
  box-shadow: 0 0.1vh 0.3vh rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-slider {
  background: #667eea;
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(2vh);
}

.toggle-label {
  font-size: 1.4vh;
  color: #2d3748;
  user-select: none;
}

.constraint-item {
  flex-wrap: wrap;
  gap: 0.5vh;
}

.constraint-item .constraint-label {
  min-width: 25vh;
}

.constraint-item .constraint-value,
.constraint-item .constraint-input {
  flex: 0 1 auto;
}

.time-slot-row {
  display: flex;
  align-items: center;
  gap: 1vh;
  padding: 0.8vh 0;
  border-bottom: 0.1vh solid #f0f0f0;
}

.time-slot-day-locked {
  width: 12vh;
  padding: 0.6vh;
  border: 0.1vh solid #e2e8f0;
  border-radius: 0.4vh;
  font-size: 1.3vh;
  background: #f7fafc;
  color: #4a5568;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  cursor: default;
}

.time-slot-input {
  width: 8vh;
  padding: 0.6vh;
  border: 0.1vh solid #d1d5db;
  border-radius: 0.4vh;
  text-align: center;
  font-size: 1.3vh;
}

.time-separator {
  color: #718096;
  font-size: 1.3vh;
}
</style>

