import { createLayout } from './engine/Layout';
import { createMotion } from './engine/Motion';
/**
 * Engine - ядро расчётов позиций, размеров, прокрутки
 */
import { Vector1D } from './Vector1D';
import { Counter } from './Counter';
import { Animator } from './Animator';
import { TVIST_CLASSES } from './constants';
import type { TvistRuntime as Tvist } from './runtime';
import type { TvistOptions } from './types';
import { gapCssForMargin } from '../utils/gridGap';
/** Internal component; state lives in this factory's closure. */
export interface Engine {
  readonly __tvistInternal_location: Vector1D;
  readonly __tvistInternal_target: Vector1D;
  readonly __tvistInternal_index: Counter;
  readonly __tvistInternal_animator: Animator;
  /**
   * Возвращает размер слайда по индексу (ширина или высота в зависимости от direction).
   * При autoWidth/autoHeight — измеренный размер из DOM, иначе — общий slideSize.
   */
  __tvistInternal_getSlideSize(index: number): number;

  __tvistInternal_isCenterActive(): boolean;

  __tvistInternal_isCenterFocus(): boolean;
  /** Режим центрирования активного слайда (strict active или focus с trim у краёв). */
  __tvistInternal_isCenterMode(): boolean;

  __tvistInternal_isCenterJustify(): boolean;
  /**
   * Вычисляет offset для центрирования
   */
  __tvistInternal_getCenterOffset(index: number): number;
  /**
   * Ограничивает позицию скролла для center.focus (trim у краёв, как Splide trimSpace).
   */
  __tvistInternal_clampCenterPosition(position: number): number;
  /**
   * Позиция скролла для индекса. При loop peekTrim не применяется.
   */
  __tvistInternal_getScrollPositionForIndex(index: number): number;
  /**
   * Публичный геттер gap в пикселях (вычисленный через computed style браузера).
   * Используется модулями (DragModule, GridModule) для расчётов.
   */
  readonly __tvistInternal_gapPxValue: number;
  /**
   * Применяет peek к контейнеру слайдов
   */
  __tvistInternal_applyPeek(): void;
  /**
   * Установить позиции слайдов вручную (используется в GridModule)
   */
  __tvistInternal_setSlidePositions(positions: number[]): void;
  /**
   * Установить размер слайда вручную (используется в GridModule)
   */
  __tvistInternal_setSlideSize(size: number): void;
  /**
   * Минимальная позиция скролла (при trim — первый слайд прижат к левому краю, левый peek не показывается).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  __tvistInternal_getMinScrollPosition(): number;
  /**
   * Максимальная позиция скролла (отрицательная).
   * При этой позиции правый край последнего слайда совпадает с правым краем root — правый peek не показывается (trim).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  __tvistInternal_getMaxScrollPosition(): number;
  /**
   * Получить позицию слайда по индексу
   */
  __tvistInternal_getSlidePosition(index: number): number;
  /**
   * Получить все позиции слайдов (публичный метод для тестов)
   */
  __tvistInternal_getSlidePositions(): number[];
  /**
   * Переход к слайду
   * @param index - индекс целевого слайда
   * @param instant - мгновенный переход без анимации
   * @param afterDragSnap - snap после отпускания при drag (длительность = speed, easing easeOutCubic)
   */
  __tvistInternal_scrollTo(index: number, instant?: boolean, afterDragSnap?: boolean): void;
  /** Запускает чтение позиции только пока промежуточные значения кому-то нужны. */
  __tvistInternal_ensureTransitionUpdates(): void;

  __tvistInternal_scrollBy(delta: number, afterDragSnap?: boolean): void;
  /**
   * Применяет transform к контейнеру.
   * Мемоизирует последнюю применённую позицию: если округлённое значение не
   * изменилось, пропускает запись style.transform и все события (scroll/setTranslate/progress).
   * Это убирает лишние DOM-записи и обработчики на кадрах без визуального сдвига.
   */
  __tvistInternal_applyTransform(): void;
  /** Пересчёт без применения стилей (слайдер disabled) */
  __tvistInternal_updateDisabled(): void;
  /** Пересчёт размеров и позиций (resize) */
  __tvistInternal_update(): void;
  /** Пересчитать позиции после перестановки тех же DOM-слайдов без повторного измерения. */
  __tvistInternal_updateAfterReorder(previousSlides: readonly HTMLElement[]): void;
  /**
   * Проверка на необходимость блокировки слайдера.
   * Блокировка включается, если весь контент помещается в контейнер и некуда листать.
   */
  __tvistInternal_checkLock(isDisabled?: boolean): void;
  /**
   * Получить общий размер всего контента (публичный метод для модулей)
   */
  __tvistInternal_getTotalSize(): number;
  /**
   * Получить состояние блокировки
   */
  readonly __tvistInternal_isLocked: boolean;
  /**
   * Получить размер слайда (ширина или высота).
   * При autoWidth/autoHeight возвращает размер первого слайда для совместимости с модулями.
   */
  readonly __tvistInternal_slideSizeValue: number;
  /**
   * Получить размер контейнера (ширина или высота)
   */
  readonly __tvistInternal_containerSizeValue: number;
  /**
   * Получить значения peek (start, end)
   */
  __tvistInternal_getPeek(): { start: number; end: number };
  /**
   * Вычисляет видимость каждого слайда математически (без DOM-запросов).
   * Использует закэшированные slidePositions, slideSizes и текущий location.
   * Для эффекта cube маска граней задаётся в SlideStatesModule через `getCubeSlidesInRange`.
   *
   * @returns массив булевых значений видимости для каждого слайда
   */
  __tvistInternal_getVisibleSlides(): boolean[];
  /**
   * Получить текущий индекс
   */
  readonly __tvistInternal_activeIndex: number;
  /**
   * Получить количество слайдов
   */
  readonly __tvistInternal_slideCount: number;
  /**
   * Проверить, можно ли листать вперёд
   */
  __tvistInternal_canScrollNext(): boolean;
  /**
   * Проверить, можно ли листать назад
   */
  __tvistInternal_canScrollPrev(): boolean;
  /**
   * Очистка
   */
  __tvistInternal_destroy(): void;
}

export function createEngine(tvist: Tvist, options: TvistOptions): Engine {
  let local__isLocked = false;

  /**
   * Синхронизирует location и target с позицией текущего индекса
   * @param applyDOM - применить transform к DOM (false для disabled-режима)
   */
  function local_syncPositionToIndex(applyDOM = true): void {
    const currentIndex = local_index.get();
    const targetPosition = layout.__tvistInternal_getScrollPositionForIndex(currentIndex);
    local_target.set(targetPosition);
    local_location.set(targetPosition);
    if (applyDOM) motion.__tvistInternal_applyTransform();
  }
  /** Пересчёт без применения стилей (слайдер disabled) */
  function local_updateDisabled(): void {
    layout.__tvistInternal_invalidateRootSizeCache();
    layout.__tvistInternal_slideSizesCacheValid = false;
    layout.__tvistInternal_calculateSizes(true);
    layout.__tvistInternal_calculatePositions();
    layout.__tvistInternal_updateCounterLimits();
    local_checkLock(true);
    local_syncPositionToIndex(false);
  }
  /** Пересчёт размеров и позиций (resize) */
  function local_update(): void {
    local_animator.stop();
    layout.__tvistInternal_invalidateRootSizeCache();
    layout.__tvistInternal_slideSizesCacheValid = false;
    // После пересчёта layout позиция контейнера должна быть применена заново,
    // даже если округлённое значение совпадает с кешированным.
    motion.__tvistInternal__lastAppliedTransformPos = null;
    layout.__tvistInternal_resolveGap();
    layout.__tvistInternal_resolveFixedDimensionsEarly();
    layout.__tvistInternal_applyPeek();
    layout.__tvistInternal_calculateSizes();
    layout.__tvistInternal_calculatePositions();
    layout.__tvistInternal_updateCounterLimits();
    local_checkLock();
    local_syncPositionToIndex();
  }
  /** Пересчитать позиции после перестановки тех же DOM-слайдов без повторного измерения. */
  function local_updateAfterReorder(previousSlides: readonly HTMLElement[]): void {
    if (layout.__tvistInternal_isAutoSize()) {
      const sizes = new Map(
        previousSlides.map((slide, index) => [slide, layout.__tvistInternal_slideSizes[index] ?? 0])
      );
      const gap = gapCssForMargin(local_options.gap);
      const vertical = local_options.direction === 'vertical';
      layout.__tvistInternal_slideSizes = local_tvist.slides.map((slide, index) => {
        slide.style[vertical ? 'marginBottom' : 'marginRight'] =
          index === local_tvist.slides.length - 1 ? '' : gap;
        return sizes.get(slide) ?? 0;
      });
    }
    layout.__tvistInternal_calculatePositions();
    layout.__tvistInternal_updateCounterLimits();
    local_checkLock();
  }
  /**
   * Проверка на необходимость блокировки слайдера.
   * Блокировка включается, если весь контент помещается в контейнер и некуда листать.
   */
  function local_checkLock(isDisabled = false): void {
    const slideCount = local_tvist.slides.length;
    const perPage = local_options.perPage ?? 1;
    const hasSizes =
      layout.__tvistInternal_slideSize > 0 ||
      layout.__tvistInternal_slideSizes.length === slideCount;
    // Если размеры ещё не рассчитаны, блокируем просто по количеству слайдов
    if (!hasSizes) {
      local_setLocked(slideCount <= perPage, isDisabled);
      return;
    }
    const contentFits = local_getContentSize() <= layout.__tvistInternal_containerSize + 1;
    if (layout.__tvistInternal_isLoopEnabled()) {
      const loopOpts = local_options.loop;
      const withClonesAndFill =
        typeof loopOpts === 'object' && loopOpts !== null && loopOpts.withClones === true;
      if (!withClonesAndFill && contentFits) {
        local_setLocked(true, isDisabled);
        return;
      }
      local_setLocked(false, isDisabled);
      return;
    }
    const cannotScroll =
      layout.__tvistInternal_getMaxScrollPosition() >=
      layout.__tvistInternal_getMinScrollPosition() - 1;
    if (slideCount > perPage) {
      local_setLocked(cannotScroll, isDisabled);
    } else {
      local_setLocked(contentFits && cannotScroll, isDisabled);
    }
  }
  /**
   * Получить общий размер всего контента (публичный метод для модулей)
   */
  function local_getTotalSize(): number {
    return local_getContentSize();
  }

  function local_getContentSize(): number {
    const slides = local_tvist.slides;
    if (slides.length === 0) return 0;
    let minPos = Infinity;
    let maxPos = -Infinity;
    for (let i = 0; i < slides.length; i++) {
      const pos = layout.__tvistInternal_getSlidePosition(i);
      const size = layout.__tvistInternal_getSlideSize(i);
      if (pos < minPos) minPos = pos;
      if (pos + size > maxPos) maxPos = pos + size;
    }
    if (minPos === Infinity) return 0;
    return maxPos - minPos;
  }

  function local_setLocked(isLocked: boolean, isDisabled = false): void {
    // В disabled-режиме не меняем стейт: при enable() checkLock() должен
    // применить классы заново, что произойдёт только если _isLocked изменится.
    if (isDisabled) return;
    if (local__isLocked !== isLocked) {
      local__isLocked = isLocked;
      local_tvist.root.classList.toggle(TVIST_CLASSES.locked, isLocked);
      if (isLocked) {
        local_index.set(0);
        const initialPos = layout.__tvistInternal_getScrollPositionForIndex(0);
        local_location.set(initialPos);
        local_target.set(initialPos);
        motion.__tvistInternal_applyTransform();
        local_tvist.emit('lock');
      } else {
        local_tvist.emit('unlock');
      }
    }
  }
  /**
   * Получить состояние блокировки
   */
  function read_isLocked(): boolean {
    return local__isLocked;
  }
  /**
   * Получить размер слайда (ширина или высота).
   * При autoWidth/autoHeight возвращает размер первого слайда для совместимости с модулями.
   */
  function read_slideSizeValue(): number {
    return layout.__tvistInternal_slideSizes.length > 0
      ? layout.__tvistInternal_getSlideSize(0)
      : layout.__tvistInternal_slideSize;
  }
  /**
   * Получить размер контейнера (ширина или высота)
   */
  function read_containerSizeValue(): number {
    return layout.__tvistInternal_containerSize;
  }
  /**
   * Получить значения peek (start, end)
   */
  function local_getPeek(): { start: number; end: number } {
    return { start: layout.__tvistInternal_peekStart, end: layout.__tvistInternal_peekEnd };
  }
  /**
   * Вычисляет видимость каждого слайда математически (без DOM-запросов).
   * Использует закэшированные slidePositions, slideSizes и текущий location.
   * Для эффекта cube маска граней задаётся в SlideStatesModule через `getCubeSlidesInRange`.
   *
   * @returns массив булевых значений видимости для каждого слайда
   */
  function local_getVisibleSlides(): boolean[] {
    const currentPos = local_location.get();
    const viewportSize = layout.__tvistInternal_containerSize;
    const slides = local_tvist.slides;
    const result: boolean[] = [];
    const THRESHOLD = 1;
    for (let i = 0; i < slides.length; i++) {
      // slidePosition — позиция слайда в координатах контента
      // currentPos — отрицательное смещение (translate), поэтому видимая область:
      // от -currentPos до -currentPos + viewportSize
      const viewportStart = -currentPos;
      const viewportEnd = viewportStart + viewportSize;
      const slideStart = layout.__tvistInternal_getSlidePosition(i);
      const slideEnd = slideStart + layout.__tvistInternal_getSlideSize(i);
      const isVisible =
        slideStart < viewportEnd - THRESHOLD && slideEnd > viewportStart + THRESHOLD;
      result.push(isVisible);
    }
    return result;
  }
  /**
   * Получить текущий индекс
   */
  function read_activeIndex(): number {
    return local_index.get();
  }
  /**
   * Получить количество слайдов
   */
  function read_slideCount(): number {
    return local_tvist.slides.length;
  }
  /**
   * Проверить, можно ли листать вперёд
   */
  function local_canScrollNext(): boolean {
    if (read_isLocked()) return false;
    if (layout.__tvistInternal_isLoopEnabled() || local_options.rewind) return true;
    const limit = local_options.isNavigation
      ? local_tvist.slides.length - 1
      : layout.__tvistInternal_getEndIndex();
    if (local_index.get() >= limit) return false;
    // В center и autoSize режимах граница определяется только по индексу:
    // center: translate не совпадает с getMaxScrollPosition
    // autoSize: несколько индексов могут сходиться к одной translate (clamp к maxScroll)
    if (layout.__tvistInternal_isCenterMode() || layout.__tvistInternal_isAutoSize()) return true;
    // Нет осмысленного диапазона (тесты без layout, нулевые размеры) — только индекс
    if (!local_hasScrollRange()) return true;
    // Сверка с фактической позицией: при slideMinWidth / рассинхроне после drag
    // индекс может быть < limit, а translate уже у упора — стрелка «вперёд» должна быть disabled
    return local_location.get() > layout.__tvistInternal_getMaxScrollPosition() + 1;
  }
  /**
   * Проверить, можно ли листать назад
   */
  function local_canScrollPrev(): boolean {
    if (read_isLocked()) return false;
    if (layout.__tvistInternal_isLoopEnabled() || local_options.rewind) return true;
    if (local_index.get() > 0) return true;
    if (layout.__tvistInternal_isCenterMode() || layout.__tvistInternal_isAutoSize()) return false;
    if (!local_hasScrollRange()) return false;
    return local_location.get() < layout.__tvistInternal_getMinScrollPosition() - 1;
  }
  /**
   * Есть ли осмысленный диапазон скролла (не нулевые размеры, не тест без layout)
   */
  function local_hasScrollRange(): boolean {
    const scrollRange =
      layout.__tvistInternal_getMinScrollPosition() - layout.__tvistInternal_getMaxScrollPosition();
    return Number.isFinite(scrollRange) && scrollRange > 1;
  }
  /**
   * Очистка
   */
  function local_destroy(): void {
    local_animator.stop();
    motion.__tvistInternal__lastAppliedTransformPos = null;
  }
  const motion = createMotion({
    get __tvistInternal_animator() {
      return local_animator;
    },
    get __tvistInternal_getEndIndex() {
      return layout.__tvistInternal_getEndIndex;
    },
    get __tvistInternal_index() {
      return local_index;
    },
    get __tvistInternal_getScrollPositionForIndex() {
      return layout.__tvistInternal_getScrollPositionForIndex;
    },
    get __tvistInternal_tvist() {
      return local_tvist;
    },
    get __tvistInternal_isLoopEnabled() {
      return layout.__tvistInternal_isLoopEnabled;
    },
    get __tvistInternal_options() {
      return local_options;
    },
    get __tvistInternal_isCenterMode() {
      return layout.__tvistInternal_isCenterMode;
    },
    get __tvistInternal_getEventIndex() {
      return layout.__tvistInternal_getEventIndex;
    },
    get __tvistInternal_isLoopWithClonesEnabled() {
      return layout.__tvistInternal_isLoopWithClonesEnabled;
    },
    get __tvistInternal_getMaxScrollPosition() {
      return layout.__tvistInternal_getMaxScrollPosition;
    },
    get __tvistInternal_getSlidePosition() {
      return layout.__tvistInternal_getSlidePosition;
    },
    get __tvistInternal_getMinScrollPosition() {
      return layout.__tvistInternal_getMinScrollPosition;
    },
    get __tvistInternal_target() {
      return local_target;
    },
    get __tvistInternal_location() {
      return local_location;
    },
    get __tvistInternal__isLocked() {
      return local__isLocked;
    },
    get __tvistInternal_isCenterJustify() {
      return layout.__tvistInternal_isCenterJustify;
    },
    get __tvistInternal_scrollCacheValid() {
      return layout.__tvistInternal_scrollCacheValid;
    },
    get __tvistInternal_updateScrollCache() {
      return layout.__tvistInternal_updateScrollCache;
    },
    get __tvistInternal_cachedRootSize() {
      return layout.__tvistInternal_cachedRootSize;
    },
    get __tvistInternal_getContentSize() {
      return local_getContentSize;
    },
  });
  const layout = createLayout({
    get __tvistInternal_options() {
      return local_options;
    },
    get __tvistInternal_tvist() {
      return local_tvist;
    },
    get __tvistInternal_index() {
      return local_index;
    },
  });
  const component: Engine = {
    get __tvistInternal_location() {
      return local_location;
    },
    get __tvistInternal_target() {
      return local_target;
    },
    get __tvistInternal_index() {
      return local_index;
    },
    get __tvistInternal_animator() {
      return local_animator;
    },
    __tvistInternal_getSlideSize: layout.__tvistInternal_getSlideSize,
    __tvistInternal_isCenterActive: layout.__tvistInternal_isCenterActive,
    __tvistInternal_isCenterFocus: layout.__tvistInternal_isCenterFocus,
    __tvistInternal_isCenterMode: layout.__tvistInternal_isCenterMode,
    __tvistInternal_isCenterJustify: layout.__tvistInternal_isCenterJustify,
    __tvistInternal_getCenterOffset: layout.__tvistInternal_getCenterOffset,
    __tvistInternal_clampCenterPosition: layout.__tvistInternal_clampCenterPosition,
    __tvistInternal_getScrollPositionForIndex: layout.__tvistInternal_getScrollPositionForIndex,
    get __tvistInternal_gapPxValue() {
      return layout.__tvistInternal_read_gapPxValue();
    },
    __tvistInternal_applyPeek: layout.__tvistInternal_applyPeek,
    __tvistInternal_setSlidePositions: layout.__tvistInternal_setSlidePositions,
    __tvistInternal_setSlideSize: layout.__tvistInternal_setSlideSize,
    __tvistInternal_getMinScrollPosition: layout.__tvistInternal_getMinScrollPosition,
    __tvistInternal_getMaxScrollPosition: layout.__tvistInternal_getMaxScrollPosition,
    __tvistInternal_getSlidePosition: layout.__tvistInternal_getSlidePosition,
    __tvistInternal_getSlidePositions: layout.__tvistInternal_getSlidePositions,
    __tvistInternal_scrollTo: motion.__tvistInternal_scrollTo,
    __tvistInternal_ensureTransitionUpdates: motion.__tvistInternal_ensureTransitionUpdates,
    __tvistInternal_scrollBy: motion.__tvistInternal_scrollBy,
    __tvistInternal_applyTransform: motion.__tvistInternal_applyTransform,
    __tvistInternal_updateDisabled: local_updateDisabled,
    __tvistInternal_update: local_update,
    __tvistInternal_updateAfterReorder: local_updateAfterReorder,
    __tvistInternal_checkLock: local_checkLock,
    __tvistInternal_getTotalSize: local_getTotalSize,
    get __tvistInternal_isLocked() {
      return read_isLocked();
    },
    get __tvistInternal_slideSizeValue() {
      return read_slideSizeValue();
    },
    get __tvistInternal_containerSizeValue() {
      return read_containerSizeValue();
    },
    __tvistInternal_getPeek: local_getPeek,
    __tvistInternal_getVisibleSlides: local_getVisibleSlides,
    get __tvistInternal_activeIndex() {
      return read_activeIndex();
    },
    get __tvistInternal_slideCount() {
      return read_slideCount();
    },
    __tvistInternal_canScrollNext: local_canScrollNext,
    __tvistInternal_canScrollPrev: local_canScrollPrev,
    __tvistInternal_destroy: local_destroy,
  };
  const local_tvist = tvist;
  const local_options = options;
  const startIndex = options.start ?? 0;
  const local_location = new Vector1D(0);
  const local_target = new Vector1D(0);
  const local_index = new Counter(
    tvist.slides.length,
    startIndex,
    layout.__tvistInternal_isLoopEnabled(),
    layout.__tvistInternal_calculateCounterEndIndex()
  );
  const local_animator = new Animator();
  local_animator.setExternalController(
    () => motion.__tvistInternal_cssTransitionActive,
    () => motion.__tvistInternal_stopCssTransition()
  );
  layout.__tvistInternal_resolveGap();
  layout.__tvistInternal_resolveFixedDimensionsEarly();
  layout.__tvistInternal_applyPeek();
  layout.__tvistInternal_calculateSizes();
  layout.__tvistInternal_calculatePositions();
  local_checkLock();
  const initialPos = layout.__tvistInternal_getScrollPositionForIndex(startIndex);
  local_location.set(initialPos);
  local_target.set(initialPos);
  motion.__tvistInternal_applyTransform();
  return component;
}
