const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    title: "Schedule Builder AI",

    // Schedule APIs
    createSchedule: (data) => ipcRenderer.invoke('create-file', data),
    chat: (data) => ipcRenderer.invoke('chat', data),
    listSchedules: () => ipcRenderer.invoke('list-schedules'),
    readSchedule: (scheduleId) => ipcRenderer.invoke('read-schedule', scheduleId),
    saveSchedule: (schedule) => ipcRenderer.invoke('save-schedule', schedule),
    deleteSchedule: (scheduleId) => ipcRenderer.invoke('delete-schedule', scheduleId),
    parseSchoolSoft: (data) => ipcRenderer.invoke('parse-schoolsoft', data),
    runScheduleSolver: (payload) => ipcRenderer.invoke('run-solver', payload),

    // Student APIs
    listStudents: () => ipcRenderer.invoke('list-students'),
    getStudent: (studentId) => ipcRenderer.invoke('get-student', studentId),
    createStudent: (studentData) => ipcRenderer.invoke('create-student', studentData),
    updateStudent: (studentId, updates) => ipcRenderer.invoke('update-student', studentId, updates),
    deleteStudent: (studentId) => ipcRenderer.invoke('delete-student', studentId),
    addEnrollment: (enrollmentData) => ipcRenderer.invoke('add-enrollment', enrollmentData),
    updateEnrollment: (enrollmentId, updates) => ipcRenderer.invoke('update-enrollment', enrollmentId, updates),
    removeEnrollment: (enrollmentId) => ipcRenderer.invoke('remove-enrollment', enrollmentId),

    // Teacher APIs
    listTeachers: () => ipcRenderer.invoke('list-teachers'),
    getTeacher: (teacherId) => ipcRenderer.invoke('get-teacher', teacherId),
    createTeacher: (teacherData) => ipcRenderer.invoke('create-teacher', teacherData),
    updateTeacher: (teacherId, updates) => ipcRenderer.invoke('update-teacher', teacherId, updates),
    deleteTeacher: (teacherId) => ipcRenderer.invoke('delete-teacher', teacherId),
    getTeacherSchedule: (teacherId, filters) => ipcRenderer.invoke('get-teacher-schedule', teacherId, filters),

    // Program & Course APIs
    listPrograms: () => ipcRenderer.invoke('list-programs'),
    getProgram: (programId) => ipcRenderer.invoke('get-program', programId),
    listCourses: (filters) => ipcRenderer.invoke('list-courses', filters),
    getCourse: (courseId) => ipcRenderer.invoke('get-course', courseId),
    addCourse: (courseData) => ipcRenderer.invoke('add-course', courseData),
    updateCourse: (courseId, updates) => ipcRenderer.invoke('update-course', courseId, updates),
    deleteCourse: (courseId) => ipcRenderer.invoke('delete-course', courseId),
});