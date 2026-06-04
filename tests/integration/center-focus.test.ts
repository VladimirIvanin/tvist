/**
 * center: { focus: true } — центрирование активного слайда с trim у краёв (как Splide focus:center).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'

describe('center.focus', () => {
  let fixture: ReturnType<typeof createSliderFixture>
  let slider: Tvist | null = null

  const rootWidth = 600
  const slidesCount = 6

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture?.cleanup()
  })

  function createFocusSlider() {
    fixture = createSliderFixture({
      slidesCount,
      width: rootWidth,
      slideWidth: 200,
      slideHeight: 120,
    })

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { focus: true },
      loop: false,
      speed: 0,
    })

    return slider
  }

  it('первый слайд: позиция min scroll, не «чистый» center offset', () => {
    const s = createFocusSlider()
    const engine = s.engine

    const minScroll = engine.getMinScrollPosition()
    const pos0 = engine.getScrollPositionForIndex(0)
    const rawCenter0 =
      -engine.getSlidePosition(0) + engine.getCenterOffset(0)

    expect(pos0).toBe(minScroll)
    expect(rawCenter0).toBeGreaterThan(minScroll)
  })

  it('средний слайд: центрирование без clamp', () => {
    const s = createFocusSlider()
    const engine = s.engine
    const index = 2

    const base = -engine.getSlidePosition(index)
    const offset = engine.getCenterOffset(index)
    const expected = base + offset

    expect(engine.getScrollPositionForIndex(index)).toBe(expected)
    expect(offset).toBeGreaterThan(0)
  })

  it('последний слайд: позиция max scroll', () => {
    const s = createFocusSlider()
    const engine = s.engine
    const lastIndex = slidesCount - 1

    expect(engine.getScrollPositionForIndex(lastIndex)).toBe(
      engine.getMaxScrollPosition()
    )
  })

  it('scrollTo на краях совпадает с getScrollPositionForIndex', () => {
    const s = createFocusSlider()
    const engine = s.engine

    s.scrollTo(0, true)
    expect(engine.location.get()).toBe(engine.getScrollPositionForIndex(0))

    s.scrollTo(slidesCount - 1, true)
    expect(engine.location.get()).toBe(
      engine.getScrollPositionForIndex(slidesCount - 1)
    )
  })

  it('регрессия center: true — первый слайд с center offset, не min scroll', () => {
    fixture = createSliderFixture({
      slidesCount,
      width: rootWidth,
      slideWidth: 200,
      slideHeight: 120,
    })

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: true,
      loop: false,
      speed: 0,
    })

    const engine = slider.engine
    const centerOffset = engine.getCenterOffset(0)
    const pos0 = engine.getScrollPositionForIndex(0)

    expect(centerOffset).toBeGreaterThan(0)
    expect(pos0).toBe(centerOffset)
    expect(pos0).toBeGreaterThan(engine.getMinScrollPosition())
  })

  it('isCenterFocus / isCenterMode', () => {
    const s = createFocusSlider()
    expect(s.engine.isCenterFocus()).toBe(true)
    expect(s.engine.isCenterActive()).toBe(false)
    expect(s.engine.isCenterMode()).toBe(true)
  })

  it('clampCenterPosition ограничивает позицию', () => {
    const s = createFocusSlider()
    const engine = s.engine
    const min = engine.getMinScrollPosition()
    const max = engine.getMaxScrollPosition()

    expect(engine.clampCenterPosition(min + 1000)).toBe(min)
    expect(engine.clampCenterPosition(max - 1000)).toBe(max)
  })
})
