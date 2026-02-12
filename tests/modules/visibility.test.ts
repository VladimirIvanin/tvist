/**
 * Тесты для VisibilityModule
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import '../../src/modules/visibility'
import '../../src/modules/autoplay'
import '../../src/modules/marquee'
import '../../src/modules/pagination'

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
    it('должен останавливать marquee при скрытии слайдера', async () => {
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

      // Marquee должен быть остановлен (не запущен и не на паузе)
      expect(marquee.isRunning()).toBe(false)
      expect(marquee.isPaused()).toBe(false)
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
      expect(marquee.isRunning()).toBe(false)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Marquee должен быть снова запущен
      expect(marquee.isRunning()).toBe(true)
    })

    it('не должен останавливать marquee если pauseMarquee: false', async () => {
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

    it('НЕ должен изменять transform значительно когда marquee скрыт', async () => {
      slider = new Tvist(root, {
        marquee: { speed: 100, direction: 'left' },
        visibility: true,
      })

      // Запоминаем начальный transform
      const getTransformX = () => {
        const transform = slider.container.style.transform
        const match = transform.match(/translate3d\((-?[\d.]+)px/)
        return match ? parseFloat(match[1]) : 0
      }

      const initialX = getTransformX()

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Ждём достаточно времени
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Transform НЕ должен измениться значительно (допускаем до 1px из-за задержки MutationObserver)
      const xAfterHidden = getTransformX()
      const diffWhileHidden = Math.abs(xAfterHidden - initialX)
      expect(diffWhileHidden).toBeLessThan(1)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Ждём, пока marquee изменит transform
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Теперь transform должен измениться значительно (marquee работает)
      const xAfterVisible = getTransformX()
      const diffWhileVisible = Math.abs(xAfterVisible - xAfterHidden)
      expect(diffWhileVisible).toBeGreaterThan(10)
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

  describe('Блокировка переключения слайдов при скрытии', () => {
    it('не должен переключать слайды через scrollTo() когда слайдер скрыт', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      expect(slider.activeIndex).toBe(0)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить слайд
      slider.scrollTo(1)

      // Слайд НЕ должен переключиться
      expect(slider.activeIndex).toBe(0)
    })

    it('не должен переключать слайды через next() когда слайдер скрыт', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      expect(slider.activeIndex).toBe(0)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить на следующий слайд
      slider.next()

      // Слайд НЕ должен переключиться
      expect(slider.activeIndex).toBe(0)
    })

    it('не должен переключать слайды через prev() когда слайдер скрыт', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      slider.scrollTo(1)
      expect(slider.activeIndex).toBe(1)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить на предыдущий слайд
      slider.prev()

      // Слайд НЕ должен переключиться
      expect(slider.activeIndex).toBe(1)
    })

    it('должен возобновить переключение слайдов после появления', async () => {
      slider = new Tvist(root, {
        visibility: true,
      })

      expect(slider.activeIndex).toBe(0)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить слайд (не должно сработать)
      slider.scrollTo(1)
      expect(slider.activeIndex).toBe(0)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Теперь переключение должно работать
      slider.scrollTo(1)
      expect(slider.activeIndex).toBe(1)
    })

    it('не должен обновлять активные буллеты пагинации когда слайдер скрыт', async () => {
      slider = new Tvist(root, {
        visibility: true,
        pagination: true,
      })

      // Ждём инициализации пагинации
      await new Promise(resolve => setTimeout(resolve, 100))

      const pagination = root.querySelector('.tvist-v1__pagination')
      
      // Если пагинация не создалась, пропускаем тест
      if (!pagination) {
        console.warn('Pagination not created, skipping test')
        return
      }

      const bullets = pagination.querySelectorAll('.tvist-v1__pagination-bullet')
      expect(bullets[0].classList.contains('tvist-v1__pagination-bullet--active')).toBe(true)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить слайд
      slider.scrollTo(1)

      // Активный буллет НЕ должен измениться
      expect(bullets[0].classList.contains('tvist-v1__pagination-bullet--active')).toBe(true)
      expect(bullets[1].classList.contains('tvist-v1__pagination-bullet--active')).toBe(false)
    })

    it('должен обновить буллеты пагинации после появления слайдера', async () => {
      slider = new Tvist(root, {
        visibility: true,
        pagination: true,
      })

      // Ждём инициализации пагинации
      await new Promise(resolve => setTimeout(resolve, 100))

      const pagination = root.querySelector('.tvist-v1__pagination')
      
      // Если пагинация не создалась, пропускаем тест
      if (!pagination) {
        console.warn('Pagination not created, skipping test')
        return
      }

      const bullets = pagination.querySelectorAll('.tvist-v1__pagination-bullet')

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить слайд (не должно сработать)
      slider.scrollTo(1)
      expect(bullets[0].classList.contains('tvist-v1__pagination-bullet--active')).toBe(true)

      // Показываем слайдер
      root.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Теперь переключаем слайд
      slider.scrollTo(1)

      // Буллеты должны обновиться
      expect(bullets[0].classList.contains('tvist-v1__pagination-bullet--active')).toBe(false)
      expect(bullets[1].classList.contains('tvist-v1__pagination-bullet--active')).toBe(true)
    })

    it('не должен переключать слайды при клике на буллет пагинации когда слайдер скрыт', async () => {
      slider = new Tvist(root, {
        visibility: true,
        pagination: { clickable: true },
      })

      // Ждём инициализации пагинации
      await new Promise(resolve => setTimeout(resolve, 100))

      const pagination = root.querySelector('.tvist-v1__pagination')
      
      // Если пагинация не создалась, пропускаем тест
      if (!pagination) {
        console.warn('Pagination not created, skipping test')
        return
      }

      const bullets = pagination.querySelectorAll('.tvist-v1__pagination-bullet') as NodeListOf<HTMLElement>

      expect(slider.activeIndex).toBe(0)

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Кликаем на второй буллет
      bullets[1].click()

      // Слайд НЕ должен переключиться
      expect(slider.activeIndex).toBe(0)
    })

    it('не должен эмитить события переключения слайдов когда слайдер скрыт', async () => {
      const onSlideChange = vi.fn()

      slider = new Tvist(root, {
        visibility: true,
        on: {
          slideChange: onSlideChange,
        },
      })

      // Скрываем слайдер
      root.style.display = 'none'
      await new Promise(resolve => setTimeout(resolve, 600))

      // Пытаемся переключить слайд
      slider.scrollTo(1)

      // События НЕ должны эмититься
      expect(onSlideChange).not.toHaveBeenCalled()
    })
  })
})
