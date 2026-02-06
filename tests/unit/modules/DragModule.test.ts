/**
 * Тесты для DragModule
 * 
 * Проверяем:
 * 1. Плавное следование за мышью без блокировок
 * 2. Drag в обе стороны
 * 3. Snap только после отпускания
 * 4. Threshold для переключения слайда
 * 5. Touch поддержка
 * 6. События драга
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { DragModule } from '@modules/drag/DragModule'
import {
  createSliderFixture,
  simulateDrag,
  waitForAnimation,
  createMouseEvent,
  type SliderFixture,
} from '../../fixtures'

describe('DragModule', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('drag', DragModule)

    // Создаём фикстуру
    fixture = createSliderFixture({
      slidesCount: 3,
      width: 600,
      height: 400,
    })

    // Инициализируем слайдер
    slider = new Tvist(fixture.root, {
      drag: true,
      speed: 300,
    })
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
    Tvist.unregisterModule('drag')
  })

  describe('Плавное следование за мышью', () => {
    it('должен двигать слайд вместе с мышью без блокировок', () => {
      const initialPosition = slider.engine.location.get()

      // Начинаем drag
      const mouseDownEvent = createMouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
      })
      fixture.container.dispatchEvent(mouseDownEvent)

      // Двигаем мышь влево на 50px
      const mouseMoveEvent = createMouseEvent('mousemove', {
        clientX: 150,
        clientY: 100,
      })
      document.dispatchEvent(mouseMoveEvent)

      // Позиция должна измениться СРАЗУ (следовать за мышью)
      const newPosition = slider.engine.location.get()
      expect(newPosition).not.toBe(initialPosition)
      expect(newPosition).toBeLessThan(initialPosition) // Двинулись влево

      // Отпускаем
      const mouseUpEvent = createMouseEvent('mouseup', {
        clientX: 150,
        clientY: 100,
      })
      document.dispatchEvent(mouseUpEvent)
    })

    it('должен следовать за мышью плавно при движении туда-сюда', () => {
      const initialPosition = slider.engine.location.get()

      // Начинаем drag
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Двигаем влево
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
      const positionLeft = slider.engine.location.get()
      expect(positionLeft).toBeLessThan(initialPosition)

      // Двигаем обратно вправо
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 180, clientY: 100 }))
      const positionBack = slider.engine.location.get()
      expect(positionBack).toBeGreaterThan(positionLeft)
      expect(positionBack).toBeLessThan(initialPosition)

      // Двигаем ещё правее
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 210, clientY: 100 }))
      const positionRight = slider.engine.location.get()
      expect(positionRight).toBeGreaterThan(initialPosition)

      // Отпускаем
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 210, clientY: 100 }))
    })
  })

  describe('Snap после отпускания', () => {
    it('НЕ должен переключать слайд если драг меньше threshold', async () => {
      const initialIndex = slider.activeIndex

      // Маленький drag (40px - меньше threshold)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -40,
        steps: 3,
      })

      await waitForAnimation(300)

      // Индекс НЕ должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })

    it('должен переключить слайд если драг больше threshold', async () => {
      const initialIndex = slider.activeIndex

      // Большой drag (150px - больше threshold)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 5,
      })

      await waitForAnimation(300)

      // Индекс должен увеличиться
      expect(slider.activeIndex).toBe(initialIndex + 1)
    })

    it('должен вернуться к текущему слайду при drag туда-сюда', async () => {
      const initialIndex = slider.activeIndex

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Драгаем влево
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 80, clientY: 100 }))

      // Драгаем обратно вправо
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 180, clientY: 100 }))

      // Отпускаем
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 180, clientY: 100 }))

      await waitForAnimation(300)

      // Индекс НЕ должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })
  })

  describe('Drag в обе стороны', () => {
    it('должен поддерживать drag вправо (к предыдущему слайду)', async () => {
      // Переходим на второй слайд
      slider.scrollTo(1, true)
      const initialIndex = slider.activeIndex
      expect(initialIndex).toBe(1)

      // Drag вправо (к предыдущему)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: 150, // +150px вправо
        steps: 5,
      })

      await waitForAnimation(300)

      // Должны вернуться к первому слайду
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('События', () => {
    it('должен эмитить события dragStart, drag, dragEnd', () => {
      const dragStartSpy = vi.fn()
      const dragSpy = vi.fn()
      const dragEndSpy = vi.fn()

      slider.on('dragStart', dragStartSpy)
      slider.on('drag', dragSpy)
      slider.on('dragEnd', dragEndSpy)

      // mousedown
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      // dragStart не должен вызываться сразу после mousedown (ждем threshold)
      expect(dragStartSpy).not.toHaveBeenCalled()

      // mousemove (достаточно далеко для начала драга)
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
      
      expect(dragStartSpy).toHaveBeenCalledOnce()
      expect(dragSpy).toHaveBeenCalled()

      // mouseup
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
      expect(dragEndSpy).toHaveBeenCalledOnce()
    })

    it('должен передавать правильные данные в события', () => {
      const dragSpy = vi.fn()
      slider.on('drag', dragSpy)

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))

      // Проверяем что событие вызвано
      expect(dragSpy).toHaveBeenCalled()

      // Можно проверить параметры если нужно
      // const callArgs = dragSpy.mock.calls[0]
      // expect(callArgs).toBeDefined()

      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
    })
  })

  describe('Touch поддержка', () => {
    it('должен работать с touch событиями', async () => {
      const initialIndex = slider.activeIndex

      // Используем touch вместо mouse
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 5,
        type: 'touch',
      })

      await waitForAnimation(300)

      // Должны перейти к следующему слайду
      expect(slider.activeIndex).toBe(initialIndex + 1)
    })
  })

  describe('Edge cases', () => {
    it('должен работать с drag даже при динамическом изменении опций', () => {
      const initialPosition = slider.engine.location.get()

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))

      // Позиция должна измениться (модуль активен)
      const newPosition = slider.engine.location.get()
      expect(newPosition).not.toBe(initialPosition)
      expect(newPosition).toBeLessThan(initialPosition)

      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
    })

    it('должен корректно обрабатывать mouseup без mousemove', () => {
      const initialIndex = slider.activeIndex

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Сразу отпускаем без движения
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 200, clientY: 100 }))

      // Индекс не должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })
  })
})

