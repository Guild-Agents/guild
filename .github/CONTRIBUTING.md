# Contributing to Guild AI ⚔️

¡Gracias por querer contribuir a Guild! Este documento explica cómo hacerlo dependiendo del tipo de contribución.

## Tipos de contribución

Guild acepta dos tipos de contribuciones con procesos distintos — porque no es lo mismo aportar una nueva command del CLI que compartir tu conocimiento de Redis:

| Tipo | Qué incluye | Proceso |
|---|---|---|
| **CLI** | `src/`, `bin/`, `package.json`, tests | Completo — requiere tests y review técnico |
| **Expertise** | `src/templates/agents/*/expertise/` | Liviano — foco en calidad de contenido |

Si eres nuevo en open source o nunca has contribuido a Guild antes, **las expertises son el mejor punto de entrada**. Si tienes experiencia real con PostgreSQL, Redis, Vitest, Spring Boot, o cualquier tecnología que un agente de Guild podría necesitar, tu conocimiento es exactamente lo que la comunidad necesita.

---

## Antes de empezar

### Requisitos
- Node.js >= 18
- npm >= 9
- Git

### Setup local
```bash
# Fork el repo en GitHub, luego:
git clone https://github.com/TU_USUARIO/guild.git
cd guild
npm install

# Verificar que todo funciona
npm test
node bin/guild.js --version
```

### Branches
Guild usa GitFlow simplificado:

```
main      ← producción, siempre estable, tagged con versiones npm
develop   ← integración, aquí llegan todos los PRs
```

**Siempre crea tu branch desde `develop`, nunca desde `main`:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo   # nueva feature
git checkout -b fix/nombre-del-bug           # bugfix
```

---

## Tipo A — Contribuciones al CLI

Para cambios en `src/`, `bin/`, `package.json` o la infraestructura del proyecto.

### 1. Abre un issue primero

Para features nuevas o cambios significativos, abre un issue antes de escribir código. Describe qué quieres hacer y por qué. Esto evita que trabajes en algo que no va en la dirección del proyecto.

Para bugfixes pequeños, puedes ir directo al PR.

### 2. Implementa con tests

Guild usa [Vitest](https://vitest.dev/). Cada cambio de comportamiento debe tener tests correspondientes.

```bash
npm test              # corre todos los tests
npm run test:watch    # modo watch durante desarrollo
npm run lint          # verificar estilo de código
```

Cobertura mínima requerida: **80% global**.

### 3. Convenciones de código

- ESModules (`import`/`export`), no CommonJS
- Async/await, no callbacks
- Nombres descriptivos — el código debe leerse como prosa
- Sin comentarios innecesarios — si el código necesita un comentario para entenderse, refactorizar primero
- Errors con mensajes útiles — el usuario tiene que saber qué hacer cuando algo falla

### 4. Abre el PR

Usa el template de PR para CLI. Target: branch `develop`.

```bash
git push origin feature/nombre-descriptivo
# Luego abre el PR en GitHub apuntando a develop
```

El CI debe pasar (lint + tests) antes del review.

---

## Tipo B — Contribuciones de Expertise

Para archivos en `src/templates/agents/*/expertise/`.

Este es el tipo de contribución más valioso para la comunidad porque convierte el conocimiento real de developers como tú en agentes IA más inteligentes.

### Qué es un archivo de expertise

Cada archivo enseña a un agente cómo trabajar con una tecnología específica en el contexto de un proyecto real. No es un tutorial ni un resumen de la documentación oficial — es el conocimiento destilado de alguien que ha usado esa tecnología en producción.

**La prueba de calidad:** si un developer senior especialista en esa tecnología leyera tu expertise, ¿aprendería algo? ¿Reconocería los patrones como reales y no superficiales?

### Estructura del archivo

```
src/templates/agents/[agente]/expertise/[tecnología].md
```

Ejemplo: `src/templates/agents/dba/expertise/redis.md`

### Template de expertise

```markdown
# Expertise: [Nombre de la tecnología]

## Contexto de esta expertise
[Cuándo aplica este conocimiento — en qué tipo de tareas usa el agente esta expertise]

## Patrones idiomáticos
[Los patrones que caracterizan el buen uso de esta tecnología.
No lo que dice la documentación — lo que hacen los developers experimentados.]

## Reglas de este agente con [tecnología]

### Siempre
- [lo que el agente SIEMPRE debe hacer con esta tecnología]

### Nunca
- [lo que el agente NUNCA debe hacer con esta tecnología]

## Anti-patrones comunes
[Errores que cometen los developers que conocen la tecnología pero no la dominan.
Con ejemplos concretos cuando sea posible.]

## Ejemplos de referencia
[Snippets o patrones de código concretos que el agente puede usar como referencia]

## Decisiones frecuentes
[Decisiones de diseño comunes en esta tecnología con el razonamiento detrás de cada opción.
Formato: "Cuando X, usar Y en lugar de Z porque..."]
```

### Proceso

1. Verifica que la expertise no existe ya en el repo
2. Si la expertise existe pero está incompleta o desactualizada, mejórala
3. Crea el archivo siguiendo el template
4. Abre el PR con el template de expertise

No necesitas tests para una expertise. El CI verifica formato básico de Markdown.

---

## Conventional Commits

Guild usa [Conventional Commits](https://www.conventionalcommits.org/) para mantener el historial limpio y generar el CHANGELOG automáticamente.

```
feat: add guild status command
fix: resolve active.md composition when no modes are set
docs: update CONTRIBUTING with expertise template
chore: upgrade @clack/prompts to 0.9.1
feat(expertise): add redis expertise for dba agent
fix(init): handle missing git config gracefully
```

Prefijos válidos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

**Breaking changes:**
```
feat!: rename guild mode flags syntax

BREAKING CHANGE: el prefijo + ya no es necesario para activar modos.
Antes: guild mode developer +react
Ahora: guild mode developer react
```

---

## Proceso de release

Las releases las maneja el mantenedor. Si tu PR está mergeado en `develop`, será incluido en la próxima release. El versionado sigue [Semantic Versioning](https://semver.org/):

- **Patch** `0.x.X` — bugfixes
- **Minor** `0.X.0` — features nuevas sin breaking changes
- **Major** `X.0.0` — breaking changes

---

## ¿Tienes dudas?

Abre un [Discussion](https://github.com/guild-ai/guild/discussions) en GitHub. Los issues son para bugs y feature requests concretos — las discusiones son para preguntas, ideas y feedback general.

---

## Código de conducta

Guild sigue el [Contributor Covenant](https://www.contributor-covenant.org/). En resumen: sé respetuoso, constructivo y asume buena fe.

---

*¿Primera vez contribuyendo a open source? Los issues marcados con `good first issue` son un buen punto de entrada. No dudes en preguntar en las Discussions.*
