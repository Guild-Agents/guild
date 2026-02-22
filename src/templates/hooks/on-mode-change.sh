#!/bin/bash
# on-mode-change.sh
# Hook ejecutado por `guild mode` al cambiar los modos de un agente.
# Regenera active.md = base.md + expertise/modo1.md + expertise/modo2.md + ...
#
# Uso: on-mode-change.sh <agent> [modo1 modo2 ...]
# Ejemplo: on-mode-change.sh developer react vite node

set -e

AGENT=$1
shift
MODES=("$@")

AGENTS_DIR=".claude/agents"
AGENT_DIR="${AGENTS_DIR}/${AGENT}"
BASE="${AGENT_DIR}/base.md"
ACTIVE="${AGENT_DIR}/active.md"
DATE=$(date +%Y-%m-%d)

# Validaciones
if [ -z "$AGENT" ]; then
  echo "Error: nombre de agente requerido"
  echo "Uso: on-mode-change.sh <agent> [modo1 modo2 ...]"
  exit 1
fi

if [ ! -d "$AGENT_DIR" ]; then
  echo "Error: agente '${AGENT}' no encontrado en ${AGENTS_DIR}"
  exit 1
fi

if [ ! -f "$BASE" ]; then
  echo "Error: base.md no encontrado en ${AGENT_DIR}"
  exit 1
fi

# Iniciar active.md con el contenido base
cat "$BASE" > "$ACTIVE"

# Agregar cada expertise activa
LOADED_MODES=()
MISSING_MODES=()

for MODE in "${MODES[@]}"; do
  EXPERTISE="${AGENT_DIR}/expertise/${MODE}.md"
  if [ -f "$EXPERTISE" ]; then
    echo "" >> "$ACTIVE"
    echo "---" >> "$ACTIVE"
    echo "" >> "$ACTIVE"
    cat "$EXPERTISE" >> "$ACTIVE"
    LOADED_MODES+=("$MODE")
  else
    MISSING_MODES+=("$MODE")
  fi
done

# Footer con metadatos
echo "" >> "$ACTIVE"
echo "---" >> "$ACTIVE"
echo "" >> "$ACTIVE"
echo "<!-- Generado automáticamente por Guild — ${DATE} -->" >> "$ACTIVE"
if [ ${#LOADED_MODES[@]} -gt 0 ]; then
  echo "<!-- Modos activos: ${LOADED_MODES[*]} -->" >> "$ACTIVE"
else
  echo "<!-- Modos activos: solo base -->" >> "$ACTIVE"
fi
echo "<!-- No editar manualmente — usar: guild mode ${AGENT} [modos] -->" >> "$ACTIVE"

# Output
echo "✓ ${AGENT} recompuesto"
if [ ${#LOADED_MODES[@]} -gt 0 ]; then
  echo "  Modos cargados: ${LOADED_MODES[*]}"
fi
if [ ${#MISSING_MODES[@]} -gt 0 ]; then
  echo "  ⚠ Expertises no encontradas (usar /guild-specialize o guild upskill): ${MISSING_MODES[*]}"
fi
