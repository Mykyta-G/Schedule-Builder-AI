const { getDatabase, saveDatabase } = require('./database');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

const SCHEDULES_DIR = path.join(__dirname, '..', 'Schedules');

async function ensureSchedulesDir() {
  if (!existsSync(SCHEDULES_DIR)) {
    await fs.mkdir(SCHEDULES_DIR, { recursive: true });
  }
}

async function exportToJSON(scheduleId) {
  await ensureSchedulesDir();
  const db = await getDatabase();
  
  const result = db.exec('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
  if (!result.length || !result[0].values.length) return null;
  
  const scheduleRow = result[0].values[0];
  const schedule = {
    id: scheduleRow[0],
    name: scheduleRow[1],
    description: scheduleRow[2] || '',
    createdAt: scheduleRow[3],
    updatedAt: scheduleRow[4]
  };
  
  const blocksResult = db.exec('SELECT * FROM blocks WHERE scheduleId = ? ORDER BY createdAt', [scheduleId]);
  const blocks = blocksResult.length && blocksResult[0].values
    ? blocksResult[0].values.map(row => ({
        id: row[0],
        title: row[2] || '',
        room: row[3] || '',
        teacher: row[4] || '',
        createdAt: row[5],
        updatedAt: row[6]
      }))
    : [];
  
  const scheduleData = { ...schedule, blocks };
  const filePath = path.join(SCHEDULES_DIR, `${scheduleId}.json`);
  await fs.writeFile(filePath, JSON.stringify(scheduleData, null, 2));
  return filePath;
}

async function createSchedule(data) {
  try {
    await ensureSchedulesDir();
    const db = await getDatabase();
    const timestamp = Date.now();
    const id = `schedule-${timestamp}`;
    const now = new Date().toISOString();
    
    db.run(
      'INSERT INTO schedules (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [id, data.title || 'Untitled Schedule', data.description || '', now, now]
    );
    
    await saveDatabase();
    await exportToJSON(id);
    
    return { success: true, id, fileName: `${id}.json` };
  } catch (error) {
    console.error('Error creating schedule:', error);
    return { success: false, error: error.message };
  }
}

async function listSchedules() {
  try {
    await ensureSchedulesDir();
    const db = await getDatabase();
    const result = db.exec('SELECT id, name, description, createdAt, updatedAt FROM schedules ORDER BY updatedAt DESC');
    
    if (!result.length) return [];
    
    return result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      description: row[2] || '',
      createdAt: row[3],
      updatedAt: row[4],
      fileName: `${row[0]}.json`
    }));
  } catch (error) {
    console.error('Error listing schedules:', error);
    return [];
  }
}

async function readSchedule(scheduleId) {
  try {
    await ensureSchedulesDir();
    const db = await getDatabase();
    
    const result = db.exec('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
    if (!result.length || !result[0].values.length) return null;
    
    const scheduleRow = result[0].values[0];
    const schedule = {
      id: scheduleRow[0],
      name: scheduleRow[1],
      description: scheduleRow[2] || '',
      createdAt: scheduleRow[3],
      updatedAt: scheduleRow[4]
    };
    
    const blocksResult = db.exec('SELECT * FROM blocks WHERE scheduleId = ? ORDER BY createdAt', [scheduleId]);
    schedule.blocks = blocksResult.length && blocksResult[0].values
      ? blocksResult[0].values.map(row => ({
          id: row[0],
          title: row[2] || '',
          room: row[3] || '',
          teacher: row[4] || '',
          createdAt: row[5],
          updatedAt: row[6]
        }))
      : [];
    
    return schedule;
  } catch (error) {
    console.error('Error reading schedule:', error);
    return null;
  }
}

async function saveSchedule(schedule) {
  try {
    await ensureSchedulesDir();
    if (!schedule.id) {
      return { success: false, error: 'Schedule ID is required' };
    }
    
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    // Check if schedule exists
    const existing = db.exec('SELECT id FROM schedules WHERE id = ?', [schedule.id]);
    const exists = existing.length > 0 && existing[0].values.length > 0;
    
    if (exists) {
      // Update existing schedule
      db.run(
        'UPDATE schedules SET name = ?, description = ?, updatedAt = ? WHERE id = ?',
        [schedule.name || 'Untitled Schedule', schedule.description || '', now, schedule.id]
      );
    } else {
      // Create new schedule
      db.run(
        'INSERT INTO schedules (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [schedule.id, schedule.name || 'Untitled Schedule', schedule.description || '', schedule.createdAt || now, now]
      );
    }
    
    // Delete existing blocks
    db.run('DELETE FROM blocks WHERE scheduleId = ?', [schedule.id]);
    
    // Insert new blocks
    if (schedule.blocks && Array.isArray(schedule.blocks)) {
      for (const block of schedule.blocks) {
        db.run(
          'INSERT INTO blocks (id, scheduleId, title, room, teacher, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            block.id,
            schedule.id,
            block.title || '',
            block.room || '',
            block.teacher || '',
            block.createdAt || now,
            block.updatedAt || now
          ]
        );
      }
    }
    
    await saveDatabase();
    await exportToJSON(schedule.id);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving schedule:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createSchedule,
  listSchedules,
  readSchedule,
  saveSchedule
};
