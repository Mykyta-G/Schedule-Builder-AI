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
    const pythonBinary = pickPythonBinary();
    const solverPath = path.join(__dirname, 'solver', 'z3_schedule_solver.py');

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
      
      if (!stdout.trim() && stderr.trim()) {
        reject(new Error(`Z3 solver error: ${stderr.trim() || `exit code ${code}`}`));
        return;
      }

      try {
        const result = JSON.parse(stdout || '{}');

        if (result.success === false) {
          const message = result.error || 'Z3 solver reported an error.';
          const error = new Error(message);
          error.details = result.details;
          reject(error);
          return;
        }

        resolve(result);
      } catch (parseError) {
        reject(
          new Error(
            `Unable to parse Z3 solver output. ${parseError.message}. Raw output: ${stdout.substring(0, 500) || '(empty)'}`
          )
        );
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

