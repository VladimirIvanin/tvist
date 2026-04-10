/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import { TVIST_SLIDE_INDEX_ATTR } from '@utils/slideRealIndex'
import '../../../src/modules/virtual'

function mountEmptySlider(overrides: ConstructorParameters<typeof Tvist>[1] = {}) {
  const root = document.createElement('div')
  root.className = TVIST_CLASSES.block
  root.style.width = '600px'
  const track = document.createElement('div')
  track.className = TVIST_CLASSES.track
  const container = document.createElement('div')
  container.className = TVIST_CLASSES.container
  const placeholder = document.createElement('div')
  placeholder.className = TVIST_CLASSES.slide
  placeholder.innerHTML = '·'
  container.appendChild(placeholder)
  track.appendChild(container)
  root.appendChild(track)
  document.body.appendChild(root)

  Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 600 })
  Object.defineProperty(track, 'offsetWidth', { configurable: true, value: 600 })
  Object.defineProperty(track, 'offsetHeight', { configurable: true, value: 300 })

  const slider = new Tvist(root, {
    speed: 0,
    perPage: 1,
    ...overrides,
  })

  return { root, track, container, slider }
}

describe('VirtualModule', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('держит в DOM только окно слайдов при большом логическом списке', () => {
    const n = 200
    const { slider, container } = mountEmptySlider({
      virtual: {
        slides: Array.from({ length: n }, (_, i) => i),
        renderSlide: (v: number) => `<span data-v="${v}">${v}</span>`,
        addSlidesBefore: 0,
        addSlidesAfter: 0,
      },
    })

    expect(slider.engine.getVirtualLogicalCount()).toBe(n)
    expect(slider.slideCount).toBe(n)
    expect(slider.slides.length).toBeGreaterThan(0)
    expect(slider.slides.length).toBeLessThan(20)
    expect(container.querySelectorAll(`.${TVIST_CLASSES.slide}`).length).toBe(slider.slides.length)

    const indices = slider.slides.map((el) =>
      parseInt(el.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '-1', 10)
    )
    expect(indices.every((i) => i >= 0 && i < n)).toBe(true)
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
  })

  it('scrollTo переводит на последний логический слайд с ограниченным числом узлов', () => {
    const n = 150
    const { slider } = mountEmptySlider({
      virtual: {
        slides: Array.from({ length: n }, (_, i) => i),
        renderSlide: (v: number) => `<b>${v}</b>`,
      },
    })

    slider.scrollTo(n - 1, true)
    expect(slider.activeIndex).toBe(n - 1)
    expect(slider.slides.length).toBeLessThan(25)
    const lastInDom = Math.max(
      ...slider.slides.map((el) => parseInt(el.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '-1', 10))
    )
    expect(lastInDom).toBeGreaterThanOrEqual(slider.activeIndex)
  })

  it('tvist.virtual.setSlides меняет длину и пересчитывает окно', () => {
    const { slider } = mountEmptySlider({
      virtual: {
        slides: [10, 20, 30],
        renderSlide: (v: number) => String(v),
      },
    })

    expect(slider.slideCount).toBe(3)
    slider.virtual?.setSlides([1, 2, 3, 4, 5])
    expect(slider.slideCount).toBe(5)
    expect(slider.engine.getVirtualLogicalCount()).toBe(5)
    expect(slider.virtual?.getSlideCount()).toBe(5)
  })

  it('не активируется при loop: оставляет обычный DOM', () => {
    const root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '400px'
    const track = document.createElement('div')
    track.className = TVIST_CLASSES.track
    const container = document.createElement('div')
    container.className = TVIST_CLASSES.container
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('div')
      s.className = TVIST_CLASSES.slide
      s.textContent = `S${i}`
      container.appendChild(s)
    }
    track.appendChild(container)
    root.appendChild(track)
    document.body.appendChild(root)
    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 400 })
    Object.defineProperty(track, 'offsetWidth', { configurable: true, value: 400 })
    Object.defineProperty(track, 'offsetHeight', { configurable: true, value: 200 })

    const slider = new Tvist(root, {
      loop: true,
      speed: 0,
      virtual: {
        slides: Array.from({ length: 500 }, (_, i) => i),
        renderSlide: (v: number) => String(v),
      },
    })

    expect(slider.engine.getVirtualLogicalCount()).toBeNull()
    expect(slider.slides.length).toBe(4)
    expect(slider.getModule('virtual')).toBeUndefined()
  })

  it('позиции движка покрывают все логические индексы', () => {
    const n = 80
    const { slider } = mountEmptySlider({
      virtual: {
        slides: Array.from({ length: n }, (_, i) => i),
        renderSlide: (v: number) => `${v}`,
      },
    })

    const positions = slider.engine.getSlidePositions()
    expect(positions.length).toBe(n)
    expect(positions[0]).toBe(0)
    expect(positions[n - 1]).toBeGreaterThan(positions[0] ?? 0)
  })
})
