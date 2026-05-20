import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

describe('peekTrim', () => {
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
      peekTrim: true,
      speed: 0
    })

    console.log('peekTrim: true, index 0, transform:', slider.container.style.transform)
    console.log('cachedMinScroll:', slider.engine.getMinScrollPosition())
    console.log('paddingLeft:', fixture.track.style.paddingLeft)
    
    slider.scrollTo(4, true)
    console.log('peekTrim: true, index 4, transform:', slider.container.style.transform)
    console.log('cachedMaxScroll:', slider.engine.getMaxScrollPosition())
  })
})
