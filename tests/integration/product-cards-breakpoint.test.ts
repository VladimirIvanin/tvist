import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/index'
import { createSliderFixture, resizeSlider } from '../fixtures'
import type { SliderFixture } from '../fixtures'

describe('Product Cards Example - breakpoint switching', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    // Создаём фикстуру с десктопной шириной (1200px)
    fixture = createSliderFixture({ slidesCount: 6, width: 1200 })
  })

  // ПРИМЕЧАНИЕ: В этих тестах используется breakpointsBase: 'container'
  // потому что в тестовой среде мы изменяем размер контейнера, а не окна браузера.
  // В реальном браузере по умолчанию используется window.innerWidth.

  afterEach(() => {
    fixture.cleanup()
  })

  it('should switch from grid (disabled) to slider (enabled) when narrowing screen', () => {
    // Инициализируем слайдер как в примере Product Cards
    const slider = new Tvist(fixture.root, {
      // По умолчанию (десктоп) - слайдер отключен
      enabled: false,
      perPage: 1,
      gap: 16,
      speed: 300,
      drag: true,
      breakpointsBase: 'container', // Используем размер контейнера для тестов
      pagination: {
        type: 'bullets',
        clickable: true
      },
      // Breakpoints: на мобильных включаем слайдер
      breakpoints: {
        999: {
          enabled: true,  // Включаем слайдер на экранах ≤999px
          perPage: 1,
          gap: 16
        }
      }
    })

    // Шаг 1: На десктопе (1200px) слайдер должен быть отключен
    expect(slider.isEnabled).toBe(false)
    expect(fixture.root.classList.contains('tvist-v1--disabled')).toBe(true)

    // Шаг 2: Сужаем экран до 800px (меньше 999px)
    resizeSlider(fixture.root, 800)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    // Слайдер должен включиться
    expect(slider.isEnabled).toBe(true)
    expect(fixture.root.classList.contains('tvist-v1--disabled')).toBe(false)

    // Шаг 3: Расширяем экран обратно до 1200px (больше 999px)
    resizeSlider(fixture.root, 1200)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    // Слайдер должен отключиться обратно
    expect(slider.isEnabled).toBe(false)
    expect(fixture.root.classList.contains('tvist-v1--disabled')).toBe(true)
  })

  it('should handle multiple resize cycles correctly', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      gap: 16,
      breakpointsBase: 'container',
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1,
          gap: 16
        }
      }
    })

    // Начальное состояние: десктоп (1200px) - отключен
    expect(slider.isEnabled).toBe(false)

    // Цикл 1: Сужаем -> Расширяем
    resizeSlider(fixture.root, 800)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(true)

    resizeSlider(fixture.root, 1200)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(false)

    // Цикл 2: Сужаем -> Расширяем снова
    resizeSlider(fixture.root, 600)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(true)

    resizeSlider(fixture.root, 1100)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(false)

    // Цикл 3: Ещё раз
    resizeSlider(fixture.root, 900)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(true)

    resizeSlider(fixture.root, 1200)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(false)
  })

  it('should emit correct events during resize', () => {
    const events: string[] = []

    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpointsBase: 'container',
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      },
      on: {
        enabled: () => events.push('enabled'),
        disabled: () => events.push('disabled'),
        breakpoint: (bp) => events.push(`breakpoint:${bp}`)
      }
    })

    // Очищаем события от инициализации
    events.length = 0

    // Сужаем экран
    resizeSlider(fixture.root, 800)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    expect(events).toContain('breakpoint:999')
    expect(events).toContain('enabled')

    // Очищаем события
    events.length = 0

    // Расширяем экран
    resizeSlider(fixture.root, 1200)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    expect(events).toContain('breakpoint:null')
    expect(events).toContain('disabled')
  })

  it('should maintain correct DOM structure after multiple resizes', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpointsBase: 'container',
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Проверяем начальное состояние DOM
    const container = fixture.root.querySelector('.tvist-v1__container') as HTMLElement
    const slides = fixture.root.querySelectorAll('.tvist-v1__slide')

    expect(container).toBeTruthy()
    expect(slides.length).toBe(6)

    // Несколько циклов resize
    for (let i = 0; i < 3; i++) {
      // Сужаем
      resizeSlider(fixture.root, 800)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      
      // Проверяем, что DOM не сломался
      expect(fixture.root.querySelectorAll('.tvist-v1__slide').length).toBe(6)
      expect(slider.isEnabled).toBe(true)

      // Расширяем
      resizeSlider(fixture.root, 1200)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      
      // Проверяем, что DOM не сломался
      expect(fixture.root.querySelectorAll('.tvist-v1__slide').length).toBe(6)
      expect(slider.isEnabled).toBe(false)
    }
  })

  it('should work with container-based breakpoints', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpointsBase: 'container', // Используем размер контейнера, а не окна
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Начальное состояние
    expect(slider.isEnabled).toBe(false)

    // Изменяем размер контейнера
    resizeSlider(fixture.root, 800)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(true)

    // Возвращаем обратно
    resizeSlider(fixture.root, 1200)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(slider.isEnabled).toBe(false)
  })
})
