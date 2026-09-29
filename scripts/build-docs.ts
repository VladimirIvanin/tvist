import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, posix } from 'node:path'
import MarkdownIt from 'markdown-it'
import { generateApiMetadata } from './generate-options-meta'
import { parseApiFragments, prepareApiReference, renderApiReference, legacyApiPages, legacyAnchorMap, renderLegacyRedirect } from './api-reference'

const root = resolve('docs')
const output = join(root, '.generated')
const base = '/tvist/'
const faviconLinks = `<link rel="icon" href="${base}assets/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="${base}assets/favicon-32x32.png" sizes="32x32">
<link rel="icon" type="image/png" href="${base}assets/favicon-16x16.png" sizes="16x16">
<link rel="apple-touch-icon" href="${base}assets/apple-touch-icon.png" sizes="180x180">`
const version = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }).version
const demos = JSON.parse(readFileSync(join(root, 'site/demos.json'), 'utf8')) as Array<{
  id: string
  title: string
  category: string
  description: string
  count?: string
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
  CubeExample: 'effect-cube',
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
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
md.renderer.rules.table_open = (tokens, idx, opts, _env, self) => `<div class="table-scroll">${self.renderToken(tokens, idx, opts)}`
md.renderer.rules.table_close = (tokens, idx, opts, _env, self) => `${self.renderToken(tokens, idx, opts)}</div>`
md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
  const heading = tokens[idx]!
  const inline = tokens[idx + 1]!
  const explicit = inline.content.match(/\s*\{#([^}]+)\}\s*$/)
  const state = env as { headingIds?: Set<string> }
  const ids = state.headingIds ??= new Set<string>()
  const text = inline.content.replace(/\s*\{#[^}]+\}\s*$/, '')
  const original = explicit?.[1] || text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-')
  let id = original
  let suffix = 1
  while (ids.has(id)) id = `${original}-${suffix++}`
  ids.add(id)
  heading.attrSet('id', id)
  if (explicit) {
    inline.content = text
    const child = inline.children?.at(-1)
    if (child?.type === 'text') child.content = child.content.replace(/\s*\{#[^}]+\}\s*$/, '')
  }
  return self.renderToken(tokens, idx, opts)
}

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
  return md.render(prepared, { route })
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
  const navHtml = nav.map((item) => `<a href="${base + item.link}" ${current === item.link || (item.link === 'examples-list.html' && current.startsWith('examples/')) || (item.link === 'api/index.html' && current.startsWith('api/')) ? 'aria-current="page"' : ''}>${item.text}</a>`).join('')
  const depth = current.split('/').length - 1
  const src = '../'.repeat(depth + 1) + `site/${script}`
  return `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f2f5f2"><title>${escapeHtml(title)} · Tvist</title>
${faviconLinks}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<meta name="description" content="Tvist — слайдер с широким API. Живые примеры, документация и конструктор.">
<script>document.documentElement.dataset.theme=localStorage.getItem('tvist-theme')||'light'</script>
<script type="module" src="${src}"></script></head>
<body><a class="skip-link" href="#main">К содержимому</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="${base}">tvist<span class="brand-dot">.</span><small>v${version}</small></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Открыть меню">☰</button>
<nav class="site-nav" id="site-nav" aria-label="Главное меню">${navHtml}</nav>
<button class="theme-toggle" type="button" aria-label="Включить тёмную тему" title="Включить тёмную тему">
<svg class="theme-toggle__icon theme-toggle__icon--moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z"/></svg>
<svg class="theme-toggle__icon theme-toggle__icon--sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
</button></div></header>
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
  <div class="demo-heading"><div><span class="eyebrow">Живой пример</span><h2>${escapeHtml(demo.title)}</h2></div><div class="demo-heading-actions"><button class="demo-view-toggle" type="button" data-demo-mobile aria-pressed="false" aria-controls="demo-frame-${id}" title="Показать пример шириной 375 px">Мобильный вид · 375 px</button><span class="demo-count">${escapeHtml(demo.count || '6 слайдов')}</span></div></div>
  <div class="demo-preview"><iframe class="demo-frame" id="demo-frame-${id}" src="${base}preview.html?id=${id}" title="${escapeHtml(demo.title)}" loading="lazy"></iframe></div>
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
  <div class="tvist-v1__slide"><img src="assets/abstract-1.webp" alt="Абстрактная синяя лента" width="1200" height="800" fetchpriority="high"></div>
  <div class="tvist-v1__slide"><img src="assets/abstract-2.webp" alt="Абстрактная композиция из цветного стекла" width="1200" height="800"></div>
  <div class="tvist-v1__slide"><img src="assets/abstract-3.webp" alt="Абстрактная композиция с призмами" width="1200" height="800"></div>
  </div></div></div><div class="hero-demo-bottom"><span>Настоящий Tvist в действии</span><div><button type="button" data-hero-prev aria-label="Предыдущий слайд">←</button><button type="button" data-hero-next aria-label="Следующий слайд">→</button></div></div></div></section>
  <section class="quick-start page-wrap" aria-labelledby="quick-start-title">
  <div class="quick-start-copy"><span class="eyebrow">Быстрый старт / браузер</span><h2 id="quick-start-title">Первый слайдер<br><em>за пару строк.</em></h2><p>Подключите Tvist через CDN и создайте слайдер прямо на странице. Сборка и импорты не нужны.</p><a href="${base}guide/getting-started.html">Полное руководство <span>↗</span></a></div>
  <div class="quick-start-code"><div class="quick-start-bar"><div class="quick-start-dots" aria-hidden="true"><i></i><i></i><i></i></div><span>index.html</span><button type="button" data-quick-start-copy>Копировать код</button></div>
  <div class="quick-start-tabs" role="group" aria-label="Код быстрого старта"><button type="button" class="is-active" aria-pressed="true" data-quick-start-tab="html">HTML</button><button type="button" aria-pressed="false" data-quick-start-tab="js">JavaScript</button></div>
  <pre class="quick-start-pre"><code data-quick-start-code></code></pre></div></section>
  <section class="home-links page-wrap"><span class="eyebrow">Начните здесь</span><div class="home-link-grid">
  <a href="${base}guide/getting-started.html"><h2>Быстрый старт</h2><p>Подключите Tvist и запустите первый слайдер.</p><span>↗</span></a>
  <a href="${base}examples-list.html"><h2>Живые примеры</h2><p>Попробуйте возможности и скопируйте код.</p><span>↗</span></a>
  <a href="${base}api/index.html"><h2>Справочник API</h2><p>Все параметры и методы в одном месте.</p><span>↗</span></a></div></section>`
}

function catalog(): string {
  const cards = demos.map((d, i) => `<a class="catalog-card" href="${base}examples/${d.id}.html" data-search="${escapeHtml((d.title + ' ' + d.category + ' ' + d.id).toLowerCase())}"><small>${String(i + 1).padStart(2, '0')} / ${escapeHtml(d.category)}</small><span class="catalog-visual" data-visual="${i % 4}"><b>${String(i + 1).padStart(2, '0')}</b></span><h2>${escapeHtml(d.title)}</h2><p>${escapeHtml(d.description)}</p><span class="catalog-arrow">Открыть пример ↗</span></a>`).join('')
  const categories = [...new Set(demos.map((d) => d.category))]
  return examplesLayout('examples-list.html', `<header class="examples-intro"><div class="examples-intro-heading"><h1>Примеры</h1><span class="eyebrow">${demos.length} демонстраций</span></div><p>Попробуйте слайдеры и скопируйте готовый HTML, CSS и JavaScript.</p></header>
  <section class="catalog-controls"><label for="example-search">Поиск по примерам</label><input id="example-search" name="example-search" type="search" placeholder="Например, loop или карточки…" autocomplete="off"><div class="category-filters" role="group" aria-label="Категории"><button type="button" class="is-active" data-filter="all">Все</button>${categories.map((c) => `<button type="button" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div></section>
  <section class="catalog-grid" aria-live="polite">${cards}</section><p class="empty-state" hidden>Ничего не найдено. Попробуйте другой запрос.</p>`)
}

function examplesLayout(current: string, content: string): string {
  const categories = [...new Set(demos.map((demo) => demo.category))]
  const groups = categories.map((category, index) => {
    const links = demos.filter((demo) => demo.category === category).map((demo) => {
      const route = `examples/${demo.id}.html`
      return `<li><a href="${base + route}" ${current === route ? 'aria-current="page"' : ''}>${escapeHtml(demo.title)}</a></li>`
    }).join('')
    return `<section class="examples-nav-group" aria-labelledby="examples-category-${index}"><h2 id="examples-category-${index}">${escapeHtml(category)}</h2><ul>${links}</ul></section>`
  }).join('')
  return `<div class="examples-shell page-wrap"><aside class="examples-sidebar">
  <span class="eyebrow examples-sidebar-title">Примеры</span>
  <button class="examples-menu-toggle" type="button" aria-expanded="false" aria-controls="examples-nav"><span>Выбрать пример</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
  <nav class="examples-nav" id="examples-nav" aria-label="Навигация по примерам"><a class="examples-nav-all" href="${base}examples-list.html" ${current === 'examples-list.html' ? 'aria-current="page"' : ''}>Все примеры <span>${demos.length}</span></a>${groups}</nav>
  </aside><div class="examples-content">${content}</div></div>`
}

function main(): void {
  const api = generateApiMetadata()
  const fragments = parseApiFragments(readFileSync(join(root, 'api/reference.md'), 'utf8'))
  prepareApiReference(api, fragments)
  // Удалённые исходные страницы не должны оставаться в следующей сборке.
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  mkdirSync(join(output, 'public/assets'), { recursive: true })
  for (const file of readdirSync(join(root, 'site/assets'))) copyFileSync(join(root, 'site/assets', file), join(output, 'public/assets', file))
  writePage('index.html', shell('Главная', home(), 'index.html'))
  writePage('examples-list.html', shell('Примеры', catalog(), 'examples-list.html'))
  writePage('builder.html', shell('Конструктор', '<div id="builder"></div>', 'builder.html'))
  writePage('preview.html', `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${faviconLinks}<script type="module" src="../site/preview.ts"></script></head><body><main id="preview"></main></body></html>`)
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
    if (rel === 'api/reference.html') continue // Fragment source is rendered in API records, never as a page.
    const legacy = legacyApiPages[rel]
    if (legacy) {
      writePage(rel, shell('Справочник API', renderLegacyRedirect(`${base}api/index.html`, legacyAnchorMap(api, legacy.kind), legacy.section), rel))
      continue
    }
    const section = rel.split('/')[0] || ''
    const id = rel.split('/')[1]?.replace(/\.html$/, '') || ''
    const source = readFileSync(file, 'utf8')
    const isExample = section === 'examples'
    const heading = isExample ? (demoById.get(id)?.title || id) : (stripFrontmatter(source).match(/^#\s+(.+)$/m)?.[1] || id)
    const raw = renderMarkdown(source, rel, isExample)
    if (rel === 'api/index.html') {
      const content = renderApiReference(api, fragments, raw, text => renderMarkdown(text, rel), base)
      const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]!)
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate anchors in API page')
      const anchors = new Set(ids)
      for (const match of content.matchAll(/href="#([^"]+)"/g)) {
        if (!anchors.has(match[1]!)) throw new Error(`Missing API anchor: ${match[1]}`)
      }
      writePage(rel, shell(heading, content, rel))
      continue
    }
    const hasInlineDemos = isExample && (/<Demo\s+id=/.test(source) || /<[A-Z][A-Za-z0-9]*Example\b[^>]*\/>/.test(source) || /<div\s+ref=/.test(source))
    const content = isExample
      ? examplesLayout(rel, `<article class="doc-content"><div class="doc-title"><span class="eyebrow">${escapeHtml(demoById.get(id)?.category || 'Tvist')}</span><h1>${escapeHtml(heading)}</h1></div>${hasInlineDemos ? '' : demoCard(id)}<div class="markdown-body">${raw}</div></article>`)
      : `<div class="doc-shell page-wrap"><aside class="doc-side"><span class="eyebrow">${section === 'api' ? 'Справочник' : 'Руководство'}</span><a href="${base}guide/getting-started.html">Быстрый старт</a><a href="${base}api/index.html">Справочник API</a><a href="${base}api/modules.html">Встроенные возможности</a><a href="${base}api/typescript.html">TypeScript</a><a href="${base}api/breakpoints.html">Breakpoints</a></aside><article class="doc-content markdown-body">${raw}</article></div>`
    writePage(rel, shell(heading, content, rel))
  }
  console.log(`Generated ${markdownFiles.length + 3} pages`)
}

main()
