const { getDatabase, saveDatabase } = require('./database');
const { parseSchoolSoft } = require('./schoolSoftParser');

/**
 * Import teachers and students from SchoolSoft parsed data into database
 */
async function importFromSchoolSoft(event, parsedData) {
    try {
        const db = await getDatabase();
        const { teachers, studentGroups, studentClass } = parsedData;

        const imported = {
            teachers: 0,
            students: 0
        };

        // Import teachers - import ALL teachers found
        if (teachers && Array.isArray(teachers)) {
            console.log(`Importing ${teachers.length} teachers...`);
            for (const teacherData of teachers) {
                if (!teacherData || !teacherData.initials) continue;
                
                // Check if teacher already exists
                const existing = db.exec(
                    'SELECT id FROM teachers WHERE employeeId = ?',
                    [teacherData.initials]
                );

                if (!existing.length || !existing[0].values.length) {
                    // Create new teacher
                    const id = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const now = new Date().toISOString();
                    
                    // Extract first and last name if fullName is available
                    let firstName = teacherData.initials;
                    let lastName = '';
                    if (teacherData.fullName) {
                        const nameParts = teacherData.fullName.trim().split(/\s+/);
                        if (nameParts.length > 1) {
                            firstName = nameParts[0];
                            lastName = nameParts.slice(1).join(' ');
                        } else {
                            firstName = nameParts[0];
                        }
                    }

                    db.run(
                        `INSERT INTO teachers (
              id, firstName, lastName, employeeId, subjects, subjectNames, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            firstName,
                            lastName,
                            teacherData.initials,
                            JSON.stringify(teacherData.subjects || []),
                            JSON.stringify(teacherData.subjects || []),
                            now,
                            now
                        ]
                    );
                    imported.teachers++;
                } else {
                    // Update existing teacher with new subjects/classes if needed
                    const existingId = existing[0].values[0][0];
                    const existingTeacher = db.exec('SELECT * FROM teachers WHERE id = ?', [existingId]);
                    if (existingTeacher.length && existingTeacher[0].values.length) {
                        // Could update subjects here if needed
                    }
                }
            }
            console.log(`Imported ${imported.teachers} new teachers`);
        }

        // Import student classes/groups
        // For principals/teachers, import ALL student classes found
        if (studentGroups && Array.isArray(studentGroups)) {
            console.log(`Importing ${studentGroups.length} student classes/groups...`);
            for (const groupData of studentGroups) {
                if (!groupData || !groupData.className) continue;
                
                // Check if a student with this class name already exists
                // (We're treating class names as identifiers for now)
                const existing = db.exec(
                    'SELECT id FROM students WHERE programId = ? OR programName = ?',
                    [groupData.className, groupData.className]
                );

                if (!existing.length || !existing[0].values.length) {
                    // Create a placeholder student record for this class
                    // In a real system, you'd want to import individual students
                    const id = `student-class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const now = new Date().toISOString();

                    db.run(
                        `INSERT INTO students (
              id, firstName, lastName, programId, programName, currentYear, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            groupData.className, // Use class name as identifier
                            'Class',
                            groupData.className,
                            groupData.fullName || groupData.className,
                            1, // Default year
                            now,
                            now
                        ]
                    );
                    imported.students++;
                }
            }
            console.log(`Imported ${imported.students} new student classes/groups`);
        }

        await saveDatabase();

        return {
            success: true,
            imported
        };
    } catch (error) {
        console.error('Error importing from SchoolSoft:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enhanced parse handler that also imports data
 */
async function parseAndImportSchoolSoft(event, data) {
    try {
        // First parse the HTML
        const parseResult = await parseSchoolSoft(data);

        if (!parseResult.success) {
            return parseResult;
        }

        // Then import teachers and students
        const importResult = await importFromSchoolSoft(event, parseResult.data);

        return {
            success: true,
            data: parseResult.data,
            imported: importResult.imported
        };
    } catch (error) {
        console.error('Error in parseAndImportSchoolSoft:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    importFromSchoolSoft,
    parseAndImportSchoolSoft
};
