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

function runScheduleSolver(payload, timeoutMs = 300000) { // 5 minute default timeout
  return new Promise((resolve, reject) => {
    // Log payload summary for debugging (be careful not to log huge payloads)
    console.error('[Z3 Solver] Starting solver with payload:', {
      hasTerm: !!payload.term,
      hasConstraints: !!payload.constraints,
      hasLessonTemplates: !!payload.lessonTemplates,
      lessonTemplatesCount: payload.lessonTemplates?.length || 0,
      hasTimeSlots: !!payload.timeSlots,
      timeSlotsCount: payload.timeSlots?.length || 0,
      termDailySlotsCount: payload.term?.dailySlots?.length || 0
    });
    
    const pythonBinary = pickPythonBinary();
    const solverPath = path.join(__dirname, 'solver', 'z3_schedule_solver.py');
    
    console.error('[Z3 Solver] Using Python binary:', pythonBinary);
    console.error('[Z3 Solver] Solver path:', solverPath);

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
        // Give it a moment to clean up, then force kill
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 2000);
        reject(new Error(`Z3 solver timeout after ${timeoutMs / 1000} seconds. The constraints may be too restrictive or the problem too complex. Try relaxing constraints or reducing the number of sessions.`));
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      // Log progress if debug mode
      if (payload?.debug) {
        console.log('[Z3 Solver] stdout chunk:', chunk.toString().substring(0, 200));
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      // Always log stderr for debugging
      console.error('[Z3 Solver] stderr:', chunk.toString());
    });

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isResolved) {
        isResolved = true;
        reject(new Error(`Failed to start Z3 solver: ${error.message}`));
      }
    });

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (isResolved) return; // Already handled by timeout
      
      isResolved = true;
      
      // Log stderr for debugging
      if (stderr.trim()) {
        console.error('[Z3 Solver] stderr output:', stderr.trim());
      }
      
      if (!stdout.trim() && stderr.trim()) {
        console.error('[Z3 Solver] No stdout, but stderr exists:', stderr.trim());
        reject(new Error(`Z3 solver error: ${stderr.trim() || `exit code ${code}`}`));
        return;
      }
      
      if (!stdout.trim()) {
        console.error('[Z3 Solver] No stdout and no stderr, exit code:', code);
        reject(new Error(`Z3 solver produced no output. Exit code: ${code}`));
        return;
      }

      try {
        // Log raw output for debugging
        console.error('[Z3 Solver] Raw stdout length:', stdout.length);
        console.error('[Z3 Solver] Raw stdout (first 500 chars):', stdout.substring(0, 500));
        console.error('[Z3 Solver] Raw stderr:', stderr.trim());
        console.error('[Z3 Solver] Exit code:', code);
        
        const result = JSON.parse(stdout || '{}');
        
        console.error('[Z3 Solver] Parsed result:', {
          success: result.success,
          hasError: !!result.error,
          error: result.error,
          hasDetails: !!result.details,
          details: result.details,
          resultKeys: Object.keys(result)
        });

        if (result.success === false) {
          // Include both the error message and stderr if available for better debugging
          const errorMessage = result.error || 'Z3 solver reported an error.';
          
          console.error('[Z3 Solver] Error detected:', {
            errorMessage,
            hasStderr: !!stderr.trim(),
            stderrLength: stderr.trim().length,
            hasDetails: !!result.details,
            details: result.details
          });
          
          // Build a comprehensive error message that includes all available information
          // This ensures the actual error is preserved even if IPC doesn't preserve custom properties
          let fullMessage = errorMessage;
          
          // Add stderr if it contains useful information (and is different from the error message)
          if (stderr.trim() && !stderr.trim().includes(errorMessage)) {
            const stderrPreview = stderr.trim().substring(0, 500);
            fullMessage = `${errorMessage} [stderr: ${stderrPreview}]`;
          }
          
          // Add details if available
          if (result.details && result.details !== errorMessage) {
            fullMessage = `${fullMessage} [details: ${result.details}]`;
          }
          
          // If we still have the generic message and there's stderr, prioritize stderr
          if (fullMessage === 'Z3 solver reported an error.' && stderr.trim()) {
            fullMessage = `Z3 solver error: ${stderr.trim().substring(0, 500)}`;
          }
          
          console.error('[Z3 Solver] Final error message:', fullMessage);
          
          const error = new Error(fullMessage);
          error.details = result.details;
          error.originalError = result.error;
          error.stderr = stderr.trim();
          error.exitCode = code;
          error.rawStdout = stdout.substring(0, 1000); // First 1000 chars for debugging
          reject(error);
          return;
        }

        resolve(result);
      } catch (parseError) {
        console.error('[Z3 Solver] JSON parse error:', {
          parseError: parseError.message,
          stdoutLength: stdout.length,
          stdoutPreview: stdout.substring(0, 500),
          stderr: stderr.trim().substring(0, 500),
          exitCode: code
        });
        
        const errorMessage = `Unable to parse Z3 solver output. ${parseError.message}.`;
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
        reject(new Error(`Failed to send data to Z3 solver: ${writeError.message}`));
      }
    }
  });
}

module.exports = {
  runScheduleSolver,
};

