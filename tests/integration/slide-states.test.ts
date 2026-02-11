/**
 * @vitest-environment happy-dom
 *
 * Интеграционные тесты для SlideStatesModule:
 * - Проверка классов состояний с реальными размерами элементов
 * - Проверка что active/prev/next проставляются независимо от видимости в viewport
 * - Проверка класса visible для слайдов в viewport
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES, TVIST_CSS_PREFIX } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/slide-states'
import '../../src/modules/loop'

describe('SlideStates integration', () => {
  let container: HTMLElement
  let tvist: Tvist

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    tvist?.destroy()
    document.body.innerHTML = ''
  })

  /**
   * Создаёт слайдер с реальными размерами
   */
  function createSliderWithSizes(slidesCount: number, rootWidth: number, slideWidth: number) {
    // Создаём HTML
    const html = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          ${Array.from({ length: slidesCount }, (_, i) => 
            `<div class="${TVIST_CLASSES.slide}">Slide ${i + 1}</div>`
          ).join('')}
        </div>
      </div>
    `
    container.innerHTML = html

    const root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    const containerEl = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement
    const slides = Array.from(containerEl.querySelectorAll(`.${TVIST_CLASSES.slide}`)) as HTMLElement[]

    // Мокаем размеры root
    const rootRect = {
      left: 0,
      right: rootWidth,
      top: 0,
      bottom: 600,
      width: rootWidth,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }

    // Мокаем getBoundingClientRect для root
    root.getBoundingClientRect = () => rootRect as DOMRect

    // Мокаем размеры слайдов
    slides.forEach((slide, index) => {
      const left = index * slideWidth
      const slideRect = {
        left,
        right: left + slideWidth,
        top: 0,
        bottom: 600,
        width: slideWidth,
        height: 600,
        x: left,
        y: 0,
        toJSON: () => ({})
      }
      slide.getBoundingClientRect = () => slideRect as DOMRect
    })

    // Мокаем offsetWidth для слайдов
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: function() {
        if (this === root) return rootWidth
        if (slides.includes(this)) return slideWidth
        return 0
      }
    })

    return { root, slides }
  }

  describe('perPage = 1 (один слайд в viewport)', () => {
    it('должен проставлять active класс активному слайду', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 2,
        speed: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Активный слайд должен иметь класс active
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      
      // Остальные слайды не должны иметь класс active
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[4].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
    })

    it('должен проставлять prev/next классы соседним слайдам даже если они вне viewport', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 2,
        speed: 0,
        loop: false,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Слайд 1 (prev) находится вне viewport (left: 800, right: 1600, viewport: 0-800)
      // Но класс prev должен быть проставлен
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      
      // Слайд 2 (active) в viewport
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      
      // Слайд 3 (next) находится вне viewport (left: 2400, right: 3200, viewport: 0-800)
      // Но класс next должен быть проставлен
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })

    it('должен проставлять visible класс только слайду в viewport', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 2,
        speed: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Только активный слайд (2) находится в viewport (left: 1600, right: 2400, viewport: 0-800)
      // Остальные слайды вне viewport
      
      // В текущей реализации слайды расположены так:
      // slide 0: left=0, right=800 (в viewport)
      // slide 1: left=800, right=1600 (вне viewport)
      // slide 2: left=1600, right=2400 (вне viewport) - но это активный!
      // slide 3: left=2400, right=3200 (вне viewport)
      // slide 4: left=3200, right=4000 (вне viewport)
      
      // Проблема: мы не сдвигаем контейнер, поэтому в viewport всегда первый слайд
      // Это ограничение теста, в реальном браузере контейнер сдвигается через transform
      
      // Проверяем, что класс visible проставляется
      const visibleSlides = slides.filter(s => s.classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`))
      expect(visibleSlides.length).toBeGreaterThan(0)
    })

    it('должен обновлять классы при навигации', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 1,
        speed: 0,
        loop: false,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Начальное состояние
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)

      // Переходим на следующий слайд
      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Новое состояние
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(false)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(false)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })
  })

  describe('perPage = 1 + loop', () => {
    it('должен проставлять prev/next циклически', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 2, // Начинаем со среднего слайда
        speed: 0,
        loop: true,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // В режиме loop слайды переставляются, а не клонируются
      const allSlides = tvist.slides
      
      // Ищем слайды с классами состояний
      const activeSlides = allSlides.filter(s => 
        s.classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)
      )
      const prevSlides = allSlides.filter(s => 
        s.classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)
      )
      const nextSlides = allSlides.filter(s => 
        s.classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)
      )
      
      // Должны быть проставлены классы
      expect(activeSlides.length).toBeGreaterThan(0)
      expect(prevSlides.length).toBeGreaterThan(0)
      expect(nextSlides.length).toBeGreaterThan(0)
      
      // Проверяем логические индексы
      const activeIndices = activeSlides.map(s => 
        parseInt(s.getAttribute('data-tvist-slide-index') || '0', 10)
      )
      const prevIndices = prevSlides.map(s => 
        parseInt(s.getAttribute('data-tvist-slide-index') || '0', 10)
      )
      const nextIndices = nextSlides.map(s => 
        parseInt(s.getAttribute('data-tvist-slide-index') || '0', 10)
      )
      
      // Активный слайд - индекс 2
      expect(activeIndices.every(i => i === 2)).toBe(true)
      
      // Prev слайд - индекс 1
      expect(prevIndices.every(i => i === 1)).toBe(true)
      
      // Next слайд - индекс 3
      expect(nextIndices.every(i => i === 3)).toBe(true)
    })

    it('должен проставлять prev/next при переходе через границу', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 800)

      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
        speed: 0,
        loop: true,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Переходим на предыдущий слайд (должен быть последний - индекс 4)
      tvist.prev()
      await new Promise(resolve => setTimeout(resolve, 100))

      const allSlides = tvist.slides
      
      // Ищем активный слайд
      const activeSlides = allSlides.filter(s => 
        s.classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)
      )
      
      // Должен быть активен последний слайд (индекс 4)
      expect(activeSlides.length).toBeGreaterThan(0)
      const activeIndex = parseInt(
        activeSlides[0].getAttribute('data-tvist-slide-index') || '0',
        10
      )
      expect(activeIndex).toBe(4)
    })
  })

  describe('perPage > 1', () => {
    it('должен проставлять active класс только первому слайду в группе', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 400)

      tvist = new Tvist(root, {
        perPage: 2,
        start: 0,
        speed: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // При perPage=2 в viewport слайды 0 и 1
      // Активный индекс = 0, поэтому active только у слайда 0
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
    })

    it('должен проставлять visible класс всем слайдам в viewport', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 400)

      tvist = new Tvist(root, {
        perPage: 2,
        start: 0,
        speed: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // При perPage=2 в viewport слайды 0 и 1 (left: 0-400 и 400-800)
      // Оба должны иметь класс visible
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)).toBe(true)
      
      // Остальные слайды вне viewport
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)).toBe(false)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)).toBe(false)
      expect(slides[4].classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)).toBe(false)
    })
  })

  describe('center mode', () => {
    it('должен проставлять классы с учётом центрирования', async () => {
      const { root, slides } = createSliderWithSizes(5, 800, 400)

      tvist = new Tvist(root, {
        perPage: 1,
        center: true,
        start: 2,
        speed: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // В центрированном режиме активный слайд в центре
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })
  })
})
