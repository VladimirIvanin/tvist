/* eslint-disable @typescript-eslint/no-explicit-any -- arguments follow the public event callbacks */
/**
 * Tvist - главный класс слайдера
 * Точка входа для пользователя
 */
import { createEngine, type Engine } from './Engine';
import { EventEmitter } from './EventEmitter';
import { getElement, cloneOptions } from '../utils/dom';
import { getSlidesInTvistRoot } from './tvistSlides';
import { TVIST_CLASSES } from './constants';
import type { TvistOptions, TvistDestroyOptions, AutoplayModuleAPI, VideoModuleAPI } from './types';
import type {
  Component as Module,
  ComponentFactory as ModuleConstructor,
} from '../modules/Component';
import { BUILTINS, isBuiltinEnabled } from '../modules/builtins';
import type { Tvist, TvistRootElement } from './Tvist';
import type { BreakpointsModule } from '../modules/breakpoints/BreakpointsModule';
import { throttle } from './Animator';
import { createResources } from '../utils/resources';
import { applyInitialBreakpoint } from '../utils/breakpoints';
import { findDomIndexByRealIndex } from '../utils/slideRealIndex';
/** Root-элемент слайдера с опциональной ссылкой на инстанс (для переиспользования одного root) */
/**
 * События, эмит которых при инициализации происходит до того, как снаружи можно вызвать .on().
 * Для поздней подписки воспроизводится последний emit (аргументы хранятся в replayLastArgs).
 */
const CATCH_UP_EVENTS = new Set<string>([
  'created',
  'refresh',
  'setTranslate',
  'progress',
  'navigation:mounted',
  'pagination:mounted',
  'breakpoint',
]);
const DEFAULT_OPTIONS: Partial<TvistOptions> = {
  perPage: 1,
  slidesPerGroup: 1,
  gap: 0,
  roundLengths: true,
  speed: 300,
  direction: 'horizontal',
  drag: true,
  start: 0,
  loop: false,
  rewindByDrag: false,
  enabled: true,
  preventClicks: true,
  preventClicksPropagation: true,
  visibility: true,
  browserFixes: { firefoxImageDecoding: true },
};
/**
 * Модификаторы на root, которые выставляют движок и модули.
 * При новом `Tvist` на том же элементе и при `clearSliderStyles` снимаются принудительно —
 * иначе часть классов остаётся после `destroy()` (locked, nav, disabled и т.д.).
 */
const TVIST_ROOT_RUNTIME_STATE_CLASSES: readonly string[] = [
  TVIST_CLASSES.draggable,
  TVIST_CLASSES.dragging,
  TVIST_CLASSES.singlePage,
  TVIST_CLASSES.nav,
  TVIST_CLASSES.cube,
  TVIST_CLASSES.locked,
  TVIST_CLASSES.vertical,
];
// Экспорт по умолчанию
const runtimes = new WeakMap<Tvist, TvistRuntime>();
/** Internal access for built-ins; intentionally absent from package exports. */
export function getRuntime(slider: Tvist): TvistRuntime {
  const runtime = runtimes.get(slider);
  if (!runtime) throw new Error('Tvist is not mounted');
  return runtime;
}
export interface TvistRuntime {
  readonly __tvistInternal_id: Tvist['id'];
  readonly __tvistInternal_root: Tvist['root'];
  readonly __tvistInternal_track: Tvist['track'];
  readonly __tvistInternal_container: Tvist['container'];
  readonly __tvistInternal_options: Tvist['options'];
  __tvistInternal_next: Tvist['next'];
  __tvistInternal_prev: Tvist['prev'];
  __tvistInternal_scrollTo: Tvist['scrollTo'];
  __tvistInternal_update: Tvist['update'];
  __tvistInternal_updateOptions: Tvist['updateOptions'];
  __tvistInternal_disable: Tvist['disable'];
  __tvistInternal_enable: Tvist['enable'];
  readonly __tvistInternal_isEnabled: Tvist['isEnabled'];
  __tvistInternal_destroy: Tvist['destroy'];
  readonly __tvistInternal_slides: Tvist['slides'];
  readonly __tvistInternal_originalSlideCount: Tvist['originalSlideCount'];
  readonly __tvistInternal_slideCount: Tvist['slideCount'];
  readonly __tvistInternal_activeIndex: Tvist['activeIndex'];
  readonly __tvistInternal_realIndex: Tvist['realIndex'];
  readonly __tvistInternal_canScrollNext: Tvist['canScrollNext'];
  readonly __tvistInternal_canScrollPrev: Tvist['canScrollPrev'];
  readonly __tvistInternal_autoplay: ReturnType<AutoplayModuleAPI['getAutoplay']> | undefined;
  readonly __tvistInternal_video: ReturnType<VideoModuleAPI['getVideo']>;
  __tvistInternal_on: Tvist['on'];
  __tvistInternal_off: Tvist['off'];
  __tvistInternal_emit: Tvist['emit'];
  __tvistInternal_once: Tvist['once'];
  __tvistInternal_sync: Tvist['sync'];
  __tvistInternal_engine: Engine;
  __tvistInternal__originalOptions?: TvistOptions;
  __tvistInternal__scrollDirection?: 'next' | 'prev';
  __tvistInternal__isVisible: boolean;
  __tvistInternal_allowClick: boolean;
  __tvistInternal_getModule<T extends Module>(name: string): T | undefined;
  __tvistInternal_removeModule(name: string): void;
  __tvistInternal_syncModules(destroyOnly?: boolean): void;
  __tvistInternal_checkAndResetManualEnabledChange(): boolean;
  readonly __tvistInternal_isTogglingEnabled: boolean;
  __tvistInternal_updateSlidesList(): void;
  __tvistInternal_hasPositionListeners(): boolean;
}
export function createTvistRuntime(
  slider: Tvist,
  target: string | HTMLElement,
  options: TvistOptions
): TvistRuntime {
  function local_generateId(): string {
    // Современные браузеры: используем crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `tvist-${crypto.randomUUID()}`;
    }
    // Fallback: генерируем UUID v4 вручную
    // Формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return `tvist-${uuid}`;
  }
  let local__slides: HTMLElement[];
  let local__originalSlideCountCache: number | null = null;
  let local__originalOptions: TvistOptions | undefined;
  // The initial Engine callbacks may subscribe before construction completes.
  // eslint-disable-next-line prefer-const
  let local_engine: Engine;
  const local_modules = new Map<string, Module>();
  const resources = createResources();
  let local_resizeHandler: () => void | undefined;
  let local_resizeObserver: ResizeObserver | undefined;
  let local__lastNavAt = 0;
  let local__isEnabled = true;
  let local__manualEnabledChange = false;
  let local__isTogglingEnabled = false;
  let local__isVisible = true;
  let local_allowClick = true;
  const local_replayLastArgs = new Map<string, unknown[]>();
  let local_lastLockEdge: 'lock' | 'unlock' | null = null;
  let local__isDestroyed = false;
  function local_initRoot(target: string | HTMLElement): HTMLElement {
    const root = getElement(target);
    const rootEl = root as TvistRootElement;
    if (rootEl.tvistInstance && typeof rootEl.tvistInstance.destroy === 'function') {
      rootEl.tvistInstance.destroy({ destroyNested: true });
    }
    rootEl.tvistInstance = slider;
    local_clearRootStateBeforeMount(root);
    return root;
  }
  function local_clearRootStateBeforeMount(root: HTMLElement): void {
    root.classList.remove(
      TVIST_CLASSES.destroyed,
      TVIST_CLASSES.created,
      TVIST_CLASSES.disabled,
      ...TVIST_ROOT_RUNTIME_STATE_CLASSES
    );
  }
  function local_findTrack(): HTMLElement {
    const selector = `.${TVIST_CLASSES.track}`;
    const el = local_root.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`Tvist: track "${selector}" not found inside root element`);
    }
    return el;
  }
  function local_findContainer(): HTMLElement {
    const selector = `.${TVIST_CLASSES.container}`;
    const el = local_track.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`Tvist: container "${selector}" not found inside track element`);
    }
    return el;
  }
  function local_mergeOptions(options: TvistOptions): TvistOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      browserFixes: {
        ...DEFAULT_OPTIONS.browserFixes,
        ...options.browserFixes,
      },
    };
  }
  function local_saveOriginalOptions(): void {
    if (local_options.breakpoints && Object.keys(local_options.breakpoints).length > 0) {
      const cloned = cloneOptions(local_options as Record<string, unknown>) as TvistOptions;
      if (local_options.breakpointsBase) {
        cloned.breakpointsBase = local_options.breakpointsBase;
      }
      local__originalOptions = cloned;
    }
  }
  function local_applyInitialClasses(): void {
    local_updateDirectionClass();
    if (!local__isEnabled) {
      local_root.classList.add(TVIST_CLASSES.disabled);
    }
  }
  function local_registerOptionHandlers(): void {
    if (local_options.on) {
      Object.entries(local_options.on).forEach(([event, handler]) => {
        if (handler) {
          local_events.on(event, handler);
        }
      });
    }
  }
  function local_performFirstRender(): void {
    if (local__isEnabled) {
      local_update();
    } else {
      local_clearSliderStyles();
    }
    local_root.classList.add(TVIST_CLASSES.created);
    local_emit('created', slider);
    local_setupSlideClick();
  }
  function local_setupSlideClick(): void {
    resources.__tvistInternal_listen(local_container, 'click', local_slideClickHandler);
  }
  const local_slideClickHandler = (e: MouseEvent): void => {
    // Проверяем флаг allowClick (устанавливается в false при драге)
    if (!local_allowClick) {
      if (local_options.preventClicks) {
        e.preventDefault();
      }
      if (
        local_options.preventClicksPropagation &&
        local_engine.__tvistInternal_animator.isAnimating()
      ) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      return;
    }
    const slide = (e.target as HTMLElement).closest(`.${TVIST_CLASSES.slide}`);
    if (!slide) return;
    const index = read_slides().indexOf(slide as HTMLElement);
    if (index === -1) return;
    local_emit('click', index, slide as HTMLElement, e);
  };
  function local_invokeCatchUpForNewListener(
    event: string,
    handler: (...args: any[]) => void
  ): void {
    if (local__isDestroyed) return;
    if (event === 'lock') {
      if (local_lastLockEdge === 'lock') {
        try {
          handler();
        } catch (error) {
          console.error(`Error in event handler (catch-up) for "lock":`, error);
        }
      }
      return;
    }
    if (event === 'unlock') {
      if (local_lastLockEdge === 'unlock') {
        try {
          handler();
        } catch (error) {
          console.error(`Error in event handler (catch-up) for "unlock":`, error);
        }
      }
      return;
    }
    if (!CATCH_UP_EVENTS.has(event)) return;
    const args = local_replayLastArgs.get(event);
    if (!args) return;
    try {
      handler(...args);
    } catch (error) {
      console.error(`Error in event handler (catch-up) for "${event}":`, error);
    }
  }
  function local_hasCatchUpPayload(event: string): boolean {
    if (local__isDestroyed) return false;
    if (event === 'lock') return local_lastLockEdge === 'lock';
    if (event === 'unlock') return local_lastLockEdge === 'unlock';
    return CATCH_UP_EVENTS.has(event) && local_replayLastArgs.has(event);
  }
  function local_tryInitModule(name: string, ModuleClass: ModuleConstructor): boolean {
    if (!isBuiltinEnabled(name, local_options)) return false;
    try {
      const module = ModuleClass(component, local_options);
      if (module.shouldBeActive?.() === false) return false;
      local_modules.set(name, module);
      module.init();
      return true;
    } catch (error) {
      console.error(`Tvist: Failed to initialize module "${name}":`, error);
      return false;
    }
  }
  function local_initModules(): void {
    BUILTINS.forEach((ModuleClass, name) => {
      // Breakpoints должен работать всегда, остальные — только при включённом слайдере
      if (!local__isEnabled && name !== 'breakpoints') return;
      local_tryInitModule(name, ModuleClass);
    });
  }
  function local_syncModules(destroyOnly = false): void {
    local_modules.forEach((module, name) => {
      if (name === 'breakpoints') return;
      try {
        if (module.shouldBeActive?.() === false) {
          module.destroy();
          local_modules.delete(name);
        }
      } catch (error) {
        console.error(`Tvist: Error destroying module "${name}":`, error);
      }
    });
    if (destroyOnly) return;
    BUILTINS.forEach((ModuleClass, name) => {
      if (local_modules.has(name)) return;
      local_tryInitModule(name, ModuleClass);
    });
  }
  function local_updateDirectionClass(): void {
    local_root.classList.toggle(TVIST_CLASSES.vertical, local_options.direction === 'vertical');
  }
  function local_setupResizeListener(): void {
    local_resizeHandler = throttle(
      () => {
        local_update();
        local_emit('resized');
      },
      100,
      resources
    );
    if (typeof ResizeObserver !== 'undefined') {
      // Наблюдаем за track, а не за root.
      // track имеет overflow: hidden и его размер определяется внешним layout,
      // а не содержимым — это предотвращает бесконечный цикл при display: grid
      // у родителя (когда applyFixedSize меняет слайды → меняется root → снова update).
      local_resizeObserver = new ResizeObserver(() => {
        local_resizeHandler?.();
      });
      local_resizeObserver.observe(local_track);
      resources.__tvistInternal_add(() => local_resizeObserver?.disconnect());
    } else {
      // Fallback для старых браузеров
      resources.__tvistInternal_listen(window, 'resize', local_resizeHandler);
    }
  }
  function local_next(): Tvist {
    return local_navByStep(1);
  }
  function local_prev(): Tvist {
    return local_navByStep(-1);
  }
  function local_monotonicNow(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
  function local_navByStep(sign: 1 | -1): Tvist {
    if (!local__isEnabled || !local__isVisible) return slider;
    const loop = local_options.loop;
    const isLoop = loop === true || (typeof loop === 'object' && loop.enabled !== false);
    if (isLoop && local_engine.__tvistInternal_animator.isAnimating()) {
      // Повторный шаг в том же направлении переставляет слайды раньше,
      // чем видимая позиция достигнет цели, и может увести трек за viewport.
      // Даём переходу завершиться; смена направления по-прежнему доступна.
      const movement =
        local_engine.__tvistInternal_target.get() - local_engine.__tvistInternal_location.get();
      // location может уже достигнуть target до обработки transitionEnd/таймера.
      // В этот момент тоже нельзя отменять ещё активный переход.
      if (movement * sign <= 0) return slider;
    }
    const throttleMs = local_options.navThrottleMs ?? 0;
    if (throttleMs > 0) {
      const now = local_monotonicNow();
      if (now - local__lastNavAt < throttleMs) return slider;
    }
    const canGo =
      sign > 0
        ? local_engine.__tvistInternal_canScrollNext()
        : local_engine.__tvistInternal_canScrollPrev();
    if (!canGo) return slider;
    const step = local_options.slidesPerGroup ?? 1;
    local_engine.__tvistInternal_scrollBy(step * sign);
    if (throttleMs > 0) {
      local__lastNavAt = local_monotonicNow();
    }
    return slider;
  }
  function local_scrollTo(index: number, instant = false): Tvist {
    if (!local__isEnabled || !local__isVisible) return slider;
    let targetIndex = index;
    const loopOpt = local_options.loop;
    const isLoop = loopOpt === true || (typeof loopOpt === 'object' && loopOpt.enabled !== false);
    if (isLoop) {
      const withClones = typeof loopOpt === 'object' && loopOpt.withClones === true;
      const domIndex = findDomIndexByRealIndex(read_slides(), index, {
        preferNonClone: withClones,
      });
      if (domIndex !== -1) {
        targetIndex = domIndex;
      }
    }
    local_engine.__tvistInternal_scrollTo(targetIndex, instant);
    return slider;
  }
  function local_update(): Tvist {
    // Не обновляем, если слайдер отключен
    if (local__isDestroyed || !local__isEnabled) return slider;
    // Вызываем onResize на модулях ДО engine.update (для breakpoints)
    local_modules.forEach((module) => {
      module.onResize?.();
    });
    local_updateDirectionClass();
    local_engine.__tvistInternal_update();
    // Вызываем onUpdate на модулях
    local_modules.forEach((module) => {
      module.onUpdate?.();
    });
    local_emit('refresh');
    return slider;
  }
  function local_updateOptions(newOptions: Partial<TvistOptions>): Tvist {
    const needsRecalculation =
      newOptions.perPage !== undefined ||
      newOptions.slideMinSize !== undefined ||
      newOptions.fixedWidth !== undefined ||
      newOptions.fixedHeight !== undefined ||
      newOptions.gap !== undefined ||
      newOptions.peek !== undefined ||
      newOptions.peekTrim !== undefined ||
      newOptions.direction !== undefined ||
      newOptions.center !== undefined ||
      newOptions.breakpoints !== undefined ||
      newOptions.breakpointsBase !== undefined;
    if (
      needsRecalculation ||
      newOptions.roundLengths !== undefined ||
      (newOptions.effect !== undefined && newOptions.effect !== local_options.effect)
    ) {
      local_engine.__tvistInternal_animator.stop();
    }
    const oldOptions = { ...local_options };
    // Обработка изменения breakpoints
    if (newOptions.breakpoints !== undefined || newOptions.breakpointsBase !== undefined) {
      local_applyBreakpointsOptionsUpdate(newOptions);
    } else {
      local_applySimpleOptionsUpdate(newOptions);
    }
    // Обработка изменения direction
    if (newOptions.direction !== undefined && newOptions.direction !== oldOptions.direction) {
      local_updateDirectionClass();
    }
    // Обработка изменения on (обработчики событий)
    if (newOptions.on) {
      local_updateEventHandlers(oldOptions.on, newOptions.on);
    }
    // Обработка изменения peek
    if (newOptions.peek !== undefined || newOptions.peekTrim !== undefined) {
      if (local__isEnabled) {
        local_engine.__tvistInternal_applyPeek();
      }
    }
    // Пересчитываем размеры и позиции при изменении ключевых опций
    const needsTransformReapply = newOptions.roundLengths !== undefined;
    if (needsRecalculation && local__isEnabled) {
      local_update();
    } else if (needsRecalculation && !local__isEnabled) {
      // Если слайдер выключен — очищаем стили и обновляем внутренний state Engine без DOM
      local_clearSliderStyles();
      local_engine.__tvistInternal_updateDisabled();
    } else if (needsTransformReapply && local__isEnabled) {
      local_engine.__tvistInternal_applyTransform();
    }
    // Уведомляем модули об изменении опций
    local_modules.forEach((module) => {
      module.onOptionsUpdate?.(newOptions);
    });
    // Синхронизируем модули с новыми опциями
    // Если слайдер выключен, передаём destroyOnly=true, чтобы новые модули не инициализировались
    local_syncModules(!local__isEnabled);
    local_emit('optionsUpdated', slider, newOptions);
    return slider;
  }
  function local_applyBreakpointsOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если есть _originalOptions, восстанавливаем базовые опции (без breakpoints)
    if (local__originalOptions) {
      const baseOptions = cloneOptions(
        local__originalOptions as Record<string, unknown>
      ) as TvistOptions;
      delete baseOptions.breakpoints;
      delete baseOptions.on;
      Object.keys(local_options).forEach((key) => {
        if (key !== 'breakpoints' && key !== 'on') {
          delete (local_options as Record<string, unknown>)[key];
        }
      });
      Object.assign(local_options, baseOptions);
    }
    Object.assign(local_options, newOptions);
    // Обновляем _originalOptions
    const cloned = cloneOptions(local_options as Record<string, unknown>) as TvistOptions;
    if (local_options.breakpointsBase) {
      cloned.breakpointsBase = local_options.breakpointsBase;
    }
    local__originalOptions = cloned;
    // Сбрасываем текущий breakpoint в BreakpointsModule чтобы он пересчитался
    const breakpointsModule = local_modules.get('breakpoints');
    if (breakpointsModule) {
      (breakpointsModule as BreakpointsModule).resetCurrentBreakpoint();
    }
  }
  function local_applySimpleOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.browserFixes) {
      local_options.browserFixes = {
        ...local_options.browserFixes,
        ...newOptions.browserFixes,
      };
      // Удаляем из newOptions чтобы не перезаписать при Object.assign
      const { browserFixes: _unused, ...restOptions } = newOptions;
      Object.assign(local_options, restOptions);
    } else {
      Object.assign(local_options, newOptions);
    }
  }
  function local_updateEventHandlers(
    oldOn?: Record<string, ((...args: any[]) => void) | undefined>,
    newOn?: Record<string, ((...args: any[]) => void) | undefined>
  ): void {
    if (oldOn) {
      Object.entries(oldOn).forEach(([event, handler]) => {
        if (handler) local_events.off(event, handler);
      });
    }
    if (newOn) {
      Object.entries(newOn).forEach(([event, handler]) => {
        if (handler) local_events.on(event, handler);
      });
    }
  }
  function local_clearSliderStyles(): void {
    local_container.style.transform = '';
    local_track.style.paddingTop = '';
    local_track.style.paddingBottom = '';
    local_track.style.paddingLeft = '';
    local_track.style.paddingRight = '';
    // Убираем все классы состояния с root, которые вешают движок и модули
    local_root.classList.remove(...TVIST_ROOT_RUNTIME_STATE_CLASSES);
    read_slides().forEach((slide) => {
      slide.style.width = '';
      slide.style.height = '';
      slide.style.marginRight = '';
      slide.style.marginBottom = '';
      slide.classList.remove(
        TVIST_CLASSES.slideActive,
        TVIST_CLASSES.slidePrev,
        TVIST_CLASSES.slideNext,
        TVIST_CLASSES.slideVisible,
        TVIST_CLASSES.slideNavActive
      );
    });
  }
  function local_disable(): Tvist {
    if (!local__isEnabled) return slider;
    local_engine.__tvistInternal_animator.stop();
    local__isEnabled = false;
    local__manualEnabledChange = true; // Отмечаем ручное изменение
    local__isTogglingEnabled = true; // Предотвращаем применение брейкпоинтов
    local_root.classList.add(TVIST_CLASSES.disabled);
    // Очищаем стили
    local_clearSliderStyles();
    // Отключаем модули (кроме breakpoints - он должен работать всегда)
    const modulesToDestroy: string[] = [];
    local_modules.forEach((_module, name) => {
      if (name === 'breakpoints') return; // Не трогаем breakpoints
      modulesToDestroy.push(name);
    });
    modulesToDestroy.forEach((name) => {
      try {
        local_modules.get(name)?.destroy();
        local_modules.delete(name);
      } catch (error) {
        console.error(`Tvist: Error disabling module "${name}":`, error);
      }
    });
    local__isTogglingEnabled = false; // Разрешаем применение брейкпоинтов
    local_emit('disabled', slider);
    return slider;
  }
  function local_enable(): Tvist {
    if (local__isEnabled) return slider;
    local__isEnabled = true;
    local__manualEnabledChange = true; // Отмечаем ручное изменение
    local__isTogglingEnabled = true; // Предотвращаем применение брейкпоинтов
    local_root.classList.remove(TVIST_CLASSES.disabled);
    BUILTINS.forEach((ModuleClass, name) => {
      if (name === 'breakpoints' || local_modules.has(name)) return;
      local_tryInitModule(name, ModuleClass);
    });
    // Пересчитываем размеры и позиции
    local_update();
    local__isTogglingEnabled = false; // Разрешаем применение брейкпоинтов
    local_emit('enabled', slider);
    return slider;
  }
  function read_isEnabled(): boolean {
    return local__isEnabled;
  }
  function local_checkAndResetManualEnabledChange(): boolean {
    const hasChanged = local__manualEnabledChange;
    local__manualEnabledChange = false;
    return hasChanged;
  }
  function read_isTogglingEnabled(): boolean {
    return local__isTogglingEnabled;
  }
  function local_nestedTvistRootsDeepestFirst(): TvistRootElement[] {
    const roots = local_root.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.block}`);
    return [...roots].reverse() as TvistRootElement[];
  }
  function local_destroyNestedTvists(): void {
    const cascade: TvistDestroyOptions = { destroyNested: true };
    for (const el of local_nestedTvistRootsDeepestFirst()) {
      const nested = el.tvistInstance;
      if (nested == null || nested === slider) continue;
      try {
        nested.destroy(cascade);
      } catch (error) {
        console.error('Tvist: Error destroying nested instance:', error);
      }
    }
  }
  function local_destroy(options?: TvistDestroyOptions): Tvist {
    if (local__isDestroyed) return slider;
    if (options?.destroyNested) {
      local_destroyNestedTvists();
    }
    local__isDestroyed = true;
    local_emit('beforeDestroy', slider);
    local_root.classList.add(TVIST_CLASSES.destroyed);
    resources.__tvistInternal_clear();
    local_emit('destroyed', slider);
    // Уничтожаем модули
    local_modules.forEach((module) => {
      try {
        module.destroy();
      } catch (error) {
        console.error(`Tvist: Error destroying module:`, error);
      }
    });
    local_modules.clear();
    // Останавливаем анимации
    local_engine.__tvistInternal_destroy();
    local_replayLastArgs.clear();
    local_lastLockEdge = null;
    // Очищаем события
    local_events.clear();
    // Сбрасываем ссылку на инстанс в root (только если это ещё наш инстанс)
    const rootEl = local_root as TvistRootElement;
    if (rootEl.tvistInstance === slider) {
      rootEl.tvistInstance = null;
    }
    return slider;
  }
  function local_getModule<T extends Module>(name: string): T | undefined {
    return local_modules.get(name) as T | undefined;
  }
  function local_removeModule(name: string): void {
    local_modules.get(name)?.destroy();
    local_modules.delete(name);
  }
  function read_slides(): HTMLElement[] {
    return local__slides;
  }
  function local_updateSlidesList(): void {
    local__slides = getSlidesInTvistRoot(local_container, local_root);
    local__originalSlideCountCache = null;
  }
  function local_updateSlideIndices(): void {
    local__slides.forEach((el, index) => {
      el.setAttribute('data-tvist-slide-index', String(index));
    });
  }
  function read_originalSlideCount(): number {
    local__originalSlideCountCache ??= local__slides.filter(
      (el) => !el.classList.contains(TVIST_CLASSES.slideClone)
    ).length;
    return local__originalSlideCountCache;
  }
  function read_slideCount(): number {
    return local__slides.length;
  }
  function read_activeIndex(): number {
    return local_engine.__tvistInternal_activeIndex;
  }
  function read_realIndex(): number {
    const activeIndex = read_activeIndex();
    if (activeIndex < 0 || activeIndex >= read_slides().length) return 0;
    const activeSlide = read_slides()[activeIndex];
    if (!activeSlide) return 0;
    const realIndexAttr = activeSlide.getAttribute('data-tvist-slide-index');
    if (realIndexAttr !== null && realIndexAttr !== '') {
      const parsed = parseInt(realIndexAttr, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return activeIndex;
  }
  function read_canScrollNext(): boolean {
    return local_engine.__tvistInternal_canScrollNext();
  }
  function read_canScrollPrev(): boolean {
    return local_engine.__tvistInternal_canScrollPrev();
  }
  function read_autoplay() {
    const module = local_modules.get('autoplay') as AutoplayModuleAPI | undefined;
    if (module && typeof module.getAutoplay === 'function') {
      return module.getAutoplay();
    }
    return undefined;
  }
  function read_video() {
    const module = local_modules.get('video') as VideoModuleAPI | undefined;
    if (module && typeof module.getVideo === 'function') {
      return module.getVideo();
    }
    return undefined;
  }
  function local_on(event: string, handler: (...args: any[]) => void): Tvist {
    if (local__isDestroyed) return slider;
    local_invokeCatchUpForNewListener(event, handler);
    local_events.on(event, handler);
    if (event === 'scroll' || event === 'setTranslate' || event === 'progress') {
      local_engine?.__tvistInternal_ensureTransitionUpdates();
    }
    return slider;
  }
  function local_hasPositionListeners(): boolean {
    return local_events.hasPositionListeners();
  }
  function local_off(event: string, handler?: (...args: any[]) => void): Tvist {
    local_events.off(event, handler);
    return slider;
  }
  function local_emit(event: string, ...args: any[]): Tvist {
    if (args[0] === component) args[0] = slider;
    if (event === 'lock') {
      local_lastLockEdge = 'lock';
    } else if (event === 'unlock') {
      local_lastLockEdge = 'unlock';
    }
    if (CATCH_UP_EVENTS.has(event)) {
      local_replayLastArgs.set(event, args);
    }
    local_events.emit(event, ...args);
    return slider;
  }
  function local_once(event: string, handler: (...args: any[]) => void): Tvist {
    if (local__isDestroyed) return slider;
    if (local_hasCatchUpPayload(event)) {
      local_invokeCatchUpForNewListener(event, handler);
      return slider;
    }
    local_events.once(event, handler);
    if (event === 'scroll' || event === 'setTranslate' || event === 'progress') {
      local_engine?.__tvistInternal_ensureTransitionUpdates();
    }
    return slider;
  }
  function local_sync(target: Tvist): Tvist {
    // Всегда вызываем scrollTo: индекс может совпадать, а translate — нет
    // (autoHeight/autoWidth, resize, внешний сброс). Движок сам пропустит анимацию,
    // если позиция уже совпадает с целью (|Δ| ≤ 0.5px).
    local_on(
      'slideChangeStart',
      (
        index: number,
        data?: {
          isDrag?: boolean;
        }
      ) => {
        if (local_options.syncOnDrag === false && data?.isDrag) return;
        target.scrollTo(index);
      }
    );
    target.on(
      'slideChangeStart',
      (
        index: number,
        data?: {
          isDrag?: boolean;
        }
      ) => {
        if (target.options.syncOnDrag === false && data?.isDrag) return;
        local_scrollTo(index);
      }
    );
    return slider;
  }
  let local__scrollDirection: 'next' | 'prev' | undefined;
  const component: TvistRuntime = {
    get __tvistInternal_id() {
      return local_id;
    },
    get __tvistInternal_root() {
      return local_root;
    },
    get __tvistInternal_track() {
      return local_track;
    },
    get __tvistInternal_container() {
      return local_container;
    },
    get __tvistInternal_options() {
      return local_options;
    },
    get __tvistInternal__originalOptions() {
      return local__originalOptions;
    },
    set __tvistInternal__originalOptions(value) {
      local__originalOptions = value;
    },
    get __tvistInternal_engine() {
      return local_engine;
    },
    get __tvistInternal__isVisible() {
      return local__isVisible;
    },
    set __tvistInternal__isVisible(value) {
      local__isVisible = value;
    },
    get __tvistInternal_allowClick() {
      return local_allowClick;
    },
    set __tvistInternal_allowClick(value) {
      local_allowClick = value;
    },
    __tvistInternal_syncModules: local_syncModules,
    __tvistInternal_next: local_next,
    __tvistInternal_prev: local_prev,
    __tvistInternal_scrollTo: local_scrollTo,
    __tvistInternal_update: local_update,
    __tvistInternal_updateOptions: local_updateOptions,
    __tvistInternal_disable: local_disable,
    __tvistInternal_enable: local_enable,
    get __tvistInternal_isEnabled() {
      return read_isEnabled();
    },
    __tvistInternal_checkAndResetManualEnabledChange: local_checkAndResetManualEnabledChange,
    get __tvistInternal_isTogglingEnabled() {
      return read_isTogglingEnabled();
    },
    __tvistInternal_destroy: local_destroy,
    __tvistInternal_getModule: local_getModule,
    __tvistInternal_removeModule: local_removeModule,
    get __tvistInternal_slides() {
      return read_slides();
    },
    __tvistInternal_updateSlidesList: local_updateSlidesList,
    get __tvistInternal_originalSlideCount() {
      return read_originalSlideCount();
    },
    get __tvistInternal_slideCount() {
      return read_slideCount();
    },
    get __tvistInternal_activeIndex() {
      return read_activeIndex();
    },
    get __tvistInternal_realIndex() {
      return read_realIndex();
    },
    get __tvistInternal_canScrollNext() {
      return read_canScrollNext();
    },
    get __tvistInternal_canScrollPrev() {
      return read_canScrollPrev();
    },
    get __tvistInternal_autoplay() {
      return read_autoplay();
    },
    get __tvistInternal_video() {
      return read_video();
    },
    __tvistInternal_on: local_on,
    __tvistInternal_hasPositionListeners: local_hasPositionListeners,
    __tvistInternal_off: local_off,
    __tvistInternal_emit: local_emit,
    __tvistInternal_once: local_once,
    __tvistInternal_sync: local_sync,
    get __tvistInternal__scrollDirection() {
      return local__scrollDirection;
    },
    set __tvistInternal__scrollDirection(value) {
      local__scrollDirection = value;
    },
  };
  runtimes.set(slider, component);
  const local_id = local_generateId();
  const local_root = local_initRoot(target);
  const local_track = local_findTrack();
  const local_container = local_findContainer();
  local__slides = getSlidesInTvistRoot(local_container, local_root);
  if (read_slides().length === 0) {
    console.warn('Tvist: no slides found');
  }
  const local_options = local_mergeOptions(options);
  // Сохраняем оригинальные опции ДО применения breakpoints — нужно для BreakpointsModule
  local_saveOriginalOptions();
  // Применяем breakpoints ДО создания Engine (если есть)
  applyInitialBreakpoint(local_root, local_options);
  // Индексы слайдов для стилизации и идентификации (в т.ч. для loop)
  local_updateSlideIndices();
  local__isEnabled = local_options.enabled !== false;
  const local_events = new EventEmitter();
  local_applyInitialClasses();
  local_registerOptionHandlers();
  local_engine = createEngine(component, local_options);
  // Инициализируем встроенные компоненты в фиксированном порядке
  local_initModules();
  local_setupResizeListener();
  local_performFirstRender();
  return component;
}
