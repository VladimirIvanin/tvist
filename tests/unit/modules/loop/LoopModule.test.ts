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
    // 4 originals + 2 prepend + 2 append = 8 (perPage * 2 rule)
    expect(slides.length).toBe(8)

    const clones = fixture.container.querySelectorAll('[data-tvist-clone="true"]')
    expect(clones.length).toBe(4)
  })

  it('должен устанавливать начальную позицию с учетом клонов', () => {
    // slide width 800 (1 item)
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 1
    })

    // Clone count = 2. Start index = 2.
    // Position = -2 * 800 = -1600
    expect(slider.engine.index.get()).toBe(2)
    expect(slider.engine.location.get()).toBe(-1600)
  })

  it('должен вычислять cloneCount на основе perPage', () => {
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 2
    })

    const loopModule = slider.getModule('loop')
    // perPage * 2 = 4
    expect((loopModule as any).cloneCount).toBe(4)

    // 4 originals + 4 prepend + 4 append = 12
    expect(slider.slides.length).toBe(12)
  })

  it('должен использовать минимум perPage * 2 клонов, даже если слайдов меньше', () => {
    // 4 slides, request 10 perPage
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 10
    })

    const loopModule = slider.getModule('loop')
    // 10 * 2 = 20
    expect((loopModule as any).cloneCount).toBe(20)
  })

  describe('Навигация и realIndex', () => {
    beforeEach(() => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      // N=4, C=2.
      // 0,1 (Clones)
      // 2,3,4,5 (Originals 0,1,2,3)
      // 6,7 (Clones)
    })

    it('должен корректно вычислять realIndex', () => {
      // Start at physical 2 (logical 0)
      expect((slider as any).realIndex).toBe(0)

      // Move to physical 3 (logical 1)
      slider.engine.index.set(3)
      expect((slider as any).realIndex).toBe(1)

      // Move to physical 1 (clone of logical 3)
      // Logical: (1 - 2) % 4 = -1 -> 3.
      slider.engine.index.set(1)
      expect((slider as any).realIndex).toBe(3)
    })

    it('scrollTo должен использовать кратчайший путь (resolveIndex)', () => {
      // Start: physical 3 (logical 1)
      slider.engine.index.set(3)
      
      // Go to logical 3.
      // Current logical 1. Target 3.
      // Diff = 3 - 1 = 2.
      // 2 > 4/2 (no, 2 = 4/2). If > 2 -> diff-=4.
      // With N=4, diff=2. Boundary is N/2 = 2.
      // Our code: if diff > N/2. 2 is not > 2. So diff stays 2.
      // Physical = 3 + 2 = 5.
      
      // Slide 5 is Original 3.
      // Is there a shorter path?
      // 3 -> 5 (dist 2).
      // 3 -> 1 (Prepend Clone of 3). Dist 2.
      // Either is fine. Implementation picks right (positive) direction for equal distance usually?
      // Logic:
      // if (diff > 2) -> diff -= 4.
      // if (diff < -2) -> diff += 4.
      // diff=2. Result 2.
      
      const loopModule = slider.getModule('loop')
      const bestPhysical = (loopModule as any).resolveIndex(3)
      
      expect(bestPhysical).toBe(5)
      
      // Try another one: Go from 2 (Logical 0) to 3 (Logical 3).
      slider.engine.index.set(2)
      // Logical 0 -> 3. Diff = 3.
      // 3 > 2. Diff = 3 - 4 = -1.
      // Physical = 2 - 1 = 1.
      // Slide 1 is Prepend Clone of 3.
      
      const bestPhysical2 = (loopModule as any).resolveIndex(3)
      expect(bestPhysical2).toBe(1)
    })
  })

  describe('loopFix (прыжок)', () => {
    it('должен прыгать из начала в конец (prepend clone)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      // C=2.
      
      // Move to prepend clone (index 0)
      slider.engine.index.set(0)
      
      slider.emit('slideChanged', 0)

      // Should jump to original slide.
      // 0 (Physical) -> Logical 2.
      // Target Physical = C + Logical = 2 + 2 = 4.
      // Slide 4 is Original 2.
      expect(slider.engine.index.get()).toBe(4)
    })

    it('должен прыгать из конца в начало (append clone)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      // C=2. N=4. Total=8.
      // Append Clones start at 6.
      
      // Move to append clone (index 6, Logical 0)
      slider.engine.index.set(6)
      
      slider.emit('slideChanged', 6)

      // Should jump to original first slide.
      // Logical 0. Physical 2.
      expect(slider.engine.index.get()).toBe(2)
    })
  })

  describe('checkClonePosition (бесшовный переход при скролле/драге)', () => {
    it('должен смещать позицию если мы зашли далеко влево (prepend area)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      // C=2.
      
      // Prepend boundary: C - 0.5 = 1.5.
      // We need index < 1.5.
      // Index 1 is Prepend Clone of Logical 3.
      // Pos = -1 * 800 = -800.
      
      // Set position to -800 (Index 1)
      slider.engine.location.set(-800)
      
      // Trigger check
      slider.emit('scroll')
      
      // Logic:
      // 1 < 1.5 -> True.
      // Shift by + N * width = + 4 * 800 = +3200.
      // New pos = -800 + 3200 = 2400.
      // Wait.
      // -800 + 3200 = 2400.
      // Is this right?
      // Index 1 (Logical 3).
      // Original 3 is at Index 5.
      // Pos 5 = -5 * 800 = -4000.
      
      // Why shift logic `position - offset`?
      // Code:
      // if (currentFloatIndex < prependBoundary) {
      //   const offset = this.originalSlidesCount * slideWithGap
      //   const newPosition = position - offset
      
      // If index is small (left side), position is large (close to 0).
      // Wait, positions are negative.
      // Index 1 pos = -800.
      // Index 5 pos = -4000.
      // To go from 1 to 5, we need to SUBTRACT 3200 from -800.
      // -800 - 3200 = -4000.
      
      // In code: `newPosition = position - offset`.
      // offset = 3200.
      // -800 - 3200 = -4000. Correct.
      
      expect(slider.engine.location.get()).toBe(-4000)
    })

    it('должен смещать позицию если мы зашли далеко вправо (append area)', () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        perPage: 1
      })
      // C=2. N=4.
      // Append boundary: N + C - 0.5 = 4 + 2 - 0.5 = 5.5.
      // We need index > 5.5.
      // Index 6 (Logical 0). Pos = -6 * 800 = -4800.
      
      slider.engine.location.set(-4800)
      slider.emit('scroll')
      
      // Logic:
      // 6 > 5.5 -> True.
      // Shift: `newPosition = position + offset`.
      // -4800 + 3200 = -1600.
      // -1600 is Index 2 (Original 0). Correct.
      
      expect(slider.engine.location.get()).toBe(-1600)
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
