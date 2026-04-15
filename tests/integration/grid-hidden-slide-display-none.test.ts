/**
 * @vitest-environment happy-dom
 *
 * Слайд с display: none не должен ломать GridModule: страницы и ячейки
 * считаются только по видимым слайдам (как Swiper updateSlides).
 */

import { describe, it, expect } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import { createSliderFixture } from '../fixtures'
import '../../src/modules/grid'

describe('grid и слайд с display: none', () => {
  it('строит страницы по видимым слайдам и даёт листать без ошибок', () => {
    const fixture = createSliderFixture({
      slidesCount: 8,
      width: 1000,
      height: 400,
      slideWidth: 1000,
    })

    const hiddenIndex = 2
    fixture.slides[hiddenIndex]!.style.display = 'none'

    const slider = new Tvist(fixture.root, {
      speed: 0,
      gap: 0,
      grid: { rows: 2, cols: 2 },
    })

    const pages = fixture.root.querySelectorAll<HTMLElement>(
      `.${TVIST_CLASSES.slideGridPage}`
    )
    expect(pages.length).toBe(2)
    expect(slider.slides).toHaveLength(2)

    const itemsFirst = pages[0]!.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
    const itemsSecond = pages[1]!.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
    expect(itemsFirst.length).toBe(4)
    expect(itemsSecond.length).toBe(3)

    expect([...itemsFirst].map((el) => el.textContent)).toEqual([
      'Slide 1',
      'Slide 2',
      'Slide 4',
      'Slide 5',
    ])
    expect([...itemsSecond].map((el) => el.textContent)).toEqual([
      'Slide 6',
      'Slide 7',
      'Slide 8',
    ])

    pages.forEach((page, i) => {
      Object.defineProperty(page, 'offsetWidth', { configurable: true, value: 1000 })
      Object.defineProperty(page, 'offsetLeft', { configurable: true, value: i * 1000 })
    })
    slider.update()

    expect(slider.activeIndex).toBe(0)
    expect(slider.canScrollNext).toBe(true)

    slider.scrollTo(1, true)
    expect(slider.activeIndex).toBe(1)
    expect(slider.canScrollNext).toBe(false)

    slider.destroy()
    fixture.cleanup()
  })
})
