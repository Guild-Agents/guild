import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { findWorkspaceRoot, loadWorkspace, runInMember, PRESET_COMMANDS, WORKSPACE_FILE } from '../utils/workspace.js';

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

export function runWorkspaceCommand(memberName, preset, options) {
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

  // Resolve members
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
