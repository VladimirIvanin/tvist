/**
 * ScrollControl - модуль для управления слайдером через скролл
 * Поддерживает wheel events на десктопе
 */
import { createComponent, type Component } from '../Component';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
interface ScrollControlOptions {
  /** Чувствительность (количество пикселей на тик колёсика) */
  sensitivity?: number;
  /** Разрешить прокрутку страницы на краях слайдера */
  releaseOnEdges?: boolean;
}

/** Internal component; state lives in this factory's closure. */
export interface ScrollControlModule extends Component {
  readonly name: 'ScrollControl';
  /**
   * Проверить, должен ли модуль быть активен
   */
  shouldBeActive(): boolean;

  init(): void;
  /**
   * Хук обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;

  destroy(): void;
}

export function createScrollControlModule(
  tvist: Tvist,
  options: TvistOptions
): ScrollControlModule {
  const base = createComponent(tvist, options);

  const local_name = 'ScrollControl' as const;

  let local_sensitivity: number;

  let local_releaseOnEdges: boolean;

  let local_isScrolling = false;

  let local_scrollTimer: number | undefined;

  let local_lastWheelTime = 0;

  const local_wheelThrottle = 50; // мс между обработкой событий
  /**
   * Получить опции wheel из конфигурации
   */
  function local_getWheelOptions(): ScrollControlOptions {
    const wheel = options.wheel;
    if (typeof wheel === 'boolean') {
      return {};
    }
    return wheel ?? {};
  }
  /**
   * Проверить, должен ли модуль быть активен
   */
  function local_shouldBeActive(): boolean {
    return options.wheel !== false && options.wheel !== undefined;
  }

  function local_init(): void {
    if (!local_shouldBeActive()) {
      return;
    }
    // Добавляем обработчик wheel событий
    local_attachWheelListener();
  }
  /**
   * Добавить обработчик wheel событий
   */
  function local_attachWheelListener(): void {
    base.__tvistInternal_resources.__tvistInternal_listen(
      tvist.__tvistInternal_root,
      'wheel',
      local_handleWheel,
      { passive: false }
    );
  }
  /**
   * Обработчик wheel события
   */
  const local_handleWheel: (event: WheelEvent) => void = (event: WheelEvent): void => {
    const isVertical = options.direction === 'vertical';
    // Для горизонтального слайдера используем deltaY (как обычный скролл вниз/вверх)
    // Для вертикального слайдера также используем deltaY
    // deltaX используется только если deltaY = 0 (трекпад, shift+wheel)
    let mainDelta = event.deltaY;
    // Если deltaY = 0, но есть deltaX (трекпад или shift+wheel)
    if (Math.abs(event.deltaY) < 1 && Math.abs(event.deltaX) > 0) {
      if (!isVertical) {
        // Для горизонтального слайдера используем deltaX
        mainDelta = event.deltaX;
      } else {
        // Для вертикального слайдера игнорируем горизонтальный скролл
        return;
      }
    }
    // Если вертикальный слайдер и есть горизонтальный скролл больше вертикального, игнорируем
    if (isVertical && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }
    // Если горизонтальный слайдер и deltaX больше deltaY (трекпад), используем deltaX
    if (
      !isVertical &&
      Math.abs(event.deltaX) > Math.abs(event.deltaY) &&
      Math.abs(event.deltaX) > 0
    ) {
      mainDelta = event.deltaX;
    }
    // Если нет значимого скролла, игнорируем
    if (Math.abs(mainDelta) < 1) {
      return;
    }
    // Throttle для предотвращения слишком частых срабатываний
    const now = Date.now();
    if (now - local_lastWheelTime < local_wheelThrottle) {
      event.preventDefault();
      return;
    }
    local_lastWheelTime = now;
    // Проверяем границы слайдера
    const isAtStart = !tvist.__tvistInternal_engine.__tvistInternal_canScrollPrev();
    const isAtEnd = !tvist.__tvistInternal_engine.__tvistInternal_canScrollNext();
    const scrollingForward = mainDelta > 0;
    const scrollingBackward = mainDelta < 0;
    // Если releaseOnEdges включен и мы на краю, разрешаем нативный скролл
    if (local_releaseOnEdges) {
      if ((isAtStart && scrollingBackward) || (isAtEnd && scrollingForward)) {
        return;
      }
    }
    // Предотвращаем нативный скролл
    event.preventDefault();
    // Если уже идёт прокрутка, игнорируем
    if (local_isScrolling) {
      return;
    }
    // Определяем направление и выполняем переход
    const delta = Math.sign(mainDelta) * local_sensitivity;
    if (delta > 0) {
      tvist.__tvistInternal_next();
    } else if (delta < 0) {
      tvist.__tvistInternal_prev();
    }
    // Устанавливаем флаг прокрутки
    local_isScrolling = true;
    // Сбрасываем флаг после анимации
    if (local_scrollTimer) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(local_scrollTimer);
    }
    const speed = options.speed ?? 300;
    local_scrollTimer = base.__tvistInternal_resources.__tvistInternal_timeout(() => {
      local_isScrolling = false;
    }, speed + 50);
  };
  /**
   * Хук обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.wheel !== undefined) {
      const wheelOptions = typeof newOptions.wheel === 'boolean' ? {} : (newOptions.wheel ?? {});
      local_sensitivity = wheelOptions.sensitivity ?? 1;
      local_releaseOnEdges = wheelOptions.releaseOnEdges ?? true;
    }
  }

  function local_destroy(): void {
    // Очищаем таймеры
    if (local_scrollTimer) {
      base.__tvistInternal_resources.__tvistInternal_cancelTimeout(local_scrollTimer);
    }
    // Удаляем обработчик wheel событий
    base.__tvistInternal_resources.__tvistInternal_unlisten(
      tvist.__tvistInternal_root,
      'wheel',
      local_handleWheel
    );
  }
  const component: ScrollControlModule = {
    get name() {
      return local_name;
    },
    shouldBeActive: local_shouldBeActive,
    init: local_init,
    onOptionsUpdate: local_onOptionsUpdate,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
  };
  const wheelOptions = local_getWheelOptions();
  local_sensitivity = wheelOptions.sensitivity ?? 1;
  local_releaseOnEdges = wheelOptions.releaseOnEdges ?? true;
  return component;
}
