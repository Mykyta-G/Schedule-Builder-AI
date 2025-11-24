const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    title: "Schedule Builder AI",
    createSchedule: (data) => ipcRenderer.invoke('create-file', data),
    chat: (data) => ipcRenderer.invoke('chat', data),
    listSchedules: () => ipcRenderer.invoke('list-schedules'),
    readSchedule: (scheduleId) => ipcRenderer.invoke('read-schedule', scheduleId),
    saveSchedule: (schedule) => ipcRenderer.invoke('save-schedule', schedule),
    parseSchoolSoft: (data) => ipcRenderer.invoke('parse-schoolsoft', data),
    runScheduleSolver: (payload) => ipcRenderer.invoke('run-solver', payload),
});