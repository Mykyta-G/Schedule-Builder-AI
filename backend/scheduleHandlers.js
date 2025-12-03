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

  const scheduleData = {
    ...schedule,
    blocks,
    // Include extended fields if they exist in the database (we'll need to add columns or store as JSON blob)
    // For now, we'll rely on the JSON file being the source of truth for complex structures
    // and the DB for basic metadata and blocks
  };

  // If we have extended data passed in (not from DB), merge it
  // This is a bit of a hack, but since we're writing the JSON file here, we can use it
  // to persist data that doesn't fit in the current DB schema

  const filePath = path.join(SCHEDULES_DIR, `${scheduleId}.json`);

  // Check if existing JSON has data we want to preserve
  try {
    if (existsSync(filePath)) {
      const existingContent = await fs.readFile(filePath, 'utf8');
      const existingData = JSON.parse(existingContent);

      // Preserve extended fields from existing JSON if not present in current object
      if (!scheduleData.classes && existingData.classes) scheduleData.classes = existingData.classes;
      if (!scheduleData.teachers && existingData.teachers) scheduleData.teachers = existingData.teachers;
      if (!scheduleData.classrooms && existingData.classrooms) scheduleData.classrooms = existingData.classrooms;
      if (!scheduleData.subjects && existingData.subjects) scheduleData.subjects = existingData.subjects;
      if (!scheduleData.lessonTemplates && existingData.lessonTemplates) scheduleData.lessonTemplates = existingData.lessonTemplates;
      if (!scheduleData.timeSlots && existingData.timeSlots) scheduleData.timeSlots = existingData.timeSlots;
    }
  } catch (e) {
    // Ignore error reading existing file
  }

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

    // Try to read extended data from JSON file
    try {
      const jsonPath = path.join(SCHEDULES_DIR, `${scheduleId}.json`);
      if (existsSync(jsonPath)) {
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        const jsonData = JSON.parse(jsonContent);

        // Merge extended fields - comprehensive data loading
        if (jsonData.classes) schedule.classes = jsonData.classes;
        if (jsonData.teachers) schedule.teachers = jsonData.teachers;
        if (jsonData.classrooms) schedule.classrooms = jsonData.classrooms;
        if (jsonData.subjects) schedule.subjects = jsonData.subjects;
        if (jsonData.lessonTemplates) schedule.lessonTemplates = jsonData.lessonTemplates;
        if (jsonData.timeSlots) schedule.timeSlots = jsonData.timeSlots;
        if (jsonData.term) schedule.term = jsonData.term;
        if (jsonData.generatedSchedule) schedule.generatedSchedule = jsonData.generatedSchedule;
        if (jsonData.solverAssignments) schedule.solverAssignments = jsonData.solverAssignments;
        if (jsonData.customConstraints) schedule.customConstraints = jsonData.customConstraints;
        if (jsonData.solverOptions) schedule.solverOptions = jsonData.solverOptions;
        // Note: blocks are already loaded from DB above, but JSON blocks might have more data
        // So we preserve DB blocks but JSON can have extended block data if needed
      }
    } catch (e) {
      console.warn('Could not read extended data from JSON:', e.message);
    }

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

    // Check if schedule exists and get existing createdAt
    const existing = db.exec('SELECT id, createdAt FROM schedules WHERE id = ?', [schedule.id]);
    const exists = existing.length > 0 && existing[0].values.length > 0;
    const existingCreatedAt = exists && existing[0].values[0] ? existing[0].values[0][1] : null;

    if (exists) {
      // Update existing schedule - preserve createdAt from existing record
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

    // Update blocks - only if blocks are provided in schedule object
    // If blocks array is provided (even if empty), update blocks
    // If blocks field is not provided, preserve existing blocks
    if ('blocks' in schedule) {
      // Delete existing blocks
      db.run('DELETE FROM blocks WHERE scheduleId = ?', [schedule.id]);

      // Insert new blocks
      if (schedule.blocks && Array.isArray(schedule.blocks) && schedule.blocks.length > 0) {
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
    }
    // If 'blocks' is not in schedule object, preserve existing blocks in DB

    await saveDatabase();
    await saveDatabase();

    // For exportToJSON, we need to pass the full schedule object to preserve extended fields
    // Since exportToJSON reads from DB, we need to manually write the JSON file with all fields
    // instead of calling exportToJSON which would only write DB fields

    // await exportToJSON(schedule.id); // Replaced with direct write below

    // Prepare comprehensive JSON schedule with all fields
    const jsonSchedule = {
      ...schedule,
      updatedAt: now,
      // Preserve createdAt from existing record if updating, otherwise use provided or current time
      createdAt: existingCreatedAt || schedule.createdAt || now
    };
    
    const filePath = path.join(SCHEDULES_DIR, `${schedule.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(jsonSchedule, null, 2));

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
