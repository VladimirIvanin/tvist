import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../src/index'
import { createSliderFixture } from '../fixtures'
import type { SliderFixture } from '../fixtures'

describe('Window-based breakpoints (matchMedia)', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    // Используем fake timers для контроля throttle
    vi.useFakeTimers()
    
    // Устанавливаем десктопную ширину окна
    window.innerWidth = 1200
    
    // Создаём фикстуру
    fixture = createSliderFixture({ slidesCount: 6, width: 1200 })
  })

  afterEach(() => {
    fixture.cleanup()
    // Возвращаем дефолтное значение
    window.innerWidth = 1024
    
    // Восстанавливаем реальные таймеры
    vi.useRealTimers()
  })

  it('should use window.innerWidth for breakpoints by default', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      // НЕ указываем breakpointsBase - по умолчанию 'window'
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // На десктопе (1200px) слайдер отключен
    expect(window.innerWidth).toBe(1200)
    expect(slider.isEnabled).toBe(false)

    // Сужаем окно до 800px
    window.innerWidth = 800
    vi.advanceTimersByTime(50) // Ждем throttle (50ms)

    // Слайдер должен автоматически включиться через matchMedia
    expect(slider.isEnabled).toBe(true)

    // Расширяем обратно
    window.innerWidth = 1200
    vi.advanceTimersByTime(50) // Ждем throttle (50ms)

    // Слайдер должен автоматически отключиться
    expect(slider.isEnabled).toBe(false)
  })

  it('should handle multiple window resize cycles', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Начальное состояние
    expect(slider.isEnabled).toBe(false)

    // Цикл 1
    window.innerWidth = 800
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)

    window.innerWidth = 1200
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(false)

    // Цикл 2
    window.innerWidth = 600
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)

    window.innerWidth = 1100
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(false)

    // Цикл 3
    window.innerWidth = 900
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)

    window.innerWidth = 1200
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(false)
  })

  it('should emit events when window size changes', () => {
    const events: string[] = []

    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
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

    events.length = 0

    // Сужаем окно
    window.innerWidth = 800
    vi.advanceTimersByTime(50)

    expect(events).toContain('breakpoint:999')
    expect(events).toContain('enabled')

    events.length = 0

    // Расширяем окно
    window.innerWidth = 1200
    vi.advanceTimersByTime(50)

    expect(events).toContain('breakpoint:null')
    expect(events).toContain('disabled')
  })

  it('should work with multiple breakpoints', () => {
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 3,
      breakpoints: {
        1024: {
          enabled: true,
          perPage: 2
        },
        767: {
          enabled: false
        },
        480: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Десктоп (1200px) - включен, perPage: 3
    expect(slider.isEnabled).toBe(true)
    expect(slider.options.perPage).toBe(3)

    // Планшет (900px) - включен, perPage: 2
    window.innerWidth = 900
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)
    expect(slider.options.perPage).toBe(2)

    // Планшет (700px) - отключен
    window.innerWidth = 700
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(false)

    // Мобильный (400px) - включен, perPage: 1
    window.innerWidth = 400
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)
    expect(slider.options.perPage).toBe(1)
  })

  it('should work when starting with narrow window', () => {
    // Устанавливаем узкое окно ДО создания слайдера
    window.innerWidth = 600

    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Должен сразу быть включён
    expect(slider.isEnabled).toBe(true)

    // Расширяем
    window.innerWidth = 1200
    vi.advanceTimersByTime(50)

    // Должен отключиться
    expect(slider.isEnabled).toBe(false)
  })

  it('should handle edge case: exactly at breakpoint', () => {
    const slider = new Tvist(fixture.root, {
      enabled: false,
      perPage: 1,
      breakpoints: {
        999: {
          enabled: true,
          perPage: 1
        }
      }
    })

    // Ровно на брейкпоинте (999px) - должен включиться
    window.innerWidth = 999
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)

    // На 1px больше (1000px) - должен отключиться
    window.innerWidth = 1000
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(false)

    // На 1px меньше (998px) - должен включиться
    window.innerWidth = 998
    vi.advanceTimersByTime(50)
    expect(slider.isEnabled).toBe(true)
  })
})
