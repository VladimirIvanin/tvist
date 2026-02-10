import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string; repository?: { url?: string }; homepage?: string };
const repoUrl = pkg.repository?.url?.replace(/\.git$/, '') || pkg.homepage?.replace(/#.*$/, '') || 'https://github.com/VladimirIvanin/tvist';
const banner = `/*! Tvist v${pkg.version} | ${repoUrl} */\n`;
const versionMajor = parseInt(pkg.version.split('.')[0], 10) || 0;
const umdName = `TvistV${versionMajor}`;

/** Плагин: дописывает баннер в самое начало итогового JS после сборки (после minify). */
function bannerFirstPlugin(): { name: string; closeBundle(): void } {
  return {
    name: 'banner-first',
    closeBundle() {
      const path = resolve(__dirname, 'browser-build/tvist.min.js');
      const code = readFileSync(path, 'utf-8');
      if (!code.startsWith('/*!')) {
        writeFileSync(path, banner + code, 'utf-8');
      }
    },
  };
}

/** Сборка только минифицированной версии для браузера (UMD). Результат в browser-build/ для коммита и скачивания. */
export default defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: umdName,
      formats: ['umd'],
      fileName: () => 'tvist.min.js',
    },
    rollupOptions: {
      plugins: [bannerFirstPlugin()],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css';
          return assetInfo.name || '';
        },
        exports: 'named',
        // В браузере глобал TvistV{N} = конструктор (N = major из package.json)
        outro: `(function(){try{var g=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this;if(g.${umdName}&&g.${umdName}.default)g.${umdName}=g.${umdName}.default;}catch(e){}})();`,
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
        additionalData: `$tvist-block: 'tvist-v${versionMajor}';`,
      },
    },
  },
});
