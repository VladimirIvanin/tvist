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
import { createComponent, type Component } from '../Component';
import { findSlideByRealIndex } from '../../utils/slideRealIndex';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { AutoplayProgressEvent, TvistOptions, AutoplayOptions } from '../../core/types';
/** Дефолтные значения для AutoplayOptions */
const AUTOPLAY_DEFAULTS: Required<AutoplayOptions> = {
  delay: 3000,
  pauseOnHover: true,
  pauseOnFocus: true,
  pauseOnInteraction: true,
  disableOnInteraction: false,
  waitForVideo: false,
};
/**
 * Нормализация autoplay опций в объект AutoplayOptions.
 * Возвращает null если autoplay выключен.
 */
function normalizeAutoplay(raw: TvistOptions['autoplay']): Required<AutoplayOptions> | null {
  if (raw === false || raw === undefined) return null;
  if (raw === true) {
    return { ...AUTOPLAY_DEFAULTS };
  }
  if (typeof raw === 'number') {
    return { ...AUTOPLAY_DEFAULTS, delay: raw };
  }
  // Object form
  return {
    delay: raw.delay ?? AUTOPLAY_DEFAULTS.delay,
    pauseOnHover: raw.pauseOnHover ?? AUTOPLAY_DEFAULTS.pauseOnHover,
    pauseOnFocus: raw.pauseOnFocus ?? AUTOPLAY_DEFAULTS.pauseOnFocus,
    pauseOnInteraction: raw.pauseOnInteraction ?? AUTOPLAY_DEFAULTS.pauseOnInteraction,
    disableOnInteraction: raw.disableOnInteraction ?? AUTOPLAY_DEFAULTS.disableOnInteraction,
    waitForVideo: raw.waitForVideo ?? AUTOPLAY_DEFAULTS.waitForVideo,
  };
}

/** Internal component; state lives in this factory's closure. */
export interface AutoplayModule extends Component {
  readonly name: 'autoplay';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Обработка обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  /**
   * Старт autoplay
   */
  start(): void;
  /**
   * Остановка autoplay
   */
  stop(): void;
  /**
   * Пауза autoplay
   * Очищаем таймер, чтобы callback не сработал во время паузы
   */
  pause(): void;
  /**
   * Возобновление autoplay
   * Перезапускает таймер с полной задержкой
   */
  resume(): void;
  /**
   * Публичное API - получить модуль и использовать методы
   */
  getAutoplay(): {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    isStopped: () => boolean;
  };
}

export function createAutoplayModule(tvist: Tvist, options: TvistOptions): AutoplayModule {
  const base = createComponent(tvist, options);

  const local_name = 'autoplay' as const;

  let local_timer: number | null = null;

  let local_paused = false;

  let local_stopped = false;
  /** Нормализованные опции autoplay */
  let local_config: Required<AutoplayOptions> | null = null;

  let local_mouseEnterHandler: (() => void) | undefined;

  let local_mouseLeaveHandler: (() => void) | undefined;

  let local_focusInHandler: (() => void) | undefined;

  let local_focusOutHandler: ((event: FocusEvent) => void) | undefined;

  let local_visibilityChangeHandler: (() => void) | undefined;

  let local_pausedByHover = false;

  let local_pausedByFocus = false;
  // Флаг для отслеживания состояния drag
  let local_isDragging = false;
  // Таймаут для fallback resume после drag (если transitionEnd не сработает)
  let local_dragEndTimeout: number | null = null;
  // Флаг для отслеживания паузы из-за потери видимости вкладки
  let local_pausedByVisibility = false;
  // Для корректного возобновления после паузы
  let local_timeLeft: number | null = null;

  let local_currentDuration = 0;

  let local_currentChunkDuration = 0;
  // Для autoplayProgress
  let local_progressRAF: number | null = null;

  let local_progressStartTime: number | null = null;

  let local_progressStartOffset = 0;
  // Для waitForVideo — слушаем videoEnded
  let local_waitingForVideo = false;

  let local_videoEndedWhilePaused = false; // видео закончилось пока autoplay на паузе (hover)
  let local_videoEndedHandler: (() => void) | undefined;

  let local_videoProgressHandler: ((data: { progress: number; index: number }) => void) | undefined;
  /** Переход был инициирован autoplay (next() из таймера или videoEnded). Не сбрасываем таймер на slideChangeEnd. */
  let local_transitionByAutoplay = false;
  /** Таймаут для сброса transitionByAutoplay, если next() не привёл к переходу (например, слайдер на границе). */
  let local_clearTransitionByAutoplayTimeout: number | null = null;
  /** Проверка, что autoplay next() реально привёл к смене слайда. */
  let local_boundaryCheckTimeout: number | null = null;
  /** Момент последнего slideChangeEnd (нужен для корректного boundary тайминга). */
  let local_lastSlideChangeEndAt: number | null = null;
  /** Момент последнего autoplay next(). */
  let local_lastAutoplayNextAt: number | null = null;
  /** Диагностика последовательности autoplayProgress */

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_setupEvents();
    local_attachVisibilityEvents();
    local_start();
  }

  function local_destroy(): void {
    local_stopped = true;
    local_stop();
    local_clearDragEndTimeout();
    local_clearTransitionByAutoplayFallback();
    local_clearBoundaryCheckTimeout();
    local_stopProgressTracking();
    local_detachHoverEvents();
    local_detachFocusEvents();
    local_detachVisibilityEvents();
    local_detachVideoEndedListener();
    local_detachVideoProgressListener();
  }

  function local_shouldBeActive(): boolean {
    return local_config !== null;
  }
  /**
   * Обработка обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если autoplay изменился
    if (newOptions.autoplay !== undefined) {
      const wasActive = local_config !== null;
      const oldConfig = local_config;
      // Перенормализуем
      local_config = normalizeAutoplay(newOptions.autoplay);
      const isNowActive = local_config !== null;
      // Если autoplay был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        local_stopped = false;
        local_setupEvents();
        local_attachVisibilityEvents();
        local_start();
      }
      // Если autoplay был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        local_stop();
        local_detachHoverEvents();
        local_detachFocusEvents();
        local_detachVisibilityEvents();
        local_detachVideoEndedListener();
        local_detachVideoProgressListener();
        local_stopped = true;
      }
      // Если autoplay был включен и остается включен (но изменились настройки)
      else if (wasActive && isNowActive && local_config) {
        // Переинициализируем hover events при изменении pauseOnHover
        local_detachHoverEvents();
        local_detachFocusEvents();
        if (local_config.pauseOnHover) {
          local_attachHoverEvents();
        }
        if (local_config.pauseOnFocus) {
          local_attachFocusEvents();
        }
        // Если waitForVideo был отключен, сбрасываем связанные флаги
        if (oldConfig?.waitForVideo && !local_config.waitForVideo && local_waitingForVideo) {
          local_waitingForVideo = false;
          local_videoEndedWhilePaused = false;
          local_detachVideoEndedListener();
        }
        if (local_config.waitForVideo) {
          local_attachVideoProgressBridge();
        } else {
          local_detachVideoProgressListener();
        }
        local_start(); // Перезапускаем с новой задержкой
      }
    }
  }
  /**
   * Отменить отложенный сброс transitionByAutoplay.
   * Вызываем при destroy и когда slideChangeEnd сбрасывает флаг (переход действительно произошёл).
   */
  function local_clearTransitionByAutoplayFallback(): void {
    if (local_clearTransitionByAutoplayTimeout !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(
        local_clearTransitionByAutoplayTimeout
      );
      local_clearTransitionByAutoplayTimeout = null;
    }
  }

  function local_clearBoundaryCheckTimeout(): void {
    if (local_boundaryCheckTimeout !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(local_boundaryCheckTimeout);
      local_boundaryCheckTimeout = null;
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
  const local_TRANSITION_FALLBACK_MULTIPLIER = 5 as const;

  function local_scheduleTransitionByAutoplayFallback(): void {
    local_clearTransitionByAutoplayFallback();
    const speed = options.speed ?? 300;
    local_clearTransitionByAutoplayTimeout = base.__tvistInternal_resources.__tvistInternal_timeout(
      () => {
        local_clearTransitionByAutoplayTimeout = null;
        if (local_transitionByAutoplay) {
          local_transitionByAutoplay = false;
        }
      },
      speed * local_TRANSITION_FALLBACK_MULTIPLIER
    );
  }
  /**
   * Очистка таймаута fallback resume
   */
  function local_clearDragEndTimeout(): void {
    if (local_dragEndTimeout !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(local_dragEndTimeout);
      local_dragEndTimeout = null;
    }
  }
  /**
   * Возобновление autoplay после drag
   * Вызывается из transitionEnd или fallback timeout.
   * Сбрасываем timeLeft, чтобы следующий цикл шёл с полной задержкой (delay),
   * а не с остатком до переключения — иначе слайдер перелистнётся сразу после отпускания.
   */
  function local_resumeAfterDrag(): void {
    if (!local_isDragging) return;
    local_isDragging = false;
    local_clearDragEndTimeout();
    local_timeLeft = null;
    local_progressStartOffset = 0;
    if (
      !local_config?.disableOnInteraction &&
      !local_stopped &&
      local_paused &&
      !local_hasPassivePauseReason()
    ) {
      local_resume();
    }
  }
  /**
   * Настройка событий
   */
  function local_setupEvents(): void {
    if (!local_config) return;
    if (local_config.pauseOnHover) {
      local_attachHoverEvents();
    }
    if (local_config.pauseOnFocus) {
      local_attachFocusEvents();
    }
    local_attachVideoProgressBridge();
    // Всегда ставим на паузу при драге (не только при pauseOnInteraction),
    // иначе таймер может вызвать next() во время/сразу после драга (rewind к 0)
    // и перебить snap к нужному слайду — пагинация тогда расходится с кадром
    base.__tvistInternal_on('dragStart', () => {
      if (local_stopped) return;
      local_isDragging = true;
      local_clearDragEndTimeout();
      if (local_config?.disableOnInteraction) {
        local_stop();
        local_stopped = true;
      } else {
        local_pause();
      }
    });
    // dragEnd: запускаем fallback таймаут на случай если transitionEnd не сработает
    // (например, если snap вернул на тот же слайд и indexChanged === false)
    base.__tvistInternal_on('dragEnd', () => {
      if (local_stopped) return;
      if (!local_isDragging) return;
      const speed = options.speed ?? 300;
      // Fallback: resume через speed + буфер, если transitionEnd не сработает
      local_dragEndTimeout = base.__tvistInternal_resources.__tvistInternal_timeout(() => {
        local_resumeAfterDrag();
      }, speed + 100);
    });
    // ВАЖНО: resume() вызываем НЕ на dragEnd, а на transitionEnd.
    // Причина: dragEnd срабатывает ДО завершения snap-анимации.
    // Если вызвать resume() сразу, setInterval начнёт отсчёт,
    // и next() может сработать во время или сразу после snap,
    // что приводит к багу с пагинацией (activeBullet != activeIndex).
    base.__tvistInternal_on('transitionEnd', () => {
      if (local_stopped) return;
      // НЕ сбрасываем transitionByAutoplay здесь!
      // transitionEnd срабатывает РАНЬШЕ slideChangeEnd (см. Engine.ts:650-653),
      // поэтому если сбросить флаг здесь, slideChangeEnd всегда увидит его как false.
      // Это приводит к тому, что каждый autoplay-переход обрабатывается как ручная навигация,
      // вызывая cancelTimer() + run(), что добавляет animation duration к каждому циклу.
      // Если был drag — resume через resumeAfterDrag
      if (local_isDragging) {
        local_resumeAfterDrag();
        return;
      }
      // Для обычной навигации (не drag) — resume если на паузе
      if (
        !local_config?.disableOnInteraction &&
        !local_stopped &&
        local_paused &&
        !local_hasPassivePauseReason()
      ) {
        local_resume();
      }
    });
    // При смене слайда:
    // - при ручной навигации (стрелки, пагинация и т.д.) сбрасываем таймер,
    //   чтобы новый слайд показывался полное время delay, а не остаток от предыдущего счётчика
    // - при autoplay-переходах не трогаем таймер, чтобы не ломать рекурсивный цикл run()
    base.__tvistInternal_on('slideChangeEnd', (index: number) => {
      if (local_stopped) return;
      const byAutoplay = local_transitionByAutoplay;
      const now = performance.now();
      if (byAutoplay && local_lastAutoplayNextAt !== null) {
        const speed = options.speed ?? 300;
        local_lastSlideChangeEndAt = Math.max(now, local_lastAutoplayNextAt + speed);
      } else {
        local_lastSlideChangeEndAt = now;
      }
      // Сбрасываем флаг и отменяем fallback
      if (local_transitionByAutoplay) {
        local_transitionByAutoplay = false;
        local_clearTransitionByAutoplayFallback();
        local_clearBoundaryCheckTimeout();
      }
      // Для ручной навигации новый цикл стартует здесь.
      // Для autoplay-переходов цикл продолжается рекурсивно в run(),
      // чтобы delay не зависел от длительности анимации, и мы не сбрасывали таймер зря.
      // Исключение: non-loop с очень коротким delay (< speed) — там следующий шаг
      // намеренно запускается из slideChangeEnd, чтобы тик не сработал до окончания перехода.
      if (!local_paused && !local_stopped) {
        if (!byAutoplay) {
          // Ручная навигация: сбрасываем текущий цикл и запускаем новый от текущего слайда.
          local_cancelTimer();
          local_timeLeft = null;
          local_progressStartOffset = 0;
          local_stopProgressTracking();
          if (local_config?.waitForVideo) {
            local_handleSlideChangedForVideo(index);
          } else {
            local_run();
          }
        } else if (
          byAutoplay &&
          local_config &&
          !(
            options.loop === true ||
            (typeof options.loop === 'object' && options.loop.enabled !== false)
          ) &&
          local_config.delay < (options.speed ?? 300)
        ) {
          // Non-loop + очень короткий delay: следующий autoplay-тик запускаем
          // после завершения перехода.
          local_run();
        } else if (local_config?.waitForVideo) {
          // Автоплей в режиме ожидания видео: обновляем слушатель для нового слайда.
          local_handleSlideChangedForVideo(index);
        }
      } else if (!byAutoplay && local_config?.waitForVideo) {
        local_handleSlideChangedForVideo(index);
      }
    });
  }

  function local_attachVideoProgressBridge(): void {
    if (!local_config?.waitForVideo) return;
    local_detachVideoProgressListener();
    local_videoProgressHandler = (data: { progress: number; index: number }) => {
      if (!local_waitingForVideo || local_stopped) return;
      local_emitAutoplayProgress(data.index, Math.min(Math.max(data.progress, 0), 1));
    };
    base.__tvistInternal_on('videoProgress', local_videoProgressHandler);
  }

  function local_detachVideoProgressListener(): void {
    if (!local_videoProgressHandler) return;
    base.__tvistInternal_off('videoProgress', local_videoProgressHandler);
    local_videoProgressHandler = undefined;
  }
  /**
   * Обработка смены слайда для режима waitForVideo.
   * index из slideChangeEnd — это normalizedIndex (= realIndex), НЕ DOM-позиция.
   * В loop-режиме DOM-позиция может отличаться, поэтому ищем слайд по data-tvist-slide-index.
   */
  function local_handleSlideChangedForVideo(index: number): void {
    // Снимаем предыдущий videoEnded listener
    local_detachVideoEndedListener();
    local_waitingForVideo = false;
    local_videoEndedWhilePaused = false;
    // index = realIndex. Ищем слайд по data-tvist-slide-index (loop) или по DOM-позиции (обычный)
    const slide = findSlideByRealIndex(tvist.__tvistInternal_slides, index);
    // Если слайд не найден (некорректный индекс или проблема с DOM), запускаем обычный таймер
    // чтобы autoplay продолжил работу, а не остановился навсегда
    if (!slide) {
      local_cancelTimer();
      local_stopProgressTracking();
      local_timeLeft = null;
      local_progressStartOffset = 0;
      local_run();
      return;
    }
    const video = slide.querySelector('video');
    if (!video) {
      // Нет видео — запускаем таймер. Отменяем существующий, чтобы не было двух таймеров:
      // при переходе по autoplay с waitForVideo run() уже вызван в колбеке таймера, затем
      // slideChangeEnd вызывает handleSlideChangedForVideo → run() — без отмены остался бы
      // «сиротский» таймер и лишний next().
      local_cancelTimer();
      local_stopProgressTracking();
      local_timeLeft = null;
      local_progressStartOffset = 0;
      local_run();
      return;
    }
    // Есть видео — останавливаем таймер, ждём videoEnded
    local_waitingForVideo = true;
    local_cancelTimer();
    local_stopProgressTracking();
    local_emitAutoplayProgress(index, 0);
    local_videoEndedHandler = () => {
      if (local_stopped || !local_waitingForVideo) {
        return;
      }
      if (local_paused) {
        // Видео закончилось пока autoplay на паузе (hover).
        // Запоминаем — при resume() обработаем.
        local_videoEndedWhilePaused = true;
        return;
      }
      local_emitAutoplayProgress(
        tvist.__tvistInternal_realIndex ?? tvist.__tvistInternal_activeIndex,
        1
      );
      local_waitingForVideo = false;
      // Запоминаем индекс до навигации
      const indexBefore = tvist.__tvistInternal_activeIndex;
      local_transitionByAutoplay = true;
      tvist.__tvistInternal_next();
      // Проверяем, изменился ли индекс (произошла ли навигация)
      // Если индекс не изменился (граница без loop), сбрасываем флаг немедленно
      if (tvist.__tvistInternal_activeIndex === indexBefore) {
        local_transitionByAutoplay = false;
        // Не планируем fallback, т.к. переход не произошёл
      } else {
        local_scheduleTransitionByAutoplayFallback();
      }
    };
    base.__tvistInternal_on('videoEnded', local_videoEndedHandler);
  }
  /**
   * Снять слушатель videoEnded
   */
  function local_detachVideoEndedListener(): void {
    if (local_videoEndedHandler) {
      base.__tvistInternal_off('videoEnded', local_videoEndedHandler);
      local_videoEndedHandler = undefined;
    }
  }
  /**
   * Подключение hover событий
   */
  function local_attachHoverEvents(): void {
    local_mouseEnterHandler = () => {
      if (local_stopped) return;
      local_pausedByHover = true;
      local_pause();
      // Только hover: VideoModule синхронизирует HTML-video (не путать с pause() от drag/вкладки)
      base.__tvistInternal_emit('autoplayHoverPause');
    };
    local_mouseLeaveHandler = () => {
      if (local_stopped) return;
      local_pausedByHover = false;
      if (!local_hasPassivePauseReason()) local_resume();
      base.__tvistInternal_emit('autoplayHoverResume');
    };
    base.__tvistInternal_resources.__tvistInternal_listen(
      tvist.__tvistInternal_root,
      'mouseenter',
      local_mouseEnterHandler
    );
    base.__tvistInternal_resources.__tvistInternal_listen(
      tvist.__tvistInternal_root,
      'mouseleave',
      local_mouseLeaveHandler
    );
  }
  /**
   * Отключение hover событий
   */
  function local_detachHoverEvents(): void {
    if (local_mouseEnterHandler) {
      base.__tvistInternal_resources.__tvistInternal_unlisten(
        tvist.__tvistInternal_root,
        'mouseenter',
        local_mouseEnterHandler
      );
      local_mouseEnterHandler = undefined;
    }
    if (local_mouseLeaveHandler) {
      base.__tvistInternal_resources.__tvistInternal_unlisten(
        tvist.__tvistInternal_root,
        'mouseleave',
        local_mouseLeaveHandler
      );
      local_mouseLeaveHandler = undefined;
    }
    local_pausedByHover = false;
  }
  /** Пауза при фокусе */
  function local_attachFocusEvents(): void {
    local_focusInHandler = () => {
      if (local_stopped) return;
      local_pausedByFocus = true;
      local_pause();
    };
    local_focusOutHandler = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && tvist.__tvistInternal_root.contains(nextTarget)) return;
      local_pausedByFocus = false;
      if (!local_stopped && !local_hasPassivePauseReason()) local_resume();
    };
    base.__tvistInternal_resources.__tvistInternal_listen(
      tvist.__tvistInternal_root,
      'focusin',
      local_focusInHandler
    );
    base.__tvistInternal_resources.__tvistInternal_listen(
      tvist.__tvistInternal_root,
      'focusout',
      local_focusOutHandler
    );
  }

  function local_detachFocusEvents(): void {
    if (local_focusInHandler) {
      base.__tvistInternal_resources.__tvistInternal_unlisten(
        tvist.__tvistInternal_root,
        'focusin',
        local_focusInHandler
      );
      local_focusInHandler = undefined;
    }
    if (local_focusOutHandler) {
      base.__tvistInternal_resources.__tvistInternal_unlisten(
        tvist.__tvistInternal_root,
        'focusout',
        local_focusOutHandler
      );
      local_focusOutHandler = undefined;
    }
    local_pausedByFocus = false;
  }

  function local_hasPassivePauseReason(): boolean {
    return local_pausedByHover || local_pausedByFocus;
  }
  /**
   * Подключение события visibilitychange
   * Ставит автоплей на паузу при скрытии вкладки
   */
  function local_attachVisibilityEvents(): void {
    local_visibilityChangeHandler = () => {
      if (local_stopped) return;
      if (document.visibilityState === 'hidden') {
        local_pausedByVisibility = true;
        local_pause();
      } else if (document.visibilityState === 'visible') {
        if (local_pausedByVisibility) {
          local_pausedByVisibility = false;
          local_resume();
        }
      }
    };
    base.__tvistInternal_resources.__tvistInternal_listen(
      document,
      'visibilitychange',
      local_visibilityChangeHandler
    );
  }
  /**
   * Отключение события visibilitychange
   */
  function local_detachVisibilityEvents(): void {
    if (local_visibilityChangeHandler) {
      base.__tvistInternal_resources.__tvistInternal_unlisten(
        document,
        'visibilitychange',
        local_visibilityChangeHandler
      );
      local_visibilityChangeHandler = undefined;
    }
  }
  /**
   * Рекурсивная функция для автоплея
   * Вызывается через setTimeout после каждого переключения
   */
  function local_run(): void {
    if (local_paused || local_stopped || !local_config) return;
    // Если ждём видео — не запускаем таймер
    if (local_waitingForVideo) return;
    // Если timeLeft есть, значит мы возобновляем после паузы
    // Иначе начинаем новый цикл (полная задержка)
    const delay = local_timeLeft ?? local_config.delay;
    // Если это новый цикл, сбрасываем параметры
    if (local_timeLeft === null) {
      local_currentDuration = local_config.delay;
      local_progressStartOffset = 0;
    }
    // Запоминаем длительность текущего отрезка для расчёта паузы
    local_currentChunkDuration = delay;
    // Запуск отслеживания прогресса
    local_startProgressTracking(delay, local_currentDuration, local_progressStartOffset);
    local_timer = base.__tvistInternal_resources.__tvistInternal_timeout(() => {
      if (!local_paused && !local_stopped) {
        local_timeLeft = null; // Сбрасываем timeLeft для следующего шага
        local_progressStartOffset = 0;
        local_stopProgressTracking();
        // Запоминаем индекс до навигации
        const indexBefore = tvist.__tvistInternal_activeIndex;
        const slidesPerPage = options.perPage ?? 1;
        const endIndex = Math.max(0, tvist.__tvistInternal_slides.length - slidesPerPage);
        const loopEnabled =
          options.loop === true ||
          (typeof options.loop === 'object' && options.loop.enabled !== false);
        const boundaryAttempt = !loopEnabled && !options.rewind && indexBefore >= endIndex;
        local_transitionByAutoplay = true;
        local_lastAutoplayNextAt = performance.now();
        tvist.__tvistInternal_next();
        // На заведомой границе (без loop/rewind) next() не изменит индекс.
        // Флаг нужно сбросить сразу, иначе ручная навигация попадёт в false-positive "autoplay".
        if (boundaryAttempt) {
          local_transitionByAutoplay = false;
          local_clearTransitionByAutoplayFallback();
        } else {
          local_scheduleTransitionByAutoplayFallback();
        }
        // Продолжаем autoplay цикл рекурсивно сразу после попытки перехода.
        // В не-loop режиме при delay < speed продолжаем цикл из slideChangeEnd.
        const speed = options.speed ?? 300;
        if (!local_config?.waitForVideo) {
          const loopEnabledDelay =
            options.loop === true ||
            (typeof options.loop === 'object' && options.loop.enabled !== false);
          if (local_config && !loopEnabledDelay && local_config.delay < speed) {
            // no-op: continue from slideChangeEnd
          } else {
            local_run();
          }
        }
        local_clearBoundaryCheckTimeout();
        const boundaryDelay = speed === 0 ? 0 : speed + 20;
        local_boundaryCheckTimeout = base.__tvistInternal_resources.__tvistInternal_timeout(() => {
          local_boundaryCheckTimeout = null;
          if (local_paused || local_stopped) return;
          // Если после ожидаемой длительности перехода индекс всё ещё тот же,
          // считаем, что next() уткнулся в границу без loop.
          if (tvist.__tvistInternal_activeIndex !== indexBefore) return;
          // reachEnd должен приходить только после полного показа последнего слайда:
          // delay + время проверки границы от момента slideChangeEnd.
          if (local_lastSlideChangeEndAt !== null && local_config) {
            const minElapsed = local_config.delay + boundaryDelay;
            const elapsed = performance.now() - local_lastSlideChangeEndAt;
            if (elapsed < minElapsed) {
              local_boundaryCheckTimeout = base.__tvistInternal_resources.__tvistInternal_timeout(
                () => {
                  local_boundaryCheckTimeout = null;
                  if (local_paused || local_stopped) return;
                  if (tvist.__tvistInternal_activeIndex !== indexBefore) return;
                  local_transitionByAutoplay = false;
                  local_clearTransitionByAutoplayFallback();
                  local_emitAutoplayProgress(
                    tvist.__tvistInternal_realIndex ?? tvist.__tvistInternal_activeIndex,
                    1
                  );
                  if (
                    !(
                      options.loop === true ||
                      (typeof options.loop === 'object' && options.loop.enabled !== false)
                    )
                  ) {
                    tvist.__tvistInternal_emit('reachEnd');
                  }
                  local_stop();
                },
                Math.max(0, Math.ceil(minElapsed - elapsed))
              );
              return;
            }
          }
          local_transitionByAutoplay = false;
          local_clearTransitionByAutoplayFallback();
          local_emitAutoplayProgress(
            tvist.__tvistInternal_realIndex ?? tvist.__tvistInternal_activeIndex,
            1
          );
          if (
            !(
              options.loop === true ||
              (typeof options.loop === 'object' && options.loop.enabled !== false)
            )
          ) {
            tvist.__tvistInternal_emit('reachEnd');
          }
          local_stop();
        }, boundaryDelay);
      }
    }, delay);
  }

  function local_startProgressTracking(
    timeLeft: number,
    totalDuration: number,
    startOffset: number
  ): void {
    local_stopProgressTracking();
    if (timeLeft <= 0) {
      local_emitAutoplayProgress(tvist.__tvistInternal_activeIndex, 1);
      return;
    }
    local_progressStartTime = performance.now();
    const tick = () => {
      if (local_paused || local_stopped || local_progressStartTime === null) return;
      const elapsed = performance.now() - local_progressStartTime;
      // Прогресс текущего отрезка (от 0 до 1)
      const chunkProgress = Math.min(elapsed / timeLeft, 1);
      // Общий прогресс = смещение + (часть отрезка * доля отрезка в общем времени)
      // Доля отрезка = timeLeft / totalDuration
      let progress = startOffset + chunkProgress * (timeLeft / totalDuration);
      progress = Math.min(progress, 1);
      local_emitAutoplayProgress(tvist.__tvistInternal_activeIndex, progress);
      if (progress < 1 && !local_paused && !local_stopped) {
        local_progressRAF = base.__tvistInternal_resources.__tvistInternal_frame(tick);
      }
    };
    local_progressRAF = base.__tvistInternal_resources.__tvistInternal_frame(tick);
  }

  function local_emitAutoplayProgress(index: number, progress: number): void {
    const payload: AutoplayProgressEvent = {
      progress,
      index,
      segmentIndex: index,
      segmentProgress: progress,
      totalSegments: tvist.__tvistInternal_slides.length,
    };
    base.__tvistInternal_emit('autoplayProgress', payload);
  }
  /**
   * Остановка отслеживания прогресса
   */
  function local_stopProgressTracking(): void {
    if (local_progressRAF !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelFrame(local_progressRAF);
      local_progressRAF = null;
    }
    local_progressStartTime = null;
  }
  /**
   * Очистить только таймер (без остановки всего autoplay)
   */
  function local_cancelTimer(): void {
    if (local_timer !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(local_timer);
      local_timer = null;
    }
  }
  /**
   * Старт autoplay
   */
  function local_start(): void {
    if (local_stopped) return;
    local_stop(); // Очищаем предыдущий таймер
    local_paused = false;
    // Если включен режим ожидания видео, проверяем текущий слайд сразу при старте
    if (local_config?.waitForVideo) {
      // Используем realIndex для loop режима, иначе activeIndex
      const currentIndex = tvist.__tvistInternal_realIndex ?? tvist.__tvistInternal_activeIndex;
      local_handleSlideChangedForVideo(currentIndex);
    } else {
      local_run(); // Запускаем рекурсивный цикл
    }
    base.__tvistInternal_emit('autoplayStart');
  }
  /**
   * Остановка autoplay
   */
  function local_stop(): void {
    local_cancelTimer();
    local_clearTransitionByAutoplayFallback();
    local_clearBoundaryCheckTimeout();
    local_stopProgressTracking();
    base.__tvistInternal_emit('autoplayStop');
  }
  /**
   * Пауза autoplay
   * Очищаем таймер, чтобы callback не сработал во время паузы
   */
  function local_pause(): void {
    if (!local_paused) {
      local_paused = true;
      // Вычисляем оставшееся время и текущий прогресс
      if (local_timer !== null && local_progressStartTime !== null && !local_waitingForVideo) {
        const elapsed = performance.now() - local_progressStartTime;
        // Сколько осталось от ТЕКУЩЕГО отрезка
        local_timeLeft = Math.max(0, local_currentChunkDuration - elapsed);
        // Накопленный прогресс = стартовый + пройденный за этот отрезок
        const chunkElapsedRatio = elapsed / local_currentDuration;
        local_progressStartOffset = Math.min(1, local_progressStartOffset + chunkElapsedRatio);
      }
      // Очищаем таймер — иначе callback может сработать между pause() и resume()
      local_cancelTimer();
      local_stopProgressTracking();
      base.__tvistInternal_emit('autoplayPause');
    }
  }
  /**
   * Возобновление autoplay
   * Перезапускает таймер с полной задержкой
   */
  function local_resume(): void {
    // Не возобновляем, если вкладка скрыта
    if (local_pausedByVisibility) {
      return;
    }
    if (local_paused && !local_stopped) {
      local_paused = false;
      // Если видео закончилось пока мы были на паузе — обрабатываем сейчас
      if (local_videoEndedWhilePaused && local_waitingForVideo) {
        local_videoEndedWhilePaused = false;
        local_waitingForVideo = false;
        // Запоминаем индекс до навигации
        const indexBefore = tvist.__tvistInternal_activeIndex;
        local_transitionByAutoplay = true;
        tvist.__tvistInternal_next();
        // Проверяем, изменился ли индекс (произошла ли навигация)
        // Если индекс не изменился (граница без loop), сбрасываем флаг немедленно
        if (tvist.__tvistInternal_activeIndex === indexBefore) {
          local_transitionByAutoplay = false;
          // Не планируем fallback, т.к. переход не произошёл
          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если навигация не произошла (граница без loop),
          // нужно перезапустить autoplay, иначе он останется застрявшим.
          // slideChangeEnd не будет эмититься, т.к. индекс не изменился,
          // поэтому handleSlideChangedForVideo не будет вызван.
          // Если включен waitForVideo, вызываем handleSlideChangedForVideo для текущего слайда,
          // иначе просто запускаем таймер.
          if (local_config?.waitForVideo) {
            local_handleSlideChangedForVideo(
              tvist.__tvistInternal_realIndex ?? tvist.__tvistInternal_activeIndex
            );
          } else {
            local_run();
          }
        } else {
          local_scheduleTransitionByAutoplayFallback();
        }
        base.__tvistInternal_emit('autoplayResume');
        return;
      }
      local_videoEndedWhilePaused = false;
      // Перезапускаем с полной задержкой
      // Это предотвращает немедленное переключение после паузы
      local_run();
      base.__tvistInternal_emit('autoplayResume');
    }
  }
  /**
   * Публичное API - получить модуль и использовать методы
   */
  function local_getAutoplay(): {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    isStopped: () => boolean;
  } {
    return {
      start: () => {
        local_stopped = false;
        local_start();
      },
      stop: () => local_stop(),
      pause: () => local_pause(),
      resume: () => local_resume(),
      isRunning: () => local_timer !== null && !local_paused,
      isPaused: () => local_paused,
      isStopped: () => local_stopped,
    };
  }
  const component: AutoplayModule = {
    get name() {
      return local_name;
    },
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
    shouldBeActive: local_shouldBeActive,
    onOptionsUpdate: local_onOptionsUpdate,
    start: local_start,
    stop: local_stop,
    pause: local_pause,
    resume: local_resume,
    getAutoplay: local_getAutoplay,
  };
  local_config = normalizeAutoplay(options.autoplay);
  return component;
}
