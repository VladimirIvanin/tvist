import pkg from '../../package.json' with { type: 'json' };
import { TVIST_CLASSES } from './constants';
import { createTvistRuntime, getRuntime } from './runtime';
import type {
  TvistOptions,
  TvistDestroyOptions,
  AutoplayControls,
  VideoControls,
  MarqueeControls,
  LazyloadControls,
  VisibilityControls,
} from './types';

/** A root can hold a mounted slider. */
export interface TvistRootElement extends HTMLElement {
  tvistInstance?: Tvist | null;
}

/** Public slider facade. Built-in components and geometry remain private. */
export class Tvist {
  /** Library version. */
  static readonly VERSION = pkg.version ?? '0.0.0';
  /** BEM class names. */
  static readonly CLASSES = TVIST_CLASSES;
  /** @deprecated Use Tvist.CLASSES.block. */
  static readonly CSS_PREFIX = TVIST_CLASSES.block;
  /** Mount a complete slider on an element or selector. */
  constructor(target: string | HTMLElement, options: TvistOptions = {}) {
    createTvistRuntime(this, target, options);
  }
  /** Уникальный идентификатор экземпляра. */
  get id(): string {
    return getRuntime(this).id;
  }
  /** Корневой элемент слайдера. */
  get root(): HTMLElement {
    return getRuntime(this).root;
  }
  /** Элемент viewport, обрезающий видимую область. */
  get track(): HTMLElement {
    return getRuntime(this).track;
  }
  /** Контейнер слайдов, к которому применяется transform. */
  get container(): HTMLElement {
    return getRuntime(this).container;
  }
  /** Текущая конфигурация. Для изменения используйте updateOptions(). */
  get options(): TvistOptions {
    return getRuntime(this).options;
  }
  // ==================== ПУБЛИЧНОЕ API ====================
  /**
   * Следующий слайд (или страница при perPage > 1)
   */
  next(): this {
    getRuntime(this).next();
    return this;
  }
  /**
   * Предыдущий слайд (или страница при perPage > 1)
   */
  prev(): this {
    getRuntime(this).prev();
    return this;
  }
  /**
   * Переход к слайду по индексу
   * @param index - логический индекс слайда (realIndex)
   * @param instant - мгновенный переход без анимации
   */
  scrollTo(index: number, instant = false): this {
    getRuntime(this).scrollTo(index, instant);
    return this;
  }
  /**
   * Обновить размеры и пересчитать позиции
   */
  update(): this {
    getRuntime(this).update();
    return this;
  }
  /**
   * Обновить опции слайдера динамически (без пересоздания)
   * @param newOptions - новые опции для применения
   */
  updateOptions(newOptions: Partial<TvistOptions>): this {
    getRuntime(this).updateOptions(newOptions);
    return this;
  }
  /**
   * Отключить слайдер (превратить в статичный контент)
   * Убирает transform, отключает модули, но сохраняет экземпляр
   */
  disable(): this {
    getRuntime(this).disable();
    return this;
  }
  /**
   * Включить слайдер (восстановить функциональность)
   */
  enable(): this {
    getRuntime(this).enable();
    return this;
  }
  /**
   * Проверить, включен ли слайдер
   */
  get isEnabled(): boolean {
    return getRuntime(this).isEnabled;
  }
  /**
   * Уничтожить экземпляр и очистить ресурсы.
   * Вложенные Tvist по умолчанию **не** уничтожаются — задайте `{ destroyNested: true }`, если нужно снести всё поддерево.
   * Повторный вызов безопасен (no-op).
   */
  destroy(options?: TvistDestroyOptions): this {
    getRuntime(this).destroy(options);
    return this;
  }
  /**
   * Получить список слайдов
   */
  get slides(): HTMLElement[] {
    return getRuntime(this).slides;
  }
  /**
   * Количество оригинальных слайдов (без клонов).
   * В режиме loop.withClones не учитывает клонированные слайды по краям.
   */
  get originalSlideCount(): number {
    return getRuntime(this).originalSlideCount;
  }
  /**
   * Общее количество слайдов в DOM (включая клоны).
   * В режиме loop.withClones включает клонированные слайды по краям.
   * Совпадает с originalSlideCount если loop.withClones не используется.
   */
  get slideCount(): number {
    return getRuntime(this).slideCount;
  }
  /**
   * Получить текущий индекс активного слайда
   */
  get activeIndex(): number {
    return getRuntime(this).activeIndex;
  }
  /**
   * Получить текущий логический индекс слайда (с учётом loop)
   */
  get realIndex(): number {
    return getRuntime(this).realIndex;
  }
  /**
   * Проверить, можно ли листать вперёд
   */
  get canScrollNext(): boolean {
    return getRuntime(this).canScrollNext;
  }
  /**
   * Проверить, можно ли листать назад
   */
  get canScrollPrev(): boolean {
    return getRuntime(this).canScrollPrev;
  }
  /**
   * Получить публичное API autoplay модуля
   */
  get autoplay(): AutoplayControls | undefined {
    return getRuntime(this).autoplay;
  }
  /**
   * Получить публичное API video модуля
   */
  get video(): VideoControls | undefined {
    return getRuntime(this).video;
  }
  // ==================== СОБЫТИЯ ====================
  /**
   * Подписаться на событие
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  on(event: string, handler: (...args: any[]) => void): this {
    getRuntime(this).on(event, handler);
    return this;
  }
  /**
   * Отписаться от события
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  off(event: string, handler?: (...args: any[]) => void): this {
    getRuntime(this).off(event, handler);
    return this;
  }
  /**
   * Вызвать событие
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event args are untyped */
  emit(event: string, ...args: any[]): this {
    getRuntime(this).emit(event, ...args);
    return this;
  }
  /**
   * Подписаться на событие один раз
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  once(event: string, handler: (...args: any[]) => void): this {
    getRuntime(this).once(event, handler);
    return this;
  }
  /**
   * Синхронизация с другим экземпляром Tvist
   * @param target - целевой экземпляр для синхронизации
   */
  sync(target: Tvist): this {
    getRuntime(this).sync(target);
    return this;
  }
  /** Continuous motion controls, when enabled. */
  get marquee(): MarqueeControls | undefined {
    return getRuntime(this)
      .__tvistInternal_getModule<
        import('../modules/marquee/MarqueeModule').MarqueeModule
      >('marquee')
      ?.getMarquee();
  }
  /** Explicit lazy image loading, when enabled. */
  get lazyload(): LazyloadControls | undefined {
    const module =
      getRuntime(this).__tvistInternal_getModule<
        import('../modules/lazyload/LazyLoadModule').LazyLoadModule
      >('lazyload');
    return module
      ? { loadAll: () => module.loadAll(), loadSlide: (index: number) => module.loadSlide(index) }
      : undefined;
  }
  /** Visibility controls, when enabled. */
  get visibility(): VisibilityControls | undefined {
    return getRuntime(this)
      .__tvistInternal_getModule<
        import('../modules/visibility/VisibilityModule').VisibilityModule
      >('visibility')
      ?.getVisibility();
  }
  /** Matching breakpoint, or null when no breakpoint applies. */
  get currentBreakpoint(): number | null {
    return (
      getRuntime(this)
        .__tvistInternal_getModule<
          import('../modules/breakpoints/BreakpointsModule').BreakpointsModule
        >('breakpoints')
        ?.getCurrentBreakpoint() ?? null
    );
  }
}

export default Tvist;
