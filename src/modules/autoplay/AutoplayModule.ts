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

  // Для корректного возобновления после паузы
  private timeLeft: number | null = null
  private currentDuration = 0
  private currentChunkDuration = 0

  // Для autoplayProgress
  private progressRAF: number | null = null
  private progressStartTime: number | null = null
  private progressStartOffset = 0

  // Для waitForVideo — слушаем videoEnded
  private waitingForVideo = false
  private videoEndedWhilePaused = false  // видео закончилось пока autoplay на паузе (hover)
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

  public override shouldBeActive(): boolean {
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
   * Вызывается из transitionEnd или fallback timeout.
   * Сбрасываем timeLeft, чтобы следующий цикл шёл с полной задержкой (delay),
   * а не с остатком до переключения — иначе слайдер перелистнётся сразу после отпускания.
   */
  private resumeAfterDrag(): void {
    if (!this.isDragging) return
    
    this.isDragging = false
    this.clearDragEndTimeout()
    this.timeLeft = null
    this.progressStartOffset = 0

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
    this.on('slideChangeEnd', (index: number) => {
      if (!this.config?.waitForVideo) return
      this.handleSlideChangedForVideo(index)
    })
  }

  /**
   * Обработка смены слайда для режима waitForVideo.
   * index из slideChangeEnd — это normalizedIndex (= realIndex), НЕ DOM-позиция.
   * В loop-режиме DOM-позиция может отличаться, поэтому ищем слайд по data-tvist-slide-index.
   */
  private handleSlideChangedForVideo(index: number): void {
    // Снимаем предыдущий videoEnded listener
    this.detachVideoEndedListener()
    this.waitingForVideo = false
    this.videoEndedWhilePaused = false

    // index = realIndex. Ищем слайд по data-tvist-slide-index (loop) или по DOM-позиции (обычный)
    const slide = this.findSlideByRealIndex(index)

    if (!slide) return

    const video = slide.querySelector('video')
    if (!video) {
      // Нет видео — запускаем таймер (он мог быть отменён предыдущим waitingForVideo)
      this.run()
      return
    }

    // Есть видео — останавливаем таймер, ждём videoEnded
    this.waitingForVideo = true
    this.cancelTimer()
    this.stopProgressTracking()

    this.videoEndedHandler = () => {
      if (this.stopped || !this.waitingForVideo) {
        return
      }
      if (this.paused) {
        // Видео закончилось пока autoplay на паузе (hover).
        // Запоминаем — при resume() обработаем.
        this.videoEndedWhilePaused = true
        return
      }
      this.waitingForVideo = false
      this.tvist.next()
    }

    this.on('videoEnded', this.videoEndedHandler)
  }

  /**
   * Найти DOM-элемент слайда по realIndex (data-tvist-slide-index).
   * В loop-режиме DOM-позиция может не совпадать с realIndex.
   */
  private findSlideByRealIndex(realIndex: number): HTMLElement | undefined {
    const slides = this.tvist.slides
    
    // Сначала пробуем по data-tvist-slide-index (loop mode)
    for (const slide of slides) {
      const dataAttr = slide.getAttribute('data-tvist-slide-index')
      if (dataAttr !== null && parseInt(dataAttr, 10) === realIndex) {
        return slide
      }
    }
    
    // Fallback: по DOM-позиции (обычный режим, без loop)
    return slides[realIndex]
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
    this.mouseEnterHandler = () => {
      this.pause()
    }
    this.mouseLeaveHandler = () => {
      this.resume()
    }

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

    // Если timeLeft есть, значит мы возобновляем после паузы
    // Иначе начинаем новый цикл (полная задержка)
    const delay = this.timeLeft ?? this.config.delay
    
    // Если это новый цикл, сбрасываем параметры
    if (this.timeLeft === null) {
      this.currentDuration = this.config.delay
      this.progressStartOffset = 0
    }
    
    // Запоминаем длительность текущего отрезка для расчёта паузы
    this.currentChunkDuration = delay

    // Запуск отслеживания прогресса
    this.startProgressTracking(delay, this.currentDuration, this.progressStartOffset)

    this.timer = window.setTimeout(() => {
      if (!this.paused && !this.stopped) {
        this.timeLeft = null // Сбрасываем timeLeft для следующего шага
        this.progressStartOffset = 0
        this.stopProgressTracking()
        this.tvist.next()
        this.run() // Рекурсивный вызов после переключения
      }
    }, delay)
  }

  private startProgressTracking(timeLeft: number, totalDuration: number, startOffset: number): void {
    this.stopProgressTracking()

    if (timeLeft <= 0) {
      this.emit('autoplayProgress', { progress: 1, index: this.tvist.activeIndex })
      return
    }

    this.progressStartTime = performance.now()

    const tick = () => {
      if (this.paused || this.stopped || this.progressStartTime === null) return

      const elapsed = performance.now() - this.progressStartTime
      // Прогресс текущего отрезка (от 0 до 1)
      const chunkProgress = Math.min(elapsed / timeLeft, 1)
      
      // Общий прогресс = смещение + (часть отрезка * доля отрезка в общем времени)
      // Доля отрезка = timeLeft / totalDuration
      let progress = startOffset + (chunkProgress * (timeLeft / totalDuration))
      progress = Math.min(progress, 1)

      this.emit('autoplayProgress', {
        progress,
        index: this.tvist.activeIndex,
      })

      if (progress < 1 && !this.paused && !this.stopped) {
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

    // Если включен режим ожидания видео, проверяем текущий слайд сразу при старте
    if (this.config?.waitForVideo) {
      // Используем realIndex для loop режима, иначе activeIndex
      const currentIndex = this.tvist.realIndex ?? this.tvist.activeIndex
      this.handleSlideChangedForVideo(currentIndex)
    } else {
      this.run() // Запускаем рекурсивный цикл
    }

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
      
      // Вычисляем оставшееся время и текущий прогресс
      if (this.timer !== null && this.progressStartTime !== null && !this.waitingForVideo) {
        const elapsed = performance.now() - this.progressStartTime
        
        // Сколько осталось от ТЕКУЩЕГО отрезка
        this.timeLeft = Math.max(0, this.currentChunkDuration - elapsed)
        
        // Накопленный прогресс = стартовый + пройденный за этот отрезок
        const chunkElapsedRatio = elapsed / this.currentDuration
        this.progressStartOffset = Math.min(1, this.progressStartOffset + chunkElapsedRatio)
      }

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
      
      // Если видео закончилось пока мы были на паузе — обрабатываем сейчас
      if (this.videoEndedWhilePaused && this.waitingForVideo) {
        this.videoEndedWhilePaused = false
        this.waitingForVideo = false
        this.tvist.next()
        this.emit('autoplayResume')
        return
      }
      this.videoEndedWhilePaused = false
      
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
