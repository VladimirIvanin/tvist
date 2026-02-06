/**
 * ScrollControl - модуль для управления слайдером через скролл
 * Поддерживает wheel events на десктопе и touch events на мобильных устройствах
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
  
  // Touch events для мобильных устройств
  private touchStartX = 0
  private touchStartY = 0
  private isTouching = false

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

    // Добавляем обработчики событий
    this.attachWheelListener()
    this.attachTouchListeners()
  }

  /**
   * Добавить обработчик wheel событий
   */
  private attachWheelListener(): void {
    this.tvist.root.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  /**
   * Добавить обработчики touch событий для мобильных
   */
  private attachTouchListeners(): void {
    this.tvist.root.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    this.tvist.root.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.tvist.root.addEventListener('touchend', this.handleTouchEnd, { passive: true })
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
   * Обработчик начала touch события
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.isTouching = true
  }

  /**
   * Обработчик движения touch события
   */
  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.isTouching || event.touches.length !== 1) return

    const touch = event.touches[0]
    if (!touch) return
    
    const deltaX = touch.clientX - this.touchStartX
    const deltaY = touch.clientY - this.touchStartY
    
    const isVertical = this.options.direction === 'vertical'
    const mainDelta = isVertical ? deltaY : deltaX
    const crossDelta = isVertical ? deltaX : deltaY

    // Если движение в перпендикулярном направлении больше, игнорируем
    if (Math.abs(crossDelta) > Math.abs(mainDelta)) {
      return
    }

    // Проверяем, достаточно ли большое движение для переключения слайда
    const threshold = 50 // минимальное расстояние в пикселях

    if (Math.abs(mainDelta) < threshold) {
      return
    }

    // Проверяем границы
    const isAtStart = !this.tvist.engine.canScrollPrev()
    const isAtEnd = !this.tvist.engine.canScrollNext()
    
    const swipingForward = mainDelta < 0 // свайп влево/вверх
    const swipingBackward = mainDelta > 0 // свайп вправо/вниз

    // Если на краю и пытаемся выйти за границы
    if ((isAtStart && swipingBackward) || (isAtEnd && swipingForward)) {
      if (this.releaseOnEdges) {
        return
      }
      event.preventDefault()
      return
    }

    // Предотвращаем нативный скролл
    event.preventDefault()

    // Выполняем переход
    if (swipingForward) {
      this.tvist.next()
    } else if (swipingBackward) {
      this.tvist.prev()
    }

    // Сбрасываем состояние
    this.isTouching = false
  }

  /**
   * Обработчик окончания touch события
   */
  private handleTouchEnd = (): void => {
    this.isTouching = false
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

    // Удаляем обработчики событий
    this.tvist.root.removeEventListener('wheel', this.handleWheel)
    this.tvist.root.removeEventListener('touchstart', this.handleTouchStart)
    this.tvist.root.removeEventListener('touchmove', this.handleTouchMove)
    this.tvist.root.removeEventListener('touchend', this.handleTouchEnd)
  }
}
