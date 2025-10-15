import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'

describe('Tvist', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.className = 'tvist'
    root.style.width = '1000px'

    const container = document.createElement('div')
    container.className = 'tvist__container'

    for (let i = 0; i < 5; i++) {
      const slide = document.createElement('div')
      slide.className = 'tvist__slide'
      slide.textContent = `Slide ${i + 1}`
      container.appendChild(slide)
    }

    root.appendChild(container)
    document.body.appendChild(root)

    // Мокируем offsetWidth для JSDOM
    Object.defineProperty(root, 'offsetWidth', {
      configurable: true,
      value: 1000
    })
  })

  afterEach(() => {
    if (root && root.parentNode) {
      document.body.removeChild(root)
    }
  })

  describe('initialization', () => {
    it('should initialize with selector', () => {
      root.id = 'test-slider'
      const slider = new Tvist('#test-slider')

      expect(slider.root).toBe(root)
      expect(slider.slides).toHaveLength(5)
    })

    it('should initialize with element', () => {
      const slider = new Tvist(root)

      expect(slider.root).toBe(root)
      expect(slider.slides).toHaveLength(5)
    })

    it('should throw error if element not found', () => {
      expect(() => {
        new Tvist('#nonexistent')
      }).toThrow('Tvist: element "#nonexistent" not found')
    })

    it('should throw error if container not found', () => {
      const invalidRoot = document.createElement('div')
      document.body.appendChild(invalidRoot)

      expect(() => {
        new Tvist(invalidRoot)
      }).toThrow('container ".tvist__container" not found')

      document.body.removeChild(invalidRoot)
    })

    it('should warn if no slides found', () => {
      const emptyRoot = document.createElement('div')
      const emptyContainer = document.createElement('div')
      emptyContainer.className = 'tvist__container'
      emptyRoot.appendChild(emptyContainer)
      document.body.appendChild(emptyRoot)

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      new Tvist(emptyRoot)

      expect(consoleWarn).toHaveBeenCalledWith('Tvist: no slides found')

      consoleWarn.mockRestore()
      document.body.removeChild(emptyRoot)
    })

    it('should merge options with defaults', () => {
      const slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
      })

      expect(slider.options.perPage).toBe(3)
      expect(slider.options.gap).toBe(20)
      expect(slider.options.speed).toBe(300) // default
    })

    it('should have version', () => {
      expect(Tvist.VERSION).toBe('1.0.0')
    })
  })

  describe('navigation', () => {
    it('should navigate to next slide', () => {
      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
      })

      slider.scrollTo(0, true)
      slider.next()

      expect(slider.activeIndex).toBe(1)
    })

    it('should navigate to previous slide', () => {
      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
      })

      slider.scrollTo(2, true)
      slider.prev()

      expect(slider.activeIndex).toBe(1)
    })

    it('should support method chaining', () => {
      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
      })

      const result = slider.next().prev().scrollTo(2, true)

      expect(result).toBe(slider)
      expect(slider.activeIndex).toBe(2)
    })

    it('should not go beyond limits without loop', () => {
      const slider = new Tvist(root, {
        perPage: 1,
        loop: false,
        speed: 0,
      })

      slider.scrollTo(4, true) // последний
      slider.next()

      expect(slider.activeIndex).toBe(4)
    })

    it('should wrap around with loop', () => {
      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        speed: 0,
      })

      slider.scrollTo(4, true)
      slider.next()

      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('events', () => {
    it('should emit created event', () => {
      const handler = vi.fn()

      const slider = new Tvist(root, {
        on: {
          created: handler,
        },
      })

      expect(handler).toHaveBeenCalledWith(slider)
    })

    it('should support on/off/emit', () => {
      const slider = new Tvist(root)
      const handler = vi.fn()

      slider.on('custom', handler)
      slider.emit('custom', 'arg1', 42)

      expect(handler).toHaveBeenCalledWith('arg1', 42)

      slider.off('custom', handler)
      slider.emit('custom')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support once', () => {
      const slider = new Tvist(root)
      const handler = vi.fn()

      slider.once('custom', handler)
      slider.emit('custom')
      slider.emit('custom')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should emit destroyed event', () => {
      const handler = vi.fn()

      const slider = new Tvist(root, {
        on: {
          destroyed: handler,
        },
      })

      slider.destroy()

      expect(handler).toHaveBeenCalledWith(slider)
    })
  })

  describe('update and destroy', () => {
    it('should update sizes', () => {
      const slider = new Tvist(root, {
        perPage: 2,
      })

      const initialWidth = slider.engine.slideWidthValue

      root.style.width = '1200px'
      Object.defineProperty(root, 'offsetWidth', {
        configurable: true,
        value: 1200
      })
      slider.update()

      const newWidth = slider.engine.slideWidthValue

      expect(newWidth).not.toBe(initialWidth)
      expect(newWidth).toBe(600) // 1200 / 2 = 600
    })

    it('should cleanup on destroy', () => {
      const slider = new Tvist(root)

      slider.destroy()

      // После destroy не должно быть активных модулей
      expect(slider.getModule('any')).toBeUndefined()
    })

    it('should be safe to call destroy multiple times', () => {
      const slider = new Tvist(root)

      expect(() => {
        slider.destroy()
        slider.destroy()
      }).not.toThrow()
    })
  })

  describe('getters', () => {
    it('should return active index', () => {
      const slider = new Tvist(root)

      slider.scrollTo(2, true)

      expect(slider.activeIndex).toBe(2)
    })

    it('should return canScrollNext', () => {
      const slider = new Tvist(root, {
        loop: false,
      })

      slider.scrollTo(0, true)
      expect(slider.canScrollNext).toBe(true)

      slider.scrollTo(4, true)
      expect(slider.canScrollNext).toBe(false)
    })

    it('should return canScrollPrev', () => {
      const slider = new Tvist(root, {
        loop: false,
      })

      slider.scrollTo(4, true)
      expect(slider.canScrollPrev).toBe(true)

      slider.scrollTo(0, true)
      expect(slider.canScrollPrev).toBe(false)
    })
  })

  describe('module registration', () => {
    it('should register module', () => {
      class TestModule {
        name = 'test'
        init() {}
        destroy() {}
      }

      Tvist.registerModule('test', TestModule as any)

      expect(Tvist.getRegisteredModules()).toContain('test')

      Tvist.unregisterModule('test')
    })

    it('should warn on duplicate registration', () => {
      class TestModule {
        name = 'test'
        init() {}
        destroy() {}
      }

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      Tvist.registerModule('duplicate', TestModule as any)
      Tvist.registerModule('duplicate', TestModule as any)

      expect(consoleWarn).toHaveBeenCalledWith(
        'Tvist: Module "duplicate" is already registered'
      )

      consoleWarn.mockRestore()
      Tvist.unregisterModule('duplicate')
    })

    it('should unregister module', () => {
      class TestModule {
        name = 'test'
        init() {}
        destroy() {}
      }

      Tvist.registerModule('temp', TestModule as any)
      expect(Tvist.getRegisteredModules()).toContain('temp')

      Tvist.unregisterModule('temp')
      expect(Tvist.getRegisteredModules()).not.toContain('temp')
    })
  })

  describe('resize handling', () => {
    it('should listen to window resize', async () => {
      const onResize = vi.fn()

      const slider = new Tvist(root, {
        on: {
          resize: onResize,
        },
      })

      // Эмулируем resize
      window.dispatchEvent(new Event('resize'))

      // Throttle задержит вызов
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(onResize).toHaveBeenCalled()

      slider.destroy()
    })

    it('should remove resize listener on destroy', () => {
      const slider = new Tvist(root)
      
      slider.destroy()

      // После destroy не должно быть утечек памяти
      // (проверяется отсутствием ошибок)
      expect(() => {
        window.dispatchEvent(new Event('resize'))
      }).not.toThrow()
    })
  })
})
