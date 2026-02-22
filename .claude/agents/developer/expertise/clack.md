# Expertise: @clack/prompts — UX de CLI

## Contexto de esta expertise
Aplica en toda interacción con el usuario en los command handlers de Guild: onboarding, confirmaciones, selecciones, spinners y mensajes de estado.

## API de Clack relevante para Guild

### Flujo completo de un comando interactivo

```javascript
import * as p from '@clack/prompts';

export async function runMiComando() {
  // Siempre empezar con intro
  p.intro('Título del proceso');

  // Grupo de prompts relacionados — maneja cancelación automáticamente
  const datos = await p.group(
    {
      nombre: () => p.text({
        message: '¿Nombre del proyecto?',
        placeholder: 'mi-proyecto',
        validate: (val) => {
          if (!val) return 'Requerido';
          if (val.includes(' ')) return 'Sin espacios';
        },
      }),

      tipo: () => p.select({
        message: '¿Qué tipo de proyecto?',
        options: [
          { value: 'fullstack', label: 'Fullstack' },
          { value: 'frontend', label: 'Solo frontend', hint: 'Sin backend' },
        ],
      }),

      tecnologias: () => p.multiselect({
        message: '¿Qué tecnologías usas?',
        options: [
          { value: 'react', label: 'React' },
          { value: 'vite', label: 'Vite' },
        ],
        required: false, // permite selección vacía
      }),

      confirmar: () => p.confirm({
        message: '¿Confirmas la configuración?',
        initialValue: true,
      }),
    },
    {
      onCancel: () => {
        p.cancel('Operación cancelada.');
        process.exit(0);
      },
    }
  );

  // Operación larga con spinner
  const spinner = p.spinner();
  spinner.start('Creando estructura...');
  try {
    await operacionLarga();
    spinner.stop('Estructura creada.');
  } catch (error) {
    spinner.stop('Error al crear estructura.');
    p.log.error(error.message);
    process.exit(1);
  }

  // Mensaje informativo de varias líneas
  p.note(
    'Próximo paso:\n\n  guild mode developer +react\n\nPara cambiar los modos activos.',
    'Qué sigue'
  );

  // Siempre terminar con outro
  p.outro('¡Listo!');
}
```

### Prompts individuales con manejo de cancelación manual

Cuando se usan prompts fuera de `p.group()`:

```javascript
const respuesta = await p.text({ message: '¿Nombre?' });

// SIEMPRE verificar cancelación
if (p.isCancel(respuesta)) {
  p.cancel('Cancelado.');
  process.exit(0);
}
```

### Mensajes de log — cuándo usar cada uno

```javascript
p.log.success('Agente recompuesto correctamente');  // ✅ operación exitosa
p.log.error('No se encontró el agente');            // ❌ error que aborta
p.log.warn('La expertise ya existe — sobreescribiendo'); // ⚠️ advertencia no fatal
p.log.info('Modos activos: react, vite');           // ℹ️ información adicional
p.log.step('Leyendo PROJECT.md...');                // → paso en progreso
```

### p.note() para instrucciones multilinea

```javascript
// Para mostrar comandos o instrucciones al usuario
p.note(
  `Abre Claude Code y ejecuta:\n\n` +
  `  /guild-specialize\n\n` +
  `Este comando especializa los agentes según tu stack.`,
  'Siguiente paso'
);
```

## Reglas para Guild

### Siempre
- `p.intro()` al inicio de cada comando interactivo
- `p.outro()` al final de cada comando exitoso
- `p.cancel()` + `process.exit(0)` cuando el usuario cancela (no es un error)
- `p.log.error()` + `process.exit(1)` cuando hay un error real
- Usar `p.group()` para agrupar prompts relacionados — maneja `onCancel` una sola vez
- Textos en español — Guild está diseñado en español primero

### Nunca
- `console.log` en command handlers — rompe el estilo visual de Clack
- `console.error` — usar `p.log.error()`
- Omitir el manejo de cancelación en prompts fuera de `p.group()`
- Usar `p.spinner()` sin `try/catch` — si la operación falla, el spinner debe detenerse con mensaje de error
- Mostrar stack traces al usuario — solo `error.message`

## Anti-patrones frecuentes

```javascript
// ❌ Sin manejo de cancelación
const nombre = await p.text({ message: '¿Nombre?' });
// Si el usuario cancela, nombre es un Symbol — crasha en el siguiente paso

// ✅ Con manejo de cancelación
const nombre = await p.text({ message: '¿Nombre?' });
if (p.isCancel(nombre)) {
  p.cancel('Cancelado.');
  process.exit(0);
}

// ❌ Spinner sin error handling
const spinner = p.spinner();
spinner.start('Procesando...');
await operacionQuePodriaFallar(); // Si falla, el spinner queda girando
spinner.stop('Listo.');

// ✅ Spinner con error handling
const spinner = p.spinner();
spinner.start('Procesando...');
try {
  await operacionQuePodriaFallar();
  spinner.stop('Listo.');
} catch (e) {
  spinner.stop('Error.');
  p.log.error(e.message);
  process.exit(1);
}
```
