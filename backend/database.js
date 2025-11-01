const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

const DB_PATH = path.join(__dirname, '..', 'schedules.db');
let db = null;
let SQL = null;

function ensureTablesExist() {
  // Always ensure tables exist, even if DB file was loaded
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      scheduleId TEXT NOT NULL,
      title TEXT DEFAULT '',
      room TEXT DEFAULT '',
      teacher TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_blocks_scheduleId ON blocks(scheduleId);
    CREATE INDEX IF NOT EXISTS idx_schedules_updatedAt ON schedules(updatedAt);
  `);
}

async function getDatabase() {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    
    if (existsSync(DB_PATH)) {
      try {
        const buffer = await fs.readFile(DB_PATH);
        db = new SQL.Database(buffer);
      } catch (error) {
        // If file is corrupted or empty, create new database
        console.log('Database file corrupted or empty, creating new database');
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }
    
    // Always ensure tables exist (handles both new and existing databases)
    ensureTablesExist();
    
    // Save after ensuring tables exist (in case this is a new or repaired DB)
    await saveDatabase();
    
    // Migrate any new files that might have been added while app was closed
    await migrateExistingFiles();
  }
  return db;
}

async function initializeDatabase() {
  ensureTablesExist();
  await saveDatabase();
  await migrateExistingFiles();
}

async function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(DB_PATH, buffer);
  }
}

async function migrateExistingFiles() {
  const SCHEDULES_DIR = path.join(__dirname, '..', 'Schedules');
  if (!existsSync(SCHEDULES_DIR)) return;
  
  try {
    const files = await fs.readdir(SCHEDULES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(SCHEDULES_DIR, file);
        const schedule = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        
        // Check if schedule already exists in database
        const result = db.exec('SELECT id FROM schedules WHERE id = ?', [schedule.id]);
        if (result.length > 0 && result[0].values.length > 0) continue;
        
        // Insert schedule
        db.run(
          'INSERT INTO schedules (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
          [
            schedule.id,
            schedule.name || schedule.title || 'Untitled Schedule',
            schedule.description || '',
            schedule.createdAt || new Date().toISOString(),
            schedule.updatedAt || new Date().toISOString()
          ]
        );
        
        // Insert blocks if they exist
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
                block.createdAt || new Date().toISOString(),
                block.updatedAt || new Date().toISOString()
              ]
            );
          }
        }
      } catch (err) {
        console.error(`Error migrating file ${file}:`, err);
      }
    }
    
    await saveDatabase();
  } catch (error) {
    console.error('Error migrating existing files:', error);
  }
}

async function closeDatabase() {
  if (db) {
    await saveDatabase();
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, closeDatabase, saveDatabase };
