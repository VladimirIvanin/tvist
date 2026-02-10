/**
 * Autoplay Module
 * 
 * Возможности:
 * - Автопрокрутка с настраиваемой задержкой
 * - Пауза при hover
 * - Пауза при взаимодействии (drag, click)
 * - Пауза при потере видимости вкладки (visibilitychange)
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
  private visibilityChangeHandler?: () => void

  // Флаг для отслеживания состояния drag
  private isDragging = false
  // Таймаут для fallback resume после drag (если transitionEnd не сработает)
  private dragEndTimeout: number | null = null
  // Флаг для отслеживания паузы из-за потери видимости вкладки
  private pausedByVisibility = false

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    // Определяем delay
    const autoplay = this.options.autoplay
    this.delay = typeof autoplay === 'number' ? autoplay : 3000
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.setupEvents()
    this.attachVisibilityEvents()
    this.start()
  }

  override destroy(): void {
    this.stop()
    this.clearDragEndTimeout()
    this.detachHoverEvents()
    this.detachVisibilityEvents()
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
        this.attachVisibilityEvents()
        this.start()
      }
      // Если autoplay был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stop()
        this.detachHoverEvents()
        this.detachVisibilityEvents()
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
   * Очистка таймаута fallback resume
   */
  private clearDragEndTimeout(): void {
    if (this.dragEndTimeout !== null) {
      window.clearTimeout(this.dragEndTimeout)
      this.dragEndTimeout = null
    }
  }

  /**
   * Возобновление autoplay после drag
   * Вызывается из transitionEnd или fallback timeout
   */
  private resumeAfterDrag(): void {
    if (!this.isDragging) return
    
    this.isDragging = false
    this.clearDragEndTimeout()
    
    if (!this.options.disableOnInteraction && !this.stopped && this.paused) {
      this.resume()
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
      this.isDragging = true
      this.clearDragEndTimeout()
      
      if (this.options.disableOnInteraction) {
        this.stop()
        this.stopped = true
      } else {
        this.pause()
      }
    })
    
    // dragEnd: запускаем fallback таймаут на случай если transitionEnd не сработает
    // (например, если snap вернул на тот же слайд и indexChanged === false)
    this.on('dragEnd', () => {
      if (!this.isDragging) return
      
      const speed = this.options.speed ?? 300
      // Fallback: resume через speed + буфер, если transitionEnd не сработает
      this.dragEndTimeout = window.setTimeout(() => {
        this.resumeAfterDrag()
      }, speed + 100)
    })
    
    // ВАЖНО: resume() вызываем НЕ на dragEnd, а на transitionEnd.
    // Причина: dragEnd срабатывает ДО завершения snap-анимации.
    // Если вызвать resume() сразу, setInterval начнёт отсчёт,
    // и next() может сработать во время или сразу после snap,
    // что приводит к багу с пагинацией (activeBullet != activeIndex).
    this.on('transitionEnd', () => {
      // Если был drag — resume через resumeAfterDrag
      if (this.isDragging) {
        this.resumeAfterDrag()
        return
      }
      
      // Для обычной навигации (не drag) — resume если на паузе
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
   * Подключение события visibilitychange
   * Ставит автоплей на паузу при скрытии вкладки
   */
  private attachVisibilityEvents(): void {
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.pausedByVisibility = true
        this.pause()
      } else if (document.visibilityState === 'visible') {
        if (this.pausedByVisibility) {
          this.pausedByVisibility = false
          this.resume()
        }
      }
    }

    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
  }

  /**
   * Отключение события visibilitychange
   */
  private detachVisibilityEvents(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
      this.visibilityChangeHandler = undefined
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
    if (!this.paused) {
      this.paused = true
      // Очищаем таймер — иначе callback может сработать между pause() и resume()
      // и вызвать next() сразу после resume() (баг с пагинацией после драга)
      if (this.timer !== null) {
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
    // Не возобновляем, если вкладка скрыта
    if (this.pausedByVisibility) {
      return
    }
    
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

