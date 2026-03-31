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
import { findSlideByRealIndex } from '../../utils/slideRealIndex'
import type { Tvist } from '../../core/Tvist'
import type { AutoplayProgressEvent, TvistOptions, AutoplayOptions } from '../../core/types'

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
  private videoProgressHandler?: (data: { progress: number; index: number }) => void

  /** Переход был инициирован autoplay (next() из таймера или videoEnded). Не сбрасываем таймер на slideChangeEnd. */
  private transitionByAutoplay = false
  /** Таймаут для сброса transitionByAutoplay, если next() не привёл к переходу (например, слайдер на границе). */
  private clearTransitionByAutoplayTimeout: number | null = null
  /** Проверка, что autoplay next() реально привёл к смене слайда. */
  private boundaryCheckTimeout: number | null = null
  /** Момент последнего slideChangeEnd (нужен для корректного boundary тайминга). */
  private lastSlideChangeEndAt: number | null = null
  /** Момент последнего autoplay next(). */
  private lastAutoplayNextAt: number | null = null
  /** Диагностика последовательности autoplayProgress */
  private lastProgressIndex: number | null = null
  private lastProgressValue: number | null = null
  private lastProgressAt: number | null = null

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
    this.config = normalizeAutoplay(this.options.autoplay)
  }

  private isDebugEnabled(): boolean {
    return this.options.debug === true
  }

  private debugLog(message: string, data: Record<string, unknown> = {}): void {
    if (!this.isDebugEnabled()) return
    console.warn('[AutoplayModule]', message, data)
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
    this.clearTransitionByAutoplayFallback()
    this.clearBoundaryCheckTimeout()
    this.stopProgressTracking()
    this.detachHoverEvents()
    this.detachVisibilityEvents()
    this.detachVideoEndedListener()
    this.detachVideoProgressListener()
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
      const wasActive = this.config !== null
      const oldConfig = this.config
      
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
        this.detachVideoProgressListener()
        this.stopped = true
      }
      // Если autoplay был включен и остается включен (но изменились настройки)
      else if (wasActive && isNowActive && this.config) {
        // Переинициализируем hover events при изменении pauseOnHover
        this.detachHoverEvents()
        if (this.config.pauseOnHover) {
          this.attachHoverEvents()
        }
        
        // Если waitForVideo был отключен, сбрасываем связанные флаги
        if (oldConfig?.waitForVideo && !this.config.waitForVideo && this.waitingForVideo) {
          this.waitingForVideo = false
          this.videoEndedWhilePaused = false
          this.detachVideoEndedListener()
        }
        if (this.config.waitForVideo) {
          this.attachVideoProgressBridge()
        } else {
          this.detachVideoProgressListener()
        }
        
        this.start() // Перезапускаем с новой задержкой
      }
    }
  }

  /**
   * Отменить отложенный сброс transitionByAutoplay.
   * Вызываем при destroy и когда slideChangeEnd сбрасывает флаг (переход действительно произошёл).
   */
  private clearTransitionByAutoplayFallback(): void {
    if (this.clearTransitionByAutoplayTimeout !== null) {
      window.clearTimeout(this.clearTransitionByAutoplayTimeout)
      this.clearTransitionByAutoplayTimeout = null
    }
  }

  private clearBoundaryCheckTimeout(): void {
    if (this.boundaryCheckTimeout !== null) {
      window.clearTimeout(this.boundaryCheckTimeout)
      this.boundaryCheckTimeout = null
    }
  }

  /**
   * Запланировать сброс transitionByAutoplay через (speed * множитель) мс.
   * Если к тому моменту transitionEnd не сработал (next() не привёл к переходу, напр. граница без loop),
   * флаг сбросится и следующая ручная навигация корректно сбросит таймер.
   * 
   * Множитель 5 обеспечивает надёжный запас времени даже для очень медленных анимаций,
   * сложных CSS transitions или при сильной загрузке браузера. В нормальных условиях
   * флаг сбрасывается через transitionEnd задолго до срабатывания fallback.
   */
  private static readonly TRANSITION_FALLBACK_MULTIPLIER = 5

  private scheduleTransitionByAutoplayFallback(): void {
    this.clearTransitionByAutoplayFallback()
    const speed = this.options.speed ?? 300
    this.clearTransitionByAutoplayTimeout = window.setTimeout(() => {
      this.clearTransitionByAutoplayTimeout = null
      if (this.transitionByAutoplay) {
        this.transitionByAutoplay = false
      }
    }, speed * AutoplayModule.TRANSITION_FALLBACK_MULTIPLIER)
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

    this.attachVideoProgressBridge()

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
      // НЕ сбрасываем transitionByAutoplay здесь!
      // transitionEnd срабатывает РАНЬШЕ slideChangeEnd (см. Engine.ts:650-653),
      // поэтому если сбросить флаг здесь, slideChangeEnd всегда увидит его как false.
      // Это приводит к тому, что каждый autoplay-переход обрабатывается как ручная навигация,
      // вызывая cancelTimer() + run(), что добавляет animation duration к каждому циклу.
      
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

    // При смене слайда:
    // - при ручной навигации (стрелки, пагинация и т.д.) сбрасываем таймер,
    //   чтобы новый слайд показывался полное время delay, а не остаток от предыдущего счётчика
    // - при autoplay-переходах не трогаем таймер, чтобы не ломать рекурсивный цикл run()
    this.on('slideChangeEnd', (index: number) => {
      const byAutoplay = this.transitionByAutoplay
      const now = performance.now()
      if (byAutoplay && this.lastAutoplayNextAt !== null) {
        const speed = this.options.speed ?? 300
        this.lastSlideChangeEndAt = Math.max(now, this.lastAutoplayNextAt + speed)
      } else {
        this.lastSlideChangeEndAt = now
      }
      
      // Сбрасываем флаг и отменяем fallback
      if (this.transitionByAutoplay) {
        this.transitionByAutoplay = false
        this.clearTransitionByAutoplayFallback()
        this.clearBoundaryCheckTimeout()
      }
      
      // Для ручной навигации новый цикл стартует здесь.
      // Для autoplay-переходов цикл продолжается рекурсивно в run(),
      // чтобы delay не зависел от длительности анимации, и мы не сбрасывали таймер зря.
      // Исключение: non-loop с очень коротким delay (< speed) — там следующий шаг
      // намеренно запускается из slideChangeEnd, чтобы тик не сработал до окончания перехода.
      if (!this.paused && !this.stopped) {
        if (!byAutoplay) {
          // Ручная навигация: сбрасываем текущий цикл и запускаем новый от текущего слайда.
          this.cancelTimer()
          this.timeLeft = null
          this.progressStartOffset = 0
          this.stopProgressTracking()
          if (this.config?.waitForVideo) {
            this.handleSlideChangedForVideo(index)
          } else {
            this.run()
          }
        } else if (byAutoplay && this.config && !this.options.loop && this.config.delay < (this.options.speed ?? 300)) {
          // Non-loop + очень короткий delay: следующий autoplay-тик запускаем
          // после завершения перехода.
          this.run()
        } else if (this.config?.waitForVideo) {
          // Автоплей в режиме ожидания видео: обновляем слушатель для нового слайда.
          this.handleSlideChangedForVideo(index)
        }
      } else if (!byAutoplay && this.config?.waitForVideo) {
        this.handleSlideChangedForVideo(index)
      }
    })
  }

  private attachVideoProgressBridge(): void {
    if (!this.config?.waitForVideo) return

    this.detachVideoProgressListener()
    this.videoProgressHandler = (data: { progress: number; index: number }) => {
      if (!this.waitingForVideo || this.stopped) return
      this.emitAutoplayProgress(data.index, Math.min(Math.max(data.progress, 0), 1))
    }
    this.on('videoProgress', this.videoProgressHandler)
  }

  private detachVideoProgressListener(): void {
    if (!this.videoProgressHandler) return
    this.off('videoProgress', this.videoProgressHandler)
    this.videoProgressHandler = undefined
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
    const slide = findSlideByRealIndex(this.tvist.slides, index)

    // Если слайд не найден (некорректный индекс или проблема с DOM), запускаем обычный таймер
    // чтобы autoplay продолжил работу, а не остановился навсегда
    if (!slide) {
      this.cancelTimer()
      this.stopProgressTracking()
      this.timeLeft = null
      this.progressStartOffset = 0
      this.run()
      return
    }

    const video = slide.querySelector('video')
    if (!video) {
      // Нет видео — запускаем таймер. Отменяем существующий, чтобы не было двух таймеров:
      // при переходе по autoplay с waitForVideo run() уже вызван в колбеке таймера, затем
      // slideChangeEnd вызывает handleSlideChangedForVideo → run() — без отмены остался бы
      // «сиротский» таймер и лишний next().
      this.cancelTimer()
      this.stopProgressTracking()
      this.timeLeft = null
      this.progressStartOffset = 0
      this.run()
      return
    }

    // Есть видео — останавливаем таймер, ждём videoEnded
    this.waitingForVideo = true
    this.cancelTimer()
    this.stopProgressTracking()
    this.emitAutoplayProgress(index, 0)

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
      this.emitAutoplayProgress(this.tvist.realIndex ?? this.tvist.activeIndex, 1)
      this.waitingForVideo = false
      
      // Запоминаем индекс до навигации
      const indexBefore = this.tvist.activeIndex
      
      this.transitionByAutoplay = true
      this.tvist.next()
      
      // Проверяем, изменился ли индекс (произошла ли навигация)
      // Если индекс не изменился (граница без loop), сбрасываем флаг немедленно
      if (this.tvist.activeIndex === indexBefore) {
        this.transitionByAutoplay = false
        // Не планируем fallback, т.к. переход не произошёл
      } else {
        this.scheduleTransitionByAutoplayFallback()
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
    this.mouseEnterHandler = () => {
      this.pause()
      // Только hover: VideoModule синхронизирует HTML-video (не путать с pause() от drag/вкладки)
      this.emit('autoplayHoverPause')
    }
    this.mouseLeaveHandler = () => {
      this.resume()
      this.emit('autoplayHoverResume')
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
        
        // Запоминаем индекс до навигации
        const indexBefore = this.tvist.activeIndex
        const slidesPerPage = this.options.perPage ?? 1
        const endIndex = Math.max(0, this.tvist.slides.length - slidesPerPage)
        const boundaryAttempt = !this.options.loop && !this.options.rewind && indexBefore >= endIndex
        
        this.transitionByAutoplay = true
        this.lastAutoplayNextAt = performance.now()
        this.tvist.next()
        
        // На заведомой границе (без loop/rewind) next() не изменит индекс.
        // Флаг нужно сбросить сразу, иначе ручная навигация попадёт в false-positive "autoplay".
        if (boundaryAttempt) {
          this.transitionByAutoplay = false
          this.clearTransitionByAutoplayFallback()
        } else {
          this.scheduleTransitionByAutoplayFallback()
        }
        // Продолжаем autoplay цикл рекурсивно сразу после попытки перехода.
        // В не-loop режиме при delay < speed продолжаем цикл из slideChangeEnd.
        const speed = this.options.speed ?? 300
        if (!this.config?.waitForVideo) {
          if (this.config && !this.options.loop && this.config.delay < speed) {
            // no-op: continue from slideChangeEnd
          } else {
            this.run()
          }
        }

        this.clearBoundaryCheckTimeout()
        const boundaryDelay = speed === 0 ? 0 : speed + 20
        this.boundaryCheckTimeout = window.setTimeout(() => {
          this.boundaryCheckTimeout = null
          if (this.paused || this.stopped) return

          // Если после ожидаемой длительности перехода индекс всё ещё тот же,
          // считаем, что next() уткнулся в границу без loop.
          if (this.tvist.activeIndex !== indexBefore) return

          // reachEnd должен приходить только после полного показа последнего слайда:
          // delay + время проверки границы от момента slideChangeEnd.
          if (this.lastSlideChangeEndAt !== null && this.config) {
            const minElapsed = this.config.delay + boundaryDelay
            const elapsed = performance.now() - this.lastSlideChangeEndAt
            if (elapsed < minElapsed) {
              this.boundaryCheckTimeout = window.setTimeout(() => {
                this.boundaryCheckTimeout = null
                if (this.paused || this.stopped) return
                if (this.tvist.activeIndex !== indexBefore) return
                this.transitionByAutoplay = false
                this.clearTransitionByAutoplayFallback()
                this.emitAutoplayProgress(this.tvist.realIndex ?? this.tvist.activeIndex, 1)
                if (!this.options.loop) {
                  this.tvist.emit('reachEnd')
                }
                this.stop()
              }, Math.max(0, Math.ceil(minElapsed - elapsed)))
              return
            }
          }

          this.transitionByAutoplay = false
          this.clearTransitionByAutoplayFallback()
          this.emitAutoplayProgress(this.tvist.realIndex ?? this.tvist.activeIndex, 1)
          if (!this.options.loop) {
            this.tvist.emit('reachEnd')
          }
          this.stop()
          this.debugLog('autoplay boundary reached (no index change)', {
            indexBefore,
            loop: this.options.loop === true,
          })
        }, boundaryDelay)
      }
    }, delay)
  }

  private startProgressTracking(timeLeft: number, totalDuration: number, startOffset: number): void {
    this.stopProgressTracking()

    if (timeLeft <= 0) {
      this.emitAutoplayProgress(this.tvist.activeIndex, 1)
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

      this.emitAutoplayProgress(this.tvist.activeIndex, progress)

      if (progress < 1 && !this.paused && !this.stopped) {
        this.progressRAF = requestAnimationFrame(tick)
      }
    }

    this.progressRAF = requestAnimationFrame(tick)
  }

  private emitAutoplayProgress(index: number, progress: number): void {
    const now = performance.now()
    const previousIndex = this.lastProgressIndex
    const previousValue = this.lastProgressValue
    const previousAt = this.lastProgressAt

    if (previousIndex !== null && previousValue !== null && previousAt !== null) {
      const deltaMs = now - previousAt
      const decreasedInSameIndex = previousIndex === index && progress + 0.001 < previousValue
      const sameIndexWrap = previousIndex === index && previousValue > 0.95 && progress < 0.05

      if (decreasedInSameIndex) {
        this.debugLog('progress decreased in same index', {
          index,
          prev: Number(previousValue.toFixed(4)),
          next: Number(progress.toFixed(4)),
          deltaMs: Number(deltaMs.toFixed(2)),
          waitingForVideo: this.waitingForVideo,
          paused: this.paused,
          stopped: this.stopped,
          sameIndexWrap,
        })
      }
    }

    this.lastProgressIndex = index
    this.lastProgressValue = progress
    this.lastProgressAt = now

    const payload: AutoplayProgressEvent = {
      progress,
      index,
      segmentIndex: index,
      segmentProgress: progress,
      totalSegments: this.tvist.slides.length,
    }
    this.emit('autoplayProgress', payload)
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
    this.clearTransitionByAutoplayFallback()
    this.clearBoundaryCheckTimeout()
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
        
        // Запоминаем индекс до навигации
        const indexBefore = this.tvist.activeIndex
        
        this.transitionByAutoplay = true
        this.tvist.next()
        
        // Проверяем, изменился ли индекс (произошла ли навигация)
        // Если индекс не изменился (граница без loop), сбрасываем флаг немедленно
        if (this.tvist.activeIndex === indexBefore) {
          this.transitionByAutoplay = false
          // Не планируем fallback, т.к. переход не произошёл
          
          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если навигация не произошла (граница без loop),
          // нужно перезапустить autoplay, иначе он останется застрявшим.
          // slideChangeEnd не будет эмититься, т.к. индекс не изменился,
          // поэтому handleSlideChangedForVideo не будет вызван.
          // Если включен waitForVideo, вызываем handleSlideChangedForVideo для текущего слайда,
          // иначе просто запускаем таймер.
          if (this.config?.waitForVideo) {
            this.handleSlideChangedForVideo(this.tvist.realIndex ?? this.tvist.activeIndex)
          } else {
            this.run()
          }
        } else {
          this.scheduleTransitionByAutoplayFallback()
        }
        
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
