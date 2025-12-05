<template>
  <div class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <h2 class="sidebar-title">Verktyg</h2>
      <div class="role-selector">
        <select v-model="userRole" @change="onRoleChange" class="role-select">
          <option value="student">Elev</option>
          <option value="principal">Rektor</option>
        </select>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'students' }"
        @click="activeTab = 'students'"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Elever</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'teachers' }"
        @click="activeTab = 'teachers'"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Lärare</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'calendar' }"
        @click="activeTab = 'calendar'"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>Kalender</span>
      </button>
    </div>

    <!-- Students Tab -->
    <div v-if="activeTab === 'students'" class="tab-content">
      <!-- Select Student -->
      <div class="select-section">
        <select v-model="selectedStudentId" @change="onStudentSelect" class="select-dropdown">
          <option value="">Välj elev...</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.firstName }} {{ student.lastName }} - {{ student.programId || 'Inget' }} År {{ student.currentYear }}
          </option>
        </select>
      </div>

      <!-- Add Student Button -->
      <button class="add-btn" @click="showAddStudentModal = true">
        + Lägg till elev
      </button>

      <!-- Students List -->
      <div class="students-list">
        <div
          v-for="student in filteredStudents"
          :key="student.id"
          class="student-card"
          :class="{ active: selectedStudent?.id === student.id }"
          @click="selectStudent(student)"
        >
          <div class="student-info">
            <div class="student-name">{{ student.firstName }} {{ student.lastName }}</div>
            <div class="student-meta">
              <span class="program-badge" :class="getProgramTypeClass(student.programId)">
                {{ student.programId || 'Inget program' }}
              </span>
              <span class="year-badge">År {{ student.currentYear || 1 }}</span>
            </div>
          </div>
          <div class="student-stats">
            <div class="stat">
              <span class="stat-value">{{ student.passingCredits || 0 }}/2250</span>
              <span class="stat-label">Poäng</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ student.meritRating || 0 }}</span>
              <span class="stat-label">Meritvärde</span>
            </div>
          </div>
        </div>
        <div v-if="filteredStudents.length === 0" class="empty-state">
          Inga elever hittades
        </div>
      </div>

      <!-- Student Detail Panel (when selected) -->
      <div v-if="selectedStudent" class="detail-panel">
        <div class="detail-header">
          <h3>{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</h3>
          <button class="close-btn" @click="selectedStudent = null">×</button>
        </div>
        
        <div class="detail-content">
          <!-- Program Info -->
          <div class="info-section">
            <label>Program:</label>
            <span>{{ selectedStudent.programName || 'Inget program' }}</span>
          </div>
          
          <!-- Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ selectedStudent.passingCredits || 0 }}/2250</div>
              <div class="stat-label">Godkända poäng</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedStudent.gradeAverage || 0 }}</div>
              <div class="stat-label">Snitt (jämförelsetal)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedStudent.meritPoints || 0 }}</div>
              <div class="stat-label">Meritpoäng</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ selectedStudent.meritRating || 0 }}</div>
              <div class="stat-label">Meritvärde</div>
            </div>
          </div>
          
          <!-- Enrollments -->
          <div class="enrollments-section">
            <div class="section-header">
              <h4>Kurser</h4>
              <button class="small-btn" @click="showAddCourseModal = true">+ Lägg till</button>
            </div>
            <div v-if="selectedStudent.enrollments && selectedStudent.enrollments.length > 0" class="enrollments-list">
              <div
                v-for="enrollment in selectedStudent.enrollments"
                :key="enrollment.id"
                class="enrollment-card"
              >
                <div class="enrollment-info">
                  <div class="course-name">{{ enrollment.courseName }}</div>
                  <div class="course-meta">
                    <span>{{ enrollment.credits }}p</span>
                    <span v-if="enrollment.semester && enrollment.year">
                      {{ enrollment.semester }} {{ enrollment.year }}
                    </span>
                  </div>
                </div>
                <div class="enrollment-grade">
                  <span 
                    v-if="enrollment.grade" 
                    class="grade-badge"
                    :class="getGradeClass(enrollment.grade)"
                  >
                    {{ enrollment.grade }}
                  </span>
                  <span v-else class="status-badge">{{ enrollment.status }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">Inga kurser tillagda</div>
          </div>
          
          <!-- Actions -->
          <div class="detail-actions">
            <button class="btn-secondary" @click="editStudent(selectedStudent)">Redigera</button>
            <button class="btn-danger" @click="confirmDeleteStudent(selectedStudent)">Ta bort</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Teachers Tab -->
    <div v-if="activeTab === 'teachers'" class="tab-content">
      <!-- Select Teacher -->
      <div class="select-section">
        <select v-model="selectedTeacherId" @change="onTeacherSelect" class="select-dropdown">
          <option value="">Välj lärare...</option>
          <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
            {{ teacher.firstName }} {{ teacher.lastName }}
          </option>
        </select>
      </div>

      <!-- Add Teacher Button -->
      <button class="add-btn" @click="showAddTeacherModal = true">
        + Lägg till lärare
      </button>

      <!-- Teachers List -->
      <div class="teachers-list">
        <div
          v-for="teacher in filteredTeachers"
          :key="teacher.id"
          class="teacher-card"
          :class="{ active: selectedTeacher?.id === teacher.id }"
          @click="selectTeacher(teacher)"
        >
          <div class="teacher-info">
            <div class="teacher-name">{{ teacher.firstName }} {{ teacher.lastName }}</div>
            <div class="teacher-subjects">
              {{ formatSubjects(teacher.subjectNames) }}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div v-if="filteredTeachers.length === 0" class="empty-state">
          Inga lärare hittades
        </div>
      </div>

      <!-- Teacher Detail Panel -->
      <div v-if="selectedTeacher" class="detail-panel">
        <div class="detail-header">
          <h3>{{ selectedTeacher.firstName }} {{ selectedTeacher.lastName }}</h3>
          <button class="close-btn" @click="selectedTeacher = null">×</button>
        </div>
        
        <div class="detail-content">
          <!-- Subject Info -->
          <div class="info-section">
            <label>Ämnen:</label>
            <div class="subject-tags">
              <span v-for="(subject, index) in selectedTeacher.subjectNames" :key="index" class="subject-tag">
                {{ subject }}
              </span>
            </div>
          </div>
          
          <!-- Schedule/Courses -->
          <div class="schedule-section">
            <h4>Schema</h4>
            <div v-if="teacherSchedule.length > 0" class="course-list">
              <div v-for="course in teacherSchedule" :key="course.courseCode" class="course-item">
                <div class="course-info">
                  <div class="course-name">{{ course.courseName }}</div>
                  <div class="course-students">{{ course.students.length }} elever</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">Ingen schema data tillgänglig</div>
          </div>
          
          <!-- Actions -->
          <div class="detail-actions">
            <button class="btn-secondary" @click="editTeacher(selectedTeacher)">Redigera</button>
            <button class="btn-danger" @click="confirmDeleteTeacher(selectedTeacher)">Ta bort</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Tab -->
    <div v-if="activeTab === 'calendar'" class="tab-content">
      <div class="calendar-section">
        <div class="calendar">
          <div class="calendar-header">
            <button class="calendar-nav-btn" @click="goToPreviousMonth">‹</button>
            <div class="calendar-month">
              <input
                type="month"
                :value="currentMonthValue"
                @input="onMonthPickerChange"
                class="calendar-month-picker"
              />
              <span>{{ currentMonthName }} {{ currentYear }}</span>
            </div>
            <button class="calendar-nav-btn" @click="goToNextMonth">›</button>
          </div>
          <div class="calendar-weekdays">
            <div v-for="day in weekdays" :key="day" class="calendar-weekday">
              {{ day }}
            </div>
          </div>
          <div class="calendar-days">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              class="calendar-day"
              :class="{
                'other-month': day.otherMonth,
                'today': day.isToday,
                'selected': day.isSelected,
                'has-schedule': day.hasSchedule
              }"
              @click="selectCalendarDay(day)"
            >
              {{ day.day }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Student Modal -->
    <div v-if="showAddStudentModal" class="modal-overlay" @click.self="showAddStudentModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Lägg till elev</h3>
          <button class="close-btn" @click="showAddStudentModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Förnamn *</label>
            <input v-model="newStudent.firstName" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Efternamn *</label>
            <input v-model="newStudent.lastName" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Personnummer</label>
            <input v-model="newStudent.personalNumber" type="text" class="form-input" placeholder="YYYYMMDD-XXXX" />
          </div>
          <div class="form-group">
            <label>Program</label>
            <select v-model="newStudent.programId" class="form-select">
              <option value="">Välj program</option>
              <option v-for="program in programs" :key="program.id" :value="program.id">
                {{ program.name }} ({{ program.id }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>År</label>
            <select v-model="newStudent.currentYear" class="form-select">
              <option :value="1">År 1</option>
              <option :value="2">År 2</option>
              <option :value="3">År 3</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddStudentModal = false">Avbryt</button>
          <button class="btn-primary" @click="createStudent">Lägg till</button>
        </div>
      </div>
    </div>

    <!-- Add Teacher Modal -->
    <div v-if="showAddTeacherModal" class="modal-overlay" @click.self="showAddTeacherModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Lägg till lärare</h3>
          <button class="close-btn" @click="showAddTeacherModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Förnamn *</label>
            <input v-model="newTeacher.firstName" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Efternamn *</label>
            <input v-model="newTeacher.lastName" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Ämnen (kommaseparerade)</label>
            <input v-model="newTeacher.subjects" type="text" class="form-input" placeholder="Matematik, Fysik" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddTeacherModal = false">Avbryt</button>
          <button class="btn-primary" @click="createTeacher">Lägg till</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, watch } from 'vue';

export default defineComponent({
  name: 'Sidebar',
  props: {
    selectedDay: {
      type: String,
      default: null,
    },
    availableDays: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['selectDay'],
  setup(props, { emit }) {
    // Active tab
    const activeTab = ref('students');
    
    // User role (student or principal)
    const userRole = ref(localStorage.getItem('userRole') || 'principal');
    const currentUserId = ref(localStorage.getItem('userId') || null);
    
    // Students
    const students = ref([]);
    const filteredStudents = ref([]);
    const studentSearchQuery = ref('');
    const selectedStudent = ref(null);
    const selectedStudentId = ref('');
    const showAddStudentModal = ref(false);
    const showAddCourseModal = ref(false);
    const newStudent = ref({
      firstName: '',
      lastName: '',
      personalNumber: '',
      programId: '',
      currentYear: 1
    });
    
    // Teachers
    const teachers = ref([]);
    const filteredTeachers = ref([]);
    const teacherSearchQuery = ref('');
    const selectedTeacher = ref(null);
    const selectedTeacherId = ref('');
    const showAddTeacherModal = ref(false);
    const teacherSchedule = ref([]);
    const newTeacher = ref({
      firstName: '',
      lastName: '',
      subjects: ''
    });
    
    // Programs
    const programs = ref([]);
    
    // Calendar
    const currentDate = ref(new Date());
    const selectedCalendarDate = ref(null);
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
    
    // Computed
    const currentMonthName = computed(() => months[currentDate.value.getMonth()]);
    const currentYear = computed(() => currentDate.value.getFullYear());
    const currentMonthValue = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = String(currentDate.value.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    });
    
    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startDate = new Date(firstDay);
      const dayOfWeek = firstDay.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(firstDay.getDate() - mondayOffset);
      
      const endDate = new Date(lastDay);
      const lastDayOfWeek = lastDay.getDay();
      const sundayOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
      endDate.setDate(lastDay.getDate() + sundayOffset);
      
      const today = new Date();
      const days = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayDate = new Date(current);
        const isToday = dayDate.toDateString() === today.toDateString();
        const isSelected = selectedCalendarDate.value &&
          dayDate.toDateString() === selectedCalendarDate.value.toDateString();
        
        days.push({
          day: current.getDate(),
          otherMonth: current.getMonth() !== month,
          isToday,
          isSelected,
          hasSchedule: false,
          date: new Date(dayDate)
        });
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    });
    
    // Methods
    const onRoleChange = () => {
      localStorage.setItem('userRole', userRole.value);
      // Reload students based on new role
      loadStudents();
    };
    
    const onStudentSelect = async () => {
      if (selectedStudentId.value) {
        const student = students.value.find(s => s.id === selectedStudentId.value);
        if (student) {
          await selectStudent(student);
        }
      } else {
        selectedStudent.value = null;
      }
    };
    
    const onTeacherSelect = async () => {
      if (selectedTeacherId.value) {
        const teacher = teachers.value.find(t => t.id === selectedTeacherId.value);
        if (teacher) {
          await selectTeacher(teacher);
        }
      } else {
        selectedTeacher.value = null;
      }
    };
    
    const loadStudents = async () => {
      try {
        const result = await window.api.listStudents();
        if (result.success) {
          // If student role, filter to only show current user
          if (userRole.value === 'student' && currentUserId.value) {
            students.value = result.students.filter(s => s.id === currentUserId.value);
          } else {
            students.value = result.students;
          }
          filteredStudents.value = students.value;
          
          // Auto-select if student role and only one student (the user)
          if (userRole.value === 'student' && students.value.length === 1) {
            await selectStudent(students.value[0]);
          }
        }
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };
    
    const filterStudents = () => {
      const query = studentSearchQuery.value.toLowerCase();
      filteredStudents.value = students.value.filter(s =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.programId?.toLowerCase().includes(query)
      );
    };
    
    const selectStudent = async (student) => {
      try {
        const result = await window.api.getStudent(student.id);
        if (result.success) {
          selectedStudent.value = result.student;
        }
      } catch (error) {
        console.error('Error loading student details:', error);
      }
    };
    
    const createStudent = async () => {
      try {
        const programName = programs.value.find(p => p.id === newStudent.value.programId)?.name || '';
        const result = await window.api.createStudent({
          ...newStudent.value,
          programName
        });
        
        if (result.success) {
          showAddStudentModal.value = false;
          newStudent.value = {
            firstName: '',
            lastName: '',
            personalNumber: '',
            programId: '',
            currentYear: 1
          };
          await loadStudents();
        }
      } catch (error) {
        console.error('Error creating student:', error);
      }
    };
    
    const loadTeachers = async () => {
      try {
        const result = await window.api.listTeachers();
        if (result.success) {
          teachers.value = result.teachers;
          filteredTeachers.value = result.teachers;
        }
      } catch (error) {
        console.error('Error loading teachers:', error);
      }
    };
    
    const filterTeachers = () => {
      const query = teacherSearchQuery.value.toLowerCase();
      filteredTeachers.value = teachers.value.filter(t =>
        t.firstName.toLowerCase().includes(query) ||
        t.lastName.toLowerCase().includes(query)
      );
    };
    
    const selectTeacher = async (teacher) => {
      try {
        selectedTeacher.value = teacher;
        
        // Get teacher schedule from ViewerPage schedule data
        // The schedule should be in window global or we need to listen for events
        const scheduleData = await getScheduleDataForTeacher(teacher);
        teacherSchedule.value = scheduleData;
      } catch (error) {
        console.error('Error loading teacher schedule:', error);
      }
    };
    
    // Helper to get schedule data for a teacher from ViewerPage
    const getScheduleDataForTeacher = async (teacher) => {
      // Try to get from ViewerPage state via custom event
      return new Promise((resolve) => {
        // Request schedule data from ViewerPage
        const handler = (event) => {
          const { classes } = event.detail;
          
          // Filter classes for this teacher
          const teacherClasses = classes.filter(c => {
            // Match by teacher initials or name
            return c.teacher && (
              c.teacher.includes(teacher.initials) ||
              c.teacher.includes(teacher.employeeId) ||
              c.teacher.includes(teacher.firstName)
            );
          });
          
          // Group by subject/course
          const grouped = {};
          teacherClasses.forEach(c => {
            const key = c.subject || 'Unknown';
            if (!grouped[key]) {
              grouped[key] = {
                courseName: c.subject,
                courseCode: c.subject,
                day: c.day,
                startTime: c.startTime,
                endTime: c.endTime,
                room: c.room,
                students: []
              };
            }
            if (c.group) {
              grouped[key].students.push({ name: c.group });
            }
          });
          
          window.removeEventListener('schedule-data-response', handler);
          resolve(Object.values(grouped));
        };
        
        window.addEventListener('schedule-data-response', handler);
        
        // Request data
        window.dispatchEvent(new CustomEvent('request-schedule-data'));
        
        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener('schedule-data-response', handler);
          resolve([]);
        }, 1000);
      });
    };
    
    const createTeacher = async () => {
      try {
        const subjectsArray = newTeacher.value.subjects.split(',').map(s => s.trim()).filter(Boolean);
        const result = await window.api.createTeacher({
          firstName: newTeacher.value.firstName,
          lastName: newTeacher.value.lastName,
          subjects: subjectsArray,
          subjectNames: subjectsArray
        });
        
        if (result.success) {
          showAddTeacherModal.value = false;
          newTeacher.value = { firstName: '', lastName: '', subjects: '' };
          await loadTeachers();
        }
      } catch (error) {
        console.error('Error creating teacher:', error);
      }
    };
    
    const loadPrograms = async () => {
      try {
        const result = await window.api.listPrograms();
        if (result.success) {
          programs.value = result.programs;
        }
      } catch (error) {
        console.error('Error loading programs:', error);
      }
    };
    
    // Calendar methods
    const goToPreviousMonth = () => {
      const newDate = new Date(currentDate.value);
      newDate.setMonth(newDate.getMonth() - 1);
      currentDate.value = newDate;
    };
    
    const goToNextMonth = () => {
      const newDate = new Date(currentDate.value);
      newDate.setMonth(newDate.getMonth() + 1);
      currentDate.value = newDate;
    };
    
    const onMonthPickerChange = (event) => {
      const [year, month] = event.target.value.split('-');
      const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      currentDate.value = newDate;
    };
    
    const selectCalendarDay = (day) => {
      if (!day.otherMonth) {
        selectedCalendarDate.value = day.date;
        emit('selectDay', day.date.toISOString().split('T')[0]);
      }
    };
    
    // Helper methods
    const getProgramTypeClass = (programId) => {
      const universityPrep = ['EK', 'ES', 'HU', 'NA', 'SA', 'TE'];
      return universityPrep.includes(programId) ? 'university-prep' : 'vocational';
    };
    
    const getGradeClass = (grade) => {
      const gradeClasses = {
        'A': 'grade-a',
        'B': 'grade-b',
        'C': 'grade-c',
        'D': 'grade-d',
        'E': 'grade-e',
        'F': 'grade-f'
      };
      return gradeClasses[grade] || '';
    };
    
    const formatSubjects = (subjects) => {
      if (!subjects || subjects.length === 0) return 'Inga ämnen';
      return subjects.join(', ');
    };
    
    const editStudent = (student) => {
      // TODO: Implement edit functionality
      console.log('Edit student:', student);
    };
    
    const confirmDeleteStudent = async (student) => {
      if (confirm(`Är du säker på att du vill ta bort ${student.firstName} ${student.lastName}?`)) {
        try {
          const result = await window.api.deleteStudent(student.id);
          if (result.success) {
            selectedStudent.value = null;
            await loadStudents();
          }
        } catch (error) {
          console.error('Error deleting student:', error);
        }
      }
    };
    
    const editTeacher = (teacher) => {
      // TODO: Implement edit functionality
      console.log('Edit teacher:', teacher);
    };
    
    const confirmDeleteTeacher = async (teacher) => {
      if (confirm(`Är du säker på att du vill ta bort ${teacher.firstName} ${teacher.lastName}?`)) {
        try {
          const result = await window.api.deleteTeacher(teacher.id);
          if (result.success) {
            selectedTeacher.value = null;
            await loadTeachers();
          }
        } catch (error) {
          console.error('Error deleting teacher:', error);
        }
      }
    };
    
    // Lifecycle
    onMounted(async () => {
      await loadPrograms();
      await loadStudents();
      await loadTeachers();
    });
    
    // Watch tab changes
    watch(activeTab, (newTab) => {
      if (newTab === 'students') {
        selectedStudent.value = null;
      } else if (newTab === 'teachers') {
        selectedTeacher.value = null;
      }
    });
    
    return {
      activeTab,
      userRole,
      students,
      filteredStudents,
      studentSearchQuery,
      selectedStudent,
      selectedStudentId,
      showAddStudentModal,
      showAddCourseModal,
      newStudent,
      teachers,
      filteredTeachers,
      teacherSearchQuery,
      selectedTeacher,
      selectedTeacherId,
      showAddTeacherModal,
      teacherSchedule,
      newTeacher,
      programs,
      currentDate,
      currentMonthName,
      currentYear,
      currentMonthValue,
      weekdays,
      calendarDays,
      onRoleChange,
      onStudentSelect,
      onTeacherSelect,
      filterStudents,
      selectStudent,
      createStudent,
      filterTeachers,
      selectTeacher,
      createTeacher,
      goToPreviousMonth,
      goToNextMonth,
      onMonthPickerChange,
      selectCalendarDay,
      getProgramTypeClass,
      getGradeClass,
      formatSubjects,
      editStudent,
      confirmDeleteStudent,
      editTeacher,
      confirmDeleteTeacher
    };
  }
});
</script>

<style scoped>
.sidebar {
  width: 320px;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
  position: relative;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.role-selector {
  margin-top: 8px;
}

.role-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s;
}

.role-select:focus {
  outline: none;
  border-color: #667eea;
}

.role-select:hover {
  border-color: #9ca3af;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 12px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.tab-btn:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-btn svg {
  opacity: 0.7;
}

.tab-btn.active svg {
  opacity: 1;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Select Section */
.select-section {
  margin-bottom: 12px;
}

.select-dropdown {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-dropdown:focus {
  outline: none;
  border-color: #667eea;
}

.select-dropdown:hover {
  border-color: #9ca3af;
}

/* Search (deprecated but kept for potential future use) */
.search-section {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

/* Add Button */
.add-btn {
  width: 100%;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #5568d3;
}

/* Students/Teachers List */
.students-list,
.teachers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-card,
.teacher-card {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.student-card:hover,
.teacher-card:hover {
  border-color: #667eea;
  background: #f9fafb;
}

.student-card.active,
.teacher-card.active {
  border-color: #667eea;
  background: #eff1ff;
}

.student-info,
.teacher-info {
  flex: 1;
}

.student-name,
.teacher-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.student-meta,
.teacher-subjects {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.program-badge,
.year-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.program-badge.university-prep {
  background: #dbeafe;
  color: #1e40af;
}

.program-badge.vocational {
  background: #d1fae5;
  color: #065f46;
}

.year-badge {
  background: #f3f4f6;
  color: #374151;
}

.student-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
}

.teacher-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Detail Panel */
.detail-panel {
  position: absolute;
  top: 0;
  left: 320px;
  width: 380px;
  height: 100vh;
  background: white;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
}

.detail-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.info-section span {
  font-size: 14px;
  color: #111827;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.stat-card .stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #667eea;
  display: block;
  margin-bottom: 4px;
}

.stat-card .stat-label {
  font-size: 11px;
  color: #6b7280;
}

.enrollments-section,
.schedule-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.small-btn {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.small-btn:hover {
  background: #5568d3;
}

.enrollments-list,
.course-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enrollment-card,
.course-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-name {
  font-weight: 500;
  color: #111827;
  font-size: 13px;
  margin-bottom: 2px;
}

.course-meta,
.course-students {
  font-size: 11px;
  color: #6b7280;
  display: flex;
  gap: 8px;
}

.grade-badge,
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.grade-a { background: #d1fae5; color: #065f46; }
.grade-b { background: #dbeafe; color: #1e40af; }
.grade-c { background: #fef3c7; color: #92400e; }
.grade-d { background: #fed7aa; color: #9a3412; }
.grade-e { background: #fecaca; color: #991b1b; }
.grade-f { background: #f3f4f6; color: #374151; }

.status-badge {
  background: #f3f4f6;
  color: #6b7280;
}

.subject-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.subject-tag {
  padding: 4px 10px;
  background: #eff1ff;
  color: #667eea;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary,
.btn-danger {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.btn-danger:hover {
  background: #fecaca;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 14px;
}

/* Calendar */
.calendar-section {
  margin-top: 8px;
}

.calendar {
  background: white;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.calendar-nav-btn {
  background: #f3f4f6;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  color: #374151;
  transition: background 0.2s;
}

.calendar-nav-btn:hover {
  background: #e5e7eb;
}

.calendar-month {
  position: relative;
  font-weight: 500;
  color: #111827;
}

.calendar-month-picker {
  position: absolute;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 8px 0;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: #111827;
}

.calendar-day:hover {
  background: #f3f4f6;
}

.calendar-day.other-month {
  color: #d1d5db;
}

.calendar-day.today {
  background: #eff1ff;
  color: #667eea;
  font-weight: 600;
}

.calendar-day.selected {
  background: #667eea;
  color: white;
}

.calendar-day.has-schedule {
  position: relative;
}

.calendar-day.has-schedule::after {
  content: '';
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #667eea;
}

.calendar-day.selected.has-schedule::after {
  background: white;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}
</style>
