const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function parseSchoolSoft({ html, url }) {
    try {
        // SAVE HTML FOR DEBUGGING
        const debugPath = path.join(__dirname, '..', 'debug_schoolsoft.html');
        fs.writeFileSync(debugPath, html);
        console.log('Saved debug HTML to:', debugPath);

        // Detect user role from URL
        let userRole = 'student'; // default
        if (url) {
            if (url.includes('right_teacher_startpage.jsp') || url.includes('/teacher/')) {
                userRole = 'teacher';
            } else if (url.includes('right_principal_startpage.jsp') || url.includes('/principal/') || url.includes('/rektor/')) {
                userRole = 'principal';
            } else if (url.includes('right_student_startpage.jsp') || url.includes('/student/')) {
                userRole = 'student';
            }
        }
        console.log(`DEBUG: Detected user role: ${userRole} (from URL: ${url})`);

        const $ = cheerio.load(html);
        const classes = [];
        const teachersMap = new Map(); // Track unique teachers
        const studentsMap = new Map(); // Track unique students/groups
        
        // For principals/teachers, also try to extract comprehensive teacher and student lists
        // Look for dropdown menus, select lists, or table rows that contain all teachers/students
        if (userRole === 'principal' || userRole === 'teacher') {
            console.log('DEBUG: Principal/Teacher detected - attempting to extract comprehensive lists...');
            
            // Try to find teacher lists in dropdowns, selects, or tables
            const teacherSelectors = [
                'select[name*="teacher"] option',
                'select[id*="teacher"] option',
                'select[class*="teacher"] option',
                'table.teachers tr',
                'table.teacher-list tr',
                '[class*="teacher-list"] tr',
                '[id*="teacher-list"] tr',
                'ul.teachers li',
                '.teacher-item',
                '[data-role="teacher"]'
            ];
            
            for (const selector of teacherSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    console.log(`DEBUG: Found ${elements.length} potential teacher elements with selector: ${selector}`);
                    elements.each((i, el) => {
                        const $el = $(el);
                        const text = $el.text().trim();
                        const value = $el.attr('value') || $el.attr('data-value') || text;
                        
                        // Extract teacher name/initials (skip empty, "Select teacher", etc.)
                        if (text && text.length > 0 && text.length < 50 && 
                            !text.toLowerCase().includes('välj') && 
                            !text.toLowerCase().includes('select') &&
                            !text.toLowerCase().includes('alla')) {
                            
                            // Try to extract initials or name
                            const teacherMatch = text.match(/([A-Z]{1,3}[A-Z0-9]{0,3})/); // Match initials like "JN", "AB", etc.
                            if (teacherMatch) {
                                const teacherId = teacherMatch[1];
                                if (!teachersMap.has(teacherId)) {
                                    teachersMap.set(teacherId, {
                                        initials: teacherId,
                                        subjects: new Set(),
                                        classes: new Set(),
                                        fullName: text // Store full name if available
                                    });
                                    console.log(`DEBUG: Added teacher from list: ${teacherId} (${text})`);
                                }
                            } else if (text.length > 1 && text.length < 30) {
                                // If no initials pattern, use first part as ID
                                const teacherId = text.split(/\s+/)[0].substring(0, 5);
                                if (!teachersMap.has(teacherId)) {
                                    teachersMap.set(teacherId, {
                                        initials: teacherId,
                                        subjects: new Set(),
                                        classes: new Set(),
                                        fullName: text
                                    });
                                    console.log(`DEBUG: Added teacher from list: ${teacherId} (${text})`);
                                }
                            }
                        }
                    });
                    if (elements.length > 0) break; // Found something, stop trying other selectors
                }
            }
            
            // Try to find student/class lists
            const studentSelectors = [
                'select[name*="student"] option',
                'select[name*="class"] option',
                'select[name*="group"] option',
                'select[id*="student"] option',
                'select[id*="class"] option',
                'table.classes tr',
                'table.student-list tr',
                '[class*="class-list"] tr',
                '[class*="student-list"] tr',
                'ul.classes li',
                '.class-item',
                '[data-role="student"]',
                '[data-role="class"]'
            ];
            
            for (const selector of studentSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    console.log(`DEBUG: Found ${elements.length} potential student/class elements with selector: ${selector}`);
                    elements.each((i, el) => {
                        const $el = $(el);
                        const text = $el.text().trim();
                        
                        // Extract class codes (e.g., "TE4", "NA23A")
                        if (text && text.length > 0 && text.length < 20 &&
                            !text.toLowerCase().includes('välj') &&
                            !text.toLowerCase().includes('select') &&
                            !text.toLowerCase().includes('alla')) {
                            
                            // Match class code pattern
                            const classMatch = text.match(/([A-Z][A-Z0-9]{1,5})/);
                            if (classMatch) {
                                const className = classMatch[1];
                                if (!studentsMap.has(className)) {
                                    studentsMap.set(className, {
                                        className: className,
                                        subjects: new Set(),
                                        teachers: new Set(),
                                        fullName: text
                                    });
                                    console.log(`DEBUG: Added student class from list: ${className} (${text})`);
                                }
                            }
                        }
                    });
                    if (elements.length > 0) break; // Found something, stop trying other selectors
                }
            }
            
            console.log(`DEBUG: Extracted ${teachersMap.size} teachers and ${studentsMap.size} student classes from lists`);
        }

        // Try multiple selectors based on role
        // Primary selector for student pages
        let lessons = $('.cal-lesson');
        console.log(`DEBUG: Found ${lessons.length} .cal-lesson elements`);

        // If no lessons found with primary selector, try alternative selectors
        if (lessons.length === 0) {
            console.log('DEBUG: No .cal-lesson elements found, trying alternative selectors...');
            
            // Try alternative selectors that might work for teacher/principal pages
            const alternativeSelectors = [
                '.lesson',
                '.schedule-item',
                '.calendar-item',
                '[class*="lesson"]',
                '[class*="schedule"]',
                '[class*="calendar"]',
                '.event',
                '[class*="event"]',
                'tr[class*="lesson"]',
                'div[class*="cal-"]'
            ];
            
            for (const selector of alternativeSelectors) {
                lessons = $(selector);
                if (lessons.length > 0) {
                    console.log(`DEBUG: Found ${lessons.length} elements with selector: ${selector}`);
                    break;
                }
            }
            
            if (lessons.length === 0) {
                console.warn('DEBUG: No schedule elements found with any selector');
                // Still continue to try parsing, but will return empty classes
            }
        }

        lessons.each((i, el) => {
            try {
                const $el = $(el);
                const $link = $el.find('a');
                const titleAttr = $link.attr('title') || '';
                const href = $link.attr('href') || '';

                if (i === 0) {
                    console.log('DEBUG: First lesson href:', href);
                    console.log('DEBUG: First lesson title:', titleAttr);
                }

                // Extract Date from href (e.g., ...date=2025-11-24...)
                const dateMatch = href.match(/date=(\d{4}-\d{2}-\d{2})/);
                const dateStr = dateMatch ? dateMatch[1] : null;

                if (!dateStr) {
                    if (i === 0) console.log('DEBUG: No date found in href');
                    return; // Skip if no date found
                }

                // Parse Title Attribute
                // Format: header=[Lektion 8:30-9:50 SUBJECT] body=[Personal: JN<br />Sal: TE4...]

                // Extract Time and Subject from Header
                const headerMatch = titleAttr.match(/header=\[Lektion (\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.*?)\]/);
                let startTime = '00:00';
                let endTime = '00:00';
                let subject = 'Unknown';

                // Helper to padlock times (8:30 -> 08:30)
                const padTime = (t) => t.split(':').map(p => p.padStart(2, '0')).join(':');

                if (headerMatch) {
                    startTime = padTime(headerMatch[1]);
                    endTime = padTime(headerMatch[2]);
                    subject = headerMatch[3];
                } else {
                    // Fallback: Try to get text from the box
                    const text = $el.find('.dayViewDetailedTextBox').text().trim();
                    // Try to parse "8:30-9:50 SUBJECT"
                    const textMatch = text.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.*)/);
                    if (textMatch) {
                        startTime = padTime(textMatch[1]);
                        endTime = padTime(textMatch[2]);
                        subject = textMatch[3];
                    } else {
                        if (i === 0) console.log('DEBUG: Could not parse header or text box');
                    }
                }

                // Extract Details from Body (handle newlines or br tags)
                const teacherMatch = titleAttr.match(/Personal:\s*(.*?)[\n<&]/);
                const teacher = teacherMatch ? teacherMatch[1].trim() : '';

                const roomMatch = titleAttr.match(/Sal:\s*(.*?)[\n<&]/);
                const room = roomMatch ? roomMatch[1].trim() : '';

                const groupMatch = titleAttr.match(/Grupp:\s*(.*?)[\n<&]/);
                const group = groupMatch ? groupMatch[1].trim() : '';

                // Determine Day of Week from Date
                // Use T12:00:00 to avoid timezone shifts
                const dateObj = new Date(dateStr + 'T12:00:00');
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = days[dateObj.getDay()];

                // Track unique teachers
                if (teacher && teacher !== '-' && teacher.length > 0) {
                    // Parse teacher initials/names (e.g., "JN", "AB, CD", etc.)
                    const teacherParts = teacher.split(/[,;]/).map(t => t.trim()).filter(Boolean);
                    teacherParts.forEach(t => {
                        if (!teachersMap.has(t)) {
                            teachersMap.set(t, {
                                initials: t,
                                subjects: new Set(),
                                classes: new Set()
                            });
                        }
                        const teacherData = teachersMap.get(t);
                        teacherData.subjects.add(subject);
                        if (group) teacherData.classes.add(group);
                    });
                }

                // Track student groups/classes
                if (group && group !== '-' && group.length > 0) {
                    // Parse groups (e.g., "TE23A", "NA22B")
                    const groupTokens = group.split(/[\s,;]+/).filter(Boolean);
                    groupTokens.forEach(g => {
                        // Check if it looks like a class code (2-6 chars, starts with letter)
                        if (/^[A-Z][A-Z0-9]{1,5}$/.test(g)) {
                            if (!studentsMap.has(g)) {
                                studentsMap.set(g, {
                                    className: g,
                                    subjects: new Set(),
                                    teachers: new Set()
                                });
                            }
                            const studentData = studentsMap.get(g);
                            studentData.subjects.add(subject);
                            if (teacher) studentData.teachers.add(teacher);
                        }
                    });
                }

                classes.push({
                    subject: subject,
                    startTime: startTime,
                    endTime: endTime,
                    day: dayName,
                    room: room,
                    teacher: teacher,
                    group: group,
                    date: dateStr // Keep exact date if needed later
                });

            } catch (err) {
                console.error('Error parsing lesson:', err);
            }
        });

        console.log(`Found ${classes.length} classes`);

        // If no classes found, provide helpful error message
        if (classes.length === 0) {
            const errorMessage = userRole === 'teacher' || userRole === 'principal'
                ? `No schedule data found. Please make sure you are on a schedule/calendar page. Teachers and principals may need to navigate to their schedule view first.`
                : `No schedule data found. Please make sure you are on the schedule page with lessons visible.`;
            
            console.error('Parsing failed:', errorMessage);
            return { 
                success: false, 
                error: errorMessage,
                userRole: userRole,
                url: url
            };
        }

        // Extract Student Class from header (e.g., "TE4")
        // Selector based on debug HTML: span.MuiTypography-caption
        let studentClass = 'My Class';
        const classEl = $('.MuiTypography-caption').first();
        if (classEl.length) {
            const text = classEl.text().trim();
            if (text && text !== '-') {
                studentClass = text;
            }
        }
        
        // For teacher/principal pages, try alternative selectors for class/group name
        if ((studentClass === 'My Class' || studentClass === '-') && (userRole === 'teacher' || userRole === 'principal')) {
            const alternativeClassSelectors = [
                '.class-name',
                '[class*="class"]',
                '[class*="group"]',
                '.group-name',
                'h1', 'h2', 'h3'
            ];
            
            for (const selector of alternativeClassSelectors) {
                const altEl = $(selector).first();
                if (altEl.length) {
                    const text = altEl.text().trim();
                    if (text && text !== '-' && text.length < 20) { // Reasonable class name length
                        studentClass = text;
                        console.log(`DEBUG: Found class name using alternative selector ${selector}: ${studentClass}`);
                        break;
                    }
                }
            }
        }

        // Fallback: Infer class from lesson groups if not found in header
        if (studentClass === 'My Class' || studentClass === '-') {
            const groupCounts = {};
            classes.forEach(c => {
                if (c.group) {
                    // Split by space and count tokens
                    const tokens = c.group.split(/\s+/);
                    tokens.forEach(token => {
                        // Filter for likely class names (e.g., alphanumeric, starts with uppercase, length 2-6)
                        if (/^[A-Z][A-Z0-9]{1,5}$/.test(token)) {
                            groupCounts[token] = (groupCounts[token] || 0) + 1;
                        }
                    });
                }
            });

            // Find the most frequent token
            let maxCount = 0;
            let bestCandidate = null;
            for (const [token, count] of Object.entries(groupCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestCandidate = token;
                }
            }

            if (bestCandidate) {
                studentClass = bestCandidate;
            }
        }
        console.log('DEBUG: Found student class:', studentClass);

        // Convert teachers map to array
        const teachers = Array.from(teachersMap.entries()).map(([initials, data]) => ({
            initials,
            subjects: Array.from(data.subjects),
            classes: Array.from(data.classes)
        }));

        // Convert students map to array
        const studentGroups = Array.from(studentsMap.entries()).map(([className, data]) => ({
            className,
            subjects: Array.from(data.subjects),
            teachers: Array.from(data.teachers)
        }));

        console.log(`DEBUG: Extracted ${teachers.length} unique teachers`);
        console.log(`DEBUG: Extracted ${studentGroups.length} unique student groups`);

        return {
            success: true,
            data: {
                classes,
                studentClass,
                teachers, // NEW: Array of teacher data
                studentGroups, // NEW: Array of student group/class data
                userRole: userRole // Include detected role for debugging
            }
        };
    } catch (error) {
        console.error('Parsing error:', error);
        const errorMessage = error.message || 'Unknown parsing error occurred';
        return { 
            success: false, 
            error: errorMessage,
            details: error.stack
        };
    }
}

module.exports = { parseSchoolSoft };
