#!/usr/bin/env node

/**
 * version-beta.js — Sets package.json to a beta version.
 * Format: {base}-beta.{incremental}
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { computeBetaVersion } from '../src/utils/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

pkg.version = computeBetaVersion(pkg.version);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version set to: ${pkg.version}`);
