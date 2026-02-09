/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/core/Tvist'

describe('Auto Width / Auto Height integration', () => {
  let root: HTMLElement
  let container: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '800px'

    container = document.createElement('div')
    container.className = TVIST_CLASSES.container

    const widths = [180, 280, 380, 260, 200, 340]
    widths.forEach((w, i) => {
      const slide = document.createElement('div')
      slide.className = TVIST_CLASSES.slide
      slide.style.width = `${w}px`
      slide.textContent = `Slide ${i + 1}`
      container.appendChild(slide)
    })

    root.appendChild(container)
    document.body.appendChild(root)

    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 800 })
    const slides = container.querySelectorAll(`.${TVIST_CLASSES.slide}`)
    const widthsArr = [180, 280, 380, 260, 200, 340]
    slides.forEach((el, i) => {
      Object.defineProperty(el, 'offsetWidth', { configurable: true, value: widthsArr[i] })
      Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 })
    })
  })

  afterEach(() => {
    if (root?.parentNode) {
      document.body.removeChild(root)
    }
  })

  it('should keep slide widths from CSS when autoWidth: true', () => {
    const slider = new Tvist(root, {
      autoWidth: true,
      gap: 16,
      perPage: 1,
      speed: 0
    })

    // После инициализации Engine должен измерить и применить размеры слайдов
    const expectedWidths = [180, 280, 380, 260, 200, 340]
    slider.slides.forEach((slide, i) => {
      // Проверяем, что width установлен (в px)
      expect(slide.style.width).toBe(`${expectedWidths[i]}px`)
    })
  })

  it('should navigate through slides with different widths', () => {
    const slider = new Tvist(root, {
      autoWidth: true,
      gap: 16,
      perPage: 1,
      speed: 0
    })

    expect(slider.activeIndex).toBe(0)
    expect(slider.slides.length).toBe(6)

    slider.scrollTo(1, true)
    expect(slider.activeIndex).toBe(1)

    slider.scrollTo(5, true)
    expect(slider.activeIndex).toBe(5)

    slider.scrollTo(0, true)
    expect(slider.activeIndex).toBe(0)
  })

  it('should report correct getSlideSize for each index', () => {
    const slider = new Tvist(root, {
      autoWidth: true,
      gap: 16,
      perPage: 1,
      speed: 0
    })

    const expectedSizes = [180, 280, 380, 260, 200, 340]
    expectedSizes.forEach((size, i) => {
      expect(slider.engine.getSlideSize(i)).toBe(size)
    })
  })

  it('should apply transform for scroll position', () => {
    const slider = new Tvist(root, {
      autoWidth: true,
      gap: 16,
      perPage: 1,
      speed: 0
    })

    slider.scrollTo(2, true)
    const transform = slider.container.style.transform
    expect(transform).toContain('translate3d')
    expect(transform).not.toContain('0px, 0, 0')
  })
})
