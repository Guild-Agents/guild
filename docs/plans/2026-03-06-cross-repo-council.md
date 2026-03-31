# Cross-Repo Council Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When `/council` runs inside a workspace, automatically enrich each agent's prompt with sibling repo context (summary + absolute paths for free exploration).

**Architecture:** New `collectMemberContext()` function in `src/utils/workspace.js` reads CLAUDE.md, PROJECT.md, SESSION.md from each sibling and returns formatted markdown. The council skill template (`src/templates/skills/council/SKILL.md`) is updated to detect workspace membership and inject context in Step 2.

**Tech Stack:** Node.js, ESModules, Vitest, Markdown skill templates

---

### Task 1: `collectMemberContext()` function with tests

**Files:**
- Modify: `src/utils/workspace.js`
- Modify: `src/utils/__tests__/workspace.test.js`

**Step 1: Write the failing tests**

Add a new `describe('collectMemberContext')` block to `src/utils/__tests__/workspace.test.js`. Import `collectMemberContext` from `../workspace.js`.

```javascript
describe('collectMemberContext', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'guild-ws-ctx-')));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty string when workspace is null', () => {
    const result = collectMemberContext(null, 'app');
    expect(result).toBe('');
  });

  it('returns empty string when current member is the only member', () => {
    const config = {
      name: 'solo',
      members: [{ name: 'app', path: './app' }],
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));
    mkdirSync(join(tempDir, 'app'), { recursive: true });

    const workspace = loadWorkspace(tempDir);
    const result = collectMemberContext(workspace, 'app');
    expect(result).toBe('');
  });

  it('collects context from sibling with all three files', () => {
    const config = {
      name: 'my-product',
      members: [
        { name: 'backend', path: './backend' },
        { name: 'frontend', path: './frontend' },
      ],
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));

    const backendDir = join(tempDir, 'backend');
    const frontendDir = join(tempDir, 'frontend');
    mkdirSync(backendDir, { recursive: true });
    mkdirSync(frontendDir, { recursive: true });

    writeFileSync(join(frontendDir, 'PROJECT.md'), '## Project\n- **Stack:** React, Vite');
    writeFileSync(join(frontendDir, 'CLAUDE.md'), '## Project structure\nsrc/components/, src/api/');
    writeFileSync(join(frontendDir, 'SESSION.md'), '## Active session\n- **Current task:** migrating to React 19');

    const workspace = loadWorkspace(tempDir);
    const result = collectMemberContext(workspace, 'backend');

    expect(result).toContain('## Workspace: my-product');
    expect(result).toContain('### frontend');
    expect(result).toContain(frontendDir);
    expect(result).toContain('React, Vite');
    expect(result).toContain('migrating to React 19');
    expect(result).not.toContain('### backend');
  });

  it('handles sibling with missing files gracefully', () => {
    const config = {
      name: 'my-product',
      members: [
        { name: 'backend', path: './backend' },
        { name: 'frontend', path: './frontend' },
      ],
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));

    mkdirSync(join(tempDir, 'backend'), { recursive: true });
    mkdirSync(join(tempDir, 'frontend'), { recursive: true });
    // frontend has no PROJECT.md, CLAUDE.md, or SESSION.md

    const workspace = loadWorkspace(tempDir);
    const result = collectMemberContext(workspace, 'backend');

    expect(result).toContain('### frontend');
    expect(result).toContain('You can read any file under');
  });

  it('collects context from multiple siblings', () => {
    const config = {
      name: 'platform',
      members: [
        { name: 'api', path: './api' },
        { name: 'web', path: './web' },
        { name: 'mobile', path: './mobile' },
      ],
    };
    writeFileSync(join(tempDir, 'guild-workspace.json'), JSON.stringify(config));

    for (const name of ['api', 'web', 'mobile']) {
      const dir = join(tempDir, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'PROJECT.md'), `## Project\n- **Stack:** ${name}-stack`);
    }

    const workspace = loadWorkspace(tempDir);
    const result = collectMemberContext(workspace, 'api');

    expect(result).toContain('### web');
    expect(result).toContain('web-stack');
    expect(result).toContain('### mobile');
    expect(result).toContain('mobile-stack');
    expect(result).not.toContain('### api');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/workspace.test.js`
Expected: FAIL — `collectMemberContext` is not exported

**Step 3: Implement `collectMemberContext()`**

Add to `src/utils/workspace.js`:

```javascript
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
      const structureMatch = content.match(/## Project structure\n([\s\S]*?)(?=\n##|\n$|$)/);
      if (structureMatch) {
        lines.push(`- **Structure:** ${structureMatch[1].trim().split('\n')[0]}`);
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

  return lines.join('\n').trimEnd();
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/workspace.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/utils/workspace.js src/utils/__tests__/workspace.test.js
git commit -m "feat: add collectMemberContext for cross-repo council context"
```

---

### Task 2: Update council skill template for workspace awareness

**Files:**
- Modify: `src/templates/skills/council/SKILL.md`

**Step 1: Add workspace detection to Step 2**

In `src/templates/skills/council/SKILL.md`, modify the `### Step 2 — Convene agents` section. Insert workspace detection before agent invocation. The new Step 2 should read:

```markdown
### Step 2 — Convene agents

**Workspace detection:** Before invoking agents, check if the project is inside a workspace:
1. Look for a `guild-workspace.json` file by searching upward from the project root
2. If found, load the workspace config and identify which member this project is
3. Read CLAUDE.md, PROJECT.md, and SESSION.md from each sibling member repo
4. Build a workspace context block with:
   - Workspace name
   - Each sibling's stack, structure summary, and current task
   - Absolute paths so the agent can read any sibling file for deeper analysis

Invoke the 3 corresponding agents IN PARALLEL using Task tool with `model: "opus"` (all council agents use reasoning tier). Each agent:

1. Reads their `.claude/agents/[name].md` file to assume their role
2. Reads `CLAUDE.md` and `SESSION.md` for project context
3. **If in a workspace:** receives the workspace context block and considers cross-repo impact as part of their analysis. They may read files from sibling repos using the provided paths.
4. Analyzes the question from their specialized perspective
5. States their position with concrete arguments
```

**Step 2: Add workspace frontmatter step to workflow**

In the YAML frontmatter `workflow.steps`, add `workspace-context` step before agent steps:

```yaml
    - id: workspace-context
      role: system
      intent: "Detect workspace membership. If in a workspace, collect context from sibling repos (CLAUDE.md, PROJECT.md, SESSION.md) and build workspace context block."
      requires: [council-type]
      produces: [workspace-context]
      condition: in-workspace
```

Update agent steps to include `workspace-context` in their `requires`:

```yaml
    - id: agent-1
      requires: [user-question, council-type, workspace-context]
```

(Same for agent-2 and agent-3)

**Step 3: Run markdown lint**

Run: `npm run lint:md`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/templates/skills/council/SKILL.md
git commit -m "feat: add workspace awareness to council skill template"
```
