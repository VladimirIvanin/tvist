/**
 * Breakpoints Module
 *
 * Возможности:
 * - Адаптивность через media queries
 * - breakpointsBase: 'window' | 'container'
 * - Мёрджинг опций для текущего breakpoint
 * - События при смене breakpoint
 */
import { createComponent, type Component } from '../Component';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
import { findMatchingBreakpoint, mergeBreakpointOptions } from '../../utils/breakpoints';
import { cloneOptions } from '../../utils/dom';

/** Internal component; state lives in this factory's closure. */
export interface BreakpointsModule extends Component {
  readonly name: 'breakpoints';
  /**
   * Сбросить текущий breakpoint (для пересчёта при updateOptions).
   */
  resetCurrentBreakpoint(): void;

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Получить текущий breakpoint
   */
  getCurrentBreakpoint(): number | null;
  /**
   * Хук при resize
   */
  onResize(): void;
}

export function createBreakpointsModule(tvist: Tvist, options: TvistOptions): BreakpointsModule {
  const base = createComponent(tvist, options);

  const local_name = 'breakpoints' as const;

  const local_mediaQueries: Map<number, MediaQueryList> = new Map<number, MediaQueryList>();

  let local_currentBreakpoint: number | null = null;
  /**
   * Получить оригинальные опции (до применения breakpoint)
   */
  function local_getOriginalOptions(): TvistOptions {
    return tvist.__tvistInternal__originalOptions ?? { ...options };
  }
  /**
   * Сбросить текущий breakpoint (для пересчёта при updateOptions).
   */
  function local_resetCurrentBreakpoint(): void {
    local_currentBreakpoint = null;
  }

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    // Если база - окно, используем matchMedia для оптимизации
    if (options.breakpointsBase !== 'container') {
      local_setupMediaQueries();
    }
    // Применяем breakpoint при инициализации (важно для container-based)
    local_checkBreakpoints();
  }

  function local_destroy(): void {
    // Отключаем все media queries
    local_mediaQueries.forEach((mq) => {
      try {
        base.__tvistInternal_resources.__tvistInternal_unlisten(
          mq,
          'change',
          local_handleMediaChange
        );
      } catch {
        // Fallback for older browsers
        mq.removeListener(local_handleMediaChange);
      }
    });
    local_mediaQueries.clear();
  }

  function local_shouldBeActive(): boolean {
    return !!(options.breakpoints && Object.keys(options.breakpoints).length > 0);
  }
  /**
   * Настройка media queries
   */
  function local_setupMediaQueries(): void {
    if (!options.breakpoints) return;
    // Проверяем поддержку matchMedia
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const originalOptions = local_getOriginalOptions();
    if (!originalOptions.breakpoints) return;
    // Сортируем breakpoints от большего к меньшему
    const breakpoints = Object.keys(originalOptions.breakpoints)
      .map(Number)
      .sort((a, b) => b - a);
    breakpoints.forEach((bp) => {
      const mq = window.matchMedia(`(max-width: ${bp}px)`);
      // Слушаем изменения
      base.__tvistInternal_resources.__tvistInternal_listen(mq, 'change', local_handleMediaChange);
      local_mediaQueries.set(bp, mq);
    });
  }
  /**
   * Обработчик изменения media query.
   * Проверяет breakpoints и при необходимости вызывает update().
   * Использует throttle для оптимизации производительности при частых изменениях окна.
   */
  const local_handleMediaChange: () => void = (): void => {
    // Сначала синхронно применяем breakpoint (может disable/enable слайдер)
    local_checkBreakpoints();
    // Если слайдер включен, пересчитываем размеры
    if (tvist.__tvistInternal_isEnabled) {
      tvist.__tvistInternal_update();
    }
  };
  // Проверка текущего breakpoint
  function local_checkBreakpoints(): void {
    // Не применяем брейкпоинты во время enable/disable
    if (tvist.__tvistInternal_isTogglingEnabled) {
      return;
    }
    const originalOptions = local_getOriginalOptions();
    // Создаем временный объект опций с breakpointsBase для findMatchingBreakpoint
    const optionsForCheck: TvistOptions = {
      ...originalOptions,
      breakpointsBase: originalOptions.breakpointsBase,
    };
    // Форсируем обновление кеша при явной проверке breakpoints
    const newBreakpoint = findMatchingBreakpoint(tvist.__tvistInternal_root, optionsForCheck, true);
    // Проверяем, был ли вручную изменён enabled
    const manualEnabledChange = tvist.__tvistInternal_checkAndResetManualEnabledChange();
    // Запоминаем старый breakpoint для события
    const oldBreakpoint = local_currentBreakpoint;
    const breakpointChanged = newBreakpoint !== oldBreakpoint;
    // Применяем если breakpoint изменился ИЛИ был ручной вызов enable/disable
    if (breakpointChanged || manualEnabledChange) {
      local_currentBreakpoint = newBreakpoint;
      local_applyBreakpoint(newBreakpoint);
      // Эмитим событие только если breakpoint реально изменился
      if (breakpointChanged) {
        base.__tvistInternal_emit('breakpoint', newBreakpoint);
        // Вызываем callback из опций
        if (originalOptions.on?.breakpoint) {
          originalOptions.on.breakpoint(newBreakpoint);
        }
      }
    }
  }
  /**
   * Применение опций breakpoint
   */
  function local_applyBreakpoint(bp: number | null): void {
    const originalOptions = local_getOriginalOptions();
    // Начинаем с оригинальных опций (deep clone с сохранением DOM-элементов)
    const newOptions = cloneOptions(originalOptions as Record<string, unknown>) as TvistOptions;
    // Если есть breakpoint - мёрджим его опции
    if (bp !== null && originalOptions.breakpoints?.[bp]) {
      mergeBreakpointOptions(newOptions, originalOptions.breakpoints[bp]);
    }
    // Проверяем enabled флаг
    const shouldBeEnabled = newOptions.enabled !== false;
    // Применяем новые опции к слайдеру (заменяем полностью, кроме breakpoints)
    const breakpoints = tvist.__tvistInternal_options.breakpoints;
    Object.keys(tvist.__tvistInternal_options).forEach((key) => {
      if (key !== 'breakpoints' && key !== 'on') {
        delete (tvist.__tvistInternal_options as Record<string, unknown>)[key];
      }
    });
    Object.assign(tvist.__tvistInternal_options, newOptions);
    tvist.__tvistInternal_options.breakpoints = breakpoints;
    // Синхронизируем модули с новыми опциями (инициализируем новые, уничтожаем деактивированные)
    // Вызываем до enable/disable, чтобы модули были готовы при включении слайдера
    if (shouldBeEnabled) {
      tvist.__tvistInternal_syncModules();
    }
    // Включаем или отключаем слайдер в зависимости от enabled
    // ВАЖНО: enable/disable вызывают update(), что может привести к повторному onResize
    // Но это не проблема, т.к. currentBreakpoint уже обновлён и повторного apply не будет
    if (shouldBeEnabled && !tvist.__tvistInternal_isEnabled) {
      tvist.__tvistInternal_enable();
    } else if (!shouldBeEnabled && tvist.__tvistInternal_isEnabled) {
      tvist.__tvistInternal_disable();
    } else if (shouldBeEnabled && tvist.__tvistInternal_isEnabled) {
      // Только если слайдер остается включенным, обновляем его
      tvist.__tvistInternal_update();
    }
    // При деактивации только уничтожаем ставшие неактивными модули —
    // создавать новые нельзя, слайдер отключён
    if (!shouldBeEnabled) {
      tvist.__tvistInternal_syncModules(true);
    }
  }
  /**
   * Получить текущий breakpoint
   */
  function local_getCurrentBreakpoint(): number | null {
    return local_currentBreakpoint;
  }
  /**
   * Хук при resize
   */
  function local_onResize(): void {
    // Вызываем checkBreakpoints напрямую при явном update()
    // Throttle применяется только для handleMediaChange (window resize events)
    local_checkBreakpoints();
  }
  const component: BreakpointsModule = {
    get name() {
      return local_name;
    },
    resetCurrentBreakpoint: local_resetCurrentBreakpoint,
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
    shouldBeActive: local_shouldBeActive,
    getCurrentBreakpoint: local_getCurrentBreakpoint,
    onResize: local_onResize,
  };
  // Сохраняем текущий breakpoint чтобы не применять его повторно при init
  local_currentBreakpoint = findMatchingBreakpoint(tvist.__tvistInternal_root, options);
  return component;
}
