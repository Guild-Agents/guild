/**
 * version.js — Version detection and computation utilities for Guild CLI.
 *
 * Provides pure functions for parsing semver strings, detecting pre-release
 * channels, computing next snapshot/beta/stable versions, and generating
 * user-facing warning messages.
 */

/**
 * Parses a semver string into its components.
 * @param {string} version - The version string from package.json
 * @returns {{ base: string, channel: string, prerelease: string|null }}
 */
export function parseVersion(version) {
  const match = version.match(/^(\d+\.\d+\.\d+)(?:-(.+))?$/);
  if (!match) {
    return { base: version, channel: 'stable', prerelease: null };
  }

  const base = match[1];
  const prerelease = match[2] || null;

  let channel = 'stable';
  if (prerelease?.startsWith('beta')) channel = 'beta';
  else if (prerelease?.startsWith('snapshot')) channel = 'snapshot';

  return { base, channel, prerelease };
}

/**
 * Returns a warning string for pre-release versions, or null for stable.
 * @param {string} version
 * @returns {string|null}
 */
export function getPreReleaseWarning(version) {
  const { channel } = parseVersion(version);

  if (channel === 'snapshot') {
    return 'Snapshot build: for development/testing only';
  }
  if (channel === 'beta') {
    return 'Pre-release: may contain experimental changes';
  }
  return null;
}

/**
 * Computes the next snapshot version.
 * @param {string} currentVersion - e.g. "0.3.1" or "0.4.0-snapshot.20260225.1"
 * @param {Date} [now=new Date()] - injectable for testing
 * @returns {string} - e.g. "0.3.1-snapshot.20260225.1"
 */
export function computeSnapshotVersion(currentVersion, now = new Date()) {
  const baseVersion = currentVersion.replace(/-.*$/, '');
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  let buildNum = 1;
  const currentPrerelease = currentVersion.match(/-snapshot\.(\d+)\.(\d+)$/);
  if (currentPrerelease && currentPrerelease[1] === dateStr) {
    buildNum = parseInt(currentPrerelease[2], 10) + 1;
  }

  return `${baseVersion}-snapshot.${dateStr}.${buildNum}`;
}

/**
 * Computes the next beta version.
 * @param {string} currentVersion - e.g. "0.4.0" or "0.4.0-beta.2"
 * @returns {string} - e.g. "0.4.0-beta.1" or "0.4.0-beta.3"
 */
export function computeBetaVersion(currentVersion) {
  const baseVersion = currentVersion.replace(/-.*$/, '');

  let betaNum = 1;
  const currentBeta = currentVersion.match(/-beta\.(\d+)$/);
  if (currentBeta) {
    betaNum = parseInt(currentBeta[1], 10) + 1;
  }

  return `${baseVersion}-beta.${betaNum}`;
}

/**
 * Computes the stable version by stripping any prerelease suffix.
 * @param {string} currentVersion - e.g. "0.4.0-beta.3"
 * @returns {string} - e.g. "0.4.0"
 */
export function computeStableVersion(currentVersion) {
  return currentVersion.replace(/-.*$/, '');
}
