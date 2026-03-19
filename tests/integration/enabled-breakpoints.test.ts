import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/index'
import { createSliderFixture, resizeSlider } from '../fixtures'
import type { SliderFixture } from '../fixtures'

describe('Tvist - enabled with breakpoints', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    // Создаём фикстуру с шириной 1000px (десктоп)
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
  })

  afterEach(() => {
    fixture.cleanup()
  })

  describe('enabled in breakpoints', () => {
    it('should start disabled on desktop and enable on mobile breakpoint', () => {
      const onEnabled = vi.fn()
      const onDisabled = vi.fn()
      const onBreakpoint = vi.fn()

      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1,
        gap: 16,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            enabled: true,
            perPage: 1
          }
        },
        on: {
          enabled: onEnabled,
          disabled: onDisabled,
          breakpoint: onBreakpoint
        }
      })

      // Изначально должен быть отключен (ширина 1000px > 767px)
      expect(slider.isEnabled).toBe(false)
      expect(slider.root.classList.contains(TVIST_CLASSES.disabled)).toBe(true)

      // Изменяем ширину на мобильную
      resizeSlider(fixture.root, 500)
      
      // Триггерим resize вручную для теста
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Теперь должен быть включен
      expect(slider.isEnabled).toBe(true)
      expect(slider.root.classList.contains(TVIST_CLASSES.disabled)).toBe(false)
      expect(onEnabled).toHaveBeenCalled()
      expect(onBreakpoint).toHaveBeenCalledWith(767)
    })

    it('should start enabled and disable on larger screens', () => {
      // Создаём фикстуру с мобильной шириной
      const mobileFixture = createSliderFixture({ slidesCount: 6, width: 500 })

      const onEnabled = vi.fn()
      const onDisabled = vi.fn()

      const slider = new Tvist(mobileFixture.root, {
        enabled: false, // По умолчанию отключен
        perPage: 1,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            enabled: true // Включен на мобильных
          }
        },
        on: {
          enabled: onEnabled,
          disabled: onDisabled
        }
      })

      // На мобильных должен быть включен
      expect(slider.isEnabled).toBe(true)

      // Изменяем ширину на десктопную
      resizeSlider(mobileFixture.root, 1000)
      
      // Триггерим resize
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Теперь должен быть отключен
      expect(slider.isEnabled).toBe(false)
      expect(onDisabled).toHaveBeenCalled()

      mobileFixture.cleanup()
    })

    it('should handle multiple breakpoints with different enabled states', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true, // По умолчанию включен
        perPage: 3,
        breakpointsBase: 'container',
        breakpoints: {
          1024: {
            enabled: true,
            perPage: 2
          },
          767: {
            enabled: false // Отключен на планшетах
          },
          480: {
            enabled: true, // Включен на мобильных
            perPage: 1
          }
        }
      })

      // Десктоп (1000px) - включен
      expect(slider.isEnabled).toBe(true)

      // Планшет (700px) - должен отключиться
      resizeSlider(fixture.root, 700)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)

      // Мобильный (400px) - должен включиться
      resizeSlider(fixture.root, 400)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(true)
    })
  })

  describe('breakpoints module always active', () => {
    it('should keep breakpoints module active when slider is disabled', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        breakpointsBase: 'container',
        breakpoints: {
          500: { perPage: 1 }
        }
      })

      // Breakpoints модуль должен быть активен даже при disabled
      expect(slider['modules'].has('breakpoints')).toBe(true)
    })

    it('should respond to breakpoint changes even when disabled', () => {
      const onBreakpoint = vi.fn()

      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 3,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            perPage: 1
          }
        },
        on: {
          breakpoint: onBreakpoint
        }
      })

      // Изменяем ширину
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Событие breakpoint должно сработать
      expect(onBreakpoint).toHaveBeenCalledWith(767)
    })
  })

  describe('enabled with other breakpoint options', () => {
    it('should apply other options when enabling via breakpoint', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 3,
        gap: 0,
        drag: false,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            enabled: true,
            perPage: 1,
            gap: 16,
            drag: true
          }
        }
      })

      expect(slider.isEnabled).toBe(false)
      expect(slider.options.perPage).toBe(3)

      // Переключаемся на мобильный
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(true)
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(16)
      expect(slider.options.drag).toBe(true)
    })

    it('should restore original options when leaving breakpoint', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 3,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            enabled: false,
            perPage: 1,
            gap: 0
          }
        }
      })

      // Изначально
      expect(slider.isEnabled).toBe(true)
      expect(slider.options.perPage).toBe(3)
      expect(slider.options.gap).toBe(20)

      // Переключаемся на мобильный
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(false)
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)

      // Возвращаемся на десктоп
      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(true)
      expect(slider.options.perPage).toBe(3)
      expect(slider.options.gap).toBe(20)
    })
  })

  describe('slide styles and classes cleanup on resize back and forth', () => {
    it('should clear slide width and state classes after desktop→mobile→desktop resize cycle', () => {
      // Десктоп: включён с perPage=2
      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 2,
        gap: 16,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            enabled: false
          }
        }
      })

      const SLIDE_ACTIVE = 'tvist-v1__slide--active'
      const SLIDE_VISIBLE = 'tvist-v1__slide--visible'
      const SLIDE_NEXT = 'tvist-v1__slide--next'
      const SLIDE_PREV = 'tvist-v1__slide--prev'

      // Десктоп — включён, стили и классы есть
      expect(slider.isEnabled).toBe(true)
      expect(slider.slides[0].style.width).not.toBe('')
      expect(slider.slides[0].classList.contains(SLIDE_ACTIVE)).toBe(true)

      // Мобильный — отключён
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)

      // Стили width должны быть очищены
      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.style.marginRight).toBe('')
      })

      // Классы состояний должны быть очищены
      slider.slides.forEach(slide => {
        expect(slide.classList.contains(SLIDE_ACTIVE)).toBe(false)
        expect(slide.classList.contains(SLIDE_VISIBLE)).toBe(false)
        expect(slide.classList.contains(SLIDE_NEXT)).toBe(false)
        expect(slide.classList.contains(SLIDE_PREV)).toBe(false)
      })

      // Возвращаемся на десктоп — включён снова
      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(true)

      // Снова на мобильный — классы снова должны очищаться
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)

      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.classList.contains(SLIDE_ACTIVE)).toBe(false)
        expect(slide.classList.contains(SLIDE_VISIBLE)).toBe(false)
      })
    })

    it('should clear transform on container when disabling via breakpoint', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 1,
        breakpointsBase: 'container',
        breakpoints: {
          768: { enabled: false }
        }
      })

      // Переходим на второй слайд — transform выставлен
      slider.next()
      expect(slider.container.style.transform).not.toBe('')

      // Мобильный — transform должен сброситься
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)
      expect(slider.container.style.transform).toBe('')

      // Снова десктоп → мобильный
      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      slider.next()

      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)
      expect(slider.container.style.transform).toBe('')
    })
  })

  describe('slide styles cleanup when disabling via breakpoint', () => {
    it('should clear slide width styles when breakpoint sets enabled: false', () => {
      // Слайдер включён на десктопе с peek и perPage
      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 2,
        gap: 16,
        peek: { before: 0, after: 40 },
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            enabled: false
          }
        }
      })

      // На десктопе слайдер включён — стили width должны быть применены
      expect(slider.isEnabled).toBe(true)
      expect(slider.slides[0].style.width).not.toBe('')

      // Переходим на мобильный breakpoint с enabled: false
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Слайдер должен быть отключён
      expect(slider.isEnabled).toBe(false)

      // Стили width на слайдах должны быть очищены (не аффектить вёрстку)
      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.style.height).toBe('')
        expect(slide.style.marginRight).toBe('')
        expect(slide.style.marginBottom).toBe('')
      })
    })

    it('should clear slide width styles when breakpoint sets enabled: false with peek options', () => {
      const mobile_right_padding = 20

      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 3,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            peek: {
              before: 5,
              after: mobile_right_padding
            },
            enabled: false
          }
        }
      })

      // На десктопе стили применены
      expect(slider.isEnabled).toBe(true)
      expect(slider.slides[0].style.width).not.toBe('')

      // Переходим на мобильный
      resizeSlider(fixture.root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(false)

      // Стили должны быть очищены
      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.style.marginRight).toBe('')
      })
    })

    it('should restore slide styles when re-enabling via breakpoint after disable', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true,
        perPage: 2,
        gap: 16,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            enabled: false
          }
        }
      })

      // Десктоп — включён, стили есть
      expect(slider.isEnabled).toBe(true)
      expect(slider.slides[0].style.width).not.toBe('')

      // Мобильный — отключён, стили очищены
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)
      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
      })

      // Возвращаемся на десктоп — включён, стили восстановлены
      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(true)
      expect(slider.slides[0].style.width).not.toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle enabled: undefined in breakpoint (should not change state)', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true,
        breakpointsBase: 'container',
        breakpoints: {
          767: {
            perPage: 1
            // enabled не указан
          }
        }
      })

      expect(slider.isEnabled).toBe(true)

      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Должен остаться включенным
      expect(slider.isEnabled).toBe(true)
    })

    it('should handle rapid breakpoint changes', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        breakpointsBase: 'container',
        breakpoints: {
          767: { enabled: true },
          480: { enabled: false }
        }
      })

      // Быстрые изменения ширины
      resizeSlider(fixture.root, 500)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(true)

      resizeSlider(fixture.root, 400)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)

      resizeSlider(fixture.root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(true)

      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)
    })

    it('should not break when toggling enabled manually during breakpoint changes', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        breakpointsBase: 'container',
        breakpoints: {
          767: { enabled: true }
        }
      })

      // Вручную включаем
      slider.enable()
      expect(slider.isEnabled).toBe(true)

      // Breakpoint пытается отключить
      resizeSlider(fixture.root, 1000)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider.isEnabled).toBe(false)

      // Вручную включаем снова
      slider.enable()
      expect(slider.isEnabled).toBe(true)
    })
  })
})
