import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, simulateDrag, waitForAnimation, type SliderFixture } from '../../../fixtures'
import { Tvist } from '../../../../src/core/Tvist'
import { LoopModule } from '../../../../src/modules/loop/LoopModule'
import { DragModule } from '../../../../src/modules/drag/DragModule'

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
    
    // Начальная позиция: index 1 (cloneCount=1)
    expect(slider.activeIndex).toBe(1)
    
    // Ширина слайда = 1000.
    // Позиция должна быть -1000.
    expect(slider.engine.location.get()).toBe(-1000)

    // Драгаем влево ОЧЕНЬ далеко, чтобы пройти все слайды и уйти в append клоны.
    // Слайды: [C4] [1] [2] [3] [4] [C1]
    // Indices: 0    1   2   3   4    5
    // Pos:     0  -1000 -2000 -3000 -4000 -5000
    // Сейчас мы на [1] (-1000).
    // Append клоны начинаются после [4]. Граница прыжка где-то там.
    // Нам нужно продрагать до индекса 5 (C1).
    // Дистанция: 4 слайда = 4000px.
    
    // Эмулируем длинный драг
    // Мы не можем использовать simulateDrag одним куском, так как прыжок должен случиться "по пути"
    // Но simulateDrag делает steps.
    
    const dragPromise = simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: -4500, // Двигаем на 4.5 слайда влево
        steps: 20, // Много шагов, чтобы попасть в проверку
        duration: 500
    })
    
    await dragPromise
    
    // После драга мы должны были перепрыгнуть назад.
    // Если бы не было прыжка, мы были бы на -5500.
    // С прыжком (4 слайда = 4000px offset): -5500 + 4000 = -1500.
    // Это индекс 1.5 (между слайдом 1 и 2).
    
    const finalPos = slider.engine.location.get()
    
    // Проверяем, что позиция "нормальная" (не улетела в -5000)
    expect(finalPos).toBeGreaterThan(-4000) 
    expect(finalPos).toBeLessThan(0)
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
