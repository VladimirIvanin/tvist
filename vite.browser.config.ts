import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { checkBrowserSize } from './scripts/check-browser-size';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
  repository?: { url?: string };
  homepage?: string;
};
const repoUrl =
  pkg.repository?.url?.replace(/\.git$/, '') ||
  pkg.homepage?.replace(/#.*$/, '') ||
  'https://github.com/VladimirIvanin/tvist';
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
  mangle: { toplevel: true, properties: { regex: /^__tvistInternal_/ } },
};

/** Добавляет баннер после минификации, проверяет размер и сохраняет gzip-копии JS. */
function bannerFirstPlugin(files: string[]): { name: string; closeBundle(): void } {
  return {
    name: 'banner-first',
    closeBundle() {
      files.forEach((filePath) => {
        const code = readFileSync(filePath, 'utf-8');
        if (!code.startsWith('/*!')) writeFileSync(filePath, banner + code, 'utf-8');
      });
      checkBrowserSize(resolve(__dirname, 'browser-build', jsFile));
      files.forEach((filePath) => {
        const compressed = gzipSync(readFileSync(filePath));
        writeFileSync(`${filePath}.gz`, compressed);
        console.log(`browser-build/${jsFile}.gz: ${compressed.length} bytes`);
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
 */
const coreOutro = `(function(){try{var g=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this;if(g.${umdName}&&g.${umdName}.default)g.${umdName}=g.${umdName}.default;}catch(e){}})();`;

const jsFile = 'tvist.min.js';

export default defineConfig({
  build: {
    outDir: 'browser-build',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.browser-full.ts'),
      name: umdName,
      formats: ['umd'],
      fileName: () => jsFile,
      cssFileName: 'tvist',
    },
    rollupOptions: {
      plugins: [bannerFirstPlugin([resolve(__dirname, 'browser-build', jsFile)])],
      output: {
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
