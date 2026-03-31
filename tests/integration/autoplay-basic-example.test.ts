/**
 * @vitest-environment happy-dom
 *
 * Регрессия для AutoplayBasicExample из доков:
 * - 4 слайда
 * - perPage: 1, gap: 0, speed: 300, loop: false
 * - autoplay: { delay: 3000, pauseOnHover: true, pauseOnInteraction: true }
 * - pagination: bullets
 *
 * Ожидаемое поведение:
 * - индексы: 0 → 1 → 2 → 3 и стоп (без loop/rewind)
 * - интервалы переключения ≈ delay (с учётом того, что мы в тесте используем fake timers).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import '../../src/modules/autoplay'
import '../../src/modules/pagination'

function createSliderHTML(): string {
  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        <div class="${TVIST_CLASSES.slide}">Slide 1</div>
        <div class="${TVIST_CLASSES.slide}">Slide 2</div>
        <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        <div class="${TVIST_CLASSES.slide}">Slide 4</div>
      </div>
      <div class="${TVIST_CLASSES.pagination}"></div>
    </div>
  `
}

function mockElementWidths(width: number): void {
  Object.defineProperties(HTMLElement.prototype, {
    clientWidth: { configurable: true, get: () => width },
    offsetWidth: { configurable: true, get: () => width },
  })
  // @ts-expect-error мок для getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ width, height: 400, top: 0, left: 0, right: width, bottom: 400 } as DOMRect)
}

describe('Autoplay basic example (docs AutoplayBasicExample)', () => {
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    vi.useFakeTimers()
    mockElementWidths(800)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as any).getBoundingClientRect
  })

  it('should iterate slides 0 → 1 → 2 → 3 with autoplay and then stop', () => {
    host.innerHTML = createSliderHTML()
    const root = host.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement

    const slider = new Tvist(root, {
      perPage: 1,
      gap: 0,
      speed: 300,
      autoplay: { delay: 3000, pauseOnHover: true, pauseOnInteraction: true },
      pagination: {
        type: 'bullets',
        clickable: true,
      },
    })

    expect(slider.activeIndex).toBe(0)

    // 0 -> 1
    vi.advanceTimersByTime(3000)
    expect(slider.activeIndex).toBe(1)

    // 1 -> 2
    vi.advanceTimersByTime(3000)
    expect(slider.activeIndex).toBe(2)

    // 2 -> 3
    vi.advanceTimersByTime(3000)
    expect(slider.activeIndex).toBe(3)

    // Дальше autoplay должен остановиться (граница, без loop/rewind)
    vi.advanceTimersByTime(6000)
    expect(slider.activeIndex).toBe(3)

    slider.destroy()
  })
})

