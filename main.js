const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const scheduleHandlers = require('./backend/scheduleHandlers');
const { handleChat } = require('./backend/chatHandler');
const { getDatabase, closeDatabase } = require('./backend/database');

const isDev = process.env.NODE_ENV === 'development';

// IPC Handlers
ipcMain.handle('create-file', (event, data) => scheduleHandlers.createSchedule(data));
ipcMain.handle('list-schedules', () => scheduleHandlers.listSchedules());
ipcMain.handle('read-schedule', (event, scheduleId) => scheduleHandlers.readSchedule(scheduleId));
ipcMain.handle('save-schedule', (event, schedule) => scheduleHandlers.saveSchedule(schedule));
ipcMain.handle('chat', (event, data) => handleChat(data));

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Handle window errors
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Window failed to load:', errorCode, errorDescription, validatedURL);
    // Retry loading if it's a network error and we're in dev mode
    if (isDev && errorCode === -106) {
      console.log('Retrying to load Vite dev server...');
      setTimeout(() => {
        win.loadURL('http://localhost:5173');
      }, 2000);
    }
  });

  // Load the Vite dev server in development, or the built file in production
  if (isDev) {
    // Wait a bit for Vite dev server to be ready, then load
    setTimeout(() => {
      win.loadURL('http://localhost:5173');
    }, 1000);
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
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