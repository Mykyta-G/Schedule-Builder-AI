const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const scheduleHandlers = require('./backend/scheduleHandlers');
const { handleChat } = require('./backend/chatHandler');
const { getDatabase, closeDatabase } = require('./backend/database');
const { runScheduleSolver } = require('./backend/z3Solver');

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
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  mainWindow.loadURL(isDev ? 'http://localhost:5173' : path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  // Initialize database on app start - ensures DB file is created/loaded
  await getDatabase();
  
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

// IPC Handlers
ipcMain.handle('create-file', (event, data) => scheduleHandlers.createSchedule(data));
ipcMain.handle('list-schedules', () => scheduleHandlers.listSchedules());
ipcMain.handle('read-schedule', (event, scheduleId) => scheduleHandlers.readSchedule(scheduleId));
ipcMain.handle('save-schedule', (event, schedule) => scheduleHandlers.saveSchedule(schedule));
ipcMain.handle('chat', (event, data) => handleChat(data));
ipcMain.handle('run-solver', (event, payload) => runScheduleSolver(payload));
