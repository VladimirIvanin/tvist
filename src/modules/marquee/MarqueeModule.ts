/**
 * Marquee Module
 *
 * Возможности:
 * - Непрерывная прокрутка (бегущая строка)
 * - Настраиваемая скорость в пикселях в секунду
 * - Поддержка направлений: left, right (horizontal), up, down (vertical)
 * - Пауза при наведении курсора
 * - Публичное API: start, stop, pause, resume
 */
import { createComponent, type Component } from '../Component';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
import { gapCssForMargin } from '../../utils/gridGap';

/** Internal component; state lives in this factory's closure. */
export interface MarqueeModule extends Component {
  readonly name: 'marquee';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Обработка обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  /**
   * Обработка обновления (вызывается из Engine)
   */
  onUpdate(): void;
  /**
   * Старт marquee анимации
   */
  start(): void;
  /**
   * Остановка marquee (отменяет RAF, но не меняет флаг stopped)
   * Для полной остановки с установкой флага используйте публичное API: getMarquee().stop()
   */
  stop(): void;
  /**
   * Пауза marquee
   */
  pause(): void;
  /**
   * Возобновление marquee
   */
  resume(): void;
  /**
   * Обработка resize
   */
  onResize(): void;
  /**
   * Получить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  getCurrentPosition(): number;
  /**
   * Установить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  setCurrentPosition(position: number): void;
  /**
   * Публичное API
   */
  getMarquee(): {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    isStopped: () => boolean;
    setSpeed: (speed: number) => void;
    getSpeed: () => number;
    setDirection: (direction: 'left' | 'right' | 'up' | 'down') => void;
    getDirection: () => 'left' | 'right' | 'up' | 'down';
  };
}

export function createMarqueeModule(tvist: Tvist, options: TvistOptions): MarqueeModule {
  const base = createComponent(tvist, options);

  const local_name = 'marquee' as const;

  let local_rafId: number | null = null;

  let local_paused = false;

  let local_stopped = false;

  let local_speed: number;

  let local_direction: 'left' | 'right' | 'up' | 'down';

  let local_lastTimestamp: number | null = null;
  /** Общая ширина/высота всех слайдов */
  let local_totalSize = 0;
  /** Текущая позиция прокрутки */
  let local_currentPosition = 0;
  /** Размер привязан к элементу, поэтому перестановка слайдов не инвалидирует кеш. */
  let local_cachedSlideSizes: WeakMap<HTMLElement, number> = new WeakMap<HTMLElement, number>();

  let local_mouseEnterHandler: (() => void) | undefined;

  let local_mouseLeaveHandler: (() => void) | undefined;
  /**
   * Определяет направление по умолчанию в зависимости от orientation слайдера
   */
  function local_getDefaultDirection(): 'left' | 'right' | 'up' | 'down' {
    return options.direction === 'vertical' ? 'up' : 'left';
  }

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    // ВАЖНО: Marquee требует loop для бесшовной прокрутки
    // Автоматически включаем loop, если он не был включен
    if (
      !(
        options.loop === true ||
        (typeof options.loop === 'object' && options.loop.enabled !== false)
      )
    ) {
      // Обновляем опции через updateOptions для корректной инициализации всех модулей
      tvist.updateOptions({ loop: true });
    }
    // Исправляем gap у последнего слайда
    local_fixLastSlideGap();
    // Вычисляем общий размер
    local_calculateTotalSize();
    // Отключаем стандартную анимацию Engine
    tvist.__tvistInternal_engine.__tvistInternal_animator.stop();
    // Настраиваем события
    local_setupEvents();
    // Подписываемся на события драга для паузы/возобновления
    base.on('dragStart', () => local_pause());
    base.on('dragEnd', () => local_resume());
    // Запускаем marquee
    local_start();
  }

  function local_destroy(): void {
    local_stop();
    local_detachHoverEvents();
    base.off('dragStart');
    base.off('dragEnd');
  }

  function local_shouldBeActive(): boolean {
    return options.marquee !== false && options.marquee !== undefined;
  }
  /**
   * Обработка обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.marquee !== undefined) {
      const wasActive = local_rafId !== null;
      const isNowActive = newOptions.marquee !== false && newOptions.marquee !== undefined;
      // Обновляем параметры
      if (typeof newOptions.marquee === 'object') {
        if (newOptions.marquee.speed !== undefined) {
          local_speed = newOptions.marquee.speed;
        }
        if (newOptions.marquee.direction !== undefined) {
          local_direction = newOptions.marquee.direction;
        }
      }
      // Если marquee был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        local_stopped = false;
        local_calculateTotalSize();
        local_setupEvents();
        local_start();
      }
      // Если marquee был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        local_stop();
        local_detachHoverEvents();
        local_stopped = true;
      }
      // Если marquee остается включенным (но изменились параметры)
      else if (wasActive && isNowActive) {
        if (
          newOptions.marquee &&
          typeof newOptions.marquee === 'object' &&
          newOptions.marquee.direction
        ) {
          local_calculateTotalSize();
          local_currentPosition = 0;
        }
      }
    }
    // Если изменился pauseOnHover
    if (
      newOptions.marquee &&
      typeof newOptions.marquee === 'object' &&
      newOptions.marquee.pauseOnHover !== undefined
    ) {
      if (local_shouldBeActive()) {
        local_detachHoverEvents();
        local_setupEvents();
      }
    }
  }
  /**
   * Обработка обновления (вызывается из Engine)
   */
  function local_onUpdate(): void {
    if (local_shouldBeActive()) {
      local_fixLastSlideGap();
      local_calculateTotalSize();
    }
  }
  /**
   * Исправляет отсутствующий gap у последнего слайда
   * В режиме Marquee нам нужен gap после КАЖДОГО слайда для бесшовного цикла
   */
  function local_fixLastSlideGap(): void {
    const gapCss = gapCssForMargin(options.gap);
    if (!gapCss) return;
    const slides = tvist.slides;
    if (slides.length === 0) return;
    // Engine убирает margin у последнего слайда.
    // Нам нужно, чтобы у ВСЕХ слайдов был margin, так как они зациклены.
    const lastSlide = slides[slides.length - 1];
    if (!lastSlide) return;
    const property = options.direction === 'vertical' ? 'marginBottom' : 'marginRight';
    if (!lastSlide.style[property]) lastSlide.style[property] = gapCss;
  }
  /**
   * Вычисляет общий размер всех слайдов
   */
  function local_calculateTotalSize(): void {
    const isHorizontal = options.direction !== 'vertical';
    const gap = tvist.__tvistInternal_engine.__tvistInternal_gapPxValue;
    const count = tvist.slides.length;
    if (count === 0) {
      local_totalSize = 0;
      local_cachedSlideSizes = new WeakMap();
      return;
    }
    local_cachedSlideSizes = new WeakMap();
    local_totalSize = tvist.slides.reduce((sum, slide) => {
      const size = isHorizontal ? slide.offsetWidth : slide.offsetHeight;
      local_cachedSlideSizes.set(slide, size);
      return sum + size + gap;
    }, 0);
  }
  /**
   * Настройка событий
   */
  function local_setupEvents(): void {
    const marquee = options.marquee;
    const pauseOnHover = typeof marquee === 'object' ? marquee.pauseOnHover : true;
    if (pauseOnHover) {
      local_attachHoverEvents();
    }
  }
  /**
   * Подключение hover событий
   */
  function local_attachHoverEvents(): void {
    local_mouseEnterHandler = () => local_pause();
    local_mouseLeaveHandler = () => local_resume();
    base.resources.listen(tvist.root, 'mouseenter', local_mouseEnterHandler);
    base.resources.listen(tvist.root, 'mouseleave', local_mouseLeaveHandler);
  }
  /**
   * Отключение hover событий
   */
  function local_detachHoverEvents(): void {
    if (local_mouseEnterHandler) {
      base.resources.unlisten(tvist.root, 'mouseenter', local_mouseEnterHandler);
    }
    if (local_mouseLeaveHandler) {
      base.resources.unlisten(tvist.root, 'mouseleave', local_mouseLeaveHandler);
    }
  }
  /**
   * Старт marquee анимации
   */
  function local_start(): void {
    if (local_stopped) return;
    local_stop(); // Очищаем предыдущий RAF
    local_paused = false;
    local_lastTimestamp = null;
    const animate = (timestamp: number) => {
      if (local_stopped) return;
      // Вычисляем delta time
      local_lastTimestamp ??= timestamp;
      const deltaTime = (timestamp - local_lastTimestamp) / 1000; // в секундах
      local_lastTimestamp = timestamp;
      // Обновляем позицию если не на паузе
      if (!local_paused) {
        local_updatePosition(deltaTime);
      }
      // Продолжаем анимацию
      local_rafId = base.resources.frame(animate);
    };
    local_rafId = base.resources.frame(animate);
    base.emit('marqueeStart');
  }
  /**
   * Обновляет позицию прокрутки
   */
  function local_updatePosition(deltaTime: number): void {
    const gap = tvist.__tvistInternal_engine.__tvistInternal_gapPxValue;
    const isReverse = local_direction === 'right' || local_direction === 'down';
    local_currentPosition += (isReverse ? -1 : 1) * local_speed * deltaTime;
    while (tvist.slides.length > 0) {
      const index = isReverse ? tvist.slides.length - 1 : 0;
      const slide = tvist.slides[index];
      const size = (slide ? (local_cachedSlideSizes.get(slide) ?? 0) : 0) + gap;
      if (!slide || size <= 0) break;
      if (isReverse ? local_currentPosition > 0 : local_currentPosition < size) break;
      if (isReverse) {
        tvist.container.prepend(slide);
      } else {
        tvist.container.appendChild(slide);
      }
      tvist.__tvistInternal_updateSlidesList();
      local_currentPosition += isReverse ? size : -size;
    }
    local_applyTransform();
  }
  /**
   * Применяет CSS transform для прокрутки
   */
  function local_applyTransform(): void {
    const isHorizontal = options.direction !== 'vertical';
    // Всегда используем отрицательное значение currentPosition
    // Для left/up: currentPosition положительный (0 → totalSize), transform отрицательный
    // Для right/down: currentPosition отрицательный (0 → -totalSize), transform положительный
    const transform = isHorizontal
      ? `translate3d(${-local_currentPosition}px, 0, 0)`
      : `translate3d(0, ${-local_currentPosition}px, 0)`;
    tvist.container.style.transform = transform;
  }
  /**
   * Остановка marquee (отменяет RAF, но не меняет флаг stopped)
   * Для полной остановки с установкой флага используйте публичное API: getMarquee().stop()
   */
  function local_stop(): void {
    if (local_rafId !== null) {
      base.resources.cancelFrame(local_rafId);
      local_rafId = null;
      local_lastTimestamp = null;
    }
    base.emit('marqueeStop');
  }
  /**
   * Пауза marquee
   */
  function local_pause(): void {
    if (!local_shouldBeActive()) return;
    if (!local_paused) {
      local_paused = true;
      // Синхронизируем engine.location с визуальной позицией marquee.
      // MarqueeModule управляет transform напрямую, engine.location может быть рассинхронизирован.
      // При паузе (например, для drag) нужно чтобы engine.location отражал реальную позицию.
      const visualPosition = -local_currentPosition;
      tvist.__tvistInternal_engine.__tvistInternal_location.set(visualPosition);
      tvist.__tvistInternal_engine.__tvistInternal_target.set(visualPosition);
      base.emit('marqueePause');
    }
  }
  /**
   * Возобновление marquee
   */
  function local_resume(): void {
    if (!local_shouldBeActive()) return;
    if (local_paused && !local_stopped) {
      // Синхронизируем currentPosition с engine.location
      // (после drag/snap engine.location мог измениться)
      local_currentPosition = -tvist.__tvistInternal_engine.__tvistInternal_location.get();
      local_paused = false;
      local_lastTimestamp = null; // Сбрасываем timestamp для корректного deltaTime
      base.emit('marqueeResume');
    }
  }
  /**
   * Обработка resize
   */
  function local_onResize(): void {
    if (local_shouldBeActive()) {
      local_calculateTotalSize();
    }
  }
  /**
   * Получить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  function local_getCurrentPosition(): number {
    return local_currentPosition;
  }
  /**
   * Установить текущую позицию прокрутки marquee (для интеграции с DragModule)
   */
  function local_setCurrentPosition(position: number): void {
    local_currentPosition = position;
  }
  /**
   * Публичное API
   */
  function local_getMarquee(): {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isRunning: () => boolean;
    isPaused: () => boolean;
    isStopped: () => boolean;
    setSpeed: (speed: number) => void;
    getSpeed: () => number;
    setDirection: (direction: 'left' | 'right' | 'up' | 'down') => void;
    getDirection: () => 'left' | 'right' | 'up' | 'down';
  } {
    return {
      start: () => {
        local_stopped = false;
        local_start();
      },
      stop: () => {
        local_stop();
        local_stopped = true;
      },
      pause: () => local_pause(),
      resume: () => local_resume(),
      isRunning: () => local_rafId !== null && !local_paused,
      isPaused: () => local_paused,
      isStopped: () => local_stopped,
      setSpeed: (speed: number) => {
        local_speed = speed;
      },
      getSpeed: () => local_speed,
      setDirection: (direction: 'left' | 'right' | 'up' | 'down') => {
        if (local_direction !== direction) {
          // Сохраняем текущую визуальную позицию (transform offset)
          // Для всех направлений transform = -currentPosition
          const currentVisualOffset = local_currentPosition;
          local_direction = direction;
          local_calculateTotalSize();
          // Восстанавливаем визуальную позицию
          // Независимо от направления, визуальный offset остаётся тем же
          // currentPosition всегда напрямую определяет transform offset
          local_currentPosition = currentVisualOffset;
          // Нормализуем позицию в пределах [0, totalSize]
          if (local_totalSize > 0) {
            local_currentPosition = local_currentPosition % local_totalSize;
            if (local_currentPosition < 0) {
              local_currentPosition += local_totalSize;
            }
          }
          local_lastTimestamp = null;
          local_applyTransform();
        }
      },
      getDirection: () => local_direction,
    };
  }
  const component: MarqueeModule = {
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
    onOptionsUpdate: local_onOptionsUpdate,
    onUpdate: local_onUpdate,
    start: local_start,
    stop: local_stop,
    pause: local_pause,
    resume: local_resume,
    onResize: local_onResize,
    getCurrentPosition: local_getCurrentPosition,
    setCurrentPosition: local_setCurrentPosition,
    getMarquee: local_getMarquee,
  };
  // Определяем параметры
  const marquee = options.marquee;
  local_speed = typeof marquee === 'object' ? (marquee.speed ?? 50) : 50;
  local_direction =
    typeof marquee === 'object'
      ? (marquee.direction ?? local_getDefaultDirection())
      : local_getDefaultDirection();
  return component;
}
