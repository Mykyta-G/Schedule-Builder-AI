const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable hot reload for development
if (process.env.NODE_ENV !== 'production') {
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

  win.loadFile('src/index.html')
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