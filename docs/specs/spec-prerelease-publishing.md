# SPEC: Pre-release & Snapshot Publishing

> **Prioridad:** P1
> **Versión target:** v1.x
> **Dependencias:** npm registry (ya configurado para Guild). Opcionalmente GitHub Actions.
> **Estimación:** Pequeña-Mediana (infraestructura de CI/CD + convenciones de versionado)

---

## 1. Problema que resuelve

Guild está en desarrollo activo con features que necesitan validación antes de ser release estable (compound learning, model routing, workflows declarativos). Sin un pipeline de pre-releases:

- No hay forma de que early adopters prueben features nuevos sin clonar el repo y buildear manualmente
- No hay separación clara entre "esto es estable" y "esto está en pruebas"
- No se puede iterar rápido con feedback de usuarios reales sin arriesgar la reputación del paquete estable
- Los propios workflows de Guild (Guild construyéndose a sí mismo) no pueden probarse en un entorno que simule instalación real

## 2. Solución

Un pipeline de publicación con tres canales de distribución vía npm, más convenciones de versionado semántico que permitan iteración rápida en features experimentales mientras se mantiene la estabilidad del canal principal.

## 3. Canales de distribución

### 3.1 Definición de canales

| Canal | npm tag | Versión ejemplo | Propósito | Audiencia |
|-------|---------|----------------|-----------|-----------|
| **stable** | `latest` | `1.2.0` | Releases probados y documentados | Todos los usuarios |
| **beta** | `beta` | `1.3.0-beta.1` | Features completos en validación | Early adopters, testers |
| **snapshot** | `snapshot` | `1.3.0-snapshot.20260225.1` | Builds automáticos del branch de desarrollo | Desarrollo interno, CI |

### 3.2 Cómo instala cada canal el usuario

```bash
# Estable (default)
npm install -g guild@latest
# o simplemente:
npm install -g guild

# Beta (features en validación)
npm install -g guild@beta

# Snapshot (último build del branch dev)
npm install -g guild@snapshot
```

### 3.3 Reglas de promoción

```
snapshot → beta → stable

Snapshot:
  - Se publica automáticamente en cada push/merge a branch dev
  - No requiere aprobación manual
  - Puede tener bugs conocidos
  - Se sobreescribe frecuentemente

Beta:
  - Se publica manualmente cuando un feature está completo
  - Requiere: tests pasan, feature documentado (al menos README)
  - Puede tener rough edges pero no bugs bloqueantes
  - Múltiples betas por versión: 1.3.0-beta.1, 1.3.0-beta.2, etc.

Stable:
  - Se publica manualmente después de validación en beta
  - Requiere: tests pasan, docs completos, changelog actualizado
  - Semver estricto: breaking changes = major bump
```

## 4. Componentes a implementar

### 4.1 Versionado en `package.json`

**Convención de versionado:**

```
# Stable
1.2.0

# Beta (feature en validación)
1.3.0-beta.{incremental}
Ejemplo: 1.3.0-beta.1, 1.3.0-beta.2

# Snapshot (build automático)  
1.3.0-snapshot.{YYYYMMDD}.{build-number}
Ejemplo: 1.3.0-snapshot.20260225.1
```

**Regla clave:** La versión base del snapshot y beta siempre apunta a la PRÓXIMA versión estable. Si la última stable es 1.2.0, los snapshots y betas son 1.3.0-*.

### 4.2 Scripts npm en `package.json`

```json
{
  "scripts": {
    "version:snapshot": "node scripts/version-snapshot.js",
    "version:beta": "node scripts/version-beta.js",
    "version:stable": "node scripts/version-stable.js",
    "publish:snapshot": "npm run version:snapshot && npm publish --tag snapshot",
    "publish:beta": "npm run version:beta && npm publish --tag beta",
    "publish:stable": "npm run version:stable && npm publish --tag latest",
    "publish:promote-beta": "npm dist-tag add guild@$(node -p \"require('./package.json').version\") beta"
  }
}
```

### 4.3 Script: `scripts/version-snapshot.js`

```javascript
/**
 * Genera versión snapshot basada en fecha y build number.
 * Formato: {next-version}-snapshot.{YYYYMMDD}.{build}
 * 
 * El build number se incrementa si ya existe un snapshot del mismo día.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Extraer versión base (sin prerelease tag)
const baseVersion = pkg.version.replace(/-.*$/, '');

// Generar fecha
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

// Build number: incrementar si ya es snapshot del mismo día
let buildNum = 1;
const currentPrerelease = pkg.version.match(/-snapshot\.(\d+)\.(\d+)$/);
if (currentPrerelease && currentPrerelease[1] === dateStr) {
  buildNum = parseInt(currentPrerelease[2]) + 1;
}

const newVersion = `${baseVersion}-snapshot.${dateStr}.${buildNum}`;
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version set to: ${newVersion}`);
```

### 4.4 Script: `scripts/version-beta.js`

```javascript
/**
 * Genera versión beta con incremento automático.
 * Formato: {next-version}-beta.{incremental}
 * 
 * Si la versión actual ya es beta, incrementa el número.
 * Si no, comienza en beta.1
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const baseVersion = pkg.version.replace(/-.*$/, '');

let betaNum = 1;
const currentBeta = pkg.version.match(/-beta\.(\d+)$/);
if (currentBeta) {
  betaNum = parseInt(currentBeta[1]) + 1;
}

const newVersion = `${baseVersion}-beta.${betaNum}`;
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version set to: ${newVersion}`);
```

### 4.5 Script: `scripts/version-stable.js`

```javascript
/**
 * Limpia prerelease tags para generar versión estable.
 * 1.3.0-beta.4 → 1.3.0
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const stableVersion = pkg.version.replace(/-.*$/, '');
pkg.version = stableVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version set to: ${stableVersion}`);
```

### 4.6 GitHub Actions: Snapshot automático

```yaml
# .github/workflows/snapshot.yml
name: Publish Snapshot

on:
  push:
    branches: [dev]
  workflow_dispatch:  # Permite trigger manual

jobs:
  snapshot:
    runs-on: ubuntu-latest
    # Solo publica si los tests pasan
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Set snapshot version
        run: npm run version:snapshot
      
      - name: Publish snapshot
        run: npm publish --tag snapshot
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Comment version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          echo "Published snapshot: $VERSION" >> $GITHUB_STEP_SUMMARY
```

### 4.7 GitHub Actions: Beta manual

```yaml
# .github/workflows/beta.yml
name: Publish Beta

on:
  workflow_dispatch:
    inputs:
      description:
        description: 'What is included in this beta?'
        required: true
        type: string

jobs:
  beta:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Set beta version
        run: npm run version:beta
      
      - name: Publish beta
        run: npm publish --tag beta
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub pre-release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version.outputs.version }}
          prerelease: true
          body: |
            ## Beta Release
            ${{ github.event.inputs.description }}
            
            Install: `npm install -g guild@beta`
          generate_release_notes: true
```

### 4.8 GitHub Actions: Stable release

```yaml
# .github/workflows/release.yml
name: Publish Stable Release

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch  # 1.2.0 → 1.2.1
          - minor  # 1.2.0 → 1.3.0
          - major  # 1.2.0 → 2.0.0

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Bump version
        run: npm version ${{ github.event.inputs.bump }} --no-git-tag-version
      
      - name: Publish stable
        run: npm publish --tag latest
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version.outputs.version }}
          prerelease: false
          generate_release_notes: true
      
      - name: Commit version bump
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          VERSION=$(node -p "require('./package.json').version")
          git add package.json
          git commit -m "release: v${VERSION}"
          git push
```

## 5. Indicador de canal en Guild CLI

Cuando Guild se ejecuta, debe mostrar claramente si es una versión pre-release.

```
# Versión estable - sin indicador extra
Guild v1.2.0

# Beta - indicador amarillo
Guild v1.3.0-beta.2 ⚠ Pre-release: puede contener cambios experimentales

# Snapshot - indicador rojo
Guild v1.3.0-snapshot.20260225.1 ⚠ Snapshot build: solo para desarrollo/testing
```

**Implementación:** Al iniciar Guild, leer `version` de package.json. Si contiene `-beta` o `-snapshot`, mostrar el aviso. Una sola línea, sin ser intrusivo.

### 5.1 Check de actualizaciones

Cuando el usuario corre una versión beta o snapshot, Guild verifica si hay una versión estable más reciente disponible:

```
Guild v1.3.0-beta.2 ⚠ Pre-release
Nota: versión estable disponible (1.2.0). Instala con: npm install -g guild@latest
```

Solo informativo. No bloquea ni insiste.

## 6. Branching strategy

```
main (stable releases)
├── dev (snapshots automáticos en cada merge)
│   ├── feature/compound-learning
│   ├── feature/model-routing
│   └── feature/declarative-workflows
└── research/agent-teams (v2 experimental, no publica a npm)
```

**Reglas:**
- `main` solo recibe merges de `dev` cuando se hace release estable
- `dev` recibe merges de feature branches. Cada merge publica snapshot automáticamente
- `research/*` branches no publican a npm. Son independientes
- Betas se publican manualmente desde `dev` cuando un feature está completo
- Tags de git se crean solo para betas y releases estables, no para snapshots

## 7. Flujos de trabajo

### 7.1 Desarrollo diario

```
1. Developer trabaja en feature/compound-learning
2. Hace PR a dev
3. PR se mergea → snapshot se publica automáticamente
4. Instalar snapshot para probar: npm install -g guild@snapshot
5. Si hay bugs, se fixean en el feature branch, nueva PR, nuevo snapshot
```

### 7.2 Feature listo para validación

```
1. Feature compound-learning completo en dev
2. Tests pasan, README actualizado
3. Trigger manual: GitHub Actions → Publish Beta
4. Se publica guild@1.3.0-beta.1
5. Anunciar en Discord/GitHub: "Beta disponible con compound learning"
6. Feedback de early adopters
7. Fixes → nueva beta: guild@1.3.0-beta.2
```

### 7.3 Release estable

```
1. Todos los features target de v1.3.0 validados en beta
2. Changelog completo, docs actualizados
3. Trigger manual: GitHub Actions → Publish Stable (minor bump)
4. Se publica guild@1.3.0
5. GitHub release con release notes auto-generadas
6. Anunciar en canales principales
```

### 7.4 Hotfix sobre stable

```
1. Bug crítico encontrado en v1.2.0
2. Branch hotfix/fix-crash desde main
3. Fix implementado y testeado
4. Merge a main → Publish Stable (patch bump) → v1.2.1
5. Cherry-pick fix a dev para que no regrese en la próxima minor
```

## 8. Secrets y configuración requerida

| Secret | Dónde | Propósito |
|--------|-------|-----------|
| `NPM_TOKEN` | GitHub Secrets | Publicar a npm registry |
| npm access | package.json | `"publishConfig": { "access": "public" }` |
| GitHub token | Automático | Crear releases y tags |

### 8.1 Configuración de npm (una vez)

```bash
# Verificar que el paquete guild está disponible en npm
npm view guild

# Si el nombre está tomado, usar scoped package
# Alternativa: @guild-framework/guild o @anthropic-guild/core

# Login a npm (una vez, genera token para CI)
npm login
npm token create --read-only=false
# → Copiar token a GitHub Secrets como NPM_TOKEN
```

## 9. Edge cases

| Caso | Comportamiento |
|------|----------------|
| Snapshot falla tests | No se publica. CI falla visiblemente. |
| Dos snapshots el mismo día | Build number se incrementa: snapshot.20260225.1, snapshot.20260225.2 |
| Beta publicada pero se descubre bug bloqueante | Publicar nueva beta con fix. NO hacer unpublish de la anterior (rompe installs cacheados). |
| Nombre del paquete npm tomado | Usar scoped package. Documentar en README. |
| Usuario en snapshot pide soporte | Respuesta estándar: "Este es un snapshot build. Por favor reproduce en la última beta o stable." |

## 10. Acceptance criteria

- [ ] `npm run publish:snapshot` genera versión con formato correcto y publica a npm con tag `snapshot`
- [ ] `npm run publish:beta` genera versión beta incremental y publica con tag `beta`
- [ ] `npm run publish:stable` limpia prerelease tag y publica con tag `latest`
- [ ] GitHub Action de snapshot se ejecuta en cada push a `dev`
- [ ] GitHub Action de beta requiere trigger manual con descripción
- [ ] GitHub Action de release requiere trigger manual con selección de bump type
- [ ] Guild CLI muestra indicador de pre-release al iniciar
- [ ] `npm install -g guild@latest` instala estable
- [ ] `npm install -g guild@beta` instala beta
- [ ] `npm install -g guild@snapshot` instala snapshot
- [ ] Los tres canales coexisten sin interferirse en npm
- [ ] Tests deben pasar antes de cualquier publicación (incluyendo snapshots)

---

*Spec generada: Febrero 2026. Para uso con Guild multi-agent framework.*

## Pipeline Trace

pipeline-start: 2026-02-25
pipeline-end: (in progress)
phases-completed: 4/6
review-fix-loops: 0
qa-cycles: 0
final-gate: pending

### Phase 1 — Evaluation

- **Verdict**: Approved (user override)
- **Risks identified**: ESM/CJS mismatch in spec scripts, package name discrepancy (guild vs guild-agents)

### Phase 2 — Specification

- **Tasks defined**: 7
- **Acceptance criteria**: 38
- **Estimated effort**: 4 Small + 3 Medium

### Phase 3 — Technical Approach

- **Key patterns**: ESModule scripts with fileURLToPath, computation logic in src/utils/version.js, thin wrapper scripts, static imports for CLI indicator
- **Files to modify**: bin/guild.js, package.json, .github/workflows/ci.yml, .github/workflows/release.yml
- **Technical risks**: ESModule side-effect scripts, prepublishOnly double-run, snapshot race condition (acceptable for single dev)

### Phase 4 — Implementation

- **Files created**: src/utils/version.js, scripts/version-snapshot.js, scripts/version-beta.js, scripts/version-stable.js, src/utils/__tests__/version.test.js, .github/workflows/snapshot.yml, .github/workflows/beta.yml
- **Files modified**: bin/guild.js, package.json, .github/workflows/ci.yml, .github/workflows/release.yml
- **Tests added**: 19 (123 total)
- **Commits**: wip: prerelease-publishing phase 4 — implementation done
