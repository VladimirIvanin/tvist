import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { DragModule } from '../../src/modules/drag/DragModule'
import { createSliderFixture, simulateDrag, type SliderFixture } from '../fixtures'

Tvist.registerModule('drag', DragModule)

describe('rewindByDrag', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 800 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
  })

  const dragForwardPastLastSlide = () =>
    simulateDrag({
      element: fixture.root,
      startX: 500,
      deltaX: -300,
      steps: 10,
      duration: 100
    })

  it('should default rewindByDrag to false and not rewind on drag', async () => {
    slider = new Tvist(fixture.root, {
      rewind: true,
      drag: true,
      speed: 0
    })

    expect(slider.options.rewindByDrag).toBe(false)

    slider.scrollTo(4, true)
    expect(slider.engine.activeIndex).toBe(4)

    await dragForwardPastLastSlide()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(slider.engine.activeIndex).toBe(4)
  })

  it('should not rewind on drag when rewindByDrag is explicitly false', async () => {
    slider = new Tvist(fixture.root, {
      rewind: true,
      rewindByDrag: false,
      drag: true,
      speed: 0
    })

    slider.scrollTo(4, true)
    await dragForwardPastLastSlide()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(slider.engine.activeIndex).toBe(4)
  })

  it('should still rewind via next() when rewindByDrag is false', () => {
    slider = new Tvist(fixture.root, {
      rewind: true,
      rewindByDrag: false,
      drag: true,
      speed: 0
    })

    slider.scrollTo(4, true)
    expect(slider.engine.activeIndex).toBe(4)

    slider.next()

    expect(slider.engine.activeIndex).toBe(0)
  })
})
