# Guild AI — Documento Maestro de Implementación

> Este documento es la fuente de verdad para implementar Guild AI.
> Está escrito para ser leído por Claude Code al inicio de cada sesión de implementación.
> Lee este documento completo antes de escribir cualquier línea de código.

---

## Qué es Guild

Guild es un framework instalable vía npm que convierte cualquier proyecto de software en un equipo de agentes IA especializados para Claude Code. Cada agente tiene un rol claro, expertise composable por tecnología, y un flujo de trabajo definido de punta a punta.

**Instalación del usuario final:**
```bash
npm install -g guild-agents   # global (recomendado)
npm install --save-dev guild-agents  # local por proyecto
guild init
```

**Repositorio:** https://github.com/guild-agents/guild
**npm:** https://www.npmjs.com/package/guild-agents

---

## Estado actual del proyecto

El repo tiene la siguiente estructura ya creada. Antes de implementar cualquier cosa, lee los archivos existentes para entender qué hay y qué falta.

```
guild/
├── bin/
│   └── guild.js                  ✅ Entry point del CLI — esqueleto completo
├── src/
│   ├── commands/
│   │   ├── init.js               ✅ Onboarding — esqueleto con flujo completo
│   │   ├── mode.js               ✅ Cambio de modos — esqueleto completo
│   │   ├── upskill.js            ✅ Completo — busca templates, actualiza PROJECT.md, recompone
│   │   ├── new-agent.js          ✅ Completo — valida nombre, crea slash command, actualiza PROJECT.md
│   │   ├── sync.js               ✅ Completo — sincroniza tasks/ con GitHub Issues via gh CLI
│   │   └── status.js             ✅ Completo — muestra proyecto, tareas, sesión, agentes
│   ├── utils/
│   │   ├── composer.js           ✅ Composición de active.md — esqueleto completo
│   │   ├── files.js              ✅ Utilidades de archivos — esqueleto completo
│   │   ├── generators.js         ✅ Generadores de PROJECT.md, SESSION.md, CLAUDE.md — esqueleto completo
│   │   └── github.js             ✅ Integración GitHub CLI — esqueleto completo
│   └── templates/
│       ├── agents/
│       │   ├── advisor/base.md           ✅ Completo
│       │   ├── tech-lead/base.md         ✅ Completo
│       │   ├── product-owner/base.md     ✅ Completo
│       │   ├── developer/base.md         ✅ Completo
│       │   ├── dba/base.md               ✅ Completo
│       │   ├── qa/base.md                ✅ Completo
│       │   ├── bug-fixer/base.md         ✅ Completo
│       │   └── code-review/base.md       ✅ Completo
│       ├── commands/
│       │   ├── guild-specialize.md       ✅ Completo
│       │   ├── feature.md                ✅ Completo
│       │   ├── session-start.md          ✅ Completo
│       │   ├── session-end.md            ✅ Completo
│       │   ├── advisor.md                ✅ Completo
│       │   ├── tech-lead.md              ✅ Completo
│       │   ├── po.md                     ✅ Completo
│       │   ├── developer.md              ✅ Completo
│       │   ├── dba.md                    ✅ Completo
│       │   ├── qa.md                     ✅ Completo
│       │   ├── bug-fixer.md              ✅ Completo
│       │   └── code-review.md            ✅ Completo
│       └── hooks/
│           └── on-mode-change.sh         ✅ Completo
├── .github/
│   ├── workflows/
│   │   └── ci.yml                ✅ Completo
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         ✅ Completo
│   │   ├── feature_request.md    ✅ Completo
│   │   └── new_expertise.md      ✅ Completo
│   ├── pull_request_template.md  ✅ Completo
│   └── CONTRIBUTING.md           ✅ Completo
├── package.json                  ✅ Completo
├── CHANGELOG.md                  ✅ Completo
├── README.md                     ✅ Completo
└── LICENSE                       ✅ MIT
```

---

## Arquitectura del sistema

### Principio fundamental
**Todo el estado importante vive en archivos, no en memoria ni runtime.** Cualquier agente puede retomar el trabajo exactamente donde lo dejó porque el estado está escrito en disco.

### Flujo de datos en `guild init`

```
Usuario responde prompts (Clack)
         ↓
   projectData object
         ↓
    generateProjectMd()  → PROJECT.md
    generateSessionMd()  → SESSION.md
    generateClaudeMd()   → CLAUDE.md
    copyAgentTemplates() → .claude/agents/*/base.md
                        → .claude/commands/*.md
                        → .claude/hooks/on-mode-change.sh
                        → tasks/backlog|in-progress|in-review|done/
    composeAllAgents()   → .claude/agents/*/active.md
    setupGithubLabels()  → labels en GitHub repo (si aplica)
```

### Flujo de `guild mode [agente] [modos]`

```
Parsear args (+modo, -modo, modo exacto)
         ↓
Leer modos actuales de PROJECT.md
         ↓
Calcular nuevos modos
         ↓
Verificar que expertise/*.md existen
         ↓
updateProjectMdModes()  → actualiza PROJECT.md
         ↓
composeAgent()          → regenera active.md
```

### Composición de active.md

```
base.md
  + expertise/modo1.md
  + expertise/modo2.md
  + ...
  + footer con metadatos
= active.md
```

`active.md` NUNCA se edita manualmente. Siempre se regenera via `composeAgent()`.

---

## Estructura que Guild crea en el proyecto del usuario

Cuando el usuario ejecuta `guild init` en su proyecto, Guild crea:

```
proyecto-del-usuario/
├── CLAUDE.md                          ← instrucciones globales para Claude Code
├── PROJECT.md                         ← configuración del proyecto
├── SESSION.md                         ← estado de sesión activa
├── .claude/
│   ├── agents/
│   │   ├── advisor/
│   │   │   ├── base.md               ← copiado de templates
│   │   │   ├── active.md             ← generado por composer
│   │   │   └── expertise/            ← generado por /guild-specialize
│   │   ├── tech-lead/
│   │   ├── product-owner/
│   │   ├── developer/
│   │   ├── dba/
│   │   ├── qa/
│   │   ├── bug-fixer/
│   │   └── code-review/
│   ├── commands/                      ← slash commands copiados de templates
│   │   ├── guild-specialize.md
│   │   ├── feature.md
│   │   ├── session-start.md
│   │   ├── session-end.md
│   │   ├── advisor.md
│   │   ├── tech-lead.md
│   │   └── ...
│   └── hooks/
│       └── on-mode-change.sh         ← hook ejecutable
└── tasks/
    ├── backlog/
    ├── in-progress/
    ├── in-review/
    └── done/
```

---

## Archivos de estado — formatos exactos

### PROJECT.md

```markdown
# PROJECT.md
> Generado por Guild AI el [fecha] — actualizar cuando el proyecto evolucione

## Identidad
- **Nombre:** [nombre]
- **Dominio:** [dominio]
- **Descripción:** [descripción]
- **Alcance inicial:** [alcance] (opcional)

## Stack tecnológico
- **Frontend:** [tecnología]
- **Backend:** [tecnología]
- **Base de datos:** [tecnologías separadas por coma]
- **Detalles adicionales:** [detalles] (opcional)

## Decisiones arquitectónicas clave
[texto libre o "- _Por definir con el Tech Lead_"]

## Reglas del dominio
[texto libre o "- _Por definir con el Advisor_"]

## Estrategia de testing
- **Framework:** [framework]
- **TDD:** Sí / No
- **Cobertura mínima obligatoria:**
  - Lógica de negocio / dominio: 90%
  - Servicios y casos de uso: 80%
  - Utilidades y helpers: 75%
  - Componentes UI: 60%
  - **Global mínimo: 80%**
- **Regla clave:** cada criterio de aceptación debe tener al menos un test que lo valide directamente

## Agentes activos y sus modos
- **advisor:** [modos o "_dominio a especializar con /guild-specialize_"]
- **tech-lead:** [modos o "_arquitectura a especializar con /guild-specialize_"]
- **product-owner:** base
- **developer:** [modos separados por coma]
- **dba:** [modos separados por coma]
- **qa:** [modos separados por coma]
- **bug-fixer:** [modos separados por coma] (hereda del developer)
- **code-review:** [modos separados por coma] (hereda del developer)

## Integración GitHub
- **Habilitado:** Sí / No
- **Repo:** [URL] (si habilitado)
- **Labels:** backlog, in-progress, in-review, done, bug, blocked (si habilitado)
```

### SESSION.md

```markdown
# SESSION.md

## Sesión activa
- **Fecha:** [YYYY-MM-DD]
- **Tarea en curso:** [TASK-XXX o —]
- **GitHub Issue:** [URL o —]
- **Agente activo:** [nombre o —]
- **Estado:** [descripción breve]

## Contexto relevante
- [decisiones tomadas que afectan el trabajo futuro]

## Próximos pasos
1. [acción concreta]
2. [acción concreta]
```

### TASK-XXX.md

```markdown
# TASK-[NNN]: [título]

## Descripción
[qué hay que hacer y por qué]

## Criterios de aceptación
- [ ] [criterio verificable]

## Dirección técnica (Tech Lead)
[approach de implementación, interfaces, estructura, riesgos]

## Stack relevante
[tecnologías involucradas]

## GitHub Issue
- **URL:** [URL o —]
- **Número:** #[número o —]
- **Assignee actual:** [agente o —]

## Tests requeridos
- [ ] [test que valida criterio 1]
- [ ] Cobertura mínima alcanzada según PROJECT.md

## Estado
- **Asignado a:** [agente]
- **Iniciado:** [fecha]
- **Último update:** [fecha]

## Log de progreso
- [fecha] [agente]: [descripción]
```

---

## Comandos pendientes de implementar

### `src/commands/upskill.js`

Agrega una nueva expertise a un agente existente.

**Uso:** `guild upskill [agente] [expertise]`

**Flujo:**
1. Verificar que el agente existe en `.claude/agents/`
2. Verificar que la expertise NO existe ya (si existe, preguntar si sobreescribir)
3. Buscar template en `src/templates/agents/[agente]/expertise/[expertise].md`
4. Si existe template: copiar al proyecto
5. Si no existe template: crear archivo vacío con estructura del template de expertise
6. Agregar nota en SESSION.md: "Expertise [expertise] agregada a [agente] — requiere especialización con /guild-specialize"
7. Actualizar modos en PROJECT.md agregando la nueva expertise
8. Ejecutar `composeAgent()` para regenerar active.md
9. Confirmar al usuario

### `src/commands/new-agent.js`

Crea un agente nuevo desde cero.

**Uso:** `guild new-agent [nombre] --expertise [e1] [e2]`

**Flujo:**
1. Validar nombre: solo lowercase, guiones, sin espacios
2. Verificar que el agente NO existe ya
3. Crear estructura de carpetas: `.claude/agents/[nombre]/expertise/`
4. Generar `base.md` con estructura genérica y placeholder para que el usuario lo complete
5. Copiar expertises iniciales si se especificaron con `--expertise`
6. Agregar agente a la sección de modos en PROJECT.md
7. Ejecutar `composeAgent()` para generar active.md inicial
8. Crear slash command en `.claude/commands/[nombre].md`
9. Confirmar al usuario con instrucciones para completar el base.md

**Estructura del base.md generado:**
```markdown
# [Nombre del agente] — Base

## Rol
[Describe el rol de este agente en el proyecto]

## Responsabilidades
[Lista las responsabilidades principales]

## Lo que NO haces
[Lista lo que este agente NO hace — importante para evitar solapamientos]

## Proceso
[Describe el proceso paso a paso que este agente sigue]

## Criterios de calidad
[Qué estándares debe cumplir el output de este agente]

## Reglas de comportamiento
- Siempre leer PROJECT.md al inicio de la sesión
- Siempre leer SESSION.md al inicio de la sesión
- Al cerrar sesión, actualizar SESSION.md con el estado actual
```

### `src/commands/sync.js`

Sincroniza el estado de las tareas locales con GitHub Issues.

**Uso:** `guild sync`

**Flujo:**
1. Verificar que GitHub Issues está habilitado en PROJECT.md
2. Verificar que `gh` CLI está disponible y autenticado
3. Leer todas las tareas en `tasks/*/`
4. Por cada tarea con GitHub Issue referenciado:
   - Comparar estado local (carpeta) con label en GitHub
   - Si hay discrepancia: actualizar GitHub para que coincida con el estado local
5. Reportar qué se sincronizó

### `src/commands/status.js`

Muestra el estado actual del proyecto.

**Uso:** `guild status`

**Output esperado:**
```
⚔️  Guild — [nombre del proyecto]

📋 Tareas
   Backlog:     3
   In progress: 1  → TASK-003: Implementar endpoint categorías
   In review:   0
   Done:        5

🤖 Agentes activos
   advisor      → fintech
   tech-lead    → react-architecture
   developer    → react, vite, node
   dba          → postgres, redis
   qa           → vitest
   bug-fixer    → react, vite, node
   code-review  → react, vite, node

🔗 GitHub Issues: habilitado
```

---

## Slash commands pendientes de crear

Los slash commands son archivos `.md` que Claude Code interpreta como instrucciones. Deben crearse en `src/templates/commands/`.

### Patrón de cada slash command de agente

Cada agente tiene su slash command que activa ese agente para la sesión:

```markdown
# /[nombre-agente]

Activa el agente [Nombre] para esta sesión.

## Instrucciones para Claude

1. Lee `.claude/agents/[nombre]/active.md` — estas son tus instrucciones como [Nombre]
2. Lee `PROJECT.md` — entiende el contexto del proyecto
3. Lee `SESSION.md` — retoma el contexto de la sesión actual
4. Confirma al desarrollador que estás listo como [Nombre] y pregunta qué necesita

## Cuándo usar este agente
[descripción breve de cuándo tiene sentido activar este agente]
```

**Slash commands de agentes a crear:**
- `/advisor` — evaluar ideas, consultas de dominio
- `/tech-lead` — dirección técnica, revisión arquitectónica
- `/po` — documentar features, gestionar backlog
- `/developer` — implementar tareas
- `/dba` — diseño de esquema, migraciones, queries
- `/qa` — validar tareas completadas
- `/bug-fixer` — investigar y corregir bugs
- `/code-review` — revisar código antes del PR

### `/session-end`

```markdown
# /session-end

Guarda el estado de la sesión actual antes de cerrar.

## Instrucciones para Claude

1. Actualiza `SESSION.md` con:
   - Fecha actual
   - Tarea en curso (si aplica)
   - GitHub Issue de la tarea en curso (si aplica)
   - Agente activo en este momento
   - Estado: descripción de dónde quedó el trabajo
   - Contexto relevante: decisiones tomadas en esta sesión
   - Próximos pasos: las 2-3 acciones más importantes al retomar

2. Si hay una tarea en in-progress, actualiza su log de progreso en `TASK-XXX.md`

3. Confirma al desarrollador que el estado está guardado y que puede cerrar con seguridad
```

---

## Hook pendiente de crear

### `.github/../src/templates/hooks/on-mode-change.sh`

```bash
#!/bin/bash
# on-mode-change.sh
# Generado por Guild AI — no editar manualmente
# Se ejecuta automáticamente cuando se cambian los modos de un agente via `guild mode`
#
# Argumentos: $1 = nombre del agente, $2..N = modos activos
#
# Este hook NO se usa directamente — la composición la hace composer.js
# Se incluye como referencia y para uso manual si se necesita

AGENT=$1
shift
MODES=$@

BASE=".claude/agents/$AGENT/base.md"
ACTIVE=".claude/agents/$AGENT/active.md"

if [ ! -f "$BASE" ]; then
  echo "Error: base.md no encontrado para agente $AGENT"
  exit 1
fi

cat "$BASE" > "$ACTIVE"

for MODE in $MODES; do
  EXPERTISE=".claude/agents/$AGENT/expertise/$MODE.md"
  if [ -f "$EXPERTISE" ]; then
    echo "" >> "$ACTIVE"
    echo "---" >> "$ACTIVE"
    cat "$EXPERTISE" >> "$ACTIVE"
  else
    echo "Warning: expertise $MODE no encontrada para agente $AGENT — ignorada"
  fi
done

DATE=$(date +%Y-%m-%d)
echo "" >> "$ACTIVE"
echo "---" >> "$ACTIVE"
echo "<!-- Generado automáticamente por Guild — $DATE -->" >> "$ACTIVE"
echo "<!-- Modos activos: ${MODES:-solo base} -->" >> "$ACTIVE"
echo "<!-- No editar manualmente — usar: guild mode $AGENT [modos] -->" >> "$ACTIVE"

echo "✓ Agente $AGENT recompuesto con modos: ${MODES:-solo base}"
```

---

## Dependencias y setup

### Stack tecnológico del CLI
- **Runtime:** Node.js >= 18 (ESModules nativos)
- **CLI prompts:** @clack/prompts ^0.9.0
- **CLI framework:** commander ^12.0.0
- **Colores:** chalk ^5.3.0, picocolors ^1.0.0
- **File utils:** fs-extra ^11.2.0
- **Testing:** Vitest
- **Lint:** ESLint

### Convenciones de código
- ESModules (`import`/`export`), sin CommonJS
- Async/await, sin callbacks
- Nombres descriptivos — el código debe leerse como prosa
- Errors con mensajes útiles para el usuario final
- Sin `any` implícito — aunque no es TypeScript, los nombres deben dejar claro el tipo esperado

### Branching model
```
main      ← producción, siempre estable, tagged con versiones npm
develop   ← integración, aquí llegan todos los PRs
feature/  ← features nuevas, salen de develop
fix/      ← bugfixes, salen de develop
hotfix/   ← fixes urgentes, salen de main → mergear también a develop
```

### Conventional Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
chore: mantenimiento
refactor: refactor sin cambio de comportamiento
test: tests
ci: cambios en CI/CD
feat!: breaking change
feat(expertise): nueva expertise de agente
```

---

## Orden de implementación recomendado

Implementar en este orden para tener algo funcional lo antes posible:

### Fase 1 — CLI funcional básico (prioridad máxima)
1. Completar los `TODO` en `generators.js` (`generateSessionMd`, `generateClaudeMd`)
2. Completar los `TODO` en `files.js` (copySlashCommands, copyHooks)
3. Completar los `TODO` en `mode.js` (`getCurrentModes`, `addUpskillNote`)
4. Verificar que `guild init` corre sin errores de punta a punta
5. Verificar que `guild mode` corre sin errores

### Fase 2 — Comandos faltantes
6. Implementar `status.js`
7. Implementar `upskill.js`
8. Implementar `new-agent.js`
9. Implementar `sync.js`

### Fase 3 — Templates faltantes
10. Crear todos los slash commands de agentes individuales
11. Crear `session-end.md`
12. Crear `on-mode-change.sh`

### Fase 4 — Tests
13. Tests unitarios para `composer.js`
14. Tests unitarios para `generators.js`
15. Tests unitarios para `mode.js`
16. Tests de integración para `guild init`

### Fase 5 — README
17. README.md orientado a la comunidad open source

---

## Verificación de calidad

Antes de considerar cualquier fase completa, verificar:

```bash
# El CLI instala y corre
npm install -g .
guild --version
guild --help

# Cada comando muestra ayuda
guild init --help
guild mode --help
guild upskill --help
guild new-agent --help

# guild init completa sin errores
mkdir test-project && cd test-project
guild init

# Verificar que creó los archivos esperados
ls -la
ls -la .claude/agents/
cat PROJECT.md
cat SESSION.md
cat CLAUDE.md

# guild mode funciona
guild mode developer +react +vite
cat .claude/agents/developer/active.md

# Tests pasan
cd [repo guild]
npm test
npm run lint
```

---

## Notas importantes para la implementación

**Sobre el onboarding:** el flujo de `init.js` está completo en lógica pero los helpers `generateSessionMd` y `generateClaudeMd` tienen `// TODO`. Están en `generators.js` y necesitan implementarse siguiendo los formatos exactos definidos en este documento.

**Sobre el composer:** `composer.js` está completo pero `files.js` tiene pendiente la implementación de `copySlashCommands` y `copyHooks`. Sin esto, `guild init` no copiará los comandos y el hook al proyecto del usuario.

**Sobre los slash commands de agentes:** son archivos simples de Markdown que Claude Code lee como instrucciones. No requieren lógica JavaScript — solo crear los `.md` en `src/templates/commands/`.

**Sobre los tests:** Guild requiere cobertura mínima del 80%. Los módulos más críticos que deben tener tests son `composer.js` y `generators.js` porque generan los archivos que los usuarios van a leer y editar.

**Sobre el README:** es la pieza más visible del proyecto para la comunidad. Debe mostrar el valor del framework en 30 segundos, tener un quick start funcional, y dejar clara la diferencia entre contribuir código vs. contribuir expertises.

---

*Documento generado: Febrero 2026 — v1.0*
*Actualizar este documento cuando cambien decisiones de arquitectura o el scope de implementación*
