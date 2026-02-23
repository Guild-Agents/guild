/**
 * guild init — Onboarding interactivo v1
 *
 * Flujo:
 * 1. Verificar que no existe ya una instalacion de Guild
 * 2. Recopilar: nombre, tipo, stack, GitHub, codigo existente
 * 3. Generar PROJECT.md, CLAUDE.md, SESSION.md
 * 4. Copiar agentes y skills
 * 5. Instrucciones para /guild-specialize
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { generateProjectMd, generateSessionMd, generateClaudeMd } from '../utils/generators.js';
import { copyTemplates } from '../utils/files.js';

export async function runInit() {
  console.log('');
  p.intro(chalk.bold.cyan('Guild v1 — Nuevo proyecto'));

  // Verificar instalacion existente
  if (existsSync('.claude/agents')) {
    const overwrite = await p.confirm({
      message: 'Guild ya esta instalado en este proyecto. Reinicializar?',
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Cancelado.');
      process.exit(0);
    }
  }

  // ─── Nombre ─────────────────────────────────────────────────────────────────
  const name = await p.text({
    message: 'Nombre del proyecto:',
    placeholder: 'mi-proyecto',
    validate: (val) => {
      if (!val) return 'El nombre es requerido';
    },
  });
  if (p.isCancel(name)) { p.cancel('Cancelado.'); process.exit(0); }

  // ─── Tipo ───────────────────────────────────────────────────────────────────
  const type = await p.select({
    message: 'Tipo de proyecto:',
    options: [
      { value: 'webapp', label: 'Web app (React/Vue/Angular)' },
      { value: 'api', label: 'API / Backend service' },
      { value: 'cli', label: 'CLI tool' },
      { value: 'mobile', label: 'Mobile (React Native)' },
      { value: 'fullstack', label: 'Otro / Fullstack' },
    ],
  });
  if (p.isCancel(type)) { p.cancel('Cancelado.'); process.exit(0); }

  // ─── Stack ──────────────────────────────────────────────────────────────────
  const stack = await p.text({
    message: 'Stack principal:',
    placeholder: 'ej: Next.js, Supabase, Vercel',
    validate: (val) => {
      if (!val) return 'El stack es requerido';
    },
  });
  if (p.isCancel(stack)) { p.cancel('Cancelado.'); process.exit(0); }

  // ─── GitHub ─────────────────────────────────────────────────────────────────
  let github = null;
  const hasRepo = await p.confirm({
    message: 'Tiene repositorio GitHub?',
    initialValue: true,
  });

  if (!p.isCancel(hasRepo) && hasRepo) {
    const repoUrl = await p.text({
      message: 'URL del repositorio:',
      placeholder: 'https://github.com/org/repo',
      validate: (val) => {
        if (!val) return 'La URL es requerida';
        if (!val.includes('github.com')) return 'Debe ser una URL de GitHub';
      },
    });
    if (!p.isCancel(repoUrl)) {
      github = { repoUrl };
    }
  }

  // ─── Codigo existente ───────────────────────────────────────────────────────
  const hasExistingCode = await p.confirm({
    message: 'Tiene codigo existente?',
    initialValue: true,
  });

  // ─── Generacion ─────────────────────────────────────────────────────────────
  const spinner = p.spinner();
  spinner.start('Generando estructura Guild v1...');

  const projectData = {
    name,
    type,
    stack,
    github,
    hasExistingCode: !p.isCancel(hasExistingCode) && hasExistingCode,
  };

  try {
    await copyTemplates();
    spinner.message('Generando CLAUDE.md...');
    await generateClaudeMd(projectData);

    spinner.message('Generando PROJECT.md...');
    await generateProjectMd(projectData);

    spinner.message('Generando SESSION.md...');
    await generateSessionMd();

    spinner.stop('Estructura creada.');
  } catch (error) {
    spinner.stop('Error durante la inicializacion.');
    p.log.error(error.message);
    process.exit(1);
  }

  // ─── Resumen ────────────────────────────────────────────────────────────────
  p.log.success('CLAUDE.md');
  p.log.success('PROJECT.md');
  p.log.success('SESSION.md');
  p.log.success('.claude/agents/    (8 agentes base)');
  p.log.success('.claude/skills/    (10 skills)');

  p.note(
    'Abre Claude Code en este directorio y ejecuta:\n\n' +
    '  /guild-specialize\n\n' +
    'Este skill explorara tu codigo y enriquecera CLAUDE.md\n' +
    'con la informacion real del proyecto.',
    'Siguiente paso'
  );

  p.outro(chalk.bold.cyan('Guild v1 listo.'));
}
