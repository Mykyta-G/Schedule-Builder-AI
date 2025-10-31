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

// Chat handler for OpenAI API
ipcMain.handle('chat', async (event, { apiKey, messages }) => {
  if (!apiKey || !apiKey.trim()) {
    return { error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages.slice(-20), // Keep last 20 messages for context
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'No response from AI.';
    
    return { content: reply };
  } catch (error) {
    console.error('Chat error:', error);
    return { error: error.message || 'Failed to connect to OpenAI API' };
  }
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