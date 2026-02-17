/**
 * Тесты для DragModule Free Mode
 * 
 * Проверяем:
 * 1. Свободная прокрутка без snap
 * 2. Momentum scroll с инерцией
 * 3. Free mode с snap (freeSnap: true)
 * 4. Границы прокрутки
 * 5. FlickPower и FlickMaxPages
 * 6. Velocity calculation
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

describe('DragModule Free Mode', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    Tvist.registerModule('drag', DragModule)
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
    Tvist.unregisterModule('drag')
  })

  describe('Базовый Free Mode', () => {
    beforeEach(() => {
      fixture = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        speed: 300,
      })
    })

    it('должен включать free mode при drag: "free"', () => {
      expect(slider.options.drag).toBe('free')
    })

    it('должен позволять остановиться между слайдами', async () => {
      const initialPosition = slider.engine.location.get()

      // Делаем медленный drag на небольшое расстояние
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -80, // 80px - примерно половина слайда
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(100)

      const finalPosition = slider.engine.location.get()
      
      // Позиция должна измениться
      expect(finalPosition).not.toBe(initialPosition)
      expect(finalPosition).toBeLessThan(initialPosition)

      // НЕ должно быть автоматического snap (остаёмся между слайдами)
      const slidePositions = slider.engine.getSlidePositions()
      const isOnSlidePosition = slidePositions.some(
        pos => Math.abs(-finalPosition - pos) < 1
      )
      expect(isOnSlidePosition).toBe(false)
    })

    it('НЕ должен делать snap после остановки momentum', async () => {
      // Делаем быстрый drag для momentum
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 3,
        duration: 50, // Быстрый drag = высокая velocity
      })

      // Ждём окончания momentum
      await waitForAnimation(1000)

      const finalPosition = slider.engine.location.get()

      // Проверяем что НЕ на точной позиции слайда
      const slidePositions = slider.engine.getSlidePositions()
      const isOnSlidePosition = slidePositions.some(
        pos => Math.abs(-finalPosition - pos) < 5
      )
      
      // В free mode БЕЗ freeSnap не должно быть выравнивания
      expect(isOnSlidePosition).toBe(false)
    })
  })

  describe('Momentum Scroll', () => {
    beforeEach(() => {
      fixture = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        flickPower: 600,
      })
    })

    it('должен продолжать движение после отпускания (momentum)', async () => {
      const initialPosition = slider.engine.location.get()

      // Быстрый drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 2,
        duration: 30, // Очень быстрый
      })

      // Сразу после отпускания
      const positionAfterDrag = slider.engine.location.get()
      
      // Небольшая пауза для momentum
      await waitForAnimation(100)

      const positionAfterMomentum = slider.engine.location.get()

      // Должно быть дальнейшее движение за счёт momentum
      expect(positionAfterMomentum).toBeLessThan(positionAfterDrag)
      expect(positionAfterMomentum).toBeLessThan(initialPosition)
    })

    it('должен применять меньше momentum при медленном drag', async () => {
      // Быстрый drag для сравнения
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 2,
        duration: 30,
      })

      await waitForAnimation(300)
      const fastDistance = Math.abs(slider.engine.location.get())

      // Сброс позиции
      slider.scrollTo(0, true)
      await waitForAnimation(100)

      // Медленный drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 10,
        duration: 500,
      })

      await waitForAnimation(300)
      const slowDistance = Math.abs(slider.engine.location.get())

      // Медленный drag должен проехать меньше
      expect(slowDistance).toBeLessThan(fastDistance)
    })
  })

  describe('Free Mode с Snap', () => {
    beforeEach(() => {
      fixture = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: 'free',
        freeSnap: true, // Включаем snap
        perPage: 3,
        gap: 20,
        speed: 300,
      })
    })

    it('должен делать snap к ближайшему слайду после momentum', async () => {
      const initialIndex = slider.activeIndex

      // Быстрый drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 3,
        duration: 50,
      })

      // Ждём momentum + snap
      await waitForAnimation(800)

      const finalIndex = slider.activeIndex

      // Индекс должен измениться
      expect(finalIndex).toBeGreaterThan(initialIndex)

      // Должны быть точно на слайде
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })

    it('должен снапиться к ближайшему слайду при малом drag', async () => {
      const initialIndex = slider.activeIndex

      // Маленький медленный drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -60, // Небольшое смещение
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(500)

      const finalIndex = slider.activeIndex

      // Может остаться на том же слайде или перейти на следующий
      // В любом случае должны быть точно на позиции слайда
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })
  })

  describe('FlickPower и FlickMaxPages', () => {
    it('должен использовать flickPower для расчёта дистанции', async () => {
      // Тест 1: Высокий flickPower
      const fixture1 = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      const slider1 = new Tvist(fixture1.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        flickPower: 1200, // Вдвое больше дефолтного
      })

      const initialPosition1 = slider1.engine.location.get()

      await simulateDrag({
        element: fixture1.container,
        startX: 200,
        deltaX: -100,
        steps: 2,
        duration: 30,
      })

      await waitForAnimation(500)

      const highPowerDistance = Math.abs(slider1.engine.location.get() - initialPosition1)

      slider1.destroy()
      fixture1.cleanup()

      // Тест 2: Низкий flickPower
      const fixture2 = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      const slider2 = new Tvist(fixture2.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        flickPower: 300, // Вдвое меньше дефолтного
      })

      const initialPosition2 = slider2.engine.location.get()

      await simulateDrag({
        element: fixture2.container,
        startX: 200,
        deltaX: -100,
        steps: 2,
        duration: 30,
      })

      await waitForAnimation(500)

      const lowPowerDistance = Math.abs(slider2.engine.location.get() - initialPosition2)

      slider2.destroy()
      fixture2.cleanup()

      // С высоким flickPower должны улететь дальше
      expect(highPowerDistance).toBeGreaterThan(lowPowerDistance)
    })

    it('должен ограничивать дистанцию с помощью flickMaxPages в обычном режиме', async () => {
      fixture = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: true, // Обычный режим (не free)
        perPage: 3,
        gap: 20,
        flickPower: 2000, // Очень высокая сила
        flickMaxPages: 1, // Максимум 1 страница
      })

      const initialIndex = slider.activeIndex

      // Очень быстрый drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 1,
        duration: 20,
      })

      await waitForAnimation(500)

      const finalIndex = slider.activeIndex

      // Несмотря на высокую velocity, не должны перепрыгнуть больше 1 страницы
      expect(finalIndex - initialIndex).toBeLessThanOrEqual(1)
    })
  })

  describe('Границы в Free Mode', () => {
    beforeEach(() => {
      fixture = createSliderFixture({
        slidesCount: 5, // Мало слайдов для проверки границ
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        loop: false,
      })
    })

    it('должен останавливаться на границе при достижении конца', async () => {
      // Переходим почти к концу
      slider.scrollTo(slider.slides.length - 1, true)
      await waitForAnimation(200)

      const maxPosition = slider.engine.getMaxScrollPosition()

      // Пытаемся продрагать дальше конца
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -200, // Большой drag влево
        steps: 2,
        duration: 30,
      })

      await waitForAnimation(800)

      const finalPosition = slider.engine.location.get()

      // Не должны уйти дальше maxPosition (с небольшой погрешностью)
      expect(finalPosition).toBeGreaterThanOrEqual(maxPosition - 50)
      expect(finalPosition).toBeLessThanOrEqual(maxPosition + 5)
    })

    it('должен останавливаться на начальной границе', async () => {
      const minPosition = slider.engine.getMinScrollPosition()

      // Пытаемся продрагать дальше начала
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: 200, // Большой drag вправо
        steps: 2,
        duration: 30,
      })

      await waitForAnimation(800)

      const finalPosition = slider.engine.location.get()

      // Не должны уйти дальше minPosition (с небольшой погрешностью)
      expect(finalPosition).toBeLessThanOrEqual(minPosition + 50)
      expect(finalPosition).toBeGreaterThanOrEqual(minPosition - 5)
    })
  })

  describe('Сравнение режимов', () => {
    it('normal mode должен всегда делать snap, free mode - нет', async () => {
      fixture = createSliderFixture({
        slidesCount: 10,
        width: 600,
        height: 400,
      })

      // Normal mode
      slider = new Tvist(fixture.root, {
        drag: true,
        perPage: 3,
        gap: 20,
      })

      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(400)

      const normalPosition = slider.engine.location.get()
      const normalIndex = slider.activeIndex
      const normalExpected = slider.engine.getScrollPositionForIndex(normalIndex)
      
      // Normal mode должен быть точно на слайде
      expect(Math.abs(normalPosition - normalExpected)).toBeLessThan(5)

      slider.destroy()

      // Free mode
      slider = new Tvist(fixture.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
      })

      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(400)

      const freePosition = slider.engine.location.get()

      // Free mode может быть где угодно (не обязательно на слайде)
      const slidePositions = slider.engine.getSlidePositions()
      const isOnSlidePosition = slidePositions.some(
        pos => Math.abs(-freePosition - pos) < 5
      )
      
      expect(isOnSlidePosition).toBe(false)
    })
  })

  describe('Rubberband в Free Mode', () => {
    beforeEach(() => {
      fixture = createSliderFixture({
        slidesCount: 5,
        width: 600,
        height: 400,
      })

      slider = new Tvist(fixture.root, {
        drag: 'free',
        perPage: 3,
        gap: 20,
        rubberband: true,
        loop: false,
      })
    })

    it('должен применять rubberband эффект за границами', async () => {
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Драгаем вправо за границу (превышает MIN_DRAG_DISTANCE)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 300, clientY: 100 })
      )

      // Еще одно движение после dragStart
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 310, clientY: 100 })
      )

      const positionDuringDrag = slider.engine.location.get()

      // Должны немного двинуться, но с сопротивлением
      expect(positionDuringDrag).toBeGreaterThan(0)
      // Но не на полные 110px (из-за rubberband)
      expect(positionDuringDrag).toBeLessThan(110)

      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 300, clientY: 100 })
      )
    })
  })
})
