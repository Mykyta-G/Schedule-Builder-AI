const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    title: "Schedule Builder AI",
    createSchedule: (data) => ipcRenderer.invoke('create-file', data)
});