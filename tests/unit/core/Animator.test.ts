import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Animator, easings, throttle } from '../../../src/core/Animator'

describe('Animator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('animate', () => {
    it('should animate from start to end value', () => {
      const animator = new Animator()
      const onUpdate = vi.fn()
      const onComplete = vi.fn()

      animator.animate(0, 100, 1000, onUpdate, onComplete)

      // Начало анимации (первый RAF)
      vi.advanceTimersByTime(16)
      expect(onUpdate).toHaveBeenCalled()

      // Середина
      vi.advanceTimersByTime(500)
      expect(onUpdate.mock.calls.length).toBeGreaterThan(1)

      // Конец - завершаем анимацию
      vi.advanceTimersByTime(1000)
      expect(onComplete).toHaveBeenCalled()
    })

    it('should apply easing function', () => {
      const animator = new Animator()
      const values: number[] = []

      animator.animate(
        0,
        100,
        1000,
        (value) => values.push(value),
        undefined,
        easings.linear
      )

      // Запускаем frames
      for (let i = 0; i <= 1000; i += 16) {
        vi.advanceTimersByTime(16)
      }

      // С linear easing значения должны расти линейно
      expect(values.length).toBeGreaterThan(0)
      // Последнее значение должно быть близко к 100
      expect(values[values.length - 1]).toBeGreaterThanOrEqual(95)
    })

    it('should complete instantly when duration is 0', () => {
      const animator = new Animator()
      const onUpdate = vi.fn()
      const onComplete = vi.fn()

      animator.animate(0, 100, 0, onUpdate, onComplete)

      expect(onUpdate).toHaveBeenCalledWith(100)
      expect(onComplete).toHaveBeenCalled()
      expect(animator.isAnimating()).toBe(false)
    })

    it('should stop previous animation before starting new one', () => {
      const animator = new Animator()
      const onComplete1 = vi.fn()
      const onComplete2 = vi.fn()

      animator.animate(0, 100, 1000, () => {}, onComplete1)
      
      // Запускаем вторую анимацию до завершения первой
      for (let i = 0; i < 30; i++) vi.advanceTimersByTime(16) // ~500ms
      
      animator.animate(0, 200, 1000, () => {}, onComplete2)

      // Завершаем вторую анимацию
      for (let i = 0; i < 70; i++) vi.advanceTimersByTime(16) // ~1000ms

      // Первая не должна завершиться
      expect(onComplete1).not.toHaveBeenCalled()
      // Вторая должна завершиться
      expect(onComplete2).toHaveBeenCalled()
    })

    it('should work without onComplete callback', () => {
      const animator = new Animator()
      const onUpdate = vi.fn()

      expect(() => {
        animator.animate(0, 100, 1000, onUpdate)
        vi.advanceTimersByTime(1000)
      }).not.toThrow()
    })

    it('should animate negative values', () => {
      const animator = new Animator()
      const onUpdate = vi.fn()

      animator.animate(100, -100, 1000, onUpdate, undefined, easings.linear)

      // Запускаем frames
      for (let i = 0; i <= 1000; i += 16) {
        vi.advanceTimersByTime(16)
      }

      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1]
      expect(lastCall[0]).toBeLessThanOrEqual(-95)
    })
  })

  describe('stop', () => {
    it('should stop ongoing animation', () => {
      const animator = new Animator()
      const onUpdate = vi.fn()
      const onComplete = vi.fn()

      animator.animate(0, 100, 1000, onUpdate, onComplete)
      
      for (let i = 0; i < 30; i++) vi.advanceTimersByTime(16) // ~500ms
      animator.stop()
      
      const callsBeforeStop = onUpdate.mock.calls.length
      for (let i = 0; i < 30; i++) vi.advanceTimersByTime(16) // +500ms

      expect(onUpdate.mock.calls.length).toBe(callsBeforeStop)
      expect(onComplete).not.toHaveBeenCalled()
      expect(animator.isAnimating()).toBe(false)
    })

    it('should be safe to call when no animation is running', () => {
      const animator = new Animator()
      expect(() => animator.stop()).not.toThrow()
    })

    it('should be safe to call multiple times', () => {
      const animator = new Animator()
      animator.animate(0, 100, 1000, () => {})
      
      expect(() => {
        animator.stop()
        animator.stop()
        animator.stop()
      }).not.toThrow()
    })
  })

  describe('isAnimating', () => {
    it('should return false initially', () => {
      const animator = new Animator()
      expect(animator.isAnimating()).toBe(false)
    })

    it('should return true during animation', () => {
      const animator = new Animator()
      animator.animate(0, 100, 1000, () => {})
      
      for (let i = 0; i < 30; i++) vi.advanceTimersByTime(16) // ~500ms
      expect(animator.isAnimating()).toBe(true)
    })

    it('should return false after animation completes', () => {
      const animator = new Animator()
      animator.animate(0, 100, 1000, () => {})
      
      // Завершаем анимацию полностью (+ небольшой запас)
      for (let i = 0; i <= 1100; i += 16) {
        vi.advanceTimersByTime(16)
      }
      expect(animator.isAnimating()).toBe(false)
    })

    it('should return false after stop', () => {
      const animator = new Animator()
      animator.animate(0, 100, 1000, () => {})
      
      for (let i = 0; i < 30; i++) vi.advanceTimersByTime(16) // ~500ms
      animator.stop()
      
      expect(animator.isAnimating()).toBe(false)
    })
  })

  describe('easings', () => {
    it('linear should return input', () => {
      expect(easings.linear(0)).toBe(0)
      expect(easings.linear(0.5)).toBe(0.5)
      expect(easings.linear(1)).toBe(1)
    })

    it('easeInQuad should accelerate', () => {
      expect(easings.easeInQuad(0)).toBe(0)
      expect(easings.easeInQuad(0.5)).toBeLessThan(0.5)
      expect(easings.easeInQuad(1)).toBe(1)
    })

    it('easeOutQuad should decelerate', () => {
      expect(easings.easeOutQuad(0)).toBe(0)
      expect(easings.easeOutQuad(0.5)).toBeGreaterThan(0.5)
      expect(easings.easeOutQuad(1)).toBe(1)
    })

    it('easeOutQuint should strongly decelerate', () => {
      expect(easings.easeOutQuint(0)).toBe(0)
      expect(easings.easeOutQuint(0.5)).toBeGreaterThan(0.5)
      expect(easings.easeOutQuint(1)).toBe(1)
    })

    it('all easings should start at 0 and end at 1', () => {
      Object.values(easings).forEach(easing => {
        expect(easing(0)).toBe(0)
        expect(easing(1)).toBe(1)
      })
    })
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call function immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should throttle subsequent calls', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call function after delay period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled() // 1st call
    vi.advanceTimersByTime(500)
    throttled() // throttled
    
    vi.advanceTimersByTime(500) // Total 1000ms from first call
    
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should pass arguments to function', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled('arg1', 42, { key: 'value' })

    expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
  })

  it('should use latest arguments for scheduled call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled('first')
    throttled('second')
    throttled('third')

    vi.advanceTimersByTime(1000)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'first')
    expect(fn).toHaveBeenNthCalledWith(2, 'third')
  })

  it('should allow calls after throttle period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 1000)

    throttled() // Call 1
    vi.advanceTimersByTime(1000)
    throttled() // Call 2 (allowed after delay)
    vi.advanceTimersByTime(1000)
    throttled() // Call 3

    expect(fn).toHaveBeenCalledTimes(3)
  })
})

