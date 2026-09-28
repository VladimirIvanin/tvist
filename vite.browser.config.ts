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

const target = process.env.BUILD_TARGET ?? 'core';
if (target !== 'core' && target !== 'modules' && target !== 'full') {
  throw new Error(`Unknown browser build target: ${target}`);
}
const isCore = target === 'core';
const exportsConstructor = target !== 'modules';
const fileBase = target === 'full' ? 'tvist' : `tvist.${target}`;
const jsFile = `${fileBase}.min.js`;

export default defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: isCore,
    lib: {
      entry: resolve(__dirname, `src/index.browser-${target}.ts`),
      name: exportsConstructor ? umdName : `${umdName}Modules`,
      formats: [exportsConstructor ? 'umd' : 'iife'],
      fileName: () => jsFile,
      cssFileName: fileBase,
    },
    rollupOptions: {
      plugins: [bannerFirstPlugin([resolve(__dirname, 'browser-build', jsFile)])],
      output: {
        exports: 'named',
        ...(exportsConstructor ? { outro: coreOutro } : {}),
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
