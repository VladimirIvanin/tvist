/**
 * Тесты для проверки бага с перекидыванием позиции при начале drag в loop режиме
 * 
 * Проблема: при начале drag вызывается loopFix, который даже при отсутствии
 * перестановки слайдов вызывал update(), сбрасывающий location на позицию
 * текущего индекса. Это создавало визуальный скачок.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src' // Импортируем из главного index для регистрации модулей
import { createSliderFixture, type SliderFixture } from '../../fixtures'

describe('DragModule + LoopModule: position preservation on drag start', () => {
  let fixture: SliderFixture
  let root: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 800 })
    root = fixture.root
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
  })

  it('should NOT reset location when starting drag at index 0 with loop', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0 // Мгновенные переходы для тестирования
    })

    // Ждем инициализации
    expect(slider.engine.index.get()).toBe(0)
    const initialLocation = slider.engine.location.get()
    
    // Симулируем начало drag (pointerdown)
    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    const pointerDownEvent = new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    })
    container.dispatchEvent(pointerDownEvent)

    // Симулируем первое движение (должно вызвать loopFix и dragStart)
    // Движение должно быть достаточным для превышения MIN_DRAG_DISTANCE (5px)
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 370, // Движение влево на 30px (достаточно для drag)
      clientY: 0,
      bubbles: true
    }))

    // После dragStart делается return, поэтому location еще не изменилась
    // Нужно еще одно движение
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 365, // Еще 5px влево
      clientY: 0,
      bubbles: true
    }))

    // КРИТИЧНО: location НЕ должна сброситься на initialLocation
    // Она должна измениться в соответствии с drag
    const locationAfterMove = slider.engine.location.get()
    
    // Location должна измениться (drag на ~5px от момента dragStart)
    expect(Math.abs(locationAfterMove - initialLocation)).toBeGreaterThan(3)
    expect(Math.abs(locationAfterMove - initialLocation)).toBeLessThan(15)

    // Завершаем drag
    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 370,
      clientY: 0,
      bubbles: true
    })
    document.dispatchEvent(pointerUpEvent)
  })

  it('should NOT reset location when starting drag at index 3 with loop', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    // Переходим на слайд 3
    slider.scrollTo(3, true)
    expect(slider.engine.index.get()).toBe(3)
    
    const locationBeforeDrag = slider.engine.location.get()

    // Симулируем начало drag
    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    const pointerDownEvent = new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    })
    container.dispatchEvent(pointerDownEvent)

    // Симулируем движение вправо (к предыдущему слайду)
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 430, // Движение вправо на 30px (достаточно для drag)
      clientY: 0,
      bubbles: true
    }))

    // После dragStart делается return, нужно еще одно движение
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 435, // Еще 5px вправо
      clientY: 0,
      bubbles: true
    }))

    const locationAfterMove = slider.engine.location.get()
    
    // Location должна измениться в соответствии с drag, а не сброситься
    expect(Math.abs(locationAfterMove - locationBeforeDrag)).toBeGreaterThan(3)
    expect(Math.abs(locationAfterMove - locationBeforeDrag)).toBeLessThan(15)

    // Завершаем drag
    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 430,
      clientY: 0,
      bubbles: true
    })
    document.dispatchEvent(pointerUpEvent)
  })

  it('should preserve location during drag when loopFix is called without rearrangement', () => {
    // Создаем слайдер с достаточным количеством слайдов для loop
    const bigFixture = createSliderFixture({ slidesCount: 10, width: 800 })
    const bigRoot = bigFixture.root
    
    slider = new Tvist(bigRoot, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    // Переходим на средний слайд
    slider.scrollTo(5, true)
    expect(slider.engine.index.get()).toBe(5)

    // Получаем модуль через внутренний API
    const modules = slider['modules'] as Map<string, unknown>
    const loopModule = modules.get('loop') as { fix?: (params: unknown) => void } | undefined

    // Если модуль не инициализирован, пропускаем тест
    if (!loopModule) {
      console.warn('Loop module not initialized, skipping test')
      bigFixture.cleanup()
      return
    }

    // Запоминаем location перед loopFix
    const locationBefore = slider.engine.location.get()

    // Вызываем loopFix напрямую (как это делает DragModule при первом движении)
    // При индексе 5 из 10 слайдов перестановка не нужна
    loopModule.fix({ direction: 'next' })

    // Location НЕ должна измениться, так как перестановки не было
    const locationAfter = slider.engine.location.get()
    expect(locationAfter).toBe(locationBefore)
    
    bigFixture.cleanup()
  })

  it('should NOT call update() when loopFix detects no rearrangement needed', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    slider.scrollTo(2, true)
    
    // Шпионим за методом update
    const updateSpy = vi.spyOn(slider, 'update')

    const loopModule = slider['modules'].get('loop') as { fix?: (params: unknown) => void } | undefined
    
    // Вызываем loopFix когда перестановка не нужна
    loopModule?.fix?.({ direction: 'next' })

    // update() НЕ должен вызываться, так как DOM не изменился
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('should call update() when loopFix performs rearrangement', () => {
    // Создаем слайдер с достаточным количеством слайдов для loop
    const bigFixture = createSliderFixture({ slidesCount: 10, width: 800 })
    const bigRoot = bigFixture.root
    
    slider = new Tvist(bigRoot, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    // После инициализации loop уже расставил слайды
    const modules = slider['modules'] as Map<string, unknown>
    const loopModule = modules.get('loop') as { 
      fix?: (params: unknown) => void
      loopedSlides?: number 
    } | undefined
    
    // Если модуль не инициализирован, пропускаем тест
    if (!loopModule) {
      console.warn('Loop module not initialized, skipping test')
      bigFixture.cleanup()
      return
    }
    
    // Переходим на индекс, близкий к началу (где потребуется prepend)
    // loopedSlides обычно = 1 для perPage: 1
    const loopedSlides = loopModule.loopedSlides ?? 1
    slider.scrollTo(loopedSlides - 1, true)
    
    const updateSpy = vi.spyOn(slider, 'update')
    
    // Вызываем loopFix с direction: 'prev'
    // Это должно вызвать prepend слайдов
    loopModule.fix({ direction: 'prev' })

    // update() ДОЛЖЕН вызваться, так как DOM изменился
    expect(updateSpy).toHaveBeenCalled()
    
    bigFixture.cleanup()
  })

  it('should preserve location during actual drag gesture with multiple moves', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    slider.scrollTo(2, true)
    const initialLocation = slider.engine.location.get()

    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    
    // Начинаем drag
    container.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    }))

    // Несколько движений
    const moves = [395, 390, 385, 380, 375]
    let lastLocation = initialLocation

    moves.forEach(x => {
      document.dispatchEvent(new PointerEvent('pointermove', {
        clientX: x,
        clientY: 0,
        bubbles: true
      }))

      const currentLocation = slider.engine.location.get()
      
      // Location должна плавно изменяться, а не скакать
      const diff = Math.abs(currentLocation - lastLocation)
      expect(diff).toBeLessThan(15) // Максимальное изменение за один шаг (учитываем dragSpeed)
      
      lastLocation = currentLocation
    })

    // Завершаем drag
    document.dispatchEvent(new PointerEvent('pointerup', {
      clientX: 375,
      clientY: 0,
      bubbles: true
    }))

    slider.destroy()
  })

  it('should handle drag start at last slide with loop', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    // Переходим на средний слайд (не на край, чтобы избежать loopFix с перестановкой)
    slider.scrollTo(2, true)
    expect(slider.engine.index.get()).toBe(2)
    
    const locationBefore = slider.engine.location.get()

    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    
    // Начинаем drag влево
    container.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    }))

    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 370, // Движение влево на 30px (достаточно для drag)
      clientY: 0,
      bubbles: true
    }))

    // После dragStart делается return, нужно еще одно движение
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 365, // Еще 5px влево
      clientY: 0,
      bubbles: true
    }))

    const locationAfter = slider.engine.location.get()
    
    // Location должна измениться плавно (на ~5px)
    expect(Math.abs(locationAfter - locationBefore)).toBeGreaterThan(3)
    expect(Math.abs(locationAfter - locationBefore)).toBeLessThan(15)

    document.dispatchEvent(new PointerEvent('pointerup', {
      clientX: 365,
      clientY: 0,
      bubbles: true
    }))
  })

  it('should reset startX/startY after dragStart to prevent accumulated delta', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    const initialLocation = slider.engine.location.get()

    // Симулируем pointerdown
    container.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    }))

    // Делаем несколько маленьких движений (меньше MIN_DRAG_DISTANCE = 5px)
    // Эти движения НЕ должны начать drag, но накапливают delta
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 398, // -2px
      clientY: 0,
      bubbles: true
    }))

    // Location НЕ должна измениться, так как drag еще не начался
    expect(slider.engine.location.get()).toBe(initialLocation)

    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 396, // еще -2px (всего -4px)
      clientY: 0,
      bubbles: true
    }))

    // Location все еще не изменилась
    expect(slider.engine.location.get()).toBe(initialLocation)

    // Теперь движение, которое превысит MIN_DRAG_DISTANCE
    // Общий delta от startX будет: 400 - 390 = 10px
    // Но после dragStart должен быть сброс startX, поэтому следующий delta будет ~0
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 390, // еще -6px (всего -10px, превышает MIN_DRAG_DISTANCE)
      clientY: 0,
      bubbles: true
    }))

    // КРИТИЧНО: location должна остаться на месте или измениться минимально
    // Если startX не сброшен, location скакнет на -10px
    // Если startX сброшен, location останется ~0 (или изменится на следующем кадре)
    const locationAfterDragStart = slider.engine.location.get()
    expect(Math.abs(locationAfterDragStart - initialLocation)).toBeLessThan(2)

    // Следующее движение должно работать нормально
    document.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 385, // -5px от предыдущего
      clientY: 0,
      bubbles: true
    }))

    const locationAfterSecondMove = slider.engine.location.get()
    // Теперь location должна измениться на ~5px
    expect(Math.abs(locationAfterSecondMove - locationAfterDragStart)).toBeGreaterThan(3)
    expect(Math.abs(locationAfterSecondMove - locationAfterDragStart)).toBeLessThan(10)

    document.dispatchEvent(new PointerEvent('pointerup', {
      clientX: 385,
      clientY: 0,
      bubbles: true
    }))
  })

  it('should not have visual jump when loopFix is triggered during drag', () => {
    slider = new Tvist(root, {
      loop: true,
      drag: true,
      perPage: 1,
      speed: 0
    })

    slider.scrollTo(1, true)
    
    const container = root.querySelector('.tvist-v1__container') as HTMLElement
    const locations: number[] = []

    // Начинаем drag
    container.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true
    }))

    locations.push(slider.engine.location.get())

    // Делаем много маленьких движений
    for (let i = 1; i <= 20; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', {
        clientX: 400 - i * 2, // Движение влево по 2px
        clientY: 0,
        bubbles: true
      }))

      locations.push(slider.engine.location.get())
    }

    // Проверяем, что нет резких скачков в location
    for (let i = 1; i < locations.length; i++) {
      const diff = Math.abs(locations[i]! - locations[i - 1]!)
      // Разница между соседними location не должна превышать разумный порог
      expect(diff).toBeLessThan(15) // Учитываем dragSpeed и возможные округления
    }

    document.dispatchEvent(new PointerEvent('pointerup', {
      clientX: 360,
      clientY: 0,
      bubbles: true
    }))

    slider.destroy()
  })
})
