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

const terserOptions = {
  compress: {
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ['console.log', 'console.debug'],
  },
  format: {
    comments: false,
  },
};

/** Плагин: дописывает баннер в начало итоговых JS-файлов после сборки (после minify). */
function bannerFirstPlugin(files: string[]): { name: string; closeBundle(): void } {
  return {
    name: 'banner-first',
    closeBundle() {
      files.forEach((filePath) => {
        try {
          const code = readFileSync(filePath, 'utf-8');
          if (!code.startsWith('/*!')) {
            writeFileSync(filePath, banner + code, 'utf-8');
          }
        } catch {
          // файл мог не создаться при данной конфигурации — пропускаем
        }
      });
    },
  };
}

const commonResolve = {
  alias: {
    '@': resolve(__dirname, './src'),
    '@core': resolve(__dirname, './src/core'),
    '@modules': resolve(__dirname, './src/modules'),
    '@utils': resolve(__dirname, './src/utils'),
  },
};

const commonCss = {
  preprocessorOptions: {
    scss: {
      api: 'modern-compiler' as const,
      additionalData: `$tvist-block: 'tvist-v${versionMajor}';`,
    },
  },
};

/**
 * Outro для UMD: нормализует глобал TvistV{N} к конструктору (убирает .default).
 * Для modules-бандла outro не нужен — там нет экспортируемого конструктора.
 */
const coreOutro = `(function(){try{var g=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this;if(g.${umdName}&&g.${umdName}.default)g.${umdName}=g.${umdName}.default;}catch(e){}})();`;

/** Полный бандл (как раньше): tvist.min.js + tvist.css */
const fullBuildConfig = defineConfig({
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
      plugins: [
        bannerFirstPlugin([
          resolve(__dirname, 'browser-build/tvist.min.js'),
        ]),
      ],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css';
          return assetInfo.name || '';
        },
        exports: 'named',
        outro: coreOutro,
      },
    },
    minify: 'terser',
    terserOptions,
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  resolve: commonResolve,
  css: commonCss,
});

/** Core-бандл: tvist.core.min.js + tvist.css (CSS только здесь) */
const coreSplitConfig = defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.browser-core.ts'),
      name: umdName,
      formats: ['umd'],
      fileName: () => 'tvist.core.min.js',
    },
    rollupOptions: {
      plugins: [
        bannerFirstPlugin([
          resolve(__dirname, 'browser-build/tvist.core.min.js'),
        ]),
      ],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css';
          return assetInfo.name || '';
        },
        exports: 'named',
        outro: coreOutro,
      },
    },
    minify: 'terser',
    terserOptions,
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  resolve: commonResolve,
  css: commonCss,
});

/** Modules-бандл: tvist.modules.min.js (без CSS) */
const modulesSplitConfig = defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.browser-modules.ts'),
      // modules-бандл не экспортирует конструктор — используем IIFE
      name: `${umdName}Modules`,
      formats: ['iife'],
      fileName: () => 'tvist.modules.min.js',
    },
    rollupOptions: {
      plugins: [
        bannerFirstPlugin([
          resolve(__dirname, 'browser-build/tvist.modules.min.js'),
        ]),
      ],
      output: {
        exports: 'named',
      },
    },
    minify: 'terser',
    terserOptions,
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  resolve: commonResolve,
  css: commonCss,
});

// Экспортируем конфигурацию.
// При запуске через --config выбираем нужный вариант через переменную окружения BUILD_TARGET.
// По умолчанию — полный бандл.
const target = process.env.BUILD_TARGET;
export default target === 'core'
  ? coreSplitConfig
  : target === 'modules'
    ? modulesSplitConfig
    : fullBuildConfig;
