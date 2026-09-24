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
  document.querySelector<HTMLButtonElement>('.theme-toggle')?.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему')
}

document.querySelector<HTMLButtonElement>('.theme-toggle')?.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})
setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

const menu = document.querySelector<HTMLButtonElement>('.menu-toggle')
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true'
  menu.setAttribute('aria-expanded', String(!expanded))
  document.querySelector('.site-nav')?.classList.toggle('is-open', !expanded)
})

const hero = document.querySelector<HTMLElement>('.hero-slider')
if (hero) {
  const slider = new Tvist(hero, { perPage: 1, gap: 0, drag: true, loop: true })
  const index = document.querySelector<HTMLElement>('.hero-demo-top span')
  const update = () => { if (index) index.textContent = `${String(slider.activeIndex + 1).padStart(2, '0')} / 03` }
  slider.on('slideChangeEnd', update)
  document.querySelector('[data-hero-prev]')?.addEventListener('click', () => slider.prev())
  document.querySelector('[data-hero-next]')?.addEventListener('click', () => slider.next())
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
