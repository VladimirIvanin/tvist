import { defineConfig } from 'vite'
import { resolve, sep } from 'node:path'
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function pages(dir: string, prefix = ''): Array<[string, string]> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return pages(resolve(dir, entry.name), relative)
    return entry.name.endsWith('.html')
      ? [[relative.replace(/\.html$/, ''), resolve(dir, entry.name)]]
      : []
  })
}

const docsSiteRoot = resolve('docs/site')

function isWithinDocsSite(filePath: string): boolean {
  return filePath.startsWith(`${docsSiteRoot}${sep}`)
}

export default defineConfig({
  root: resolve('docs/.generated'),
  base: '/tvist/',
  publicDir: resolve('docs/.generated/public'),
  plugins: [{
    name: 'tvist-docs-content',
    configureServer(server) {
      server.middlewares.use('/site', async (request, response, next) => {
        const pathname = request.url?.split('?')[0] || ''
        const filePath = resolve(docsSiteRoot, `.${pathname}`)
        if (!isWithinDocsSite(filePath)) return next()

        const transformed = await server.transformRequest(`/@fs/${filePath}`)
        if (!transformed) return next()

        response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'application/javascript')
        response.end(transformed.code)
      })
      server.watcher.add([resolve('docs/guide'), resolve('docs/api'), resolve('docs/examples'), resolve('docs/site/demos.json'), resolve('docs/site/variants.json')])
      const refresh = (file: string) => {
        if (!file.endsWith('.md') && !/(?:demos|variants)\.json$/.test(file)) return
        const result = spawnSync('npm', ['run', 'docs:generate'], { stdio: 'inherit' })
        if (result.status === 0) server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', refresh)
      server.watcher.on('add', refresh)
    },
  }],
  resolve: {
    alias: {
      '@': resolve('src'),
      '@core': resolve('src/core'),
      '@modules': resolve('src/modules'),
      '@utils': resolve('src/utils'),
    },
  },
  server: {
    port: 3001,
    fs: { allow: [resolve('.')] },
  },
  build: {
    outDir: resolve('docs/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(pages(resolve('docs/.generated'))),
    },
  },
})
