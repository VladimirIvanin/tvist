import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, simulateDrag, waitForAnimation, type SliderFixture } from '../../../fixtures'
import { Tvist } from '@core/Tvist'
import { LoopModule } from '@modules/loop/LoopModule'
import { DragModule } from '@modules/drag/DragModule'

// Регистрируем модули
Tvist.registerModule('loop', LoopModule)
Tvist.registerModule('drag', DragModule)

describe('LoopModule + DragModule Integration', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 4, width: 1000 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
  })

  it('должен перепрыгивать через границу при драге (бесконечный скролл)', async () => {
    slider = new Tvist(fixture.root, { loop: true, perPage: 1 })
    
    // Начальная позиция: index 2 (cloneCount=2)
    expect(slider.activeIndex).toBe(2)
    
    // Ширина слайда = 1000.
    // Позиция должна быть -2 * 1000 = -2000.
    expect(slider.engine.location.get()).toBe(-2000)

    // Драгаем влево ОЧЕНЬ далеко, чтобы пройти все слайды и уйти в append клоны.
    // Слайды (8): [C C] [1 2 3 4] [C C]
    // Indices:     0 1   2 3 4 5   6 7
    // Pos:         0 -1k -2k ...
    // Start at -2000.
    // Append clones start after index 5 (pos -5000). Index 6 (-6000).
    // Need to drag past index 5.
    
    // Drag by -5000px.
    // Current -2000. Target -7000.
    // Boundary is around index 6 (pos -6000).
    
    const dragPromise = simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: -5000, 
        steps: 20, 
        duration: 500
    })
    
    await dragPromise
    
    // После драга мы должны были перепрыгнуть назад.
    // Если бы не было прыжка, мы были бы на -7000.
    // С прыжком (4 слайда = 4000px offset): -7000 + 4000 = -3000.
    // Это индекс 3.
    
    const finalPos = slider.engine.location.get()
    
    // Проверяем, что позиция "нормальная" (не улетела в -6000)
    expect(finalPos).toBeGreaterThan(-5000) 
    expect(finalPos).toBeLessThan(-1000)
  })

  it('не должен начинать драг при клике (threshold)', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true })
    const startPos = slider.engine.location.get()
    
    // Маленькое движение (меньше 5px)
    await simulateDrag({
        element: fixture.container,
        startX: 100,
        deltaX: 3, 
        steps: 1
    })
    
    // Позиция не должна измениться (drag не начался)
    expect(slider.engine.location.get()).toBe(startPos)
  })

  it('должен начинать драг при превышении threshold', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true })
    const dragStartSpy = vi.fn()
    slider.on('dragStart', dragStartSpy)
    
    // Движение больше 5px (используем 20px)
    await simulateDrag({
        element: fixture.container,
        startX: 100,
        deltaX: 20, 
        steps: 5
    })
    
    // Событие dragStart должно было сработать
    expect(dragStartSpy).toHaveBeenCalled()
  })
})
