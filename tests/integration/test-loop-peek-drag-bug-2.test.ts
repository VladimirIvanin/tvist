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

  it('should not jump on drag and release', () => {
    slider = new Tvist(fixture.root, {
      perPage: 1,
      peek: 40,
      gap: 16,
      loop: true,
      speed: 0
    })
    
    const drag = slider.modules.get('drag') as any
    drag.onPointerDown({ target: fixture.root, clientX: 200, clientY: 0, preventDefault: () => {} } as any)
    drag.onPointerMove({ target: fixture.root, clientX: 210, clientY: 0, preventDefault: () => {} } as any)
    drag.onPointerUp({ target: fixture.root, clientX: 210, clientY: 0, preventDefault: () => {} } as any)
    
    console.log('AFTER DRAG AND RELEASE:')
    console.log('index:', slider.activeIndex, 'realIndex:', slider.realIndex)
    console.log('transform:', slider.container.style.transform)
  })
})
