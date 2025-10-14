import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';

  return {
    // Настройки для dev-сервера
    root: isServe ? resolve(__dirname, 'examples') : __dirname,
    publicDir: isServe ? false : 'public',
    
    server: {
      port: 3000,
      open: true,
      cors: true,
    },

    build: {
      emptyOutDir: false, // Не удалять dist перед сборкой (для сохранения типов)
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'Velosiped',
        formats: ['es', 'cjs', 'umd'],
        fileName: (format) => {
          if (format === 'es') return 'velosiped.esm.js';
          if (format === 'cjs') return 'velosiped.cjs.js';
          if (format === 'umd') return 'velosiped.umd.js';
          return `velosiped.${format}.js`;
        },
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'velosiped.css';
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
        // Алиас для импорта velosiped в dev режиме
        'velosiped': resolve(__dirname, './src/index.ts'),
      },
    },
    
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  };
});

