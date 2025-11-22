<template>
  <div class="viewer-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
      <div class="mode-toggle">
        <button 
          class="mode-btn" 
          :class="{ 'active': isCreatorMode }"
          @click="isCreatorMode = true"
        >
          Creator
        </button>
        <button 
          class="mode-btn" 
          :class="{ 'active': !isCreatorMode }"
          @click="isCreatorMode = false"
        >
          Viewer
        </button>
        <a href="#" @click.prevent="goToConstraints" class="variabler-link">Variabler</a>
      </div>
    </div>
    <div class="viewer-layout">
      <Sidebar
        v-if="!isCreatorMode"
        :initial-preset-id="presetId"
        :selected-day="selectedDayKey"
        :available-days="availableScheduleDays"
        @select-day="handleSidebarSelectDay"
      />
      <div class="schedule-section" :class="{ 'creator-mode': isCreatorMode }">
        <!-- Creator Mode: Form Builder -->
        <div v-if="isCreatorMode" class="creator-content">
          <div class="creator-container">
            <h2 class="creator-title">Build Your Schedule</h2>
            <p class="creator-description">Import data or manually enter schedule information</p>
            
            <!-- Import Section -->
            <div class="import-section">
              <h3 class="section-title">Import Data</h3>
              <div class="import-buttons">
                <button class="import-btn schoolsoft-btn" @click="importFromSchoolsoft">
                  <div class="btn-content">
                    <img :src="schoolsoftIcon" alt="Schoolsoft" class="btn-icon" />
                    <div class="btn-text-group">
                      <span class="btn-title">Import from Schoolsoft</span>
                      <span class="btn-description">Import data from Schoolsoft</span>
                    </div>
                  </div>
                </button>
                
                <button class="import-btn skola24-btn" @click="importFromSkola24">
                  <div class="btn-content">
                    <img :src="skola24Icon" alt="Skola24" class="btn-icon" />
                    <div class="btn-text-group">
                      <span class="btn-title">Import from Skola24</span>
                      <span class="btn-description">Import data from Skola24</span>
                    </div>
                  </div>
                </button>
              </div>
              <div class="solver-options-panel">
                <label class="solver-option">
                  <input type="checkbox" v-model="solverOptions.relaxedConstraints">
                  <span>Use relaxed constraints (faster search)</span>
                </label>
                <label class="solver-option">
                  <input type="checkbox" v-model="solverOptions.includeLunch">
                  <span>Include lunch break</span>
                </label>
                <label class="solver-option">
                  <input type="checkbox" v-model="solverOptions.debugMode">
                  <span>Enable solver debug output</span>
                </label>
                <div class="solver-option" v-if="solverOptions.includeLunch">
                  <label class="solver-option-inline">
                    <span>Lunch granularity (minutes)</span>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      v-model.number="solverOptions.lunchGranularity"
                      class="solver-option-number"
                    >
                  </label>
                </div>
              </div>
            </div>

            <div class="divider">
              <span class="divider-text">OR</span>
            </div>

            <!-- Manual Entry Categories -->
            <div class="categories-section">
              <div class="section-title-row">
                <h3 class="section-title">Manual Entry</h3>
                <div class="mock-actions">
                <button class="mock-fill-btn" @click="loadMockManualData">Load Mock Data</button>
                  <button class="mock-fill-btn secondary" @click="loadMinimalMockData">Load Minimal Data</button>
                </div>
              </div>
              
              <!-- Classes Category -->
              <div class="category-card">
                <div class="category-header">
                  <h4 class="category-title">Classes</h4>
                  <button class="add-item-btn" @click="addClass">+ Add Class</button>
                </div>
                <div class="items-list">
                  <div v-for="(classItem, index) in classes" :key="index" class="item-row">
                    <input 
                      v-model="classItem.name" 
                      type="text" 
                      placeholder="Class name (e.g., Math 101)"
                      class="item-input"
                    />
                    <button class="remove-btn" @click="removeClass(index)">×</button>
                  </div>
                  <div v-if="classes.length === 0" class="empty-state">
                    No classes added yet
                  </div>
                </div>
              </div>

              <!-- Teachers Category -->
              <div class="category-card">
                <div class="category-header">
                  <h4 class="category-title">Teachers</h4>
                  <button class="add-item-btn" @click="addTeacher">+ Add Teacher</button>
                </div>
                <div class="items-list">
                  <div v-for="(teacher, index) in teachers" :key="index" class="item-row">
                    <input 
                      v-model="teacher.name" 
                      type="text" 
                      placeholder="Teacher name"
                      class="item-input"
                    />
                    <button class="remove-btn" @click="removeTeacher(index)">×</button>
                  </div>
                  <div v-if="teachers.length === 0" class="empty-state">
                    No teachers added yet
                  </div>
                </div>
              </div>

              <!-- Classrooms Category -->
              <div class="category-card">
                <div class="category-header">
                  <h4 class="category-title">Classrooms</h4>
                  <button class="add-item-btn" @click="addClassroom">+ Add Classroom</button>
                </div>
                <div class="items-list">
                  <div v-for="(classroom, index) in classrooms" :key="index" class="item-row">
                    <input 
                      v-model="classroom.name" 
                      type="text" 
                      placeholder="Classroom name (e.g., Room 101)"
                      class="item-input"
                    />
                    <button class="remove-btn" @click="removeClassroom(index)">×</button>
                  </div>
                  <div v-if="classrooms.length === 0" class="empty-state">
                    No classrooms added yet
                  </div>
                </div>
              </div>


              <!-- Subjects Category -->
              <div class="category-card">
                <div class="category-header">
                  <h4 class="category-title">Subjects</h4>
                  <button class="add-item-btn" @click="addSubject">+ Add Subject</button>
                </div>
                <div class="items-list">
                  <div v-for="(subject, index) in subjects" :key="index" class="item-row">
                    <input 
                      v-model="subject.name" 
                      type="text" 
                      placeholder="Subject name (e.g., Mathematics)"
                      class="item-input"
                    />
                    <button class="remove-btn" @click="removeSubject(index)">×</button>
                  </div>
                  <div v-if="subjects.length === 0" class="empty-state">
                    No subjects added yet
                  </div>
                </div>
              </div>
            </div>

            <!-- Build Schedule Button -->
            <div class="build-section">
              <button
                class="build-btn"
                @click="buildWithSolver"
                :disabled="!isBuildReady || isBuilding"
              >
                <span class="build-icon">⚙</span>
                <span>{{ isBuilding ? 'Running solver…' : 'Build with Z3' }}</span>
              </button>
              <p class="build-hint">
                Add at least one item in each category, then run the solver to generate a baseline timetable.
              </p>
              <p v-if="solverError" class="build-error">{{ solverError }}</p>
              <p v-else-if="buildSuccess" class="build-success">Schedule generated! Switched to viewer mode.</p>
              <div v-if="visibleAssignments.length" class="solver-assignments">
                <h4 class="solver-title">Generated Assignments</h4>
                <ul class="solver-list">
                  <li v-for="(assignment, index) in visibleAssignments" :key="index" class="solver-item">
                    <span class="solver-subject">{{ assignment.subject }}</span>
                    <span class="solver-meta">
                      {{ assignment.class }} · {{ assignment.teacher }} · {{ assignment.classroom }}
                    </span>
                    <span class="solver-timeslot">
                      {{ assignment.timeSlot?.day }} {{ assignment.timeSlot?.start }} - {{ assignment.timeSlot?.end }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Viewer Mode: Schedule Visualization -->
        <div v-else class="viewer-mode">
          <div class="viewer-toolbar">
            <label class="filter-group">
              <span class="filter-label">Class</span>
              <select v-model="selectedClassFilter" class="filter-select">
                <option v-for="option in classFilterOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
          </div>
          <SimpleSchedule
            @change="onScheduleChange"
            :external-schedule="displayedSchedule || {}"
            :selected-day-key="selectedDayKey"
            @update:selectedDayKey="handleScheduleSelectedDay"
          />
        </div>
      </div>
      <button 
        class="chat-toggle-btn" 
        :class="{ 'active': isChatOpen }"
        @click="toggleChat"
        :title="isChatOpen ? 'Hide Assistant' : 'Show Assistant'"
      >
        <span class="toggle-icon">{{ isChatOpen ? '←' : '→' }}</span>
      </button>
      <div class="chat-section" :class="{ 'open': isChatOpen }">
        <ChatWindow />
      </div>
    </div>
    <div v-if="isLoadingScreenVisible" class="solver-loading-overlay">
      <div class="loading-card">
        <div class="loading-header">
          <span class="loading-icon">⚙</span>
          <h2 class="loading-title">Building your schedule</h2>
        </div>
        <p class="loading-subtitle">
          Optimizing lessons with Skolverkets constraints. Grab a coffee and relax.
        </p>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="progressStyle"></div>
          </div>
          <span class="progress-value">{{ progressDisplay }}%</span>
        </div>
        <p class="progress-status-text">{{ progressMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';
import ChatWindow from './ChatWindow.vue';
import Sidebar from './Sidebar.vue';
import schoolsoftIcon from '../assets/icons/unnamed.webp';
import skola24Icon from '../assets/icons/skola.png';
import { logStateRestore, logScheduleDisplay, logNavigation, logScheduleClear, logFilterChange, logComputedUpdate, logInfo, logWarning, logError } from '../utils/errorLogger';

export default defineComponent({
  name: 'ViewerPage',
  components: { SimpleSchedule, ChatWindow, Sidebar },
  props: {
    presetId: {
      type: String,
      default: null,
    },
    initialData: {
      type: Object,
      default: null,
    },
    savedState: {
      type: Object,
      default: null,
    },
  },
  emits: ['save-state'],
  setup(props, { emit }) {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});
    const isChatOpen = ref(false);
    const isCreatorMode = ref(true);
    const classes = ref([]);
    const teachers = ref([]);
    const classrooms = ref([]);
    // Keep local ref but sync with global state via events (following constraints pattern)
    const timeSlots = ref([]);
    
    // Sync helper function
    const syncTimeSlotsFromGlobal = (updatedSlots) => {
      if (updatedSlots && Array.isArray(updatedSlots)) {
        timeSlots.value = [...updatedSlots];
        logInfo('TIME_SLOTS_SYNCED_FROM_GLOBAL', { count: updatedSlots.length });
      }
    };
    const subjects = ref([]);
    const generatedSchedule = ref(null);
    const solverAssignments = ref([]);
    const solverError = ref(null);
    const isBuilding = ref(false);
    const buildSuccess = ref(false);
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const selectedClassFilter = ref('All Classes');
    const selectedDayKey = ref(null);
    const termConfig = ref(null);
    const lessonTemplates = ref([]);
    const isLoadingScreenVisible = ref(false);
    const isRestoringState = ref(false); // Flag to prevent watchers from clearing schedule during restoration
    const solverProgress = ref(0);
    const progressMessage = ref('Preparing schedule…');
    const progressPhases = [
      {
        limit: 70,
        interval: 300,
        duration: 10000,
        minIncrement: 2,
        maxIncrement: 6,
        message: 'Collecting classes, teachers, and rooms…',
      },
      {
        limit: 88,
        interval: 550,
        duration: 14000,
        minIncrement: 0.8,
        maxIncrement: 2.5,
        message: 'Mapping lessons to available slots…',
      },
      {
        limit: 94,
        interval: 900,
        duration: 16000,
        minIncrement: 0.3,
        maxIncrement: 1.2,
        message: 'Resolving conflicts and buffers…',
      },
      {
        limit: 97,
        interval: 1400,
        duration: null,
        minIncrement: 0.12,
        maxIncrement: 0.45,
        message: 'Stabilizing weekly patterns…',
      },
    ];
    const progressDisplay = computed(() => Math.round(Math.min(100, Math.max(0, solverProgress.value))));
    const progressStyle = computed(() => ({
      width: `${Math.min(100, Math.max(0, solverProgress.value))}%`,
    }));
    let progressTimer = null;
    let progressPhaseTimeout = null;
    const finalPushInterval = 1500;
    const finalPushMinIncrement = 0.1;
    const finalPushMaxIncrement = 0.35;
    let finalPushTimer = null;

    const isIsoDayKey = (value) => isoDateRegex.test((value || '').trim());

    const toIsoDate = (value) => {
      const trimmed = (value || '').trim();
      if (!isIsoDayKey(trimmed)) return null;
      const parsed = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const isWeekendKey = (value) => {
      const normalized = (value || '').trim().toLowerCase();
      if (normalized === 'saturday' || normalized === 'sunday') return true;
      if (normalized === 'mon' || normalized === 'tue' || normalized === 'wed' || normalized === 'thu' || normalized === 'fri') {
        return false;
      }
      if (isIsoDayKey(normalized)) {
        const parsed = new Date(`${normalized}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? false : parsed.getDay() === 0 || parsed.getDay() === 6;
      }
      return false;
    };

    const resetSolverState = () => {
      generatedSchedule.value = null;
      solverAssignments.value = [];
      solverError.value = null;
      buildSuccess.value = false;
    };

    const applyInitialData = (data) => {
      if (!data || typeof data !== 'object') {
        return;
      }

      const sanitizeEntities = (items) => {
        if (!Array.isArray(items)) return [];
        return items
          .map((item) => ({ name: (item?.name || '').trim() }))
          .filter((item) => item.name);
      };

      const sanitizeTimeSlots = (slots) => {
        if (!Array.isArray(slots)) return [];
        return slots
          .map((slot) => ({
            day: (() => {
              const trimmed = (slot?.day || '').trim();
              if (!trimmed) return daysOfWeek[0];
              if (isWeekendKey(trimmed)) return null;
              if (daysOfWeek.includes(trimmed) || isoDateRegex.test(trimmed)) {
                return trimmed;
              }
              return daysOfWeek[0];
            })(),
            start: (slot?.start || '').trim(),
            end: (slot?.end || '').trim(),
          }))
          .filter((slot) => slot.day && slot.start && slot.end);
      };

      const sanitizeTerm = (term) => {
        if (!term || typeof term !== 'object') return null;
        const sanitizedDays = Array.isArray(term.days)
          ? term.days
              .map((day) => (typeof day === 'string' ? day.trim() : ''))
              .filter((day) => day && !isWeekendKey(day))
          : [];
        const sanitizedSlots = Array.isArray(term.dailySlots)
          ? term.dailySlots
              .map((slot) => ({
                start: (slot?.start || '').trim(),
                end: (slot?.end || '').trim(),
              }))
              .filter((slot) => slot.start && slot.end)
          : [];
        const startDate = typeof term.startDate === 'string' ? term.startDate.trim() : '';
        const weeksValue = Number.parseInt(term.weeks, 10);
        return startDate
          ? {
              name: typeof term.name === 'string' ? term.name.trim() : '',
              startDate,
              weeks: Number.isFinite(weeksValue) && weeksValue > 0 ? weeksValue : 2,
              days: sanitizedDays.length > 0 ? sanitizedDays : [...daysOfWeek],
              dailySlots:
                sanitizedSlots.length > 0
                  ? sanitizedSlots
                  : [
                      { start: '08:30', end: '09:30' },
                      { start: '09:45', end: '10:45' },
                    ],
            }
          : null;
      };

      const sanitizeLessonTemplatesData = (templates) => {
        if (!Array.isArray(templates)) return [];
        return templates
          .map((template) => {
            const subject = (template?.subject || template?.subjectName || '').trim();
            const className = (template?.class || template?.className || '').trim();
            const teacher = (template?.teacher || template?.teacherName || '').trim();
            const sessions =
              Number.parseInt(
                template?.sessionsPerWeek ??
                  template?.lessonsPerWeek ??
                  template?.weeklyLessons ??
                  template?.frequencyPerWeek,
                10
              ) || 0;
            const duration =
              Number.parseInt(
                template?.durationMinutes ?? template?.duration ?? template?.lengthMinutes,
                10
              ) || 0;
            const preferredRoom = (template?.preferredRoom || template?.room || template?.classroom || '').trim();
            const allowedRooms = Array.isArray(template?.allowedRooms || template?.rooms)
              ? (template?.allowedRooms || template?.rooms)
                  .map((room) => (typeof room === 'string' ? room.trim() : ''))
                  .filter(Boolean)
              : [];

            if (!(subject && className && teacher && sessions > 0 && duration > 0)) {
              return null;
            }

            const normalized = {
              subject,
              class: className,
              teacher,
              sessionsPerWeek: sessions,
              durationMinutes: duration,
            };

            if (preferredRoom) {
              normalized.preferredRoom = preferredRoom;
            }
            if (allowedRooms.length > 0) {
              normalized.allowedRooms = allowedRooms;
            }

            return normalized;
          })
          .filter(Boolean);
      };

      classes.value = sanitizeEntities(data.classes);
      teachers.value = sanitizeEntities(data.teachers);
      classrooms.value = sanitizeEntities(data.classrooms);
      subjects.value = sanitizeEntities(data.subjects);
      timeSlots.value = sanitizeTimeSlots(data.timeSlots);
      
      // Sync to global state
      if (timeSlots.value.length > 0) {
        window.dispatchEvent(new CustomEvent('time-slots-updated', {
          detail: { timeSlots: timeSlots.value, presetId: props.presetId }
        }));
      }
      
      termConfig.value = sanitizeTerm(data.term);
      lessonTemplates.value = sanitizeLessonTemplatesData(data.lessonTemplates);

      if (timeSlots.value.length === 0 && termConfig.value) {
        const preferredDay =
          termConfig.value.days.find((day) => !isWeekendKey(day)) || termConfig.value.days[0] || daysOfWeek[0];
        const generatedSlots = termConfig.value.dailySlots.map((slot) => ({
          day: preferredDay,
          start: slot.start,
          end: slot.end,
        }));
        timeSlots.value = generatedSlots;
        // Sync generated slots to global state
        window.dispatchEvent(new CustomEvent('time-slots-updated', {
          detail: { timeSlots: timeSlots.value, presetId: props.presetId }
        }));
      }

      isCreatorMode.value = true;
      resetSolverState();
      selectedClassFilter.value = 'All Classes';
    };

    const normalizeScheduleResult = (scheduleByDay = {}) => {
      const normalized = {};
      const processedDays = new Set();
      const fallbackBase = Date.now();

      Object.keys(scheduleByDay || {}).forEach((dayKey) => {
        if (isWeekendKey(dayKey)) {
          return;
        }
        const entries = Array.isArray(scheduleByDay[dayKey]) ? scheduleByDay[dayKey] : [];
        normalized[dayKey] = entries.map((entry, index) => {
          const name = entry?.name || '';
          const subject = entry?.subject || name.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const classMatch = /\(([^)]+)\)/.exec(name);
          const classRef = entry?.class || entry?.className || entry?.classRef || (classMatch ? classMatch[1] : '');

          return {
            id: typeof entry?.id === 'number' ? entry.id : fallbackBase + index,
            name,
            subject,
            classRef,
            teacher: entry?.teacher || '',
            classroom: entry?.classroom || '',
            startMinutes: typeof entry?.startMinutes === 'number' ? entry.startMinutes : 8 * 60,
            duration: typeof entry?.duration === 'number' ? entry.duration : 60,
            colorIndex: entry?.colorIndex,
          };
        });
        processedDays.add(dayKey);
      });

      if (processedDays.size === 0) {
        daysOfWeek.forEach((day) => {
          normalized[day] = [];
        });
      }

      return normalized;
    };

    const mapEntities = (items) => {
      return items
        .map((item) => ({ name: (item?.name || '').trim() }))
        .filter((item) => item.name);
    };

    const mapTimeSlots = (slots) => {
      const normalizeDayValue = (value) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return daysOfWeek[0];
        if (daysOfWeek.includes(trimmed) || isoDateRegex.test(trimmed)) {
          return trimmed;
        }
        return daysOfWeek[0];
      };

      return slots
        .map((slot) => ({
          day: normalizeDayValue(slot?.day),
          start: (slot?.start || '').trim(),
          end: (slot?.end || '').trim(),
        }))
        .filter((slot) => slot.start && slot.end);
    };
    
    // Helper to parse time string "HH:MM" to minutes
    const parseTimeToMinutes = (timeString) => {
      try {
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }
        return hours * 60 + minutes;
      } catch (error) {
        console.error('[ViewerPage] Error parsing time', { timeString, error });
        return null;
      }
    };

    const isBuildReady = computed(() => {
      const hasTimeSlots = timeSlots.value.length > 0;
      
      return (
        classes.value.length > 0 &&
        teachers.value.length > 0 &&
        classrooms.value.length > 0 &&
        subjects.value.length > 0 &&
        hasTimeSlots
      );
    });

    const goToHome = () => {
      logNavigation('NAVIGATE_TO_HOME', {
        fromPage: 'viewer',
        toPage: 'creator',
        presetId: props.presetId
      });
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'creator' } }));
    };

    const goToConstraints = () => {
      try {
        // Save state before navigating away
        saveState();
        
        console.log('[ViewerPage] Navigating to constraints page', { 
          presetId: props.presetId,
          hasSolverOptions: !!solverOptions,
          hasCustomConstraints: !!customConstraints.value
        });
        
        // Pass current time slots to constraints page
        const slotsToPass = timeSlots.value.length > 0 ? timeSlots.value : [];
        
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            page: 'constraints',
            presetId: props.presetId,
            solverOptions: { ...solverOptions },
            customConstraints: customConstraints.value,
            timeSlots: slotsToPass
          } 
        }));
      } catch (error) {
        console.error('[ViewerPage] Error navigating to constraints', error, { presetId: props.presetId });
      }
    };

    const toggleChat = () => {
      isChatOpen.value = !isChatOpen.value;
    };

    const importFromSchoolsoft = () => {
      console.log('Import from Schoolsoft clicked');
    };

    const importFromSkola24 = () => {
      console.log('Import from Skola24 clicked');
    };

    const addClass = () => {
      classes.value.push({ name: '' });
    };

    const addTeacher = () => {
      teachers.value.push({ name: '' });
    };

    const addClassroom = () => {
      classrooms.value.push({ name: '' });
    };

    const addTimeSlot = () => {
      timeSlots.value.push({ day: daysOfWeek[0], start: '', end: '' });
      // Emit update event to sync with global state
      window.dispatchEvent(new CustomEvent('time-slots-updated', {
        detail: { timeSlots: timeSlots.value, presetId: props.presetId }
      }));
    };

    const addSubject = () => {
      subjects.value.push({ name: '' });
    };

    const removeClass = (index) => {
      classes.value.splice(index, 1);
    };

    const removeTeacher = (index) => {
      teachers.value.splice(index, 1);
    };

    const removeClassroom = (index) => {
      classrooms.value.splice(index, 1);
    };

    const removeTimeSlot = (index) => {
      timeSlots.value.splice(index, 1);
      // Emit update event to sync with global state
      window.dispatchEvent(new CustomEvent('time-slots-updated', {
        detail: { timeSlots: timeSlots.value, presetId: props.presetId }
      }));
    };

    const removeSubject = (index) => {
      subjects.value.splice(index, 1);
    };

    const createSchedule = async () => {
      if (!title.value || !description.value) return;

      const payload = {
        title: title.value,
        description: description.value,
        schedule: schedule.value,
      };

      const res = await window.api.createSchedule(JSON.parse(JSON.stringify(payload)));

      console.log(res);

      title.value = '';
      description.value = '';
      schedule.value = {};
    };

    const onScheduleChange = (payload) => {
      schedule.value = payload;
      ensureSelectedDayForSchedule(displayedSchedule.value || payload || {}, { force: false });
    };

    let solverCompletionHandled = false;

    const clearProgressTimers = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (progressPhaseTimeout) {
        clearTimeout(progressPhaseTimeout);
        progressPhaseTimeout = null;
      }
      if (finalPushTimer) {
        clearInterval(finalPushTimer);
        finalPushTimer = null;
      }
    };

    const startProgressPhase = (phaseIndex) => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (progressPhaseTimeout) {
        clearTimeout(progressPhaseTimeout);
        progressPhaseTimeout = null;
      }

      if (phaseIndex >= progressPhases.length) {
        progressMessage.value = 'Synthesizing final schedule…';
        if (!finalPushTimer) {
          finalPushTimer = window.setInterval(() => {
            if (solverProgress.value < 99.4) {
              const span = finalPushMaxIncrement - finalPushMinIncrement;
              const increment = finalPushMinIncrement + Math.random() * (span > 0 ? span : 0);
              solverProgress.value = Math.min(99.4, solverProgress.value + increment);
            }
          }, finalPushInterval);
        }
        return;
      }

      if (finalPushTimer) {
        clearInterval(finalPushTimer);
        finalPushTimer = null;
      }

      const phase = progressPhases[phaseIndex];
      progressMessage.value = phase?.message || 'Building schedule…';

      progressTimer = window.setInterval(() => {
        if (solverProgress.value < phase.limit) {
          const span = phase.maxIncrement - phase.minIncrement;
          const increment = phase.minIncrement + Math.random() * (span > 0 ? span : 0);
          solverProgress.value = Math.min(phase.limit, solverProgress.value + increment);
        }
      }, phase.interval);

      if (phase.duration !== null) {
        progressPhaseTimeout = window.setTimeout(() => {
          startProgressPhase(phaseIndex + 1);
        }, phase.duration);
      }
    };

    const startSolverLoading = () => {
      clearProgressTimers();
      solverCompletionHandled = false;
      solverProgress.value = 0;
      isLoadingScreenVisible.value = true;
      progressMessage.value = progressPhases[0]?.message || 'Preparing schedule…';
      startProgressPhase(0);
    };

    const finishSolverLoading = () => {
      solverCompletionHandled = true;
      clearProgressTimers();
      progressMessage.value = 'Schedule ready!';
      solverProgress.value = 100;
      setTimeout(() => {
        isLoadingScreenVisible.value = false;
        solverProgress.value = 0;
        progressMessage.value = 'Preparing schedule…';
      }, 500);
    };

    const cancelSolverLoading = () => {
      solverCompletionHandled = true;
      clearProgressTimers();
      progressMessage.value = 'Solver cancelled.';
      setTimeout(() => {
        isLoadingScreenVisible.value = false;
        solverProgress.value = 0;
        progressMessage.value = 'Preparing schedule…';
      }, 300);
    };

    const buildWithSolver = async () => {
      solverError.value = null;
      solverAssignments.value = [];
      buildSuccess.value = false;

      if (!isBuildReady.value) {
        solverError.value = 'Please add classes, teachers, classrooms, subjects, and time slots before building.';
        return;
      }

      if (!window.api || !window.api.runScheduleSolver) {
        solverError.value = 'Solver API is not available in this environment.';
        return;
      }

      startSolverLoading();
      isBuilding.value = true;

      // Ensure we have time slots before building
      const slotsToUse = timeSlots.value.length > 0 ? timeSlots.value : [];
      
      if (slotsToUse.length === 0) {
        solverError.value = 'Vänligen lägg till starttider i Variabler-sidan innan du bygger schemat.';
        cancelSolverLoading();
        return;
      }

      const payload = {
        classes: mapEntities(classes.value),
        teachers: mapEntities(teachers.value),
        classrooms: mapEntities(classrooms.value),
        subjects: mapEntities(subjects.value),
        timeSlots: mapTimeSlots(slotsToUse),
      };

      if (termConfig.value) {
        payload.term = {
          name: termConfig.value.name,
          startDate: termConfig.value.startDate,
          weeks: termConfig.value.weeks,
          days: Array.isArray(termConfig.value.days) ? [...termConfig.value.days] : [],
          dailySlots: Array.isArray(termConfig.value.dailySlots)
            ? termConfig.value.dailySlots.map((slot) => ({
                start: slot.start,
                end: slot.end,
              }))
            : [],
        };
      }

      if (lessonTemplates.value.length > 0) {
        payload.lessonTemplates = lessonTemplates.value.map((template) => {
          const cloned = {
            subject: template.subject,
            class: template.class,
            teacher: template.teacher,
            sessionsPerWeek: template.sessionsPerWeek,
            durationMinutes: template.durationMinutes,
          };
          if (template.preferredRoom) {
            cloned.preferredRoom = template.preferredRoom;
          }
          if (Array.isArray(template.allowedRooms) && template.allowedRooms.length > 0) {
            cloned.allowedRooms = [...template.allowedRooms];
          }
          return cloned;
        });
      }

    // Use custom constraints if available, otherwise compute from solverOptions
    if (customConstraints.value && Object.keys(customConstraints.value).length > 0) {
      console.log('[ViewerPage] Using custom constraints for buildWithSolver', { 
        constraintsCount: Object.keys(customConstraints.value).length,
        presetId: props.presetId,
        constraints: JSON.stringify(customConstraints.value)
      });
      
      // Merge custom constraints with defaults (custom overrides defaults)
      const merged = {
        ...CONSTRAINT_DEFAULTS,
        ...customConstraints.value,
        lunchBreak: {
          ...CONSTRAINT_DEFAULTS.lunchBreak,
          ...(customConstraints.value.lunchBreak || {})
        }
      };
      
      // Validate constraint values before sending
      if (merged.classEarliestStartMinutes !== undefined && merged.classLatestStartMinutes !== undefined) {
        const earliest = merged.classEarliestStartMinutes;
        const latest = merged.classLatestStartMinutes;
        const windowMinutes = latest - earliest;
        
        console.log('[ViewerPage] Validating class start time constraints', {
          earliestMinutes: earliest,
          earliestTime: `${Math.floor(earliest/60)}:${String(earliest%60).padStart(2,'0')}`,
          latestMinutes: latest,
          latestTime: `${Math.floor(latest/60)}:${String(latest%60).padStart(2,'0')}`,
          windowMinutes,
          windowHours: (windowMinutes/60).toFixed(2)
        });
        
        if (latest <= earliest) {
          console.error('[ViewerPage] Invalid constraint: latest <= earliest', {
            earliest,
            latest
          });
          solverError.value = `Ogiltiga begränsningar: Senaste starttid (${Math.floor(latest/60)}:${String(latest%60).padStart(2,'0')}) måste vara efter tidigaste starttid (${Math.floor(earliest/60)}:${String(earliest%60).padStart(2,'0')})`;
          cancelSolverLoading();
          return;
        }
        
        // Check available time slots
        const availableSlots = payload.term?.dailySlots || payload.timeSlots || [];
        const slotsInWindow = availableSlots.filter(slot => {
          const slotStart = slot.start ? parseTimeToMinutes(slot.start) : null;
          return slotStart !== null && slotStart >= earliest && slotStart <= latest;
        });
        
        console.log('[ViewerPage] Time slot analysis', {
          totalSlots: availableSlots.length,
          slotsInWindow: slotsInWindow.length,
          windowStart: `${Math.floor(earliest/60)}:${String(earliest%60).padStart(2,'0')}`,
          windowEnd: `${Math.floor(latest/60)}:${String(latest%60).padStart(2,'0')}`,
          availableSlots: availableSlots.map(s => s.start).join(', ')
        });
        
        if (slotsInWindow.length === 0) {
          console.warn('[ViewerPage] WARNING: No time slots fall within the specified window', {
            earliest,
            latest,
            availableSlots: availableSlots.map(s => ({ start: s.start, end: s.end }))
          });
          solverError.value = `Varning: Inga tidsluckor finns inom det angivna fönstret (${Math.floor(earliest/60)}:${String(earliest%60).padStart(2,'0')} - ${Math.floor(latest/60)}:${String(latest%60).padStart(2,'0')}). Detta kan göra det omöjligt att skapa ett schema.`;
          cancelSolverLoading();
          return;
        }
      }
      
      console.log('[ViewerPage] Merged constraints for payload', {
        mergedConstraintsCount: Object.keys(merged).length,
        hasLunchBreak: !!merged.lunchBreak,
        classEarliestStart: merged.classEarliestStartMinutes,
        classLatestStart: merged.classLatestStartMinutes
      });
      
      payload.constraints = merged;
    } else if (solverOptions.relaxedConstraints || solverOptions.includeLunch) {
      const constraints = {};
      if (solverOptions.relaxedConstraints) {
        constraints.maxClassSessionsPerDay = 6;
        constraints.maxTeacherSessionsPerDay = 6;
        constraints.maxClassIdleMinutes = 300;
        constraints.maxTeacherIdleMinutes = 360;
        constraints.physicalEducationBufferMinutes = 10;
        constraints.physicalEducationSubjects = ['Idrott och hälsa 1', 'Idrott', 'Gymnastik'];
        constraints.disableSubjectSpread = true;
        constraints.disableTransitionBuffers = true;
      }
      if (solverOptions.includeLunch) {
        constraints.lunchBreak = {
          enabled: true,
          windowStart: '10:30',
          windowEnd: '13:30',
          durationMinutes: 45,
          granularityMinutes: Math.max(5, Number.parseInt(solverOptions.lunchGranularity, 10) || 30),
        };
      } else {
        constraints.lunchBreak = {
          enabled: false,
        };
      }
      payload.constraints = constraints;
    }

    if (solverOptions.debugMode) {
      payload.debug = true;
    }

      try {
        // Log the full payload being sent to solver for debugging
        console.log('[ViewerPage] Sending payload to Z3 solver', {
          payloadSize: JSON.stringify(payload).length,
          hasConstraints: !!payload.constraints,
          constraints: payload.constraints ? JSON.stringify(payload.constraints) : null,
          lessonTemplatesCount: payload.lessonTemplates?.length || 0,
          timeSlotsCount: payload.timeSlots?.length || 0,
          dailySlotsCount: payload.term?.dailySlots?.length || 0,
          classEarliestStart: payload.constraints?.classEarliestStartMinutes,
          classLatestStart: payload.constraints?.classLatestStartMinutes
        });
        
        const response = await window.api.runScheduleSolver(JSON.parse(JSON.stringify(payload)));
        
        console.log('[ViewerPage] Received response from Z3 solver', {
          success: response?.success,
          hasSchedule: !!response?.scheduleByDay,
          assignmentsCount: Array.isArray(response?.assignments) ? response.assignments.length : 0
        });
        
        generatedSchedule.value = normalizeScheduleResult(response?.scheduleByDay || {});
        solverAssignments.value = Array.isArray(response?.assignments) ? response.assignments : [];
        buildSuccess.value = true;
        isCreatorMode.value = false;
        selectedClassFilter.value = 'All Classes';
        solverError.value = null;
        schedule.value = generatedSchedule.value || {};
        ensureSelectedDayForSchedule(generatedSchedule.value || {}, { force: true });
        finishSolverLoading();
      } catch (error) {
        console.error('[ViewerPage] Z3 solver error', {
          errorMessage: error?.message,
          errorStack: error?.stack,
          errorName: error?.name,
          payloadConstraints: payload.constraints ? JSON.stringify(payload.constraints) : null,
          constraintWindow: payload.constraints ? {
            earliest: payload.constraints.classEarliestStartMinutes,
            latest: payload.constraints.classLatestStartMinutes
          } : null
        });
        solverError.value = error?.message || 'Failed to build schedule with Z3 solver.';
        cancelSolverLoading();
      } finally {
        isBuilding.value = false;
        if (!solverCompletionHandled) {
          cancelSolverLoading();
        }
      }
    };

    const createMockAutumnTermPayload = () => {
      const classesList = [
        { name: 'SA1' },
        { name: 'NA1' },
      ];

      const teachersList = [
        // SA1 core staff
        { name: 'Anna Larsson (SA1 Matematik)' },
        { name: 'Björn Svensson (SA1 Svenska)' },
        { name: 'Carina Holm (SA1 Engelska)' },
        { name: 'Eva Lind (SA1 Historia)' },
        { name: 'Oskar Dahl (SA1 Samhällskunskap)' },
        { name: 'Helena Ortiz (SA1 Moderna språk)' },
        { name: 'Rebecka Åsberg (SA1 Psykologi)' },
        { name: 'Patricia Nguyen (SA1 Religion)' },
        { name: 'Tomas Vik (SA1 Geografi)' },
        { name: 'Fredrik Berg (SA1 Idrott)' },
        { name: 'Maria Fors (SA1 Entreprenörskap)' },
        { name: 'Gisela Nyberg (SA1 Estetisk kommunikation)' },
        { name: 'Sara Lindqvist (SA1 Mentor)' },

        // NA1 core staff
        { name: 'Henrik Andersson (NA1 Matematik)' },
        { name: 'Katarina Blom (NA1 Svenska)' },
        { name: 'Daniel Falk (NA1 Engelska)' },
        { name: 'Annika Holm (NA1 Fysik)' },
        { name: 'Niklas Öberg (NA1 Kemi)' },
        { name: 'Victor Hamid (NA1 Biologi)' },
        { name: 'Ulrika Bergström (NA1 Moderna språk)' },
        { name: 'Lars Holmström (NA1 Teknik)' },
        { name: 'Quentin Salo (NA1 Programmering)' },
        { name: 'Oskar Dahl (NA1 Laborationstid)' },
        { name: 'Eva Lund (NA1 Historia)' },
        { name: 'Johanna Lundqvist (NA1 Idrott)' },
        { name: 'Sara Lindqvist (NA1 Mentor)' },
      ];

      const classroomsList = [
        { name: 'Sal 101' },
        { name: 'Sal 102' },
        { name: 'Sal 201' },
        { name: 'Matte 201' },
        { name: 'Språksal 1' },
        { name: 'Språksal 2' },
        { name: 'SO-sal 3' },
        { name: 'NO-lab 1' },
        { name: 'NO-lab 2' },
        { name: 'Teknikverkstan' },
        { name: 'Programmeringslabbet' },
        { name: 'Gympasalen' },
        { name: 'Ateljén' },
      ];

      const subjectsList = [
        { name: 'Matematik 1c' },
        { name: 'Svenska 1' },
        { name: 'Engelska 6' },
        { name: 'Historia 1b' },
        { name: 'Samhällskunskap 1b' },
        { name: 'Moderna språk – Spanska' },
        { name: 'Moderna språk – Franska' },
        { name: 'Psykologi 1' },
        { name: 'Religion 1' },
        { name: 'Geografi 1' },
        { name: 'Idrott och hälsa 1' },
        { name: 'Entreprenörskap' },
        { name: 'Estetisk kommunikation' },
        { name: 'Fysik 1' },
        { name: 'Kemi 1' },
        { name: 'Biologi 1' },
        { name: 'Teknik 1' },
        { name: 'Programmering 1' },
        { name: 'Laborationstid' },
        { name: 'Mentorstid' },
      ];

      const lessonTemplates = [
        // SA1 – Samhällsvetenskapsprogrammet
        { subject: 'Matematik 1c', class: 'SA1', teacher: 'Anna Larsson (SA1 Matematik)', sessionsPerWeek: 3, durationMinutes: 70, preferredRoom: 'Matte 201' },
        { subject: 'Svenska 1', class: 'SA1', teacher: 'Björn Svensson (SA1 Svenska)', sessionsPerWeek: 3, durationMinutes: 70, preferredRoom: 'Sal 101' },
        { subject: 'Engelska 6', class: 'SA1', teacher: 'Carina Holm (SA1 Engelska)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'Språksal 1' },
        { subject: 'Historia 1b', class: 'SA1', teacher: 'Eva Lind (SA1 Historia)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'SO-sal 3' },
        { subject: 'Samhällskunskap 1b', class: 'SA1', teacher: 'Oskar Dahl (SA1 Samhällskunskap)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'SO-sal 3' },
        { subject: 'Moderna språk – Spanska', class: 'SA1', teacher: 'Helena Ortiz (SA1 Moderna språk)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'Språksal 2' },
        { subject: 'Psykologi 1', class: 'SA1', teacher: 'Rebecka Åsberg (SA1 Psykologi)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Sal 102' },
        { subject: 'Religion 1', class: 'SA1', teacher: 'Patricia Nguyen (SA1 Religion)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Sal 201' },
        { subject: 'Geografi 1', class: 'SA1', teacher: 'Tomas Vik (SA1 Geografi)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'SO-sal 3' },
        { subject: 'Idrott och hälsa 1', class: 'SA1', teacher: 'Fredrik Berg (SA1 Idrott)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'Gympasalen' },
        { subject: 'Entreprenörskap', class: 'SA1', teacher: 'Maria Fors (SA1 Entreprenörskap)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Sal 201' },
        { subject: 'Estetisk kommunikation', class: 'SA1', teacher: 'Gisela Nyberg (SA1 Estetisk kommunikation)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Ateljén' },
        { subject: 'Mentorstid', class: 'SA1', teacher: 'Sara Lindqvist (SA1 Mentor)', sessionsPerWeek: 2, durationMinutes: 45, preferredRoom: 'Sal 102' },

        // NA1 – Naturvetenskapsprogrammet
        { subject: 'Matematik 1c', class: 'NA1', teacher: 'Henrik Andersson (NA1 Matematik)', sessionsPerWeek: 3, durationMinutes: 70, preferredRoom: 'Matte 201' },
        { subject: 'Svenska 1', class: 'NA1', teacher: 'Katarina Blom (NA1 Svenska)', sessionsPerWeek: 3, durationMinutes: 70, preferredRoom: 'Sal 101' },
        { subject: 'Engelska 6', class: 'NA1', teacher: 'Daniel Falk (NA1 Engelska)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'Språksal 1' },
        { subject: 'Fysik 1', class: 'NA1', teacher: 'Annika Holm (NA1 Fysik)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'NO-lab 1', allowedRooms: ['NO-lab 1', 'NO-lab 2'] },
        { subject: 'Kemi 1', class: 'NA1', teacher: 'Niklas Öberg (NA1 Kemi)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'NO-lab 2', allowedRooms: ['NO-lab 1', 'NO-lab 2'] },
        { subject: 'Biologi 1', class: 'NA1', teacher: 'Victor Hamid (NA1 Biologi)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'NO-lab 1', allowedRooms: ['NO-lab 1', 'NO-lab 2'] },
        { subject: 'Moderna språk – Franska', class: 'NA1', teacher: 'Ulrika Bergström (NA1 Moderna språk)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'Språksal 2' },
        { subject: 'Teknik 1', class: 'NA1', teacher: 'Lars Holmström (NA1 Teknik)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Teknikverkstan' },
        { subject: 'Programmering 1', class: 'NA1', teacher: 'Quentin Salo (NA1 Programmering)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Programmeringslabbet' },
        { subject: 'Laborationstid', class: 'NA1', teacher: 'Oskar Dahl (NA1 Laborationstid)', sessionsPerWeek: 2, durationMinutes: 70, preferredRoom: 'NO-lab 2', allowedRooms: ['NO-lab 1', 'NO-lab 2'] },
        { subject: 'Historia 1b', class: 'NA1', teacher: 'Eva Lund (NA1 Historia)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'SO-sal 3' },
        { subject: 'Idrott och hälsa 1', class: 'NA1', teacher: 'Johanna Lundqvist (NA1 Idrott)', sessionsPerWeek: 1, durationMinutes: 70, preferredRoom: 'Gympasalen' },
        { subject: 'Mentorstid', class: 'NA1', teacher: 'Sara Lindqvist (NA1 Mentor)', sessionsPerWeek: 2, durationMinutes: 45, preferredRoom: 'Sal 102' },
      ];

      return {
        term: {
          name: 'Höstterminen 2025 – Vecka 34-35',
          startDate: '2025-08-18',
          weeks: 1,
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          dailySlots: [
            { start: '08:10', end: '09:20' },
            { start: '09:30', end: '10:40' },
            { start: '10:50', end: '12:00' },
            { start: '13:00', end: '14:10' },
            { start: '14:20', end: '15:30' },
            { start: '15:40', end: '16:50' },
          ],
        },
        classes: classesList,
        teachers: teachersList,
        classrooms: classroomsList,
        subjects: subjectsList,
        timeSlots: [],
        lessonTemplates,
        constraints: {
          maxClassSessionsPerDay: 6,
          maxTeacherSessionsPerDay: 5,
          maxClassIdleMinutes: 150,
          maxTeacherIdleMinutes: 180,
          physicalEducationBufferMinutes: 15,
          physicalEducationSubjects: ['Idrott och hälsa 1', 'Idrott', 'Gymnastik'],
          lunchBreak: {
            enabled: true,
            windowStart: '10:45',
            windowEnd: '12:45',
            durationMinutes: 45,
            granularityMinutes: 15,
          },
        },
      };
    };

    const loadMockManualData = () => {
      solverError.value = null;
      buildSuccess.value = false;

      const mockPayload = createMockAutumnTermPayload();
      applyInitialData(mockPayload);

      schedule.value = {};
      generatedSchedule.value = null;
      solverAssignments.value = [];
      isCreatorMode.value = true;
      isBuilding.value = false;
    };

  const solverOptions = reactive({
    relaxedConstraints: true,
    includeLunch: true,
    debugMode: false,
    lunchGranularity: 30,
  });

  // Custom constraints from ConstraintsPage
  const customConstraints = ref(null);

  // Constraint defaults (matching Python solver)
  const CONSTRAINT_DEFAULTS = {
    maxClassIdleMinutes: 120,
    maxTeacherIdleMinutes: 180,
    maxClassSessionsPerDay: 5,
    maxTeacherSessionsPerDay: 3,
    disableSubjectSpread: false,
    disableTransitionBuffers: false,
    physicalEducationBufferMinutes: 15,
    physicalEducationSubjects: ['Idrott och hälsa 1', 'Idrott', 'Gymnastik'],
    classEarliestStartMinutes: 480,
    classLatestStartMinutes: 600,
    lunchBreak: {
      enabled: true,
      windowStart: '10:30',
      windowEnd: '12:30',
      durationMinutes: 30,
      granularityMinutes: 5
    }
  };

    const loadMinimalMockData = () => {
      solverError.value = null;
      buildSuccess.value = false;

      const minimalPayload = {
        term: {
          name: 'Mini Demo Week',
          startDate: '2025-08-18',
          weeks: 1,
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          dailySlots: [
            { start: '09:00', end: '10:00' },
            { start: '10:15', end: '11:15' },
            { start: '13:00', end: '14:00' },
          ],
        },
        classes: [{ name: 'Demo Class' }],
        teachers: [{ name: 'Demo Teacher' }],
        classrooms: [{ name: 'Demo Room' }],
        subjects: [{ name: 'Demo Subject' }],
        lessonTemplates: [
          {
            subject: 'Demo Subject',
            class: 'Demo Class',
            teacher: 'Demo Teacher',
            sessionsPerWeek: 3,
            durationMinutes: 60,
            preferredRoom: 'Demo Room',
          },
        ],
      };

      applyInitialData(minimalPayload);

      schedule.value = {};
      generatedSchedule.value = null;
      solverAssignments.value = [];
      isCreatorMode.value = true;
      isBuilding.value = false;
    };

    const classFilterOptions = computed(() => {
      const unique = new Set();
      classes.value.forEach((item) => {
        const className = item?.name?.trim();
        if (className) unique.add(className);
      });
      solverAssignments.value.forEach((assignment) => {
        const className = assignment?.class?.trim();
        if (className) unique.add(className);
      });
      if (generatedSchedule.value) {
        Object.values(generatedSchedule.value).forEach((dayEntries) => {
          dayEntries.forEach((entry) => {
            const className = entry?.classRef?.trim();
            if (className) unique.add(className);
          });
        });
      }
      const options = ['All Classes', ...Array.from(unique).sort()];
      
      logComputedUpdate('classFilterOptions', {
        optionCount: options.length,
        hasGeneratedSchedule: !!generatedSchedule.value,
        uniqueClasses: Array.from(unique)
      });
      
      return options;
    });

    const filteredSchedule = computed(() => {
      if (!generatedSchedule.value) {
        logComputedUpdate('filteredSchedule', {
          hasGeneratedSchedule: false,
          reason: 'No generatedSchedule available'
        });
        return null;
      }
      
      if (selectedClassFilter.value === 'All Classes') {
        logComputedUpdate('filteredSchedule', {
          filter: 'All Classes',
          returnsGenerated: true,
          scheduleKeys: Object.keys(generatedSchedule.value)
        });
        return generatedSchedule.value;
      }
      
      const result = {};
      let totalEntries = 0;
      Object.keys(generatedSchedule.value).forEach((dayKey) => {
        const entries = (generatedSchedule.value[dayKey] || []).filter(
          (entry) => (entry.classRef || '') === selectedClassFilter.value,
        );
        result[dayKey] = entries;
        totalEntries += entries.length;
      });
      
      logComputedUpdate('filteredSchedule', {
        filter: selectedClassFilter.value,
        scheduleKeys: Object.keys(result),
        totalEntries,
        originalKeys: Object.keys(generatedSchedule.value)
      });
      
      return result;
    });

    watch(classFilterOptions, (options) => {
      // Prevent reset during state restoration
      if (isRestoringState.value) {
        logFilterChange('WATCH_FILTER_OPTIONS_SKIP_RESTORING', {
          currentFilter: selectedClassFilter.value,
          availableOptions: options,
          isRestoring: true
        });
        return;
      }
      
      if (!options.includes(selectedClassFilter.value)) {
        logFilterChange('WATCH_FILTER_OPTIONS_RESET', {
          oldFilter: selectedClassFilter.value,
          newFilter: 'All Classes',
          availableOptions: options,
          reason: 'Current filter not in available options'
        });
        selectedClassFilter.value = 'All Classes';
      } else {
        logFilterChange('WATCH_FILTER_OPTIONS_VALID', {
          currentFilter: selectedClassFilter.value,
          availableOptions: options
        });
      }
    });

    const displayedSchedule = computed(() => {
      const result = filteredSchedule.value || generatedSchedule.value;
      
      // Log computed updates in development
      if (process.env.NODE_ENV === 'development') {
        const scheduleKeys = result ? Object.keys(result) : [];
        const scheduleEntryCount = scheduleKeys.reduce((count, key) => {
          return count + (Array.isArray(result[key]) ? result[key].length : 0);
        }, 0);
        
        logComputedUpdate('displayedSchedule', {
          hasValue: !!result,
          scheduleKeys,
          scheduleEntryCount,
          isFromFiltered: !!filteredSchedule.value,
          isFromGenerated: !filteredSchedule.value && !!generatedSchedule.value,
          selectedClassFilter: selectedClassFilter.value
        });
      }
      
      return result;
    });

    const sortDayKeys = (keys) => {
      const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return (keys || []).slice().sort((a, b) => {
        const aIso = isIsoDayKey(a);
        const bIso = isIsoDayKey(b);
        if (aIso && bIso) {
          return a.localeCompare(b);
        }
        if (aIso) return -1;
        if (bIso) return 1;
        const aIndex = weekdayOrder.indexOf(a);
        const bIndex = weekdayOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) {
          return a.localeCompare(b);
        }
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    };

    const findFirstDayKey = (scheduleObject) => {
      if (!scheduleObject) return null;
      const dayKeys = sortDayKeys(Object.keys(scheduleObject));
      if (dayKeys.length === 0) return null;
      const firstWithEntries = dayKeys.find((day) => (scheduleObject[day] || []).length > 0);
      return firstWithEntries || dayKeys[0];
    };

    const availableScheduleDays = computed(() => {
      const scheduleObject = displayedSchedule.value || {};
      const dayKeys = sortDayKeys(Object.keys(scheduleObject));
      if (dayKeys.length === 0) return [];
      const daysWithEntries = dayKeys.filter((day) => {
        if (isWeekendKey(day)) return false;
        const entries = scheduleObject[day] || [];
        return entries.length > 0;
      });
      return daysWithEntries.length > 0 ? daysWithEntries : dayKeys;
    });

    const ensureSelectedDayForSchedule = (scheduleObject, { force = false } = {}) => {
      if (!scheduleObject || Object.keys(scheduleObject).length === 0) {
        logScheduleDisplay('ENSURE_DAY_NO_SCHEDULE', {
          reason: 'Schedule object is empty or null',
          force
        });
        selectedDayKey.value = null;
        return;
      }
      
      const dayKeys = sortDayKeys(Object.keys(scheduleObject));
      const candidateDays = dayKeys.filter((day) => {
        if (isWeekendKey(day)) return false;
        const entries = scheduleObject[day] || [];
        return entries.length > 0;
      });
      const fallbackDay = candidateDays.length > 0 ? candidateDays[0] : dayKeys[0];

      const shouldUpdate = force ||
        !selectedDayKey.value ||
        !Object.prototype.hasOwnProperty.call(scheduleObject, selectedDayKey.value) ||
        ((scheduleObject[selectedDayKey.value] || []).length === 0 && candidateDays.length > 0);

      if (shouldUpdate) {
        const oldDay = selectedDayKey.value;
        selectedDayKey.value = fallbackDay || null;
        
        logScheduleDisplay('ENSURE_DAY_UPDATED', {
          oldDay,
          newDay: selectedDayKey.value,
          force,
          dayKeys,
          candidateDays,
          scheduleKeys: Object.keys(scheduleObject)
        });
      } else {
        logScheduleDisplay('ENSURE_DAY_NO_CHANGE', {
          currentDay: selectedDayKey.value,
          dayKeys,
          candidateDays
        });
      }
    };

    const handleSidebarSelectDay = (dayKey) => {
      if (!dayKey) return;
      selectedDayKey.value = dayKey;
    };

    const handleScheduleSelectedDay = (dayKey) => {
      if (!dayKey) return;
      selectedDayKey.value = dayKey;
    };

    watch(
      displayedSchedule,
      (value, oldValue) => {
        // Prevent clearing schedule during state restoration
        if (isRestoringState.value) {
          logScheduleDisplay('WATCH_DISPLAYED_SCHEDULE_SKIP_RESTORING', {
            hasValue: !!value,
            isRestoring: true
          });
          return;
        }
        
        const scheduleKeys = value ? Object.keys(value) : [];
        const scheduleEntryCount = scheduleKeys.reduce((count, key) => {
          return count + (Array.isArray(value[key]) ? value[key].length : 0);
        }, 0);
        
        logScheduleDisplay('WATCH_DISPLAYED_SCHEDULE', {
          hasValue: !!value,
          scheduleKeys,
          scheduleEntryCount,
          selectedDayKey: selectedDayKey.value,
          selectedClassFilter: selectedClassFilter.value,
          hadOldValue: !!oldValue
        });
        
        if (value) {
          schedule.value = value;
          ensureSelectedDayForSchedule(value);
        } else {
          // Only clear if we're not restoring and the value is actually null/undefined
          // Don't clear if it's an empty object (that might be valid)
          if (value === null || value === undefined) {
            logScheduleClear('WATCH_CLEAR_SCHEDULE', {
              reason: 'displayedSchedule is null/undefined',
              hadSchedule: !!oldValue
            });
            schedule.value = {};
            selectedDayKey.value = null;
          }
        }
      },
      { immediate: true }
    );

    watch(availableScheduleDays, (days) => {
      if (!displayedSchedule.value) {
        selectedDayKey.value = null;
        return;
      }
      if (!days.includes(selectedDayKey.value)) {
        ensureSelectedDayForSchedule(displayedSchedule.value, { force: true });
      }
    });

    watch(isCreatorMode, (value) => {
      if (!value && displayedSchedule.value) {
        ensureSelectedDayForSchedule(displayedSchedule.value, { force: true });
      }
    });

    const visibleAssignments = computed(() => {
      if (selectedClassFilter.value === 'All Classes') {
        return solverAssignments.value;
      }
      return solverAssignments.value.filter(
        (assignment) => (assignment?.class || '').trim() === selectedClassFilter.value,
      );
    });

    watch(
      () => props.initialData,
      (value) => {
        // Prevent interference with state restoration
        if (isRestoringState.value) {
          logInfo('WATCH_INITIAL_DATA_SKIP_RESTORING', {
            hasInitialData: !!value,
            isRestoring: true
          });
          return;
        }
        
        logInfo('WATCH_INITIAL_DATA', {
          hasInitialData: !!value,
          presetId: props.presetId
        });
        
        applyInitialData(value);
        ensureSelectedDayForSchedule(displayedSchedule.value, { force: true });
      },
      { immediate: true, deep: true }
    );

    // Listen for time slots updates from ConstraintsPage
    const handleTimeSlotsUpdate = (event) => {
      try {
        const { timeSlots: updatedSlots, presetId: eventPresetId } = event.detail;
        
        // Validate presetId matches (prevent cross-preset contamination)
        if (eventPresetId && props.presetId && eventPresetId !== props.presetId) {
          console.log('[ViewerPage] Ignoring time-slots-updated-viewer event - presetId mismatch', {
            eventPresetId,
            currentPresetId: props.presetId
          });
          return;
        }
        
        if (updatedSlots && Array.isArray(updatedSlots)) {
          syncTimeSlotsFromGlobal(updatedSlots);
          logInfo('TIME_SLOTS_UPDATED', { count: updatedSlots.length });
        }
      } catch (error) {
        console.error('[ViewerPage] Error handling time-slots-updated-viewer event', error);
      }
    };

    // Listen for constraints updates from ConstraintsPage
    const handleConstraintsUpdate = (event) => {
      try {
        const { constraints, presetId: eventPresetId } = event.detail;
        
        console.log('[ViewerPage] Received constraints-updated event', {
          constraintsCount: Object.keys(constraints || {}).length,
          eventPresetId,
          currentPresetId: props.presetId,
          timestamp: new Date().toISOString()
        });
        
        // Verify presetId matches (if provided)
        if (eventPresetId && eventPresetId !== props.presetId) {
          console.warn('[ViewerPage] Constraints update preset mismatch', {
            eventPresetId,
            currentPresetId: props.presetId
          });
          return;
        }
        
        // Store custom constraints
        customConstraints.value = constraints;
        
        console.log('[ViewerPage] Constraints stored successfully', {
          constraintsCount: Object.keys(constraints || {}).length,
          presetId: props.presetId,
          constraints: JSON.stringify(constraints)
        });
      } catch (error) {
        console.error('[ViewerPage] Error handling constraints update', error, {
          presetId: props.presetId,
          errorMessage: error?.message,
          errorStack: error?.stack
        });
      }
    };
    
    // Also listen for the App.vue forwarded event
    const handleConstraintsUpdateFromApp = (event) => {
      try {
        const { constraints, presetId: eventPresetId } = event.detail;
        
        console.log('[ViewerPage] Received constraints-updated-viewer event from App', {
          constraintsCount: Object.keys(constraints || {}).length,
          eventPresetId,
          currentPresetId: props.presetId
        });
        
        if (eventPresetId && eventPresetId !== props.presetId) {
          console.warn('[ViewerPage] Constraints update preset mismatch (from App)', {
            eventPresetId,
            currentPresetId: props.presetId
          });
          return;
        }
        
        customConstraints.value = constraints;
        
        console.log('[ViewerPage] Constraints stored from App event', {
          constraintsCount: Object.keys(constraints || {}).length,
          presetId: props.presetId
        });
      } catch (error) {
        console.error('[ViewerPage] Error handling constraints update from App', error);
      }
    };

    // Save current state
    const saveState = () => {
      try {
        const scheduleKeys = generatedSchedule.value ? Object.keys(generatedSchedule.value) : [];
        const scheduleEntryCount = scheduleKeys.reduce((count, key) => {
          return count + (Array.isArray(generatedSchedule.value[key]) ? generatedSchedule.value[key].length : 0);
        }, 0);
        
        const state = {
          presetId: props.presetId,
          classes: [...classes.value],
          teachers: [...teachers.value],
          classrooms: [...classrooms.value],
          subjects: [...subjects.value],
          timeSlots: [...timeSlots.value],
          termConfig: termConfig.value ? JSON.parse(JSON.stringify(termConfig.value)) : null,
          lessonTemplates: [...lessonTemplates.value],
          solverOptions: JSON.parse(JSON.stringify(solverOptions)),
          customConstraints: customConstraints.value ? JSON.parse(JSON.stringify(customConstraints.value)) : null,
          isCreatorMode: isCreatorMode.value,
          generatedSchedule: generatedSchedule.value ? JSON.parse(JSON.stringify(generatedSchedule.value)) : null,
          solverAssignments: [...solverAssignments.value],
          selectedClassFilter: selectedClassFilter.value,
          selectedDayKey: selectedDayKey.value,
          schedule: schedule.value ? JSON.parse(JSON.stringify(schedule.value)) : null,
          buildSuccess: buildSuccess.value
        };
        
        emit('save-state', state);
        
        logStateRestore('SAVE_STATE', {
          presetId: props.presetId,
          hasGeneratedSchedule: !!generatedSchedule.value,
          hasSelectedClassFilter: !!selectedClassFilter.value,
          selectedClassFilter: selectedClassFilter.value,
          scheduleKeys,
          scheduleEntryCount,
          hasClasses: classes.value.length > 0,
          hasTeachers: teachers.value.length > 0,
          hasTimeSlots: timeSlots.value.length > 0,
          isCreatorMode: isCreatorMode.value
        });
      } catch (error) {
        logError('SAVE_STATE', error, {
          presetId: props.presetId,
          category: 'STATE_SAVE'
        });
      }
    };
    
    // Restore state from saved state
    const restoreState = async () => {
      if (!props.savedState || props.savedState.presetId !== props.presetId) {
        logStateRestore('RESTORE_STATE_SKIP', {
          hasSavedState: !!props.savedState,
          savedPresetId: props.savedState?.presetId,
          currentPresetId: props.presetId
        });
        return;
      }
      
      // Set restoration flag to prevent watchers from clearing schedule
      isRestoringState.value = true;
      
      try {
        const saved = props.savedState;
        const savedScheduleKeys = saved.generatedSchedule ? Object.keys(saved.generatedSchedule) : [];
        const savedScheduleEntryCount = savedScheduleKeys.reduce((count, key) => {
          return count + (Array.isArray(saved.generatedSchedule[key]) ? saved.generatedSchedule[key].length : 0);
        }, 0);
        
        logStateRestore('RESTORE_STATE_START', {
          presetId: props.presetId,
          hasClasses: saved.classes?.length > 0,
          hasTeachers: saved.teachers?.length > 0,
          hasTimeSlots: saved.timeSlots?.length > 0,
          hasGeneratedSchedule: !!saved.generatedSchedule,
          scheduleKeys: savedScheduleKeys,
          scheduleEntryCount: savedScheduleEntryCount,
          selectedClassFilter: saved.selectedClassFilter,
          selectedDayKey: saved.selectedDayKey
        });
        
        // Step 1: Restore basic data
        if (saved.classes) classes.value = [...saved.classes];
        if (saved.teachers) teachers.value = [...saved.teachers];
        if (saved.classrooms) classrooms.value = [...saved.classrooms];
        if (saved.subjects) subjects.value = [...saved.subjects];
        // Restore time slots with backward compatibility
        if (saved.timeSlots) {
          timeSlots.value = [...saved.timeSlots];
          // Also sync to global state for migration
          window.dispatchEvent(new CustomEvent('time-slots-updated', {
            detail: { timeSlots: timeSlots.value, presetId: saved.presetId }
          }));
        }
        if (saved.termConfig) termConfig.value = JSON.parse(JSON.stringify(saved.termConfig));
        if (saved.lessonTemplates) lessonTemplates.value = [...saved.lessonTemplates];
        if (saved.solverOptions) {
          Object.assign(solverOptions, saved.solverOptions);
        }
        if (saved.customConstraints) customConstraints.value = JSON.parse(JSON.stringify(saved.customConstraints));
        if (saved.isCreatorMode !== undefined) isCreatorMode.value = saved.isCreatorMode;
        if (saved.buildSuccess !== undefined) buildSuccess.value = saved.buildSuccess;
        
        // Step 2: Restore schedule data (critical order)
        if (saved.generatedSchedule) {
          generatedSchedule.value = JSON.parse(JSON.stringify(saved.generatedSchedule));
          logStateRestore('RESTORE_GENERATED_SCHEDULE', {
            scheduleKeys: Object.keys(generatedSchedule.value),
            scheduleEntryCount: Object.keys(generatedSchedule.value).reduce((count, key) => {
              return count + (Array.isArray(generatedSchedule.value[key]) ? generatedSchedule.value[key].length : 0);
            }, 0)
          });
        }
        
        if (saved.solverAssignments) solverAssignments.value = [...saved.solverAssignments];
        
        // Step 3: Restore filter and day selection
        if (saved.selectedClassFilter) {
          selectedClassFilter.value = saved.selectedClassFilter;
          logFilterChange('RESTORE_FILTER', {
            newFilter: saved.selectedClassFilter
          });
        }
        
        if (saved.selectedDayKey) {
          selectedDayKey.value = saved.selectedDayKey;
        }
        
        if (saved.schedule) schedule.value = JSON.parse(JSON.stringify(saved.schedule));
        
        // Step 4: Wait for Vue reactivity to update computed properties
        await nextTick();
        
        // Step 5: Ensure selected day is valid for the restored schedule
        // Note: displayedSchedule is computed, so we don't assign to it
        // It will update automatically when generatedSchedule changes
        if (generatedSchedule.value) {
          const currentDisplayed = displayedSchedule.value;
          logScheduleDisplay('RESTORE_DISPLAYED_SCHEDULE', {
            hasSchedule: !!currentDisplayed,
            scheduleKeys: currentDisplayed ? Object.keys(currentDisplayed) : [],
            selectedDayKey: selectedDayKey.value,
            selectedClassFilter: selectedClassFilter.value
          });
          
          ensureSelectedDayForSchedule(currentDisplayed || generatedSchedule.value, { force: true });
        }
        
        logStateRestore('RESTORE_STATE_COMPLETE', {
          presetId: props.presetId,
          hasGeneratedSchedule: !!generatedSchedule.value,
          hasDisplayedSchedule: !!displayedSchedule.value,
          selectedClassFilter: selectedClassFilter.value,
          selectedDayKey: selectedDayKey.value
        });
      } catch (error) {
        logError('RESTORE_STATE', error, {
          presetId: props.presetId,
          category: 'STATE_RESTORE'
        });
      } finally {
        // Clear restoration flag after a short delay to ensure all watchers have processed
        await nextTick();
        setTimeout(() => {
          isRestoringState.value = false;
          logStateRestore('RESTORE_STATE_FLAG_CLEARED', {
            presetId: props.presetId
          });
        }, 100);
      }
    };

    onMounted(() => {
      window.addEventListener('constraints-updated', handleConstraintsUpdate);
      window.addEventListener('constraints-updated-viewer', handleConstraintsUpdateFromApp);
      window.addEventListener('time-slots-updated-viewer', handleTimeSlotsUpdate);
      
      // Request stored time slots from App.vue if we don't have any
      if (timeSlots.value.length === 0) {
        console.log('[ViewerPage] Requesting stored time slots from App', {
          presetId: props.presetId
        });
        
        // Dispatch event to request time slots from App.vue
        window.dispatchEvent(new CustomEvent('request-time-slots', {
          detail: { presetId: props.presetId }
        }));
      }
      
      // Restore saved state if available
      restoreState();
      
      // Request stored constraints from App.vue if we don't have any
      if (!customConstraints.value) {
        console.log('[ViewerPage] Requesting stored constraints from App', {
          presetId: props.presetId
        });
        
        // Dispatch event to request constraints from App.vue
        window.dispatchEvent(new CustomEvent('request-constraints', {
          detail: { presetId: props.presetId }
        }));
      } else {
        console.log('[ViewerPage] Already has custom constraints', {
          constraintsCount: Object.keys(customConstraints.value || {}).length,
          presetId: props.presetId
        });
      }
    });

    onUnmounted(() => {
      // Save state before unmounting
      saveState();
      
      clearProgressTimers();
      window.removeEventListener('constraints-updated', handleConstraintsUpdate);
      window.removeEventListener('constraints-updated-viewer', handleConstraintsUpdateFromApp);
      window.removeEventListener('time-slots-updated-viewer', handleTimeSlotsUpdate);
    });

    return {
      title,
      description,
      goToHome,
      goToConstraints,
      createSchedule,
      onScheduleChange,
      isChatOpen,
      toggleChat,
      isCreatorMode,
      classes,
      teachers,
      classrooms,
      timeSlots,
      subjects,
      generatedSchedule,
      filteredSchedule,
      displayedSchedule,
      solverAssignments,
      visibleAssignments,
      solverError,
      isBuilding,
      buildSuccess,
      isBuildReady,
      classFilterOptions,
      selectedClassFilter,
      daysOfWeek,
      importFromSchoolsoft,
      importFromSkola24,
      addClass,
      addTeacher,
      addClassroom,
      addTimeSlot,
      addSubject,
      removeClass,
      removeTeacher,
      removeClassroom,
      removeTimeSlot,
      removeSubject,
      buildWithSolver,
      loadMockManualData,
      solverOptions,
      loadMinimalMockData,
      schoolsoftIcon,
      skola24Icon,
      isLoadingScreenVisible,
      progressMessage,
      progressDisplay,
      progressStyle,
      solverProgress,
      selectedDayKey,
      availableScheduleDays,
      handleSidebarSelectDay,
      handleScheduleSelectedDay,
    };
  },
});
</script>

<style scoped>
.viewer-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.top-nav {
  padding: 1.5vh 2vh;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.mode-toggle {
  display: flex;
  gap: 0.5vh;
  background: #f0f0f0;
  border-radius: 0.6vh;
  padding: 0.3vh;
  align-items: center;
}

.variabler-link {
  padding: 0.8vh 1.5vh;
  border: none;
  border-radius: 0.4vh;
  background: transparent;
  color: #718096;
  font-size: 1.4vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.variabler-link:hover {
  background: #fff;
  color: #667eea;
  box-shadow: 0 0.1vh 0.3vh rgba(0, 0, 0, 0.1);
}

.mode-btn {
  padding: 0.8vh 1.5vh;
  border: none;
  border-radius: 0.4vh;
  background: transparent;
  color: #718096;
  font-size: 1.4vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn.active {
  background: #fff;
  color: #667eea;
  box-shadow: 0 0.1vh 0.3vh rgba(0, 0, 0, 0.1);
}

.viewer-layout {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.schedule-section {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.schedule-section.creator-mode {
  overflow-y: auto;
  overflow-x: hidden;
}

.creator-content {
  flex: 1;
  overflow-y: auto;
  padding: 3vh;
  background: transparent;
}

.creator-container {
  max-width: 120vh;
  margin: 0 auto;
}

.creator-title {
  font-size: 3vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1vh 0;
  text-align: center;
}

.creator-description {
  font-size: 1.5vh;
  color: #718096;
  margin: 0 0 3vh 0;
  text-align: center;
}

.import-section {
  margin-bottom: 3vh;
}

.section-title {
  font-size: 2vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1.5vh 0;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2vh;
  margin-bottom: 1.5vh;
}

.mock-actions {
  display: flex;
  gap: 1.5vh;
}

.mock-fill-btn {
  padding: 0.9vh 1.8vh;
  border: 0.1vh solid #dd6b20;
  border-radius: 0.75vh;
  background: #fffaf0;
  color: #c05621;
  font-size: 1.3vh;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mock-fill-btn:hover {
  background: #fbd38d;
  color: #9c4221;
  border-color: #c05621;
  box-shadow: 0 0.4vh 1.2vh rgba(221, 107, 32, 0.25);
}

.mock-fill-btn.secondary {
  border-color: #2b6cb0;
  color: #1a365d;
  background: #ebf8ff;
}

.mock-fill-btn.secondary:hover {
  background: #bee3f8;
  color: #1a365d;
  border-color: #2b6cb0;
  box-shadow: 0 0.4vh 1.2vh rgba(43, 108, 176, 0.25);
}

.solver-options-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2vh 2vh;
  padding: 1.5vh;
  border: 0.1vh dashed #cbd5f5;
  border-radius: 1vh;
  background: #f8fafc;
  margin-bottom: 2vh;
}

.solver-option {
  display: flex;
  align-items: center;
  gap: 0.8vh;
  font-size: 1.35vh;
  color: #2d3748;
}

.solver-option input[type='checkbox'] {
  transform: scale(1.1);
}

.solver-option-inline {
  display: flex;
  align-items: center;
  gap: 1vh;
}

.solver-option-number {
  width: 6vh;
  padding: 0.6vh;
  border: 0.1vh solid #cbd5e0;
  border-radius: 0.6vh;
  font-size: 1.3vh;
}

.import-buttons {
  display: flex;
  flex-direction: row;
  gap: 1.5vh;
  align-items: center;
  justify-content: center;
}

.import-btn {
  width: 25%;
  display: flex;
  align-items: center;
  padding: 2vh 2.5vh;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1vh;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  box-shadow: 0 0.1vh 0.5vh rgba(0, 0, 0, 0.05);
}

.import-btn:hover {
  transform: translateY(-0.1vh);
  box-shadow: 0 0.3vh 1vh rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 1.8vh;
}

.btn-icon {
  width: 3vh;
  height: 3vh;
  flex-shrink: 0;
  object-fit: contain;
}

.btn-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.4vh;
  flex: 1;
}

.btn-title {
  font-size: 1.6vh;
  font-weight: 600;
  color: #2d3748;
  display: block;
}

.btn-description {
  font-size: 1.3vh;
  color: #718096;
  display: block;
}

.schoolsoft-btn:hover {
  border-color: #4a90e2;
}

.schoolsoft-btn:hover .btn-title {
  color: #4a90e2;
}

.skola24-btn:hover {
  border-color: #48bb78;
}

.skola24-btn:hover .btn-title {
  color: #48bb78;
}

.divider {
  width: 100%;
  display: flex;
  align-items: center;
  margin: 2.5vh 0;
  text-align: center;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 0.1vh solid #e2e8f0;
}

.divider-text {
  padding: 0 1.5vh;
  font-size: 1.3vh;
  color: #a0aec0;
  font-weight: 500;
}

.categories-section {
  display: flex;
  flex-direction: column;
  gap: 2.5vh;
  margin-bottom: 3vh;
}

.category-card {
  background: #fff;
  border: 0.1vh solid #e2e8f0;
  border-radius: 1vh;
  padding: 2vh;
  box-shadow: 0 0.1vh 0.3vh rgba(0, 0, 0, 0.05);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5vh;
}

.category-title {
  font-size: 1.7vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.add-item-btn {
  padding: 0.7vh 1.3vh;
  border: 0.1vh solid #667eea;
  border-radius: 0.5vh;
  background: #fff;
  color: #667eea;
  font-size: 1.2vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-item-btn:hover {
  background: #667eea;
  color: #fff;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.8vh;
}

.item-input {
  flex: 1;
  padding: 1vh 1.3vh;
  border: 0.1vh solid #e2e8f0;
  border-radius: 0.5vh;
  font-size: 1.4vh;
  color: #2d3748;
  background: #fff;
  transition: all 0.2s ease;
}

.item-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.2vh rgba(102, 126, 234, 0.1);
}

.item-input::placeholder {
  color: #a0aec0;
}

.time-input {
  flex: 1;
}

.day-select {
  max-width: 18vh;
  cursor: pointer;
}

.time-separator {
  color: #718096;
  font-size: 1.4vh;
  padding: 0 0.4vh;
}

.remove-btn {
  width: 2.5vh;
  height: 2.5vh;
  border: 0.1vh solid #e2e8f0;
  border-radius: 0.5vh;
  background: #fff;
  color: #718096;
  font-size: 1.6vh;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #fee;
  border-color: #f56565;
  color: #f56565;
}

.empty-state {
  padding: 1.5vh;
  text-align: center;
  color: #a0aec0;
  font-size: 1.3vh;
  font-style: italic;
}

.build-section {
  margin-top: 3vh;
  padding-top: 2.5vh;
  border-top: 0.1vh solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vh;
}

.build-btn {
  padding: 1.8vh 3.5vh;
  border: none;
  border-radius: 1vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1.7vh;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.8vh;
  box-shadow: 0 0.3vh 1.2vh rgba(102, 126, 234, 0.3);
}

.build-btn:hover:not(:disabled) {
  transform: translateY(-0.2vh);
  box-shadow: 0 0.5vh 1.8vh rgba(102, 126, 234, 0.4);
}

.build-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.build-icon {
  font-size: 1.8vh;
}

.build-hint {
  font-size: 1.2vh;
  color: #a0aec0;
  margin: 0;
  text-align: center;
}

.build-error {
  margin: 0;
  font-size: 1.3vh;
  color: #e53e3e;
  text-align: center;
}

.build-success {
  margin: 0;
  font-size: 1.3vh;
  color: #38a169;
  text-align: center;
}

.solver-assignments {
  width: 100%;
  margin-top: 2vh;
  background: #f9fafb;
  border: 0.1vh solid #e2e8f0;
  border-radius: 1vh;
  padding: 2vh;
}

.solver-title {
  margin: 0 0 1.5vh 0;
  font-size: 1.6vh;
  font-weight: 600;
  color: #2d3748;
  text-align: center;
}

.solver-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.2vh;
}

.solver-item {
  display: flex;
  flex-direction: column;
  gap: 0.3vh;
  font-size: 1.3vh;
  color: #4a5568;
  text-align: center;
}

.solver-subject {
  font-weight: 600;
  color: #2d3748;
}

.solver-meta {
  color: #718096;
}

.solver-timeslot {
  color: #4c51bf;
  font-weight: 500;
}

.viewer-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1.5vh 2vh;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fff;
  gap: 1.5vh;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 1vh;
  font-size: 1.4vh;
  color: #4a5568;
}

.filter-label {
  font-weight: 600;
}

.filter-select {
  padding: 0.8vh 1.5vh;
  border: 0.1vh solid #d1d5db;
  border-radius: 0.6vh;
  font-size: 1.4vh;
  color: #2d3748;
  background: #fff;
  cursor: pointer;
  transition: border 0.2s ease, box-shadow 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.2vh rgba(102, 126, 234, 0.25);
}

.chat-toggle-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 4vh;
  height: 8vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 1vh 0 0 1vh;
  color: white;
  font-size: 2vh;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -0.3vh 0 1.5vh rgba(0, 0, 0, 0.15);
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.chat-toggle-btn:not(.active) {
  right: 0;
}

.chat-toggle-btn.active {
  right: 42vh;
}

.chat-toggle-btn:hover {
  box-shadow: -0.5vh 0 2vh rgba(0, 0, 0, 0.2);
}

.chat-toggle-btn:not(.active):hover {
  transform: translateY(-50%) translateX(-5%);
}

.chat-toggle-btn.active:hover {
  transform: translateY(-50%) translateX(5%);
}

.toggle-icon {
  display: block;
  transition: transform 0.3s ease;
  font-weight: 600;
}

.chat-section {
  position: fixed;
  right: 0;
  top: 6vh;
  bottom: 0;
  width: 42vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(0);
  z-index: 99;
  box-shadow: -0.2vh 0 1vh rgba(0, 0, 0, 0.1);
}

.chat-section:not(.open) {
  transform: translateX(100%);
}

.solver-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vh;
  box-sizing: border-box;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.18) 0%, rgba(118, 75, 162, 0.18) 100%);
  backdrop-filter: blur(6px);
}

.loading-card {
  width: 100%;
  max-width: 70vh;
  background: #ffffff;
  border-radius: 2vh;
  box-shadow: 0 2vh 5vh rgba(102, 126, 234, 0.2);
  padding: 4vh;
  display: flex;
  flex-direction: column;
  gap: 2.4vh;
  text-align: center;
}

.loading-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.8vh;
}

.loading-icon {
  font-size: 4vh;
  color: #667eea;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-title {
  font-size: 3vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  text-transform: capitalize;
}

.loading-subtitle {
  font-size: 1.7vh;
  color: #4a5568;
  margin: 0;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 1.2vh;
  align-items: center;
}

.progress-bar {
  width: 100%;
  height: 1.2vh;
  background: #edf2f7;
  border-radius: 1vh;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1vh;
  transition: width 0.3s ease;
}

.progress-value {
  font-size: 1.6vh;
  font-weight: 600;
  color: #667eea;
}

.progress-status-text {
  font-size: 1.5vh;
  color: #4c51bf;
  opacity: 0.65;
  margin: 0;
  font-style: italic;
  letter-spacing: 0.02em;
}

.loading-hint {
  font-size: 1.5vh;
  color: #718096;
  margin: 0;
}
</style>
