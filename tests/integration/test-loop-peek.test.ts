import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

describe('loop + peek', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 400
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture.cleanup()
  })

  it('should check transform at index 0', () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 40,
      gap: 16,
      loop: true,
      speed: 0
    })

    console.log('loop: true, index:', slider.activeIndex, 'realIndex:', slider.realIndex)
    console.log('transform:', slider.container.style.transform)
    console.log('slidePositions:', slider.engine.getSlidePositions())
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
  })
})
