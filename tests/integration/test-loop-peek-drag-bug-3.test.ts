import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture, simulateDrag } from '../fixtures'

describe('loop + peek drag bug', () => {
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

  it('should snap to next slide on large drag', async () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 40,
      gap: 16,
      loop: true,
      speed: 0
    })
    
    await simulateDrag({ element: fixture.root, startX: 300, deltaX: -200, steps: 10 })
    await new Promise(r => setTimeout(r, 50))
    
    console.log('AFTER LARGE DRAG LEFT:')
    console.log('index:', slider.activeIndex, 'realIndex:', slider.realIndex)
    console.log('transform:', slider.container.style.transform)
  })
})
