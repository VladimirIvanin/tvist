import { Tvist } from '../../src/index'
import './style.css'
import { mountBuilder } from './builder'
import { standalonePage } from './standalone'

const base = import.meta.env.BASE_URL
const sources = {
  html: import.meta.glob('./demos/*/markup.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  css: import.meta.glob('./demos/*/style.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  js: import.meta.glob('./demos/*/script.js', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
}

function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('tvist-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151f21' : '#f2f5f2')
  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle')
  const label = theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'
  toggle?.setAttribute('aria-label', label)
  toggle?.setAttribute('title', label)
}

document.querySelector<HTMLButtonElement>('.theme-toggle')?.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})
setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

const apiNav = document.querySelector<HTMLElement>('#api-nav')
const apiMenu = document.querySelector<HTMLButtonElement>('.api-menu-toggle')
if (apiNav && apiMenu) {
  const close = () => {
    apiMenu.setAttribute('aria-expanded', 'false')
    apiNav.classList.remove('is-open')
  }
  apiMenu.addEventListener('click', () => {
    const expanded = apiMenu.getAttribute('aria-expanded') !== 'true'
    apiMenu.setAttribute('aria-expanded', String(expanded))
    apiNav.classList.toggle('is-open', expanded)
  })
  apiNav.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!target) return
    close()
    const section = document.getElementById(target.hash.slice(1))
    section?.setAttribute('tabindex', '-1')
    section?.focus({ preventScroll: true })
  })
  apiNav.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    close()
    apiMenu.focus()
  })
  const markCurrent = () => {
    const hash = location.hash
    apiNav.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
      if (link.hash === hash) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }
  window.addEventListener('hashchange', markCurrent)
  markCurrent()
  // Long tables and late font metrics can leave the browser's initial fragment scroll short.
  const revealTarget = () => {
    let id = location.hash.slice(1)
    try { id = decodeURIComponent(id) } catch { /* Preserve malformed fragments as literal IDs. */ }
    const target = id ? document.getElementById(id) : null
    if (target?.closest('.api-content')) target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
  }
  window.addEventListener('hashchange', revealTarget)
  if (document.readyState === 'complete') revealTarget()
  else window.addEventListener('load', revealTarget, { once: true })
  void document.fonts.ready.then(revealTarget)
}

const menu = document.querySelector<HTMLButtonElement>('.menu-toggle')
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true'
  menu.setAttribute('aria-expanded', String(!expanded))
  document.querySelector('.site-nav')?.classList.toggle('is-open', !expanded)
})

const examplesNav = document.querySelector<HTMLElement>('.examples-nav')
const examplesMenu = document.querySelector<HTMLButtonElement>('.examples-menu-toggle')
if (examplesNav && examplesMenu) {
  const revealCurrentExample = () => {
    const current = examplesNav.querySelector<HTMLElement>('[aria-current="page"]')
    if (!current || !examplesNav.clientHeight) return
    const navBounds = examplesNav.getBoundingClientRect()
    const linkBounds = current.getBoundingClientRect()
    if (linkBounds.top < navBounds.top || linkBounds.bottom > navBounds.bottom) {
      examplesNav.scrollTop += linkBounds.top - navBounds.top - examplesNav.clientHeight / 2 + linkBounds.height / 2
    }
  }
  examplesNav.scrollTop = Number(sessionStorage.getItem('tvist-examples-scroll')) || 0
  revealCurrentExample()
  window.addEventListener('pagehide', () => {
    if (examplesNav.clientHeight) sessionStorage.setItem('tvist-examples-scroll', String(examplesNav.scrollTop))
  })
  examplesMenu.addEventListener('click', () => {
    const expanded = examplesMenu.getAttribute('aria-expanded') !== 'true'
    examplesMenu.setAttribute('aria-expanded', String(expanded))
    examplesNav.classList.toggle('is-open', expanded)
    if (expanded) revealCurrentExample()
  })
  examplesNav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && examplesMenu.getAttribute('aria-expanded') === 'true') {
      examplesMenu.setAttribute('aria-expanded', 'false')
      examplesNav.classList.remove('is-open')
      examplesMenu.focus()
    }
  })
}

const hero = document.querySelector<HTMLElement>('.hero-slider')
if (hero) {
  const slider = new Tvist(hero, { perPage: 1, gap: 0, drag: true, loop: true })
  const index = document.querySelector<HTMLElement>('.hero-demo-top span')
  const update = () => { if (index) index.textContent = `${String(slider.activeIndex + 1).padStart(2, '0')} / 03` }
  slider.on('slideChangeEnd', update)
  document.querySelector('[data-hero-prev]')?.addEventListener('click', () => slider.prev())
  document.querySelector('[data-hero-next]')?.addEventListener('click', () => slider.next())
}

const quickStart = document.querySelector<HTMLElement>('.quick-start-code')
if (quickStart) {
  const code = {
    html: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">\n\n<div class="tvist-v1 my-slider">\n  <div class="tvist-v1__track">\n    <div class="tvist-v1__container">\n      <div class="tvist-v1__slide">Слайд 1</div>\n      <div class="tvist-v1__slide">Слайд 2</div>\n      <div class="tvist-v1__slide">Слайд 3</div>\n    </div>\n  </div>\n</div>\n\n<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.min.js"></script>`,
    js: `<script>\ndocument.addEventListener('DOMContentLoaded', function () {\n  var slider = new window.TvistV1('.my-slider', {\n    perPage: 1,\n    gap: 16\n  });\n});\n</script>`,
  }
  const output = quickStart.querySelector<HTMLElement>('[data-quick-start-code]')
  let active: keyof typeof code = 'html'
  const show = () => { if (output) output.textContent = code[active] }
  show()
  quickStart.querySelectorAll<HTMLButtonElement>('[data-quick-start-tab]').forEach((button) => button.addEventListener('click', () => {
    active = button.dataset.quickStartTab as keyof typeof code
    quickStart.querySelectorAll<HTMLButtonElement>('[data-quick-start-tab]').forEach((tab) => {
      const selected = tab === button
      tab.classList.toggle('is-active', selected)
      tab.setAttribute('aria-pressed', String(selected))
    })
    show()
  }))
  quickStart.querySelector<HTMLButtonElement>('[data-quick-start-copy]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(code[active])
      button.textContent = 'Скопировано ✓'
    } catch {
      button.textContent = 'Выделите код вручную'
      output?.parentElement?.focus()
    }
    window.setTimeout(() => { button.textContent = 'Копировать код' }, 1800)
  })
}

const search = document.querySelector<HTMLInputElement>('#example-search')
if (search) {
  let category = 'all'
  const cards = [...document.querySelectorAll<HTMLElement>('.catalog-card')]
  const empty = document.querySelector<HTMLElement>('.empty-state')
  const filter = () => {
    const query = search.value.trim().toLocaleLowerCase('ru')
    let visible = 0
    for (const card of cards) {
      const matches = (category === 'all' || card.querySelector('small')?.textContent?.includes(category)) && (card.dataset.search || '').includes(query)
      card.hidden = !matches
      if (matches) visible++
    }
    if (empty) empty.hidden = visible > 0
  }
  search.addEventListener('input', filter)
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.filter || 'all'
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button))
    filter()
  }))
}

for (const card of document.querySelectorAll<HTMLElement>('[data-demo]')) {
  const id = card.dataset.demo
  if (!id) continue
  card.querySelector<HTMLButtonElement>('[data-demo-mobile]')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const mobile = card.classList.toggle('is-mobile-preview')
    button.setAttribute('aria-pressed', String(mobile))
    button.title = mobile ? 'Вернуть полную ширину' : 'Показать пример шириной 375 px'
  })
  const code = {
    html: sources.html[`./demos/${id}/markup.html`] || '',
    css: sources.css[`./demos/${id}/style.css`] || '',
    js: sources.js[`./demos/${id}/script.js`] || '',
  }
  const output = card.querySelector<HTMLElement>('[data-code-output]')
  let active: keyof typeof code = 'html'
  const show = () => { if (output) output.textContent = code[active] }
  show()
  card.querySelectorAll<HTMLButtonElement>('[data-code-tab]').forEach((button) => button.addEventListener('click', () => {
    active = button.dataset.codeTab as keyof typeof code
    card.querySelectorAll('[data-code-tab]').forEach((item) => item.classList.toggle('is-active', item === button))
    show()
  }))
  card.querySelector<HTMLButtonElement>('[data-copy-code]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(code[active])
      button.textContent = 'Скопировано ✓'
    } catch {
      button.textContent = 'Выделите код вручную'
      output?.parentElement?.focus()
    }
    window.setTimeout(() => { button.textContent = 'Копировать код' }, 1800)
  })
  card.querySelector<HTMLButtonElement>('[data-demo-copy-all]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const complete = standalonePage(code)
    try {
      await navigator.clipboard.writeText(complete)
      button.textContent = 'Скопировано ✓'
      window.setTimeout(() => { button.textContent = 'Скопировать всю страницу' }, 1800)
    } catch { button.textContent = 'Не удалось скопировать' }
  })
}

if (document.querySelector('#builder')) mountBuilder(document.querySelector<HTMLElement>('#builder')!, base)
