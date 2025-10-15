import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Engine } from '../../../src/core/Engine'
import { Tvist } from '../../../src/core/Tvist'

describe('Engine', () => {
  let container: HTMLElement
  let root: HTMLElement

  beforeEach(() => {
    // Создаём DOM структуру
    root = document.createElement('div')
    root.className = 'tvist'
    root.style.width = '1000px'

    const sliderContainer = document.createElement('div')
    sliderContainer.className = 'tvist__container'

    for (let i = 0; i < 5; i++) {
      const slide = document.createElement('div')
      slide.className = 'tvist__slide'
      slide.textContent = `Slide ${i + 1}`
      sliderContainer.appendChild(slide)
    }

    root.appendChild(sliderContainer)
    document.body.appendChild(root)
    container = root

    // Мокируем offsetWidth для JSDOM
    Object.defineProperty(root, 'offsetWidth', {
      configurable: true,
      value: 1000
    })
  })

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container)
    }
  })

  it('should calculate slide width correctly', () => {
    const slider = new Tvist(root, {
      perPage: 3,
      gap: 20,
    })

    // slideWidth = (1000 - 20 * (3-1)) / 3 = (1000 - 40) / 3 = 320
    const slideWidth = slider.engine.slideWidthValue

    expect(slideWidth).toBeCloseTo(320, 0)
  })

  it('should calculate positions correctly', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      gap: 10,
    })

    expect(slider.engine.getSlidePosition(0)).toBe(0)
    expect(slider.engine.getSlidePosition(1)).toBeGreaterThan(0)
  })

  it('should scroll to specific index', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      gap: 0,
      speed: 0, // Мгновенный переход для тестов
    })

    slider.scrollTo(2, true)

    expect(slider.activeIndex).toBe(2)
  })

  it('should emit events on scroll', () => {
    const beforeChange = vi.fn()
    const change = vi.fn()
    const changed = vi.fn()

    const slider = new Tvist(root, {
      perPage: 1,
      on: {
        beforeSlideChange: beforeChange,
        slideChange: change,
        slideChanged: changed,
      },
    })

    slider.scrollTo(1, true)

    expect(beforeChange).toHaveBeenCalledWith(1)
    expect(changed).toHaveBeenCalledWith(1)
  })

  it('should respect loop option in Counter', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      loop: true,
    })

    // С loop индексы должны циклиться
    slider.scrollTo(10, true) // Больше чем слайдов
    expect(slider.activeIndex).toBeLessThan(5)
  })

  it('should clamp index without loop', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      loop: false,
    })

    slider.scrollTo(10, true) // Больше чем слайдов
    expect(slider.activeIndex).toBe(4) // max index = 4
  })

  it('should update on resize', () => {
    const slider = new Tvist(root, {
      perPage: 2,
      gap: 10,
    })

    const initialWidth = slider.engine.slideWidthValue

    // Изменяем размер контейнера и мокаем новый offsetWidth
    root.style.width = '1200px'
    Object.defineProperty(root, 'offsetWidth', {
      configurable: true,
      value: 1200
    })
    slider.update()

    const newWidth = slider.engine.slideWidthValue

    expect(newWidth).not.toBe(initialWidth)
    expect(newWidth).toBeCloseTo(595, 0) // (1200 - 10) / 2 = 595
  })

  it('should check if can scroll next', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      loop: false,
    })

    slider.scrollTo(0, true)
    expect(slider.canScrollNext).toBe(true)

    slider.scrollTo(4, true) // последний слайд
    expect(slider.canScrollNext).toBe(false)
  })

  it('should check if can scroll prev', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      loop: false,
    })

    slider.scrollTo(4, true)
    expect(slider.canScrollPrev).toBe(true)

    slider.scrollTo(0, true)
    expect(slider.canScrollPrev).toBe(false)
  })

  it('should always allow scroll with loop', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      loop: true,
    })

    slider.scrollTo(0, true)
    expect(slider.canScrollNext).toBe(true)
    expect(slider.canScrollPrev).toBe(true)

    slider.scrollTo(4, true)
    expect(slider.canScrollNext).toBe(true)
    expect(slider.canScrollPrev).toBe(true)
  })

  it('should handle scrollBy', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      speed: 0
    })

    slider.scrollTo(2, true)
    expect(slider.activeIndex).toBe(2)

    slider.engine.scrollBy(1)
    // scrollBy не мгновенный, но должен запустить анимацию
    // Проверяем что метод не падает
    expect(slider.activeIndex).toBeGreaterThanOrEqual(2)
  })

  it('should apply transform to container', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      speed: 0,
    })

    slider.scrollTo(1, true)

    const transform = slider.container.style.transform
    expect(transform).toContain('translate3d')
  })

  it('should handle vertical direction', () => {
    const slider = new Tvist(root, {
      perPage: 1,
      direction: 'vertical',
    })

    slider.scrollTo(1, true)

    const transform = slider.container.style.transform
    expect(transform).toContain('translate3d(0')
  })
})

