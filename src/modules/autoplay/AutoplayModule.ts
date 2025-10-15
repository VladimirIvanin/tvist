/**
 * Autoplay Module
 * 
 * Возможности:
 * - Автопрокрутка с настраиваемой задержкой
 * - Пауза при hover
 * - Пауза при взаимодействии (drag, click)
 * - Полная остановка при взаимодействии (опционально)
 * - Публичное API: start, stop, pause, resume
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class AutoplayModule extends Module {
  readonly name = 'autoplay'

  private timer: number | null = null
  private paused = false
  private stopped = false
  private delay: number

  private mouseEnterHandler?: () => void
  private mouseLeaveHandler?: () => void

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    // Определяем delay
    const autoplay = this.options.autoplay
    this.delay = typeof autoplay === 'number' ? autoplay : 3000
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.setupEvents()
    this.start()
  }

  override destroy(): void {
    this.stop()
    this.detachHoverEvents()
  }

  protected override shouldBeActive(): boolean {
    return this.options.autoplay !== false && this.options.autoplay !== undefined
  }

  /**
   * Настройка событий
   */
  private setupEvents(): void {
    // Пауза при hover
    if (this.options.pauseOnHover) {
      this.attachHoverEvents()
    }

    // Пауза при взаимодействии
    if (this.options.pauseOnInteraction) {
      this.on('dragStart', () => {
        if (this.options.disableOnInteraction) {
          this.stop()
          this.stopped = true
        } else {
          this.pause()
        }
      })

      this.on('dragEnd', () => {
        if (!this.options.disableOnInteraction && !this.stopped) {
          this.resume()
        }
      })
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
   * Старт autoplay
   */
  start(): void {
    if (this.stopped) return

    this.stop() // Очищаем предыдущий timer
    this.paused = false

    this.timer = window.setInterval(() => {
      if (!this.paused && !this.stopped) {
        this.tvist.next()
      }
    }, this.delay)

    this.emit('autoplayStart')
  }

  /**
   * Остановка autoplay
   */
  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.emit('autoplayStop')
  }

  /**
   * Пауза autoplay
   */
  pause(): void {
    if (!this.paused) {
      this.paused = true
      this.emit('autoplayPause')
    }
  }

  /**
   * Возобновление autoplay
   */
  resume(): void {
    if (this.paused && !this.stopped) {
      this.paused = false
      this.emit('autoplayResume')
    }
  }

  /**
   * Публичное API - получить модуль и использовать методы
   */
  getAutoplay() {
    return {
      start: () => {
        this.stopped = false
        this.start()
      },
      stop: () => this.stop(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      isRunning: () => this.timer !== null && !this.paused,
      isPaused: () => this.paused,
      isStopped: () => this.stopped
    }
  }
}

