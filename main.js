const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';

// Enable hot reload for development (optional - can be disabled if causing issues)
if (isDev && process.env.DISABLE_HOT_RELOAD !== 'true') {
  try {
    // Try to use electron-reload, but don't crash if it fails
    const electronReload = require('electron-reload');
    electronReload(__dirname, {
      hardResetMethod: 'exit',
      ignore: [
        /node_modules[/\\]/
      ]
    });
    console.log('Hot reload enabled');
  } catch (error) {
    // If electron-reload fails, just continue without hot reload
    console.warn('Hot reload disabled (non-fatal):', error.message);
  }
} else if (isDev) {
  console.log('Hot reload disabled via DISABLE_HOT_RELOAD env var');
}

ipcMain.handle('create-file', (req, data) => {
  if (!data || !data.title || !data.description) return false;

  const scheduleDir = path.join(__dirname, 'Schedules');
  if (!fs.existsSync(scheduleDir)) {
    fs.mkdirSync(scheduleDir, { recursive: true });
  }

  const filePath = path.join(scheduleDir, `${data.title}.txt`);
  fs.writeFileSync(filePath, data.description);
  return { success: true, filePath };
});

// List all schedule files (JSON files in Schedules folder)
ipcMain.handle('list-schedules', () => {
  const scheduleDir = path.join(__dirname, 'Schedules');
  if (!fs.existsSync(scheduleDir)) {
    fs.mkdirSync(scheduleDir, { recursive: true });
    return [];
  }

  try {
    const files = fs.readdirSync(scheduleDir);
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(scheduleDir, file);
        const stats = fs.statSync(filePath);
        return {
          id: file.replace('.json', ''),
          name: file.replace('.json', ''),
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString()
        };
      });
    return jsonFiles;
  } catch (error) {
    console.error('Error listing schedules:', error);
    return [];
  }
});

// Read a schedule file
ipcMain.handle('read-schedule', (_, scheduleId) => {
  const scheduleDir = path.join(__dirname, 'Schedules');
  const filePath = path.join(scheduleDir, `${scheduleId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading schedule:', error);
    return null;
  }
});

// Save/update a schedule file
ipcMain.handle('save-schedule', (_, schedule) => {
  if (!schedule || !schedule.id) {
    return { success: false, error: 'Invalid schedule data' };
  }

  const scheduleDir = path.join(__dirname, 'Schedules');
  if (!fs.existsSync(scheduleDir)) {
    fs.mkdirSync(scheduleDir, { recursive: true });
  }

  const filePath = path.join(scheduleDir, `${schedule.id}.json`);
  
  // Ensure timestamps
  const now = new Date().toISOString();
  if (!schedule.createdAt) {
    schedule.createdAt = now;
  }
  schedule.updatedAt = now;

  // Ensure blocks array exists
  if (!schedule.blocks) {
    schedule.blocks = [];
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2), 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving schedule:', error);
    return { success: false, error: error.message };
  }
});

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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})