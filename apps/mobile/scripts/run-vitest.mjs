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
const vitestBin = requireFromBackend.resolve('vitest/vitest.mjs');

const cliArgs = process.argv.slice(2);
const vitestArgs = ['run', '--root', mobileRoot, '--dir', mobileRoot, '--passWithNoTests'];
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
    process.kill(process.pid, signal);
  } else {
    process.exit(1);
  }
});
