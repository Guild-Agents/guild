import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClaudeCodeProvider } from '../claude-code.js';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';

function mockExecFile(stdout = '', stderr = '', exitCode = 0) {
  execFile.mockImplementation((_cmd, _args, _opts, callback) => {
    if (callback) {
      if (exitCode !== 0) {
        const err = new Error(stderr);
        err.code = exitCode;
        err.stdout = stdout;
        err.stderr = stderr;
        callback(err);
      } else {
        callback(null, stdout, stderr);
      }
    }
    return { kill: vi.fn() };
  });
}

describe('createClaudeCodeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });
    expect(typeof provider).toBe('function');
  });

  it('calls claude CLI with -p flag, model, and prompt', async () => {
    mockExecFile('Agent output here');
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    const step = { id: 'eval', role: 'advisor', intent: 'Evaluate' };
    const dispatch = { model: 'claude-opus-4-6', tier: 'reasoning' };
    const context = 'Do the evaluation';

    await provider(step, dispatch, context);

    expect(execFile).toHaveBeenCalledOnce();
    const [cmd, args, opts] = execFile.mock.calls[0];
    expect(cmd).toBe('claude');
    expect(args).toContain('-p');
    expect(args).toContain(context);
    expect(args).toContain('--model');
    expect(args).toContain('claude-opus-4-6');
    expect(opts.cwd).toBe('/fake');
  });

  it('returns passed status on exit code 0', async () => {
    mockExecFile('Success output');
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    const result = await provider(
      { id: 's1', role: 'developer', intent: 'Implement' },
      { model: 'claude-sonnet-4-6', tier: 'execution' },
      'Write code'
    );

    expect(result.status).toBe('passed');
    expect(result.output).toBe('Success output');
  });

  it('returns failed status on non-zero exit code', async () => {
    mockExecFile('', 'Error occurred', 1);
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    const result = await provider(
      { id: 's1', role: 'developer', intent: 'Implement' },
      { model: 'claude-sonnet-4-6', tier: 'execution' },
      'Write code'
    );

    expect(result.status).toBe('failed');
    expect(result.output).toContain('Error occurred');
  });

  it('uses custom timeout when provided', async () => {
    mockExecFile('OK');
    const provider = createClaudeCodeProvider({
      projectRoot: '/fake',
      stepTimeout: 60000,
    });

    await provider(
      { id: 's1', role: 'advisor', intent: 'Eval' },
      { model: 'claude-opus-4-6', tier: 'reasoning' },
      'Prompt'
    );

    const opts = execFile.mock.calls[0][2];
    expect(opts.timeout).toBe(60000);
  });

  it('omits --model flag when dispatch.model is null', async () => {
    mockExecFile('OK');
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    await provider(
      { id: 's1', role: 'developer', intent: 'Implement' },
      { model: null, tier: null },
      'Prompt'
    );

    const args = execFile.mock.calls[0][1];
    expect(args).not.toContain('--model');
  });

  it('rejects with install message when CLI is not found (ENOENT)', async () => {
    execFile.mockImplementation((_cmd, _args, _opts, callback) => {
      const err = new Error('spawn claude ENOENT');
      err.code = 'ENOENT';
      callback(err);
      return { kill: vi.fn() };
    });

    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    await expect(
      provider(
        { id: 's1', role: 'developer', intent: 'Implement' },
        { model: 'claude-sonnet-4-6', tier: 'execution' },
        'Prompt'
      )
    ).rejects.toThrow('Claude Code CLI not found');
  });

  it('defaults timeout to 5 minutes', async () => {
    mockExecFile('OK');
    const provider = createClaudeCodeProvider({ projectRoot: '/fake' });

    await provider(
      { id: 's1', role: 'advisor', intent: 'Eval' },
      { model: 'claude-opus-4-6', tier: 'reasoning' },
      'Prompt'
    );

    const opts = execFile.mock.calls[0][2];
    expect(opts.timeout).toBe(300000);
  });
});
