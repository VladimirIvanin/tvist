import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { OPTIONAL_BROWSER_MODULES } from './src/browser/moduleNames';

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
    passes: 5,
    ecma: 2020,
    toplevel: true,
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ['console.log', 'console.debug'],
  },
  format: {
    comments: false,
    ecma: 2020,
  },
  mangle: { toplevel: true },
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

/** Полный бандл: только конструктор в публичном UMD-экспорте. */
const fullBuildConfig = defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.browser-full.ts'),
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

/** Обычная карусель одним файлом: core + навигация + пагинация + классы слайдов. */
const standardBuildConfig = defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.browser-standard.ts'),
      name: umdName,
      formats: ['umd'],
      fileName: () => 'tvist.standard.min.js',
    },
    rollupOptions: {
      plugins: [bannerFirstPlugin([
        resolve(__dirname, 'browser-build/tvist.standard.min.js'),
      ])],
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

const moduleNames = new Set<string>(OPTIONAL_BROWSER_MODULES);

/** Отдельный IIFE-файл для одного модуля. */
const target = process.env.BUILD_TARGET;
const moduleName = target?.startsWith('module:') ? target.slice('module:'.length) : undefined;
if (moduleName && !moduleNames.has(moduleName)) {
  throw new Error(`Unknown browser module: ${moduleName}`);
}

const singleModuleConfig = moduleName ? defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, `src/browser/modules/${moduleName}.ts`),
      name: `${umdName}Module`,
      formats: ['iife'],
      fileName: () => `modules/${moduleName}.min.js`,
    },
    rollupOptions: {
      plugins: [bannerFirstPlugin([
        resolve(__dirname, `browser-build/modules/${moduleName}.min.js`),
      ])],
    },
    minify: 'terser',
    terserOptions,
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  resolve: commonResolve,
}) : undefined;

export default target === 'core'
  ? coreSplitConfig
  : target === 'standard'
    ? standardBuildConfig
  : target === 'modules'
    ? modulesSplitConfig
    : singleModuleConfig ?? fullBuildConfig;
