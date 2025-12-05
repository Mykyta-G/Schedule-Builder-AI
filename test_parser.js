const fs = require('fs');
const path = require('path');
const { parseSchoolSoft } = require('./backend/schoolSoftParser');

async function runTest() {
    try {
        const htmlPath = path.join(__dirname, 'debug_schoolsoft.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        console.log('Running parser on debug_schoolsoft.html...');
        const result = await parseSchoolSoft({ html, url: 'http://test.com' });

        if (result.success) {
            console.log('Parser success!');
            console.log('Found classes:', result.data.classes.length);

            // Count lessons per day
            const dayCounts = {};
            result.data.classes.forEach(c => {
                dayCounts[c.day] = (dayCounts[c.day] || 0) + 1;
                if (c.day === 'Monday') {
                    console.log(`Monday Lesson: ${c.subject} at ${c.startTime}-${c.endTime}`);
                }
            });
            console.log('Lessons per day:', dayCounts);

            console.log('Student Class:', result.data.studentClass);

            // REPRODUCE VIEWER PAGE LOGIC
            const classes = result.data.classes;
            // 1. Convert to blocks (SchoolSoftPreview)
            const blocks = classes.map((cls, idx) => ({
                id: `block-${Date.now()}-${idx}`,
                title: cls.subject,
                room: cls.room,
                teacher: cls.teacher,
                startTime: cls.startTime,
                endTime: cls.endTime,
                day: cls.day,
            }));

            // 2. ViewerPage: convertBlocksToSchedule
            const scheduleByDay = {};
            const timeToMinutes = (timeStr) => {
                const [hh, mm] = timeStr.split(':').map(Number);
                return hh * 60 + mm;
            };

            blocks.forEach((block, idx) => {
                let dayKey = block.day;
                // Skiping fix for dayKey mapping for now as it seems to be just "Monday"

                const entry = {
                    id: block.id,
                    name: block.title || 'Untitled',
                    startMinutes: timeToMinutes(block.startTime),
                    duration: timeToMinutes(block.endTime) - timeToMinutes(block.startTime),
                    teacher: block.teacher || '',
                    classroom: block.room || ''
                };

                if (!scheduleByDay[dayKey]) {
                    scheduleByDay[dayKey] = [];
                }
                scheduleByDay[dayKey].push(entry);
            });

            // 3. ViewerPage: normalizeScheduleResult
            // Mock timeSlots (empty as per SchoolSoft import)
            const timeSlots = [];
            const timeSlotsMap = {};
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const isWeekendKey = (d) => {
                const n = d.toLowerCase();
                return n === 'saturday' || n === 'sunday';
            };

            const normalized = {};

            Object.keys(scheduleByDay).forEach((dayKey) => {
                if (isWeekendKey(dayKey)) return;

                const entries = scheduleByDay[dayKey];
                const dayName = dayKey; // Simplification
                const dayTimeSlot = timeSlotsMap[dayName];

                const filteredEntries = entries.filter(entry => {
                    if (dayTimeSlot) {
                        const entryStart = entry.startMinutes;
                        const entryEnd = entryStart + entry.duration;
                        return entryStart >= dayTimeSlot.start && entryEnd <= dayTimeSlot.end;
                    }
                    return true;
                });

                normalized[dayKey] = filteredEntries;
            });

            console.log('--- REPRODUCTION RESULTS ---');
            Object.keys(normalized).forEach(day => {
                console.log(`${day}: ${normalized[day].length} lessons`);
            });

        } else {
            console.log('Parser failed:', result.error);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
