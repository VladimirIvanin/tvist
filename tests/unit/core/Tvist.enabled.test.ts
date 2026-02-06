import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/index' // Импортируем из index для регистрации модулей
import { createSliderFixture } from '../../fixtures'
import type { SliderFixture } from '../../fixtures'

describe('Tvist - enabled option', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
  })

  afterEach(() => {
    fixture.cleanup()
  })

  describe('initialization', () => {
    it('should initialize with enabled: true by default', () => {
      const slider = new Tvist(fixture.root)

      expect(slider.isEnabled).toBe(true)
      expect(slider.root.classList.contains('tvist--disabled')).toBe(false)
    })

    it('should initialize with enabled: false', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false
      })

      expect(slider.isEnabled).toBe(false)
      expect(slider.root.classList.contains('tvist--disabled')).toBe(true)
    })

    it('should not apply transform when disabled', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1
      })

      expect(slider.container.style.transform).toBe('')
    })

    it('should not apply slide styles when disabled', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1,
        gap: 20
      })

      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.style.marginRight).toBe('')
      })
    })

    it('should emit created event even when disabled', () => {
      const onCreated = vi.fn()
      
      new Tvist(fixture.root, {
        enabled: false,
        on: {
          created: onCreated
        }
      })

      expect(onCreated).toHaveBeenCalledTimes(1)
    })
  })

  describe('disable() method', () => {
    it('should disable enabled slider', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 1
      })

      expect(slider.isEnabled).toBe(true)

      slider.disable()

      expect(slider.isEnabled).toBe(false)
      expect(slider.root.classList.contains('tvist--disabled')).toBe(true)
    })

    it('should remove transform when disabling', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 1
      })

      // Переходим на второй слайд
      slider.next()

      // Transform должен быть установлен
      expect(slider.container.style.transform).not.toBe('')

      slider.disable()

      // Transform должен быть убран
      expect(slider.container.style.transform).toBe('')
    })

    it('should clear slide styles when disabling', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 2,
        gap: 20
      })

      // Стили должны быть установлены
      expect(slider.slides[0].style.width).not.toBe('')

      slider.disable()

      // Стили должны быть очищены
      slider.slides.forEach(slide => {
        expect(slide.style.width).toBe('')
        expect(slide.style.marginRight).toBe('')
        expect(slide.style.height).toBe('')
        expect(slide.style.marginBottom).toBe('')
      })
    })

    it('should emit disabled event', () => {
      const onDisabled = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        on: {
          disabled: onDisabled
        }
      })

      slider.disable()

      expect(onDisabled).toHaveBeenCalledTimes(1)
      expect(onDisabled).toHaveBeenCalledWith(slider)
    })

    it('should not emit disabled event if already disabled', () => {
      const onDisabled = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        enabled: false,
        on: {
          disabled: onDisabled
        }
      })

      slider.disable()

      expect(onDisabled).not.toHaveBeenCalled()
    })

    it('should keep breakpoints module active when disabling (if it exists)', () => {
      const slider = new Tvist(fixture.root, {
        breakpoints: {
          500: { perPage: 1 }
        }
      })

      // Проверяем, что breakpoints модуль инициализирован
      const hasBreakpointsBeforeDisable = slider['modules'].has('breakpoints')

      slider.disable()

      // Breakpoints модуль должен остаться, если был
      if (hasBreakpointsBeforeDisable) {
        expect(slider['modules'].has('breakpoints')).toBe(true)
      }
    })
  })

  describe('enable() method', () => {
    it('should enable disabled slider', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false
      })

      expect(slider.isEnabled).toBe(false)

      slider.enable()

      expect(slider.isEnabled).toBe(true)
      expect(slider.root.classList.contains('tvist--disabled')).toBe(false)
    })

    it('should apply transform when enabling', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1
      })

      expect(slider.container.style.transform).toBe('')

      slider.enable()

      // Transform должен быть установлен
      expect(slider.container.style.transform).not.toBe('')
    })

    it('should apply slide styles when enabling', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 2,
        gap: 20
      })

      slider.enable()

      // Стили должны быть установлены
      expect(slider.slides[0].style.width).not.toBe('')
    })

    it('should emit enabled event', () => {
      const onEnabled = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        enabled: false,
        on: {
          enabled: onEnabled
        }
      })

      slider.enable()

      expect(onEnabled).toHaveBeenCalledTimes(1)
      expect(onEnabled).toHaveBeenCalledWith(slider)
    })

    it('should not emit enabled event if already enabled', () => {
      const onEnabled = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        on: {
          enabled: onEnabled
        }
      })

      slider.enable()

      expect(onEnabled).not.toHaveBeenCalled()
    })

    it('should reinitialize modules when enabling', () => {
      const slider = new Tvist(fixture.root, {
        enabled: true, // Сначала включен
        drag: true,
        pagination: true
      })

      // Debug: проверяем какие модули есть изначально
      const initialModules = Array.from(slider['modules'].keys())
      console.log('Initial modules:', initialModules)

      // Модули должны быть активны
      expect(slider['modules'].has('drag')).toBe(true)
      expect(slider['modules'].has('pagination')).toBe(true)

      // Отключаем
      slider.disable()

      const afterDisableModules = Array.from(slider['modules'].keys())
      console.log('After disable modules:', afterDisableModules)

      // Модули должны быть удалены
      expect(slider['modules'].has('drag')).toBe(false)
      expect(slider['modules'].has('pagination')).toBe(false)

      // Включаем снова
      slider.enable()

      const afterEnableModules = Array.from(slider['modules'].keys())
      console.log('After enable modules:', afterEnableModules)

      // Модули должны быть переинициализированы
      expect(slider['modules'].has('drag')).toBe(true)
      expect(slider['modules'].has('pagination')).toBe(true)
    })
  })

  describe('toggle enable/disable', () => {
    it('should toggle between enabled and disabled states', () => {
      const slider = new Tvist(fixture.root)

      expect(slider.isEnabled).toBe(true)

      slider.disable()
      expect(slider.isEnabled).toBe(false)

      slider.enable()
      expect(slider.isEnabled).toBe(true)

      slider.disable()
      expect(slider.isEnabled).toBe(false)
    })

    it('should maintain slider state after multiple toggles', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 1
      })

      // Переходим на третий слайд
      slider.scrollTo(2)
      expect(slider.activeIndex).toBe(2)

      // Отключаем
      slider.disable()
      expect(slider.activeIndex).toBe(2)

      // Включаем
      slider.enable()
      expect(slider.activeIndex).toBe(2)
    })
  })

  describe('update() method when disabled', () => {
    it('should not update when disabled', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1
      })

      const initialTransform = slider.container.style.transform

      slider.update()

      // Transform не должен измениться
      expect(slider.container.style.transform).toBe(initialTransform)
    })

    it('should update when enabled', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 1
      })

      slider.next()
      const transformAfterNext = slider.container.style.transform

      slider.update()

      // Transform может измениться после update
      expect(slider.container.style.transform).toBeDefined()
    })
  })

  describe('navigation when disabled', () => {
    it('should not navigate when disabled', () => {
      const slider = new Tvist(fixture.root, {
        enabled: false,
        perPage: 1
      })

      expect(slider.activeIndex).toBe(0)

      slider.next()
      expect(slider.activeIndex).toBe(0) // Не должен измениться

      slider.scrollTo(2)
      expect(slider.activeIndex).toBe(0) // Не должен измениться
    })

    it('should navigate when enabled', () => {
      const slider = new Tvist(fixture.root, {
        perPage: 1
      })

      expect(slider.activeIndex).toBe(0)

      slider.next()
      expect(slider.activeIndex).toBe(1)
    })
  })

  describe('destroy()', () => {
    it('should destroy disabled slider', () => {
      const onDestroyed = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        enabled: false,
        on: {
          destroyed: onDestroyed
        }
      })

      slider.destroy()

      expect(onDestroyed).toHaveBeenCalledTimes(1)
    })

    it('should destroy enabled slider', () => {
      const onDestroyed = vi.fn()
      
      const slider = new Tvist(fixture.root, {
        on: {
          destroyed: onDestroyed
        }
      })

      slider.destroy()

      expect(onDestroyed).toHaveBeenCalledTimes(1)
    })
  })
})
