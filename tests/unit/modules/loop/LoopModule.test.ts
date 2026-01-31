import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSliderFixture, type SliderFixture } from '../../../fixtures'
import { Tvist } from '../../../../src/core/Tvist'
import { LoopModule } from '../../../../src/modules/loop/LoopModule'

describe('LoopModule', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    Tvist.registerModule('loop', LoopModule)
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 800, // 200px per slide with perPage: 4, or just full width
      height: 400
    })
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
    Tvist.unregisterModule('loop')
  })

  it('должен корректно инициализироваться', () => {
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 1
    })

    // Проверяем, что модуль инициализирован
    const loopModule = slider.getModule('loop')
    expect(loopModule).toBeDefined()
    expect((loopModule as any).isInitialized).toBe(true)
  })

  it('не должен инициализироваться, если слайдов меньше 2', () => {
    fixture.cleanup()
    fixture = createSliderFixture({ slidesCount: 1, width: 800 })
    
    slider = new Tvist(fixture.root, {
      loop: true
    })

    const loopModule = slider.getModule('loop')
    // Module is registered and instantiated, but init() should return early
    expect((loopModule as any).isInitialized).toBe(false)
  })

  it('должен создавать клоны', () => {
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 1
    })

    const slides = fixture.container.querySelectorAll('.tvist__slide')
    // 4 originals + 1 prepend + 1 append = 6
    expect(slides.length).toBe(6)

    const clones = fixture.container.querySelectorAll('[data-tvist-clone="true"]')
    expect(clones.length).toBe(2)
  })

  it('должен устанавливать начальную позицию с учетом клонов', () => {
    // slide width 800 (1 item)
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 1
    })

    // Clone count = 1. Start index = 1.
    // Position = -1 * 800 = -800
    expect(slider.engine.index.get()).toBe(1)
    expect(slider.engine.location.get()).toBe(-800)
  })

  it('должен вычислять cloneCount на основе perPage', () => {
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 2
    })

    const loopModule = slider.getModule('loop')
    expect((loopModule as any).cloneCount).toBe(2)

    // 4 originals + 2 prepend + 2 append = 8
    expect(slider.slides.length).toBe(8)
  })

  it('должен ограничивать cloneCount количеством оригинальных слайдов', () => {
    // 4 slides, request 10 perPage
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 10
    })

    const loopModule = slider.getModule('loop')
    // Should be limited to 4
    expect((loopModule as any).cloneCount).toBe(4)
  })

  describe('Навигация и realIndex', () => {
    beforeEach(() => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
    })

    it('должен корректно вычислять realIndex', () => {
      // Start at physical 1 (logical 0)
      expect((slider as any).realIndex).toBe(0)

      // Move to physical 2 (logical 1)
      slider.engine.index.set(2)
      expect((slider as any).realIndex).toBe(1)

      // Move to physical 0 (clone of logical 3)
      slider.engine.index.set(0)
      expect((slider as any).realIndex).toBe(3)
    })

    it('scrollTo должен использовать кратчайший путь (resolveIndex)', () => {
      // Start: physical 1 (logical 0)
      // Go to logical 3.
      // Candidates: 
      // - 1 (current)
      // Target logical 3.
      // Physical candidates for 3 (with cloneCount 1, N=4):
      // - 3 + 1 = 4 (Normal)
      // - 3 + 1 + 4 = 8 (Append) - Out of bounds (total 6: 0..5)
      // - 3 + 1 - 4 = 0 (Prepend)
      
      // Distances from 1:
      // to 4: abs(1-4) = 3
      // to 0: abs(1-0) = 1
      
      // Should choose 0 (Prepend clone)
      
      // Spy on internal method or check result
      slider.scrollTo(3)
      
      // Should be at physical index 0 OR 4. 
      // But implementation says shortest path. 
      // 1 -> 0 (diff 1) is shorter than 1 -> 4 (diff 3)
      // BUT if we just use scrollTo, it calls resolveIndex.
      
      // Let's verify resolveIndex directly to be sure about logic
      const loopModule = slider.getModule('loop')
      const bestPhysical = (loopModule as any).resolveIndex(3)
      
      expect(bestPhysical).toBe(0)
    })
  })

  describe('loopFix (прыжок)', () => {
    it('должен прыгать из начала в конец (prepend clone)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })

      // Move to prepend clone (index 0)
      slider.engine.index.set(0)
      // Trigger slideChanged manually or via slider event system simulation if needed.
      // LoopModule listens to 'slideChanged'.
      
      slider.emit('slideChanged', 0)

      // Should jump to original last slide.
      // N=4, Count=1.
      // 0 maps to N-1=3.
      // Physical index for 3 is 3+1=4.
      expect(slider.engine.index.get()).toBe(4)
    })

    it('должен прыгать из конца в начало (append clone)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })

      // Move to append clone (index 5)
      // N=4, Count=1. Total 6 (0..5).
      // Index 5 is clone of logical 0.
      slider.engine.index.set(5)
      
      slider.emit('slideChanged', 5)

      // Should jump to original first slide.
      // Logical 0. Physical 0+1=1.
      expect(slider.engine.index.get()).toBe(1)
    })
  })

  describe('checkClonePosition (бесшовный переход при скролле/драге)', () => {
    it('должен смещать позицию если мы зашли далеко влево (prepend area)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      
      // Initial: index 1, pos -800.
      // Prepend boundary: cloneCount - 0.5 = 0.5.
      // Index < 0.5 means pos > -0.5 * 800 = -400.
      
      // Move slider to position -300 (index 0.375)
      // This is inside prepend area (before start of original slides visual area if we consider center)
      // But actually, index 0 is the prepend clone.
      // Pos for index 0 is 0.
      // Pos for index 1 is -800.
      
      // Let's set position to 0 (exactly on prepend clone)
      slider.engine.location.set(0)
      
      // Trigger check
      slider.emit('scroll')
      
      // Logic: currentFloatIndex = -0 / 800 = 0.
      // prependBoundary = 1 - 0.5 = 0.5.
      // 0 < 0.5 -> True.
      // Offset = 4 * 800 = 3200.
      // New pos = 0 - 3200 = -3200.
      
      expect(slider.engine.location.get()).toBe(-3200)
      
      // -3200 corresponds to index 4.
      // Index 4 is the last original slide? No.
      // Slides: [C] [1] [2] [3] [4] [C]
      // Indices: 0   1   2   3   4   5
      // Pos:     0 -800 ...       -3200
      // So -3200 is index 4. Correct.
    })

    it('должен смещать позицию если мы зашли далеко вправо (append area)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      
      // Append boundary: N + count - 0.5 = 4 + 1 - 0.5 = 4.5.
      // We need index > 4.5.
      // Index 5 is append clone. Pos = -5 * 800 = -4000.
      
      slider.engine.location.set(-4000)
      slider.emit('scroll')
      
      // Logic:
      // Offset = 3200.
      // New pos = -4000 + 3200 = -800.
      
      expect(slider.engine.location.get()).toBe(-800)
      // -800 is index 1 (first original slide). Correct.
    })
  })

  describe('destroy', () => {
    it('должен удалять клоны и очищать атрибуты', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })

      slider.destroy()

      const clones = fixture.container.querySelectorAll('[data-tvist-clone]')
      expect(clones.length).toBe(0)

      const originals = fixture.container.querySelectorAll('[data-tvist-original]')
      expect(originals.length).toBe(0)

      const slides = fixture.container.querySelectorAll('.tvist__slide')
      expect(slides.length).toBe(4)

      expect('realIndex' in slider).toBe(false)
    })
  })
})
