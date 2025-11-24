const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function parseSchoolSoft({ html, url }) {
    try {
        // SAVE HTML FOR DEBUGGING
        const debugPath = path.join(__dirname, '..', 'debug_schoolsoft.html');
        fs.writeFileSync(debugPath, html);
        console.log('Saved debug HTML to:', debugPath);

        const $ = cheerio.load(html);
        const classes = [];

        // Find all lesson blocks
        const lessons = $('.cal-lesson');
        console.log(`DEBUG: Found ${lessons.length} .cal-lesson elements`);

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

                if (headerMatch) {
                    startTime = headerMatch[1];
                    endTime = headerMatch[2];
                    subject = headerMatch[3];
                } else {
                    // Fallback: Try to get text from the box
                    const text = $el.find('.dayViewDetailedTextBox').text().trim();
                    // Try to parse "8:30-9:50 SUBJECT"
                    const textMatch = text.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.*)/);
                    if (textMatch) {
                        startTime = textMatch[1];
                        endTime = textMatch[2];
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
                const dateObj = new Date(dateStr);
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = days[dateObj.getDay()];

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

        return {
            success: true,
            data: {
                classes,
                studentClass
            }
        };
    } catch (error) {
        console.error('Parsing error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { parseSchoolSoft };
