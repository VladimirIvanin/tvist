import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string };
const versionMajor = parseInt(pkg.version.split('.')[0], 10) || 0;

export default defineConfig({
  // publicDir: 'public', // Default

  build: {
    emptyOutDir: false, // Не удалять dist перед сборкой (для сохранения типов)
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Tvist',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'tvist.esm.js';
        if (format === 'cjs') return 'tvist.cjs.js';
        if (format === 'umd') return 'tvist.umd.js';
        return `tvist.${format}.js`;
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css';
          return assetInfo.name || '';
        },
        exports: 'named',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
    assetsInlineLimit: 4096,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
      // Алиас для импорта tvist в dev режиме
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
