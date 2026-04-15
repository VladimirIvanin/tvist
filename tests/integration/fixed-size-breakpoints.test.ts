/**
 * @vitest-environment happy-dom
 *
 * fixedWidth / fixedHeight и breakpoints (window + container).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import { createSliderFixture, resizeSlider } from '../fixtures'
import '../../src/modules/breakpoints'

function setWindowWidth(width: number): void {
  window.innerWidth = width
}

/** Синхронизирует track/container с root — Engine читает размеры track. */
function syncTrackToRoot(root: HTMLElement, width: number, height: number): void {
  const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement | null
  const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement | null
  if (!track || !container) return

  for (const el of [track, container]) {
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: width })
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: height })
  }
}

describe('fixedWidth / fixedHeight и breakpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('window-based: fixedWidth', () => {
    let fixture: ReturnType<typeof createSliderFixture>
    let root: HTMLElement

    beforeEach(() => {
      fixture = createSliderFixture({ slidesCount: 8, width: 1000, height: 400 })
      root = fixture.root
      syncTrackToRoot(root, 1000, 400)
      setWindowWidth(1200)
    })

    afterEach(() => {
      fixture.cleanup()
    })

    it('пересчитывает perPage и slideSize при смене breakpoint (другой fixedWidth)', () => {
      const slider = new Tvist(root, {
        gap: 0,
        fixedWidth: 250,
        breakpoints: {
          768: { fixedWidth: 200 },
        },
      })

      expect(slider.options.fixedWidth).toBe(250)
      expect(slider.options.perPage).toBe(4)
      expect(slider.engine.slideSizeValue).toBe(250)

      setWindowWidth(700)
      slider.update()

      expect(slider.options.fixedWidth).toBe(200)
      expect(slider.options.perPage).toBe(5)
      expect(slider.engine.slideSizeValue).toBe(200)

      setWindowWidth(1200)
      slider.update()

      expect(slider.options.fixedWidth).toBe(250)
      expect(slider.options.perPage).toBe(4)
      expect(slider.engine.slideSizeValue).toBe(250)

      slider.destroy()
    })

    it('учитывает gap после смены breakpoint', () => {
      const slider = new Tvist(root, {
        gap: 20,
        fixedWidth: 300,
        breakpoints: {
          768: { fixedWidth: 200, gap: 10 },
        },
      })

      // (1000 + 20) / (300 + 20) = 3
      expect(slider.options.perPage).toBe(3)
      expect(slider.engine.slideSizeValue).toBe(300)

      setWindowWidth(700)
      slider.update()

      // (1000 + 10) / (200 + 10) = 4
      expect(slider.options.gap).toBe(10)
      expect(slider.options.perPage).toBe(4)
      expect(slider.engine.slideSizeValue).toBe(200)

      slider.destroy()
    })
  })

  describe('window-based: fixedHeight (vertical)', () => {
    let fixture: ReturnType<typeof createSliderFixture>
    let root: HTMLElement

    beforeEach(() => {
      fixture = createSliderFixture({ slidesCount: 8, width: 600, height: 500 })
      root = fixture.root
      syncTrackToRoot(root, 600, 500)
      setWindowWidth(1200)
    })

    afterEach(() => {
      fixture.cleanup()
    })

    it('пересчитывает perPage при смене fixedHeight в breakpoints', () => {
      const slider = new Tvist(root, {
        direction: 'vertical',
        gap: 10,
        fixedHeight: 150,
        breakpoints: {
          768: { fixedHeight: 100 },
        },
      })

      // (500 + 10) / (150 + 10) = 3
      expect(slider.options.perPage).toBe(3)
      expect(slider.engine.slideSizeValue).toBe(150)

      setWindowWidth(700)
      slider.update()

      // (500 + 10) / (100 + 10) = 4
      expect(slider.options.perPage).toBe(4)
      expect(slider.engine.slideSizeValue).toBe(100)

      setWindowWidth(1200)
      slider.update()

      expect(slider.options.perPage).toBe(3)
      expect(slider.engine.slideSizeValue).toBe(150)

      slider.destroy()
    })
  })

  describe('container-based: fixedWidth', () => {
    let fixture: ReturnType<typeof createSliderFixture>
    let root: HTMLElement

    beforeEach(() => {
      fixture = createSliderFixture({ slidesCount: 6, width: 900, height: 400 })
      root = fixture.root
      syncTrackToRoot(root, 900, 400)
    })

    afterEach(() => {
      fixture.cleanup()
    })

    it('меняет perPage при смене контейнера и другом fixedWidth в breakpoint', () => {
      resizeSlider(root, 900)
      syncTrackToRoot(root, 900, 400)

      const slider = new Tvist(root, {
        breakpointsBase: 'container',
        gap: 0,
        fixedWidth: 300,
        breakpoints: {
          600: { fixedWidth: 200 },
        },
      })

      expect(slider.options.perPage).toBe(3)
      expect(slider.engine.slideSizeValue).toBe(300)

      resizeSlider(root, 550)
      syncTrackToRoot(root, 550, 400)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      slider.update()

      expect(slider.options.fixedWidth).toBe(200)
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.slideSizeValue).toBe(200)

      resizeSlider(root, 900)
      syncTrackToRoot(root, 900, 400)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      slider.update()

      expect(slider.options.fixedWidth).toBe(300)
      expect(slider.options.perPage).toBe(3)
      expect(slider.engine.slideSizeValue).toBe(300)

      slider.destroy()
    })
  })
})
