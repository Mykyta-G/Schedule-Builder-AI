const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';

// Enable hot reload for development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: require('electron').app.getPath('exe').replace(/[^/\\]+$/, '')
  })
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

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the Vite dev server in development, or the built file in production
  if (isDev) {
    win.loadURL('http://localhost:5173');
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