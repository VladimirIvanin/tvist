import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { DragModule } from '../../src/modules/drag/DragModule'
import { createSliderFixture, simulateDrag, type SliderFixture } from '../fixtures'

Tvist.registerModule('drag', DragModule)

describe('Drag rewind duration', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 800 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
    vi.restoreAllMocks()
  })

  it('should use default speed (not drag distance based) when rewinding via drag', async () => {
    slider = new Tvist(fixture.root, {
      rewind: true,
      rewindByDrag: true,
      speed: 300,
      drag: true
    })

    const animateSpy = vi.spyOn(slider.engine.animator, 'animate')

    // Go to last slide
    slider.scrollTo(4, true)
    expect(slider.engine.activeIndex).toBe(4)
    animateSpy.mockClear()

    // Drag forward (deltaX < 0 is next) past the last slide
    // Drag forward (deltaX < 0 is next) past the last slide
    await simulateDrag({
      element: fixture.root,
      startX: 500,
      deltaX: -300, // Move left by 300px
      steps: 10,
      duration: 100
    })

    // Advance real timers to allow the snap logic to trigger scrollTo
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(slider.engine.activeIndex).toBe(0)
    expect(animateSpy).toHaveBeenCalled()
    
    // The duration is the 3rd argument to animate
    const durationArg = animateSpy.mock.calls[0][2]
    expect(durationArg).toBe(300)
  })

  it('should use speed for snap duration after drag (not distance-based minimum)', async () => {
    slider = new Tvist(fixture.root, {
      speed: 400,
      drag: true,
    })

    const animateSpy = vi.spyOn(slider.engine.animator, 'animate')
    animateSpy.mockClear()

    await simulateDrag({
      element: fixture.root,
      startX: 500,
      deltaX: -300,
      steps: 10,
      duration: 100,
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(animateSpy).toHaveBeenCalled()
    const durationArg = animateSpy.mock.calls[0]?.[2]
    expect(durationArg).toBe(400)
  })
})