const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

let mainWindow;
const SCHEDULES_DIR = path.join(__dirname, 'Schedules');

async function ensureSchedulesDir() {
  if (!existsSync(SCHEDULES_DIR)) {
    await fs.mkdir(SCHEDULES_DIR, { recursive: true });
  }
}

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
  await ensureSchedulesDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

async function getScheduleFiles() {
  const files = await fs.readdir(SCHEDULES_DIR);
  return files.filter(f => f.endsWith('.json'));
}

async function findScheduleFile(scheduleId) {
  const files = await getScheduleFiles();
  for (const file of files) {
    const filePath = path.join(SCHEDULES_DIR, file);
    const schedule = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    if (schedule.id === scheduleId || file.replace('.json', '') === scheduleId) {
      return filePath;
    }
  }
  const directPath = path.join(SCHEDULES_DIR, `${scheduleId}.json`);
  return existsSync(directPath) ? directPath : null;
}

ipcMain.handle('create-file', async (event, data) => {
  try {
    await ensureSchedulesDir();
    const timestamp = Date.now();
    const id = `schedule-${timestamp}`;
    const scheduleData = {
      id,
      name: data.title || 'Untitled Schedule',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: data.schedule || {},
      ...data
    };
    await fs.writeFile(path.join(SCHEDULES_DIR, `${id}.json`), JSON.stringify(scheduleData, null, 2));
    return { success: true, id, fileName: `${id}.json` };
  } catch (error) {
    console.error('Error creating schedule file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-schedules', async () => {
  try {
    await ensureSchedulesDir();
    const schedules = await Promise.all(
      (await getScheduleFiles()).map(async (file) => {
        try {
          const schedule = JSON.parse(await fs.readFile(path.join(SCHEDULES_DIR, file), 'utf-8'));
          return {
            id: schedule.id || file.replace('.json', ''),
            name: schedule.name || schedule.title || 'Untitled Schedule',
            description: schedule.description || '',
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
            fileName: file
          };
        } catch (err) {
          console.error(`Error reading schedule file ${file}:`, err);
          return null;
        }
      })
    );
    return schedules
      .filter(s => s !== null)
      .sort((a, b) => (new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
  } catch (error) {
    console.error('Error listing schedules:', error);
    return [];
  }
});

ipcMain.handle('read-schedule', async (event, scheduleId) => {
  try {
    await ensureSchedulesDir();
    const filePath = await findScheduleFile(scheduleId);
    if (!filePath) return null;
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch (error) {
    console.error('Error reading schedule:', error);
    return null;
  }
});

ipcMain.handle('save-schedule', async (event, schedule) => {
  try {
    await ensureSchedulesDir();
    if (!schedule.id) {
      return { success: false, error: 'Schedule ID is required' };
    }
    schedule.updatedAt = new Date().toISOString();
    if (!schedule.createdAt) schedule.createdAt = new Date().toISOString();
    
    const filePath = await findScheduleFile(schedule.id) || path.join(SCHEDULES_DIR, `schedule-${schedule.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(schedule, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving schedule:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat', async (event, data) => {
  try {
    const { apiKey, messages } = data;
    if (!apiKey) return { error: 'API key is required' };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error?.message || `API error: ${response.statusText}` };
    }

    const result = await response.json();
    return { content: result.choices?.[0]?.message?.content || 'No response' };
  } catch (error) {
    console.error('Error in chat handler:', error);
    return { error: error.message || 'Failed to get AI response' };
  }
});
