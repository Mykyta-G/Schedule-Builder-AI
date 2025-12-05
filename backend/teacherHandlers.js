const { getDatabase, saveDatabase } = require('./database');

/**
 * List all teachers
 */
async function listTeachers(event) {
    try {
        const db = await getDatabase();

        const result = db.exec('SELECT * FROM teachers ORDER BY lastName, firstName');

        if (!result.length || !result[0].values.length) {
            return { success: true, teachers: [] };
        }

        const columns = result[0].columns;
        const teachers = result[0].values.map(row => {
            const teacher = {};
            columns.forEach((col, i) => {
                teacher[col] = row[i];
            });

            // Parse JSON fields
            if (teacher.subjects) {
                try {
                    teacher.subjects = JSON.parse(teacher.subjects);
                } catch (e) {
                    teacher.subjects = [];
                }
            }
            if (teacher.subjectNames) {
                try {
                    teacher.subjectNames = JSON.parse(teacher.subjectNames);
                } catch (e) {
                    teacher.subjectNames = [];
                }
            }

            return teacher;
        });

        return { success: true, teachers };
    } catch (error) {
        console.error('Error listing teachers:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get single teacher with details
 */
async function getTeacher(event, teacherId) {
    try {
        const db = await getDatabase();

        const result = db.exec('SELECT * FROM teachers WHERE id = ?', [teacherId]);

        if (!result.length || !result[0].values.length) {
            return { success: false, error: 'Teacher not found' };
        }

        const columns = result[0].columns;
        const teacher = {};
        columns.forEach((col, i) => {
            teacher[col] = result[0].values[0][i];
        });

        // Parse JSON fields
        if (teacher.subjects) {
            try {
                teacher.subjects = JSON.parse(teacher.subjects);
            } catch (e) {
                teacher.subjects = [];
            }
        }
        if (teacher.subjectNames) {
            try {
                teacher.subjectNames = JSON.parse(teacher.subjectNames);
            } catch (e) {
                teacher.subjectNames = [];
            }
        }

        // Get courses taught
        const coursesResult = db.exec(
            'SELECT DISTINCT courseName, courseCode, COUNT(*) as studentCount FROM enrollments WHERE teacherId = ? GROUP BY courseCode ORDER BY courseName',
            [teacherId]
        );

        let courses = [];
        if (coursesResult.length && coursesResult[0].values.length) {
            const courseCols = coursesResult[0].columns;
            courses = coursesResult[0].values.map(row => {
                const course = {};
                courseCols.forEach((col, i) => {
                    course[col] = row[i];
                });
                return course;
            });
        }

        return {
            success: true,
            teacher: {
                ...teacher,
                courses
            }
        };
    } catch (error) {
        console.error('Error getting teacher:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create new teacher
 */
async function createTeacher(event, teacherData) {
    try {
        const db = await getDatabase();

        const id = `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const subjects = Array.isArray(teacherData.subjects)
            ? JSON.stringify(teacherData.subjects)
            : null;
        const subjectNames = Array.isArray(teacherData.subjectNames)
            ? JSON.stringify(teacherData.subjectNames)
            : null;

        db.run(
            `INSERT INTO teachers (
        id, firstName, lastName, employeeId, subjects, subjectNames, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                teacherData.firstName,
                teacherData.lastName,
                teacherData.employeeId || null,
                subjects,
                subjectNames,
                now,
                now
            ]
        );

        await saveDatabase();

        return { success: true, teacherId: id };
    } catch (error) {
        console.error('Error creating teacher:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update teacher
 */
async function updateTeacher(event, teacherId, updates) {
    try {
        const db = await getDatabase();

        const allowedFields = ['firstName', 'lastName', 'employeeId', 'subjects', 'subjectNames'];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                // Stringify arrays
                if (key === 'subjects' || key === 'subjectNames') {
                    values.push(Array.isArray(value) ? JSON.stringify(value) : value);
                } else {
                    values.push(value);
                }
            }
        }

        if (setClauses.length === 0) {
            return { success: false, error: 'No valid fields to update' };
        }

        setClauses.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(teacherId);

        db.run(
            `UPDATE teachers SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error updating teacher:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete teacher
 */
async function deleteTeacher(event, teacherId) {
    try {
        const db = await getDatabase();

        // Note: This will NOT cascade delete enrollments (by design)
        // Enrollments will just have null teacherId
        db.run('DELETE FROM teachers WHERE id = ?', [teacherId]);

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error deleting teacher:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get teacher's schedule from enrollment data
 */
async function getTeacherSchedule(event, teacherId, filters = {}) {
    try {
        const db = await getDatabase();

        // Get all enrollments for this teacher with student info
        let query = `
      SELECT 
        e.*,
        s.firstName as studentFirstName,
        s.lastName as studentLastName,
        s.programName
      FROM enrollments e
      LEFT JOIN students s ON e.studentId = s.id
      WHERE e.teacherId = ?
    `;

        const params = [teacherId];

        if (filters.semester) {
            query += ' AND e.semester = ?';
            params.push(filters.semester);
        }

        if (filters.year) {
            query += ' AND e.year = ?';
            params.push(filters.year);
        }

        if (filters.status) {
            query += ' AND e.status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY e.year DESC, e.semester, e.courseName';

        const result = db.exec(query, params);

        let schedule = [];
        if (result.length && result[0].values.length) {
            const columns = result[0].columns;
            schedule = result[0].values.map(row => {
                const item = {};
                columns.forEach((col, i) => {
                    item[col] = row[i];
                });
                return item;
            });
        }

        // Group by course
        const courseGroups = {};
        for (const item of schedule) {
            const key = item.courseCode || item.courseName;
            if (!courseGroups[key]) {
                courseGroups[key] = {
                    courseName: item.courseName,
                    courseCode: item.courseCode,
                    credits: item.credits,
                    semester: item.semester,
                    year: item.year,
                    students: []
                };
            }
            courseGroups[key].students.push({
                studentId: item.studentId,
                name: `${item.studentFirstName} ${item.studentLastName}`,
                program: item.programName,
                grade: item.grade,
                status: item.status
            });
        }

        return {
            success: true,
            schedule: Object.values(courseGroups)
        };
    } catch (error) {
        console.error('Error getting teacher schedule:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    listTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherSchedule
};
