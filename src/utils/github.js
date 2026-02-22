/**
 * github.js — Integración con GitHub CLI (gh)
 *
 * Requiere que el usuario tenga gh instalado y autenticado.
 * Todas las operaciones son no-bloqueantes — si gh no está disponible,
 * Guild funciona normalmente sin integración GitHub.
 */

import { execSync, execFileSync } from 'child_process';

const LABELS = [
  { name: 'backlog',      color: '8E8E8E', description: 'Tarea documentada, pendiente de iniciar' },
  { name: 'in-progress',  color: '0075CA', description: 'En implementación' },
  { name: 'in-review',    color: 'E4A800', description: 'En validación QA' },
  { name: 'done',         color: '2EA44F', description: 'Completada y mergeada' },
  { name: 'bug',          color: 'D73A4A', description: 'Bug reportado por QA' },
  { name: 'blocked',      color: 'E99695', description: 'Bloqueada por dependencia' },
];

/**
 * Verifica si gh CLI está instalado y autenticado.
 */
export function isGhAvailable() {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Configura los labels de estado en el repositorio GitHub.
 */
export async function setupGithubLabels(repoUrl) {
  if (!isGhAvailable()) {
    console.warn('gh CLI no disponible — saltando configuración de labels.');
    return;
  }

  const repo = extractRepoFromUrl(repoUrl);
  if (!repo) return;

  for (const label of LABELS) {
    try {
      execSync(
        `gh label create "${label.name}" --color "${label.color}" --description "${label.description}" --repo ${repo} --force`,
        { stdio: 'ignore' }
      );
    } catch {
      // Label ya existe o error no crítico
    }
  }
}

/**
 * Asigna un issue a @me y cambia su label de estado.
 */
export function assignIssue(issueNumber, fromLabel, toLabel) {
  if (!isGhAvailable()) return;

  try {
    execSync(`gh issue assign ${issueNumber} --assignee @me`, { stdio: 'ignore' });
    execSync(`gh issue edit ${issueNumber} --add-label "${toLabel}" --remove-label "${fromLabel}"`, { stdio: 'ignore' });
  } catch (e) {
    // Non-critical
  }
}

/**
 * Agrega un comentario a un issue.
 */
export function commentIssue(issueNumber, body) {
  if (!isGhAvailable()) return;

  try {
    execSync(`gh issue comment ${issueNumber} --body "${body}"`, { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Cierra un issue con un comentario.
 */
export function closeIssue(issueNumber, comment) {
  if (!isGhAvailable()) return;

  try {
    execSync(`gh issue close ${issueNumber} --comment "${comment}"`, { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Crea un issue de bug referenciando una tarea padre.
 */
export function createBugIssue(title, body, parentIssueNumber) {
  if (!isGhAvailable()) return null;

  try {
    const result = execSync(
      `gh issue create --title "${title}" --body "${body}" --label "bug"`,
      { encoding: 'utf8' }
    );
    const issueUrl = result.trim();
    const issueNumber = issueUrl.split('/').pop();

    if (parentIssueNumber) {
      commentIssue(parentIssueNumber, `Bug encontrado: ${issueUrl}`);
    }

    return { number: issueNumber, url: issueUrl };
  } catch {
    return null;
  }
}

/**
 * Extrae "owner/repo" de una URL de GitHub.
 */
function extractRepoFromUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}
