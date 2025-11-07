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
      </div>
    </div>
    <div class="viewer-layout">
      <Sidebar :initial-preset-id="presetId" v-if="!isCreatorMode" />
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
            </div>

            <div class="divider">
              <span class="divider-text">OR</span>
            </div>

            <!-- Manual Entry Categories -->
            <div class="categories-section">
              <div class="section-title-row">
                <h3 class="section-title">Manual Entry</h3>
                <button class="mock-fill-btn" @click="loadMockManualData">Load Mock Data</button>
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

              <!-- Time Slots Category -->
              <div class="category-card">
                <div class="category-header">
                  <h4 class="category-title">Time Slots</h4>
                  <button class="add-item-btn" @click="addTimeSlot">+ Add Time Slot</button>
                </div>
                <div class="items-list">
                  <div v-for="(slot, index) in timeSlots" :key="index" class="item-row">
                    <select
                      v-model="slot.day"
                      class="item-input day-select"
                    >
                      <option v-for="day in daysOfWeek" :key="day" :value="day">{{ day }}</option>
                    </select>
                    <input 
                      v-model="slot.start" 
                      type="text" 
                      placeholder="Start time (e.g., 08:00)"
                      class="item-input time-input"
                    />
                    <span class="time-separator">-</span>
                    <input 
                      v-model="slot.end" 
                      type="text" 
                      placeholder="End time (e.g., 09:00)"
                      class="item-input time-input"
                    />
                    <button class="remove-btn" @click="removeTimeSlot(index)">×</button>
                  </div>
                  <div v-if="timeSlots.length === 0" class="empty-state">
                    No time slots added yet
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
              <div v-if="solverAssignments.length" class="solver-assignments">
                <h4 class="solver-title">Generated Assignments</h4>
                <ul class="solver-list">
                  <li v-for="(assignment, index) in solverAssignments" :key="index" class="solver-item">
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
        <div v-else>
          <SimpleSchedule @change="onScheduleChange" :external-schedule="generatedSchedule" />
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
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';
import ChatWindow from './ChatWindow.vue';
import Sidebar from './Sidebar.vue';
import schoolsoftIcon from '../assets/icons/unnamed.webp';
import skola24Icon from '../assets/icons/skola.png';

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
  },
  setup(props) {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});
    const isChatOpen = ref(false);
    const isCreatorMode = ref(true);
    const classes = ref([]);
    const teachers = ref([]);
    const classrooms = ref([]);
    const timeSlots = ref([]);
    const subjects = ref([]);
    const generatedSchedule = ref(null);
    const solverAssignments = ref([]);
    const solverError = ref(null);
    const isBuilding = ref(false);
    const buildSuccess = ref(false);
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

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
              if (daysOfWeek.includes(trimmed) || isoDateRegex.test(trimmed)) {
                return trimmed;
              }
              return daysOfWeek[0];
            })(),
            start: (slot?.start || '').trim(),
            end: (slot?.end || '').trim(),
          }))
          .filter((slot) => slot.start && slot.end);
      };

      classes.value = sanitizeEntities(data.classes);
      teachers.value = sanitizeEntities(data.teachers);
      classrooms.value = sanitizeEntities(data.classrooms);
      subjects.value = sanitizeEntities(data.subjects);
      timeSlots.value = sanitizeTimeSlots(data.timeSlots);

      isCreatorMode.value = true;
      resetSolverState();
    };

    const normalizeScheduleResult = (scheduleByDay = {}) => {
      const normalized = {};
      const processedDays = new Set();
      const fallbackBase = Date.now();

      Object.keys(scheduleByDay || {}).forEach((dayKey) => {
        const entries = Array.isArray(scheduleByDay[dayKey]) ? scheduleByDay[dayKey] : [];
        normalized[dayKey] = entries.map((entry, index) => ({
          id: typeof entry?.id === 'number' ? entry.id : fallbackBase + index,
          name: entry?.name || '',
          startMinutes: typeof entry?.startMinutes === 'number' ? entry.startMinutes : 8 * 60,
          duration: typeof entry?.duration === 'number' ? entry.duration : 60,
          colorIndex: entry?.colorIndex,
        }));
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

    const isBuildReady = computed(() => {
      return (
        classes.value.length > 0 &&
        teachers.value.length > 0 &&
        classrooms.value.length > 0 &&
        subjects.value.length > 0 &&
        timeSlots.value.length > 0
      );
    });

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'creator' } }));
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
    };

    const removeSubject = (index) => {
      subjects.value.splice(index, 1);
    };

    const createSchedule = async () => {
      if (!title.value || !description.value) return;

      const res = await window.api.createSchedule({
        title: title.value,
        description: description.value,
        schedule: schedule.value,
      });

      console.log(res);

      title.value = '';
      description.value = '';
      schedule.value = {};
    };

    const onScheduleChange = (payload) => {
      schedule.value = payload;
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

      isBuilding.value = true;

      const payload = {
        classes: mapEntities(classes.value),
        teachers: mapEntities(teachers.value),
        classrooms: mapEntities(classrooms.value),
        subjects: mapEntities(subjects.value),
        timeSlots: mapTimeSlots(timeSlots.value),
      };

      try {
        const response = await window.api.runScheduleSolver(payload);
        generatedSchedule.value = normalizeScheduleResult(response?.scheduleByDay || {});
        solverAssignments.value = Array.isArray(response?.assignments) ? response.assignments : [];
        buildSuccess.value = true;
        isCreatorMode.value = false;
      } catch (error) {
        solverError.value = error?.message || 'Failed to build schedule with Z3 solver.';
      } finally {
        isBuilding.value = false;
      }
    };

    const padNumber = (value) => value.toString().padStart(2, '0');

    const minutesToClock = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${padNumber(hours)}:${padNumber(mins)}`;
    };

    const generateSixMonthSchedule = () => {
      const scheduleByDay = {};
      const assignmentsList = [];

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekday = (startDate.getDay() + 6) % 7; // 0 = Monday
      startDate.setDate(startDate.getDate() - weekday);

      const sixMonthsLater = new Date(startDate);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      const templates = [
        { dayOffset: 0, subject: 'Mathematics', className: 'Class A', teacher: 'Alice Andersson', classroom: 'Room 101', startMinutes: 8 * 60, duration: 60 },
        { dayOffset: 0, subject: 'English', className: 'Class B', teacher: 'Björn Berg', classroom: 'Room 202', startMinutes: 9 * 60 + 15, duration: 60 },
        { dayOffset: 1, subject: 'Physics', className: 'Class C', teacher: 'Carin Carlsson', classroom: 'Lab 3', startMinutes: 8 * 60, duration: 60 },
        { dayOffset: 2, subject: 'Biology', className: 'Class A', teacher: 'Dan Danielsson', classroom: 'Lab 3', startMinutes: 10 * 60, duration: 60 },
        { dayOffset: 3, subject: 'Swedish', className: 'Class B', teacher: 'Alice Andersson', classroom: 'Room 101', startMinutes: 8 * 60 + 30, duration: 60 },
        { dayOffset: 4, subject: 'History', className: 'Class C', teacher: 'Björn Berg', classroom: 'Room 202', startMinutes: 9 * 60, duration: 60 },
      ];

      let eventCounter = 0;

      for (let week = 0; week < 26; week += 1) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + week * 7);

        for (const template of templates) {
          const eventDate = new Date(weekStart);
          eventDate.setDate(eventDate.getDate() + template.dayOffset);

          if (eventDate >= sixMonthsLater) {
            continue;
          }

          const dayKey = eventDate.toISOString().slice(0, 10);

          if (!scheduleByDay[dayKey]) {
            scheduleByDay[dayKey] = [];
          }

          const eventId = eventDate.getTime() + eventCounter;
          const startMinutes = template.startMinutes;
          const duration = template.duration;

          scheduleByDay[dayKey].push({
            id: eventId,
            name: `${template.subject} (${template.className})`,
            startMinutes,
            duration,
            colorIndex: template.dayOffset % 5,
          });

          assignmentsList.push({
            subject: template.subject,
            class: template.className,
            teacher: template.teacher,
            classroom: template.classroom,
            timeSlot: {
              day: dayKey,
              start: minutesToClock(startMinutes),
              end: minutesToClock(startMinutes + duration),
            },
          });

          eventCounter += 1;
        }
      }

      Object.keys(scheduleByDay).forEach((dayKey) => {
        scheduleByDay[dayKey].sort((a, b) => a.startMinutes - b.startMinutes);
      });

      return { scheduleByDay, assignments: assignmentsList };
    };

    const loadMockManualData = () => {
      const mockPayload = {
        classes: [
          { name: 'Class A' },
          { name: 'Class B' },
          { name: 'Class C' },
        ],
        teachers: [
          { name: 'Alice Andersson' },
          { name: 'Björn Berg' },
          { name: 'Carin Carlsson' },
          { name: 'Dan Danielsson' },
        ],
        classrooms: [
          { name: 'Room 101' },
          { name: 'Room 202' },
          { name: 'Lab 3' },
        ],
        subjects: [
          { name: 'Mathematics' },
          { name: 'Physics' },
          { name: 'Biology' },
          { name: 'Swedish' },
          { name: 'English' },
          { name: 'History' },
        ],
        timeSlots: [
          { day: 'Monday', start: '08:00', end: '09:00' },
          { day: 'Monday', start: '09:15', end: '10:15' },
          { day: 'Tuesday', start: '08:30', end: '09:30' },
          { day: 'Wednesday', start: '10:00', end: '11:00' },
          { day: 'Thursday', start: '08:30', end: '09:30' },
          { day: 'Friday', start: '09:00', end: '10:00' },
        ],
      };

      applyInitialData(mockPayload);

      const { scheduleByDay, assignments } = generateSixMonthSchedule();
      generatedSchedule.value = normalizeScheduleResult(scheduleByDay);
      solverAssignments.value = assignments;
      solverError.value = null;
      buildSuccess.value = true;
      isCreatorMode.value = false;
      isBuilding.value = false;
      schedule.value = generatedSchedule.value;
    };

    watch(
      () => props.initialData,
      (value) => {
        applyInitialData(value);
      },
      { immediate: true, deep: true }
    );

    return {
      title,
      description,
      goToHome,
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
      solverAssignments,
      solverError,
      isBuilding,
      buildSuccess,
      isBuildReady,
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
      schoolsoftIcon,
      skola24Icon,
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
</style>
