import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, posix } from 'node:path'
import MarkdownIt from 'markdown-it'

const root = resolve('docs')
const output = join(root, '.generated')
const base = '/tvist/'
const version = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }).version
const demos = JSON.parse(readFileSync(join(root, 'site/demos.json'), 'utf8')) as Array<{
  id: string
  title: string
  category: string
  description: string
}>
const variants = JSON.parse(readFileSync(join(root, 'site/variants.json'), 'utf8')) as typeof demos
const demoById = new Map([...demos, ...variants].map((demo) => [demo.id, demo]))
const componentDemos: Record<string, string> = {
  BasicExample: 'basic', PerPageExample: 'perpage', PeekBasicExample: 'peek',
  PeekPercentExample: 'peek-percent', PeekAsymmetricExample: 'peek-asymmetric',
  PeekPerPageExample: 'peek-perpage', PeekVerticalExample: 'peek-vertical',
  PeekBreakpointsExample: 'peek-breakpoints', PeekTrimExample: 'peek-trim',
  PeekMixedUnitsExample: 'peek-mixed-units',
  CenterBasicExample: 'center', CenterPerPage2Example: 'center-perpage2',
  CenterPerPage4Example: 'center-perpage4', CenterLoopExample: 'center-loop',
  CenterFocusExample: 'center-focus', CenterJustifyLockedExample: 'center-locked',
  ResponsiveExample: 'responsive', ProductCardsExample: 'product-cards',
  UpdateOptionsExample: 'update-options', LoopExample: 'loop',
  LoopClonesExample: 'loop-clones', LoopImagesExample: 'loop-images',
  LoopPeekGapExample: 'loop-peek-gap', MarqueeDocExample: 'marquee',
  AutoplayBasicExample: 'autoplay', AutoplayLoopExample: 'autoplay-loop',
  AutoplayRewindExample: 'autoplay-rewind', FadeExample: 'effect-fade',
  CubeExample: 'effect-cube', StackExample: 'effect-stack',
  VerticalExample: 'vertical', VerticalThumbsExample: 'vertical-thumbs',
  DragFreeDocExample: 'drag-free', ScrollControlDocExample: 'scroll-control',
  LockExample: 'lock', DragNavigationExample: 'modules',
  AutoplayExample: 'modules-autoplay', ThumbsExample: 'thumbs',
  GridExample: 'grid', GridDimensionsExample: 'grid-dimensions',
  AutoWidthExample: 'auto-width', AutoHeightExample: 'auto-height',
  NestedSlidersExample: 'nested-sliders', StoriesDocExample: 'stories',
  VisibilityAutoplayExample: 'visibility', VisibilityMarqueeExample: 'visibility-marquee',
  FixedSizeExample: 'fixed-size', LazyLoadDocExample: 'lazyload',
  VideoDocExample: 'video',
}
const inlineDemos: Record<string, string> = {
  defaultRef: 'navigation', outsideRef: 'navigation-outside',
  bulletsRef: 'pagination', fractionRef: 'pagination-fraction',
  progressRef: 'pagination-progress', customRef: 'pagination-custom',
  evenRef: 'pagination-even', evenCenterRef: 'pagination-even-center',
  centerRef: 'pagination-center', basicRef: 'scrollbar',
  verticalRef: 'scrollbar-vertical', hiddenRef: 'scrollbar-hidden',
}
const optionsMeta = JSON.parse(readFileSync(join(root, 'site/options-meta.json'), 'utf8')) as {
  options: Array<{ name: string; type: string; default: string; description: string }>
}
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function href(path: string, route: string): string {
  if (path.startsWith('#') || /^(https?:|mailto:|data:|\/\/)/.test(path)) return path
  const [pathname = '', hash = ''] = path.split('#')
  const normalized = (pathname.startsWith('/')
    ? pathname.slice(1)
    : posix.normalize(posix.join(posix.dirname(route), pathname))).replace(/\.md$/, '')
  if (!normalized) return base + (hash ? '#' + hash : '')
  if (/\.(?:png|jpe?g|webp|svg|mp4)$/.test(normalized)) return base + normalized
  const target = normalized.endsWith('.html')
    ? normalized
    : normalized.endsWith('/') ? normalized + 'index.html' : normalized + '.html'
  return base + target + (hash ? '#' + hash : '')
}

const defaultLink = md.renderer.rules.link_open
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const token = tokens[idx]!
  const attr = token.attrIndex('href')
  const value = token.attrs?.[attr]?.[1]
  if (attr >= 0 && typeof value === 'string') token.attrSet('href', href(value, (env as { route?: string }).route || 'index.html'))
  return defaultLink ? defaultLink(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts)
}

function stripFrontmatter(source: string): string {
  if (!source.startsWith('---\n')) return source
  const end = source.indexOf('\n---\n', 4)
  return end >= 0 ? source.slice(end + 5) : source
}

function cleanMarkdown(source: string): string {
  const lines = stripFrontmatter(source).replaceAll('{{TVIST_VERSION}}', version).replaceAll('{{TVIST_VERSION_TAG}}', `v${version}`).split('\n')
  const result: string[] = []
  let fence = false
  let skipping: 'script' | 'style' | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) fence = !fence
    if (!fence) {
      if (skipping) {
        if (trimmed.startsWith(`</${skipping}>`)) skipping = null
        continue
      }
      if (/^<script setup/.test(trimmed)) { skipping = 'script'; continue }
      if (/^<style(?:\s|>)/.test(trimmed)) { skipping = 'style'; continue }
      if (!/^<Demo\s/.test(trimmed) && /^<(?:[A-Z][A-Za-z0-9]*|\/([A-Z][A-Za-z0-9]*))(?:\s[^>]*)?\s*\/?>(?:\s*)$/.test(trimmed)) continue
      if (/^<\/?(?:template|details|summary)(?:\s[^>]*)?>$/.test(trimmed)) continue
      if (/^:::\s*(tip|warning|info|danger)?/.test(trimmed)) {
        result.push(trimmed === ':::' ? '</aside>' : `<aside class="note"><strong>${escapeHtml(trimmed.slice(3).trim())}</strong>`)
        continue
      }
    }
    result.push(line)
  }
  return result.join('\n')
}

function renderOptionsTable(): string {
  const rows = optionsMeta.options.map((o) => `<tr><th scope="row"><code>${escapeHtml(o.name)}</code></th><td><code>${escapeHtml(o.type)}</code></td><td><code>${escapeHtml(o.default)}</code></td><td>${escapeHtml(o.description)}</td></tr>`).join('')
  return `<div class="table-scroll"><table class="options-table"><thead><tr><th>Опция</th><th>Тип</th><th>По умолчанию</th><th>Описание</th></tr></thead><tbody>${rows}</tbody></table></div>`
}

function cleanExampleMarkdown(source: string): string {
  const withLegacyDemos = source.replace(/<([A-Z][A-Za-z0-9]*Example)\b([^>]*)\/>/g, (full, component: string, props: string) => {
    const id = component === 'ScrollControlDocExample' && props.includes('vertical') ? 'scroll-control-vertical' : componentDemos[component]
    return id ? `<Demo id="${id}" />` : full
  })
  const withDemoSlots = withLegacyDemos.replace(/<Demo\s+id="([a-z0-9-]+)"\s*\/>/g, '<div data-demo-slot="$1"></div>')
  const lines = cleanMarkdown(withDemoSlots).split('\n')
  const cleaned: string[] = []
  let fence = false
  let legacyDemoDepth = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) { fence = !fence; continue }
    if (!fence && (/^<div\s+ref=/.test(trimmed) || legacyDemoDepth > 0)) {
      if (legacyDemoDepth === 0) {
        const ref = trimmed.match(/\bref="([^"]+)"/)?.[1]
        const id = ref && inlineDemos[ref]
        if (id) cleaned.push(`<div data-demo-slot="${id}"></div>`)
      }
      legacyDemoDepth += (line.match(/<div\b/g) || []).length - (line.match(/<\/div>/g) || []).length
      continue
    }
    if (fence || /^#\s/.test(trimmed) || /^#{2,3}\s+(?:Код примера|HTML|CSS|JavaScript)$/.test(trimmed) || /^\*\*(?:HTML|CSS|JavaScript):\*\*/.test(trimmed)) continue
    cleaned.push(line)
  }
  return cleaned.join('\n')
}

function renderMarkdown(source: string, route: string, example = false): string {
  const prepared = example ? cleanExampleMarkdown(source) : cleanMarkdown(source)
  return md.render(prepared.replaceAll('<OptionsTable />', renderOptionsTable()), { route })
    .replace(/<div data-demo-slot="([a-z0-9-]+)"><\/div>/g, (_, id: string) => demoCard(id))
}

const nav = [
  { text: 'Обзор', link: 'index.html' },
  { text: 'Примеры', link: 'examples-list.html' },
  { text: 'Конструктор', link: 'builder.html' },
  { text: 'Руководство', link: 'guide/getting-started.html' },
  { text: 'API', link: 'api/index.html' },
]

function shell(title: string, body: string, current: string, script = 'main.ts'): string {
  const navHtml = nav.map((item) => `<a href="${base + item.link}" ${current === item.link ? 'aria-current="page"' : ''}>${item.text}</a>`).join('')
  const depth = current.split('/').length - 1
  const src = '../'.repeat(depth + 1) + `site/${script}`
  return `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f2f5f2"><title>${escapeHtml(title)} · Tvist</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<meta name="description" content="Tvist — слайдер с широким API. Живые примеры, документация и конструктор.">
<script>document.documentElement.dataset.theme=localStorage.getItem('tvist-theme')||'light'</script>
<script type="module" src="${src}"></script></head>
<body><a class="skip-link" href="#main">К содержимому</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="${base}">tvist<span class="brand-dot">.</span><small>v${version}</small></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Открыть меню">☰</button>
<nav class="site-nav" id="site-nav" aria-label="Главное меню">${navHtml}</nav>
<button class="theme-toggle" type="button" aria-label="Переключить тему" title="Переключить тему">◐</button></div></header>
<main id="main">${body}</main>
<footer class="site-footer"><span>Tvist · слайдер для современного веба</span><a href="https://github.com/VladimirIvanin/tvist">GitHub ↗</a></footer>
</body></html>`
}

function writePage(route: string, html: string): void {
  const path = join(output, route)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, html)
}

function demoCard(id: string): string {
  const demo = demoById.get(id)
  if (!demo) return ''
  return `<section class="demo-card" data-demo="${id}">
  <div class="demo-heading"><div><span class="eyebrow">Живой пример</span><h2>${escapeHtml(demo.title)}</h2></div><span class="demo-count">6 слайдов</span></div>
  <iframe class="demo-frame" src="${base}preview.html?id=${id}" title="${escapeHtml(demo.title)}" loading="lazy"></iframe>
  <div class="demo-toolbar"><div class="code-tabs" role="group" aria-label="Код примера">
  <button type="button" class="is-active" data-code-tab="html">HTML</button>
  <button type="button" data-code-tab="css">CSS</button>
  <button type="button" data-code-tab="js">JavaScript</button></div>
  <button type="button" class="copy-code" data-copy-code>Копировать код</button></div>
  <pre class="demo-code"><code data-code-output></code></pre>
  <div class="demo-foot"><span>HTML, CSS и JS в этих вкладках используются в предпросмотре.</span><div><button type="button" class="text-action" data-demo-copy-all>Скопировать всю страницу</button><a href="${base}builder.html">Настроить свой →</a></div></div>
  </section>`
}

function home(): string {
  return `<section class="hero page-wrap"><div class="hero-copy"><span class="eyebrow">Библиотека слайдеров · v${version}</span>
  <h1>Движение,<br><em>которое вы</em><br>контролируете.</h1>
  <p>Tvist помогает собрать слайдер под задачу: от спокойной галереи до сложного интерфейса. Изучайте живые примеры и забирайте готовый код.</p>
  <div class="hero-actions"><a class="button button-primary" href="${base}builder.html">Собрать слайдер <span>↗</span></a>
  <a class="button button-secondary" href="${base}examples-list.html">Смотреть примеры <span>→</span></a></div></div>
  <div class="hero-demo"><div class="hero-demo-top"><span>01 / 03</span><span>Перетащите или нажмите стрелку ↗</span></div>
  <div class="tvist-v1 hero-slider" aria-label="Галерея Tvist"><div class="tvist-v1__track"><div class="tvist-v1__container">
  <div class="tvist-v1__slide"><img src="${base}assets/abstract-1.webp" alt="Абстрактная синяя лента" width="1200" height="800" fetchpriority="high"></div>
  <div class="tvist-v1__slide"><img src="${base}assets/abstract-2.webp" alt="Абстрактная композиция из цветного стекла" width="1200" height="800"></div>
  <div class="tvist-v1__slide"><img src="${base}assets/abstract-3.webp" alt="Абстрактная композиция с призмами" width="1200" height="800"></div>
  </div></div></div><div class="hero-demo-bottom"><span>Настоящий Tvist в действии</span><div><button type="button" data-hero-prev aria-label="Предыдущий слайд">←</button><button type="button" data-hero-next aria-label="Следующий слайд">→</button></div></div></div></section>
  <section class="feature-band page-wrap"><p>От одной карточки до бесконечной ленты.<br>Вся механика под вашим контролем.</p><div><span>01 / Drag</span><span>02 / Loop</span><span>03 / Responsive</span><span>04 / Modules</span></div></section>
  <section class="home-links page-wrap"><span class="eyebrow">Начните здесь</span><div class="home-link-grid">
  <a href="${base}guide/getting-started.html"><h2>Быстрый старт</h2><p>Подключите Tvist и запустите первый слайдер.</p><span>↗</span></a>
  <a href="${base}examples-list.html"><h2>Живые примеры</h2><p>Попробуйте возможности и скопируйте код.</p><span>↗</span></a>
  <a href="${base}api/index.html"><h2>Справочник API</h2><p>Все параметры и методы в одном месте.</p><span>↗</span></a></div></section>`
}

function catalog(): string {
  const cards = demos.map((d, i) => `<a class="catalog-card" href="${base}examples/${d.id}.html" data-search="${escapeHtml((d.title + ' ' + d.category + ' ' + d.id).toLowerCase())}"><small>${String(i + 1).padStart(2, '0')} / ${escapeHtml(d.category)}</small><span class="catalog-visual" data-visual="${i % 4}"><b>${String(i + 1).padStart(2, '0')}</b></span><h2>${escapeHtml(d.title)}</h2><p>${escapeHtml(d.description)}</p><span class="catalog-arrow">Открыть пример ↗</span></a>`).join('')
  const categories = [...new Set(demos.map((d) => d.category))]
  return `<section class="page-intro page-wrap"><span class="eyebrow">Практика / ${demos.length} примеров</span><h1>Посмотрите,<br><em>как это работает.</em></h1><p>Каждая демонстрация работает в браузере. Откройте пример, попробуйте и скопируйте HTML, CSS и JavaScript.</p></section>
  <section class="catalog-controls page-wrap"><label for="example-search">Поиск по примерам</label><input id="example-search" name="example-search" type="search" placeholder="Например, loop или карточки…" autocomplete="off"><div class="category-filters" role="group" aria-label="Категории"><button type="button" class="is-active" data-filter="all">Все</button>${categories.map((c) => `<button type="button" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div></section>
  <section class="catalog-grid page-wrap" aria-live="polite">${cards}</section><p class="empty-state page-wrap" hidden>Ничего не найдено. Попробуйте другой запрос.</p>`
}

function main(): void {
  mkdirSync(output, { recursive: true })
  mkdirSync(join(output, 'public/assets'), { recursive: true })
  for (const file of readdirSync(join(root, 'site/assets'))) copyFileSync(join(root, 'site/assets', file), join(output, 'public/assets', file))
  writePage('index.html', shell('Главная', home(), 'index.html'))
  writePage('examples-list.html', shell('Примеры', catalog(), 'examples-list.html'))
  writePage('builder.html', shell('Конструктор', '<div id="builder"></div>', 'builder.html'))
  writePage('preview.html', '<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="../site/preview.ts"></script></head><body><main id="preview"></main></body></html>')
  const markdownFiles: string[] = []
  function collect(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) collect(path)
      else if (extname(entry.name) === '.md') markdownFiles.push(path)
    }
  }
  collect(join(root, 'guide'))
  collect(join(root, 'api'))
  for (const file of readdirSync(join(root, 'examples')).filter((n) => n.endsWith('.md'))) markdownFiles.push(join(root, 'examples', file))
  for (const file of markdownFiles) {
    const rel = relative(root, file).replace(/\.md$/, '.html')
    const section = rel.split('/')[0] || ''
    const id = rel.split('/')[1]?.replace(/\.html$/, '') || ''
    const source = readFileSync(file, 'utf8')
    const isExample = section === 'examples'
    const heading = isExample ? (demoById.get(id)?.title || id) : (stripFrontmatter(source).match(/^#\s+(.+)$/m)?.[1] || id)
    const raw = renderMarkdown(source, rel, isExample)
    const hasInlineDemos = isExample && (/<Demo\s+id=/.test(source) || /<[A-Z][A-Za-z0-9]*Example\b[^>]*\/>/.test(source) || /<div\s+ref=/.test(source))
    const content = isExample
      ? `<div class="doc-shell page-wrap"><aside class="doc-side"><span class="eyebrow">Примеры</span><a href="${base}examples-list.html">← Все примеры</a></aside><article class="doc-content"><div class="doc-title"><span class="eyebrow">Пример / ${escapeHtml(demoById.get(id)?.category || 'Tvist')}</span><h1>${escapeHtml(heading)}</h1></div>${hasInlineDemos ? '' : demoCard(id)}<div class="markdown-body">${raw}</div></article></div>`
      : `<div class="doc-shell page-wrap"><aside class="doc-side"><span class="eyebrow">${section === 'api' ? 'Справочник' : 'Руководство'}</span><a href="${base}guide/getting-started.html">Быстрый старт</a><a href="${base}api/options.html">Опции</a><a href="${base}api/methods.html">Методы</a><a href="${base}api/events.html">События</a></aside><article class="doc-content markdown-body">${raw}</article></div>`
    writePage(rel, shell(heading, content, rel))
  }
  console.log(`Generated ${markdownFiles.length + 4} pages`)
}

main()
