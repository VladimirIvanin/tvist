/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/autoplay'

function createSliderMarkup(slidesContent: string[]): string {
  const slides = slidesContent
    .map((content) => `<div class="${TVIST_CLASSES.slide}">${content}</div>`)
    .join('')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.track}">
        <div class="${TVIST_CLASSES.container}">
          ${slides}
        </div>
      </div>
    </div>
  `
}

describe('Stories nested sliders', () => {
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('does not restart from first slide on last story in non-loop mode', async () => {
    host.innerHTML = createSliderMarkup(['story 1', 'story 2'])
    const root = host.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement

    const slider = new Tvist(root, {
      perPage: 1,
      speed: 0,
      loop: false,
    })

    slider.next()
    await Promise.resolve()
    slider.next()
    await Promise.resolve()

    expect(slider.activeIndex).toBe(1)

    slider.destroy()
  })

  it('shows the final story for its full delay before switching the outer group', async () => {
    vi.useFakeTimers()
    host.innerHTML = createSliderMarkup([
      createSliderMarkup(['g1 story 1', 'g1 story 2']),
      createSliderMarkup(['g2 story 1', 'g2 story 2']),
    ])

    const outerRoot = host.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    const outerContainer = outerRoot.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement
    const groupSlides = Array.from(outerContainer.children) as HTMLElement[]
    const innerRoots = groupSlides.map((slide) => slide.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement)

    const outer = new Tvist(outerRoot, {
      perPage: 1,
      speed: 0,
      loop: false,
      autoplay: false,
    })

    const inner0 = new Tvist(innerRoots[0], {
      perPage: 1,
      speed: 0,
      loop: false,
      autoplay: { delay: 100, pauseOnHover: false },
      on: {
        autoplayProgress: ({ index, progress }) => {
          if (index === 1 && progress === 1) outer.scrollTo(1, true)
        },
      },
    })

    await vi.advanceTimersByTimeAsync(100)
    expect(inner0.realIndex).toBe(1)
    expect(outer.activeIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(99)
    expect(outer.activeIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(2)

    expect(outer.activeIndex).toBe(1)
    outer.destroy()
    inner0.destroy()
  })
})
