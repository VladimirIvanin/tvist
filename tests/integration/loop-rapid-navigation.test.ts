import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import '@modules/loop'
import '@modules/navigation'
import '@modules/pagination'
import '@modules/autoplay'
import { createSliderFixture, type SliderFixture } from '../fixtures'

describe('Loop rapid navigation', () => {
  let fixture: SliderFixture
  let slider: Tvist
  let prev: HTMLButtonElement
  let next: HTMLButtonElement

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    fixture = createSliderFixture({ slidesCount: 3, width: 800 })
    prev = document.createElement('button')
    prev.className = TVIST_CLASSES.arrowPrev
    next = document.createElement('button')
    next.className = TVIST_CLASSES.arrowNext
    const pagination = document.createElement('div')
    pagination.className = TVIST_CLASSES.pagination
    fixture.root.append(prev, next, pagination)

    slider = new Tvist(fixture.root, {
      perPage: 1,
      loop: true,
      autoplay: { delay: 2600, pauseOnHover: true },
      arrows: true,
      pagination: true,
    })
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
    vi.useRealTimers()
  })

  it.each(['prev', 'next'] as const)(
    'keeps the viewport covered during repeated %s clicks and resumes autoplay',
    async (direction) => {
      fixture.root.dispatchEvent(new MouseEvent('mouseenter'))
      const button = direction === 'prev' ? prev : next
      const sign = direction === 'prev' ? -1 : 1
      const ended = vi.fn()
      slider.on('transitionEnd', ended)

      for (let i = 0; i < 60; i++) {
        button.click()
        const position = slider.engine.location.get()
        expect(position).toBeLessThanOrEqual(0)
        expect(position).toBeGreaterThanOrEqual(slider.engine.getMaxScrollPosition())
        await vi.advanceTimersByTimeAsync(20)
      }

      // Continuous clicking must let transitions finish, rather than restart each time.
      expect(ended).toHaveBeenCalled()
      expect(slider.realIndex).toBe(((sign * 4) % 3 + 3) % 3)
      await vi.advanceTimersByTimeAsync(300)
      expect(slider.engine.animator.isAnimating()).toBe(false)
      expect(slider.engine.location.get()).toBe(slider.engine.target.get())
      const bullets = fixture.root.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bullets[slider.realIndex]?.classList.contains(TVIST_CLASSES.bulletActive)).toBe(true)

      const previousIndex = slider.realIndex
      fixture.root.dispatchEvent(new MouseEvent('mouseleave'))
      await vi.advanceTimersByTimeAsync(3000)
      expect(slider.realIndex).toBe((previousIndex + 1) % 3)
      expect(slider.engine.animator.isAnimating()).toBe(false)
    }
  )

  it('allows changing direction before the current transition finishes', async () => {
    prev.click()
    await vi.advanceTimersByTimeAsync(60)
    next.click()
    expect(slider.realIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(300)
    expect(slider.engine.animator.isAnimating()).toBe(false)
    expect(slider.engine.location.get()).toBe(slider.engine.target.get())
  })

  it('allows every step when transitions are instant', () => {
    slider.updateOptions({ speed: 0 })
    for (let i = 1; i <= 10; i++) {
      prev.click()
      expect(slider.realIndex).toBe(((3 - i) % 3 + 3) % 3)
    }
    expect(slider.engine.animator.isAnimating()).toBe(false)
  })

  it('allows repeated steps during transitions without loop', async () => {
    slider.updateOptions({ loop: false })
    next.click()
    await vi.advanceTimersByTimeAsync(20)
    next.click()
    expect(slider.realIndex).toBe(2)
    await vi.advanceTimersByTimeAsync(300)
    expect(slider.engine.animator.isAnimating()).toBe(false)
  })
})
