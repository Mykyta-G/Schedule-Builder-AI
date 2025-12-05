const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const scheduleHandlers = require('./backend/scheduleHandlers');
const { handleChat } = require('./backend/chatHandler');
const { getDatabase, closeDatabase } = require('./backend/database');
// Replaced Z3 with OR-Tools for 60x faster scheduling
// const { runScheduleSolver } = require('./backend/z3Solver');  // OLD: Z3 (times out on 26 lessons)
const { runScheduleSolver } = require('./backend/ortoolsSolver');  // NEW: OR-Tools (solves in seconds)

const { parseAndImportSchoolSoft } = require('./backend/schoolSoftImport');

// Import new handlers
const studentHandlers = require('./backend/studentHandlers');
const teacherHandlers = require('./backend/teacherHandlers');
const programHandlers = require('./backend/programHandlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable <webview> tag
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  mainWindow.loadURL(isDev ? 'http://localhost:5173' : path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  // Initialize database on app start - ensures DB file is created/loaded
  await getDatabase();

  // Seed common courses if needed
  await programHandlers.seedCommonCourses();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  // Ensure database is saved before quitting
  await closeDatabase();
});

// Schedule IPC Handlers
ipcMain.handle('create-file', (event, data) => scheduleHandlers.createSchedule(data));
ipcMain.handle('list-schedules', () => scheduleHandlers.listSchedules());
ipcMain.handle('read-schedule', (event, scheduleId) => scheduleHandlers.readSchedule(scheduleId));
ipcMain.handle('save-schedule', (event, schedule) => scheduleHandlers.saveSchedule(schedule));
ipcMain.handle('delete-schedule', (event, scheduleId) => scheduleHandlers.deleteSchedule(scheduleId));
ipcMain.handle('chat', (event, data) => handleChat(data));
ipcMain.handle('parse-schoolsoft', (event, data) => parseAndImportSchoolSoft(event, data));

// Student IPC Handlers
ipcMain.handle('list-students', studentHandlers.listStudents);
ipcMain.handle('get-student', (event, studentId) => studentHandlers.getStudent(event, studentId));
ipcMain.handle('create-student', (event, studentData) => studentHandlers.createStudent(event, studentData));
ipcMain.handle('update-student', (event, studentId, updates) => studentHandlers.updateStudent(event, studentId, updates));
ipcMain.handle('delete-student', (event, studentId) => studentHandlers.deleteStudent(event, studentId));
ipcMain.handle('add-enrollment', (event, enrollmentData) => studentHandlers.addEnrollment(event, enrollmentData));
ipcMain.handle('update-enrollment', (event, enrollmentId, updates) => studentHandlers.updateEnrollment(event, enrollmentId, updates));
ipcMain.handle('remove-enrollment', (event, enrollmentId) => studentHandlers.removeEnrollment(event, enrollmentId));

// Teacher IPC Handlers
ipcMain.handle('list-teachers', teacherHandlers.listTeachers);
ipcMain.handle('get-teacher', (event, teacherId) => teacherHandlers.getTeacher(event, teacherId));
ipcMain.handle('create-teacher', (event, teacherData) => teacherHandlers.createTeacher(event, teacherData));
ipcMain.handle('update-teacher', (event, teacherId, updates) => teacherHandlers.updateTeacher(event, teacherId, updates));
ipcMain.handle('delete-teacher', (event, teacherId) => teacherHandlers.deleteTeacher(event, teacherId));
ipcMain.handle('get-teacher-schedule', (event, teacherId, filters) => teacherHandlers.getTeacherSchedule(event, teacherId, filters));

// Program & Course IPC Handlers
ipcMain.handle('list-programs', programHandlers.listPrograms);
ipcMain.handle('get-program', (event, programId) => programHandlers.getProgram(event, programId));
ipcMain.handle('list-courses', (event, filters) => programHandlers.listCourses(event, filters));
ipcMain.handle('get-course', (event, courseId) => programHandlers.getCourse(event, courseId));
ipcMain.handle('add-course', (event, courseData) => programHandlers.addCourse(event, courseData));
ipcMain.handle('update-course', (event, courseId, updates) => programHandlers.updateCourse(event, courseId, updates));
ipcMain.handle('delete-course', (event, courseId) => programHandlers.deleteCourse(event, courseId));

// Z3 Solver Handler
ipcMain.handle('run-solver', async (event, payload) => {
  try {
    return await runScheduleSolver(payload);
  } catch (error) {
    // Log in main process FIRST (before any processing) for debugging
    console.error('[Main Process] Z3 Solver Error (raw):', {
      message: error.message,
      stderr: error.stderr,
      originalError: error.originalError,
      details: error.details,
      exitCode: error.exitCode,
      rawStdout: error.rawStdout ? error.rawStdout.substring(0, 500) : null,
      errorType: error.constructor.name,
      errorKeys: Object.keys(error),
      errorAllProps: Object.getOwnPropertyNames(error)
    });

    // Preserve error details through IPC by including them in the error message
    // Electron IPC serialization may lose custom properties, so embed them in the message
    let errorMessage = error.message || 'Z3 solver reported an error.';

    // If the error message is generic, try to get the actual error from properties
    if (errorMessage === 'Z3 solver reported an error.' || errorMessage.includes('Error invoking remote method')) {
      // Prioritize originalError if available
      if (error.originalError && error.originalError !== 'Z3 solver reported an error.') {
        errorMessage = error.originalError;
      }
      // Then try stderr
      else if (error.stderr && error.stderr.trim()) {
        errorMessage = error.stderr.trim().substring(0, 500);
      }
      // Then try details
      else if (error.details && error.details !== 'Z3 solver reported an error.') {
        errorMessage = error.details;
      }
      // Try to extract from rawStdout if it's JSON
      else if (error.rawStdout) {
        try {
          const parsed = JSON.parse(error.rawStdout.substring(0, 1000));
          if (parsed.error && parsed.error !== 'Z3 solver reported an error.') {
            errorMessage = parsed.error;
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }

    // Add custom properties to the message if they exist (for additional context)
    const parts = [errorMessage];
    if (error.stderr && error.stderr.trim() && !errorMessage.includes(error.stderr.trim().substring(0, 100))) {
      parts.push(`[stderr: ${error.stderr.trim().substring(0, 500)}]`);
    }
    if (error.originalError && error.originalError !== errorMessage && !errorMessage.includes(error.originalError)) {
      parts.push(`[originalError: ${error.originalError}]`);
    }
    if (error.details && error.details !== errorMessage && !errorMessage.includes(error.details)) {
      parts.push(`[details: ${error.details}]`);
    }

    const finalMessage = parts.join(' ');

    console.error('[Main Process] Z3 Solver Error (enhanced):', {
      originalMessage: error.message,
      finalMessage,
      messageLength: finalMessage.length
    });

    // Create a new error with the enhanced message
    const enhancedError = new Error(finalMessage);
    // Try to preserve properties (may not work through IPC, but message will)
    enhancedError.stderr = error.stderr;
    enhancedError.originalError = error.originalError;
    enhancedError.details = error.details;
    enhancedError.exitCode = error.exitCode;
    enhancedError.rawStdout = error.rawStdout;

    throw enhancedError;
  }
});
