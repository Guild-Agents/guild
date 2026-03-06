# Cross-Repo Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `guild workspace run` command to execute test/lint/build/custom commands in sibling repos.

**Architecture:** New `runInMember()` function in `src/utils/workspace.js` wraps `execFileSync` with `cwd` pointing to a member's directory. New `runWorkspaceCommand()` in `src/commands/workspace.js` resolves presets, handles `--all`, and collects results. CLI wiring in `bin/guild.js` adds the `run` subcommand under `workspace`.

**Tech Stack:** Node.js, ESModules, Commander.js, execFileSync, Vitest

---

### Task 1: `runInMember()` function with tests

**Files:**
- Modify: `src/utils/workspace.js`
- Modify: `src/utils/__tests__/workspace.test.js`

**Step 1: Write the failing tests**

Add a new `describe('runInMember')` block to `src/utils/__tests__/workspace.test.js`. Import `runInMember` from `../workspace.js`.

```javascript
describe('runInMember', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-run-')));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes a command in the member directory', () => {
    const member = { name: 'app', absolutePath: tempDir };
    const result = runInMember(member, 'node', ['-e', 'console.log("hello")']);
    expect(result.status).toBe('passed');
    expect(result.output).toContain('hello');
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.member).toBe('app');
  });

  it('captures failure with output', () => {
    const member = { name: 'app', absolutePath: tempDir };
    const result = runInMember(member, 'node', ['-e', 'process.exit(1)']);
    expect(result.status).toBe('failed');
    expect(result.member).toBe('app');
  });

  it('returns error when member directory does not exist', () => {
    const member = { name: 'ghost', absolutePath: join(tempDir, 'nonexistent') };
    const result = runInMember(member, 'node', ['-e', 'true']);
    expect(result.status).toBe('failed');
    expect(result.output).toContain('nonexistent');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/workspace.test.js`
Expected: FAIL — `runInMember` is not exported

**Step 3: Implement `runInMember()`**

Add to `src/utils/workspace.js`. Import `execFileSync` from `node:child_process` at the top.

```javascript
import { execFileSync } from 'node:child_process';

export const PRESET_COMMANDS = {
  test:  { cmd: 'npm', args: ['test'] },
  lint:  { cmd: 'npm', args: ['run', 'lint'] },
  build: { cmd: 'npm', args: ['run', 'build'] },
};

export function runInMember(member, cmd, args = []) {
  const start = Date.now();
  try {
    if (!existsSync(member.absolutePath)) {
      return {
        member: member.name,
        status: 'failed',
        output: `Directory not found: ${member.absolutePath}`,
        duration: 0,
      };
    }
    const output = execFileSync(cmd, args, {
      cwd: member.absolutePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      member: member.name,
      status: 'passed',
      output: output.trim(),
      duration: Date.now() - start,
    };
  } catch (err) {
    return {
      member: member.name,
      status: 'failed',
      output: (err.stdout || '') + (err.stderr || ''),
      duration: Date.now() - start,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/workspace.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/utils/workspace.js src/utils/__tests__/workspace.test.js
git commit -m "feat: add runInMember for cross-repo command execution"
```

---

### Task 2: `runWorkspaceCommand()` with tests + CLI wiring

**Files:**
- Modify: `src/commands/workspace.js`
- Modify: `src/commands/__tests__/workspace.test.js`
- Modify: `bin/guild.js`

**Step 1: Write the failing tests**

Add a new `describe('guild workspace run')` block to `src/commands/__tests__/workspace.test.js`. Import `runWorkspaceCommand` from `../workspace.js`.

```javascript
import { writeFileSync } from 'fs';

describe('guild workspace run', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-cmd-run-')));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs a preset command in a specific member', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);
    mkdirSync('app', { recursive: true });
    writeFileSync(join('app', 'package.json'), JSON.stringify({ scripts: { test: 'echo ok' } }));

    const results = await runWorkspaceCommand('app', 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0].member).toBe('app');
    expect(results[0].status).toBe('passed');
  });

  it('runs a custom command with --cmd', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);
    mkdirSync('app', { recursive: true });

    const results = await runWorkspaceCommand('app', null, { cmd: 'node -e "console.log(42)"' });
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('passed');
    expect(results[0].output).toContain('42');
  });

  it('runs in all siblings with --all', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./api', './web']);
    mkdirSync('api', { recursive: true });
    mkdirSync('web', { recursive: true });
    writeFileSync(join('api', 'package.json'), JSON.stringify({ scripts: { test: 'echo api-ok' } }));
    writeFileSync(join('web', 'package.json'), JSON.stringify({ scripts: { test: 'echo web-ok' } }));

    const results = await runWorkspaceCommand(null, 'test', { all: true });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'passed')).toBe(true);
  });

  it('throws when member is not found', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);

    await expect(runWorkspaceCommand('ghost', 'test', {}))
      .rejects.toThrow('not found');
  });

  it('throws when no preset and no --cmd given', async () => {
    const { createWorkspaceFile, runWorkspaceCommand } = await import('../workspace.js');
    await createWorkspaceFile('test', ['./app']);

    await expect(runWorkspaceCommand('app', null, {}))
      .rejects.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/commands/__tests__/workspace.test.js`
Expected: FAIL — `runWorkspaceCommand` is not exported

**Step 3: Implement `runWorkspaceCommand()`**

Add to `src/commands/workspace.js`:

```javascript
import { loadWorkspace, runInMember, PRESET_COMMANDS } from '../utils/workspace.js';

export async function runWorkspaceCommand(memberName, preset, options) {
  const workspace = loadWorkspace();
  if (!workspace) throw new Error('No workspace found. Run `guild workspace init` first.');

  // Resolve command
  let cmd, args;
  if (options.cmd) {
    const parts = options.cmd.split(/\s+/);
    cmd = parts[0];
    args = parts.slice(1);
  } else if (preset && PRESET_COMMANDS[preset]) {
    ({ cmd, args } = PRESET_COMMANDS[preset]);
  } else {
    throw new Error(`Unknown command: "${preset}". Use test, lint, build, or --cmd "...".`);
  }

  // Resolve members to run
  let targets;
  if (options.all) {
    targets = workspace.members;
  } else {
    const member = workspace.members.find(m => m.name === memberName);
    if (!member) {
      const available = workspace.members.map(m => m.name).join(', ');
      throw new Error(`Member "${memberName}" not found. Available: ${available}`);
    }
    targets = [member];
  }

  // Execute sequentially, collect all
  const results = [];
  for (const target of targets) {
    results.push(runInMember(target, cmd, args));
  }
  return results;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/commands/__tests__/workspace.test.js`
Expected: ALL PASS

**Step 5: Wire into `bin/guild.js`**

Add after the `guild workspace status` block (around line 226):

```javascript
// guild workspace run
workspaceCmd
  .command('run')
  .description('Run a command in a workspace member repo')
  .argument('[member]', 'Member name (or omit with --all)')
  .argument('[preset]', 'Preset command: test, lint, build')
  .option('--cmd <command>', 'Custom command to run')
  .option('--all', 'Run in all workspace members')
  .action(async (member, preset, options) => {
    try {
      const { runWorkspaceCommand } = await import('../src/commands/workspace.js');
      const results = await runWorkspaceCommand(member, preset, options);
      for (const r of results) {
        const icon = r.status === 'passed' ? '✅' : '❌';
        console.log(`${icon} ${r.member}: ${r.status} (${r.duration}ms)`);
        if (r.status === 'failed' && r.output) {
          console.log(r.output);
        }
      }
      const failed = results.filter(r => r.status === 'failed');
      if (failed.length > 0) process.exit(1);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });
```

**Step 6: Run full test suite and lint**

Run: `npm test && npm run lint`
Expected: ALL PASS, 0 lint errors

**Step 7: Commit**

```bash
git add src/commands/workspace.js src/commands/__tests__/workspace.test.js bin/guild.js
git commit -m "feat: add guild workspace run command for cross-repo execution"
```
