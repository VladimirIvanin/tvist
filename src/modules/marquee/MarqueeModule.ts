/**
 * Marquee Module
 *
 * Возможности:
 * - Непрерывная прокрутка (бегущая строка)
 * - Настраиваемая скорость в пикселях в секунду
 * - Поддержка направлений: left, right (horizontal), up, down (vertical)
 * - Пауза при наведении курсора
 * - Публичное API: start, stop, pause, resume
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'
import { gapCssForMargin } from '../../utils/gridGap'

export class MarqueeModule extends Module {
  readonly name = 'marquee'

  private rafId: number | null = null
  private paused = false
  private stopped = false
  private speed: number // пикселей в секунду
  private direction: 'left' | 'right' | 'up' | 'down'
  private lastTimestamp: number | null = null

  /** Общая ширина/высота всех слайдов */
  private totalSize = 0
  
  /** Текущая позиция прокрутки */
  private currentPosition = 0

  /** Размер привязан к элементу, поэтому перестановка слайдов не инвалидирует кеш. */
  private cachedSlideSizes = new WeakMap<HTMLElement, number>()

  private mouseEnterHandler?: () => void
  private mouseLeaveHandler?: () => void

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    // Определяем параметры
    const marquee = this.options.marquee
    this.speed = typeof marquee === 'object' ? marquee.speed ?? 50 : 50
    this.direction = typeof marquee === 'object'
      ? marquee.direction ?? this.getDefaultDirection()
      : this.getDefaultDirection()
  }

  /**
   * Определяет направление по умолчанию в зависимости от orientation слайдера
   */
  private getDefaultDirection(): 'left' | 'right' | 'up' | 'down' {
    return this.options.direction === 'vertical' ? 'up' : 'left'
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    // ВАЖНО: Marquee требует loop для бесшовной прокрутки
    // Автоматически включаем loop, если он не был включен
    if (!(this.options.loop === true || (typeof this.options.loop === 'object' && this.options.loop.enabled !== false))) {
      // Обновляем опции через updateOptions для корректной инициализации всех модулей
      this.tvist.updateOptions({ loop: true })
    }

    // Исправляем gap у последнего слайда
    this.fixLastSlideGap()

    // Вычисляем общий размер
    this.calculateTotalSize()

    // Отключаем стандартную анимацию Engine
    this.tvist.engine.animator.stop()

    // Настраиваем события
    this.setupEvents()
    
    // Подписываемся на события драга для паузы/возобновления
    this.on('dragStart', () => this.pause())
    this.on('dragEnd', () => this.resume())

    // Запускаем marquee
    this.start()
  }

  override destroy(): void {
    this.stop()
    this.detachHoverEvents()
    this.off('dragStart')
    this.off('dragEnd')
  }

  public override shouldBeActive(): boolean {
    return this.options.marquee !== false && this.options.marquee !== undefined
  }

  /**
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.marquee !== undefined) {
      const wasActive = this.rafId !== null
      const isNowActive = newOptions.marquee !== false && newOptions.marquee !== undefined

      // Обновляем параметры
      if (typeof newOptions.marquee === 'object') {
        if (newOptions.marquee.speed !== undefined) {
          this.speed = newOptions.marquee.speed
        }
        if (newOptions.marquee.direction !== undefined) {
          this.direction = newOptions.marquee.direction
        }
      }

      // Если marquee был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        this.stopped = false
        this.calculateTotalSize()
        this.setupEvents()
        this.start()
      }
      // Если marquee был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stop()
        this.detachHoverEvents()
        this.stopped = true
      }
      // Если marquee остается включенным (но изменились параметры)
      else if (wasActive && isNowActive) {
        if (newOptions.marquee && typeof newOptions.marquee === 'object' && newOptions.marquee.direction) {
          this.calculateTotalSize()
          this.currentPosition = 0
        }
      }
    }

    // Если изменился pauseOnHover
    if (newOptions.marquee && typeof newOptions.marquee === 'object' && newOptions.marquee.pauseOnHover !== undefined) {
      if (this.shouldBeActive()) {
        this.detachHoverEvents()
        this.setupEvents()
      }
    }
  }

  /**
   * Обработка обновления (вызывается из Engine)
   */
  override onUpdate(): void {
    if (this.shouldBeActive()) {
      this.fixLastSlideGap()
      this.calculateTotalSize()
    }
  }

  /**
   * Исправляет отсутствующий gap у последнего слайда
   * В режиме Marquee нам нужен gap после КАЖДОГО слайда для бесшовного цикла
   */
  private fixLastSlideGap(): void {
    const gapCss = gapCssForMargin(this.options.gap)
    if (!gapCss) return

    const slides = this.tvist.slides
    if (slides.length === 0) return

    // Engine убирает margin у последнего слайда.
    // Нам нужно, чтобы у ВСЕХ слайдов был margin, так как они зациклены.
    const lastSlide = slides[slides.length - 1]
    if (!lastSlide) return
    const property = this.options.direction === 'vertical' ? 'marginBottom' : 'marginRight'
    if (!lastSlide.style[property]) lastSlide.style[property] = gapCss
  }

  /**
   * Вычисляет общий размер всех слайдов
   */
  private calculateTotalSize(): void {
    const isHorizontal = this.options.direction !== 'vertical'
    const gap = this.tvist.engine.gapPxValue
    const count = this.tvist.slides.length
    if (count === 0) {
      this.totalSize = 0
      this.cachedSlideSizes = new WeakMap()
      return
    }
    
    this.cachedSlideSizes = new WeakMap()
    this.totalSize = this.tvist.slides.reduce((sum, slide) => {
      const size = isHorizontal ? slide.offsetWidth : slide.offsetHeight
      this.cachedSlideSizes.set(slide, size)
      return sum + size + gap
    }, 0)
  }

  /**
   * Настройка событий
   */
  private setupEvents(): void {
    const marquee = this.options.marquee
    const pauseOnHover = typeof marquee === 'object' ? marquee.pauseOnHover : true

    if (pauseOnHover) {
      this.attachHoverEvents()
    }
  }

  /**
   * Подключение hover событий
   */
  private attachHoverEvents(): void {
    this.mouseEnterHandler = () => this.pause()
    this.mouseLeaveHandler = () => this.resume()

    this.tvist.root.addEventListener('mouseenter', this.mouseEnterHandler)
    this.tvist.root.addEventListener('mouseleave', this.mouseLeaveHandler)
  }

  /**
   * Отключение hover событий
   */
  private detachHoverEvents(): void {
    if (this.mouseEnterHandler) {
      this.tvist.root.removeEventListener('mouseenter', this.mouseEnterHandler)
    }
    if (this.mouseLeaveHandler) {
      this.tvist.root.removeEventListener('mouseleave', this.mouseLeaveHandler)
    }
  }

  /**
   * Старт marquee анимации
   */
  start(): void {
    if (this.stopped) return

    this.stop() // Очищаем предыдущий RAF
    this.paused = false
    this.lastTimestamp = null

    const animate = (timestamp: number) => {
      if (this.stopped) return

      // Вычисляем delta time
      this.lastTimestamp ??= timestamp
      const deltaTime = (timestamp - this.lastTimestamp) / 1000 // в секундах
      this.lastTimestamp = timestamp

      // Обновляем позицию если не на паузе
      if (!this.paused) {
        this.updatePosition(deltaTime)
      }

      // Продолжаем анимацию
      this.rafId = requestAnimationFrame(animate)
    }

    this.rafId = requestAnimationFrame(animate)
    this.emit('marqueeStart')
  }

  /**
   * Обновляет позицию прокрутки
   */
  private updatePosition(deltaTime: number): void {
    const gap = this.tvist.engine.gapPxValue
    const isReverse = this.direction === 'right' || this.direction === 'down'
    this.currentPosition += (isReverse ? -1 : 1) * this.speed * deltaTime

    while (this.tvist.slides.length > 0) {
      const index = isReverse ? this.tvist.slides.length - 1 : 0
      const slide = this.tvist.slides[index]
      const size = (slide ? this.cachedSlideSizes.get(slide) ?? 0 : 0) + gap
      if (!slide || size <= 0) break
      if (isReverse ? this.currentPosition > 0 : this.currentPosition < size) break

      if (isReverse) {
        this.tvist.container.prepend(slide)
      } else {
        this.tvist.container.appendChild(slide)
      }
      this.tvist.updateSlidesList()
      this.currentPosition += isReverse ? size : -size
    }

    this.applyTransform()
  }

  /**
   * Применяет CSS transform для прокрутки
   */
  private applyTransform(): void {
    const isHorizontal = this.options.direction !== 'vertical'
    
    // Всегда используем отрицательное значение currentPosition
    // Для left/up: currentPosition положительный (0 → totalSize), transform отрицательный
    // Для right/down: currentPosition отрицательный (0 → -totalSize), transform положительный
    const transform = isHorizontal
      ? `translate3d(${-this.currentPosition}px, 0, 0)`
      : `translate3d(0, ${-this.currentPosition}px, 0)`

    this.tvist.container.style.transform = transform
  }

  /**
   * Остановка marquee (отменяет RAF, но не меняет флаг stopped)
   * Для полной остановки с установкой флага используйте публичное API: getMarquee().stop()
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.lastTimestamp = null
    }
    this.emit('marqueeStop')
  }

  /**
   * Пауза marquee
   */
  pause(): void {
    if (!this.shouldBeActive()) return

    if (!this.paused) {
      this.paused = true
      // Синхронизируем engine.location с визуальной позицией marquee.
      // MarqueeModule управляет transform напрямую, engine.location может быть рассинхронизирован.
      // При паузе (например, для drag) нужно чтобы engine.location отражал реальную позицию.
      const visualPosition = -this.currentPosition
      this.tvist.engine.location.set(visualPosition)
      this.tvist.engine.target.set(visualPosition)
      this.emit('marqueePause')
    }
  }

  /**
   * Возобновление marquee
   */
  resume(): void {
    if (!this.shouldBeActive()) return

    if (this.paused && !this.stopped) {
      // Синхронизируем currentPosition с engine.location
      // (после drag/snap engine.location мог измениться)
      this.currentPosition = -this.tvist.engine.location.get()
      this.paused = false
      this.lastTimestamp = null // Сбрасываем timestamp для корректного deltaTime
      this.emit('marqueeResume')
    }
  }

  /**
   * Обработка resize
   */
  override onResize(): void {
    if (this.shouldBeActive()) {
      this.calculateTotalSize()
    }
  }

  /**
   * Получить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  getCurrentPosition(): number {
    return this.currentPosition
  }

  /**
   * Установить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  setCurrentPosition(position: number): void {
    this.currentPosition = position
  }

  /**
   * Публичное API
   */
  getMarquee() {
    return {
      start: () => {
        this.stopped = false
        this.start()
      },
      stop: () => {
        this.stop()
        this.stopped = true
      },
      pause: () => this.pause(),
      resume: () => this.resume(),
      isRunning: () => this.rafId !== null && !this.paused,
      isPaused: () => this.paused,
      isStopped: () => this.stopped,
      setSpeed: (speed: number) => {
        this.speed = speed
      },
      getSpeed: () => this.speed,
      setDirection: (direction: 'left' | 'right' | 'up' | 'down') => {
        if (this.direction !== direction) {
          // Сохраняем текущую визуальную позицию (transform offset)
          // Для всех направлений transform = -currentPosition
          const currentVisualOffset = this.currentPosition
          
          this.direction = direction
          this.calculateTotalSize()
          
          // Восстанавливаем визуальную позицию
          // Независимо от направления, визуальный offset остаётся тем же
          // currentPosition всегда напрямую определяет transform offset
          this.currentPosition = currentVisualOffset
          
          // Нормализуем позицию в пределах [0, totalSize]
          if (this.totalSize > 0) {
            this.currentPosition = this.currentPosition % this.totalSize
            if (this.currentPosition < 0) {
              this.currentPosition += this.totalSize
            }
          }
          
          this.lastTimestamp = null
          this.applyTransform()
        }
      },
      getDirection: () => this.direction
    }
  }
}
