/**
 * ScrollControl - модуль для управления слайдером через скролл
 * Поддерживает wheel events на десктопе
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

interface ScrollControlOptions {
  /** Чувствительность (количество пикселей на тик колёсика) */
  sensitivity?: number
  /** Разрешить прокрутку страницы на краях слайдера */
  releaseOnEdges?: boolean
}

export class ScrollControlModule extends Module {
  readonly name = 'ScrollControl'

  private sensitivity: number
  private releaseOnEdges: boolean
  private isScrolling = false
  private scrollTimer?: number
  private lastWheelTime = 0
  private wheelThrottle = 50 // мс между обработкой событий

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    const wheelOptions = this.getWheelOptions()
    this.sensitivity = wheelOptions.sensitivity ?? 1
    this.releaseOnEdges = wheelOptions.releaseOnEdges ?? true
  }

  /**
   * Получить опции wheel из конфигурации
   */
  private getWheelOptions(): ScrollControlOptions {
    const wheel = this.options.wheel
    
    if (typeof wheel === 'boolean') {
      return {}
    }
    
    return wheel ?? {}
  }

  /**
   * Проверить, должен ли модуль быть активен
   */
  protected override shouldBeActive(): boolean {
    return this.options.wheel !== false && this.options.wheel !== undefined
  }

  override init(): void {
    if (!this.shouldBeActive()) {
      return
    }

    // Добавляем обработчик wheel событий
    this.attachWheelListener()
  }

  /**
   * Добавить обработчик wheel событий
   */
  private attachWheelListener(): void {
    this.tvist.root.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  /**
   * Обработчик wheel события
   */
  private handleWheel = (event: WheelEvent): void => {
    const isVertical = this.options.direction === 'vertical'
    
    // Для горизонтального слайдера используем deltaY (как обычный скролл вниз/вверх)
    // Для вертикального слайдера также используем deltaY
    // deltaX используется только если deltaY = 0 (трекпад, shift+wheel)
    let mainDelta = event.deltaY
    
    // Если deltaY = 0, но есть deltaX (трекпад или shift+wheel)
    if (Math.abs(event.deltaY) < 1 && Math.abs(event.deltaX) > 0) {
      if (!isVertical) {
        // Для горизонтального слайдера используем deltaX
        mainDelta = event.deltaX
      } else {
        // Для вертикального слайдера игнорируем горизонтальный скролл
        return
      }
    }
    
    // Если вертикальный слайдер и есть горизонтальный скролл больше вертикального, игнорируем
    if (isVertical && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return
    }
    
    // Если горизонтальный слайдер и deltaX больше deltaY (трекпад), используем deltaX
    if (!isVertical && Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 0) {
      mainDelta = event.deltaX
    }

    // Если нет значимого скролла, игнорируем
    if (Math.abs(mainDelta) < 1) {
      return
    }

    // Throttle для предотвращения слишком частых срабатываний
    const now = Date.now()
    if (now - this.lastWheelTime < this.wheelThrottle) {
      event.preventDefault()
      return
    }
    this.lastWheelTime = now

    // Проверяем границы слайдера
    const isAtStart = !this.tvist.engine.canScrollPrev()
    const isAtEnd = !this.tvist.engine.canScrollNext()
    
    const scrollingForward = mainDelta > 0
    const scrollingBackward = mainDelta < 0

    // Если releaseOnEdges включен и мы на краю, разрешаем нативный скролл
    if (this.releaseOnEdges) {
      if ((isAtStart && scrollingBackward) || (isAtEnd && scrollingForward)) {
        return
      }
    }

    // Предотвращаем нативный скролл
    event.preventDefault()

    // Если уже идёт прокрутка, игнорируем
    if (this.isScrolling) {
      return
    }

    // Определяем направление и выполняем переход
    const delta = Math.sign(mainDelta) * this.sensitivity

    if (delta > 0) {
      this.tvist.next()
    } else if (delta < 0) {
      this.tvist.prev()
    }

    // Устанавливаем флаг прокрутки
    this.isScrolling = true

    // Сбрасываем флаг после анимации
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer)
    }

    const speed = this.options.speed ?? 300
    this.scrollTimer = window.setTimeout(() => {
      this.isScrolling = false
    }, speed + 50)
  }

  /**
   * Хук обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.wheel !== undefined) {
      const wheelOptions = typeof newOptions.wheel === 'boolean' 
        ? {} 
        : (newOptions.wheel ?? {})
      
      this.sensitivity = wheelOptions.sensitivity ?? 1
      this.releaseOnEdges = wheelOptions.releaseOnEdges ?? true
    }
  }

  override destroy(): void {
    // Очищаем таймеры
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer)
    }

    // Удаляем обработчик wheel событий
    this.tvist.root.removeEventListener('wheel', this.handleWheel)
  }
}
