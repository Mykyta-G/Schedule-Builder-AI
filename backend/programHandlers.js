const { getDatabase, saveDatabase } = require('./database');

/**
 * List all programs
 */
async function listPrograms(event) {
    try {
        const db = await getDatabase();

        const result = db.exec('SELECT * FROM programs ORDER BY type, name');

        if (!result.length || !result[0].values.length) {
            return { success: true, programs: [] };
        }

        const columns = result[0].columns;
        const programs = result[0].values.map(row => {
            const program = {};
            columns.forEach((col, i) => {
                program[col] = row[i];
            });
            return program;
        });

        return { success: true, programs };
    } catch (error) {
        console.error('Error listing programs:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get program by ID
 */
async function getProgram(event, programId) {
    try {
        const db = await getDatabase();

        const result = db.exec('SELECT * FROM programs WHERE id = ?', [programId]);

        if (!result.length || !result[0].values.length) {
            return { success: false, error: 'Program not found' };
        }

        const columns = result[0].columns;
        const program = {};
        columns.forEach((col, i) => {
            program[col] = result[0].values[0][i];
        });

        return { success: true, program };
    } catch (error) {
        console.error('Error getting program:', error);
        return { success: false, error: error.message };
    }
}

/**
 * List all courses
 */
async function listCourses(event, filters = {}) {
    try {
        const db = await getDatabase();

        let query = 'SELECT * FROM courses WHERE 1=1';
        const params = [];

        if (filters.schoolForm) {
            query += ' AND schoolForm = ?';
            params.push(filters.schoolForm);
        }

        if (filters.syllabusCode) {
            query += ' AND syllabusCode = ?';
            params.push(filters.syllabusCode);
        }

        query += ' ORDER BY syllabusCode, level, name';

        const result = db.exec(query, params);

        if (!result.length || !result[0].values.length) {
            return { success: true, courses: [] };
        }

        const columns = result[0].columns;
        const courses = result[0].values.map(row => {
            const course = {};
            columns.forEach((col, i) => {
                course[col] = row[i];
            });
            return course;
        });

        return { success: true, courses };
    } catch (error) {
        console.error('Error listing courses:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get course by ID
 */
async function getCourse(event, courseId) {
    try {
        const db = await getDatabase();

        const result = db.exec('SELECT * FROM courses WHERE id = ?', [courseId]);

        if (!result.length || !result[0].values.length) {
            return { success: false, error: 'Course not found' };
        }

        const columns = result[0].columns;
        const course = {};
        columns.forEach((col, i) => {
            course[col] = result[0].values[0][i];
        });

        return { success: true, course };
    } catch (error) {
        console.error('Error getting course:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add new course
 */
async function addCourse(event, courseData) {
    try {
        const db = await getDatabase();

        const id = `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        db.run(
            `INSERT INTO courses (
        id, name, courseCode, syllabusCode, credits, schoolForm, subjectArea, description, level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                courseData.name,
                courseData.courseCode,
                courseData.syllabusCode || null,
                courseData.credits,
                courseData.schoolForm || 'gymnasiet',
                courseData.subjectArea || null,
                courseData.description || null,
                courseData.level || null
            ]
        );

        await saveDatabase();

        return { success: true, courseId: id };
    } catch (error) {
        console.error('Error adding course:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update course
 */
async function updateCourse(event, courseId, updates) {
    try {
        const db = await getDatabase();

        const allowedFields = [
            'name', 'courseCode', 'syllabusCode', 'credits',
            'schoolForm', 'subjectArea', 'description', 'level'
        ];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (setClauses.length === 0) {
            return { success: false, error: 'No valid fields to update' };
        }

        values.push(courseId);

        db.run(
            `UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error updating course:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete course
 */
async function deleteCourse(event, courseId) {
    try {
        const db = await getDatabase();

        // Note: This will NOT cascade delete enrollments (by design)
        // Enrollments are denormalized and will keep course data
        db.run('DELETE FROM courses WHERE id = ?', [courseId]);

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error deleting course:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Seed some common gymnasium courses
 */
async function seedCommonCourses() {
    try {
        const db = await getDatabase();

        // Check if courses already seeded
        const courseCheck = db.exec('SELECT COUNT(*) as count FROM courses');
        if (courseCheck.length > 0 && courseCheck[0].values[0][0] > 0) {
            return { success: true, message: 'Courses already seeded' };
        }

        const commonCourses = [
            // Mathematics
            { name: 'Matematik 1c', code: 'MATMAT01c', syllabus: 'MAT', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Matematik' },
            { name: 'Matematik 2c', code: 'MATMAT02c', syllabus: 'MAT', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Matematik' },
            { name: 'Matematik 3c', code: 'MATMAT03c', syllabus: 'MAT', credits: 100, level: 3, schoolForm: 'gymnasiet', subject: 'Matematik' },
            { name: 'Matematik 4', code: 'MATMAT04', syllabus: 'MAT', credits: 100, level: 4, schoolForm: 'gymnasiet', subject: 'Matematik' },
            { name: 'Matematik 5', code: 'MATMAT05', syllabus: 'MAT', credits: 100, level: 5, schoolForm: 'gymnasiet', subject: 'Matematik' },
            // English
            { name: 'Engelska 5', code: 'ENGENG05', syllabus: 'ENG', credits: 100, level: 5, schoolForm: 'gymnasiet', subject: 'Engelska' },
            { name: 'Engelska 6', code: 'ENGENG06', syllabus: 'ENG', credits: 100, level: 6, schoolForm: 'gymnasiet', subject: 'Engelska' },
            { name: 'Engelska 7', code: 'ENGENG07', syllabus: 'ENG', credits: 100, level: 7, schoolForm: 'gymnasiet', subject: 'Engelska' },
            // Swedish
            { name: 'Svenska 1', code: 'SVESVE01', syllabus: 'SVE', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Svenska' },
            { name: 'Svenska 2', code: 'SVESVE02', syllabus: 'SVE', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Svenska' },
            { name: 'Svenska 3', code: 'SVESVE03', syllabus: 'SVE', credits: 100, level: 3, schoolForm: 'gymnasiet', subject: 'Svenska' },
            // Physics
            { name: 'Fysik 1a', code: 'FYSIS01a', syllabus: 'FYS', credits: 150, level: 1, schoolForm: 'gymnasiet', subject: 'Fysik' },
            { name: 'Fysik 1b', code: 'FYSIS01b', syllabus: 'FYS', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Fysik' },
            { name: 'Fysik 2', code: 'FYSIS02', syllabus: 'FYS', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Fysik' },
            // Chemistry
            { name: 'Kemi 1', code: 'KEMKEM01', syllabus: 'KEM', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Kemi' },
            { name: 'Kemi 2', code: 'KEMKEM02', syllabus: 'KEM', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Kemi' },
            // Biology
            { name: 'Biologi 1', code: 'BIOBIO01', syllabus: 'BIO', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Biologi' },
            { name: 'Biologi 2', code: 'BIOBIO02', syllabus: 'BIO', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Biologi' },
            // History
            { name: 'Historia 1a1', code: 'HISHIS01a1', syllabus: 'HIS', credits: 50, level: 1, schoolForm: 'gymnasiet', subject: 'Historia' },
            { name: 'Historia 1b', code: 'HISHIS01b', syllabus: 'HIS', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Historia' },
            { name: 'Historia 2a', code: 'HISHIS02a', syllabus: 'HIS', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Historia' },
            // Civics
            { name: 'Samhällskunskap 1a1', code: 'SAMSAM01a1', syllabus: 'SAM', credits: 50, level: 1, schoolForm: 'gymnasiet', subject: 'Samhällskunskap' },
            { name: 'Samhällskunskap 1b', code: 'SAMSAM01b', syllabus: 'SAM', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Samhällskunskap' },
            { name: 'Samhällskunskap 2', code: 'SAMSAM02', syllabus: 'SAM', credits: 100, level: 2, schoolForm: 'gymnasiet', subject: 'Samhällskunskap' },
            // Religion
            { name: 'Religionskunskap 1', code: 'RELREL01', syllabus: 'REL', credits: 50, level: 1, schoolForm: 'gymnasiet', subject: 'Religionskunskap' },
            // PE
            { name: 'Idrott och hälsa 1', code: 'IDRIDR01', syllabus: 'IDR', credits: 100, level: 1, schoolForm: 'gymnasiet', subject: 'Idrott och hälsa' },
            // Psychology
            { name: 'Psykologi 1', code: 'PSYPSY01', syllabus: 'PSY', credits: 50, level: 1, schoolForm: 'gymnasiet', subject: 'Psykologi' },
            { name: 'Psykologi 2a', code: 'PSYPSY02a', syllabus: 'PSY', credits: 50, level: 2, schoolForm: 'gymnasiet', subject: 'Psykologi' },
            // Philosophy
            { name: 'Filosofi 1', code: 'FILFIL01', syllabus: 'FIL', credits: 50, level: 1, schoolForm: 'gymnasiet', subject: 'Filosofi' }
        ];

        for (const course of commonCourses) {
            const id = `course-${course.code}`;
            db.run(
                `INSERT INTO courses (id, name, courseCode, syllabusCode, credits, schoolForm, subjectArea, level) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, course.name, course.code, course.syllabus, course.credits, course.schoolForm, course.subject, course.level]
            );
        }

        await saveDatabase();

        return { success: true, message: `Seeded ${commonCourses.length} common courses` };
    } catch (error) {
        console.error('Error seeding courses:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    listPrograms,
    getProgram,
    listCourses,
    getCourse,
    addCourse,
    updateCourse,
    deleteCourse,
    seedCommonCourses
};
