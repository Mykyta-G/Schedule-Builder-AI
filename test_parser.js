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
            console.log('Student Class:', result.data.studentClass);

            if (result.data.studentClass === 'EK2C') {
                console.log('SUCCESS: Correctly inferred class "EK2C"');
            } else {
                console.log('FAILURE: Expected "EK2C", got "' + result.data.studentClass + '"');
            }
        } else {
            console.log('Parser failed:', result.error);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
