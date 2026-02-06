/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'

describe('Engine - endIndex logic', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('scrollTo with endIndex', () => {
    it('should limit scrollTo to endIndex when perPage > 1', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
            <div class="${TVIST_CLASSES.slide}">6</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 4,
        speed: 0
      })

      // endIndex = 6 - 4 = 2
      // Попытка перейти к индексу 5 должна ограничиться до 2
      slider.scrollTo(5)
      expect(slider.activeIndex).toBe(2)

      // Попытка перейти к индексу 10 должна ограничиться до 2
      slider.scrollTo(10)
      expect(slider.activeIndex).toBe(2)
    })

    it('should allow scrolling to any index in loop mode', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
            <div class="${TVIST_CLASSES.slide}">6</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 4,
        speed: 0,
        loop: true
      })

      // В loop режиме можно перейти к любому индексу
      slider.scrollTo(5)
      expect(slider.activeIndex).toBe(5)
    })

    it('should work correctly with perPage = 1', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 1,
        speed: 0
      })

      // endIndex = 5 - 1 = 4
      slider.scrollTo(4)
      expect(slider.activeIndex).toBe(4)

      // Попытка перейти дальше должна ограничиться до 4
      slider.scrollTo(5)
      expect(slider.activeIndex).toBe(4)
    })

    it('should calculate endIndex correctly for various perPage values', () => {
      const testCases = [
        { slides: 10, perPage: 3, expectedEndIndex: 7 }, // 10 - 3 = 7
        { slides: 6, perPage: 2, expectedEndIndex: 4 },  // 6 - 2 = 4
        { slides: 8, perPage: 4, expectedEndIndex: 4 },  // 8 - 4 = 4
        { slides: 5, perPage: 5, expectedEndIndex: 0 },  // 5 - 5 = 0
      ]

      testCases.forEach(({ slides, perPage, expectedEndIndex }) => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: slides }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage,
          speed: 0
        })

        // Пытаемся перейти к последнему слайду
        slider.scrollTo(slides - 1)
        expect(slider.activeIndex).toBe(expectedEndIndex)
      })
    })
  })

  describe('canScrollNext with endIndex', () => {
    it('should return false when at endIndex', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
            <div class="${TVIST_CLASSES.slide}">6</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 4,
        speed: 0
      })

      // endIndex = 2
      expect(slider.engine.canScrollNext()).toBe(true)

      slider.scrollTo(2)
      expect(slider.engine.canScrollNext()).toBe(false)
    })

    it('should return true in loop mode even at endIndex', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
            <div class="${TVIST_CLASSES.slide}">6</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 4,
        speed: 0,
        loop: true
      })

      slider.scrollTo(5)
      expect(slider.engine.canScrollNext()).toBe(true)
    })
  })

  describe('scrollBy with endIndex', () => {
    it('should not scroll beyond endIndex', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
            <div class="${TVIST_CLASSES.slide}">6</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 4,
        speed: 0
      })

      // endIndex = 2
      slider.scrollTo(0)
      expect(slider.activeIndex).toBe(0)

      // Пытаемся проскроллить на 5 слайдов вперед
      slider.engine.scrollBy(5)
      expect(slider.activeIndex).toBe(2) // Должно остановиться на endIndex
    })
  })
})
