/**
 * Тесты для ScrollbarModule
 * 
 * Проверяем:
 * 1. Создание DOM элементов скроллбара
 * 2. Обновление позиции при изменении слайда
 * 3. Клик по треку
 * 4. Drag & Drop
 * 5. Автоскрытие
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { ScrollbarModule } from '../../../src/modules/scrollbar/ScrollbarModule'
import {
  createSliderFixture,
  waitForAnimation,
  type SliderFixture,
} from '../../fixtures'

describe('ScrollbarModule', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('scrollbar', ScrollbarModule)

    // Создаём фикстуру
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 600,
      height: 400,
    })

    // Инициализируем слайдер с scrollbar
    slider = new Tvist(fixture.root, {
      scrollbar: true,
      speed: 300,
    })
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
    Tvist.unregisterModule('scrollbar')
  })

  describe('Initialization', () => {
    it('должен создавать DOM элементы скроллбара', () => {
      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl).toBeTruthy()
      
      const trackEl = scrollbarEl?.querySelector('.tvist__scrollbar-track')
      expect(trackEl).toBeTruthy()
      
      const thumbEl = scrollbarEl?.querySelector('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()
    })

    it('должен добавлять класс направления для горизонтального слайдера', () => {
      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--horizontal')).toBe(true)
    })

    it('должен добавлять класс направления для вертикального слайдера', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        scrollbar: true,
      })

      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--vertical')).toBe(true)
    })

    it('должен регистрироваться как модуль', () => {
      const module = slider.getModule<ScrollbarModule>('scrollbar')
      expect(module).toBeDefined()
      expect(module?.name).toBe('Scrollbar')
    })
  })

  describe('Position Update', () => {
    it('должен обновлять позицию ползунка при изменении слайда', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      // Начальная позиция
      const initialLeft = thumbEl?.style.left
      
      // Переходим к следующему слайду
      slider.next()
      await waitForAnimation(350)

      // Позиция должна измениться
      const newLeft = thumbEl?.style.left
      expect(newLeft).not.toBe(initialLeft)
    })

    it('должен рассчитывать размер ползунка на основе perPage', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        perPage: 2,
        scrollbar: true,
      })

      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const thumbWidth = parseFloat(thumbEl?.style.width || '0')

      // При perPage=2 и 5 слайдах, ползунок должен занимать 40% (2/5)
      expect(thumbWidth).toBeCloseTo(40, 0)
    })

    it('должен иметь правильное стартовое положение (0%)', () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      // На первом слайде позиция должна быть 0%
      const left = parseFloat(thumbEl?.style.left || '0')
      expect(left).toBe(0)
      
      // Transform не должен использоваться (или должен быть 'none')
      const transform = thumbEl?.style.transform
      expect(transform).toBe('none')
    })

    it('должен плавно перемещаться во время анимации перехода', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      // Запоминаем начальную позицию
      const initialLeft = parseFloat(thumbEl?.style.left || '0')

      // Начинаем переход
      slider.scrollTo(2)

      // Проверяем промежуточные позиции во время анимации
      const positions: number[] = []
      
      for (let i = 0; i < 5; i++) {
        await waitForAnimation(60)
        const currentLeft = parseFloat(thumbEl?.style.left || '0')
        positions.push(currentLeft)
      }

      // Ждём завершения анимации
      await waitForAnimation(100)
      const finalLeft = parseFloat(thumbEl?.style.left || '0')

      // Проверяем, что позиция плавно менялась
      expect(finalLeft).toBeGreaterThan(initialLeft)
      
      // Проверяем, что были промежуточные значения
      const uniquePositions = new Set(positions)
      expect(uniquePositions.size).toBeGreaterThan(1)
    })

    it('должен корректно позиционироваться на последнем слайде', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      // Переходим к последнему слайду
      slider.scrollTo(4)
      await waitForAnimation(350)

      // На последнем слайде ползунок должен быть в конце трека
      const thumbWidth = parseFloat(thumbEl?.style.width || '0')
      const left = parseFloat(thumbEl?.style.left || '0')
      
      // left + width должно быть примерно 100%
      expect(left + thumbWidth).toBeCloseTo(100, 1)
    })

    it('должен обновляться при вертикальном направлении', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        scrollbar: true,
      })

      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      // Проверяем стартовую позицию для вертикального направления
      const top = parseFloat(thumbEl?.style.top || '0')
      expect(top).toBe(0)
      
      const transform = thumbEl?.style.transform
      expect(transform).toBe('none')
    })
  })

  describe('Click Navigation', () => {
    it('должен переходить к слайду при клике по треку', async () => {
      const trackEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-track')
      expect(trackEl).toBeTruthy()
      expect(slider.activeIndex).toBe(0)

      // Мокаем getBoundingClientRect для happy-dom
      const mockRect = {
        left: 0,
        top: 0,
        width: 600,
        height: 20,
        right: 600,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }
      vi.spyOn(trackEl!, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect)

      // Симулируем клик в середине трека
      const clickEvent = new MouseEvent('click', {
        clientX: 300,
        clientY: 10,
        bubbles: true,
      })

      trackEl!.dispatchEvent(clickEvent)
      await waitForAnimation(350)

      // Должен перейти примерно к середине (слайд 2 или 3)
      expect(slider.activeIndex).toBeGreaterThan(0)
      expect(slider.activeIndex).toBeLessThan(5)
    })

    it('не должен переходить при клике по ползунку', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()
      expect(slider.activeIndex).toBe(0)

      // Кликаем по ползунку
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
      })
      Object.defineProperty(clickEvent, 'target', { value: thumbEl, writable: false })

      thumbEl!.dispatchEvent(clickEvent)
      await waitForAnimation(100)

      // Индекс не должен измениться
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('Drag & Drop', () => {
    it('должен начинать перетаскивание при mousedown на ползунке', () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      expect(thumbEl).toBeTruthy()

      const scrollbarEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(false)

      // Начинаем перетаскивание
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 50,
        bubbles: true,
      })
      thumbEl!.dispatchEvent(mouseDownEvent)

      // Класс dragging должен добавиться
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(true)
    })

    it('должен обновлять позицию при перетаскивании', () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const trackEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-track')
      expect(thumbEl).toBeTruthy()
      expect(trackEl).toBeTruthy()

      // Мокаем getBoundingClientRect для happy-dom
      const mockRect = {
        left: 0,
        top: 0,
        width: 600,
        height: 20,
        right: 600,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }
      vi.spyOn(trackEl!, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect)

      // Начинаем перетаскивание
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 0,
        clientY: 0,
        bubbles: true,
      })
      thumbEl!.dispatchEvent(mouseDownEvent)

      // Перемещаем мышь
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 0,
        bubbles: true,
      })
      document.dispatchEvent(mouseMoveEvent)

      // Позиция ползунка должна обновиться
      const thumbLeft = parseFloat(thumbEl?.style.left || '0')
      expect(thumbLeft).toBeGreaterThan(0)
    })

    it('должен завершать перетаскивание при mouseup', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const scrollbarEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar')
      expect(thumbEl).toBeTruthy()

      // Начинаем и завершаем перетаскивание
      thumbEl!.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 50,
        bubbles: true,
      }))
      
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(true)

      document.dispatchEvent(new MouseEvent('mouseup'))
      
      // Класс dragging должен удалиться
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(false)
    })

    it('должен делать snap к ближайшему слайду после завершения drag', async () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const trackEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-track')
      expect(thumbEl).toBeTruthy()
      expect(trackEl).toBeTruthy()

      // Мокаем getBoundingClientRect для happy-dom
      const mockRect = {
        left: 0,
        top: 0,
        width: 600,
        height: 20,
        right: 600,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }
      const rectSpy = vi.spyOn(trackEl!, 'getBoundingClientRect')
      rectSpy.mockReturnValue(mockRect as DOMRect)

      // Запоминаем начальный индекс
      expect(slider.activeIndex).toBe(0)

      // Начинаем перетаскивание с позиции 100px
      thumbEl!.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 0,
        bubbles: true,
      }))

      // Перемещаем вправо на значительное расстояние (400px)
      // Это должно переместить слайдер вправо примерно на 2-3 слайда
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 500,
        clientY: 0,
        bubbles: true,
      }))

      // Завершаем перетаскивание
      document.dispatchEvent(new MouseEvent('mouseup'))

      // Ждём snap анимации
      await waitForAnimation(350)

      // Должен сделать snap к слайду справа от стартового
      expect(slider.activeIndex).toBeGreaterThan(0)
    })

    it('должен поддерживать touch события', () => {
      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const scrollbarEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar')
      expect(thumbEl).toBeTruthy()

      // Touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 50 } as Touch,
        ],
        bubbles: true,
      })
      thumbEl!.dispatchEvent(touchStartEvent)

      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(true)

      // Touch end
      document.dispatchEvent(new TouchEvent('touchend'))
      
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(false)
    })

    it('должен отключать drag при draggable: false', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        scrollbar: {
          draggable: false,
        },
      })

      const thumbEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar-thumb')
      const scrollbarEl = slider.root.querySelector<HTMLElement>('.tvist__scrollbar')
      expect(thumbEl).toBeTruthy()

      // Пытаемся начать drag
      thumbEl!.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 50,
        bubbles: true,
      }))

      // Класс dragging не должен добавиться
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--dragging')).toBe(false)
    })
  })

  describe('Auto Hide', () => {
    it('должен добавлять класс hidden при hide: true', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        scrollbar: {
          hide: true,
        },
      })

      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--hidden')).toBe(true)
    })

    it('должен показывать скроллбар при наведении мыши', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        scrollbar: {
          hide: true,
        },
      })

      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--hidden')).toBe(true)

      // Наводим мышь
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true })
      slider.root.dispatchEvent(mouseEnterEvent)

      expect(scrollbarEl?.classList.contains('tvist__scrollbar--hidden')).toBe(false)
    })
  })

  describe('Configuration', () => {
    it('должен быть неактивным если scrollbar=false', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        scrollbar: false,
      })

      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl).toBeFalsy()
    })

    it('должен использовать кастомные CSS классы', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        scrollbar: {
          scrollbarClass: 'custom-scrollbar',
          trackClass: 'custom-track',
          thumbClass: 'custom-thumb',
        },
      })

      const scrollbarEl = slider.root.querySelector('.custom-scrollbar')
      expect(scrollbarEl).toBeTruthy()

      const trackEl = scrollbarEl?.querySelector('.custom-track')
      expect(trackEl).toBeTruthy()

      const thumbEl = scrollbarEl?.querySelector('.custom-thumb')
      expect(thumbEl).toBeTruthy()
    })

    it('должен обновлять опции при updateOptions', () => {
      const module = slider.getModule<ScrollbarModule>('scrollbar')
      expect(module).toBeDefined()

      slider.updateOptions({
        scrollbar: {
          hide: true,
          hideDelay: 2000,
        },
      })

      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl?.classList.contains('tvist__scrollbar--hidden')).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('должен удалять DOM элементы при destroy', () => {
      const scrollbarEl = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarEl).toBeTruthy()

      slider.destroy()

      const scrollbarElAfter = slider.root.querySelector('.tvist__scrollbar')
      expect(scrollbarElAfter).toBeFalsy()
    })
  })
})
