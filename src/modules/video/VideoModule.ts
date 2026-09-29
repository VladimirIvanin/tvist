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
import { createComponent, type Component } from '../Component';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions, VideoOptions, VideoEvent, VideoProgressEvent } from '../../core/types';
/** Дефолтные значения для VideoOptions */
const VIDEO_DEFAULTS: Required<VideoOptions> = {
  autoplay: true,
  muted: true,
  loop: false,
  playsinline: true,
  pauseOnLeave: true,
  resetOnLeave: false,
  pauseOnHold: false,
};
/** Запись о видео на слайде */
interface VideoEntry {
  slideIndex: number;
  slide: HTMLElement;
  video: HTMLVideoElement;
  /** Подключённые обработчики для очистки */
  handlers: Map<string, EventListener>;
}
/** Запись об iframe на слайде */
interface IframeEntry {
  iframe: HTMLIFrameElement;
  /** Оригинальный src (без autoplay параметров) */
  originalSrc: string;
}
/**
 * Нормализация video опций
 */
function normalizeVideoOptions(raw: TvistOptions['video']): Required<VideoOptions> | null {
  if (raw === false || raw === undefined) return null;
  if (raw === true) return { ...VIDEO_DEFAULTS };
  const options = { ...VIDEO_DEFAULTS };
  for (const key of Object.keys(VIDEO_DEFAULTS) as (keyof VideoOptions)[]) {
    options[key] = raw[key] ?? VIDEO_DEFAULTS[key];
  }
  return options;
}
function isHoldToPauseEnabled(raw: TvistOptions['holdToPause']): boolean {
  if (!raw) return false;
  if (raw === true) return true;
  return raw.enabled !== false;
}
// ==================== Утилиты iframe ====================
const YOUTUBE_REGEX = /(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)/i;
const VIMEO_REGEX = /player\.vimeo\.com\/video\//i;
/**
 * Добавить/обновить GET-параметры в URL iframe
 */
function setIframeParams(src: string, params: Record<string, string>): string {
  try {
    const url = new URL(src);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    // Если URL невалидный, возвращаем как есть
    return src;
  }
}
/**
 * Построить параметры autoplay для iframe
 */
function buildAutoplayParams(
  provider: 'youtube' | 'vimeo',
  muted: boolean
): Record<string, string> {
  if (provider === 'youtube') {
    return {
      autoplay: '1',
      mute: muted ? '1' : '0',
      playsinline: '1',
      showinfo: '0',
      controls: '0',
      rel: '0',
      iv_load_policy: '3',
    };
  }
  // Vimeo
  return {
    autoplay: '1',
    muted: muted ? '1' : '0',
    playsinline: '1',
  };
}
function getProvider(src: string): 'youtube' | 'vimeo' | null {
  if (YOUTUBE_REGEX.test(src)) return 'youtube';
  if (VIMEO_REGEX.test(src)) return 'vimeo';
  return null;
}

/** Internal component; state lives in this factory's closure. */
export interface VideoModule extends Component {
  readonly name: 'video';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Хук смены слайда — ядро модуля.
   * ВАЖНО: index из slideChangeStart — это normalizedIndex (= realIndex, оригинальный 0..N-1),
   * а НЕ DOM-позиция. В loop-режиме DOM-позиция может отличаться после перестановки слайдов.
   * Видео ищем напрямую по realIndex (ключ в this.videos Map).
   */
  onSlideChange(index: number): void;
  /**
   * Обработка обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  // ==================== Публичное API ====================
  /**
   * Воспроизвести видео на слайде (текущем или по индексу)
   */
  playVideo(index?: number): void;
  /**
   * Поставить видео на паузу
   */
  pauseVideo(index?: number): void;
  /**
   * Выключить звук на всех видео
   */
  muteAll(): void;
  /**
   * Включить звук на всех видео (вызывать после жеста пользователя)
   */
  unmuteAll(): void;
  /**
   * Проверить состояние mute
   */
  isMutedState(): boolean;
  /**
   * Поставить активное видео на паузу из-за long press.
   * Работает только для HTML video на активном слайде.
   */
  pauseActiveForHold(): void;
  /**
   * Возобновить активное видео после long press.
   */
  resumeActiveAfterHold(): void;
  /**
   * Публичное API — получить объект с методами.
   * Возвращает undefined если модуль неактивен.
   */
  getVideo():
    | {
        play: (index?: number) => void;
        pause: (index?: number) => void;
        mute: () => void;
        unmute: () => void;
        isMuted: () => boolean;
      }
    | undefined;
}

export function createVideoModule(tvist: Tvist, options: TvistOptions): VideoModule {
  const base = createComponent(tvist, options);

  const local_name = 'video' as const;

  let local_config: Required<VideoOptions> | null = null;

  const local_videos: Map<number, VideoEntry> = new Map<number, VideoEntry>();

  const local_iframes: Map<number, IframeEntry> = new Map<number, IframeEntry>();
  /** Глобальное состояние mute */
  let local_muted = true;
  /** RAF id для videoProgress */
  let local_progressRAF: number | null = null;
  /** Предыдущий активный индекс (для отслеживания смены) */
  let local_previousIndex = -1;
  /** IntersectionObserver для viewport visibility */
  let local_intersectionObserver: IntersectionObserver | null = null;
  /** visibilitychange handler */
  let local_visibilityHandler: (() => void) | undefined;
  /** Видео поставлено на паузу из-за невидимости */
  let local_pausedByVisibility = false;
  /** Видео поставлено на паузу из-за long press */
  let local_pausedByHold = false;
  /** HTML-video на паузе из-за autoplay pauseOnHover (root mouseenter) */
  let local_pausedByAutoplayHover = false;

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_scanSlides();
    local_setupVisibilityHandlers();
    // Подписываемся на событие смены слайда
    base.on('slideChangeStart', (index: number) => {
      local_onSlideChange(index);
    });
    base.on('autoplayHoverPause', local_onAutoplayHoverPause);
    base.on('autoplayHoverResume', local_onAutoplayHoverResume);
    // Запускаем видео на начальном слайде (используем realIndex)
    const startRealIndex = tvist.realIndex ?? tvist.activeIndex;
    local_previousIndex = startRealIndex;
    local_activateSlideByRealIndex(startRealIndex);
  }

  function local_destroy(): void {
    base.off('autoplayHoverPause', local_onAutoplayHoverPause);
    base.off('autoplayHoverResume', local_onAutoplayHoverResume);
    local_stopProgressTracking();
    local_deactivateAll();
    local_cleanupVideoListeners();
    local_teardownVisibilityHandlers();
    local_videos.clear();
    local_iframes.clear();
  }

  function local_shouldBeActive(): boolean {
    return local_config !== null;
  }
  /**
   * Хук смены слайда — ядро модуля.
   * ВАЖНО: index из slideChangeStart — это normalizedIndex (= realIndex, оригинальный 0..N-1),
   * а НЕ DOM-позиция. В loop-режиме DOM-позиция может отличаться после перестановки слайдов.
   * Видео ищем напрямую по realIndex (ключ в this.videos Map).
   */
  function local_onSlideChange(index: number): void {
    if (!local_config) return;
    local_pausedByAutoplayHover = false;
    // index = realIndex (оригинальный индекс слайда)
    const realIndex = index;
    const prev = local_previousIndex;
    local_previousIndex = realIndex;
    // Деактивируем предыдущий слайд
    if (prev !== -1 && prev !== realIndex) {
      local_deactivateSlideByRealIndex(prev);
    }
    // Активируем новый слайд
    local_activateSlideByRealIndex(realIndex);
  }
  /**
   * Обработка обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.video !== undefined) {
      const wasActive = local_config !== null;
      local_config = normalizeVideoOptions(newOptions.video);
      const isNowActive = local_config !== null;
      if (!wasActive && isNowActive && local_config) {
        local_muted = local_config.muted;
        local_scanSlides();
        local_setupVisibilityHandlers();
        local_activateSlideByRealIndex(tvist.realIndex ?? tvist.activeIndex);
      } else if (wasActive && !isNowActive) {
        local_destroy();
      } else if (wasActive && isNowActive) {
        // Переприменяем атрибуты при изменении настроек
        local_applyVideoAttributes();
      }
    }
  }
  // ==================== Сканирование ====================
  /**
   * Сканировать слайды и найти все видео/iframe.
   * Регистрирует по data-tvist-slide-index (оригинальный индекс) если доступен,
   * иначе по позиции в DOM. Это обеспечивает корректную работу с LoopModule,
   * который может переставлять слайды в DOM.
   */
  function local_scanSlides(): void {
    local_videos.clear();
    local_iframes.clear();
    tvist.slides.forEach((slide, domIndex) => {
      // Используем оригинальный индекс (data-tvist-slide-index) если есть (loop mode)
      const dataIndex = slide.getAttribute('data-tvist-slide-index');
      const registrationIndex = dataIndex !== null ? parseInt(dataIndex, 10) : domIndex;
      // HTML <video>
      const video = slide.querySelector('video');
      if (video) {
        local_registerVideo(registrationIndex, slide, video);
      }
      // iframe (YouTube/Vimeo)
      const iframe = slide.querySelector('iframe');
      if (iframe) {
        const src = iframe.getAttribute('src') ?? iframe.getAttribute('data-src') ?? '';
        if (getProvider(src)) {
          local_registerIframe(registrationIndex, iframe, src);
        }
      }
    });
  }
  /**
   * Зарегистрировать HTML video
   */
  function local_registerVideo(index: number, slide: HTMLElement, video: HTMLVideoElement): void {
    if (!local_config) return;
    // Установить атрибуты
    if (local_config.muted) {
      video.muted = true;
      video.setAttribute('muted', '');
    }
    if (local_config.playsinline) {
      video.setAttribute('playsinline', '');
      video.playsInline = true;
    }
    if (local_config.loop) {
      video.loop = true;
    }
    // Убираем нативный autoplay — автоплеем мы управялем сами, по переключению слайдов
    video.removeAttribute('autoplay');
    video.autoplay = false;
    const entry: VideoEntry = {
      slideIndex: index,
      slide,
      video,
      handlers: new Map(),
    };
    // Навешиваем слушатели
    local_setupVideoListeners(entry);
    local_videos.set(index, entry);
  }
  /**
   * Зарегистрировать iframe
   */
  function local_registerIframe(index: number, iframe: HTMLIFrameElement, src: string): void {
    // Добавляем allow="autoplay" для корректной работы
    const currentAllow = iframe.getAttribute('allow') ?? '';
    if (!currentAllow.includes('autoplay')) {
      iframe.setAttribute('allow', currentAllow ? `${currentAllow}; autoplay` : 'autoplay');
    }
    // Сохраняем оригинальный src (без наших параметров)
    local_iframes.set(index, {
      iframe,
      originalSrc: src,
    });
  }
  /**
   * Применить атрибуты ко всем зарегистрированным видео
   */
  function local_applyVideoAttributes(): void {
    if (!local_config) return;
    local_videos.forEach((entry) => {
      const { video } = entry;
      video.muted = local_muted;
      if (local_config?.playsinline) {
        video.setAttribute('playsinline', '');
        video.playsInline = true;
      }
      if (local_config?.loop) {
        video.loop = true;
      } else {
        video.loop = false;
      }
    });
  }
  // ==================== Слушатели видео ====================
  /**
   * Навесить слушатели на видео-элемент
   */
  function local_setupVideoListeners(entry: VideoEntry): void {
    const { video, slide, slideIndex } = entry;
    const emitVideoEvent = (name: string) => {
      const payload: VideoEvent = { slide, video, index: slideIndex };
      base.emit(name, payload);
    };
    const addHandler = (event: string, handler: EventListener) => {
      base.resources.listen(video, event, handler);
      entry.handlers.set(event, handler);
    };
    // loadedmetadata — видео готово
    addHandler('loadedmetadata', () => {
      emitVideoEvent('videoReady');
    });
    // play
    addHandler('play', () => {
      emitVideoEvent('videoPlay');
      // Запускаем плавное отслеживание прогресса
      local_startProgressTracking(video, slide, slideIndex);
    });
    // pause
    addHandler('pause', () => {
      emitVideoEvent('videoPause');
      local_stopProgressTracking();
    });
    // ended
    addHandler('ended', () => {
      emitVideoEvent('videoEnded');
      local_stopProgressTracking();
    });
    // timeupdate — для прогресса
    addHandler('timeupdate', () => {
      // Если видео воспроизводится, прогресс обновляется через RAF для плавности
      if (!video.paused && !video.ended) return;
      local_emitVideoProgress(video, slide, slideIndex);
    });
  }

  function local_emitVideoProgress(
    video: HTMLVideoElement,
    slide: HTMLElement,
    index: number
  ): void {
    if (!video.duration || !isFinite(video.duration)) return;
    const payload: VideoProgressEvent = {
      slide,
      video,
      index,
      progress: video.currentTime / video.duration,
      currentTime: video.currentTime,
      duration: video.duration,
    };
    base.emit('videoProgress', payload);
  }
  /**
   * Очистить все слушатели видео
   */
  function local_cleanupVideoListeners(): void {
    local_videos.forEach((entry) => {
      entry.handlers.forEach((handler, event) => {
        base.resources.unlisten(entry.video, event, handler);
      });
      entry.handlers.clear();
    });
  }
  // ==================== Активация/деактивация слайдов ====================
  /**
   * Активировать видео по realIndex (оригинальный индекс слайда).
   * Видео зарегистрированы в Map по realIndex (data-tvist-slide-index).
   */
  function local_activateSlideByRealIndex(realIndex: number): void {
    if (!local_config) return;
    // HTML video
    const videoEntry = local_videos.get(realIndex);
    if (videoEntry && local_config.autoplay) {
      local_safePlay(videoEntry.video);
    }
    // iframe
    const iframeEntry = local_iframes.get(realIndex);
    if (iframeEntry && local_config.autoplay) {
      local_setIframeAutoplay(iframeEntry, true);
    }
  }
  /**
   * Деактивировать видео по realIndex (оригинальный индекс слайда).
   */
  function local_deactivateSlideByRealIndex(realIndex: number): void {
    if (!local_config) return;
    // HTML video
    const videoEntry = local_videos.get(realIndex);
    if (videoEntry) {
      if (local_config.pauseOnLeave) {
        videoEntry.video.pause();
      }
      if (local_config.resetOnLeave) {
        local_safeResetVideoTime(videoEntry.video);
      }
    }
    // iframe
    const iframeEntry = local_iframes.get(realIndex);
    if (iframeEntry) {
      local_setIframeAutoplay(iframeEntry, false);
    }
    local_stopProgressTracking();
  }
  /**
   * Деактивировать все видео
   */
  function local_deactivateAll(): void {
    local_videos.forEach((entry) => {
      entry.video.pause();
      local_safeResetVideoTime(entry.video);
    });
    local_iframes.forEach((entry) => {
      local_setIframeAutoplay(entry, false);
    });
    local_stopProgressTracking();
  }
  /**
   * Безопасно сбросить позицию видео.
   * В тестовой среде currentTime может быть read-only через defineProperty.
   */
  function local_safeResetVideoTime(video: HTMLVideoElement): void {
    try {
      video.currentTime = 0;
    } catch {
      // ignore read-only currentTime in mocks/test environment
    }
  }
  // ==================== Безопасный play ====================
  /**
   * Безопасно воспроизвести видео с обработкой:
   * - readyState (ожидание canplay если не загружено)
   * - Promise rejection (AbortError при быстром pause())
   */
  function local_safePlay(video: HTMLVideoElement): void {
    video.muted = local_muted;
    const doPlay = () => {
      video.play().catch((error: DOMException) => {
        if (error.name !== 'AbortError') {
          console.warn('Tvist VideoModule: playback failed:', error.message);
        }
      });
    };
    if (video.readyState >= 2) {
      doPlay();
    } else {
      video.load();
      const readyEvents = ['canplay', 'canplaythrough', 'loadeddata', 'loadedmetadata'];
      const onReady = () => {
        readyEvents.forEach((event) => base.resources.unlisten(video, event, onReady));
        base.resources.frame(doPlay);
      };
      readyEvents.forEach((event) => base.resources.listen(video, event, onReady));
    }
  }
  // ==================== iframe управление ====================
  /** Переключить autoplay iframe через GET-параметры. */
  function local_setIframeAutoplay(entry: IframeEntry, enabled: boolean): void {
    const provider = getProvider(entry.originalSrc);
    if (!provider) return;
    const params = enabled ? buildAutoplayParams(provider, local_muted) : { autoplay: '0' };
    const src = setIframeParams(entry.originalSrc, params);
    if (entry.iframe.src !== src) entry.iframe.src = src;
  }
  // ==================== Прогресс ====================
  /**
   * Запуск плавного отслеживания прогресса через RAF
   */
  function local_startProgressTracking(
    video: HTMLVideoElement,
    slide: HTMLElement,
    index: number
  ): void {
    local_stopProgressTracking();
    const tick = () => {
      // Если видео на паузе или закончилось — останавливаем
      if (video.paused || video.ended) {
        local_stopProgressTracking();
        return;
      }
      local_emitVideoProgress(video, slide, index);
      local_progressRAF = base.resources.frame(tick);
    };
    local_progressRAF = base.resources.frame(tick);
  }
  /**
   * Остановить отслеживание прогресса через RAF
   */
  function local_stopProgressTracking(): void {
    if (local_progressRAF !== null) {
      base.resources.cancelFrame(local_progressRAF);
      local_progressRAF = null;
    }
  }
  // ==================== Visibility ====================
  function local_getActiveVideo(): HTMLVideoElement | undefined {
    return local_videos.get(tvist.realIndex ?? tvist.activeIndex)?.video;
  }
  /**
   * Настроить обработчики видимости (viewport + вкладка)
   */
  function local_setupVisibilityHandlers(): void {
    // IntersectionObserver — пауза при выходе из viewport
    if (typeof IntersectionObserver !== 'undefined') {
      local_intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              local_pauseByVisibility();
            } else {
              local_resumeFromVisibility();
            }
          });
        },
        { threshold: 0.1 }
      );
      local_intersectionObserver.observe(tvist.root);
    }
    // visibilitychange — пауза при скрытии вкладки
    local_visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        local_pauseByVisibility();
      } else if (document.visibilityState === 'visible') {
        local_resumeFromVisibility();
      }
    };
    base.resources.listen(document, 'visibilitychange', local_visibilityHandler);
  }
  /**
   * Убрать обработчики видимости
   */
  function local_teardownVisibilityHandlers(): void {
    if (local_intersectionObserver) {
      local_intersectionObserver.disconnect();
      local_intersectionObserver = null;
    }
    if (local_visibilityHandler) {
      base.resources.unlisten(document, 'visibilitychange', local_visibilityHandler);
      local_visibilityHandler = undefined;
    }
  }
  /**
   * Синхронизация с autoplay pauseOnHover: только HTML-video на активном слайде.
   * События эмитит AutoplayModule только при mouseenter/mouseleave по root (не drag/вкладка).
   */
  const local_onAutoplayHoverPause: () => void = (): void => {
    if (!local_config) return;
    const video = local_getActiveVideo();
    if (video && !video.paused) {
      local_pausedByAutoplayHover = true;
      video.pause();
    }
  };

  const local_onAutoplayHoverResume: () => void = (): void => {
    if (!local_pausedByAutoplayHover) return;
    local_pausedByAutoplayHover = false;
    if (!local_config?.autoplay) return;
    const video = local_getActiveVideo();
    if (video?.paused) local_safePlay(video);
  };
  /**
   * Поставить текущее видео на паузу из-за невидимости
   */
  function local_pauseByVisibility(): void {
    if (local_pausedByVisibility) return;
    local_pausedByVisibility = true;
    const video = local_getActiveVideo();
    if (video && !video.paused) video.pause();
  }
  /**
   * Возобновить текущее видео после возврата видимости
   */
  function local_resumeFromVisibility(): void {
    if (!local_pausedByVisibility) return;
    local_pausedByVisibility = false;
    local_pausedByHold = false;
    if (!local_config?.autoplay) return;
    const video = local_getActiveVideo();
    if (video?.paused) local_safePlay(video);
  }
  // ==================== Публичное API ====================
  /**
   * Воспроизвести видео на слайде (текущем или по индексу)
   */
  function local_playVideo(index?: number): void {
    const idx = index ?? tvist.activeIndex;
    const entry = local_videos.get(idx);
    if (entry) {
      local_safePlay(entry.video);
    }
  }
  /**
   * Поставить видео на паузу
   */
  function local_pauseVideo(index?: number): void {
    const idx = index ?? tvist.activeIndex;
    const entry = local_videos.get(idx);
    if (entry) {
      entry.video.pause();
    }
  }
  /**
   * Выключить звук на всех видео
   */
  function local_muteAll(): void {
    local_muted = true;
    local_videos.forEach((entry) => {
      entry.video.muted = true;
      entry.video.volume = 0;
    });
  }
  /**
   * Включить звук на всех видео (вызывать после жеста пользователя)
   */
  function local_unmuteAll(): void {
    local_muted = false;
    local_videos.forEach((entry) => {
      entry.video.muted = false;
      entry.video.volume = 1;
      // Хак для iOS: дёрнуть currentTime для активации звука после unmute
      const ct = entry.video.currentTime;
      entry.video.currentTime = ct;
    });
  }
  /**
   * Проверить состояние mute
   */
  function local_isMutedState(): boolean {
    return local_muted;
  }
  /**
   * Поставить активное видео на паузу из-за long press.
   * Работает только для HTML video на активном слайде.
   */
  function local_pauseActiveForHold(): void {
    if (!local_config?.pauseOnHold) return;
    const video = local_getActiveVideo();
    if (video && !video.paused) {
      local_pausedByHold = true;
      video.pause();
    }
  }
  /**
   * Возобновить активное видео после long press.
   */
  function local_resumeActiveAfterHold(): void {
    if (!local_config?.pauseOnHold || !local_pausedByHold) return;
    local_pausedByHold = false;
    if (!local_config.autoplay) return;
    const video = local_getActiveVideo();
    if (video?.paused) local_safePlay(video);
  }
  /**
   * Публичное API — получить объект с методами.
   * Возвращает undefined если модуль неактивен.
   */
  function local_getVideo():
    | {
        play: (index?: number) => void;
        pause: (index?: number) => void;
        mute: () => void;
        unmute: () => void;
        isMuted: () => boolean;
      }
    | undefined {
    if (!local_config) return undefined;
    return {
      play: (index?: number) => local_playVideo(index),
      pause: (index?: number) => local_pauseVideo(index),
      mute: () => local_muteAll(),
      unmute: () => local_unmuteAll(),
      isMuted: () => local_isMutedState(),
    };
  }
  const component: VideoModule = {
    get name() {
      return local_name;
    },
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.dispose();
      }
    },
    shouldBeActive: local_shouldBeActive,
    onSlideChange: local_onSlideChange,
    onOptionsUpdate: local_onOptionsUpdate,
    playVideo: local_playVideo,
    pauseVideo: local_pauseVideo,
    muteAll: local_muteAll,
    unmuteAll: local_unmuteAll,
    isMutedState: local_isMutedState,
    pauseActiveForHold: local_pauseActiveForHold,
    resumeActiveAfterHold: local_resumeActiveAfterHold,
    getVideo: local_getVideo,
  };
  local_config = normalizeVideoOptions(options.video);
  if (local_config) {
    if (
      isHoldToPauseEnabled(options.holdToPause) &&
      (options.video === true ||
        (typeof options.video === 'object' && options.video.pauseOnHold === undefined))
    ) {
      local_config.pauseOnHold = true;
    }
    local_muted = local_config.muted;
  }
  return component;
}
