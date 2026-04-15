/**
 * @vitest-environment happy-dom
 *
 * Слайд с display: none не должен участвовать в расчётах (как Swiper updateSlides).
 */

import { describe, it, expect } from 'vitest'
import { Tvist } from '@core/Tvist'
import { createSliderFixture } from '../fixtures'

describe('слайд скрыт через CSS display: none', () => {
  it('не входит в slides / endIndex; scroll и границы как у укороченного списка', () => {
    const fixture = createSliderFixture({
      slidesCount: 4,
      width: 1000,
      height: 400,
      slideWidth: 1000,
    })

    // «Внешний» стиль: не через API слайдера
    fixture.slides[1]!.style.display = 'none'

    const slider = new Tvist(fixture.root, {
      speed: 0,
      gap: 0,
    })

    expect(slider.slides).toHaveLength(3)
    expect(slider.slideCount).toBe(3)
    expect(slider.slides.map((s) => fixture.slides.indexOf(s))).toEqual([0, 2, 3])

    expect(slider.activeIndex).toBe(0)
    expect(slider.canScrollPrev).toBe(false)
    expect(slider.canScrollNext).toBe(true)

    expect(slider.engine.getSlidePositions()).toHaveLength(3)
    expect(slider.engine.getSlidePositions()[2]).toBe(2000)
    expect(slider.engine.getMaxScrollPosition()).toBe(-2000)

    slider.scrollTo(2, true)
    expect(slider.activeIndex).toBe(2)
    expect(slider.canScrollNext).toBe(false)

    slider.destroy()
    fixture.cleanup()
  })
})
