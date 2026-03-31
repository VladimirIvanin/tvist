/**
 * @vitest-environment happy-dom
 *
 * Локализация бага: Autoplay + window breakpoints + 4 слайда.
 *
 * Сценарий (мобильный):
 * - 4 слайда, base perPage: 2, breakpoint 768: perPage: 1
 * - autoplay включён, loop/rewind выключены
 * Ожидаемое поведение: индексы 0 → 1 → 2 → 3 и стоп.
 * Наблюдаемый баг: автоплей доходит до индекса 1 и останавливается, хотя слайдов 4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import '../../src/modules/autoplay'
import '../../src/modules/breakpoints'

function createSliderHTML(slideCount: number): string {
  const slides = Array.from(
    { length: slideCount },
    (_, i) => `<div class="${TVIST_CLASSES.slide}" style="width:100px">Slide ${i + 1}</div>`,
  ).join('\n')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        ${slides}
      </div>
    </div>
  `
}

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
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

describe('Autoplay + window breakpoints — 4 slides mobile scenario', () => {
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    vi.useFakeTimers()
    mockElementWidths(320)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as any).getBoundingClientRect
  })

  it('autoplay should advance through all 4 slides on mobile (perPage=1)', () => {
    // Мобильная ширина — активен breakpoint 768
    setWindowWidth(360)

    host.innerHTML = createSliderHTML(4)
    const root = host.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement

    const slider = new Tvist(root, {
      // Десктопная конфигурация: 2 слайда на странице
      perPage: 2,
      autoplay: 1000,
      loop: false,
      rewind: false,
      speed: 0,
      breakpoints: {
        // Мобильный: один слайд на странице
        768: {
          perPage: 1,
        },
      },
    })

    // Проверяем, что breakpoint применился и perPage=1
    expect(slider.options.perPage).toBe(1)
    expect(slider.activeIndex).toBe(0)

    // Первый тик — переходим на второй слайд
    vi.advanceTimersByTime(1000)
    expect(slider.activeIndex).toBe(1)

    // Второй тик — ожидаем переход на третий слайд
    vi.advanceTimersByTime(1000)
    expect(slider.activeIndex).toBe(2)

    // Третий тик — ожидаем переход на четвёртый слайд (индекс 3)
    vi.advanceTimersByTime(1000)
    expect(slider.activeIndex).toBe(3)

    // Четвёртый тик — остаёмся на последнем слайде, autoplay должен остановиться
    vi.advanceTimersByTime(1000)
    expect(slider.activeIndex).toBe(3)

    slider.destroy()
  })
})

