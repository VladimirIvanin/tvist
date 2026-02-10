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
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если autoplay изменился
    if (newOptions.autoplay !== undefined) {
      // Определяем, был ли autoplay активен ДО обновления
      // К этому моменту this.options уже содержит новые значения,
      // но мы можем определить старое состояние по наличию таймера
      const wasActive = this.timer !== null
      
      // Обновляем delay
      const autoplay = newOptions.autoplay
      if (typeof autoplay === 'number') {
        this.delay = autoplay
      }

      const isNowActive = newOptions.autoplay !== false && newOptions.autoplay !== undefined

      // Если autoplay был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        this.stopped = false
        this.setupEvents()
        this.start()
      }
      // Если autoplay был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stop()
        this.detachHoverEvents()
        this.stopped = true
      }
      // Если autoplay был включен и остается включен (но изменилась задержка)
      else if (wasActive && isNowActive) {
        this.start() // Перезапускаем с новой задержкой
      }
    }

    // Если изменились pauseOnHover или pauseOnInteraction
    if (newOptions.pauseOnHover !== undefined || newOptions.pauseOnInteraction !== undefined) {
      // Переинициализируем события
      if (this.shouldBeActive()) {
        this.detachHoverEvents()
        this.setupEvents()
      }
    }
  }

  /**
   * Настройка событий
   */
  private setupEvents(): void {
    if (this.options.pauseOnHover) {
      this.attachHoverEvents()
    }

    // Всегда ставим на паузу при драге (не только при pauseOnInteraction),
    // иначе таймер может вызвать next() во время/сразу после драга (rewind к 0)
    // и перебить snap к нужному слайду — пагинация тогда расходится с кадром
    this.on('dragStart', () => {
      if (this.options.disableOnInteraction) {
        this.stop()
        this.stopped = true
      } else {
        this.pause()
      }
    })
    
    // ВАЖНО: resume() вызываем НЕ на dragEnd, а на transitionEnd.
    // Причина: dragEnd срабатывает ДО завершения snap-анимации.
    // Если вызвать resume() сразу, setInterval начнёт отсчёт,
    // и next() может сработать во время или сразу после snap,
    // что приводит к багу с пагинацией (activeBullet != activeIndex).
    this.on('transitionEnd', () => {
      if (!this.options.disableOnInteraction && !this.stopped && this.paused) {
        this.resume()
      }
    })
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
   * Очищаем таймер, чтобы callback не сработал во время паузы
   */
  pause(): void {
    console.log('[Autoplay] pause called', { paused: this.paused, timer: this.timer })
    if (!this.paused) {
      this.paused = true
      // Очищаем таймер — иначе callback может сработать между pause() и resume()
      // и вызвать next() сразу после resume() (баг с пагинацией после драга)
      if (this.timer !== null) {
        console.log('[Autoplay] clearing timer in pause()')
        window.clearInterval(this.timer)
        this.timer = null
      }
      this.emit('autoplayPause')
    }
  }

  /**
   * Возобновление autoplay
   * Перезапускает таймер, чтобы избежать немедленного автоперелистывания
   */
  resume(): void {
    console.log('[Autoplay] resume called', { paused: this.paused, stopped: this.stopped, timer: this.timer })
    if (this.paused && !this.stopped) {
      this.paused = false
      // Перезапускаем таймер, чтобы отсчёт начался заново
      // Это предотвращает ситуацию, когда после драга сразу срабатывает автоплей
      this.start()
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

