import { Tvist } from '../../src/index'
import './preview.css'

function syncTheme(): void {
  document.documentElement.dataset.theme = localStorage.getItem('tvist-theme') === 'dark' ? 'dark' : 'light'
}
syncTheme()
window.addEventListener('storage', syncTheme)

const id = new URLSearchParams(location.search).get('id') || ''
const markup = import.meta.glob('./demos/*/markup.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const styles = import.meta.glob('./demos/*/style.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const scripts = import.meta.glob('./demos/*/script.js')
const html = markup[`./demos/${id}/markup.html`]
const css = styles[`./demos/${id}/style.css`]
const script = scripts[`./demos/${id}/script.js`]
const target = document.querySelector<HTMLElement>('#preview')!

if (!html || !script) {
  target.textContent = 'Демонстрация не найдена.'
} else {
  const style = document.createElement('style')
  style.textContent = css || ''
  document.head.append(style)
  target.innerHTML = html
  Object.assign(window, { TvistV1: Tvist })
  script().catch((error: unknown) => {
    target.insertAdjacentHTML('beforeend', '<p class="preview-error">Не удалось запустить демонстрацию.</p>')
    console.error(error)
  })
}
