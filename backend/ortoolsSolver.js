const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_PYTHON_BINARIES = ['python3', 'python'];

function pickPythonBinary() {
    if (process.env.SCHEDULE_BUILDER_PYTHON) {
        return process.env.SCHEDULE_BUILDER_PYTHON;
    }

    if (process.env.PYTHON_PATH) {
        return process.env.PYTHON_PATH;
    }

    return DEFAULT_PYTHON_BINARIES[0];
}

function runScheduleSolver(payload, timeoutMs = 60000) { // 1 minute default (much faster than Z3!)
    return new Promise((resolve, reject) => {
        // Log payload summary for debugging
        console.error('[OR-Tools Solver] Starting solver with payload:', {
            hasTerm: !!payload.term,
            hasConstraints: !!payload.constraints,
            hasLessonTemplates: !!payload.lessonTemplates,
            lessonTemplatesCount: payload.lessonTemplates?.length || 0,
            hasTimeSlots: !!payload.timeSlots,
            timeSlotsCount: payload.timeSlots?.length || 0,
            termDailySlotsCount: payload.term?.dailySlots?.length || 0
        });

        const pythonBinary = pickPythonBinary();
        const solverPath = path.join(__dirname, 'solver', 'ortools_schedule_solver.py');

        console.error('[OR-Tools Solver] Using Python binary:', pythonBinary);
        console.error('[OR-Tools Solver] Solver path:', solverPath);

        const child = spawn(pythonBinary, [solverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let timeoutId = null;
        let isResolved = false;

        // Set timeout
        timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 2000);
                reject(new Error(`OR-Tools solver timeout after ${timeoutMs / 1000} seconds. Try reducing the number of sessions or relaxing constraints.`));
            }
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
            if (payload?.debug) {
                console.log('[OR-Tools Solver] stdout chunk:', chunk.toString().substring(0, 200));
            }
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
            console.error('[OR-Tools Solver] stderr:', chunk.toString());
        });

        child.on('error', (error) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Failed to start OR-Tools solver: ${error.message}`));
            }
        });

        child.on('close', (code) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (isResolved) return;

            isResolved = true;

            if (stderr.trim()) {
                console.error('[OR-Tools Solver] stderr output:', stderr.trim());
            }

            if (!stdout.trim() && stderr.trim()) {
                console.error('[OR-Tools Solver] No stdout, but stderr exists:', stderr.trim());
                reject(new Error(`OR-Tools solver error: ${stderr.trim() || `exit code ${code}`}`));
                return;
            }

            if (!stdout.trim()) {
                console.error('[OR-Tools Solver] No output, exit code:', code);
                reject(new Error(`OR-Tools solver produced no output. Exit code: ${code}`));
                return;
            }

            try {
                console.error('[OR-Tools Solver] Raw stdout length:', stdout.length);
                console.error('[OR-Tools Solver] Exit code:', code);

                const result = JSON.parse(stdout || '{}');

                console.error('[OR-Tools Solver] Parsed result:', {
                    success: result.success,
                    hasError: !!result.error,
                    error: result.error,
                    meta: result.meta,
                    resultKeys: Object.keys(result)
                });

                if (result.success === false) {
                    const errorMessage = result.error || 'OR-Tools solver reported an error.';

                    let fullMessage = errorMessage;

                    if (stderr.trim() && !stderr.trim().includes(errorMessage)) {
                        const stderrPreview = stderr.trim().substring(0, 500);
                        fullMessage = `${errorMessage} [stderr: ${stderrPreview}]`;
                    }

                    if (result.details && result.details !== errorMessage) {
                        fullMessage = `${fullMessage} [details: ${result.details}]`;
                    }

                    console.error('[OR-Tools Solver] Final error message:', fullMessage);

                    const error = new Error(fullMessage);
                    error.details = result.details;
                    error.originalError = result.error;
                    error.stderr = stderr.trim();
                    error.exitCode = code;
                    reject(error);
                    return;
                }

                resolve(result);
            } catch (parseError) {
                console.error('[OR-Tools Solver] JSON parse error:', {
                    parseError: parseError.message,
                    stdoutPreview: stdout.substring(0, 500),
                    stderr: stderr.trim().substring(0, 500),
                    exitCode: code
                });

                const errorMessage = `Unable to parse OR-Tools output. ${parseError.message}.`;
                const fullMessage = stderr.trim()
                    ? `${errorMessage} stderr: ${stderr.trim().substring(0, 500)}`
                    : `${errorMessage} Raw output: ${stdout.substring(0, 1000) || '(empty)'}`;

                const error = new Error(fullMessage);
                error.parseError = parseError.message;
                error.rawStdout = stdout.substring(0, 2000);
                error.stderr = stderr.trim();
                error.exitCode = code;
                reject(error);
            }
        });

        try {
            child.stdin.write(JSON.stringify(payload || {}));
            child.stdin.end();
        } catch (writeError) {
            if (timeoutId) clearTimeout(timeoutId);
            child.kill();
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Failed to send data to OR-Tools solver: ${writeError.message}`));
            }
        }
    });
}

module.exports = {
    runScheduleSolver,
};
