/**
 * sync.js — Sincroniza el estado de tasks/ con GitHub Issues
 *
 * Flujo:
 * 1. Verificar que GitHub Issues está habilitado en PROJECT.md
 * 2. Verificar que gh CLI está disponible y autenticado
 * 3. Leer todas las tareas en tasks/
 * 4. Por cada tarea con GitHub Issue referenciado:
 *    - Comparar estado local (carpeta) con label en GitHub
 *    - Si hay discrepancia: actualizar GitHub para que coincida con el estado local
 * 5. Reportar qué se sincronizó
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { isGhAvailable } from '../utils/github.js';
import { execSync } from 'child_process';

const TASK_DIRS = {
  'backlog': join('tasks', 'backlog'),
  'in-progress': join('tasks', 'in-progress'),
  'in-review': join('tasks', 'in-review'),
  'done': join('tasks', 'done'),
};

const STATUS_LABELS = ['backlog', 'in-progress', 'in-review', 'done'];

export async function runSync() {
  p.intro(chalk.bold.cyan('⚔️  Guild — Sync'));

  // 1. Verificar que PROJECT.md existe
  if (!existsSync('PROJECT.md')) {
    p.log.error('Guild no está instalado en este proyecto. Ejecuta: guild init');
    process.exit(1);
  }

  // 2. Verificar que GitHub está habilitado
  const projectMd = readFileSync('PROJECT.md', 'utf8');
  const githubMatch = projectMd.match(/\*\*Habilitado:\*\*\s*(.+)/);
  if (!githubMatch || githubMatch[1].trim() !== 'Sí') {
    p.log.error('GitHub Issues no está habilitado en este proyecto.');
    p.log.info('Ejecuta guild init y habilita la integración con GitHub.');
    process.exit(1);
  }

  // 3. Verificar que gh CLI está disponible
  if (!isGhAvailable()) {
    p.log.error('GitHub CLI (gh) no está disponible o no está autenticado.');
    p.log.info('Instala gh: https://cli.github.com/ y ejecuta: gh auth login');
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start('Leyendo tareas locales...');

  try {
    // 4. Leer todas las tareas con sus issues
    const tasks = readAllTasks();

    if (tasks.length === 0) {
      spinner.stop('No hay tareas con GitHub Issues referenciados.');
      p.outro('Nada que sincronizar.');
      return;
    }

    spinner.message(`Sincronizando ${tasks.length} tarea(s)...`);

    // 5. Sincronizar cada tarea
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const results = [];

    for (const task of tasks) {
      try {
        const ghLabels = getIssueLabels(task.issueNumber);
        const currentGhStatus = ghLabels.find(l => STATUS_LABELS.includes(l));

        if (currentGhStatus === task.localStatus) {
          skipped++;
          continue;
        }

        // Actualizar GitHub para que coincida con el estado local
        updateIssueStatus(task.issueNumber, currentGhStatus, task.localStatus);
        results.push({
          task: task.filename,
          issue: `#${task.issueNumber}`,
          from: currentGhStatus || 'sin label',
          to: task.localStatus,
        });
        synced++;
      } catch {
        errors++;
      }
    }

    spinner.stop('Sincronización completada.');

    // 6. Reportar
    if (results.length > 0) {
      p.log.step('Cambios sincronizados');
      for (const r of results) {
        p.log.info(`  ${r.task} (${r.issue}): ${chalk.gray(r.from)} → ${chalk.cyan(r.to)}`);
      }
    }

    p.log.info('');
    p.log.info(`  Sincronizadas: ${chalk.green(synced)}`);
    p.log.info(`  Sin cambios:   ${chalk.gray(skipped)}`);
    if (errors > 0) {
      p.log.info(`  Errores:       ${chalk.red(errors)}`);
    }

    p.outro('');
  } catch (error) {
    spinner.stop('Error durante la sincronización.');
    p.log.error(error.message);
    process.exit(1);
  }
}

/**
 * Lee todas las tareas de tasks/ que tienen un GitHub Issue referenciado.
 */
function readAllTasks() {
  const tasks = [];

  for (const [status, dir] of Object.entries(TASK_DIRS)) {
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== '.gitkeep');

    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf8');
      const issueNumber = extractIssueNumber(content);

      if (issueNumber) {
        tasks.push({
          filename: file.replace('.md', ''),
          localStatus: status,
          issueNumber,
          path: join(dir, file),
        });
      }
    }
  }

  return tasks;
}

/**
 * Extrae el número de issue de GitHub desde el contenido de una tarea.
 */
function extractIssueNumber(content) {
  // Buscar "**Número:** #123" o "**URL:** ...github.com/.../issues/123"
  const numberMatch = content.match(/\*\*Número:\*\*\s*#?(\d+)/);
  if (numberMatch) return numberMatch[1];

  const urlMatch = content.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

/**
 * Obtiene los labels de un issue de GitHub.
 */
function getIssueLabels(issueNumber) {
  try {
    const result = execSync(
      `gh issue view ${issueNumber} --json labels --jq '.labels[].name'`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Actualiza el label de estado de un issue en GitHub.
 */
function updateIssueStatus(issueNumber, fromLabel, toLabel) {
  const args = [`--add-label "${toLabel}"`];
  if (fromLabel) {
    args.push(`--remove-label "${fromLabel}"`);
  }

  execSync(
    `gh issue edit ${issueNumber} ${args.join(' ')}`,
    { stdio: 'ignore' }
  );

  // Si el estado es "done", cerrar el issue
  if (toLabel === 'done') {
    execSync(
      `gh issue close ${issueNumber} --comment "Sincronizado por Guild — tarea completada."`,
      { stdio: 'ignore' }
    );
  }
}
