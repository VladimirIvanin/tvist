/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES, NAVIGATION_ARROW_SVG } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/navigation'

describe('NavigationModule', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // Мокаем размеры, чтобы анимация (и slideChangeEnd) срабатывали при speed: 0
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

  describe('SVG Icon Injection', () => {
    it('should inject SVG icons into empty arrow buttons by default', () => {
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
        arrows: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Проверяем что SVG добавлены
      expect(prevButton?.querySelector('svg')).toBeTruthy()
      expect(nextButton?.querySelector('svg')).toBeTruthy()

      // Проверяем что у SVG правильный класс
      expect(prevButton?.querySelector('svg')?.classList.contains(`${TVIST_CLASSES.block}__arrow-icon`)).toBe(true)
      expect(nextButton?.querySelector('svg')?.classList.contains(`${TVIST_CLASSES.block}__arrow-icon`)).toBe(true)
    })

    it('should NOT inject SVG when addIcons is false', () => {
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
          addIcons: false
        }
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Проверяем что SVG НЕ добавлены
      expect(prevButton?.querySelector('svg')).toBeFalsy()
      expect(nextButton?.querySelector('svg')).toBeFalsy()
    })

    it('should NOT inject SVG when button already has custom element content', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}">
            <span>←</span>
          </button>
          <button class="${TVIST_CLASSES.arrowNext}">
            <span>→</span>
          </button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Проверяем что SVG НЕ добавлены, но пользовательский контент остался
      expect(prevButton?.querySelector('svg')).toBeFalsy()
      expect(nextButton?.querySelector('svg')).toBeFalsy()
      expect(prevButton?.querySelector('span')?.textContent).toBe('←')
      expect(nextButton?.querySelector('span')?.textContent).toBe('→')
    })

    it('should NOT inject SVG when button has text content', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button class="${TVIST_CLASSES.arrowPrev}">‹</button>
          <button class="${TVIST_CLASSES.arrowNext}">›</button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Проверяем что SVG НЕ добавлены, текстовый контент остался
      expect(prevButton?.querySelector('svg')).toBeFalsy()
      expect(nextButton?.querySelector('svg')).toBeFalsy()
      expect(prevButton?.textContent?.trim()).toBe('‹')
      expect(nextButton?.textContent?.trim()).toBe('›')
    })

    it('should NOT inject SVG when button does not have arrow class', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button id="custom-prev"></button>
          <button id="custom-next"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          prev: '#custom-prev',
          next: '#custom-next'
        }
      })

      const prevButton = container.querySelector('#custom-prev')
      const nextButton = container.querySelector('#custom-next')

      // Кастомные кнопки без класса стрелок не должны получить SVG
      expect(prevButton?.querySelector('svg')).toBeFalsy()
      expect(nextButton?.querySelector('svg')).toBeFalsy()
    })

    it('should inject SVG into custom buttons if they have arrow class', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
          <button id="custom-prev" class="${TVIST_CLASSES.arrowPrev}"></button>
          <button id="custom-next" class="${TVIST_CLASSES.arrowNext}"></button>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          prev: '#custom-prev',
          next: '#custom-next'
        }
      })

      const prevButton = container.querySelector('#custom-prev')
      const nextButton = container.querySelector('#custom-next')

      // Проверяем что SVG добавлены
      expect(prevButton?.querySelector('svg')).toBeTruthy()
      expect(nextButton?.querySelector('svg')).toBeTruthy()
    })
  })

  describe('Arrow states', () => {
    it('should disable prev arrow at start without loop', () => {
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
        arrows: true,
        loop: false
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Prev должна быть disabled на первом слайде
      expect(prevButton?.hasAttribute('disabled')).toBe(true)
      expect(prevButton?.classList.contains('disabled')).toBe(true)
      expect(prevButton?.getAttribute('aria-disabled')).toBe('true')

      // Next должна быть enabled
      expect(nextButton?.hasAttribute('disabled')).toBe(false)
      expect(nextButton?.classList.contains('disabled')).toBe(false)
    })

    it('should disable next arrow at end without loop', async () => {
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
        arrows: true,
        loop: false,
        speed: 0
      })

      // Переходим на последний слайд (instant, чтобы slideChangeEnd гарантированно сработал)
      slider.scrollTo(2, true)
      await Promise.resolve()

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Prev должна быть enabled
      expect(prevButton?.hasAttribute('disabled')).toBe(false)
      expect(prevButton?.classList.contains('disabled')).toBe(false)

      // Next должна быть disabled на последнем слайде
      expect(nextButton?.hasAttribute('disabled')).toBe(true)
      expect(nextButton?.classList.contains('disabled')).toBe(true)
      expect(nextButton?.getAttribute('aria-disabled')).toBe('true')
    })

    it('should keep arrows enabled with loop mode', () => {
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
        arrows: true,
        loop: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Обе стрелки должны быть enabled в loop режиме
      expect(prevButton?.hasAttribute('disabled')).toBe(false)
      expect(nextButton?.hasAttribute('disabled')).toBe(false)
    })

    it('should keep arrows enabled with rewind mode', () => {
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
        arrows: true,
        rewind: true
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Обе стрелки должны быть enabled в rewind режиме
      expect(prevButton?.hasAttribute('disabled')).toBe(false)
      expect(nextButton?.hasAttribute('disabled')).toBe(false)
    })

    it('should hide arrows when there are too few slides', () => {
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
        arrows: true,
        perPage: 3 // Все 3 слайда помещаются на одной странице
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // Стрелки должны быть скрыты, когда слайдов не больше чем perPage
      expect(prevButton?.classList.contains('hidden')).toBe(true)
      expect(nextButton?.classList.contains('hidden')).toBe(true)
    })
  })

  describe('Arrow functionality', () => {
    it('should navigate to next slide on next arrow click', async () => {
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
        arrows: true,
        speed: 0
      })

      const nextButton = container.querySelector<HTMLElement>(`.${TVIST_CLASSES.arrowNext}`)

      expect(slider.activeIndex).toBe(0)

      nextButton?.click()
      await Promise.resolve()

      expect(slider.activeIndex).toBe(1)
    })

    it('should navigate to prev slide on prev arrow click', async () => {
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
        arrows: true,
        speed: 0,
        start: 1
      })

      const prevButton = container.querySelector<HTMLElement>(`.${TVIST_CLASSES.arrowPrev}`)

      expect(slider.activeIndex).toBe(1)

      prevButton?.click()
      await Promise.resolve()

      expect(slider.activeIndex).toBe(0)
    })

    it('should not navigate when clicking disabled arrow', () => {
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
        arrows: true,
        loop: false
      })

      const prevButton = container.querySelector<HTMLElement>(`.${TVIST_CLASSES.arrowPrev}`)

      expect(slider.activeIndex).toBe(0)

      // Попытка клика по disabled кнопке
      prevButton?.click()

      // Индекс не должен измениться
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('Custom arrow selectors', () => {
    it('should work with custom arrow selectors', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
        <button id="my-prev">Prev</button>
        <button id="my-next">Next</button>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        arrows: {
          prev: '#my-prev',
          next: '#my-next'
        }
      })

      const prevButton = document.querySelector('#my-prev')
      const nextButton = document.querySelector('#my-next')

      // Кастомные кнопки должны работать
      expect(prevButton?.hasAttribute('disabled')).toBe(true)
      expect(nextButton?.hasAttribute('disabled')).toBe(false)
    })

    it('should work with custom disabled class', async () => {
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
          disabledClass: 'my-disabled'
        },
        speed: 0
      })

      const prevButton = container.querySelector(`.${TVIST_CLASSES.arrowPrev}`)
      const nextButton = container.querySelector(`.${TVIST_CLASSES.arrowNext}`)

      // На первом слайде prev должна иметь кастомный класс
      expect(prevButton?.classList.contains('my-disabled')).toBe(true)
      expect(prevButton?.classList.contains('disabled')).toBe(false)

      // Переходим на следующий слайд
      slider.next()
      await Promise.resolve()

      // Теперь prev не должна иметь кастомный класс
      expect(prevButton?.classList.contains('my-disabled')).toBe(false)
    })
  })
})
