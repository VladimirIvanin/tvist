/**
 * Autoplay Module
 * 
 * Возможности:
 * - Автопрокрутка с настраиваемой задержкой
 * - Пауза при hover
 * - Пауза при взаимодействии (drag, click)
 * - Пауза при потере видимости вкладки (visibilitychange)
 * - Полная остановка при взаимодействии (опционально)
 * - Ожидание окончания видео вместо таймера (waitForVideo)
 * - Прогресс автопрокрутки (autoplayProgress)
 * - Публичное API: start, stop, pause, resume
 * 
 * Использует рекурсивный setTimeout вместо setInterval:
 * - setTimeout вызывается ПОСЛЕ завершения переключения слайда
 * - Предотвращает накопление событий когда браузер неактивен
 * - Более надежная работа с паузами и возобновлением
 * 
 * Опция autoplay принимает:
 * - false / undefined — выключен
 * - true — включен с delay: 3000
 * - number — включен с указанной задержкой
 * - AutoplayOptions — полный контроль
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions, AutoplayOptions } from '../../core/types'

/** Дефолтные значения для AutoplayOptions */
const AUTOPLAY_DEFAULTS: Required<AutoplayOptions> = {
  delay: 3000,
  pauseOnHover: true,
  pauseOnInteraction: true,
  disableOnInteraction: false,
  waitForVideo: false,
}

/**
 * Нормализация autoplay опций в объект AutoplayOptions.
 * Возвращает null если autoplay выключен.
 */
function normalizeAutoplay(raw: TvistOptions['autoplay']): Required<AutoplayOptions> | null {
  if (raw === false || raw === undefined) return null

  if (raw === true) {
    return { ...AUTOPLAY_DEFAULTS }
  }

  if (typeof raw === 'number') {
    return { ...AUTOPLAY_DEFAULTS, delay: raw }
  }

  // Object form
  return {
    delay: raw.delay ?? AUTOPLAY_DEFAULTS.delay,
    pauseOnHover: raw.pauseOnHover ?? AUTOPLAY_DEFAULTS.pauseOnHover,
    pauseOnInteraction: raw.pauseOnInteraction ?? AUTOPLAY_DEFAULTS.pauseOnInteraction,
    disableOnInteraction: raw.disableOnInteraction ?? AUTOPLAY_DEFAULTS.disableOnInteraction,
    waitForVideo: raw.waitForVideo ?? AUTOPLAY_DEFAULTS.waitForVideo,
  }
}

export class AutoplayModule extends Module {
  readonly name = 'autoplay'

  private timer: number | null = null
  private paused = false
  private stopped = false
  
  /** Нормализованные опции autoplay */
  private config: Required<AutoplayOptions> | null = null

  private mouseEnterHandler?: () => void
  private mouseLeaveHandler?: () => void
  private visibilityChangeHandler?: () => void

  // Флаг для отслеживания состояния drag
  private isDragging = false
  // Таймаут для fallback resume после drag (если transitionEnd не сработает)
  private dragEndTimeout: number | null = null
  // Флаг для отслеживания паузы из-за потери видимости вкладки
  private pausedByVisibility = false

  // Для autoplayProgress
  private progressRAF: number | null = null
  private progressStartTime: number | null = null

  // Для waitForVideo — слушаем videoEnded
  private waitingForVideo = false
  private videoEndedHandler?: () => void

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
    this.config = normalizeAutoplay(this.options.autoplay)
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
    this.stopProgressTracking()
    this.detachHoverEvents()
    this.detachVisibilityEvents()
    this.detachVideoEndedListener()
  }

  protected override shouldBeActive(): boolean {
    return this.config !== null
  }

  /**
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если autoplay изменился
    if (newOptions.autoplay !== undefined) {
      const wasActive = this.config !== null && this.timer !== null
      
      // Перенормализуем
      this.config = normalizeAutoplay(newOptions.autoplay)

      const isNowActive = this.config !== null

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
        this.detachVideoEndedListener()
        this.stopped = true
      }
      // Если autoplay был включен и остается включен (но изменились настройки)
      else if (wasActive && isNowActive && this.config) {
        // Переинициализируем hover events при изменении pauseOnHover
        this.detachHoverEvents()
        if (this.config.pauseOnHover) {
          this.attachHoverEvents()
        }
        this.start() // Перезапускаем с новой задержкой
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
    
    if (!this.config?.disableOnInteraction && !this.stopped && this.paused) {
      this.resume()
    }
  }

  /**
   * Настройка событий
   */
  private setupEvents(): void {
    if (!this.config) return

    if (this.config.pauseOnHover) {
      this.attachHoverEvents()
    }

    // Всегда ставим на паузу при драге (не только при pauseOnInteraction),
    // иначе таймер может вызвать next() во время/сразу после драга (rewind к 0)
    // и перебить snap к нужному слайду — пагинация тогда расходится с кадром
    this.on('dragStart', () => {
      this.isDragging = true
      this.clearDragEndTimeout()
      
      if (this.config?.disableOnInteraction) {
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
      if (!this.config?.disableOnInteraction && !this.stopped && this.paused) {
        this.resume()
      }
    })

    // При смене слайда — определяем, нужно ли ждать видео
    this.on('slideChanged', (index: number) => {
      if (!this.config?.waitForVideo) return
      this.handleSlideChangedForVideo(index)
    })
  }

  /**
   * Обработка смены слайда для режима waitForVideo
   */
  private handleSlideChangedForVideo(index: number): void {
    // Снимаем предыдущий videoEnded listener
    this.detachVideoEndedListener()
    this.waitingForVideo = false

    const slide = this.tvist.slides[index]
    if (!slide) return

    const video = slide.querySelector('video')
    if (!video) return // нет видео — используем обычный delay (таймер уже запущен)

    // Есть видео — останавливаем таймер, ждём videoEnded
    this.waitingForVideo = true
    this.cancelTimer()
    this.stopProgressTracking()

    this.videoEndedHandler = () => {
      if (!this.paused && !this.stopped && this.waitingForVideo) {
        this.waitingForVideo = false
        this.tvist.next()
        // После next() transitionEnd перезапустит цикл
      }
    }

    this.on('videoEnded', this.videoEndedHandler)
  }

  /**
   * Снять слушатель videoEnded
   */
  private detachVideoEndedListener(): void {
    if (this.videoEndedHandler) {
      this.off('videoEnded', this.videoEndedHandler)
      this.videoEndedHandler = undefined
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
      this.mouseEnterHandler = undefined
    }
    if (this.mouseLeaveHandler) {
      this.tvist.root.removeEventListener('mouseleave', this.mouseLeaveHandler)
      this.mouseLeaveHandler = undefined
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
   * Рекурсивная функция для автоплея
   * Вызывается через setTimeout после каждого переключения
   */
  private run(): void {
    if (this.paused || this.stopped || !this.config) return

    // Если ждём видео — не запускаем таймер
    if (this.waitingForVideo) return

    const delay = this.config.delay

    // Запуск отслеживания прогресса
    this.startProgressTracking(delay)

    this.timer = window.setTimeout(() => {
      if (!this.paused && !this.stopped) {
        this.stopProgressTracking()
        this.tvist.next()
        this.run() // Рекурсивный вызов после переключения
      }
    }, delay)
  }

  /**
   * Запуск отслеживания прогресса autoplay таймера
   */
  private startProgressTracking(duration: number): void {
    this.stopProgressTracking()
    this.progressStartTime = performance.now()

    const tick = () => {
      if (this.paused || this.stopped || this.progressStartTime === null) return

      const elapsed = performance.now() - this.progressStartTime
      const progress = Math.min(elapsed / duration, 1)

      this.emit('autoplayProgress', {
        progress,
        index: this.tvist.activeIndex,
      })

      if (progress < 1) {
        this.progressRAF = requestAnimationFrame(tick)
      }
    }

    this.progressRAF = requestAnimationFrame(tick)
  }

  /**
   * Остановка отслеживания прогресса
   */
  private stopProgressTracking(): void {
    if (this.progressRAF !== null) {
      cancelAnimationFrame(this.progressRAF)
      this.progressRAF = null
    }
    this.progressStartTime = null
  }

  /**
   * Очистить только таймер (без остановки всего autoplay)
   */
  private cancelTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * Старт autoplay
   */
  start(): void {
    if (this.stopped) return

    this.stop() // Очищаем предыдущий таймер
    this.paused = false
    this.run() // Запускаем рекурсивный цикл

    this.emit('autoplayStart')
  }

  /**
   * Остановка autoplay
   */
  stop(): void {
    this.cancelTimer()
    this.stopProgressTracking()
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
      this.cancelTimer()
      this.stopProgressTracking()
      this.emit('autoplayPause')
    }
  }

  /**
   * Возобновление autoplay
   * Перезапускает таймер с полной задержкой
   */
  resume(): void {
    // Не возобновляем, если вкладка скрыта
    if (this.pausedByVisibility) {
      return
    }
    
    if (this.paused && !this.stopped) {
      this.paused = false
      // Перезапускаем с полной задержкой
      // Это предотвращает немедленное переключение после паузы
      this.run()
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
