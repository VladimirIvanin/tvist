/**
 * Visibility Module
 *
 * Возможности:
 * - Отслеживание видимости слайдера (display: none, visibility: hidden, родители)
 * - Автоматическая приостановка autoplay/marquee при скрытии
 * - Автоматическое возобновление при появлении
 * - Использует IntersectionObserver для эффективного отслеживания
 * - Проверка CSS свойств display и visibility у элемента и всех родителей
 *
 * Опция visibility принимает:
 * - false / undefined — выключен
 * - true — включен с дефолтными настройками
 * - VisibilityOptions — полный контроль
 */
import { createComponent, type Component } from '../Component';
import { throttle } from '../../core/Animator';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type {
  TvistOptions,
  VisibilityOptions,
  AutoplayModuleAPI,
  MarqueeModuleAPI,
} from '../../core/types';
/** Дефолтные значения для VisibilityOptions */
const VISIBILITY_DEFAULTS: Required<VisibilityOptions> = {
  pauseAutoplay: true,
  pauseMarquee: true,
  threshold: 0, // Считаем видимым если хоть что-то видно
};
/**
 * Нормализация visibility опций в объект VisibilityOptions.
 * Возвращает null если visibility выключен.
 */
function normalizeVisibility(raw: TvistOptions['visibility']): Required<VisibilityOptions> | null {
  if (raw === false || raw === undefined) return null;
  if (raw === true) {
    return { ...VISIBILITY_DEFAULTS };
  }
  // Object form
  return {
    pauseAutoplay: raw.pauseAutoplay ?? VISIBILITY_DEFAULTS.pauseAutoplay,
    pauseMarquee: raw.pauseMarquee ?? VISIBILITY_DEFAULTS.pauseMarquee,
    threshold: raw.threshold ?? VISIBILITY_DEFAULTS.threshold,
  };
}
/** Элемент с опциональным checkVisibility (браузерный API, не везде есть) */
type ElementWithCheckVisibility = Element & {
  checkVisibility?(options?: { visibilityProperty?: boolean }): boolean;
};
/**
 * Проверяет, виден ли элемент через CSS (display, visibility, content-visibility).
 * Использует Element.checkVisibility() при наличии (см. https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility),
 * иначе — рекурсивный обход от элемента до document.body.
 */
function isElementVisibleCSS(element: HTMLElement): boolean {
  const el = element as ElementWithCheckVisibility;
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ visibilityProperty: true });
  }
  // Fallback: обход элемента и всех родителей до document.body с ограничением глубины
  let current: HTMLElement | null = element;
  let depth = 0;
  const MAX_DEPTH = 10; // Ограничиваем глубину для производительности
  while (current && current !== document.body && depth < MAX_DEPTH) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    current = current.parentElement;
    depth++;
  }
  return true;
}
/** Учитывает видимость вкладки (скрытая вкладка = не видим). */
function isPageVisible(): boolean {
  return typeof document.visibilityState !== 'undefined'
    ? document.visibilityState === 'visible'
    : !(
        document as Document & {
          hidden?: boolean;
        }
      ).hidden;
}

/** Internal component; state lives in this factory's closure. */
export interface VisibilityModule extends Component {
  readonly name: 'visibility';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Обработка обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  /**
   * Публичное API
   */
  getVisibility(): { isVisible: () => boolean; check: () => boolean };
}

export function createVisibilityModule(tvist: Tvist, options: TvistOptions): VisibilityModule {
  const base = createComponent(tvist, options);

  const local_name = 'visibility' as const;
  /** Нормализованные опции visibility */
  let local_config: Required<VisibilityOptions> | null = null;
  /** IntersectionObserver для отслеживания видимости */
  let local_intersectionObserver: IntersectionObserver | null = null;
  /** Текущее состояние видимости */
  let local_isVisible = true;
  /** Флаг: был ли autoplay запущен до паузы */
  let local_autoplayWasRunning = false;
  /** Флаг: был ли marquee запущен до паузы */
  let local_marqueeWasRunning = false;
  /** MutationObserver для отслеживания изменений style атрибута */
  let local_mutationObserver: MutationObserver | null = null;
  /** Throttled версия checkVisibility для оптимизации производительности */

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_setupObserver();
    local_setupMutationObserver();
  }

  function local_destroy(): void {
    local_stopObserver();
    local_stopMutationObserver();
    // Восстанавливаем видимость при уничтожении модуля
    tvist.__tvistInternal__isVisible = true;
  }

  function local_shouldBeActive(): boolean {
    return local_config !== null;
  }
  /**
   * Обработка обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.visibility !== undefined) {
      const wasActive = local_config !== null;
      // Перенормализуем
      local_config = normalizeVisibility(newOptions.visibility);
      const isNowActive = local_config !== null;
      // Если visibility был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        local_setupObserver();
        local_setupMutationObserver();
      }
      // Если visibility был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        local_stopObserver();
        local_stopMutationObserver();
        // Восстанавливаем видимость
        tvist.__tvistInternal__isVisible = true;
        // Возобновляем модули если они были приостановлены
        if (!local_isVisible) {
          local_resumeModules();
        }
        // Удаляем модуль из списка активных модулей
        tvist.__tvistInternal_removeModule(local_name);
      }
    }
  }
  /**
   * Настройка IntersectionObserver
   */
  function local_setupObserver(): void {
    if (!local_config) return;
    // Создаем observer с порогом из конфига
    local_intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Проверяем видимость через IntersectionObserver
          const isIntersecting = entry.isIntersecting;
          // Дополнительно проверяем CSS видимость и видимость вкладки
          const isCSSVisible = isElementVisibleCSS(tvist.__tvistInternal_root);
          const newVisibility = isIntersecting && isCSSVisible && isPageVisible();
          if (newVisibility !== local_isVisible) {
            local_isVisible = newVisibility;
            local_handleVisibilityChange(newVisibility);
          }
        });
      },
      {
        threshold: local_config.threshold,
      }
    );
    local_intersectionObserver.observe(tvist.__tvistInternal_root);
  }
  /**
   * Остановка IntersectionObserver
   */
  function local_stopObserver(): void {
    if (local_intersectionObserver) {
      local_intersectionObserver.disconnect();
      local_intersectionObserver = null;
    }
  }
  /**
   * Настройка MutationObserver для отслеживания изменений style
   */
  function local_setupMutationObserver(): void {
    local_mutationObserver = new MutationObserver(() => {
      // Используем throttled версию вместо прямого вызова
      local_throttledCheckVisibility();
    });
    // Отслеживаем изменения атрибута style у root элемента и его родителей
    let element: HTMLElement | null = tvist.__tvistInternal_root;
    while (element && element !== document.body) {
      local_mutationObserver.observe(element, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
      element = element.parentElement;
    }
  }
  /**
   * Остановка MutationObserver
   */
  function local_stopMutationObserver(): void {
    if (local_mutationObserver) {
      local_mutationObserver.disconnect();
      local_mutationObserver = null;
    }
  }
  /**
   * Проверка видимости (CSS + видимость вкладки).
   * Вызывается из MutationObserver при изменении style/class у root и родителей.
   */
  function local_checkVisibility(): void {
    const isCSSVisible = isElementVisibleCSS(tvist.__tvistInternal_root);
    const visible = isCSSVisible && isPageVisible();
    if (visible !== local_isVisible) {
      local_isVisible = visible;
      local_handleVisibilityChange(visible);
    }
  }
  /**
   * Обработка изменения видимости
   */
  function local_handleVisibilityChange(isVisible: boolean): void {
    if (isVisible) {
      // Разрешаем переключение слайдов
      tvist.__tvistInternal__isVisible = true;
      base.__tvistInternal_emit('sliderVisible');
      local_resumeModules();
    } else {
      // Блокируем переключение слайдов
      tvist.__tvistInternal__isVisible = false;
      base.__tvistInternal_emit('sliderHidden');
      local_pauseModules();
    }
  }
  /**
   * Приостановка модулей (autoplay, marquee)
   */
  function local_pauseModules(): void {
    if (!local_config) return;
    // Приостанавливаем autoplay
    if (local_config.pauseAutoplay) {
      const autoplayModule = tvist.__tvistInternal_getModule('autoplay') as
        | AutoplayModuleAPI
        | undefined;
      const autoplay = autoplayModule?.getAutoplay();
      if (autoplay?.isRunning()) {
        local_autoplayWasRunning = true;
        autoplay.pause();
      }
    }
    // Останавливаем marquee (stop вместо pause для полной остановки RAF)
    if (local_config.pauseMarquee) {
      const marqueeModule = tvist.__tvistInternal_getModule('marquee') as
        | MarqueeModuleAPI
        | undefined;
      const marquee = marqueeModule?.getMarquee();
      if (marquee?.isRunning()) {
        local_marqueeWasRunning = true;
        marquee.stop();
      }
    }
  }
  /**
   * Возобновление модулей (autoplay, marquee)
   */
  function local_resumeModules(): void {
    if (!local_config) return;
    // Возобновляем autoplay если он был запущен
    if (local_config.pauseAutoplay && local_autoplayWasRunning) {
      const autoplayModule = tvist.__tvistInternal_getModule('autoplay') as
        | AutoplayModuleAPI
        | undefined;
      const autoplay = autoplayModule?.getAutoplay();
      if (autoplay) {
        autoplay.resume();
      }
      local_autoplayWasRunning = false;
    }
    // Запускаем marquee заново если он был запущен
    if (local_config.pauseMarquee && local_marqueeWasRunning) {
      const marqueeModule = tvist.__tvistInternal_getModule('marquee') as
        | MarqueeModuleAPI
        | undefined;
      const marquee = marqueeModule?.getMarquee();
      if (marquee) {
        marquee.start();
      }
      local_marqueeWasRunning = false;
    }
  }
  /**
   * Публичное API
   */
  function local_getVisibility(): { isVisible: () => boolean; check: () => boolean } {
    return {
      isVisible: () => local_isVisible,
      check: () => {
        const isCSSVisible = isElementVisibleCSS(tvist.__tvistInternal_root);
        const visible = isCSSVisible && isPageVisible();
        if (visible !== local_isVisible) {
          local_isVisible = visible;
          local_handleVisibilityChange(visible);
        }
        return local_isVisible;
      },
    };
  }
  const component: VisibilityModule = {
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
    getVisibility: local_getVisibility,
  };
  local_config = normalizeVisibility(options.visibility);
  // Создаем throttled версию с задержкой 100ms
  const local_throttledCheckVisibility = throttle(
    () => {
      local_checkVisibility();
    },
    100,
    base.__tvistInternal_resources
  );
  return component;
}
