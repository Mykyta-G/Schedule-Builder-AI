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
    
    -- New tables for student management
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      englishName TEXT,
      programCode TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- 'university_prep' or 'vocational'
      description TEXT,
      totalCredits INTEGER DEFAULT 2500,
      coreCredits INTEGER DEFAULT 1200,
      programCredits INTEGER DEFAULT 900,
      electiveCredits INTEGER DEFAULT 300,
      diplomaProjectCredits INTEGER DEFAULT 100
    );
    
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      personalNumber TEXT UNIQUE, -- YYYYMMDD-XXXX format
      programId TEXT,
      programName TEXT,
      startYear INTEGER,
      currentYear INTEGER DEFAULT 1, -- 1, 2, or 3
      specialization TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (programId) REFERENCES programs(id)
    );
    
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      employeeId TEXT UNIQUE,
      subjects TEXT, -- JSON array of subject codes
      subjectNames TEXT, -- JSON array of subject names
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      courseCode TEXT UNIQUE NOT NULL,
      syllabusCode TEXT, -- e.g., MAT, FYS, KEM
      credits INTEGER NOT NULL,
      schoolForm TEXT NOT NULL, -- 'gymnasiet' or 'grundskola'
      subjectArea TEXT,
      description TEXT,
      level INTEGER -- Course level (1, 2, 3, etc.)
    );
    
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      courseId TEXT NOT NULL,
      teacherId TEXT,
      courseName TEXT, -- Denormalized for performance
      courseCode TEXT, -- Denormalized
      syllabusCode TEXT, -- Denormalized
      credits INTEGER, -- Denormalized
      status TEXT NOT NULL, -- 'ongoing', 'completed', 'failed'
      semester TEXT, -- 'HT' (hösttermin) or 'VT' (vårtermin)
      year INTEGER,
      grade TEXT, -- 'A', 'B', 'C', 'D', 'E', 'F', or NULL if ongoing
      gradePoints REAL, -- 20, 17.5, 15, 12.5, 10, 0
      givesMeritPoints INTEGER DEFAULT 0, -- Boolean
      meritPointValue REAL DEFAULT 0, -- 0, 0.5, 1.0, 1.5
      meritCategory TEXT, -- 'math', 'english', 'language', or NULL
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (courseId) REFERENCES courses(id),
      FOREIGN KEY (teacherId) REFERENCES teachers(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_students_programId ON students(programId);
    CREATE INDEX IF NOT EXISTS idx_students_personalNumber ON students(personalNumber);
    CREATE INDEX IF NOT EXISTS idx_enrollments_studentId ON enrollments(studentId);
    CREATE INDEX IF NOT EXISTS idx_enrollments_teacherId ON enrollments(teacherId);
    CREATE INDEX IF NOT EXISTS idx_enrollments_courseId ON enrollments(courseId);
    CREATE INDEX IF NOT EXISTS idx_courses_courseCode ON courses(courseCode);
    CREATE INDEX IF NOT EXISTS idx_courses_syllabusCode ON courses(syllabusCode);
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

    // Seed initial data
    await seedInitialData();
  }
  return db;
}

async function initializeDatabase() {
  ensureTablesExist();
  await saveDatabase();
  await migrateExistingFiles();
  await seedInitialData();
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

async function seedInitialData() {
  try {
    // Check if programs already seeded
    const programCheck = db.exec('SELECT COUNT(*) as count FROM programs');
    if (programCheck.length > 0 && programCheck[0].values[0][0] > 0) {
      return; // Already seeded
    }

    // Seed the 18 Swedish national gymnasium programs
    const programs = [
      // University Preparatory Programs
      { id: 'EK', code: 'EK', name: 'Ekonomiprogrammet', english: 'Business & Administration Program', type: 'university_prep' },
      { id: 'ES', code: 'ES', name: 'Estetiska programmet', english: 'Arts Program', type: 'university_prep' },
      { id: 'HU', code: 'HU', name: 'Humanistiska programmet', english: 'Humanities Program', type: 'university_prep' },
      { id: 'NA', code: 'NA', name: 'Naturvetenskapsprogrammet', english: 'Natural Science Program', type: 'university_prep' },
      { id: 'SA', code: 'SA', name: 'Samhällsvetenskapsprogrammet', english: 'Social Science Program', type: 'university_prep' },
      { id: 'TE', code: 'TE', name: 'Teknikprogrammet', english: 'Technology Program', type: 'university_prep' },
      // Vocational Programs
      { id: 'BF', code: 'BF', name: 'Barn och fritidsprogrammet', english: 'Child & Recreation Program', type: 'vocational' },
      { id: 'BA', code: 'BA', name: 'Bygg och anläggningsprogrammet', english: 'Building & Construction Program', type: 'vocational' },
      { id: 'EE', code: 'EE', name: 'El och energiprogrammet', english: 'Electricity & Energy Program', type: 'vocational' },
      { id: 'FT', code: 'FT', name: 'Fordon och transportprogrammet', english: 'Vehicle & Transport Program', type: 'vocational' },
      { id: 'HA', code: 'HA', name: 'Handels- och administrationsprogrammet', english: 'Business & Administration Program', type: 'vocational' },
      { id: 'HV', code: 'HV', name: 'Hantverksprogrammet', english: 'Handicraft Program', type: 'vocational' },
      { id: 'HT', code: 'HT', name: 'Hotell och turismprogrammet', english: 'Hotel & Tourism Program', type: 'vocational' },
      { id: 'IN', code: 'IN', name: 'Industritekniska programmet', english: 'Industrial Technology Program', type: 'vocational' },
      { id: 'NB', code: 'NB', name: 'Naturbruksprogrammet', english: 'Natural Resource Use Program', type: 'vocational' },
      { id: 'RL', code: 'RL', name: 'Restaurang och livsmedelsprogrammet', english: 'Restaurant & Food Program', type: 'vocational' },
      { id: 'VF', code: 'VF', name: 'VVS och fastighetsprogrammet', english: 'HVAC & Property Maintenance Program', type: 'vocational' },
      { id: 'VV', code: 'VV', name: 'Vård och omsorgsprogrammet', english: 'Health & Social Care Program', type: 'vocational' }
    ];

    for (const program of programs) {
      db.run(
        'INSERT INTO programs (id, name, englishName, programCode, type, totalCredits, coreCredits, programCredits, electiveCredits, diplomaProjectCredits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [program.id, program.name, program.english, program.code, program.type, 2500, 1200, 900, 300, 100]
      );
    }

    console.log('Seeded 18 Swedish gymnasium programs');
    await saveDatabase();
  } catch (error) {
    console.error('Error seeding initial data:', error);
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
