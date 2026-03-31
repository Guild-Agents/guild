import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execFileSync } from 'node:child_process';

export const WORKSPACE_FILE = 'guild-workspace.json';

export const PRESET_COMMANDS = {
  test:  { cmd: 'npm', args: ['test'] },
  lint:  { cmd: 'npm', args: ['run', 'lint'] },
  build: { cmd: 'npm', args: ['run', 'build'] },
};

export function findWorkspaceRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, WORKSPACE_FILE))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadWorkspace(startDir = process.cwd()) {
  const root = findWorkspaceRoot(startDir);
  if (!root) return null;

  const filePath = join(root, WORKSPACE_FILE);
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));

  return {
    ...raw,
    root,
    members: (raw.members || []).map(m => ({
      ...m,
      absolutePath: resolve(root, m.path),
    })),
  };
}

export function resolveWorkspaceAgents(workspace, localAgentsDir) {
  const agents = new Map();

  if (workspace?.shared?.agents) {
    const sharedDir = resolve(workspace.root, workspace.shared.agents);
    if (existsSync(sharedDir)) {
      for (const file of readdirSync(sharedDir).filter(f => f.endsWith('.md'))) {
        const name = file.replace('.md', '');
        agents.set(name, { name, path: join(sharedDir, file), source: 'workspace' });
      }
    }
  }

  if (existsSync(localAgentsDir)) {
    for (const file of readdirSync(localAgentsDir).filter(f => f.endsWith('.md'))) {
      const name = file.replace('.md', '');
      agents.set(name, { name, path: join(localAgentsDir, file), source: 'local' });
    }
  }

  return [...agents.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function generateWorkspaceContext(workspace, currentMemberName) {
  if (!workspace) return '';

  const otherMembers = workspace.members.filter(m => m.name !== currentMemberName);
  if (otherMembers.length === 0) return '';

  const lines = [
    '## Workspace context',
    `- **Workspace:** ${workspace.name}`,
    `- **Members:** ${workspace.members.map(m => m.name === currentMemberName ? `${m.name} (this)` : m.name).join(', ')}`,
  ];

  for (const member of otherMembers) {
    const projectMdPath = join(member.absolutePath, 'PROJECT.md');
    if (existsSync(projectMdPath)) {
      const content = readFileSync(projectMdPath, 'utf8');
      const stackMatch = content.match(/\*\*Stack:\*\*\s*(.+)/);
      if (stackMatch) {
        lines.push(`- **${member.name} stack:** ${stackMatch[1].trim()}`);
      }
    }
  }

  return lines.join('\n');
}

export function collectMemberContext(workspace, currentMemberName) {
  if (!workspace) return '';

  const siblings = workspace.members.filter(m => m.name !== currentMemberName);
  if (siblings.length === 0) return '';

  const lines = [`## Workspace: ${workspace.name}`, ''];

  for (const member of siblings) {
    lines.push(`### ${member.name} (sibling — ${member.absolutePath})`);

    const projectMdPath = join(member.absolutePath, 'PROJECT.md');
    if (existsSync(projectMdPath)) {
      const content = readFileSync(projectMdPath, 'utf8');
      const stackMatch = content.match(/\*\*Stack:\*\*\s*(.+)/);
      if (stackMatch) {
        lines.push(`- **Stack:** ${stackMatch[1].trim()}`);
      }
    }

    const claudeMdPath = join(member.absolutePath, 'CLAUDE.md');
    if (existsSync(claudeMdPath)) {
      const content = readFileSync(claudeMdPath, 'utf8');
      const structureMatch = content.match(/## Project structure\n(.+)/);
      if (structureMatch) {
        lines.push(`- **Structure:** ${structureMatch[1].trim()}`);
      }
    }

    const sessionMdPath = join(member.absolutePath, 'SESSION.md');
    if (existsSync(sessionMdPath)) {
      const content = readFileSync(sessionMdPath, 'utf8');
      const taskMatch = content.match(/\*\*Current task:\*\*\s*(.+)/);
      if (taskMatch) {
        lines.push(`- **Current task:** ${taskMatch[1].trim()}`);
      }
    }

    lines.push(`You can read any file under ${member.absolutePath}/ for deeper analysis.`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function runInMember(member, cmd, args) {
  if (!existsSync(member.absolutePath)) {
    return {
      member: member.name,
      status: 'failed',
      output: `Directory not found: ${member.absolutePath}`,
      duration: 0,
    };
  }

  const start = Date.now();
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: member.absolutePath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const duration = Date.now() - start;
    return {
      member: member.name,
      status: 'passed',
      output: stdout.trim(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    return {
      member: member.name,
      status: 'failed',
      output: (stdout + stderr).trim(),
      duration,
    };
  }
}
