/**
 * Marquee Module
 * 
 * Возможности:
 * - Непрерывная прокрутка (бегущая строка)
 * - Настраиваемая скорость в пикселях в секунду
 * - Поддержка направлений: left, right (horizontal), up, down (vertical)
 * - Пауза при наведении курсора
 * - Автоматическое клонирование контента для бесшовного loop
 * - Публичное API: start, stop, pause, resume
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class MarqueeModule extends Module {
  readonly name = 'marquee'

  private rafId: number | null = null
  private paused = false
  private stopped = false
  private speed: number // пикселей в секунду
  private direction: 'left' | 'right' | 'up' | 'down'
  private lastTimestamp: number | null = null
  
  /** Клонированные элементы для бесшовного loop */
  private clones: HTMLElement[] = []
  
  /** Общая ширина/высота всех оригинальных слайдов */
  private totalSize = 0
  
  /** Текущая позиция прокрутки */
  private currentPosition = 0

  private mouseEnterHandler?: () => void
  private mouseLeaveHandler?: () => void

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    // Определяем параметры
    const marquee = this.options.marquee
    if (typeof marquee === 'object') {
      this.speed = marquee.speed ?? 50 // по умолчанию 50px/s
      this.direction = marquee.direction ?? this.getDefaultDirection()
    } else {
      this.speed = 50
      this.direction = this.getDefaultDirection()
    }
  }

  /**
   * Определяет направление по умолчанию в зависимости от orientation слайдера
   */
  private getDefaultDirection(): 'left' | 'right' | 'up' | 'down' {
    return this.options.direction === 'vertical' ? 'up' : 'left'
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    // Отключаем drag для marquee режима
    if (this.options.drag !== false) {
      console.warn('[Tvist Marquee] Drag is disabled in marquee mode')
    }

    // Создаём клоны для бесшовного loop
    this.createClones()

    // Вычисляем общий размер
    this.calculateTotalSize()

    // Отключаем стандартную анимацию Engine
    this.tvist.engine.animator.stop()

    // Настраиваем события
    this.setupEvents()

    // Запускаем marquee
    this.start()
  }

  override destroy(): void {
    this.stop()
    this.removeClones()
    this.detachHoverEvents()
  }

  protected override shouldBeActive(): boolean {
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
        this.createClones()
        this.calculateTotalSize()
        this.setupEvents()
        this.start()
      }
      // Если marquee был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stop()
        this.removeClones()
        this.detachHoverEvents()
        this.stopped = true
      }
      // Если marquee остается включенным (но изменились параметры)
      else if (wasActive && isNowActive) {
        // Пересоздаём клоны если изменилось направление
        if (newOptions.marquee && typeof newOptions.marquee === 'object' && newOptions.marquee.direction) {
          this.removeClones()
          this.createClones()
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
   * Создаёт клоны слайдов для бесшовного loop
   */
  private createClones(): void {
    const container = this.tvist.container
    const originalSlides = Array.from(this.tvist.slides)
    const isReverse = this.direction === 'right' || this.direction === 'down'

    if (isReverse) {
      // Для right/down: клоны добавляем В НАЧАЛО
      originalSlides.reverse().forEach((slide, index) => {
        const clone = slide.cloneNode(true) as HTMLElement
        
        // Маркируем как клон
        clone.setAttribute('data-tvist-marquee-clone', 'true')
        clone.setAttribute('data-tvist-slide-index', String(originalSlides.length - 1 - index))
        clone.classList.add('tvist__slide--marquee-clone')
        
        // Удаляем id
        clone.removeAttribute('id')
        
        container.insertBefore(clone, container.firstChild)
        this.clones.unshift(clone)
      })
    } else {
      // Для left/up: клоны добавляем В КОНЕЦ
      originalSlides.forEach((slide, index) => {
        const clone = slide.cloneNode(true) as HTMLElement
        
        // Маркируем как клон
        clone.setAttribute('data-tvist-marquee-clone', 'true')
        clone.setAttribute('data-tvist-slide-index', String(index))
        clone.classList.add('tvist__slide--marquee-clone')
        
        // Удаляем id
        clone.removeAttribute('id')
        
        container.appendChild(clone)
        this.clones.push(clone)
      })
    }

    // Обновляем список слайдов
    this.tvist.updateSlidesList()
  }

  /**
   * Удаляет клоны
   */
  private removeClones(): void {
    this.clones.forEach(clone => clone.remove())
    this.clones = []
    this.tvist.updateSlidesList()
  }

  /**
   * Вычисляет общий размер всех оригинальных слайдов
   */
  private calculateTotalSize(): void {
    const isHorizontal = this.options.direction !== 'vertical'
    const gap = this.options.gap ?? 0
    
    // Количество оригинальных слайдов (без клонов)
    const originalCount = Math.floor(this.tvist.slides.length / 2)
    
    if (isHorizontal) {
      // Ширина одного слайда + gap
      const slideWidth = this.tvist.slides[0]?.offsetWidth ?? 0
      this.totalSize = (slideWidth + gap) * originalCount
    } else {
      // Высота одного слайда + gap
      const slideHeight = this.tvist.slides[0]?.offsetHeight ?? 0
      this.totalSize = (slideHeight + gap) * originalCount
    }
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
    // Вычисляем смещение
    const distance = this.speed * deltaTime

    // Обновляем позицию в зависимости от направления
    const isReverse = this.direction === 'right' || this.direction === 'down'
    
    if (isReverse) {
      // Для right/down: уменьшаем позицию (движемся от totalSize к 0)
      this.currentPosition -= distance
      // Loop: когда достигаем 0, возвращаемся к totalSize
      if (this.currentPosition <= 0) {
        this.currentPosition = this.totalSize
      }
    } else {
      // Для left/up: увеличиваем позицию (движемся от 0 к totalSize)
      this.currentPosition += distance
      // Loop: когда достигаем totalSize, возвращаемся к 0
      if (this.currentPosition >= this.totalSize) {
        this.currentPosition = 0
      }
    }

    // Применяем transform
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
   * Остановка marquee
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
    if (!this.paused) {
      this.paused = true
      this.emit('marqueePause')
    }
  }

  /**
   * Возобновление marquee
   */
  resume(): void {
    if (this.paused && !this.stopped) {
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
   * Публичное API
   */
  getMarquee() {
    return {
      start: () => {
        this.stopped = false
        this.start()
      },
      stop: () => this.stop(),
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
          this.direction = direction
          this.removeClones()
          this.createClones()
          this.calculateTotalSize()
          // Для right/down начинаем с totalSize (клоны слева, показываем оригиналы)
          // Для left/up начинаем с 0
          const isReverse = direction === 'right' || direction === 'down'
          this.currentPosition = isReverse ? this.totalSize : 0
          this.lastTimestamp = null // Сбрасываем timestamp для корректного deltaTime
          // Сразу применяем transform для корректного отображения
          this.applyTransform()
        }
      },
      getDirection: () => this.direction
    }
  }
}
