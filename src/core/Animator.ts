/**
 * RAF-based анимации с easing функциями
 * Основано на паттернах из Keen Slider и Embla
 */

export type EasingFunction = (t: number) => number

/**
 * Встроенные easing функции
 */
export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
} as const

export class Animator {
  private animationId: number | null = null
  private startTime = 0
  private isRunning = false

  /**
   * Запустить анимацию
   * @param from - начальное значение
   * @param to - конечное значение
   * @param duration - длительность в мс
   * @param onUpdate - callback для обновления (принимает текущее значение)
   * @param onComplete - callback при завершении (опционально)
   * @param easing - функция easing (по умолчанию easeOutQuad)
   */
  animate(
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void,
    easing: EasingFunction = easings.easeOutQuad
  ): void {
    // Останавливаем предыдущую анимацию
    this.stop()

    // Если duration = 0, сразу устанавливаем конечное значение
    if (duration === 0) {
      onUpdate(to)
      onComplete?.()
      return
    }

    this.isRunning = true
    const distance = to - from

    const animate = (currentTime: number) => {
      if (!this.startTime) {
        this.startTime = currentTime
      }

      const elapsed = currentTime - this.startTime
      const progress = Math.min(elapsed / duration, 1)

      // Применяем easing
      const easedProgress = easing(progress)
      const currentValue = from + distance * easedProgress

      onUpdate(currentValue)

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.isRunning = false
        this.startTime = 0
        onComplete?.()
      }
    }

    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * Остановить текущую анимацию
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.isRunning = false
    this.startTime = 0
  }

  /**
   * Проверить, выполняется ли анимация
   */
  isAnimating(): boolean {
    return this.isRunning
  }
}

/**
 * Throttle функция для ограничения частоты вызовов
 * Полезна для производительности при частых событиях
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  delay: number
): (...args: Args) => void {
  let lastCall = 0
  let timeout: number | null = null

  return function throttled(...args: Args) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    const callFunction = () => {
      lastCall = now
      fn(...args)
    }

    if (timeSinceLastCall >= delay) {
      callFunction()
    } else {
      // Планируем вызов на конец периода
      if (timeout !== null) {
        clearTimeout(timeout)
      }
      timeout = window.setTimeout(() => {
        callFunction()
        timeout = null
      }, delay - timeSinceLastCall)
    }
  }
}

