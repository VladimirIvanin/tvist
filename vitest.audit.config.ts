import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/audit/**/*.audit.ts'],
    globals: false,
    testTimeout: 60000,
    reporters: ['default', 'json'],
    outputFile: '.tmp/audit/unit-results.json',
  },
});
