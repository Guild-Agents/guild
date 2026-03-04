import { execFile } from 'child_process';

const DEFAULT_TIMEOUT = 300000; // 5 minutes

function execFileAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (error, stdout, stderr) => {
      if (error && error.code === 'ENOENT') {
        reject(new Error(
          'Claude Code CLI not found. Install it with: npm install -g @anthropic-ai/claude-code'
        ));
        return;
      }
      resolve({
        stdout: stdout || (error && error.stdout) || '',
        stderr: stderr || (error && error.stderr) || '',
        exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
      });
    });
  });
}

export function createClaudeCodeProvider(config) {
  const { projectRoot, stepTimeout = DEFAULT_TIMEOUT } = config;

  return async function claudeCodeProvider(step, dispatch, context) {
    const args = [
      '-p', context,
      '--model', dispatch.model,
    ];

    const result = await execFileAsync('claude', args, {
      cwd: projectRoot,
      timeout: stepTimeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      status: result.exitCode === 0 ? 'passed' : 'failed',
      output: result.exitCode === 0 ? result.stdout : (result.stderr || result.stdout),
    };
  };
}
