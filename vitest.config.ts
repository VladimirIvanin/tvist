import { defineConfig } from 'vitest/config';
import { factoryProbes } from './tests/fixtures/factory-probes';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [factoryProbes()],
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 75,
        statements: 70,
        perFile: false,
        autoUpdate: false,
        'src/core/**': { lines: 80, statements: 80, branches: 80, functions: 80 },
      },
    },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
});
