const MARKER_START = 'guild:auto-start';
const MARKER_END = 'guild:auto-end';

export function wrapZone(zoneId, content) {
  const trimmed = content.endsWith('\n') ? content.slice(0, -1) : content;
  return `<!-- ${MARKER_START}:${zoneId} -->\n${trimmed}\n<!-- ${MARKER_END}:${zoneId} -->`;
}

export function extractZones(content) {
  const zones = new Map();
  const startPattern = /^<!-- guild:auto-start:(\S+) -->$/gm;
  let match;

  while ((match = startPattern.exec(content)) !== null) {
    const zoneId = match[1];
    const contentStart = match.index + match[0].length + 1; // +1 for newline
    const endMarker = `<!-- ${MARKER_END}:${zoneId} -->`;
    const endIndex = content.indexOf(endMarker, contentStart);
    if (endIndex === -1) continue;

    zones.set(zoneId, {
      start: match.index,
      end: endIndex + endMarker.length,
      content: content.slice(contentStart, endIndex - 1), // -1 to trim newline before end marker
    });
  }

  return zones;
}

export function replaceZone(content, zoneId, newContent) {
  const zones = extractZones(content);
  if (!zones.has(zoneId)) return content;

  const zone = zones.get(zoneId);
  const before = content.slice(0, zone.start);
  const after = content.slice(zone.end);
  return before + wrapZone(zoneId, newContent) + after;
}
