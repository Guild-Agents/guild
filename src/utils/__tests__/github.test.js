import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { isGhAvailable, setupGithubLabels, assignIssue, commentIssue, closeIssue, createBugIssue } from '../github.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isGhAvailable', () => {
  it('returns true when gh auth status succeeds', () => {
    execFileSync.mockReturnValue('');
    expect(isGhAvailable()).toBe(true);
    expect(execFileSync).toHaveBeenCalledWith('gh', ['auth', 'status'], { stdio: 'ignore' });
  });

  it('returns false when gh auth status throws', () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    expect(isGhAvailable()).toBe(false);
  });

  it('passes array args, not a shell string', () => {
    execFileSync.mockReturnValue('');
    isGhAvailable();
    const [cmd, args] = execFileSync.mock.calls[0];
    expect(cmd).toBe('gh');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toEqual(['auth', 'status']);
  });
});

describe('setupGithubLabels', () => {
  it('skips when gh is not available', async () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await setupGithubLabels('https://github.com/owner/repo');
    // Only the isGhAvailable call should have been made
    expect(execFileSync).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('creates 6 labels with array args when gh is available', async () => {
    execFileSync.mockReturnValue('');
    await setupGithubLabels('https://github.com/owner/repo');
    // 1 call for isGhAvailable + 6 label creates
    expect(execFileSync).toHaveBeenCalledTimes(7);

    // Verify the first label create call uses array args
    const labelCall = execFileSync.mock.calls[1];
    expect(labelCall[0]).toBe('gh');
    expect(Array.isArray(labelCall[1])).toBe(true);
    expect(labelCall[1]).toContain('label');
    expect(labelCall[1]).toContain('create');
    expect(labelCall[1]).toContain('--repo');
    expect(labelCall[1]).toContain('owner/repo');
  });

  it('skips when repo URL is invalid', async () => {
    execFileSync.mockReturnValue('');
    await setupGithubLabels('not-a-github-url');
    // Only the isGhAvailable call
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });

  it('continues when a single label creation fails', async () => {
    let callCount = 0;
    execFileSync.mockImplementation(() => {
      callCount++;
      // Let isGhAvailable succeed (first call), fail on second label
      if (callCount === 3) throw new Error('label exists');
      return '';
    });
    await setupGithubLabels('https://github.com/owner/repo');
    // Should still attempt all 6 labels despite one failing
    expect(execFileSync).toHaveBeenCalledTimes(7);
  });
});

describe('assignIssue', () => {
  it('does nothing when gh is not available', () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    assignIssue(42, 'backlog', 'in-progress');
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });

  it('uses array args for assign and edit commands', () => {
    execFileSync.mockReturnValue('');
    assignIssue(42, 'backlog', 'in-progress');
    // 1 isGhAvailable + 1 assign + 1 edit
    expect(execFileSync).toHaveBeenCalledTimes(3);

    const assignCall = execFileSync.mock.calls[1];
    expect(assignCall[0]).toBe('gh');
    expect(assignCall[1]).toEqual(['issue', 'assign', '42', '--assignee', '@me']);

    const editCall = execFileSync.mock.calls[2];
    expect(editCall[0]).toBe('gh');
    expect(editCall[1]).toEqual([
      'issue', 'edit', '42',
      '--add-label', 'in-progress',
      '--remove-label', 'backlog',
    ]);
  });

  it('converts issueNumber to string', () => {
    execFileSync.mockReturnValue('');
    assignIssue(123, 'a', 'b');
    const assignCall = execFileSync.mock.calls[1];
    expect(assignCall[1][2]).toBe('123');
    expect(typeof assignCall[1][2]).toBe('string');
  });
});

describe('commentIssue', () => {
  it('does nothing when gh is not available', () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    commentIssue(1, 'some comment');
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });

  it('passes body as array element, not shell-interpolated', () => {
    execFileSync.mockReturnValue('');
    const maliciousBody = '"; rm -rf / #';
    commentIssue(1, maliciousBody);

    const commentCall = execFileSync.mock.calls[1];
    expect(commentCall[0]).toBe('gh');
    expect(commentCall[1]).toEqual([
      'issue', 'comment', '1', '--body', '"; rm -rf / #',
    ]);
    // The malicious string is passed as a single array element,
    // not interpolated into a shell command
    expect(commentCall[1][4]).toBe(maliciousBody);
  });
});

describe('closeIssue', () => {
  it('does nothing when gh is not available', () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    closeIssue(5, 'closing reason');
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });

  it('uses array args with comment as separate element', () => {
    execFileSync.mockReturnValue('');
    closeIssue(5, 'Fixed in PR #10');

    const closeCall = execFileSync.mock.calls[1];
    expect(closeCall[0]).toBe('gh');
    expect(closeCall[1]).toEqual([
      'issue', 'close', '5', '--comment', 'Fixed in PR #10',
    ]);
  });
});

describe('createBugIssue', () => {
  it('returns null when gh is not available', () => {
    execFileSync.mockImplementation(() => { throw new Error('not found'); });
    const result = createBugIssue('title', 'body');
    expect(result).toBeNull();
  });

  it('returns issue number and URL on success', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      if (args[0] === 'issue' && args[1] === 'create') {
        return 'https://github.com/owner/repo/issues/99\n';
      }
      return '';
    });

    const result = createBugIssue('Bug title', 'Bug body');
    expect(result).toEqual({
      number: '99',
      url: 'https://github.com/owner/repo/issues/99',
    });
  });

  it('passes title and body as array elements to prevent injection', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      if (args[0] === 'issue' && args[1] === 'create') {
        return 'https://github.com/owner/repo/issues/1\n';
      }
      return '';
    });

    const maliciousTitle = '$(whoami)';
    const maliciousBody = '`cat /etc/passwd`';
    createBugIssue(maliciousTitle, maliciousBody);

    const createCall = execFileSync.mock.calls[1];
    expect(createCall[0]).toBe('gh');
    expect(createCall[1]).toEqual([
      'issue', 'create',
      '--title', '$(whoami)',
      '--body', '`cat /etc/passwd`',
      '--label', 'bug',
    ]);
    // Verify shell metacharacters are passed as literal strings
    expect(createCall[1][3]).toBe(maliciousTitle);
    expect(createCall[1][5]).toBe(maliciousBody);
  });

  it('comments on parent issue when parentIssueNumber is provided', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      if (args[0] === 'issue' && args[1] === 'create') {
        return 'https://github.com/owner/repo/issues/50\n';
      }
      return '';
    });

    createBugIssue('Bug', 'Description', 10);

    // Find the comment call (after auth check and issue create)
    const commentCalls = execFileSync.mock.calls.filter(
      ([_cmd, args]) => args[0] === 'issue' && args[1] === 'comment'
    );
    expect(commentCalls).toHaveLength(1);
    expect(commentCalls[0][1]).toContain('--body');
    expect(commentCalls[0][1][4]).toContain('Bug encontrado:');
  });

  it('does not comment when parentIssueNumber is not provided', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      if (args[0] === 'issue' && args[1] === 'create') {
        return 'https://github.com/owner/repo/issues/50\n';
      }
      return '';
    });

    createBugIssue('Bug', 'Description');

    const commentCalls = execFileSync.mock.calls.filter(
      ([_cmd, args]) => args[0] === 'issue' && args[1] === 'comment'
    );
    expect(commentCalls).toHaveLength(0);
  });

  it('returns null when issue creation fails', () => {
    execFileSync.mockImplementation((cmd, args) => {
      if (args[0] === 'auth') return '';
      throw new Error('creation failed');
    });

    const result = createBugIssue('title', 'body');
    expect(result).toBeNull();
  });
});
