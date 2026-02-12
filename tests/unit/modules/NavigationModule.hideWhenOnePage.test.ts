/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/navigation'

describe('NavigationModule - hideWhenOnePage', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // Мокаем размеры
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 800 },
      offsetWidth: { get: () => 800 }
    })
    // @ts-expect-error мок для расчёта позиций
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 } as DOMRect)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('should hide arrows by default when there is only one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: true // hideWhenOnePage: true по умолчанию
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)
      const root = container.querySelector(`.${TVIST_CLASSES.block}`)

      // Стрелки должны быть скрыты
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(prevButton?.getAttribute('aria-hidden')).toBe('true')
      expect(nextButton?.getAttribute('aria-hidden')).toBe('true')

      // Должен быть добавлен класс single-page
      expect(root?.classList.contains(TVIST_CLASSES.singlePage)).toBe(true)
    })

    it('should hide arrows when perPage equals slide count', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        perPage: 2
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть скрыты (все слайды помещаются на одной странице)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    })

    it('should show arrows when hideWhenOnePage is false even if locked', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: false // Явно отключаем автоскрытие
        },
        perPage: 3 // Все слайды на одной странице
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)
      const root = container.querySelector(`.${TVIST_CLASSES.block}`)

      // Слайдер заблокирован, но hideWhenOnePage: false
      expect(root?.classList.contains(TVIST_CLASSES.locked)).toBe(true)
      
      // Стрелки должны быть ВИДНЫ (disabled, но не hidden)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(prevButton?.hasAttribute('disabled')).toBe(true)
      expect(nextButton?.hasAttribute('disabled')).toBe(true)
    })

    it('should show arrows when there are multiple pages', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)
      const root = container.querySelector(`.${TVIST_CLASSES.block}`)

      // Стрелки должны быть видны (есть несколько страниц)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)

      // Класс single-page НЕ должен быть добавлен
      expect(root?.classList.contains(TVIST_CLASSES.singlePage)).toBe(false)
    })
  })

  describe('With slidesPerGroup', () => {
    it('should hide arrows when slidesPerGroup makes it one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        perPage: 1,
        slidesPerGroup: 3 // Листаем по 3 слайда за раз = 1 страница
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть скрыты
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    })

    it('should show arrows when slidesPerGroup creates multiple pages', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        perPage: 1,
        slidesPerGroup: 2 // 4 слайда / 2 = 2 страницы
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть видны
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
    })
  })

  describe('With loop mode', () => {
    it('should hide arrows in loop mode when hideWhenOnePage is true and one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        loop: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть скрыты даже в loop режиме
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    })

    it('should show arrows in loop mode when there are multiple pages', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        loop: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть видны и enabled в loop режиме
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(prevButton?.hasAttribute('disabled')).toBe(false)
      expect(nextButton?.hasAttribute('disabled')).toBe(false)
    })
  })

  describe('With breakpoints', () => {
    it('should update visibility when perPage changes via breakpoints', async () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        },
        perPage: 1,
        breakpoints: {
          768: {
            perPage: 3 // На больших экранах все слайды на одной странице
          }
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Изначально стрелки видны (perPage: 1, 3 слайда = 3 страницы)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)

      // Симулируем изменение опций через breakpoint
      slider.updateOptions({ perPage: 3 })
      await Promise.resolve()

      // Теперь стрелки должны быть скрыты (perPage: 3, 3 слайда = 1 страница)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    })
  })

  describe('BEM classes', () => {
    it('should use BEM classes by default', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Должны использоваться БЭМ классы
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(TVIST_CLASSES.arrowHidden).toContain('__arrow--hidden')
    })

    it('should support custom hidden class', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: true,
          hiddenClass: 'my-hidden'
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Должен использоваться кастомный класс
      expect(prevButton?.classList.contains('my-hidden')).toBe(true)
      expect(nextButton?.classList.contains('my-hidden')).toBe(true)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
    })
  })

  describe('Locked state', () => {
    it('should hide arrows when slider is locked with hideWhenOnePage: true (default)', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: true // hideWhenOnePage: true по умолчанию
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть скрыты (слайдер заблокирован + hideWhenOnePage: true)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    })

    it('should show arrows when slider is locked with hideWhenOnePage: false', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}"></button>
          <button class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          hideWhenOnePage: false
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть ВИДНЫ (disabled, но не hidden)
      expect(prevButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(nextButton?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
      expect(prevButton?.hasAttribute('disabled')).toBe(true)
      expect(nextButton?.hasAttribute('disabled')).toBe(true)
    })
  })
})
