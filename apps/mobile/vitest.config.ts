import { createRequire } from 'node:module';
import type { UserConfigExport } from 'vitest/config';

type VitestConfigModule = {
  defineConfig: (config: UserConfigExport) => UserConfigExport;
};

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { defineConfig } = backendRequire('vitest/config') as VitestConfigModule;
const coverageModulePath = backendRequire.resolve('@vitest/coverage-v8');

export default defineConfig({
  resolve: {
    alias: {
      '@vitest/coverage-v8': coverageModulePath,
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        branches: 0.8,
        statements: 0.8,
      },
    },
  },
});
