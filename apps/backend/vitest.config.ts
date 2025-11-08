import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      provider: 'v8',
      // Include all backend source files and skip tests so every module contributes.
      include: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
      ],
      thresholds: {
        lines: 0.8,
        statements: 0.8,
        branches: 0.8,
        functions: 0.8,
      },
    },
  },
  resolve: {
    alias: {
      '@berthcare/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
    },
  },
});
