import type { createResources } from '../utils/resources';
/**
 * RAF-based анимации с easing функциями
 * Основано на паттернах из Keen Slider и Embla
 */

export type EasingFunction = (t: number) => number;

/**
 * Встроенные easing функции
 */
export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => --t * t * t + 1,
  /** Как easing в Splide Scroll (free + snap) */
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
} as const;

export class Animator {
  private __tvistInternal_animationId: number | null = null;
  private __tvistInternal_startTime = 0;
  private __tvistInternal_isRunning = false;
  private __tvistInternal_externalIsAnimating?: () => boolean;
  private __tvistInternal_externalStop?: () => void;

  /** Подключить переход, которым управляет браузер, к прежнему состоянию Animator. */
  setExternalController(isAnimating: () => boolean, stop: () => void): void {
    this.__tvistInternal_externalIsAnimating = isAnimating;
    this.__tvistInternal_externalStop = stop;
  }

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
    this.stop();

    // Если duration = 0, сразу устанавливаем конечное значение
    if (duration === 0) {
      onUpdate(to);
      onComplete?.();
      return;
    }

    this.__tvistInternal_isRunning = true;
    const distance = to - from;

    const animate = (currentTime: number) => {
      if (!this.__tvistInternal_startTime) {
        this.__tvistInternal_startTime = currentTime;
      }

      const elapsed = currentTime - this.__tvistInternal_startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Применяем easing
      const easedProgress = easing(progress);
      const currentValue = from + distance * easedProgress;

      onUpdate(currentValue);

      if (progress < 1) {
        this.__tvistInternal_animationId = requestAnimationFrame(animate);
      } else {
        this.__tvistInternal_isRunning = false;
        this.__tvistInternal_startTime = 0;
        onComplete?.();
      }
    };

    this.__tvistInternal_animationId = requestAnimationFrame(animate);
  }

  /**
   * Остановить текущую анимацию
   */
  stop(): void {
    this.__tvistInternal_externalStop?.();
    if (this.__tvistInternal_animationId !== null) {
      cancelAnimationFrame(this.__tvistInternal_animationId);
      this.__tvistInternal_animationId = null;
    }
    this.__tvistInternal_isRunning = false;
    this.__tvistInternal_startTime = 0;
  }

  /**
   * Проверить, выполняется ли анимация
   */
  isAnimating(): boolean {
    return this.__tvistInternal_isRunning || this.__tvistInternal_externalIsAnimating?.() === true;
  }
}

/**
 * Throttle функция для ограничения частоты вызовов
 * Полезна для производительности при частых событиях
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  delay: number,
  resources?: Pick<
    ReturnType<typeof createResources>,
    '__tvistInternal_timeout' | '__tvistInternal_cancelTimeout'
  >
): (...args: Args) => void {
  let lastCall = 0;
  let timeout: number | null = null;

  return function throttled(...args: Args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    const callFunction = () => {
      lastCall = Date.now(); // Обновляем время вызова
      fn(...args);
    };

    if (timeSinceLastCall >= delay) {
      callFunction();
    } else {
      // Планируем вызов на конец периода
      if (timeout !== null) {
        if (resources) resources.__tvistInternal_cancelTimeout(timeout);
        else clearTimeout(timeout);
      }
      const callback = () => {
        callFunction();
        timeout = null;
      };
      timeout = resources
        ? resources.__tvistInternal_timeout(callback, delay - timeSinceLastCall)
        : window.setTimeout(callback, delay - timeSinceLastCall);
    }
  };
}
