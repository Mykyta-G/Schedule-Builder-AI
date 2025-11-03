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
              <h3 class="section-title">Manual Entry</h3>
              
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
              <button class="build-btn" @click="buildSchedule" :disabled="!canBuildSchedule">
                <span class="build-icon">⚙️</span>
                <span>Build Schedule</span>
              </button>
              <p class="build-hint" v-if="!canBuildSchedule">
                Add at least one item in each category to build schedule
              </p>
            </div>
          </div>
        </div>

        <!-- Viewer Mode: Schedule Visualization -->
        <div v-else>
          <SimpleSchedule @change="onScheduleChange" />
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
import { defineComponent, ref, computed } from 'vue';
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
  },
  setup(props) {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});
    const isChatOpen = ref(false);
    const isCreatorMode = ref(true); // Default to creator mode
    const classes = ref([]);
    const teachers = ref([]);
    const classrooms = ref([]);
    const timeSlots = ref([]);
    const subjects = ref([]);

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'creator' } }));
    };

    const toggleChat = () => {
      isChatOpen.value = !isChatOpen.value;
    };

    const importFromSchoolsoft = () => {
      // TODO: Implement Schoolsoft import
      console.log('Import from Schoolsoft clicked');
    };

    const importFromSkola24 = () => {
      // TODO: Implement Skola24 import
      console.log('Import from Skola24 clicked');
    };

    // Add functions
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
      timeSlots.value.push({ start: '', end: '' });
    };

    const addSubject = () => {
      subjects.value.push({ name: '' });
    };

    // Remove functions
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

    // Check if we can build schedule
    const canBuildSchedule = computed(() => {
      return classes.value.length > 0 &&
             teachers.value.length > 0 &&
             classrooms.value.length > 0 &&
             timeSlots.value.length > 0 &&
             subjects.value.length > 0;
    });

    // Build schedule function
    const buildSchedule = async () => {
      const scheduleData = {
        classes: classes.value.filter(c => c.name.trim()),
        teachers: teachers.value.filter(t => t.name.trim()),
        classrooms: classrooms.value.filter(c => c.name.trim()),
        timeSlots: timeSlots.value.filter(s => s.start.trim() && s.end.trim()),
        subjects: subjects.value.filter(s => s.name.trim()),
      };

      console.log('Building schedule with data:', scheduleData);

      // TODO: Call Python script to build schedule
      if (window.api && window.api.buildSchedule) {
        try {
          const result = await window.api.buildSchedule(scheduleData);
          console.log('Schedule built:', result);
          // Switch to viewer mode to show the schedule
          isCreatorMode.value = false;
        } catch (error) {
          console.error('Error building schedule:', error);
        }
      } else {
        console.log('buildSchedule API not available yet');
      }
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
      canBuildSchedule,
      buildSchedule,
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
