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

function runScheduleSolver(payload) {
  return new Promise((resolve, reject) => {
    const pythonBinary = pickPythonBinary();
    const solverPath = path.join(__dirname, 'solver', 'z3_schedule_solver.py');

    const child = spawn(pythonBinary, [solverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start Z3 solver: ${error.message}`));
    });

    child.on('close', (code) => {
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
            `Unable to parse Z3 solver output. ${parseError.message}. Raw output: ${stdout || '(empty)'}`
          )
        );
      }
    });

    try {
      child.stdin.write(JSON.stringify(payload || {}));
      child.stdin.end();
    } catch (writeError) {
      child.kill();
      reject(new Error(`Failed to send data to Z3 solver: ${writeError.message}`));
    }
  });
}

module.exports = {
  runScheduleSolver,
};

