/**
 * @vitest-environment happy-dom
 *
 * Предзагрузка native loading="lazy" для соседних / целевого слайда (cube и т.д.).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/slide-states'

function buildSlider(slidesCount: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        ${Array.from(
          { length: slidesCount },
          (_, i) =>
            `<div class="${TVIST_CLASSES.slide}">
              <img data-slide="${i}" src="https://example.com/s${i}.jpg" alt="" loading="lazy" />
            </div>`
        ).join('')}
      </div>
    </div>
  `
  document.body.appendChild(wrap)
  return wrap.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
}

describe('nativeLazyAdjacent', () => {
  let tvist: Tvist | undefined

  afterEach(() => {
    tvist?.destroy()
    document.body.innerHTML = ''
  })

  it('по умолчанию не трогает loading у соседних слайдов после init', async () => {
    const root = buildSlider(3)
    tvist = new Tvist(root, { start: 1, speed: 0 })
    await Promise.resolve()

    const imgs = [...root.querySelectorAll('img')] as HTMLImageElement[]
    expect(imgs.every((img) => img.loading === 'lazy')).toBe(true)
  })

  it('onInit: соседи активного получают eager', async () => {
    const root = buildSlider(4)
    tvist = new Tvist(root, {
      start: 1,
      speed: 0,
      nativeLazyAdjacent: { onInit: true, onTransitionStart: false },
    })
    await Promise.resolve()

    const prev = root.querySelector('[data-slide="0"]') as HTMLImageElement
    const active = root.querySelector('[data-slide="1"]') as HTMLImageElement
    const next = root.querySelector('[data-slide="2"]') as HTMLImageElement
    const far = root.querySelector('[data-slide="3"]') as HTMLImageElement

    expect(prev.loading).toBe('eager')
    expect(active.loading).toBe('lazy')
    expect(next.loading).toBe('eager')
    expect(far.loading).toBe('lazy')
  })

  it('nativeLazyAdjacent: true не трогает соседей при init, срабатывает на переходе', async () => {
    const root = buildSlider(3)
    tvist = new Tvist(root, {
      start: 0,
      speed: 0,
      nativeLazyAdjacent: true,
    })
    await Promise.resolve()

    const i1 = root.querySelector('[data-slide="1"]') as HTMLImageElement
    expect(i1.loading).toBe('lazy')

    tvist.next()
    await Promise.resolve()
    expect(i1.loading).toBe('eager')
  })

  it('onTransitionStart: при next целевой слайд получает eager до конца перехода', async () => {
    const root = buildSlider(3)
    tvist = new Tvist(root, {
      start: 0,
      speed: 0,
      nativeLazyAdjacent: { onInit: false, onTransitionStart: true },
    })
    await Promise.resolve()

    const i0 = root.querySelector('[data-slide="0"]') as HTMLImageElement
    const i1 = root.querySelector('[data-slide="1"]') as HTMLImageElement
    expect(i0.loading).toBe('lazy')
    expect(i1.loading).toBe('lazy')

    tvist.next()
    await Promise.resolve()

    expect(i0.loading).toBe('lazy')
    expect(i1.loading).toBe('eager')
  })

  it('nativeLazyAdjacent: false отключает оба сценария', async () => {
    const root = buildSlider(3)
    tvist = new Tvist(root, {
      start: 0,
      speed: 0,
      nativeLazyAdjacent: false,
    })
    await Promise.resolve()

    const i1 = root.querySelector('[data-slide="1"]') as HTMLImageElement
    expect(i1.loading).toBe('lazy')
    tvist!.next()
    await Promise.resolve()
    expect(i1.loading).toBe('lazy')
  })
})
