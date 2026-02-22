# Expertise: Vitest — Testing del CLI

## Contexto de esta expertise
Aplica cuando QA valida que los tests escritos por el Developer cubren correctamente los criterios de aceptación, y cuando verifica que la cobertura mínima está alcanzada.

## Cómo correr los tests en Guild

```bash
npm test                    # todos los tests una vez
npm run test:watch          # modo watch durante desarrollo
npm run test:coverage       # con reporte de cobertura
npx vitest run --reporter=verbose  # con detalle de cada test
```

## Estructura de tests esperada

```
tests/
  utils/
    composer.test.js        # tests de composeAgent, composeAllAgents
    generators.test.js      # tests de generateProjectMd, generateSessionMd, etc.
    files.test.js           # tests de copyAgentTemplates, getAgentNames
    github.test.js          # tests de isGhAvailable, extractRepoFromUrl
  commands/
    mode.test.js            # tests de parseModeArgs, getCurrentModes
    init.test.js            # tests de integración del onboarding
```

## Lo que QA valida en los tests de Guild

### Para utils/ — cobertura 90%

Cada función pública de utils debe tener tests que cubran:
- El caso happy path
- El caso de archivo o directorio no encontrado
- El caso de input inválido
- Los edge cases documentados en los JSDoc

Ejemplo de criterios de aceptación a validar:

**`composeAgent(agentName, modes)`:**
- ✅ Genera active.md concatenando base.md + expertise de cada modo
- ✅ Funciona con lista de modos vacía (solo base.md)
- ✅ Ignora silenciosamente modos cuyo archivo de expertise no existe
- ✅ El active.md generado incluye el footer con metadatos
- ✅ Lanza error descriptivo si base.md no existe

**`generateProjectMd(data)`:**
- ✅ Genera PROJECT.md con todas las secciones requeridas
- ✅ Las secciones opcionales (scope, github) están presentes solo si se proporcionaron
- ✅ Los modos de agentes reflejan el stack proporcionado
- ✅ La cobertura mínima de tests está incluida en el archivo generado

### Para commands/ — cobertura 80%

Los command handlers son difíciles de testear por su dependencia de Clack. QA acepta:
- Tests de la lógica de parseo (ej: `parseModeArgs`)
- Tests de las validaciones previas a la interacción
- Tests de integración que verifican que el comando no crashea con inputs válidos

Lo que QA NO exige para commands/:
- Simular la interacción completa con Clack (muy complejo sin beneficio proporcional)
- 100% de cobertura de los handlers — la lógica de negocio está en utils

## Qué busca QA en los tests existentes

### Calidad de los tests

**Tests buenos para Guild:**
```javascript
it('composeAgent genera active.md con base + expertise', async () => {
  // Arrange — setup claro
  mkdirSync(join(testDir, '.claude/agents/developer/expertise'), { recursive: true });
  writeFileSync(join(testDir, '.claude/agents/developer/base.md'), '# Base');
  writeFileSync(join(testDir, '.claude/agents/developer/expertise/react.md'), '# React');

  // Act — una sola acción
  process.chdir(testDir);
  await composeAgent('developer', ['react']);

  // Assert — verificación precisa
  const content = readFileSync(join(testDir, '.claude/agents/developer/active.md'), 'utf8');
  expect(content).toContain('# Base');
  expect(content).toContain('# React');
  expect(content).toContain('---'); // separador entre secciones
});
```

**Tests que QA rechaza:**
```javascript
// ❌ Test que no limpia después de sí mismo
it('genera PROJECT.md', async () => {
  await generateProjectMd(data);
  // No hay cleanup — contamina otros tests
});

// ❌ Test que asume paths absolutos del entorno de CI
it('copia templates', () => {
  const result = copyFile('/home/runner/work/guild/templates/...'); // hardcoded
});

// ❌ Test sin assertions significativas
it('composeAgent no falla', async () => {
  await expect(composeAgent('developer', [])).resolves.not.toThrow();
  // Verifica que no crashea pero no que hace lo correcto
});
```

### Cobertura — qué mirar en el reporte

QA verifica el reporte de cobertura con:
```bash
npm run test:coverage
```

Presta atención especialmente a:
- **Líneas no cubiertas en composer.js y generators.js** — son el corazón del framework
- **Branches no cubiertos** — el `if (existsSync(...))` con false, los `if (modes.length === 0)`
- **Funciones no cubiertas** — cualquier función exportada que no tenga tests

## Reglas de QA para Guild

### Siempre
- Correr `npm test` antes de aprobar una tarea — no solo revisar el código
- Verificar que los tests limpian el filesystem en `afterEach`
- Verificar que los tests funcionan en aislamiento (no dependen del orden de ejecución)
- Revisar que los edge cases del JSDoc tienen tests correspondientes

### Nunca
- Aprobar una tarea donde los tests pasan pero no validan el criterio de aceptación real
- Aprobar si la cobertura de utils/ está por debajo del 90%
- Ignorar tests que están siendo saltados con `it.skip` sin justificación documentada
