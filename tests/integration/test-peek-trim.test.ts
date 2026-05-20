import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

describe('peekTrim', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1000
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture.cleanup()
  })

  it('should trim peek on the last slide', () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 100,
      peekTrim: true,
      speed: 0
    })

    slider.scrollTo(3, true) // Go to last slide
    
    const location = slider.engine.location.get()
    const maxScroll = slider.engine.getMaxScrollPosition()
    
    expect(location).toBe(maxScroll)
    
    // Check if there is a gap on the right
    const viewportSize = slider.engine.containerSizeValue
    const vpRight = -location + viewportSize
    
    let contentRight = -Infinity
    for (let i = 0; i < slider.slides.length; i++) {
      const pos = slider.engine.getSlidePosition(i)
      const size = slider.engine.getSlideSize(i)
      if (pos + size > contentRight) contentRight = pos + size
    }
    
    const rightGap = Math.max(0, vpRight - contentRight)
    console.log({ location, maxScroll, viewportSize, vpRight, contentRight, rightGap })
  })
})
