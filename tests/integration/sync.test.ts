/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { createSliderFixture } from '../fixtures'

describe('Tvist.sync', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls scrollTo on partner even when activeIndex already matches (re-align translate)', () => {
    const fa = createSliderFixture({ slidesCount: 4, width: 300, slideWidth: 100 })
    const fb = createSliderFixture({ slidesCount: 4, width: 300, slideWidth: 100 })
    const main = new Tvist(fa.root, { speed: 0, drag: false })
    const thumbs = new Tvist(fb.root, { speed: 0, drag: false })
    main.sync(thumbs)

    const spy = vi.spyOn(thumbs, 'scrollTo')
    thumbs.scrollTo(1, true)
    spy.mockClear()

    main.emit('slideChangeStart', 1)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('reverse: main receives scrollTo when its index already matches', () => {
    const fa = createSliderFixture({ slidesCount: 3, width: 300, slideWidth: 100 })
    const fb = createSliderFixture({ slidesCount: 3, width: 300, slideWidth: 100 })
    const main = new Tvist(fa.root, { speed: 0, drag: false })
    const thumbs = new Tvist(fb.root, { speed: 0, drag: false })
    main.sync(thumbs)

    const spy = vi.spyOn(main, 'scrollTo')
    main.scrollTo(2, true)
    spy.mockClear()

    thumbs.emit('slideChangeStart', 2)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(2)
  })
})
