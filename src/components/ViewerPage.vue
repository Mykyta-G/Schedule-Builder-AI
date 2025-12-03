<template>
  <div class="viewer-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
      <div class="mode-toggle">
        <button 
          class="mode-btn" 
          :class="{ 'active': isCreatorMode }"
          @click="switchToCreatorMode"
        >
          Creator
        </button>
        <button 
          class="mode-btn" 
          :class="{ 'active': !isCreatorMode }"
          @click="switchToViewerMode"
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
                <!-- SchoolSoft import -->
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
              
              <!-- Advanced Options Dropdown -->
              <div class="options-container" v-if="isCreatorMode" ref="optionsContainerRef">
                <button class="options-btn" @click.stop="showOptionsPanel = !showOptionsPanel">
                  ⚙️ Advanced Options
                </button>
                <div class="options-dropdown" v-if="showOptionsPanel" @click.stop>
                  <label class="option-item">
                    <input type="checkbox" v-model="solverOptions.relaxedConstraints">
                    <span>Use relaxed constraints (faster search)</span>
                  </label>
                  <label class="option-item">
                    <input type="checkbox" v-model="solverOptions.includeLunch">
                    <span>Include lunch break</span>
                  </label>
                  <label class="option-item">
                    <input type="checkbox" v-model="solverOptions.debugMode">
                    <span>Enable solver debug output</span>
                  </label>
                  <div class="option-item" v-if="solverOptions.includeLunch">
                    <label>
                      <span>Lunch granularity (minutes)</span>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        v-model.number="solverOptions.lunchGranularity"
                        class="option-input"
                      >
                    </label>
                  </div>
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
    // Helper to normalize day names
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

    // Helper to normalize time slots to fixed 5-day structure
    const normalizeTimeSlots = (slots, defaultStart = '08:00', defaultEnd = '16:30') => {
      if (!Array.isArray(slots) || slots.length === 0) {
        return daysOfWeek.map(day => ({ day, start: defaultStart, end: defaultEnd }));
      }
      
      const existingMap = new Map();
      slots.forEach(slot => {
        if (slot && slot.day) {
          const normalizedDay = normalizeDayName(slot.day);
          if (normalizedDay && slot.start && slot.end) {
            existingMap.set(normalizedDay, { start: slot.start, end: slot.end });
          }
        }
      });
      
      return daysOfWeek.map(day => {
        if (existingMap.has(day)) {
          return { day, ...existingMap.get(day) };
        }
        return { day, start: defaultStart, end: defaultEnd };
      });
    };

    const syncTimeSlotsFromGlobal = (updatedSlots) => {
      if (updatedSlots && Array.isArray(updatedSlots)) {
        // Normalize to fixed 5-day structure
        const normalized = normalizeTimeSlots(updatedSlots, '08:00', '16:30');
        timeSlots.value = normalized;
        logInfo('TIME_SLOTS_SYNCED_FROM_GLOBAL', { 
          inputCount: updatedSlots.length,
          outputCount: normalized.length 
        });
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
    const originalBlocks = ref([]); // Store original blocks from loaded data to preserve on save
    const preservedSchedule = ref(null); // Preserve schedule when switching to creator mode
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

    // Helper to parse time string "HH:MM" to minutes
    const parseTimeToMinutes = (timeString) => {
      try {
        if (!timeString) return null;
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

      // Store original blocks for preservation during save
      if (data.blocks && Array.isArray(data.blocks)) {
        originalBlocks.value = JSON.parse(JSON.stringify(data.blocks));
      } else {
        originalBlocks.value = [];
      }
      
      // Handle generatedSchedule from saved JSON (solver-generated schedules)
      if (data.generatedSchedule && typeof data.generatedSchedule === 'object' && Object.keys(data.generatedSchedule).length > 0) {
        console.log('[ViewerPage] Found generatedSchedule, populating schedule view', { 
          dayCount: Object.keys(data.generatedSchedule).length 
        });
        generatedSchedule.value = normalizeScheduleResult(data.generatedSchedule);
        schedule.value = generatedSchedule.value;
        // Also preserve it for mode switching
        preservedSchedule.value = JSON.parse(JSON.stringify(generatedSchedule.value));
        isCreatorMode.value = false;
        buildSuccess.value = true;
      }
      // Handle pre-calculated blocks (e.g. from SchoolSoft import)
      else if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
        console.log('[ViewerPage] Found imported blocks, populating schedule view', { count: data.blocks.length });
        const scheduleByDay = {};
        
        data.blocks.forEach(block => {
          const day = block.day || 'Monday';
          if (!scheduleByDay[day]) {
            scheduleByDay[day] = [];
          }
          
          const startMinutes = parseTimeToMinutes(block.startTime || block.start || '08:00');
          const endMinutes = parseTimeToMinutes(block.endTime || block.end || '09:00');
          const duration = (endMinutes !== null && startMinutes !== null) ? (endMinutes - startMinutes) : 60;
          
          scheduleByDay[day].push({
            id: block.id,
            name: block.title || block.subject || 'Lesson',
            subject: block.title || block.subject || 'Lesson',
            classRef: block.class || 'My Class',
            teacher: block.teacher || '',
            classroom: block.room || '',
            startMinutes: startMinutes !== null ? startMinutes : 480,
            duration: duration,
            colorIndex: Math.floor(Math.random() * 10) // Assign a random color
          });
        });
        
        generatedSchedule.value = normalizeScheduleResult(scheduleByDay);
        schedule.value = generatedSchedule.value;
        // Also preserve it for mode switching
        preservedSchedule.value = JSON.parse(JSON.stringify(generatedSchedule.value));
        // Default to viewer mode when blocks exist (for display)
        // User can switch to creator mode using the toggle to rebuild/optimize
        isCreatorMode.value = false;
        buildSuccess.value = true;
      } else {
        // No schedule data - default to creator mode for building
        isCreatorMode.value = true;
        resetSolverState();
      }
      
      selectedClassFilter.value = 'All Classes';
    };

    const normalizeScheduleResult = (scheduleByDay = {}) => {
      const normalized = {};
      const processedDays = new Set();
      const fallbackBase = Date.now();

      // Get time slots for filtering
      const timeSlotsMap = {};
      if (timeSlots.value && timeSlots.value.length > 0) {
        timeSlots.value.forEach(slot => {
          if (slot && slot.day && slot.start && slot.end) {
            const dayName = slot.day.trim();
            const startMins = parseTimeToMinutes(slot.start);
            const endMins = parseTimeToMinutes(slot.end);
            if (startMins !== null && endMins !== null) {
              timeSlotsMap[dayName] = { start: startMins, end: endMins };
            }
          }
        });
      }
      
      // Helper to convert ISO date to day name
      const isoDateToDayName = (isoDate) => {
        if (!isoDate || !isoDateRegex.test(isoDate)) return null;
        try {
          const date = new Date(`${isoDate}T00:00:00`);
          const dayIndex = date.getDay();
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return dayNames[dayIndex];
        } catch {
          return null;
        }
      };

      Object.keys(scheduleByDay || {}).forEach((dayKey) => {
        if (isWeekendKey(dayKey)) {
          return;
        }
        const entries = Array.isArray(scheduleByDay[dayKey]) ? scheduleByDay[dayKey] : [];
        
        // Filter entries based on time slots for this day
        // Convert ISO date to day name if needed
        const dayName = isoDateRegex.test(dayKey) ? isoDateToDayName(dayKey) : dayKey;
        const dayTimeSlot = dayName ? timeSlotsMap[dayName] : null;
        
        const filteredEntries = entries.filter((entry) => {
          // If we have time slots for this day, filter by them
          if (dayTimeSlot) {
            const entryStart = typeof entry?.startMinutes === 'number' ? entry.startMinutes : null;
            if (entryStart === null) return false;
            
            // Check if entry starts within the time slot window
            // Entry must start at or after slot start, and end before or at slot end
            const entryEnd = entryStart + (typeof entry?.duration === 'number' ? entry.duration : 60);
            const withinSlot = entryStart >= dayTimeSlot.start && entryEnd <= dayTimeSlot.end;
            
            if (!withinSlot) {
              console.log('[ViewerPage] Filtering out entry outside time slot', {
                day: dayName,
                entryStart: `${Math.floor(entryStart/60)}:${String(entryStart%60).padStart(2,'0')}`,
                entryEnd: `${Math.floor(entryEnd/60)}:${String(entryEnd%60).padStart(2,'0')}`,
                slotStart: `${Math.floor(dayTimeSlot.start/60)}:${String(dayTimeSlot.start%60).padStart(2,'0')}`,
                slotEnd: `${Math.floor(dayTimeSlot.end/60)}:${String(dayTimeSlot.end%60).padStart(2,'0')}`,
                entry: entry
              });
            }
            
            return withinSlot;
          }
          // If no time slot for this day, allow all entries (backward compatibility)
          return true;
        });
        
        normalized[dayKey] = filteredEntries.map((entry, index) => {
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
        
        // Log filtering results for this day
        if (entries.length !== filteredEntries.length) {
          console.log('[ViewerPage] Filtered schedule entries for day', {
            dayKey,
            dayName,
            originalCount: entries.length,
            filteredCount: filteredEntries.length,
            removedCount: entries.length - filteredEntries.length,
            timeSlot: dayTimeSlot ? {
              start: `${Math.floor(dayTimeSlot.start/60)}:${String(dayTimeSlot.start%60).padStart(2,'0')}`,
              end: `${Math.floor(dayTimeSlot.end/60)}:${String(dayTimeSlot.end%60).padStart(2,'0')}`
            } : 'No time slot'
          });
        }
        
        processedDays.add(dayKey);
      });
      
      // Log summary of filtering
      const totalOriginal = Object.values(scheduleByDay || {}).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
      const totalFiltered = Object.values(normalized).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
      if (totalOriginal !== totalFiltered) {
        console.log('[ViewerPage] Schedule filtering summary', {
          totalOriginal,
          totalFiltered,
          removedCount: totalOriginal - totalFiltered,
          timeSlotsMap: Object.keys(timeSlotsMap).map(day => ({
            day,
            slot: timeSlotsMap[day]
          }))
        });
      }

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
    
    // parseTimeToMinutes moved up


    // Validate time slots for solver - enforce exactly 5 weekdays
    const validateTimeSlotsForSolver = (timeSlots) => {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      // Check 1: Exactly 5 entries
      if (!Array.isArray(timeSlots) || timeSlots.length !== 5) {
        return { 
          valid: false, 
          error: `Expected 5 time slots, got ${timeSlots?.length || 0}`,
          details: { count: timeSlots?.length || 0, expected: 5 }
        };
      }
      
      // Check 2: All days are weekdays
      const days = timeSlots.map(s => s?.day).filter(Boolean);
      const invalidDays = days.filter(d => !weekdays.includes(d));
      if (invalidDays.length > 0) {
        return { 
          valid: false, 
          error: `Invalid days: ${invalidDays.join(', ')}. Must be Monday-Friday.`,
          details: { invalidDays, weekdays }
        };
      }
      
      // Check 3: No duplicates
      const uniqueDays = new Set(days);
      if (uniqueDays.size !== 5) {
        const duplicates = days.filter((d, i) => days.indexOf(d) !== i);
        return { 
          valid: false, 
          error: `Duplicate days detected: ${[...new Set(duplicates)].join(', ')}`,
          details: { duplicates: [...new Set(duplicates)], days }
        };
      }
      
      // Check 4: All have valid start/end times
      for (const slot of timeSlots) {
        if (!slot.start || !slot.end) {
          return { 
            valid: false, 
            error: `Missing time for ${slot.day || 'unknown day'}`,
            details: { day: slot.day, hasStart: !!slot.start, hasEnd: !!slot.end }
          };
        }
        
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
          return { 
            valid: false, 
            error: `Invalid time format for ${slot.day}. Use HH:MM format (e.g., 08:00)`,
            details: { day: slot.day, start: slot.start, end: slot.end }
          };
        }
        
        const startMins = parseTimeToMinutes(slot.start);
        const endMins = parseTimeToMinutes(slot.end);
        if (startMins === null || endMins === null || endMins <= startMins) {
          return { 
            valid: false, 
            error: `Invalid time range for ${slot.day}: end time must be after start time`,
            details: { day: slot.day, start: slot.start, end: slot.end, startMins, endMins }
          };
        }
      }
      
      return { valid: true };
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
        toPage: 'home',
        presetId: props.presetId
      });
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
    };

    const goToConstraints = () => {
      try {
        // Save state before navigating away
        saveState();
        
        console.log('[ViewerPage] Navigating to constraints page', { 
          presetId: props.presetId,
          hasSolverOptions: !!solverOptions,
          hasCustomConstraints: !!customConstraints.value,
          localTimeSlotsCount: timeSlots.value.length
        });
        
        // Request latest time slots from App.vue before navigating
        // This ensures we pass the most recent time slots (which might have been updated in ConstraintsPage)
        // We'll use a synchronous approach: dispatch request and wait briefly, or just let App.vue handle it
        // Actually, App.vue already has globalTimeSlots, so we can just not pass timeSlots
        // and let App.vue use its globalTimeSlots when rendering ConstraintsPage
        // But to be safe, we'll pass our local time slots, and App.vue will keep globalTimeSlots if they exist
        
        // Pass current time slots to constraints page (App.vue will prioritize globalTimeSlots if they exist)
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

    const switchToCreatorMode = () => {
      // Preserve the schedule before switching so it can be restored
      if (!isCreatorMode.value && generatedSchedule.value) {
        console.log('[ViewerPage] Switching to creator mode - preserving schedule');
        preservedSchedule.value = JSON.parse(JSON.stringify(generatedSchedule.value));
      }
      isCreatorMode.value = true;
    };

    const switchToViewerMode = async () => {
      isCreatorMode.value = false;
      
      // Always restore preserved schedule if we have one, regardless of current state
      if (preservedSchedule.value) {
        console.log('[ViewerPage] Restoring preserved schedule when switching to viewer mode');
        generatedSchedule.value = JSON.parse(JSON.stringify(preservedSchedule.value));
        schedule.value = generatedSchedule.value;
        buildSuccess.value = true;
      }
      
      // Ensure selected day is valid when switching to viewer mode
      if (displayedSchedule.value) {
        ensureSelectedDayForSchedule(displayedSchedule.value, { force: true });
      } else if (generatedSchedule.value) {
        // If we have a schedule but displayedSchedule is empty, ensure day is set
        ensureSelectedDayForSchedule(generatedSchedule.value, { force: true });
      }
      // Auto-save schedule when switching to viewer mode
      await saveScheduleToFile();
    };

    const importFromSchoolsoft = () => {
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { 
          page: 'schoolsoft-login'
        } 
      }));
    };

    const loadFromFile = async () => {
      try {
        // Get list of schedules
        if (!window.api || !window.api.listSchedules) {
          alert('Schedule API not available');
          return;
        }

        const scheduleList = await window.api.listSchedules();
        
        if (!scheduleList || scheduleList.length === 0) {
          alert('No saved schedules found');
          return;
        }

        // Show a simple selection dialog
        const scheduleNames = scheduleList.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.id})`).join('\n');
        const selection = prompt(`Select a schedule to load:\n\n${scheduleNames}\n\nEnter the number (1-${scheduleList.length}):`);
        
        if (!selection) return;
        
        const index = parseInt(selection) - 1;
        if (index < 0 || index >= scheduleList.length) {
          alert('Invalid selection');
          return;
        }

        const selectedSchedule = scheduleList[index];
        
        // Load the schedule
        const scheduleData = await window.api.readSchedule(selectedSchedule.id);
        
        if (scheduleData) {
          console.log('[ViewerPage] Loading schedule from file', {
            id: selectedSchedule.id,
            name: selectedSchedule.name,
            hasTerm: !!scheduleData.term,
            hasClasses: !!scheduleData.classes,
            hasBlocks: !!scheduleData.blocks
          });
          
          // Apply the loaded data
          applyInitialData(scheduleData);
          
          alert(`Loaded: ${selectedSchedule.name}`);
        } else {
          alert('Failed to load schedule');
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
        alert('Error loading schedule: ' + error.message);
      }
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

      // Validate time slots before sending to solver
      const validation = validateTimeSlotsForSolver(slotsToUse);
      if (!validation.valid) {
        console.error('[ViewerPage] Time slots validation failed before solver', validation);
        solverError.value = `Ogiltiga starttider: ${validation.error}. Vänligen korrigera i Variabler-sidan.`;
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
        // Use timeSlots to create one big dailySlot (matching the previous system)
        // The solver will apply this slot to all days, but we filter the display based on day-specific time slots
        // This approach is more efficient and prevents the solver from getting stuck with too many slot combinations
        let dailySlotsToUse = [];
        
        if (slotsToUse.length > 0) {
          // Find the earliest start and latest end across all days
          // This creates one big slot that spans all working hours
          // The display will filter events based on day-specific time slots
          let earliestStart = null;
          let latestEnd = null;
          
          slotsToUse.forEach(slot => {
            if (slot && slot.start && slot.end) {
              const startMins = parseTimeToMinutes(slot.start);
              const endMins = parseTimeToMinutes(slot.end);
              
              if (startMins !== null && endMins !== null) {
                if (earliestStart === null || startMins < earliestStart) {
                  earliestStart = startMins;
                }
                if (latestEnd === null || endMins > latestEnd) {
                  latestEnd = endMins;
                }
              }
            }
          });
          
          // Create multiple slots from earliest start to latest end
          // The solver needs multiple slots to schedule multiple lessons per day
          // Find the maximum lesson duration to ensure slots are large enough
          let maxLessonDuration = 60; // Default to 60 minutes
          if (lessonTemplates.value && lessonTemplates.value.length > 0) {
            const durations = lessonTemplates.value
              .map(t => t.durationMinutes || 60)
              .filter(d => d > 0);
            if (durations.length > 0) {
              maxLessonDuration = Math.max(...durations);
            }
          }
          
          // Use the maximum lesson duration, rounded up to nearest 5 minutes, with a minimum of 60
          const slotDuration = Math.max(60, Math.ceil(maxLessonDuration / 5) * 5);
          
          if (earliestStart !== null && latestEnd !== null && latestEnd > earliestStart) {
            const slots = [];
            let currentStart = earliestStart;
            
            while (currentStart + slotDuration <= latestEnd) {
              const slotStartHours = Math.floor(currentStart / 60);
              const slotStartMins = currentStart % 60;
              const slotEnd = currentStart + slotDuration;
              const slotEndHours = Math.floor(slotEnd / 60);
              const slotEndMins = slotEnd % 60;
              
              const slotStartTime = `${String(slotStartHours).padStart(2, '0')}:${String(slotStartMins).padStart(2, '0')}`;
              const slotEndTime = `${String(slotEndHours).padStart(2, '0')}:${String(slotEndMins).padStart(2, '0')}`;
              
              slots.push({
                start: slotStartTime,
                end: slotEndTime
              });
              
              currentStart += slotDuration;
            }
            
            if (slots.length > 0) {
              dailySlotsToUse = slots;
              
              console.log('[ViewerPage] Created multiple dailySlots from timeSlots', {
                timeSlotsCount: slotsToUse.length,
                dailySlotsCount: slots.length,
                slotDurationMinutes: slotDuration,
                maxLessonDurationMinutes: maxLessonDuration,
                timeRange: `${Math.floor(earliestStart/60)}:${String(earliestStart%60).padStart(2,'0')} - ${Math.floor(latestEnd/60)}:${String(latestEnd%60).padStart(2,'0')}`,
                slotsPerDay: slots.length,
                note: `Slots sized to accommodate lessons up to ${maxLessonDuration} minutes`
              });
            } else {
              console.error('[ViewerPage] Could not create dailySlots from timeSlots - time range too short', {
                earliestStart,
                latestEnd,
                duration: latestEnd - earliestStart,
                timeSlotsCount: slotsToUse.length
              });
            }
          } else {
            console.error('[ViewerPage] Could not create dailySlot from timeSlots', {
              earliestStart,
              latestEnd,
              timeSlotsCount: slotsToUse.length,
              isValid: earliestStart !== null && latestEnd !== null && latestEnd > earliestStart
            });
          }
        }
        
        // Fall back to termConfig.dailySlots if we couldn't create from timeSlots
        if (dailySlotsToUse.length === 0 && Array.isArray(termConfig.value.dailySlots) && termConfig.value.dailySlots.length > 0) {
          dailySlotsToUse = termConfig.value.dailySlots.map((slot) => ({
            start: slot.start,
            end: slot.end,
          }));
          console.log('[ViewerPage] Using dailySlots from termConfig', {
            dailySlotsCount: dailySlotsToUse.length
          });
        }
        
        // Ensure we have at least one dailySlot (solver requirement)
        if (dailySlotsToUse.length === 0) {
          console.error('[ViewerPage] No dailySlots available - cannot build schedule', {
            hasTimeSlots: slotsToUse.length > 0,
            hasTermConfigDailySlots: Array.isArray(termConfig.value.dailySlots) && termConfig.value.dailySlots.length > 0
          });
          solverError.value = 'Inga tidsluckor tillgängliga. Vänligen lägg till starttider i Variabler-sidan.';
          cancelSolverLoading();
          return;
        }
        
        payload.term = {
          name: termConfig.value.name,
          startDate: termConfig.value.startDate,
          weeks: termConfig.value.weeks,
          days: Array.isArray(termConfig.value.days) ? [...termConfig.value.days] : [],
          dailySlots: dailySlotsToUse,
        };
        
        console.log('[ViewerPage] Term config prepared for solver', {
          hasDailySlots: dailySlotsToUse.length > 0,
          dailySlotsCount: dailySlotsToUse.length,
          dailySlots: dailySlotsToUse
        });
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
      
      // When using time slots, remove classEarliestStartMinutes and classLatestStartMinutes
      // because time slots already define when lessons can be scheduled
      // These constraints conflict with time slots and cause the solver to ignore time slot restrictions
      // IMPORTANT: The solver has defaults (08:00-10:00) if these are not provided, so we need to
      // explicitly set them to null or very wide values to prevent the solver from applying defaults
      if (slotsToUse.length > 0 || payload.term?.dailySlots?.length > 0) {
        console.log('[ViewerPage] Removing class start time constraints - time slots define scheduling window', {
          hasTimeSlots: slotsToUse.length > 0,
          hasDailySlots: payload.term?.dailySlots?.length > 0,
          removedConstraints: {
            classEarliestStartMinutes: merged.classEarliestStartMinutes,
            classLatestStartMinutes: merged.classLatestStartMinutes
          }
        });
        
        // Remove the conflicting constraints
        // Set to null explicitly so the solver knows they're intentionally omitted
        // The solver should respect time slots instead of using defaults
        merged.classEarliestStartMinutes = null;
        merged.classLatestStartMinutes = null;
        
        // Actually delete them so they're not sent at all
        delete merged.classEarliestStartMinutes;
        delete merged.classLatestStartMinutes;
      } else {
        // Only validate class start time constraints if we're NOT using time slots
        // (for backward compatibility with basic mode)
        if (merged.classEarliestStartMinutes !== undefined && merged.classLatestStartMinutes !== undefined) {
          const earliest = merged.classEarliestStartMinutes;
          const latest = merged.classLatestStartMinutes;
          
          if (latest <= earliest) {
            console.error('[ViewerPage] Invalid constraint: latest <= earliest', {
              earliest,
              latest
            });
            solverError.value = `Ogiltiga begränsningar: Senaste starttid (${Math.floor(latest/60)}:${String(latest%60).padStart(2,'0')}) måste vara efter tidigaste starttid (${Math.floor(earliest/60)}:${String(earliest%60).padStart(2,'0')})`;
            cancelSolverLoading();
            return;
          }
        }
      }
      
      console.log('[ViewerPage] Merged constraints for payload', {
        mergedConstraintsCount: Object.keys(merged).length,
        hasLunchBreak: !!merged.lunchBreak,
        classEarliestStart: merged.classEarliestStartMinutes,
        classLatestStart: merged.classLatestStartMinutes,
        allConstraints: Object.keys(merged),
        constraintsValues: merged
      });
      
      payload.constraints = merged;
      
      // Log final payload to verify constraints are removed when using time slots
      console.log('[ViewerPage] Final payload constraints check', {
        hasConstraints: !!payload.constraints,
        hasClassEarliestStart: 'classEarliestStartMinutes' in (payload.constraints || {}),
        hasClassLatestStart: 'classLatestStartMinutes' in (payload.constraints || {}),
        hasTimeSlots: !!payload.timeSlots && payload.timeSlots.length > 0,
        hasDailySlots: !!payload.term?.dailySlots && payload.term.dailySlots.length > 0,
        timeSlots: payload.timeSlots,
        dailySlots: payload.term?.dailySlots
      });
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
        
        // Log detailed payload structure before sending
        console.log('[ViewerPage] Detailed payload structure', {
          hasTerm: !!payload.term,
          termDailySlots: payload.term?.dailySlots,
          termDays: payload.term?.days,
          termWeeks: payload.term?.weeks,
          termStartDate: payload.term?.startDate,
          hasTimeSlots: !!payload.timeSlots,
          timeSlotsCount: payload.timeSlots?.length,
          hasLessonTemplates: !!payload.lessonTemplates,
          lessonTemplatesCount: payload.lessonTemplates?.length
        });
        
        const response = await window.api.runScheduleSolver(JSON.parse(JSON.stringify(payload)));
        
        console.log('[ViewerPage] Received response from Z3 solver', {
          success: response?.success,
          hasSchedule: !!response?.scheduleByDay,
          assignmentsCount: Array.isArray(response?.assignments) ? response.assignments.length : 0,
          error: response?.error,
          details: response?.details
        });
        
        // Check if solver returned an error
        if (response?.success === false) {
          const errorMessage = response?.error || 'Z3 solver reported an error.';
          console.error('[ViewerPage] Solver returned error', {
            error: errorMessage,
            details: response?.details,
            payloadTerm: payload.term ? {
              dailySlots: payload.term.dailySlots,
              days: payload.term.days
            } : null
          });
          
          // Provide user-friendly error messages
          let userMessage = errorMessage;
          if (errorMessage.includes('Daily slot end time must be after start time')) {
            userMessage = 'Ogiltig tidslucka: Sluttid måste vara efter starttid. Kontrollera starttider i Variabler-sidan.';
          } else if (errorMessage.includes('Term requires at least one valid daily slot')) {
            userMessage = 'Inga giltiga tidsluckor. Kontrollera att starttider är korrekt angivna i Variabler-sidan.';
          } else if (errorMessage.includes('Term configuration did not produce any teaching time slots')) {
            userMessage = 'Termkonfigurationen producerade inga tidsluckor. Kontrollera terminställningar och starttider.';
          } else if (errorMessage.includes('No available time slots')) {
            userMessage = 'Inga tillgängliga tidsluckor. Kontrollera starttider och begränsningar.';
          } else if (errorMessage.includes('Z3 could not find a feasible schedule')) {
            userMessage = 'Z3 kunde inte hitta ett möjligt schema. Försök att minska antalet lektioner eller slappa på begränsningarna.';
          }
          
          solverError.value = userMessage;
          cancelSolverLoading();
          return;
        }
        
        generatedSchedule.value = normalizeScheduleResult(response?.scheduleByDay || {});
        solverAssignments.value = Array.isArray(response?.assignments) ? response.assignments : [];
        buildSuccess.value = true;
        // Preserve the schedule for mode switching
        preservedSchedule.value = JSON.parse(JSON.stringify(generatedSchedule.value));
        isCreatorMode.value = false;
        selectedClassFilter.value = 'All Classes';
        solverError.value = null;
        schedule.value = generatedSchedule.value || {};
        ensureSelectedDayForSchedule(generatedSchedule.value || {}, { force: true });
        finishSolverLoading();
        // Auto-save schedule after successful build
        await saveScheduleToFile();
      } catch (error) {
        // Extract the actual error message - it might be nested in multiple layers
        let actualError = error?.message || 'Failed to build schedule with Z3 solver.';
        
        // Log the full error object to see what's available
        console.error('[ViewerPage] Full error object', {
          error,
          errorKeys: error ? Object.keys(error) : [],
          errorMessage: error?.message,
          errorStack: error?.stack,
          errorName: error?.name,
          errorDetails: error?.details,
          errorCause: error?.cause,
          errorStderr: error?.stderr,
          errorOriginalError: error?.originalError,
          errorExitCode: error?.exitCode,
          errorRawStdout: error?.rawStdout,
          errorString: String(error),
          // Try to get all enumerable properties
          errorAllProps: error ? Object.getOwnPropertyNames(error) : []
        });
        
        // Try multiple strategies to extract the actual error message
        // Strategy 1: Check error.stderr (set by z3Solver.js) - this contains the actual Python error
        // Note: IPC might not preserve custom properties, so also check the message
        if (error?.stderr && error.stderr.trim()) {
          actualError = error.stderr.trim();
          // If stderr is very long, take the first meaningful line
          const stderrLines = error.stderr.trim().split('\n');
          if (stderrLines.length > 0) {
            // Find the first non-empty line that looks like an error
            const errorLine = stderrLines.find(line => 
              line.trim().length > 0 && 
              (line.includes('Error') || line.includes('error') || line.includes('Traceback') || line.includes('Exception'))
            );
            if (errorLine) {
              actualError = errorLine.trim();
            }
          }
        }
        
        // Strategy 1b: Extract stderr from error message if it was embedded (IPC fallback)
        if ((actualError === error?.message || actualError.includes('Error invoking remote method')) && error?.message) {
          // Try to extract stderr from [stderr: ...] pattern
          const stderrMatch = error.message.match(/\[stderr: (.+?)\]/);
          if (stderrMatch && stderrMatch[1]) {
            actualError = stderrMatch[1].trim();
          }
          
          // Try to extract originalError from [originalError: ...] pattern (from main.js)
          const originalErrorMatch = error.message.match(/\[originalError: (.+?)\]/);
          if (originalErrorMatch && originalErrorMatch[1] && originalErrorMatch[1] !== 'Z3 solver reported an error.') {
            actualError = originalErrorMatch[1].trim();
          }
          
          // Try to extract from [from stdout] pattern (from main.js)
          const stdoutMatch = error.message.match(/(.+?)\s*\[from stdout\]/);
          if (stdoutMatch && stdoutMatch[1] && stdoutMatch[1] !== 'Z3 solver reported an error.') {
            actualError = stdoutMatch[1].trim();
          }
          
          // Also try "Z3 solver error: ..." pattern (from z3Solver.js fallback)
          const z3ErrorMatch = error.message.match(/Z3 solver error: (.+?)(?:\s*\[|$)/);
          if (z3ErrorMatch && z3ErrorMatch[1]) {
            actualError = z3ErrorMatch[1].trim();
          }
        }
        
        // Strategy 2: Check error.originalError (set by z3Solver.js) - this is the error from Python JSON response
        if (error?.originalError && error.originalError !== 'Z3 solver reported an error.') {
          actualError = error.originalError;
        }
        
        // Strategy 2b: Extract originalError from error message if it was embedded (IPC fallback)
        // The actual error is usually the first part before any [stderr: ...] or [details: ...]
        if ((actualError === error?.message || actualError.includes('Error invoking remote method')) && error?.message) {
          // Try to extract the main error message (before any brackets)
          const mainErrorMatch = error.message.match(/^(.+?)(?:\s*\[|$)/);
          if (mainErrorMatch && mainErrorMatch[1] && mainErrorMatch[1] !== 'Error invoking remote method \'run-solver\': Error: Z3 solver reported an error.') {
            const extracted = mainErrorMatch[1].trim();
            // Remove the IPC wrapper if present
            if (extracted.includes('Error invoking remote method')) {
              const afterInvoke = extracted.split('Error: ').pop();
              if (afterInvoke && afterInvoke !== 'Z3 solver reported an error.') {
                actualError = afterInvoke.trim();
              }
            } else if (extracted !== 'Z3 solver reported an error.') {
              actualError = extracted;
            }
          }
          
          // Try to extract from [details: ...] pattern
          const detailsMatch = error.message.match(/\[details: (.+?)\]/);
          if (detailsMatch && detailsMatch[1]) {
            actualError = detailsMatch[1].trim();
          }
        }
        
        // Strategy 2c: Check error.rawStdout if available (for debugging)
        if (error?.rawStdout && actualError === 'Z3 solver reported an error.') {
          try {
            const parsed = JSON.parse(error.rawStdout);
            if (parsed.error && parsed.error !== 'Z3 solver reported an error.') {
              actualError = parsed.error;
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
        
        // Strategy 3: Check error.details (set by z3Solver.js)
        if (error?.details && actualError === error?.message) {
          actualError = error.details;
        }
        
        // Strategy 4: Check error.cause (for nested errors)
        if (error?.cause) {
          const causeError = error.cause?.message || error.cause;
          if (causeError && causeError !== 'Z3 solver reported an error.') {
            actualError = causeError;
          }
        }
        
        // Strategy 3: Parse IPC error messages - extract the actual Python error
        if (error?.message?.includes('Error invoking remote method')) {
          // Try multiple patterns to extract the actual error message
          const patterns = [
            // Pattern 1: Extract after 'run-solver': Error: (most common)
            /'run-solver': Error: ([^\n]+?)(?:\n|$|File:)/,
            // Pattern 2: Extract after second "Error: " (nested errors) - must be global for matchAll
            /Error: ([^\n]+?)(?:\n|$|File:)/g,
            // Pattern 3: Extract Z3-specific errors
            /(Z3 [^\n]+?)(?:\n|$|File:)/,
            // Pattern 4: Extract common Python error messages
            /(could not [^\n]+?)(?:\n|$|File:)/i,
          ];
          
          for (const pattern of patterns) {
            // matchAll requires global regex, so use match for non-global patterns
            if (pattern.global) {
              const matches = error.message.matchAll(pattern);
              for (const match of matches) {
                if (match[1] && match[1].trim() && match[1].trim() !== 'Z3 solver reported an error.') {
                  const extracted = match[1].trim();
                  if (!extracted.includes('Error invoking remote method') && extracted.length > 10) {
                    actualError = extracted;
                    break;
                  }
                }
              }
            } else {
              const match = error.message.match(pattern);
              if (match && match[1] && match[1].trim() && match[1].trim() !== 'Z3 solver reported an error.') {
                const extracted = match[1].trim();
                if (!extracted.includes('Error invoking remote method') && extracted.length > 10) {
                  actualError = extracted;
                }
              }
            }
            if (actualError !== error?.message && !actualError.includes('Error invoking remote method')) {
              break;
            }
          }
          
          // Fallback: Try splitting by "Error: " and taking the last meaningful part
          if (actualError === error?.message || actualError.includes('Error invoking remote method')) {
            const errorParts = error.message.split('Error: ');
            if (errorParts.length >= 2) {
              // Get the last part and clean it up
              let extracted = errorParts[errorParts.length - 1].trim();
              // Remove file paths, line numbers, and stack traces
              extracted = extracted
                .split('\n')[0]  // First line only
                .split('File:')[0]  // Remove file paths
                .split('at ')[0]  // Remove stack trace markers
                .split('Traceback')[0]  // Remove traceback markers
                .trim();
              
              if (extracted && 
                  extracted !== 'Z3 solver reported an error.' && 
                  !extracted.includes('Error invoking remote method') &&
                  extracted.length > 10) {
                actualError = extracted;
              }
            }
          }
        }
        
        // Strategy 4: Check if error.message contains more specific information
        if (error?.message && error.message !== 'Z3 solver reported an error.') {
          // If the message is more specific than the generic one, use it
          if (!error.message.includes('Error invoking remote method') || 
              error.message.length > 50) {
            actualError = error.message;
          }
        }
        
        // Log detailed extraction info
        const extractedFrom = {
          stderr: !!error?.stderr,
          originalError: !!error?.originalError,
          details: !!error?.details,
          message: !!error?.message,
          messageContainsStderr: error?.message?.includes('[stderr:'),
          messageContainsDetails: error?.message?.includes('[details:'),
          messageContainsOriginalError: error?.message?.includes('[originalError:'),
          messageContainsFromStdout: error?.message?.includes('[from stdout]'),
          messageLength: error?.message?.length || 0,
          fullMessage: error?.message, // Log the full message to see what we're working with
          // Try to extract embedded info from message
          extractedStderr: error?.message?.match(/\[stderr: (.+?)\]/)?.[1],
          extractedOriginalError: error?.message?.match(/\[originalError: (.+?)\]/)?.[1],
          extractedDetails: error?.message?.match(/\[details: (.+?)\]/)?.[1],
          extractedFromStdout: error?.message?.match(/(.+?)\s*\[from stdout\]/)?.[1]
        };
        
        // If we found embedded error info, use it
        if (extractedFrom.extractedFromStdout && extractedFrom.extractedFromStdout !== 'Z3 solver reported an error.') {
          actualError = extractedFrom.extractedFromStdout;
        } else if (extractedFrom.extractedOriginalError && extractedFrom.extractedOriginalError !== 'Z3 solver reported an error.') {
          actualError = extractedFrom.extractedOriginalError;
        } else if (extractedFrom.extractedStderr && extractedFrom.extractedStderr !== 'Z3 solver reported an error.') {
          actualError = extractedFrom.extractedStderr;
        } else if (extractedFrom.extractedDetails && extractedFrom.extractedDetails !== 'Z3 solver reported an error.') {
          actualError = extractedFrom.extractedDetails;
        }
        
        console.error('[ViewerPage] Z3 solver error', {
          errorMessage: error?.message,
          actualError,
          extractedFrom,
          // Show the full error message prominently
          FULL_ERROR_MESSAGE: error?.message,
          errorStack: error?.stack,
          errorName: error?.name,
          errorDetails: error?.details,
          errorCause: error?.cause,
          errorStderr: error?.stderr,
          errorOriginalError: error?.originalError,
          payloadTerm: payload.term ? {
            hasDailySlots: !!payload.term.dailySlots,
            dailySlotsCount: payload.term.dailySlots?.length || 0,
            dailySlots: payload.term.dailySlots,
            hasDays: !!payload.term.days,
            daysCount: payload.term.days?.length || 0
          } : null,
          payloadConstraints: payload.constraints ? JSON.stringify(payload.constraints) : null,
          constraintWindow: payload.constraints ? {
            earliest: payload.constraints.classEarliestStartMinutes,
            latest: payload.constraints.classLatestStartMinutes,
            note: slotsToUse.length > 0 ? 'Class start time constraints removed - using time slots instead' : 'Using class start time constraints'
          } : null,
          hasTimeSlots: !!payload.timeSlots,
          timeSlotsCount: payload.timeSlots?.length || 0
        });
        
        // Provide user-friendly error messages based on the actual error
        let userMessage = actualError;
        if (actualError.includes('Daily slot end time must be after start time')) {
          userMessage = 'Ogiltig tidslucka: Sluttid måste vara efter starttid. Kontrollera starttider i Variabler-sidan.';
        } else if (actualError.includes('Term requires at least one valid daily slot')) {
          userMessage = 'Inga giltiga tidsluckor. Kontrollera att starttider är korrekt angivna i Variabler-sidan.';
        } else if (actualError.includes('Term configuration did not produce any teaching time slots')) {
          userMessage = 'Termkonfigurationen producerade inga tidsluckor. Kontrollera terminställningar och starttider.';
        } else if (actualError.includes('No available time slots')) {
          userMessage = 'Inga tillgängliga tidsluckor. Kontrollera starttider och begränsningar.';
        } else if (actualError.includes('Z3 could not find a feasible schedule') || 
                   actualError.includes('Z3 could not satisfy the provided lesson templates')) {
          // This means the constraints are too restrictive or there aren't enough time slots
          const suggestions = [
            'Minska antalet lektioner per vecka',
            'Öka tidsluckorna (starttid-sluttid)',
            'Slappa på begränsningarna (max inaktiv tid, max lektioner per dag)',
            'Kontrollera att alla lektioner har tillräckligt med tid att schemaläggas'
          ];
          userMessage = `Z3 kunde inte hitta ett möjligt schema med de nuvarande begränsningarna. Försök: ${suggestions.join(', ')}.`;
        } else if (actualError.includes('classLatestStartMinutes must be greater than or equal to')) {
          userMessage = 'Ogiltiga begränsningar: Senaste starttid måste vara efter tidigaste starttid. Kontrollera klassbegränsningar.';
        } else if (actualError.includes('Z3 solver reported an error') || actualError === 'Z3 solver reported an error.') {
          // Generic error - log more details and provide helpful context
          console.warn('[ViewerPage] Generic solver error - unable to extract specific error message', {
            fullError: error,
            payloadSummary: {
              hasTerm: !!payload.term,
              hasConstraints: !!payload.constraints,
              hasLessonTemplates: !!payload.lessonTemplates,
              lessonTemplatesCount: payload.lessonTemplates?.length || 0
            }
          });
          userMessage = 'Z3-solverfel: Kunde inte skapa schema. Kontrollera att starttider, begränsningar och lektionsmallar är korrekt konfigurerade. Se konsolen för mer information.';
        }
        
        solverError.value = userMessage;
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

  const showOptionsPanel = ref(false);
  const optionsContainerRef = ref(null);
  
  // Close dropdown when clicking outside
  const handleClickOutside = (event) => {
    if (optionsContainerRef.value && !optionsContainerRef.value.contains(event.target)) {
      showOptionsPanel.value = false;
    }
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

    // Save schedule to JSON file with comprehensive data
    const saveScheduleToFile = async () => {
      if (!props.presetId) {
        console.log('[ViewerPage] Cannot save schedule - no presetId');
        return;
      }

      try {
        console.log('[ViewerPage] Saving schedule to file', { presetId: props.presetId });
        
        // Try to preserve existing blocks - use originalBlocks if available, otherwise try loading from file
        let blocksToSave = [];
        if (originalBlocks.value && originalBlocks.value.length > 0) {
          blocksToSave = JSON.parse(JSON.stringify(originalBlocks.value));
        } else {
          try {
            if (window.api && window.api.readSchedule) {
              const existingSchedule = await window.api.readSchedule(props.presetId);
              if (existingSchedule && Array.isArray(existingSchedule.blocks) && existingSchedule.blocks.length > 0) {
                blocksToSave = existingSchedule.blocks;
              }
            }
          } catch (e) {
            console.log('[ViewerPage] Could not load existing blocks, will save without preserving them', e);
          }
        }
        
        // Collect all schedule data
        const scheduleData = {
          id: props.presetId,
          name: props.presetId.includes('schema-') ? 'Schedule' : (props.presetId.includes('schoolsoft-') ? 'Imported SchoolSoft Schedule' : 'Untitled Schedule'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          
          // Core entities
          classes: [...classes.value],
          teachers: [...teachers.value],
          classrooms: [...classrooms.value],
          subjects: [...subjects.value],
          
          // Time configuration
          timeSlots: [...timeSlots.value],
          term: termConfig.value ? JSON.parse(JSON.stringify(termConfig.value)) : null,
          
          // Lesson configuration
          lessonTemplates: [...lessonTemplates.value],
          
          // Generated schedule and solver results
          generatedSchedule: generatedSchedule.value ? JSON.parse(JSON.stringify(generatedSchedule.value)) : null,
          solverAssignments: [...solverAssignments.value],
          
          // Constraints and options
          customConstraints: customConstraints.value ? JSON.parse(JSON.stringify(customConstraints.value)) : null,
          solverOptions: JSON.parse(JSON.stringify(solverOptions)),
          
          // Blocks (preserve original blocks from imports, or leave empty for solver-generated schedules)
          // Blocks are primarily for SchoolSoft imports - solver-generated schedules use generatedSchedule instead
          blocks: blocksToSave,
          
          // UI state (optional, for restoration)
          isCreatorMode: isCreatorMode.value,
          buildSuccess: buildSuccess.value,
          selectedClassFilter: selectedClassFilter.value,
          selectedDayKey: selectedDayKey.value
        };

        // Save via IPC
        if (window.api && window.api.saveSchedule) {
          const result = await window.api.saveSchedule(scheduleData);
          if (result && result.success) {
            console.log('[ViewerPage] Schedule saved successfully', { presetId: props.presetId });
            logInfo('SAVE_SCHEDULE_TO_FILE_SUCCESS', {
              presetId: props.presetId,
              hasClasses: classes.value.length > 0,
              hasTeachers: teachers.value.length > 0,
              hasGeneratedSchedule: !!generatedSchedule.value,
              hasTimeSlots: timeSlots.value.length > 0
            });
          } else {
            console.error('[ViewerPage] Failed to save schedule', result);
            logError('SAVE_SCHEDULE_TO_FILE_FAILED', new Error(result?.error || 'Unknown error'), {
              presetId: props.presetId
            });
          }
        } else {
          console.error('[ViewerPage] saveSchedule API not available');
          logError('SAVE_SCHEDULE_TO_FILE_API_UNAVAILABLE', new Error('saveSchedule API not available'), {
            presetId: props.presetId
          });
        }
      } catch (error) {
        console.error('[ViewerPage] Error saving schedule to file', error);
        logError('SAVE_SCHEDULE_TO_FILE_ERROR', error, {
          presetId: props.presetId,
          category: 'FILE_SAVE'
        });
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
    const loadSchedule = async (id) => {
      if (!id) return;
      
      try {
        logInfo('LOAD_SCHEDULE_START', { presetId: id });
        const scheduleData = await window.api.readSchedule(id);
        
        if (scheduleData) {
          logInfo('LOAD_SCHEDULE_SUCCESS', { presetId: id });
          applyInitialData(scheduleData);
          // Ensure we switch to creator mode to show the data form
          isCreatorMode.value = true;
        } else {
          logError('LOAD_SCHEDULE_EMPTY', null, { presetId: id });
        }
      } catch (error) {
        logError('LOAD_SCHEDULE_ERROR', error, { presetId: id });
      }
    };

    watch(
      () => props.presetId,
      (newId) => {
        if (newId && !props.initialData && !isRestoringState.value) {
           loadSchedule(newId);
        }
      }
    );

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
        // But first, request time slots from App.vue (they might be more recent from ConstraintsPage)
        // We'll restore from saved state only if we don't have any time slots yet
        // The request-time-slots event will be handled by App.vue and will dispatch time-slots-updated-viewer
        // which will update timeSlots.value via handleTimeSlotsUpdate
        // So we only restore from saved state if we still don't have time slots after the request
        if (saved.timeSlots && timeSlots.value.length === 0) {
          // Use a small delay to allow App.vue to respond to request-time-slots first
          setTimeout(() => {
            // Only restore from saved state if we still don't have time slots
            // (App.vue might have sent newer ones via time-slots-updated-viewer)
            if (timeSlots.value.length === 0) {
              timeSlots.value = [...saved.timeSlots];
              logStateRestore('RESTORE_TIME_SLOTS_FROM_SAVED', {
                timeSlotsCount: timeSlots.value.length,
                presetId: saved.presetId
              });
            } else {
              logStateRestore('SKIP_RESTORE_TIME_SLOTS_HAVE_GLOBAL', {
                savedCount: saved.timeSlots.length,
                currentCount: timeSlots.value.length,
                presetId: saved.presetId
              });
            }
          }, 50);
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
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('constraints-updated', handleConstraintsUpdate);
      window.addEventListener('constraints-updated-viewer', handleConstraintsUpdateFromApp);
      window.addEventListener('time-slots-updated-viewer', handleTimeSlotsUpdate);
      
      // Request stored time slots from App.vue first (they might be more recent from ConstraintsPage)
      // This should happen before restoreState so that restoreState can check if we have global time slots
      console.log('[ViewerPage] Requesting stored time slots from App', {
        presetId: props.presetId,
        hasLocalTimeSlots: timeSlots.value.length > 0
      });
      
      // Dispatch event to request time slots from App.vue
      window.dispatchEvent(new CustomEvent('request-time-slots', {
        detail: { presetId: props.presetId }
      }));
      
      // Restore saved state if available (after requesting time slots)
      // restoreState will check if we have time slots and only restore from saved state if we don't
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

      // Load schedule if presetId is provided and we don't have initialData or savedState
      // This ensures that when navigating from SchoolSoft import, we actually load the data
      if (props.presetId && !props.initialData && (!props.savedState || props.savedState.presetId !== props.presetId)) {
        loadSchedule(props.presetId);
      }
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
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
      showOptionsPanel,
      optionsContainerRef,
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
      switchToCreatorMode,
      switchToViewerMode,
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
      saveScheduleToFile,
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
  background: rgba(255, 255, 255, 0.95);
  padding: 3vh;
  border-radius: 1.5vh;
  box-shadow: 0 0.2vh 1vh rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
}

.creator-title {
  font-size: 6vh;
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
  background: rgba(255, 255, 255, 0.9);
  padding: 2vh;
  border-radius: 1vh;
  box-shadow: 0 0.1vh 0.5vh rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 2;
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

.options-container {
  position: relative;
  margin: 1.5vh 0;
  display: flex;
  justify-content: center;
}

.options-btn {
  padding: 1vh 2vh;
  border: 0.15vh solid #667eea;
  border-radius: 0.5vh;
  background: #667eea;
  color: white;
  font-size: 1.5vh;
  cursor: pointer;
  transition: background 0.2s ease;
}

.options-btn:hover {
  background: #5568d3;
}

.options-dropdown {
  position: absolute;
  top: calc(100% + 0.5vh);
  left: 50%;
  transform: translateX(-50%);
  min-width: 25vh;
  padding: 1.5vh;
  background: white;
  border: 0.15vh solid #e2e8f0;
  border-radius: 0.5vh;
  box-shadow: 0 0.2vh 0.8vh rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 1vh;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.8vh;
  font-size: 1.4vh;
  color: #2d3748;
}

.option-item input[type='checkbox'] {
  cursor: pointer;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 0.8vh;
  width: 100%;
}

.option-input {
  width: 5vh;
  padding: 0.4vh;
  border: 0.1vh solid #cbd5e0;
  border-radius: 0.3vh;
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
  color: #d97706;
}

.load-file-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.load-file-btn:hover {
  box-shadow: 0 1.2vh 2.4vh rgba(16, 185, 129, 0.3), 0 0.6vh 1.2vh rgba(16, 185, 129, 0.2);
}

.load-file-btn .btn-icon {
  font-size: 3.5vh;
}

.load-file-btn:hover .btn-title {
  color: #047857;
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
  background: rgba(255, 255, 255, 0.95);
  border: 0.1vh solid #e2e8f0;
  border-radius: 1vh;
  padding: 2vh;
  box-shadow: 0 0.2vh 0.8vh rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
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
  padding: 2.5vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vh;
  position: relative;
  z-index: 2;
}

.build-btn {
  padding: 1.8vh 3.5vh;
  border: none;
  border-radius: 1vh;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  color: white;
  font-size: 1.7vh;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.8vh;
  box-shadow: 0 0.3vh 1.2vh rgba(102, 126, 234, 0.3);
  animation: gradientMove 3s ease infinite;
  position: relative;
  overflow: hidden;
}

@keyframes gradientMove {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.build-btn:hover:not(:disabled) {
  transform: translateY(-0.2vh);
  box-shadow: 0 0.5vh 1.8vh rgba(102, 126, 234, 0.4);
  animation-duration: 2s;
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
  background: rgba(255, 255, 255, 0.95);
  border: 0.1vh solid #e2e8f0;
  border-radius: 1vh;
  padding: 2vh;
  box-shadow: 0 0.2vh 0.8vh rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
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
