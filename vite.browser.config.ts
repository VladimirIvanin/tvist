import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Сборка только минифицированной версии для браузера (UMD). Результат в browser-build/ для коммита и скачивания. */
export default defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Tvist',
      formats: ['umd'],
      fileName: () => 'tvist.min.js',
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
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
