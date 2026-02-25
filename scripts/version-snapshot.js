#!/usr/bin/env node

/**
 * version-snapshot.js — Sets package.json to a snapshot version.
 * Format: {base}-snapshot.{YYYYMMDD}.{build}
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { computeSnapshotVersion } from '../src/utils/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

pkg.version = computeSnapshotVersion(pkg.version);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version set to: ${pkg.version}`);
