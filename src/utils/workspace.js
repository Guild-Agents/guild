import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';

const WORKSPACE_FILE = 'guild-workspace.json';

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
