#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, '..');
const backendPackage = new URL('../../backend/package.json', import.meta.url);
const requireFromBackend = createRequire(backendPackage);
let vitestBin;
try {
  vitestBin = requireFromBackend.resolve('vitest/vitest.mjs');
} catch (error) {
  console.error(
    '[run-vitest] Failed to resolve vitest from backend package. Ensure backend dependencies are installed.',
  );
  console.error(error);
  process.exit(1);
}

const cliArgs = process.argv.slice(2);
const vitestArgs = [
  'run',
  '--root',
  mobileRoot,
  '--dir',
  mobileRoot,
  '--passWithNoTests', // Allow empty suites during bootstrap; revisit once coverage grows.
];
let runInBand = false;

for (const arg of cliArgs) {
  if (arg === '--runInBand') {
    runInBand = true;
    continue;
  }

  if (arg === '--ci') {
    if (!('CI' in process.env)) {
      process.env.CI = 'true';
    }
    continue;
  }

  vitestArgs.push(arg);
}

if (runInBand) {
  vitestArgs.push('--pool=threads', '--min-workers=1', '--max-workers=1');
}

const child = spawn(process.execPath, [vitestBin, ...vitestArgs], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  }

  if (signal) {
    // Child terminated via signal; propagate it asynchronously then stop.
    process.kill(process.pid, signal);
    return;
  }

  // Neither exit code nor signal was provided; treat as failure.
  process.exit(1);
});
