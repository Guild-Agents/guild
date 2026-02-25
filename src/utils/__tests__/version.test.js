import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  getPreReleaseWarning,
  computeSnapshotVersion,
  computeBetaVersion,
  computeStableVersion,
} from '../version.js';

describe('parseVersion', () => {
  it('parses stable version', () => {
    expect(parseVersion('0.3.1')).toEqual({
      base: '0.3.1', channel: 'stable', prerelease: null,
    });
  });

  it('parses beta version', () => {
    expect(parseVersion('0.4.0-beta.3')).toEqual({
      base: '0.4.0', channel: 'beta', prerelease: 'beta.3',
    });
  });

  it('parses snapshot version', () => {
    expect(parseVersion('0.4.0-snapshot.20260225.1')).toEqual({
      base: '0.4.0', channel: 'snapshot', prerelease: 'snapshot.20260225.1',
    });
  });

  it('handles unknown prerelease tag as stable', () => {
    expect(parseVersion('1.0.0-rc.1')).toEqual({
      base: '1.0.0', channel: 'stable', prerelease: 'rc.1',
    });
  });

  it('handles malformed version gracefully', () => {
    expect(parseVersion('not-a-version')).toEqual({
      base: 'not-a-version', channel: 'stable', prerelease: null,
    });
  });
});

describe('getPreReleaseWarning', () => {
  it('returns null for stable version', () => {
    expect(getPreReleaseWarning('0.3.1')).toBeNull();
  });

  it('returns warning for beta', () => {
    const warning = getPreReleaseWarning('0.4.0-beta.1');
    expect(warning).toContain('Pre-release');
  });

  it('returns warning for snapshot', () => {
    const warning = getPreReleaseWarning('0.4.0-snapshot.20260225.1');
    expect(warning).toContain('Snapshot');
  });

  it('returns null for unknown prerelease tags', () => {
    expect(getPreReleaseWarning('1.0.0-rc.1')).toBeNull();
  });
});

describe('computeSnapshotVersion', () => {
  const fixedDate = new Date('2026-02-25T12:00:00Z');

  it('creates snapshot from stable version', () => {
    expect(computeSnapshotVersion('0.3.1', fixedDate))
      .toBe('0.3.1-snapshot.20260225.1');
  });

  it('increments build number for same-day snapshot', () => {
    expect(computeSnapshotVersion('0.3.1-snapshot.20260225.1', fixedDate))
      .toBe('0.3.1-snapshot.20260225.2');
  });

  it('resets build number for different day', () => {
    const nextDay = new Date('2026-02-26T12:00:00Z');
    expect(computeSnapshotVersion('0.3.1-snapshot.20260225.3', nextDay))
      .toBe('0.3.1-snapshot.20260226.1');
  });

  it('strips beta suffix before creating snapshot', () => {
    expect(computeSnapshotVersion('0.4.0-beta.3', fixedDate))
      .toBe('0.4.0-snapshot.20260225.1');
  });
});

describe('computeBetaVersion', () => {
  it('creates beta.1 from stable version', () => {
    expect(computeBetaVersion('0.3.1')).toBe('0.3.1-beta.1');
  });

  it('increments beta number', () => {
    expect(computeBetaVersion('0.3.1-beta.1')).toBe('0.3.1-beta.2');
  });

  it('strips snapshot suffix before creating beta', () => {
    expect(computeBetaVersion('0.4.0-snapshot.20260225.1'))
      .toBe('0.4.0-beta.1');
  });
});

describe('computeStableVersion', () => {
  it('strips beta suffix', () => {
    expect(computeStableVersion('0.4.0-beta.4')).toBe('0.4.0');
  });

  it('strips snapshot suffix', () => {
    expect(computeStableVersion('0.4.0-snapshot.20260225.1')).toBe('0.4.0');
  });

  it('leaves stable version unchanged', () => {
    expect(computeStableVersion('0.3.1')).toBe('0.3.1');
  });
});
