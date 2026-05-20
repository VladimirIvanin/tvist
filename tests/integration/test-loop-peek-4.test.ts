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

  it('should check drag to left', () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 40,
      gap: 16,
      loop: true,
      speed: 0
    })

    console.log('loop: true, index:', slider.activeIndex, 'realIndex:', slider.realIndex)
    console.log('transform:', slider.container.style.transform)
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
    
    // Simulate drag to left (moving right)
    slider.modules.get('drag').onPointerDown({ target: fixture.root, clientX: 200, clientY: 0, preventDefault: () => {} } as any)
    slider.modules.get('drag').onPointerMove({ target: fixture.root, clientX: 300, clientY: 0, preventDefault: () => {} } as any)
    
    console.log('after drag, transform:', slider.container.style.transform)
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
  })
})
