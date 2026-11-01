import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/audit/slider-deep.audit.ts'],
    globals: false,
    setupFiles: [],
    fileParallelism: false,
    testTimeout: 3600000,
    hookTimeout: 660000,
    reporters: ['default', 'json'],
    outputFile: process.env.AUDIT_SLIDER_VITEST ?? '.tmp/audit/slider-deep-vitest.json',
  },
});
