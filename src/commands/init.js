/**
 * guild init — Onboarding interactivo del proyecto
 *
 * Flujo:
 * 1. Verificar que no existe ya una instalación de Guild
 * 2. Recopilar información del proyecto via prompts (Clack)
 * 3. Generar PROJECT.md
 * 4. Crear estructura de carpetas (.claude/agents, tasks/, etc.)
 * 5. Copiar templates de agentes base
 * 6. Copiar slash commands y hooks
 * 7. Generar CLAUDE.md del proyecto
 * 8. Generar SESSION.md inicial
 * 9. Configurar GitHub Issues (si aplica)
 * 10. Instrucciones para especializar agentes con Claude Code
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { generateProjectMd } from '../utils/generators.js';
import { copyAgentTemplates } from '../utils/files.js';
import { setupGithubLabels } from '../utils/github.js';
import { composeAllAgents } from '../utils/composer.js';

export async function runInit(options = {}) {
  console.log('');
  p.intro(chalk.bold.cyan('⚔️  Guild AI — Onboarding'));

  // Verificar instalación existente
  if (existsSync('.claude/agents')) {
    const overwrite = await p.confirm({
      message: 'Guild ya está instalado en este proyecto. ¿Deseas reinicializar?',
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Onboarding cancelado.');
      process.exit(0);
    }
  }

  // ─── PASO 1: Identidad del proyecto ───────────────────────────────────────
  p.log.step('Identidad del proyecto');

  const identity = await p.group({
    name: () => p.text({
      message: '¿Cuál es el nombre del proyecto?',
      placeholder: 'mi-proyecto',
      validate: (val) => {
        if (!val) return 'El nombre es requerido';
        if (val.includes(' ')) return 'Sin espacios — usa guiones';
      },
    }),

    domain: () => p.text({
      message: '¿Cuál es el dominio de negocio?',
      placeholder: 'ej: Fintech - gestión de gastos personales para millennials',
      hint: 'Incluye: industria, tipo de usuario, problema que resuelve, restricciones relevantes',
      validate: (val) => {
        if (!val) return 'El dominio es requerido';
        if (val.length < 20) return 'Sé más descriptivo — esto define la expertise del Advisor';
      },
    }),

    description: () => p.text({
      message: '¿Qué hace el proyecto y para quién?',
      placeholder: 'ej: App móvil que permite a usuarios trackear gastos...',
      validate: (val) => !val ? 'La descripción es requerida' : undefined,
    }),

    scope: () => p.text({
      message: '¿Cuál es el alcance inicial? (qué está dentro y fuera del MVP)',
      placeholder: 'ej: MVP incluye autenticación, dashboard y reportes. Excluye integraciones bancarias.',
    }),
  }, { onCancel: () => { p.cancel('Onboarding cancelado.'); process.exit(0); } });

  // ─── PASO 2: Stack tecnológico ────────────────────────────────────────────
  p.log.step('Stack tecnológico');

  const stackType = await p.select({
    message: '¿Qué tipo de proyecto es?',
    options: [
      { value: 'fullstack', label: 'Fullstack (frontend + backend)' },
      { value: 'frontend', label: 'Frontend únicamente' },
      { value: 'backend', label: 'Backend / API únicamente' },
      { value: 'mobile', label: 'Mobile (React Native / Expo)' },
      { value: 'custom', label: 'Otro / personalizado' },
    ],
  });

  if (p.isCancel(stackType)) { p.cancel('Onboarding cancelado.'); process.exit(0); }

  // Frontend stack
  let frontendStack = null;
  if (['fullstack', 'frontend'].includes(stackType)) {
    frontendStack = await p.select({
      message: '¿Qué stack de frontend usas?',
      options: [
        { value: 'react-vite', label: 'React + Vite' },
        { value: 'nextjs', label: 'Next.js' },
        { value: 'react-native', label: 'React Native / Expo' },
        { value: 'angular', label: 'Angular' },
        { value: 'vue', label: 'Vue.js' },
        { value: 'svelte', label: 'Svelte / SvelteKit' },
        { value: 'other', label: 'Otro' },
      ],
    });
    if (p.isCancel(frontendStack)) { p.cancel('Onboarding cancelado.'); process.exit(0); }
  }

  // Backend stack
  let backendStack = null;
  if (['fullstack', 'backend'].includes(stackType)) {
    backendStack = await p.select({
      message: '¿Qué stack de backend usas?',
      options: [
        { value: 'node-express', label: 'Node.js + Express' },
        { value: 'node-fastify', label: 'Node.js + Fastify' },
        { value: 'java-spring', label: 'Java + Spring Boot' },
        { value: 'python-fastapi', label: 'Python + FastAPI' },
        { value: 'python-django', label: 'Python + Django' },
        { value: 'other', label: 'Otro' },
      ],
    });
    if (p.isCancel(backendStack)) { p.cancel('Onboarding cancelado.'); process.exit(0); }
  }

  // Database stack
  const dbStack = await p.multiselect({
    message: '¿Qué base(s) de datos usas?',
    options: [
      { value: 'postgres', label: 'PostgreSQL' },
      { value: 'supabase', label: 'Supabase' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'redis', label: 'Redis' },
      { value: 'sqlite', label: 'SQLite' },
      { value: 'none', label: 'Ninguna / No aplica' },
    ],
    required: false,
  });
  if (p.isCancel(dbStack)) { p.cancel('Onboarding cancelado.'); process.exit(0); }

  const stackDetails = await p.text({
    message: '¿Versiones y servicios adicionales? (opcional)',
    placeholder: 'ej: React 18, Node 20, PostgreSQL 16, Vercel, Cloudflare',
  });

  // ─── PASO 3: Arquitectura ─────────────────────────────────────────────────
  p.log.step('Arquitectura y convenciones');

  const architecture = await p.text({
    message: '¿Qué decisiones arquitectónicas clave tiene el proyecto?',
    placeholder: 'ej: Feature-based folders, Zustand para estado, REST API, sin GraphQL',
    hint: 'Esto guía al Tech Lead y al Developer en cada feature',
  });

  const domainRules = await p.text({
    message: '¿Hay reglas de dominio que los agentes siempre deben respetar?',
    placeholder: 'ej: montos en centavos nunca floats, PII nunca se loguea',
    hint: 'Restricciones de negocio, invariantes, convenciones críticas',
  });

  // ─── PASO 4: Testing ──────────────────────────────────────────────────────
  p.log.step('Estrategia de testing');

  const testingFramework = await p.select({
    message: '¿Qué framework de testing usas?',
    options: [
      { value: 'vitest', label: 'Vitest' },
      { value: 'jest', label: 'Jest' },
      { value: 'cypress', label: 'Cypress (E2E)' },
      { value: 'playwright', label: 'Playwright (E2E)' },
      { value: 'junit', label: 'JUnit (Java)' },
      { value: 'pytest', label: 'pytest (Python)' },
      { value: 'none', label: 'Sin framework de testing definido' },
    ],
  });
  if (p.isCancel(testingFramework)) { p.cancel('Onboarding cancelado.'); process.exit(0); }

  const useTdd = await p.confirm({
    message: '¿Quieres usar TDD (escribir tests antes de implementar)?',
    initialValue: true,
  });

  // ─── PASO 5: GitHub ───────────────────────────────────────────────────────
  let githubConfig = null;
  if (!options.skipGithub) {
    p.log.step('Integración con GitHub');

    const useGithub = await p.confirm({
      message: '¿Quieres integrar Guild con GitHub Issues?',
      initialValue: true,
    });

    if (!p.isCancel(useGithub) && useGithub) {
      const repoUrl = await p.text({
        message: '¿URL del repositorio?',
        placeholder: 'https://github.com/org/repo',
        validate: (val) => {
          if (!val) return 'La URL es requerida para la integración';
          if (!val.includes('github.com')) return 'Debe ser una URL de GitHub';
        },
      });

      if (!p.isCancel(repoUrl)) {
        githubConfig = { enabled: true, repoUrl };
      }
    }
  }

  // ─── GENERACIÓN ───────────────────────────────────────────────────────────
  const spinner = p.spinner();

  spinner.start('Creando estructura del proyecto...');

  const projectData = {
    identity,
    stack: { type: stackType, frontend: frontendStack, backend: backendStack, db: dbStack, details: stackDetails },
    architecture,
    domainRules,
    testing: { framework: testingFramework, tdd: useTdd },
    github: githubConfig,
  };

  try {
    // Crear estructura de carpetas
    await copyAgentTemplates(projectData);
    spinner.message('Generando PROJECT.md...');

    // Generar PROJECT.md
    await generateProjectMd(projectData);
    spinner.message('Generando SESSION.md y templates de tareas...');

    // Generar SESSION.md inicial
    await generateSessionMd(projectData);

    // Generar CLAUDE.md del proyecto
    await generateClaudeMd(projectData);

    // Componer active.md inicial para cada agente
    spinner.message('Componiendo agentes...');
    await composeAllAgents(projectData);

    // Configurar GitHub labels si aplica
    if (githubConfig?.enabled) {
      spinner.message('Configurando GitHub labels...');
      await setupGithubLabels(githubConfig.repoUrl);
    }

    spinner.stop('Estructura creada correctamente.');
  } catch (error) {
    spinner.stop('Error durante la inicialización.');
    p.log.error(error.message);
    process.exit(1);
  }

  // ─── INSTRUCCIONES FINALES ────────────────────────────────────────────────
  p.log.success('¡Guild inicializado correctamente!');

  p.note(
    `Próximo paso — especializa tus agentes con Claude Code:\n\n` +
    `Abre Claude Code en este proyecto y ejecuta:\n\n` +
    `  /guild-specialize\n\n` +
    `Este comando le pedirá a Claude que lea PROJECT.md\n` +
    `y genere las expertises específicas para tu stack\n` +
    `usando razonamiento profundo.`,
    'Especialización de agentes'
  );

  p.outro(chalk.bold.cyan('⚔️  Guild listo. Que comience el desarrollo.'));
}

// Helpers locales (se moverán a utils/ en implementación)
async function generateSessionMd(data) {
  // TODO: implementar
}

async function generateClaudeMd(data) {
  // TODO: implementar
}
