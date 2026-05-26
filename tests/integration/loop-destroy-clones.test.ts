import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/index'
import { createSliderFixture } from '../fixtures/dom'

describe('LoopModule destroy clones bug', () => {
  let root: HTMLElement
  let tvist: Tvist
  let cleanup: () => void

  beforeEach(() => {
    const fixture = createSliderFixture({ slidesCount: 3 })
    root = fixture.root
    cleanup = fixture.cleanup
  })

  afterEach(() => {
    if (tvist) {
      tvist.destroy()
    }
    cleanup()
  })

  it('should remove clones on destroy and not multiply them on re-init', () => {
    tvist = new Tvist(root, {
      loop: {
        enabled: true,
        withClones: true
      },
      perPage: 1
    })

    const initialSlidesCount = tvist.slides.length
    expect(initialSlidesCount).toBeGreaterThan(3) // 3 original + clones

    tvist.destroy()

    // After destroy, only the 3 original slides should remain
    const slidesAfterDestroy = root.querySelectorAll('.tvist-v1__slide')
    expect(slidesAfterDestroy.length).toBe(3)

    // Re-init
    tvist = new Tvist(root, {
      loop: {
        enabled: true,
        withClones: true
      },
      perPage: 1
    })

    // Should have the same number of slides as the first initialization
    expect(tvist.slides.length).toBe(initialSlidesCount)
  })
})
