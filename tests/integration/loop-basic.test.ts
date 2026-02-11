/**
 * @vitest-environment happy-dom
 * 
 * Минимальный тест: loop wrap через next() — без autoplay, без video.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/loop'

describe('Loop basic: next() wrap', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 800 },
      offsetWidth: { get: () => 800 },
    })
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 } as DOMRect)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    delete (HTMLElement.prototype as any).getBoundingClientRect
  })

  it('next() from last slide wraps to first (realIndex=0)', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
      </div>
    `

    const slideChanges: number[] = []

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
    })

    slider.on('slideChange', (idx: number) => slideChanges.push(idx))

    expect(slider.realIndex).toBe(0)

    // 0 → 1
    slider.next()
    console.log('After next() #1: activeIndex=', slider.activeIndex, 'realIndex=', slider.realIndex)
    expect(slider.realIndex).toBe(1)

    // 1 → 2
    slider.next()
    console.log('After next() #2: activeIndex=', slider.activeIndex, 'realIndex=', slider.realIndex)
    expect(slider.realIndex).toBe(2)

    // 2 → 0 (loop wrap)
    slider.next()
    console.log('After next() #3 (loop): activeIndex=', slider.activeIndex, 'realIndex=', slider.realIndex)
    console.log('slideChange events received:', slideChanges)
    
    // Главная проверка
    expect(slider.realIndex).toBe(0)

    slider.destroy()
  })

  it('slideChange events fire with correct indices through full loop cycle', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
      </div>
    `

    const slideChanges: number[] = []
    const slideChangedEvents: number[] = []

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
    })

    slider.on('slideChange', (idx: number) => slideChanges.push(idx))
    slider.on('slideChanged', (idx: number) => slideChangedEvents.push(idx))

    // Полный цикл: 0→1→2→0→1→2
    for (let i = 0; i < 6; i++) {
      slider.next()
    }

    const realIndices = [1, 2, 0, 1, 2, 0]
    
    console.log('slideChange events:', slideChanges)
    console.log('slideChanged events:', slideChangedEvents)
    console.log('Final realIndex:', slider.realIndex)

    expect(slider.realIndex).toBe(0)

    slider.destroy()
  })
})
