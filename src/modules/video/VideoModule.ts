/**
 * Video Module
 * 
 * Управление видео внутри слайдов (HTML <video> и iframe YouTube/Vimeo).
 * 
 * Возможности:
 * - Автовоспроизведение видео при активации слайда
 * - Пауза/сброс при уходе со слайда
 * - Mute/unmute с обходами для iOS
 * - Прогресс воспроизведения (videoProgress)
 * - Обработка visibility (вкладка, viewport)
 * - Поддержка iframe через GET-параметры
 * - Безопасный play() с обработкой Promise/AbortError
 * - Автоустановка атрибутов (muted, playsinline, loop)
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions, VideoOptions, VideoEvent, VideoProgressEvent } from '../../core/types'

/** Дефолтные значения для VideoOptions */
const VIDEO_DEFAULTS: Required<VideoOptions> = {
  autoplay: true,
  muted: true,
  loop: false,
  playsinline: true,
  pauseOnLeave: true,
  resetOnLeave: false,
}

/** Запись о видео на слайде */
interface VideoEntry {
  slideIndex: number
  slide: HTMLElement
  video: HTMLVideoElement
  /** Подключённые обработчики для очистки */
  handlers: Map<string, EventListener>
}

/** Запись об iframe на слайде */
interface IframeEntry {
  slideIndex: number
  slide: HTMLElement
  iframe: HTMLIFrameElement
  /** Оригинальный src (без autoplay параметров) */
  originalSrc: string
}

/**
 * Нормализация video опций
 */
function normalizeVideoOptions(raw: TvistOptions['video']): Required<VideoOptions> | null {
  if (raw === false || raw === undefined) return null
  if (raw === true) return { ...VIDEO_DEFAULTS }

  return {
    autoplay: raw.autoplay ?? VIDEO_DEFAULTS.autoplay,
    muted: raw.muted ?? VIDEO_DEFAULTS.muted,
    loop: raw.loop ?? VIDEO_DEFAULTS.loop,
    playsinline: raw.playsinline ?? VIDEO_DEFAULTS.playsinline,
    pauseOnLeave: raw.pauseOnLeave ?? VIDEO_DEFAULTS.pauseOnLeave,
    resetOnLeave: raw.resetOnLeave ?? VIDEO_DEFAULTS.resetOnLeave,
  }
}

// ==================== Утилиты iframe ====================

const YOUTUBE_REGEX = /(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)/i
const VIMEO_REGEX = /player\.vimeo\.com\/video\//i

function isYouTubeUrl(src: string): boolean {
  return YOUTUBE_REGEX.test(src)
}

function isVimeoUrl(src: string): boolean {
  return VIMEO_REGEX.test(src)
}

function isVideoIframe(src: string): boolean {
  return isYouTubeUrl(src) || isVimeoUrl(src)
}

/**
 * Добавить/обновить GET-параметры в URL iframe
 */
function setIframeParams(src: string, params: Record<string, string>): string {
  try {
    const url = new URL(src)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return url.toString()
  } catch {
    // Если URL невалидный, возвращаем как есть
    return src
  }
}

/**
 * Построить параметры autoplay для iframe
 */
function buildAutoplayParams(provider: 'youtube' | 'vimeo', muted: boolean): Record<string, string> {
  if (provider === 'youtube') {
    return {
      autoplay: '1',
      mute: muted ? '1' : '0',
      playsinline: '1',
      showinfo: '0',
      controls: '0',
      rel: '0',
      iv_load_policy: '3',
    }
  }
  // Vimeo
  return {
    autoplay: '1',
    muted: muted ? '1' : '0',
    playsinline: '1',
  }
}

function buildStopParams(provider: 'youtube' | 'vimeo'): Record<string, string> {
  if (provider === 'youtube') {
    return { autoplay: '0' }
  }
  return { autoplay: '0' }
}

function getProvider(src: string): 'youtube' | 'vimeo' | null {
  if (isYouTubeUrl(src)) return 'youtube'
  if (isVimeoUrl(src)) return 'vimeo'
  return null
}

// ==================== VideoModule ====================

export class VideoModule extends Module {
  readonly name = 'video'

  private config: Required<VideoOptions> | null = null
  private videos = new Map<number, VideoEntry>()
  private iframes = new Map<number, IframeEntry>()

  /** Глобальное состояние mute */
  private muted = true

  /** Текущий активный Promise от play() — для предотвращения race condition */
  private activePlayPromise: Promise<void> | null = null

  /** RAF id для videoProgress */
  private progressRAF: number | null = null

  /** Предыдущий активный индекс (для отслеживания смены) */
  private previousIndex = -1

  /** IntersectionObserver для viewport visibility */
  private intersectionObserver: IntersectionObserver | null = null

  /** visibilitychange handler */
  private visibilityHandler?: () => void

  /** Видео поставлено на паузу из-за невидимости */
  private pausedByVisibility = false

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
    this.config = normalizeVideoOptions(this.options.video)
    if (this.config) {
      this.muted = this.config.muted
    }
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.scanSlides()
    this.setupVisibilityHandlers()

    // Запускаем видео на начальном слайде
    const startIndex = this.tvist.activeIndex
    this.previousIndex = startIndex
    this.activateSlide(startIndex)
  }

  override destroy(): void {
    this.stopProgressTracking()
    this.deactivateAll()
    this.cleanupVideoListeners()
    this.teardownVisibilityHandlers()
    this.videos.clear()
    this.iframes.clear()
  }

  protected override shouldBeActive(): boolean {
    return this.config !== null
  }

  /**
   * Хук смены слайда — ядро модуля
   */
  override onSlideChange(index: number): void {
    if (!this.config) return
    
    const prev = this.previousIndex
    this.previousIndex = index

    // Деактивируем предыдущий слайд
    if (prev !== -1 && prev !== index) {
      this.deactivateSlide(prev)
    }

    // Активируем новый слайд
    this.activateSlide(index)
  }

  /**
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.video !== undefined) {
      const wasActive = this.config !== null
      this.config = normalizeVideoOptions(newOptions.video)
      const isNowActive = this.config !== null

      if (!wasActive && isNowActive) {
        this.muted = this.config!.muted
        this.scanSlides()
        this.setupVisibilityHandlers()
        this.activateSlide(this.tvist.activeIndex)
      } else if (wasActive && !isNowActive) {
        this.destroy()
      } else if (wasActive && isNowActive) {
        // Переприменяем атрибуты при изменении настроек
        this.applyVideoAttributes()
      }
    }
  }

  // ==================== Сканирование ====================

  /**
   * Сканировать слайды и найти все видео/iframe
   */
  private scanSlides(): void {
    this.videos.clear()
    this.iframes.clear()

    this.tvist.slides.forEach((slide, index) => {
      // HTML <video>
      const video = slide.querySelector('video')
      if (video) {
        this.registerVideo(index, slide, video)
      }

      // iframe (YouTube/Vimeo)
      const iframe = slide.querySelector('iframe')
      if (iframe) {
        const src = iframe.getAttribute('src') || iframe.getAttribute('data-src') || ''
        if (isVideoIframe(src)) {
          this.registerIframe(index, slide, iframe, src)
        }
      }
    })
  }

  /**
   * Зарегистрировать HTML video
   */
  private registerVideo(index: number, slide: HTMLElement, video: HTMLVideoElement): void {
    if (!this.config) return

    // Установить атрибуты
    if (this.config.muted) {
      video.muted = true
      video.setAttribute('muted', '')
    }
    if (this.config.playsinline) {
      video.setAttribute('playsinline', '')
      video.playsInline = true
    }
    if (this.config.loop) {
      video.loop = true
    }
    // Убираем нативный autoplay — управляем сами
    video.removeAttribute('autoplay')
    video.autoplay = false

    const entry: VideoEntry = {
      slideIndex: index,
      slide,
      video,
      handlers: new Map(),
    }

    // Навешиваем слушатели
    this.setupVideoListeners(entry)

    this.videos.set(index, entry)
  }

  /**
   * Зарегистрировать iframe
   */
  private registerIframe(index: number, slide: HTMLElement, iframe: HTMLIFrameElement, src: string): void {
    // Добавляем allow="autoplay" для корректной работы
    const currentAllow = iframe.getAttribute('allow') || ''
    if (!currentAllow.includes('autoplay')) {
      iframe.setAttribute('allow', currentAllow ? `${currentAllow}; autoplay` : 'autoplay')
    }

    // Сохраняем оригинальный src (без наших параметров)
    this.iframes.set(index, {
      slideIndex: index,
      slide,
      iframe,
      originalSrc: src,
    })
  }

  /**
   * Применить атрибуты ко всем зарегистрированным видео
   */
  private applyVideoAttributes(): void {
    if (!this.config) return

    this.videos.forEach(entry => {
      const { video } = entry
      video.muted = this.muted
      if (this.config!.playsinline) {
        video.setAttribute('playsinline', '')
        video.playsInline = true
      }
      if (this.config!.loop) {
        video.loop = true
      } else {
        video.loop = false
      }
    })
  }

  // ==================== Слушатели видео ====================

  /**
   * Навесить слушатели на видео-элемент
   */
  private setupVideoListeners(entry: VideoEntry): void {
    const { video, slide, slideIndex } = entry

    const addHandler = (event: string, handler: EventListener) => {
      video.addEventListener(event, handler)
      entry.handlers.set(event, handler)
    }

    // loadedmetadata — видео готово
    addHandler('loadedmetadata', () => {
      const payload: VideoEvent = { slide, video, index: slideIndex }
      this.emit('videoReady', payload)
    })

    // play
    addHandler('play', () => {
      const payload: VideoEvent = { slide, video, index: slideIndex }
      this.emit('videoPlay', payload)
    })

    // pause
    addHandler('pause', () => {
      const payload: VideoEvent = { slide, video, index: slideIndex }
      this.emit('videoPause', payload)
    })

    // ended
    addHandler('ended', () => {
      const payload: VideoEvent = { slide, video, index: slideIndex }
      this.emit('videoEnded', payload)
    })

    // timeupdate — для прогресса
    addHandler('timeupdate', () => {
      if (video.duration && isFinite(video.duration)) {
        const payload: VideoProgressEvent = {
          slide,
          video,
          index: slideIndex,
          progress: video.currentTime / video.duration,
          currentTime: video.currentTime,
          duration: video.duration,
        }
        this.emit('videoProgress', payload)
      }
    })
  }

  /**
   * Очистить все слушатели видео
   */
  private cleanupVideoListeners(): void {
    this.videos.forEach(entry => {
      entry.handlers.forEach((handler, event) => {
        entry.video.removeEventListener(event, handler)
      })
      entry.handlers.clear()
    })
  }

  // ==================== Активация/деактивация слайдов ====================

  /**
   * Активировать видео на слайде
   */
  private activateSlide(index: number): void {
    if (!this.config) return

    // HTML video
    const videoEntry = this.videos.get(index)
    if (videoEntry && this.config.autoplay) {
      this.safePlay(videoEntry.video)
    }

    // iframe
    const iframeEntry = this.iframes.get(index)
    if (iframeEntry && this.config.autoplay) {
      this.activateIframe(iframeEntry)
    }
  }

  /**
   * Деактивировать видео на слайде
   */
  private deactivateSlide(index: number): void {
    if (!this.config) return

    // HTML video
    const videoEntry = this.videos.get(index)
    if (videoEntry) {
      if (this.config.pauseOnLeave) {
        videoEntry.video.pause()
      }
      if (this.config.resetOnLeave) {
        videoEntry.video.currentTime = 0
      }
    }

    // iframe
    const iframeEntry = this.iframes.get(index)
    if (iframeEntry) {
      this.deactivateIframe(iframeEntry)
    }

    this.stopProgressTracking()
  }

  /**
   * Деактивировать все видео
   */
  private deactivateAll(): void {
    this.videos.forEach(entry => {
      entry.video.pause()
      entry.video.currentTime = 0
    })
    this.iframes.forEach(entry => {
      this.deactivateIframe(entry)
    })
    this.stopProgressTracking()
  }

  // ==================== Безопасный play ====================

  /**
   * Безопасно воспроизвести видео с обработкой:
   * - readyState (ожидание canplay если не загружено)
   * - Promise rejection (AbortError при быстром pause())
   * - Race condition (отмена предыдущего play)
   */
  private safePlay(video: HTMLVideoElement): void {
    // Применяем mute состояние
    video.muted = this.muted

    const doPlay = () => {
      const playPromise = video.play()
      this.activePlayPromise = playPromise

      playPromise
        .then(() => {
          if (this.activePlayPromise === playPromise) {
            this.activePlayPromise = null
          }
        })
        .catch((error: DOMException) => {
          if (this.activePlayPromise === playPromise) {
            this.activePlayPromise = null
          }
          // AbortError — нормальная ситуация при быстром pause() после play()
          if (error.name !== 'AbortError') {
            console.warn('Tvist VideoModule: playback failed:', error.message)
          }
        })
    }

    // Проверяем readyState
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
      doPlay()
    } else {
      // Ждём canplay
      const onCanPlay = () => {
        video.removeEventListener('canplay', onCanPlay)
        requestAnimationFrame(doPlay)
      }
      video.addEventListener('canplay', onCanPlay)
    }
  }

  // ==================== iframe управление ====================

  /**
   * Активировать iframe (добавить autoplay GET-параметры)
   */
  private activateIframe(entry: IframeEntry): void {
    const provider = getProvider(entry.originalSrc)
    if (!provider) return

    const params = buildAutoplayParams(provider, this.muted)
    const newSrc = setIframeParams(entry.originalSrc, params)

    if (entry.iframe.src !== newSrc) {
      entry.iframe.src = newSrc
    }
  }

  /**
   * Деактивировать iframe (убрать autoplay)
   */
  private deactivateIframe(entry: IframeEntry): void {
    const provider = getProvider(entry.originalSrc)
    if (!provider) return

    const params = buildStopParams(provider)
    const newSrc = setIframeParams(entry.originalSrc, params)

    if (entry.iframe.src !== newSrc) {
      entry.iframe.src = newSrc
    }
  }

  // ==================== Прогресс ====================

  /**
   * Остановить отслеживание прогресса через RAF
   */
  private stopProgressTracking(): void {
    if (this.progressRAF !== null) {
      cancelAnimationFrame(this.progressRAF)
      this.progressRAF = null
    }
  }

  // ==================== Visibility ====================

  /**
   * Настроить обработчики видимости (viewport + вкладка)
   */
  private setupVisibilityHandlers(): void {
    // IntersectionObserver — пауза при выходе из viewport
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              this.pauseByVisibility()
            } else {
              this.resumeFromVisibility()
            }
          })
        },
        { threshold: 0.1 }
      )
      this.intersectionObserver.observe(this.tvist.root)
    }

    // visibilitychange — пауза при скрытии вкладки
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.pauseByVisibility()
      } else if (document.visibilityState === 'visible') {
        this.resumeFromVisibility()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  /**
   * Убрать обработчики видимости
   */
  private teardownVisibilityHandlers(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = undefined
    }
  }

  /**
   * Поставить текущее видео на паузу из-за невидимости
   */
  private pauseByVisibility(): void {
    if (this.pausedByVisibility) return
    this.pausedByVisibility = true

    const entry = this.videos.get(this.tvist.activeIndex)
    if (entry && !entry.video.paused) {
      entry.video.pause()
    }
  }

  /**
   * Возобновить текущее видео после возврата видимости
   */
  private resumeFromVisibility(): void {
    if (!this.pausedByVisibility) return
    this.pausedByVisibility = false

    if (!this.config?.autoplay) return

    const entry = this.videos.get(this.tvist.activeIndex)
    if (entry && entry.video.paused) {
      this.safePlay(entry.video)
    }
  }

  // ==================== Публичное API ====================

  /**
   * Воспроизвести видео на слайде (текущем или по индексу)
   */
  playVideo(index?: number): void {
    const idx = index ?? this.tvist.activeIndex
    const entry = this.videos.get(idx)
    if (entry) {
      this.safePlay(entry.video)
    }
  }

  /**
   * Поставить видео на паузу
   */
  pauseVideo(index?: number): void {
    const idx = index ?? this.tvist.activeIndex
    const entry = this.videos.get(idx)
    if (entry) {
      entry.video.pause()
    }
  }

  /**
   * Выключить звук на всех видео
   */
  muteAll(): void {
    this.muted = true
    this.videos.forEach(entry => {
      entry.video.muted = true
      entry.video.volume = 0
    })
  }

  /**
   * Включить звук на всех видео (вызывать после жеста пользователя)
   */
  unmuteAll(): void {
    this.muted = false
    this.videos.forEach(entry => {
      entry.video.muted = false
      entry.video.volume = 1

      // Хак для iOS: дёрнуть currentTime для активации звука после unmute
      const ct = entry.video.currentTime
      entry.video.currentTime = ct
    })
  }

  /**
   * Проверить состояние mute
   */
  isMutedState(): boolean {
    return this.muted
  }

  /**
   * Публичное API — получить объект с методами.
   * Возвращает undefined если модуль неактивен.
   */
  getVideo() {
    if (!this.config) return undefined

    return {
      play: (index?: number) => this.playVideo(index),
      pause: (index?: number) => this.pauseVideo(index),
      mute: () => this.muteAll(),
      unmute: () => this.unmuteAll(),
      isMuted: () => this.isMutedState(),
    }
  }
}
