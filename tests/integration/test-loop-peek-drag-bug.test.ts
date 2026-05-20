import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

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

  it('should not jump on small drag', () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 40,
      gap: 16,
      loop: true,
      speed: 0
    })

    console.log('INIT:')
    console.log('index:', slider.activeIndex, 'realIndex:', slider.realIndex)
    console.log('transform:', slider.container.style.transform)
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
    
    // Simulate small drag to left (moving right)
    const drag = slider.modules.get('drag') as any
    drag.onPointerDown({ target: fixture.root, clientX: 200, clientY: 0, preventDefault: () => {} } as any)
    drag.onPointerMove({ target: fixture.root, clientX: 210, clientY: 0, preventDefault: () => {} } as any)
    
    console.log('\nAFTER SMALL DRAG (10px right):')
    console.log('transform:', slider.container.style.transform)
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
    
    drag.onPointerMove({ target: fixture.root, clientX: 220, clientY: 0, preventDefault: () => {} } as any)
    
    console.log('\nAFTER SMALL DRAG (20px right):')
    console.log('transform:', slider.container.style.transform)
    console.log('slides order:', Array.from(slider.slides).map(s => s.textContent))
  })
})
