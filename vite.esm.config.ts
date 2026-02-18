import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string }
const versionMajor = parseInt(pkg.version.split('.')[0], 10) || 0

export default defineConfig({
  build: {
    outDir: 'browser-build/esm',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.esm.ts'),
      formats: ['es'],
      fileName: () => 'tvist.js',
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Опциональные модули — каждый в свой чанк
          if (id.includes('/modules/pagination/')) return 'modules/pagination'
          if (id.includes('/modules/autoplay/')) return 'modules/autoplay'
          if (id.includes('/modules/loop/')) return 'modules/loop'
          if (id.includes('/modules/navigation/')) return 'modules/navigation'
          if (id.includes('/modules/video/')) return 'modules/video'
          if (id.includes('/modules/scrollbar/')) return 'modules/scrollbar'
          if (id.includes('/modules/marquee/')) return 'modules/marquee'
          if (id.includes('/modules/grid/')) return 'modules/grid'
          if (id.includes('/modules/lazyload/')) return 'modules/lazyload'
          if (id.includes('/modules/scroll-control/')) return 'modules/scroll-control'
          if (id.includes('/modules/thumbs/')) return 'modules/thumbs'
          if (id.includes('/modules/effects/')) return 'modules/effects'
          // Всё остальное (ядро, utils, core) — остаётся в entry tvist.js
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css'
          return assetInfo.name || ''
        },
        chunkFileNames: '[name].js',
        entryFileNames: 'tvist.js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      format: { comments: false },
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

  plugins: [
    visualizer({
      filename: 'browser-build/esm/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
})
