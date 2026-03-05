import { describe, it, expect } from 'vitest';
import { wrapZone, extractZones, replaceZone } from '../zones.js';

describe('wrapZone', () => {
  it('wraps content with start and end markers', () => {
    const result = wrapZone('stack', '## Stack\n- Node.js 24');
    expect(result).toBe(
      '<!-- guild:auto-start:stack -->\n## Stack\n- Node.js 24\n<!-- guild:auto-end:stack -->'
    );
  });

  it('trims trailing newline from content before wrapping', () => {
    const result = wrapZone('arch', 'content\n');
    expect(result).toBe(
      '<!-- guild:auto-start:arch -->\ncontent\n<!-- guild:auto-end:arch -->'
    );
  });
});

describe('extractZones', () => {
  it('extracts a single zone from content', () => {
    const content = 'before\n<!-- guild:auto-start:stack -->\n## Stack\n- Node\n<!-- guild:auto-end:stack -->\nafter';
    const zones = extractZones(content);
    expect(zones.has('stack')).toBe(true);
    expect(zones.get('stack').content).toBe('## Stack\n- Node');
  });

  it('extracts multiple zones', () => {
    const content = [
      '<!-- guild:auto-start:stack -->', 'stack content', '<!-- guild:auto-end:stack -->',
      'user content',
      '<!-- guild:auto-start:arch -->', 'arch content', '<!-- guild:auto-end:arch -->',
    ].join('\n');
    const zones = extractZones(content);
    expect(zones.size).toBe(2);
    expect(zones.get('stack').content).toBe('stack content');
    expect(zones.get('arch').content).toBe('arch content');
  });

  it('returns empty map when no zones exist', () => {
    const zones = extractZones('plain content with no markers');
    expect(zones.size).toBe(0);
  });

  it('skips zones with missing end marker', () => {
    const content = 'before\n<!-- guild:auto-start:broken -->\nsome content\nafter';
    const zones = extractZones(content);
    expect(zones.size).toBe(0);
  });
});

describe('replaceZone', () => {
  it('replaces zone content while preserving markers', () => {
    const content = 'before\n<!-- guild:auto-start:stack -->\nold\n<!-- guild:auto-end:stack -->\nafter';
    const result = replaceZone(content, 'stack', 'new content');
    expect(result).toBe('before\n<!-- guild:auto-start:stack -->\nnew content\n<!-- guild:auto-end:stack -->\nafter');
  });

  it('returns content unchanged when zone not found', () => {
    const content = 'no zones here';
    const result = replaceZone(content, 'missing', 'new');
    expect(result).toBe(content);
  });
});
