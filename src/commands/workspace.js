import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { findWorkspaceRoot, WORKSPACE_FILE } from '../utils/workspace.js';

export async function createWorkspaceFile(name, memberPaths) {
  const members = memberPaths.map(p => ({
    name: basename(p),
    path: p,
  }));

  const config = {
    name,
    members,
    shared: {
      agents: '.guild/agents',
      skills: '.guild/skills',
    },
  };

  writeFileSync(WORKSPACE_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
  mkdirSync(join('.guild', 'agents'), { recursive: true });
  mkdirSync(join('.guild', 'skills'), { recursive: true });
}

export async function addWorkspaceMember(memberPath) {
  const root = findWorkspaceRoot();
  if (!root) throw new Error('No workspace found. Run `guild workspace init` first.');

  const filePath = join(root, WORKSPACE_FILE);
  const config = JSON.parse(readFileSync(filePath, 'utf8'));
  const name = basename(memberPath);

  if (config.members.some(m => m.path === memberPath || m.name === name)) {
    throw new Error(`"${name}" is already a member of this workspace.`);
  }

  config.members.push({ name, path: memberPath });
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export async function getWorkspaceStatus() {
  const root = findWorkspaceRoot();
  if (!root) throw new Error('No workspace found. Run `guild workspace init` first.');

  const filePath = join(root, WORKSPACE_FILE);
  const config = JSON.parse(readFileSync(filePath, 'utf8'));

  const members = config.members.map(m => {
    const absPath = join(root, m.path);
    const initialized = existsSync(join(absPath, '.claude'));
    return { ...m, absolutePath: absPath, initialized };
  });

  return { name: config.name, root, members };
}
