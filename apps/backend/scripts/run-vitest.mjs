#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const vitestBin = require.resolve('vitest/vitest.mjs');

const cliArgs = process.argv.slice(2);
const vitestArgs = ['run'];

let runInBand = false;
let includeCoverage = true;

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

  if (arg === '--no-coverage') {
    includeCoverage = false;
    continue;
  }

  vitestArgs.push(arg);
}

if (includeCoverage) {
  vitestArgs.push('--coverage');
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
