/**
 * @vitest-environment happy-dom
 *
 * Тесты для воспроизведения ошибки:
 * "Uncaught TypeError: can't access property "remove", t.classList is undefined"
 * в showArrow/updateArrowsState при вызове updateOptions с кастомными стрелками (DOM-элементы)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../../src/modules/navigation'
import '../../../src/modules/breakpoints'

describe('NavigationModule + updateOptions (кастомные DOM-стрелки)', () => {
  let wrapper: HTMLElement
  let root: HTMLElement
  let prevBtn: HTMLElement
  let nextBtn: HTMLElement

  beforeEach(() => {
    wrapper = document.createElement('div')

    // Стрелки находятся ВНЕ root — как в реальном коде пользователя
    prevBtn = document.createElement('button')
    prevBtn.className = 'collections__slider-arrow-prev'

    nextBtn = document.createElement('button')
    nextBtn.className = 'collections__slider-arrow-next'

    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.innerHTML = `
      <div class="${TVIST_CLASSES.container}">
        <div class="${TVIST_CLASSES.slide}">1</div>
        <div class="${TVIST_CLASSES.slide}">2</div>
        <div class="${TVIST_CLASSES.slide}">3</div>
        <div class="${TVIST_CLASSES.slide}">4</div>
        <div class="${TVIST_CLASSES.slide}">5</div>
      </div>
    `

    wrapper.appendChild(prevBtn)
    wrapper.appendChild(nextBtn)
    wrapper.appendChild(root)
    document.body.appendChild(wrapper)

    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 800, configurable: true },
      offsetWidth: { get: () => 800, configurable: true },
    })
    // @ts-expect-error мок
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 } as DOMRect)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('не должен падать при updateOptions(peek/gap/slideMinSize) с кастомными DOM-стрелками', () => {
    const slider = new Tvist(root, {
      slideMinSize: 160,
      gap: 30,
      slidesPerGroup: 1,
      arrows: {
        prev: prevBtn,
        next: nextBtn,
      },
      breakpoints: {
        768: {
          peek: { before: 5, after: '60px' },
          enabled: false,
        },
      },
    })

    // Воспроизводим вызов из реального кода — updateOptions без breakpoints
    expect(() => {
      slider.updateOptions({
        slideMinSize: 130,
        gap: 15,
        peek: {
          before: 0,
          after: 80,
        },
      })
    }).not.toThrow()
  })

  it('не должен падать при повторных вызовах updateOptions с кастомными DOM-стрелками', () => {
    const slider = new Tvist(root, {
      slideMinSize: 160,
      gap: 30,
      arrows: {
        prev: prevBtn,
        next: nextBtn,
      },
      breakpoints: {
        768: {
          enabled: false,
        },
      },
    })

    expect(() => {
      slider.updateOptions({ slideMinSize: 130, gap: 15 })
      slider.updateOptions({ gap: 20 })
      slider.updateOptions({ peek: { before: 0, after: 50 } })
    }).not.toThrow()
  })

  it('не должен падать при updateOptions с breakpoints и кастомными DOM-стрелками', () => {
    const slider = new Tvist(root, {
      slideMinSize: 160,
      gap: 30,
      arrows: {
        prev: prevBtn,
        next: nextBtn,
      },
    })

    // Добавляем breakpoints через updateOptions — именно здесь происходит JSON.parse(JSON.stringify(...))
    expect(() => {
      slider.updateOptions({
        breakpoints: {
          768: {
            enabled: false,
          },
        },
      })
    }).not.toThrow()
  })

  /**
   * Воспроизводит реальный сценарий ошибки:
   * 1. Слайдер создан с кастомными DOM-стрелками и breakpoints { 768: { enabled: false } }
   * 2. Окно сужается до < 768px → breakpoint срабатывает → disable() → модуль уничтожается
   * 3. Окно расширяется обратно → enable() → модуль пересоздаётся, но options.arrows потерял DOM-элементы
   * 4. Вызывается updateOptions → update() → onUpdate() → updateArrowsState() → CRASH
   */
  it('не должен падать при updateOptions после ресайза окна туда-сюда (breakpoint enabled:false)', () => {
    const slider = new Tvist(root, {
      slideMinSize: 160,
      gap: 30,
      slidesPerGroup: 1,
      arrows: {
        prev: prevBtn,
        next: nextBtn,
      },
      breakpoints: {
        768: {
          enabled: false,
        },
      },
    })

    // Симулируем сужение окна до < 768px — breakpoint enabled:false срабатывает
    window.innerWidth = 600
    slider.update()

    // Симулируем расширение окна обратно > 768px — breakpoint снимается, enable() вызывается
    window.innerWidth = 1024
    slider.update()

    // Теперь вызываем updateOptions — именно здесь падает ошибка
    expect(() => {
      slider.updateOptions({
        slideMinSize: 130,
        gap: 15,
        peek: {
          before: 0,
          after: 80,
        },
      })
    }).not.toThrow()
  })

  it('стрелки должны оставаться функциональными после updateOptions', () => {
    // slideMinSize: 400 при ширине 800px — помещается только 2 слайда из 5, слайдер не заблокирован
    const slider = new Tvist(root, {
      slideMinSize: 400,
      gap: 0,
      arrows: {
        prev: prevBtn,
        next: nextBtn,
      },
      breakpoints: {
        768: {
          enabled: false,
        },
      },
    })

    expect(slider.activeIndex).toBe(0)
    expect(slider.engine.isLocked).toBe(false)

    slider.updateOptions({
      slideMinSize: 400,
      gap: 0,
    })

    // Стрелки должны работать после updateOptions
    expect(nextBtn.hasAttribute('disabled')).toBe(false)
    nextBtn.click()
    expect(slider.activeIndex).toBe(1)
  })
})
