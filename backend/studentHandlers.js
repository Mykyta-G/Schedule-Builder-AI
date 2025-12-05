const { getDatabase, saveDatabase } = require('./database');

/**
 * Calculate grade points from letter grade
 */
function getGradePoints(grade) {
    const gradeMap = {
        'A': 20,
        'B': 17.5,
        'C': 15,
        'D': 12.5,
        'E': 10,
        'F': 0
    };
    return gradeMap[grade?.toUpperCase()] || 0;
}

/**
 * Calculate student statistics
 */
function calculateStudentStats(enrollments) {
    let totalCredits = 0;
    let passingCredits = 0;
    let weightedGradeSum = 0;
    let totalMeritPoints = 0;

    // Track merit points by category (max values)
    const meritByCategory = {
        math: 0,
        english: 0,
        language: 0
    };

    for (const enrollment of enrollments) {
        const credits = enrollment.credits || 0;
        totalCredits += credits;

        // Only count passing grades (E-A)
        if (enrollment.grade && enrollment.grade !== 'F' && enrollment.status === 'completed') {
            passingCredits += credits;
            const gradePoints = enrollment.gradePoints || getGradePoints(enrollment.grade);
            weightedGradeSum += gradePoints * credits;

            // Accumulate merit points by category
            if (enrollment.givesMeritPoints && enrollment.meritCategory) {
                const category = enrollment.meritCategory;
                const points = enrollment.meritPointValue || 0;
                meritByCategory[category] = Math.max(meritByCategory[category], points);
            }
        }
    }

    // Calculate total merit points (sum of highest in each category, max 2.5)
    totalMeritPoints = Math.min(
        meritByCategory.math + meritByCategory.english + meritByCategory.language,
        2.5
    );

    // Calculate grade average (jämförelsetal)
    const gradeAverage = passingCredits > 0 ? weightedGradeSum / passingCredits : 0;

    // Calculate merit rating (meritvärde)
    const meritRating = gradeAverage + totalMeritPoints;

    // Calculate progress to graduation (2250 passing credits required)
    const progressToGraduation = passingCredits / 2250;

    return {
        totalCredits,
        passingCredits,
        gradeAverage: Math.round(gradeAverage * 100) / 100,
        meritPoints: Math.round(totalMeritPoints * 10) / 10,
        meritRating: Math.round(meritRating * 100) / 100,
        progressToGraduation: Math.round(progressToGraduation * 100) / 100,
        meritBreakdown: meritByCategory
    };
}

/**
 * List all students with basic info and calculated stats
 */
async function listStudents(event) {
    try {
        const db = await getDatabase();

        // Get all students
        const studentsResult = db.exec('SELECT * FROM students ORDER BY lastName, firstName');

        if (!studentsResult.length || !studentsResult[0].values.length) {
            return { success: true, students: [] };
        }

        const columns = studentsResult[0].columns;
        const students = studentsResult[0].values.map(row => {
            const student = {};
            columns.forEach((col, i) => {
                student[col] = row[i];
            });
            return student;
        });

        // For each student, get enrollments and calculate stats
        const studentsWithStats = [];
        for (const student of students) {
            const enrollmentsResult = db.exec(
                'SELECT * FROM enrollments WHERE studentId = ?',
                [student.id]
            );

            let enrollments = [];
            if (enrollmentsResult.length && enrollmentsResult[0].values.length) {
                const enrollCols = enrollmentsResult[0].columns;
                enrollments = enrollmentsResult[0].values.map(row => {
                    const enrollment = {};
                    enrollCols.forEach((col, i) => {
                        enrollment[col] = row[i];
                    });
                    return enrollment;
                });
            }

            const stats = calculateStudentStats(enrollments);

            studentsWithStats.push({
                ...student,
                ...stats,
                enrollmentCount: enrollments.length
            });
        }

        return { success: true, students: studentsWithStats };
    } catch (error) {
        console.error('Error listing students:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get single student with full details
 */
async function getStudent(event, studentId) {
    try {
        const db = await getDatabase();

        // Get student
        const studentResult = db.exec('SELECT * FROM students WHERE id = ?', [studentId]);

        if (!studentResult.length || !studentResult[0].values.length) {
            return { success: false, error: 'Student not found' };
        }

        const columns = studentResult[0].columns;
        const student = {};
        columns.forEach((col, i) => {
            student[col] = studentResult[0].values[0][i];
        });

        // Get program details
        if (student.programId) {
            const programResult = db.exec('SELECT * FROM programs WHERE id = ?', [student.programId]);
            if (programResult.length && programResult[0].values.length) {
                const programCols = programResult[0].columns;
                const program = {};
                programCols.forEach((col, i) => {
                    program[col] = programResult[0].values[0][i];
                });
                student.program = program;
            }
        }

        // Get all enrollments
        const enrollmentsResult = db.exec(
            'SELECT * FROM enrollments WHERE studentId = ? ORDER BY year DESC, semester DESC',
            [studentId]
        );

        let enrollments = [];
        if (enrollmentsResult.length && enrollmentsResult[0].values.length) {
            const enrollCols = enrollmentsResult[0].columns;
            enrollments = enrollmentsResult[0].values.map(row => {
                const enrollment = {};
                enrollCols.forEach((col, i) => {
                    enrollment[col] = row[i];
                });
                return enrollment;
            });
        }

        const stats = calculateStudentStats(enrollments);

        return {
            success: true,
            student: {
                ...student,
                ...stats,
                enrollments
            }
        };
    } catch (error) {
        console.error('Error getting student:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create new student
 */
async function createStudent(event, studentData) {
    try {
        const db = await getDatabase();

        const id = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        db.run(
            `INSERT INTO students (
        id, firstName, lastName, personalNumber, programId, programName,
        startYear, currentYear, specialization, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                studentData.firstName,
                studentData.lastName,
                studentData.personalNumber || null,
                studentData.programId || null,
                studentData.programName || null,
                studentData.startYear || new Date().getFullYear(),
                studentData.currentYear || 1,
                studentData.specialization || null,
                now,
                now
            ]
        );

        await saveDatabase();

        return { success: true, studentId: id };
    } catch (error) {
        console.error('Error creating student:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update student
 */
async function updateStudent(event, studentId, updates) {
    try {
        const db = await getDatabase();

        const allowedFields = [
            'firstName', 'lastName', 'personalNumber', 'programId', 'programName',
            'startYear', 'currentYear', 'specialization'
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

        setClauses.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(studentId);

        db.run(
            `UPDATE students SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error updating student:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete student
 */
async function deleteStudent(event, studentId) {
    try {
        const db = await getDatabase();

        db.run('DELETE FROM students WHERE id = ?', [studentId]);
        // Enrollments will be cascade deleted due to FK constraint

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error deleting student:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add enrollment (enroll student in course)
 */
async function addEnrollment(event, enrollmentData) {
    try {
        const db = await getDatabase();

        const id = `enrollment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        // Get course details to denormalize
        let courseName = enrollmentData.courseName;
        let courseCode = enrollmentData.courseCode;
        let syllabusCode = enrollmentData.syllabusCode;
        let credits = enrollmentData.credits;

        if (enrollmentData.courseId && !courseName) {
            const courseResult = db.exec('SELECT * FROM courses WHERE id = ?', [enrollmentData.courseId]);
            if (courseResult.length && courseResult[0].values.length) {
                const cols = courseResult[0].columns;
                const course = {};
                cols.forEach((col, i) => {
                    course[col] = courseResult[0].values[0][i];
                });
                courseName = course.name;
                courseCode = course.courseCode;
                syllabusCode = course.syllabusCode;
                credits = course.credits;
            }
        }

        const grade = enrollmentData.grade || null;
        const gradePoints = grade ? getGradePoints(grade) : null;

        db.run(
            `INSERT INTO enrollments (
        id, studentId, courseId, teacherId, courseName, courseCode, syllabusCode,
        credits, status, semester, year, grade, gradePoints, givesMeritPoints,
        meritPointValue, meritCategory, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                enrollmentData.studentId,
                enrollmentData.courseId || null,
                enrollmentData.teacherId || null,
                courseName,
                courseCode,
                syllabusCode,
                credits,
                enrollmentData.status || 'ongoing',
                enrollmentData.semester || null,
                enrollmentData.year || null,
                grade,
                gradePoints,
                enrollmentData.givesMeritPoints || 0,
                enrollmentData.meritPointValue || 0,
                enrollmentData.meritCategory || null,
                now,
                now
            ]
        );

        await saveDatabase();

        return { success: true, enrollmentId: id };
    } catch (error) {
        console.error('Error adding enrollment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update enrollment (change grade, status, etc.)
 */
async function updateEnrollment(event, enrollmentId, updates) {
    try {
        const db = await getDatabase();

        const allowedFields = [
            'teacherId', 'status', 'semester', 'year', 'grade',
            'givesMeritPoints', 'meritPointValue', 'meritCategory'
        ];

        const setClauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = ?`);
                values.push(value);

                // Auto-calculate gradePoints if grade is updated
                if (key === 'grade') {
                    setClauses.push('gradePoints = ?');
                    values.push(getGradePoints(value));
                }
            }
        }

        if (setClauses.length === 0) {
            return { success: false, error: 'No valid fields to update' };
        }

        setClauses.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(enrollmentId);

        db.run(
            `UPDATE enrollments SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error updating enrollment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove enrollment
 */
async function removeEnrollment(event, enrollmentId) {
    try {
        const db = await getDatabase();

        db.run('DELETE FROM enrollments WHERE id = ?', [enrollmentId]);

        await saveDatabase();

        return { success: true };
    } catch (error) {
        console.error('Error removing enrollment:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    listStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    addEnrollment,
    updateEnrollment,
    removeEnrollment,
    calculateStudentStats
};
