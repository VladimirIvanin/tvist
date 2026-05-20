import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

describe('loop + peek + clones', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 693.33 // 453.33 + 120 * 2
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture.cleanup()
  })

  it('should not force center alignment when loop with clones is enabled', () => {
    slider = new Tvist(fixture.root, {
      perPage: 3,
      peek: 120,
      gap: 32,
      loop: true,
      speed: 0
    })

    const activeIndex = slider.activeIndex
    const realIndex = slider.realIndex
    const location = slider.engine.location.get()

    console.log('activeIndex:', activeIndex, 'realIndex:', realIndex)
    console.log('location:', location)
    console.log('slide position:', slider.engine.getSlidePosition(activeIndex))

    // Location should be exactly -slidePosition(activeIndex) because center is not active
    expect(location).toBe(-slider.engine.getSlidePosition(activeIndex))
  })
})
