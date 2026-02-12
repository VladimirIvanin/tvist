/**
 * Тесты для VisibilityModule
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import '../../src/modules/visibility'
import '../../src/modules/autoplay'
import '../../src/modules/marquee'

describe('VisibilityModule', () => {
  let root: HTMLElement
  let slider: Tvist | null = null

  beforeEach(() => {
    // Создаём DOM структуру
    root = document.createElement('div')
    root.className = 'tvist-v1'
    root.innerHTML = `
      <div class="tvist-v1__container">
        <div class="tvist-v1__slide">Slide 1</div>
        <div class="tvist-v1__slide">Slide 2</div>
        <div class="tvist-v1__slide">Slide 3</div>
      </div>
    `
    document.body.appendChild(root)
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    document.body.innerHTML = ''
  })

  describe('Базовая функциональность', () => {
    it('должен создаваться с visibility: true', () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility')
      expect(visibilityModule).toBeDefined()
    })

    it('не должен создаваться с visibility: false', () => {
      slider = new Tvist(root, {
        visibility: false,
      })

      const visibilityModule = slider.modules.get('visibility')
      expect(visibilityModule).toBeUndefined()
    })

    it('должен предоставлять публичное API', () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      expect(api).toBeDefined()
      expect(typeof api.isVisible).toBe('function')
      expect(typeof api.check).toBe('function')
    })
  })

  describe('Отслеживание CSS видимости', () => {
    it('должен определять слайдер как видимый изначально', () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      expect(api.isVisible()).toBe(true)
    })

    it('должен определять слайдер как скрытый при display: none', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      // Скрываем слайдер
      root.style.display = 'none'

      // Ждём проверки CSS (интервал 500ms)
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(api.isVisible()).toBe(false)
    })

    it('должен определять слайдер как скрытый при visibility: hidden', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      // Скрываем слайдер
      root.style.visibility = 'hidden'

      // Ждём проверки CSS (интервал 500ms)
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(api.isVisible()).toBe(false)
    })

    it('должен определять слайдер как скрытый если родитель имеет display: none', async () => {
      const parent = document.createElement('div')
      parent.appendChild(root)
      document.body.appendChild(parent)

      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      // Скрываем родителя
      parent.style.display = 'none'

      // Ждём проверки CSS (интервал 500ms)
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(api.isVisible()).toBe(false)
    })

    it('должен возобновлять видимость при снятии display: none', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      const visibilityModule = slider.modules.get('visibility') as any
      const api = visibilityModule?.getVisibility()

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(api.isVisible()).toBe(false)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(api.isVisible()).toBe(true)
    })
  })

  describe('Интеграция с Autoplay', () => {
    it('должен приостанавливать autoplay при скрытии слайдера', async () => {
      slider = new Tvist(root, {
        autoplay: { delay: 1000 },
        visibility: true,
      })

      const autoplayModule = slider.modules.get('autoplay') as any
      const autoplay = autoplayModule?.getAutoplay()

      expect(autoplay.isRunning()).toBe(true)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(autoplay.isPaused()).toBe(true)
    })

    it('должен возобновлять autoplay при появлении слайдера', async () => {
      slider = new Tvist(root, {
        autoplay: { delay: 1000 },
        visibility: true,
      })

      const autoplayModule = slider.modules.get('autoplay') as any
      const autoplay = autoplayModule?.getAutoplay()

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(autoplay.isPaused()).toBe(true)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(autoplay.isRunning()).toBe(true)
    })

    it('не должен приостанавливать autoplay если pauseAutoplay: false', async () => {
      slider = new Tvist(root, {
        autoplay: { delay: 1000 },
        visibility: { pauseAutoplay: false },
      })

      const autoplayModule = slider.modules.get('autoplay') as any
      const autoplay = autoplayModule?.getAutoplay()

      expect(autoplay.isRunning()).toBe(true)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Autoplay должен продолжать работать
      expect(autoplay.isRunning()).toBe(true)
    })
  })

  describe('Интеграция с Marquee', () => {
    it('должен приостанавливать marquee при скрытии слайдера', async () => {
      slider = new Tvist(root, {
        marquee: { speed: 50 },
        visibility: true,
      })

      const marqueeModule = slider.modules.get('marquee') as any
      const marquee = marqueeModule?.getMarquee()

      expect(marquee.isRunning()).toBe(true)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(marquee.isPaused()).toBe(true)
    })

    it('должен возобновлять marquee при появлении слайдера', async () => {
      slider = new Tvist(root, {
        marquee: { speed: 50 },
        visibility: true,
      })

      const marqueeModule = slider.modules.get('marquee') as any
      const marquee = marqueeModule?.getMarquee()

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(marquee.isPaused()).toBe(true)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(marquee.isRunning()).toBe(true)
    })

    it('не должен приостанавливать marquee если pauseMarquee: false', async () => {
      slider = new Tvist(root, {
        marquee: { speed: 50 },
        visibility: { pauseMarquee: false },
      })

      const marqueeModule = slider.modules.get('marquee') as any
      const marquee = marqueeModule?.getMarquee()

      expect(marquee.isRunning()).toBe(true)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Marquee должен продолжать работать
      expect(marquee.isRunning()).toBe(true)
    })
  })

  describe('События', () => {
    it('должен эмитить sliderHidden при скрытии', async () => {
      const onHidden = vi.fn()

      slider = new Tvist(root, {
        visibility: true,
        on: {
          sliderHidden: onHidden,
        },
      })

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(onHidden).toHaveBeenCalled()
    })

    it('должен эмитить sliderVisible при появлении', async () => {
      const onVisible = vi.fn()

      slider = new Tvist(root, {
        visibility: true,
        on: {
          sliderVisible: onVisible,
        },
      })

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(onVisible).toHaveBeenCalled()
    })
  })

  describe('Обновление опций', () => {
    it('должен включаться при updateOptions({ visibility: true })', async () => {
      slider = new Tvist(root, {
        visibility: false,
      })

      expect(slider.modules.get('visibility')).toBeUndefined()

      slider.updateOptions({ visibility: true })

      expect(slider.modules.get('visibility')).toBeDefined()
    })

    it('должен выключаться при updateOptions({ visibility: false })', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      expect(slider.modules.get('visibility')).toBeDefined()

      slider.updateOptions({ visibility: false })

      expect(slider.modules.get('visibility')).toBeUndefined()
    })
  })
})
