import { Tvist } from '../../src/index'
import type { TvistOptions } from '../../src/core/types'
import optionsMeta from './options-meta.json'
import { standalonePage } from './standalone'

type Config = Record<string, unknown>
type MetaOption = { name: string; type: string; default: string; description: string; nested?: Array<{ name: string; type: string; description: string }> }
type Preset = { label: string; options: Config; variant?: 'cards' | 'peek' | 'loop' | 'vertical' | 'thumbs' | 'stories' }
type Tab = 'object' | 'js' | 'html' | 'css'

const presets: Record<string, Preset> = {
  basic: { label: 'Базовый', options: { perPage: 1, gap: 16, arrows: true } },
  cards: { label: 'Карточки', options: { perPage: 3, gap: 16, arrows: true, breakpoints: { 720: { perPage: 2 }, 480: { perPage: 1 } } }, variant: 'cards' },
  peek: { label: 'Peek', options: { perPage: 1, peek: 60, gap: 16, arrows: true }, variant: 'peek' },
  loop: { label: 'Loop + autoplay', options: { perPage: 1, loop: true, autoplay: { delay: 2600, pauseOnHover: true }, arrows: true, pagination: true }, variant: 'loop' },
  vertical: { label: 'Вертикальный', options: { direction: 'vertical', perPage: 2, gap: 12, arrows: true }, variant: 'vertical' },
  thumbs: { label: 'Миниатюры', options: { perPage: 1, gap: 12, arrows: true }, variant: 'thumbs' },
  stories: { label: 'Истории', options: { perPage: 1, autoplay: { delay: 3000, pauseOnInteraction: true }, holdToPause: true, pagination: { type: 'progress' } }, variant: 'stories' },
}

const groups: Array<[string, string[]]> = [
  ['Размеры и положение', ['perPage', 'slidesPerGroup', 'autoWidth', 'autoHeight', 'fixedWidth', 'fixedHeight', 'slideMinSize', 'gap', 'peek', 'peekTrim', 'center', 'direction', 'start', 'roundLengths']],
  ['Движение', ['speed', 'loop', 'rewind', 'rewindByDrag', 'drag', 'dragSpeed', 'rubberband', 'freeSnap', 'flickPower', 'flickMaxPages', 'marquee']],
  ['Навигация', ['arrows', 'pagination', 'keyboard', 'wheel', 'scrollbar', 'navThrottleMs', 'isNavigation']],
  ['Медиа и поведение', ['autoplay', 'video', 'holdToPause', 'visibility', 'lazy', 'nativeLazyAdjacent', 'grid', 'effect', 'fadeEffect', 'stackEffect', 'cubeEffect']],
  ['Адаптивность и другое', ['breakpoints', 'breakpointsBase', 'enabled', 'syncOnDrag', 'browserFixes', 'focusableElements', 'preventClicks', 'preventClicksPropagation', 'debug']],
]

const aliases: Record<string, Array<[string, string]>> = {
  autoplay: [['delay', 'number'], ['pauseOnHover', 'boolean'], ['pauseOnFocus', 'boolean'], ['pauseOnInteraction', 'boolean'], ['disableOnInteraction', 'boolean'], ['waitForVideo', 'boolean']],
  video: [['autoplay', 'boolean'], ['muted', 'boolean'], ['loop', 'boolean'], ['playsinline', 'boolean'], ['pauseOnLeave', 'boolean'], ['resetOnLeave', 'boolean'], ['pauseOnHold', 'boolean']],
  center: [['active', 'boolean'], ['focus', 'boolean'], ['justify', 'boolean']],
  loop: [['enabled', 'boolean'], ['withClones', 'boolean']],
  visibility: [['pauseAutoplay', 'boolean'], ['pauseMarquee', 'boolean'], ['threshold', 'number']],
  holdToPause: [['enabled', 'boolean'], ['threshold', 'number'], ['root', "'slider' | 'container'"], ['exclude', 'string'], ['cancelOnDrag', 'boolean'], ['moveThreshold', 'number']],
  nativeLazyAdjacent: [['onInit', 'boolean'], ['onTransitionStart', 'boolean']],
  lazy: [['preloadPrevNext', 'number']],
  browserFixes: [['firefoxImageDecoding', 'boolean']],
  grid: [['rows', 'number'], ['cols', 'number'], ['gap', 'number | string'], ['dimensions', 'json']],
  fadeEffect: [['crossFade', 'boolean']],
  cubeEffect: [['slideShadows', 'boolean'], ['shadow', 'boolean'], ['shadowOffset', 'number'], ['shadowScale', 'number'], ['perspective', 'number'], ['perspectiveOriginY', 'number'], ['viewportPadding', 'number']],
}

const enums: Record<string, string[]> = {
  direction: ['horizontal', 'vertical'], effect: ['slide', 'fade', 'cube', 'stack'], drag: ['true', 'false', 'free'],
  breakpointsBase: ['window', 'container'], 'pagination.type': ['bullets', 'fraction', 'progress', 'custom'],
  'pagination.strategy': ['even', 'center'], 'pagination.remainderStrategy': ['left', 'center', 'right'],
  'marquee.direction': ['left', 'right', 'up', 'down'], 'holdToPause.root': ['slider', 'container'],
}
const modeOptions = new Set(['autoplay', 'video', 'center', 'loop', 'arrows', 'pagination', 'keyboard', 'wheel', 'scrollbar', 'marquee', 'lazy', 'holdToPause', 'visibility', 'nativeLazyAdjacent', 'grid', 'fadeEffect', 'stackEffect', 'cubeEffect', 'browserFixes'])
const objectOnly = new Set(['grid', 'fadeEffect', 'stackEffect', 'cubeEffect', 'browserFixes'])
const labels: Record<string, string> = {
  perPage: 'Видимых слайдов', slidesPerGroup: 'Слайдов за шаг', gap: 'Отступ между слайдами',
  peek: 'Видимые края соседних', speed: 'Скорость, мс', loop: 'Бесконечный цикл',
  arrows: 'Стрелки', pagination: 'Пагинация', autoplay: 'Автопрокрутка', direction: 'Направление',
  effect: 'Эффект', breakpoints: 'Брейкпоинты', drag: 'Перетаскивание',
}

const slideLabels = ['01', '02', '03', '04', '05', '06']
const numberedSlides = slideLabels.map((text) => `      <div class="tvist-v1__slide">${text}</div>`).join('\n')
const cardSlides = slideLabels.map((text, index) => `      <div class="tvist-v1__slide"><article class="product-card"><div class="product-card__art" aria-hidden="true">${text}</div><h3>Объект ${text}</h3><p>${(index + 1) * 1200} ₽</p></article></div>`).join('\n')
const storySlides = slideLabels.map((text) => `      <div class="tvist-v1__slide"><div class="story-card"><small>История ${text} / 06</small><strong>Момент, который хочется сохранить.</strong><span>Листайте дальше →</span></div></div>`).join('\n')
const oneSlider = (className = '', slides = numberedSlides) => `<div class="tvist-v1${className ? ' ' + className : ''}">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">
${slides}
    </div>
  </div>
</div>`
const baseCss = `.tvist-v1 { width: 100%; min-width: 0; }
.tvist-v1__slide { height: 280px; display: grid; place-items: center; color: #fff; font: 700 54px system-ui, sans-serif; background: #61758b; }
.tvist-v1__slide[data-tvist-slide-index="1"] { background: #b66d59; }
.tvist-v1__slide[data-tvist-slide-index="2"] { background: #778c6d; }
.tvist-v1__slide[data-tvist-slide-index="3"] { background: #8e7997; }
.tvist-v1__slide[data-tvist-slide-index="4"] { background: #b98d61; }
.tvist-v1__slide[data-tvist-slide-index="5"] { background: #5f8d8a; }`
const variantCss: Partial<Record<NonNullable<Preset['variant']>, string>> = {
  cards: `
.tvist-v1__slide { height: auto; min-height: 280px; background: transparent !important; color: #25363a; }
.product-card { width: 100%; height: 100%; padding: 12px; background: #f3f5f1; border: 1px solid #cbd7d3; border-radius: 12px; box-sizing: border-box; font: 16px system-ui, sans-serif; }
.product-card__art { min-height: 170px; display: grid; place-items: center; background: #bcd2cc; border-radius: 7px; font-size: 48px; }
.product-card h3 { margin: 12px 0 4px; font-size: 18px; }.product-card p { margin: 0; }`,
  peek: '\n.tvist-v1__slide { border-radius: 16px; }',
  loop: '\n.tvist-v1__slide { border-radius: 16px; }',
  vertical: '\n.tvist-v1__slide { border-radius: 10px; }',
  stories: `
.tvist-v1__slide { height: 410px; border-radius: 16px; background-image: linear-gradient(145deg, transparent, rgba(9, 31, 34, .58)); }
.story-card { height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 28px; text-align: left; }
.story-card small { font: 600 14px system-ui, sans-serif; }.story-card strong { max-width: 370px; font: 600 clamp(28px, 5vw, 48px)/1.1 system-ui, sans-serif; }.story-card span { font: 14px system-ui, sans-serif; }`,
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function clone(value: Config): Config { return structuredClone(value) }
function getPath(value: Config, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Config)[part] : undefined, value)
}
function setPath(source: Config, path: string, value: unknown): Config {
  const result = clone(source)
  const parts = path.split('.')
  let current = result
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {}
    current = current[part] as Config
  }
  if (value === undefined) delete current[parts.at(-1)!]
  else current[parts.at(-1)!] = value
  return result
}

function normalize(config: Config): { options: Config; warnings: string[] } {
  const options = clone(config)
  const warnings: string[] = []
  for (const key of ['perPage', 'slidesPerGroup']) {
    if (typeof options[key] === 'number' && (!Number.isFinite(options[key]) || options[key] < 1)) {
      delete options[key]
      warnings.push(`${key} должен быть не меньше 1; использовано значение по умолчанию.`)
    }
  }
  if (typeof options.speed === 'number' && options.speed < 0) {
    delete options.speed
    warnings.push('Скорость должна быть неотрицательной; использовано значение по умолчанию.')
  }
  if (options.loop && options.rewind) { delete options.rewind; warnings.push('Rewind отключён: он несовместим с loop.') }
  if (options.autoWidth && options.fixedWidth) { delete options.fixedWidth; warnings.push('Fixed width не применяется вместе с autoWidth.') }
  if (options.effect && options.effect !== 'slide' && typeof options.perPage === 'number' && options.perPage > 1) {
    options.perPage = 1
    warnings.push('Для выбранного эффекта предпросмотр использует один видимый слайд.')
  }
  return { options, warnings }
}

function parseInput(raw: string, type: string): unknown {
  if (!raw.trim()) return undefined
  if (type === 'json' || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try { return JSON.parse(raw) } catch { return undefined }
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (type === 'number') return Number.isFinite(Number(raw)) ? Number(raw) : undefined
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw)
  return raw
}

function field(path: string, type: string, description: string, value: unknown, nested = false): string {
  if (/=>|HTMLElement|Tvist\b|Record</.test(type)) return ''
  const label = labels[path] || path.split('.').at(-1)!
  const key = escapeHtml(path)
  const help = description ? `<small>${escapeHtml(description.slice(0, 120))}</small>` : ''
  if (modeOptions.has(path) && !nested) {
    const mode = typeof value === 'object' && value !== null ? 'object' : String(value ?? '')
    return `<div class="builder-control"><label for="field-${key}">${escapeHtml(label)}</label><select id="field-${key}" name="${key}" data-path="${key}" data-type="mode"><option value="">По умолчанию</option>${objectOnly.has(path) ? '' : `<option value="true" ${mode === 'true' ? 'selected' : ''}>Вкл.</option><option value="false" ${mode === 'false' ? 'selected' : ''}>Выкл.</option>`}${path === 'loop' ? `<option value="auto" ${mode === 'auto' ? 'selected' : ''}>Авто</option>` : ''}<option value="object" ${mode === 'object' ? 'selected' : ''}>Настроить</option></select>${help}</div>`
  }
  const choices = enums[path] || [...type.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((value): value is string => Boolean(value))
  if (choices.length > 0 && choices.length < 12) {
    return `<div class="builder-control"><label for="field-${key}">${escapeHtml(label)}</label><select id="field-${key}" name="${key}" data-path="${key}" data-type="${escapeHtml(type)}"><option value="">По умолчанию</option>${choices.map((choice) => `<option value="${escapeHtml(choice)}" ${String(value) === choice ? 'selected' : ''}>${escapeHtml(choice)}</option>`).join('')}</select>${help}</div>`
  }
  if (type === 'boolean') {
    return `<div class="builder-control"><label for="field-${key}">${escapeHtml(label)}</label><select id="field-${key}" name="${key}" data-path="${key}" data-type="boolean"><option value="">По умолчанию</option><option value="true" ${value === true ? 'selected' : ''}>Да</option><option value="false" ${value === false ? 'selected' : ''}>Нет</option></select>${help}</div>`
  }
  return `<div class="builder-control"><label for="field-${key}">${escapeHtml(label)}</label><input id="field-${key}" name="${key}" autocomplete="off" data-path="${key}" data-type="${escapeHtml(type)}" type="${type === 'number' ? 'number' : 'text'}" value="${value === undefined ? '' : typeof value === 'object' ? escapeHtml(JSON.stringify(value)) : escapeHtml(String(value))}" placeholder="По умолчанию">${help}</div>`
}

function nestedFields(option: MetaOption, config: Config): string {
  const manual = aliases[option.name]
  const children = manual || (option.nested || []).filter((item) => item.name !== option.name).map((item) => [item.name, item.type] as [string, string])
  if (!children.length) return ''
  const body = children.map(([name, type]) => field(`${option.name}.${name}`, type, '', getPath(config, `${option.name}.${name}`), true)).join('')
  return `<details class="builder-nested" ${typeof config[option.name] === 'object' && config[option.name] ? 'open' : ''}><summary>Поля ${escapeHtml(option.name)}</summary>${body}</details>`
}

function breakpointRows(config: Config): string {
  const current = (config.breakpoints || {}) as Record<string, Config>
  const rows = Object.entries(current).sort((a,b) => Number(b[0]) - Number(a[0])).map(([width, options]) => {
    const extra = Object.fromEntries(Object.entries(options).filter(([name]) => !['perPage', 'gap', 'enabled'].includes(name)))
    return `<div class="breakpoint-row" data-breakpoint-row><label>До <input type="number" min="1" data-breakpoint-width value="${escapeHtml(width)}"> px</label><label>perPage <input type="number" min="1" data-breakpoint-perpage value="${escapeHtml(String(options.perPage ?? ''))}"></label><label>gap <input type="text" data-breakpoint-gap value="${escapeHtml(String(options.gap ?? ''))}"></label><label>Включить слайдер<select data-breakpoint-enabled><option value="" ${options.enabled === undefined ? 'selected' : ''}>По умолчанию</option><option value="true" ${options.enabled === true ? 'selected' : ''}>Да</option><option value="false" ${options.enabled === false ? 'selected' : ''}>Нет</option></select></label><label class="breakpoint-extra">Другие опции (JSON)<textarea data-breakpoint-extra rows="2" placeholder="{ }">${escapeHtml(Object.keys(extra).length ? JSON.stringify(extra, null, 2) : '')}</textarea></label><button type="button" data-remove-breakpoint aria-label="Удалить брейкпоинт">Удалить ×</button></div>`
  }).join('')
  return `<div class="builder-control"><label>Брейкпоинты</label><div class="breakpoint-rows">${rows}</div><button type="button" class="small-action" data-add-breakpoint>+ Добавить ширину</button><small>Ширина задаётся в пикселях. Для остальных настроек брейкпоинта используйте JSON.</small></div>`
}

function renderControls(config: Config): string {
  const meta = optionsMeta.options as MetaOption[]
  return groups.map(([group, names], index) => `<details class="builder-section builder-group" ${index === 0 ? 'open' : ''}><summary>${group}</summary>${names.map((name) => {
    if (name === 'breakpoints') return breakpointRows(config)
    const option = meta.find((item) => item.name === name)
    if (!option) return ''
    const main = field(name, option.type, option.description, config[name])
    return main + nestedFields(option, config)
  }).join('')}</details>`).join('')
}

function getCode(config: Config, variant: Preset['variant'], template: string): Record<Tab, string> {
  const effective = normalize(config).options
  const jsOptions = clone(effective)
  if (template === 'renderBullet') {
    jsOptions.pagination = typeof jsOptions.pagination === 'object' && jsOptions.pagination ? { ...(jsOptions.pagination as Config), type: 'bullets', renderBullet: '__RENDER_BULLET__' } : { type: 'bullets', renderBullet: '__RENDER_BULLET__' }
  }
  if (template === 'events') jsOptions.on = { slideChangeEnd: '__ON_SLIDE_CHANGE__' }
  const object = JSON.stringify(jsOptions, null, 2)
    .replace('"__RENDER_BULLET__"', '(index, className) => `<button class="${className}" aria-label="Слайд ${index + 1}">${index + 1}</button>`')
    .replace('"__ON_SLIDE_CHANGE__"', '(index) => console.log("Активный слайд:", index)')
  const html = variant === 'thumbs' ? oneSlider('main-slider') + '\n\n' + oneSlider('thumb-slider') : oneSlider('', variant === 'cards' ? cardSlides : variant === 'stories' ? storySlides : numberedSlides)
  const css = baseCss + (effective.direction === 'vertical' ? '\n.tvist-v1 { height: 320px; }\n.tvist-v1__slide { height: 150px; }' : '') + (variant === 'thumbs' ? '\n.thumb-slider { margin-top: 10px; }\n.thumb-slider .tvist-v1__slide { height: 65px; font-size: 18px; cursor: pointer; }' : variant ? variantCss[variant] || '' : '')
  const js = variant === 'thumbs'
    ? `const slider = new TvistV1('.main-slider', ${object});\nconst thumbs = new TvistV1('.thumb-slider', { perPage: 4, gap: 10, isNavigation: true });\nslider.sync(thumbs);`
    : `const slider = new TvistV1('.tvist-v1', ${object});`
  return { object, js, html, css }
}

function fullDocument(code: Record<Tab, string>): string {
  return standalonePage(code)
}

export function mountBuilder(root: HTMLElement, _base: string): void {
  let presetId = 'basic'
  let config = clone(presets.basic!.options)
  let template = 'none'
  let activeTab: Tab = 'object'
  let slider: Tvist | undefined
  let thumbs: Tvist | undefined
  root.innerHTML = `<section class="builder-intro page-wrap"><span class="eyebrow">Инструмент / Tvist</span><h1>Соберите свой<br><em>слайдер.</em></h1><p>Выберите пресет, настройте поведение и заберите готовый код. Всё, что вы видите справа, работает на Tvist.</p></section>
  <div class="builder-layout page-wrap"><aside class="builder-panel"><div class="builder-panel-header"><h2>Параметры</h2></div>
  <section class="builder-section"><h3>Пресеты</h3><div class="builder-presets">${Object.entries(presets).map(([id, p]) => `<button type="button" data-preset="${id}" ${id === presetId ? 'class="is-active"' : ''}>${p.label}</button>`).join('')}</div></section>
  <section class="builder-section"><h3>Шаблоны кода</h3><div class="builder-control"><label for="builder-template">Дополнительный сценарий</label><select id="builder-template" name="builder-template"><option value="none">Без шаблона</option><option value="events">Обработчик on.slideChangeEnd</option><option value="renderBullet">Своё оформление точек</option></select><small>Для галереи с миниатюрами выберите пресет «Миниатюры». Опция virtual отсутствует в текущем API Tvist.</small></div></section>
  <div id="builder-controls"></div></aside>
  <section class="builder-preview"><div class="builder-preview-top"><div><span class="eyebrow">Результат</span><h2>Предпросмотр</h2></div><span class="eyebrow" id="builder-status">Готово к работе</span></div>
  <div class="builder-preview-stage" id="builder-stage"></div><p id="builder-warning" class="builder-warning" role="status"></p>
  <div class="builder-code"><div class="demo-toolbar"><div class="code-tabs" role="group" aria-label="Код конструктора">
  <button type="button" data-builder-tab="object" class="is-active">Объект настроек</button><button type="button" data-builder-tab="js">JavaScript</button><button type="button" data-builder-tab="html">HTML</button><button type="button" data-builder-tab="css">CSS</button></div>
  <button type="button" class="copy-code" data-builder-copy>Копировать</button></div><pre class="demo-code"><code id="builder-code-output"></code></pre>
  <div class="demo-foot"><span>Код подключается через CDN с текущей версией Tvist.</span><button type="button" class="copy-code" data-builder-copy-all>Скопировать всю страницу</button></div></div></section></div>`
  const controls = root.querySelector<HTMLElement>('#builder-controls')!
  const stage = root.querySelector<HTMLElement>('#builder-stage')!
  const codeOutput = root.querySelector<HTMLElement>('#builder-code-output')!
  const warning = root.querySelector<HTMLElement>('#builder-warning')!
  let code = getCode(config, undefined, template)

  function updatePreview(): void {
    slider?.destroy()
    thumbs?.destroy()
    thumbs = undefined
    const { options, warnings } = normalize(config)
    const variant = presets[presetId]!.variant
    code = getCode(config, variant, template)
    codeOutput.textContent = code[activeTab]
    warning.textContent = warnings.join(' ')
    stage.classList.toggle('is-vertical', options.direction === 'vertical')
    stage.innerHTML = code.html
    try {
      if (template === 'renderBullet') {
        const pagination = typeof options.pagination === 'object' && options.pagination ? options.pagination as Config : {}
        options.pagination = { ...pagination, type: 'bullets', renderBullet: (index: number, className: string) => `<button class="${className}" aria-label="Слайд ${index + 1}">${index + 1}</button>` }
      }
      if (template === 'events') options.on = { slideChangeEnd: (index: number) => console.log('Активный слайд:', index) }
      slider = new Tvist(stage.querySelector<HTMLElement>(variant === 'thumbs' ? '.main-slider' : '.tvist-v1')!, options as TvistOptions)
      if (variant === 'thumbs') {
        thumbs = new Tvist(stage.querySelector<HTMLElement>('.thumb-slider')!, { perPage: 4, gap: 10, isNavigation: true })
        slider.sync(thumbs)
      }
      root.querySelector('#builder-status')!.textContent = 'Работает в браузере'
    } catch (error) {
      root.querySelector('#builder-status')!.textContent = 'Проверьте настройки'
      warning.textContent = `Не удалось применить настройки: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  function renderForm(): void {
    const openGroups = [...controls.querySelectorAll<HTMLDetailsElement>('.builder-group[open]')].map((group) => group.querySelector('summary')?.textContent)
    controls.innerHTML = renderControls(config)
    if (openGroups.length) controls.querySelectorAll<HTMLDetailsElement>('.builder-group').forEach((group) => { group.open = openGroups.includes(group.querySelector('summary')?.textContent) })
    controls.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-path]').forEach((input) => {
      input.addEventListener('change', () => {
        const path = input.dataset.path!
        const type = input.dataset.type || ''
        const raw = input.value
        const value = type === 'mode' ? raw === 'object' ? {} : parseInput(raw, type) : parseInput(raw, type)
        config = setPath(config, path, value)
        if (type === 'mode') renderForm()
        updatePreview()
      })
    })
    controls.querySelector<HTMLButtonElement>('[data-add-breakpoint]')?.addEventListener('click', () => {
      const current = (config.breakpoints || {}) as Config
      let width = 768
      while (current[String(width)]) width += 1
      config = setPath(config, `breakpoints.${width}`, { perPage: 1 })
      renderForm(); updatePreview()
    })
    controls.querySelectorAll<HTMLElement>('[data-breakpoint-row]').forEach((row) => {
      const widthInput = row.querySelector<HTMLInputElement>('[data-breakpoint-width]')!
      const oldWidth = widthInput.value
      row.querySelector<HTMLButtonElement>('[data-remove-breakpoint]')?.addEventListener('click', () => {
        config = setPath(config, `breakpoints.${oldWidth}`, undefined)
        renderForm(); updatePreview()
      })
      row.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((input) => input.addEventListener('change', () => {
        const all = clone((config.breakpoints || {}) as Config)
        delete all[oldWidth]
        const width = widthInput.value
        if (Number(width) > 0) {
          const perPage = row.querySelector<HTMLInputElement>('[data-breakpoint-perpage]')!.value
          const gap = row.querySelector<HTMLInputElement>('[data-breakpoint-gap]')!.value
          const enabled = row.querySelector<HTMLSelectElement>('[data-breakpoint-enabled]')!.value
          const extraText = row.querySelector<HTMLTextAreaElement>('[data-breakpoint-extra]')!.value.trim()
          let extra: Config = {}
          try {
            if (extraText) {
              const parsed: unknown = JSON.parse(extraText)
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
              extra = parsed as Config
            }
          } catch {
            warning.textContent = 'Дополнительные опции брейкпоинта должны быть объектом JSON.'
            return
          }
          all[width] = { ...extra, ...(perPage ? { perPage: Number(perPage) } : {}), ...(gap ? { gap: parseInput(gap, 'number | string') } : {}), ...(enabled ? { enabled: enabled === 'true' } : {}) }
        }
        config = setPath(config, 'breakpoints', all)
        renderForm(); updatePreview()
      }))
    })
  }

  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => button.addEventListener('click', () => {
    presetId = button.dataset.preset!
    config = clone(presets[presetId]!.options)
    root.querySelectorAll('[data-preset]').forEach((item) => item.classList.toggle('is-active', item === button))
    renderForm(); updatePreview()
  }))
  root.querySelector<HTMLSelectElement>('#builder-template')?.addEventListener('change', (event) => {
    template = (event.currentTarget as HTMLSelectElement).value
    updatePreview()
  })
  root.querySelectorAll<HTMLButtonElement>('[data-builder-tab]').forEach((button) => button.addEventListener('click', () => {
    activeTab = button.dataset.builderTab as Tab
    root.querySelectorAll('[data-builder-tab]').forEach((item) => item.classList.toggle('is-active', item === button))
    codeOutput.textContent = code[activeTab]
  }))
  async function copy(button: HTMLButtonElement, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content)
      const text = button.textContent
      button.textContent = 'Скопировано ✓'
      window.setTimeout(() => { button.textContent = text }, 1800)
    } catch {
      button.textContent = 'Выделите код вручную'
    }
  }
  root.querySelector<HTMLButtonElement>('[data-builder-copy]')?.addEventListener('click', (event) => copy(event.currentTarget as HTMLButtonElement, code[activeTab]))
  root.querySelector<HTMLButtonElement>('[data-builder-copy-all]')?.addEventListener('click', (event) => copy(event.currentTarget as HTMLButtonElement, fullDocument(code)))
  renderForm()
  updatePreview()
}
