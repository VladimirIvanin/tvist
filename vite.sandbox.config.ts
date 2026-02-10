import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };
const versionMajor = parseInt(pkg.version.split('.')[0], 10) || 0;

export default defineConfig({
  root: resolve(__dirname, 'sandbox'),
  publicDir: false,
  
  server: {
    port: 3000,
    open: true,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
      'tvist': resolve(__dirname, './src/index.ts'),
    },
  },
  
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `$tvist-block: 'tvist-v${versionMajor}';`,
      },
    },
  },
});
