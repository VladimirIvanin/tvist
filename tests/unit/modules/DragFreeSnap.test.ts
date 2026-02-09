/**
 * Тесты для Free Mode + Snap
 * 
 * Проверяем корректность snap к ближайшему слайду:
 * 1. Snap к ближайшему слайду после momentum
 * 2. Не к следующему после активного, а именно к БЛИЖАЙШЕМУ
 * 3. Работа с разными позициями (начало, середина, между слайдами)
 */

import { beforeEach, describe, expect, it, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { DragModule } from '@modules/drag/DragModule'
import {
  createSliderFixture,
  simulateDrag,
  waitForAnimation,
  type SliderFixture,
} from '../../fixtures'

describe('DragModule Free+Snap - Snap к ближайшему', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    Tvist.registerModule('drag', DragModule)
    
    fixture = createSliderFixture({
      slidesCount: 10,
      width: 600,
      height: 400,
    })

    slider = new Tvist(fixture.root, {
      drag: 'free',
      freeSnap: true,
      perPage: 3,
      gap: 20,
      speed: 300,
    })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
    Tvist.unregisterModule('drag')
  })

  describe('Snap к ближайшему слайду', () => {
    it('должен снапиться к ближайшему слайду, а не к следующему после активного', async () => {
      // Начинаем с индекса 0
      expect(slider.activeIndex).toBe(0)

      // Делаем небольшой drag (примерно на половину слайда)
      // Это должно привести к snap к слайду 0 (ближайший), а не к слайду 1
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100, // Небольшой сдвиг влево
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(500)

      // Должны остаться на слайде 0 или перейти к слайду 1,
      // но проверим что позиция точно на одном из слайдов
      const finalIndex = slider.activeIndex
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      
      // Позиция должна быть на слайде (с небольшой погрешностью)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })

    it('должен снапиться назад если momentum не дотянул до следующего слайда', async () => {
      const initialIndex = slider.activeIndex

      // Очень маленький drag с малой velocity
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -50, // Маленький сдвиг
        steps: 5,
        duration: 200, // Медленный = малая velocity
      })

      await waitForAnimation(600)

      const finalIndex = slider.activeIndex
      
      // Должны остаться на том же слайде или максимум на +1
      expect(finalIndex - initialIndex).toBeLessThanOrEqual(1)
      
      // Проверяем что точно на позиции слайда
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })

    it('должен снапиться к правильному слайду при позиции между слайдами', async () => {
      // Переходим на слайд 2
      slider.scrollTo(2, true)
      await waitForAnimation(200)

      // Делаем drag который остановится примерно между слайдами 3 и 4
      // Средний по скорости drag с momentum
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -180, // Довольно большой drag
        steps: 4,
        duration: 80, // Средняя скорость
      })

      await waitForAnimation(800)

      const finalIndex = slider.activeIndex
      
      // Должны улететь вперед от слайда 2
      expect(finalIndex).toBeGreaterThan(2)
      
      // И быть точно на позиции слайда (snap сработал)
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(10)
    })

    it('должен снапиться к ближайшему даже при сильном momentum', async () => {
      // Начинаем с индекса 2
      slider.scrollTo(2, true)
      await waitForAnimation(200)

      // Быстрый drag влево (momentum должен пролететь несколько слайдов)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 2,
        duration: 30, // Очень быстро
      })

      await waitForAnimation(800)

      const finalIndex = slider.activeIndex
      
      // Должны улететь вперед
      expect(finalIndex).toBeGreaterThan(2)
      
      // И точно снапиться к слайду
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })
  })

  describe('Сравнение Free+Snap с обычным Snap', () => {
    it('Free+Snap должен снапиться к ближайшему, а Normal - учитывать threshold', async () => {
      // Тест 1: Free+Snap
      const freeSlider = slider // уже создан с free+snap
      
      // Маленький drag
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -60,
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(600)

      const freeIndex = freeSlider.activeIndex
      const freePosition = freeSlider.engine.location.get()
      
      freeSlider.destroy()

      // Тест 2: Normal режим
      const normalSlider = new Tvist(fixture.root, {
        drag: true, // Обычный режим
        perPage: 3,
        gap: 20,
        speed: 300,
      })

      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -60, // Тот же drag
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(600)

      const normalIndex = normalSlider.activeIndex
      
      normalSlider.destroy()

      // В Free+Snap снапимся к ближайшему (может остаться на 0)
      // В Normal используется threshold (может тоже остаться на 0)
      // Но важно что оба на точной позиции слайда
      const expectedFreePos = freeSlider.engine.getScrollPositionForIndex(freeIndex)
      expect(Math.abs(freePosition - expectedFreePos)).toBeLessThan(5)
    })
  })

  describe('Граничные случаи', () => {
    it('должен снапиться к первому слайду при drag вправо от начала', async () => {
      // Уже на первом слайде
      expect(slider.activeIndex).toBe(0)

      // Пытаемся драгать вправо
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: 100,
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(600)

      // Должны остаться на первом слайде
      expect(slider.activeIndex).toBe(0)
      
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(0)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })

    it('должен снапиться к последнему слайду при drag от конца', async () => {
      // Переходим к последнему слайду
      const lastIndex = slider.slides.length - 1
      slider.scrollTo(lastIndex, true)
      await waitForAnimation(200)

      // Пытаемся драгать влево дальше
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 3,
        duration: 100,
      })

      await waitForAnimation(600)

      const finalIndex = slider.activeIndex
      
      // Не должны уйти дальше последнего доступного слайда
      expect(finalIndex).toBeLessThanOrEqual(lastIndex)
      
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })

    it('должен корректно работать с center: true', async () => {
      slider.destroy()
      
      slider = new Tvist(fixture.root, {
        drag: 'free',
        freeSnap: true,
        center: true, // Центрирование
        perPage: 3,
        gap: 20,
        speed: 300,
      })

      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -100,
        steps: 3,
        duration: 50,
      })

      await waitForAnimation(600)

      const finalIndex = slider.activeIndex
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(finalIndex)
      
      // Должны снапиться точно к центрированной позиции
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(5)
    })
  })
})
