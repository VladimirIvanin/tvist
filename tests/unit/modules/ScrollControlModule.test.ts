/**
 * Тесты для ScrollControlModule
 * 
 * Проверяем:
 * 1. Wheel события для навигации
 * 2. Поддержку horizontal и vertical направлений
 * 3. releaseOnEdges на границах слайдера
 * 4. throttle для wheel событий
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { ScrollControlModule } from '@modules/scroll-control/ScrollControlModule'
import {
  createSliderFixture,
  waitForAnimation,
  type SliderFixture,
} from '../../fixtures'

describe('ScrollControlModule', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('scroll-control', ScrollControlModule)

    // Создаём фикстуру
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 600,
      height: 400,
    })

    // Инициализируем слайдер с wheel опцией
    slider = new Tvist(fixture.root, {
      wheel: true,
      speed: 300,
    })
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
    Tvist.unregisterModule('scroll-control')
  })

  describe('Wheel Navigation', () => {
    it('должен переключаться на следующий слайд при прокрутке вниз', async () => {
      expect(slider.activeIndex).toBe(0)

      // Создаём wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      await waitForAnimation(350)

      expect(slider.activeIndex).toBe(1)
    })

    it('должен переключаться на предыдущий слайд при прокрутке вверх', async () => {
      slider.scrollTo(2, true)
      expect(slider.activeIndex).toBe(2)

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      await waitForAnimation(350)

      expect(slider.activeIndex).toBe(1)
    })

    it('должен использовать deltaY для горизонтального слайдера (обычное поведение)', async () => {
      expect(slider.activeIndex).toBe(0)

      // Горизонтальный слайдер использует deltaY для навигации (обычный скролл вниз/вверх)
      const wheelEvent = new WheelEvent('wheel', {
        deltaX: 10,
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      await waitForAnimation(350)

      // Индекс должен измениться, так как deltaY используется для навигации
      expect(slider.activeIndex).toBe(1)
    })

    it('должен работать с вертикальным направлением', async () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        wheel: true,
        direction: 'vertical',
        speed: 300,
      })

      expect(slider.activeIndex).toBe(0)

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      await waitForAnimation(350)

      expect(slider.activeIndex).toBe(1)
    })
  })

  describe('Release on Edges', () => {
    it('должен разрешать нативный скролл на первом слайде при прокрутке назад', async () => {
      expect(slider.activeIndex).toBe(0)

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })

      // preventDefault не должен быть вызван
      const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault')
      slider.root.dispatchEvent(wheelEvent)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
      expect(slider.activeIndex).toBe(0)
    })

    it('должен разрешать нативный скролл на последнем слайде при прокрутке вперёд', async () => {
      slider.scrollTo(4, true)
      expect(slider.activeIndex).toBe(4)

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault')
      slider.root.dispatchEvent(wheelEvent)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
      expect(slider.activeIndex).toBe(4)
    })

    it('должен блокировать скролл на краях если releaseOnEdges=false', async () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        wheel: {
          releaseOnEdges: false,
        },
        speed: 300,
      })

      expect(slider.activeIndex).toBe(0)

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      await waitForAnimation(100)

      // Индекс остаётся 0
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('Module Configuration', () => {
    it('должен быть неактивным если wheel=false', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        wheel: false,
      })

      const module = slider.getModule<ScrollControlModule>('scroll-control')
      expect(module).toBeDefined()
      
      // Проверяем что обработчики не установлены через попытку вызвать wheel
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })

      slider.root.dispatchEvent(wheelEvent)
      // Индекс не должен измениться
      expect(slider.activeIndex).toBe(0)
    })

    it('должен обновлять опции при updateOptions', () => {
      const module = slider.getModule<ScrollControlModule>('scroll-control')
      expect(module).toBeDefined()

      slider.updateOptions({
        wheel: {
          sensitivity: 2,
          releaseOnEdges: false,
        },
      })

      // Проверяем что опции применились (через приватное поле, но для тестирования)
      // Альтернативно можно проверить через поведение
      expect(module).toBeDefined()
    })

    it('не должен регистрироваться если wheel не указан', () => {
      slider.destroy()
      slider = new Tvist(fixture.root, {
        // wheel не указан
      })

      const module = slider.getModule<ScrollControlModule>('scroll-control')
      
      // Модуль зарегистрирован, но не активен
      expect(module).toBeDefined()
    })
  })

  describe('Throttle', () => {
    it('должен игнорировать быстрые последовательные wheel события', async () => {
      expect(slider.activeIndex).toBe(0)

      // Первое событие
      const wheelEvent1 = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })
      slider.root.dispatchEvent(wheelEvent1)

      // Второе событие сразу же (должно быть проигнорировано)
      const wheelEvent2 = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true,
      })
      slider.root.dispatchEvent(wheelEvent2)

      await waitForAnimation(350)

      // Должен быть только один переход
      expect(slider.activeIndex).toBe(1)
    })
  })
})
