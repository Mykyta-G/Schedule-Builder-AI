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

        // Import teachers
        if (teachers && Array.isArray(teachers)) {
            for (const teacherData of teachers) {
                // Check if teacher already exists
                const existing = db.exec(
                    'SELECT id FROM teachers WHERE employeeId = ?',
                    [teacherData.initials]
                );

                if (!existing.length || !existing[0].values.length) {
                    // Create new teacher
                    const id = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const now = new Date().toISOString();

                    db.run(
                        `INSERT INTO teachers (
              id, firstName, lastName, employeeId, subjects, subjectNames, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            teacherData.initials, // Use initials as first name for now
                            '',
                            teacherData.initials,
                            JSON.stringify(teacherData.subjects),
                            JSON.stringify(teacherData.subjects),
                            now,
                            now
                        ]
                    );
                    imported.teachers++;
                }
            }
        }

        // Import student class/group as a reference
        // For now, we'll just log it - in a real system, this would create student records
        if (studentGroups && Array.isArray(studentGroups)) {
            console.log(`Found ${studentGroups.length} student groups:`, studentGroups.map(g => g.className));
            imported.students = studentGroups.length;
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
