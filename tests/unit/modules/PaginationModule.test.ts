/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/pagination'

describe('PaginationModule', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Bullets pagination', () => {
    it('should create correct number of bullets when perPage > 1', () => {
      // 6 слайдов, perPage: 4 → должно быть 2 точки (Math.ceil(6/4) = 2)
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 4,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll('.tvist__bullet')
      expect(bullets.length).toBe(2)
    })

    it('should create correct number of bullets when perPage = 1', () => {
      // 5 слайдов, perPage: 1 → должно быть 5 точек
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 1,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll('.tvist__bullet')
      expect(bullets.length).toBe(5)
    })

    it('should create correct number of bullets for various perPage values', () => {
      const testCases = [
        { slides: 10, perPage: 3, expected: 4 }, // ceil(10/3) = 4
        { slides: 6, perPage: 2, expected: 3 },  // ceil(6/2) = 3
        { slides: 7, perPage: 3, expected: 3 },  // ceil(7/3) = 3
        { slides: 8, perPage: 4, expected: 2 },  // ceil(8/4) = 2
      ]

      testCases.forEach(({ slides, perPage, expected }) => {
        container.innerHTML = `
          <div class="tvist">
            <div class="tvist__container">
              ${Array.from({ length: slides }, (_, i) => `<div class="tvist__slide">${i + 1}</div>`).join('')}
            </div>
            <div class="tvist__pagination"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector('.tvist')!, {
          perPage,
          pagination: {
            type: 'bullets',
            clickable: true
          }
        })

        const bullets = container.querySelectorAll('.tvist__bullet')
        expect(bullets.length).toBe(expected)
      })
    })

    it('should activate correct bullet based on current page', async () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 3,
        speed: 0, // Отключаем анимацию для тестов
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll('.tvist__bullet')
      
      // Изначально активна первая точка (слайды 0-2)
      expect(bullets[0].classList.contains('active')).toBe(true)
      expect(bullets[1].classList.contains('active')).toBe(false)

      // Переходим к слайду 3 (вторая страница, слайды 3-5)
      await new Promise<void>(resolve => {
        slider.on('slideChanged', () => resolve())
        slider.scrollTo(3)
      })
      
      expect(bullets[0].classList.contains('active')).toBe(false)
      expect(bullets[1].classList.contains('active')).toBe(true)
    })

    it('should navigate to correct slide when clicking bullet', () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll<HTMLElement>('.tvist__bullet')
      
      // Клик по второй точке должен перейти к endIndex (2), а не к слайду 4
      // endIndex = 6 - 4 = 2
      bullets[1].click()
      expect(slider.activeIndex).toBe(2)

      // Клик по первой точке должен вернуть к слайду 0
      bullets[0].click()
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('Fraction pagination', () => {
    it('should show correct page numbers with perPage > 1', () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 4,
        pagination: {
          type: 'fraction'
        }
      })

      const current = container.querySelector('.tvist__pagination-current')
      const total = container.querySelector('.tvist__pagination-total')

      expect(current?.textContent).toBe('1')
      expect(total?.textContent).toBe('2') // Math.ceil(6/4) = 2 страницы
    })
  })

  describe('Progress pagination', () => {
    it('should calculate progress based on pages, not slides', async () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 3,
        speed: 0, // Отключаем анимацию
        pagination: {
          type: 'progress'
        }
      })

      let progressBar = container.querySelector<HTMLElement>('.tvist__pagination-progress-bar')

      // Первая страница (1/2) = 50%
      expect(progressBar?.style.width).toBe('50%')

      // Переходим к слайду 3 (вторая страница, 2/2) = 100%
      await new Promise<void>(resolve => {
        slider.on('slideChanged', () => resolve())
        slider.scrollTo(3)
      })
      
      progressBar = container.querySelector<HTMLElement>('.tvist__pagination-progress-bar')
      expect(progressBar?.style.width).toBe('100%')
    })
  })

  describe('EndIndex logic', () => {
    it('should not allow scrolling beyond endIndex when perPage > 1', async () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      // endIndex должен быть 2 (6 - 4 = 2)
      // Попытка перейти к индексу 5 должна ограничиться до 2
      await new Promise<void>(resolve => {
        slider.on('slideChanged', () => resolve())
        slider.scrollTo(5)
      })

      expect(slider.activeIndex).toBe(2)
    })

    it('should navigate to endIndex when clicking last pagination bullet', () => {
      container.innerHTML = `
        <div class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
          <div class="tvist__pagination"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector('.tvist')!, {
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll<HTMLElement>('.tvist__bullet')
      
      // Должно быть 2 точки (Math.ceil(6/4) = 2)
      expect(bullets.length).toBe(2)

      // Клик по последней точке должен перейти к endIndex (2), а не к слайду 4
      bullets[1].click()
      expect(slider.activeIndex).toBe(2) // endIndex = 6 - 4 = 2
    })

    it('should show correct number of bullets for edge cases', () => {
      const testCases = [
        { slides: 5, perPage: 3, expectedBullets: 2, endIndex: 2 }, // ceil(5/3) = 2, endIndex = 5-3 = 2
        { slides: 7, perPage: 4, expectedBullets: 2, endIndex: 3 }, // ceil(7/4) = 2, endIndex = 7-4 = 3
        { slides: 10, perPage: 3, expectedBullets: 4, endIndex: 7 }, // ceil(10/3) = 4, endIndex = 10-3 = 7
      ]

      testCases.forEach(({ slides, perPage, expectedBullets, endIndex }) => {
        container.innerHTML = `
          <div class="tvist">
            <div class="tvist__container">
              ${Array.from({ length: slides }, (_, i) => `<div class="tvist__slide">${i + 1}</div>`).join('')}
            </div>
            <div class="tvist__pagination"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector('.tvist')!, {
          perPage,
          speed: 0,
          pagination: {
            type: 'bullets',
            clickable: true
          }
        })

        const bullets = container.querySelectorAll('.tvist__bullet')
        expect(bullets.length).toBe(expectedBullets)

        // Проверяем что нельзя перейти дальше endIndex
        slider.scrollTo(slides - 1)
        expect(slider.activeIndex).toBe(endIndex)
      })
    })
  })
})
