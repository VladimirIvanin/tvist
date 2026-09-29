import { createAxis } from '../../utils/axis';
import { loopEnabled, lastScrollIndex } from '../../utils/positions';

import { Counter } from '../Counter';

import { TVIST_CLASSES } from '../constants';
import type { TvistRuntime as Tvist } from '../runtime';
import type { TvistOptions } from '../types';
import { getOuterWidth, getOuterHeight } from '../../utils/dom';
import { toCssValue, gapCssForMargin, resolveGapToPixels } from '../../utils/gridGap';
import { resolveCssLengthToPixels } from '../../utils/cssLength';
import { applyPeek, getPeekValue, getPeekValueFromOptions } from '../../utils/peek';
import { TVIST_SLIDE_INDEX_ATTR } from '../../utils/slideRealIndex';
interface LayoutContext {
  __tvistInternal_options: TvistOptions;
  __tvistInternal_tvist: Tvist;
  __tvistInternal_index: Counter;
}
export interface Layout {
  __tvistInternal_getScrollPositionForIndex: (index: number) => number;
  __tvistInternal_invalidateRootSizeCache: () => void;
  __tvistInternal_slideSizesCacheValid: boolean;
  __tvistInternal_calculateSizes: (isDisabled?: boolean) => void;
  __tvistInternal_calculatePositions: () => void;
  __tvistInternal_updateCounterLimits: () => void;
  __tvistInternal_resolveGap: () => void;
  __tvistInternal_resolveFixedDimensionsEarly: () => void;
  __tvistInternal_applyPeek: () => void;
  __tvistInternal_isAutoSize: () => boolean;
  __tvistInternal_slideSizes: number[];
  __tvistInternal_slideSize: number;
  __tvistInternal_containerSize: number;
  __tvistInternal_isLoopEnabled: () => boolean;
  __tvistInternal_getMaxScrollPosition: () => number;
  __tvistInternal_getMinScrollPosition: () => number;
  __tvistInternal_getSlidePosition: (index: number) => number;
  __tvistInternal_getSlideSize: (index: number) => number;
  __tvistInternal_peekStart: number;
  __tvistInternal_peekEnd: number;
  __tvistInternal_getEndIndex: () => number;
  __tvistInternal_isCenterMode: () => boolean;
  __tvistInternal_getEventIndex: (domIndex: number) => number;
  __tvistInternal_isLoopWithClonesEnabled: () => boolean;
  __tvistInternal_isCenterJustify: () => boolean;
  __tvistInternal_scrollCacheValid: boolean;
  __tvistInternal_updateScrollCache: () => void;
  __tvistInternal_cachedRootSize: number;
  __tvistInternal_isCenterActive: () => boolean;
  __tvistInternal_isCenterFocus: () => boolean;
  __tvistInternal_getCenterOffset: (index: number) => number;
  __tvistInternal_clampCenterPosition: (position: number) => number;
  __tvistInternal_read_gapPxValue: () => number;
  __tvistInternal_setSlidePositions: (positions: number[]) => void;
  __tvistInternal_setSlideSize: (size: number) => void;
  __tvistInternal_getSlidePositions: () => number[];
  __tvistInternal_calculateCounterEndIndex: () => number;
}
export function createLayout(deps: LayoutContext): Layout {
  const axis = createAxis(() => deps.__tvistInternal_options);

  let local_containerSize = 0;

  let local_slideSize = 0;

  /** Размеры каждого слайда при autoWidth/autoHeight */
  let local_slideSizes: number[] = [];

  let local_slidePositions: number[] = [];

  let local_peekStart = 0;

  let local_peekEnd = 0;

  let local_cachedMinScroll = 0;

  let local_cachedMaxScroll = 0;

  let local_cachedRootSize = 0;

  let local_scrollCacheValid = false;

  let local_cachedTrackWidth = 0;

  let local_cachedTrackHeight = 0;

  let local_trackSizeCacheValid = false;

  let local_slideSizesCacheValid = false;

  /** Размеры fixedWidth / fixedHeight в px после resolveFixedDimensionsEarly() */
  let local_fixedWidthPxResolved = 0;

  let local_fixedHeightPxResolved = 0;

  /**
   * gap из опций, приведённый к px через computed style браузера.
   * Обновляется в resolveGap() после применения margin к DOM.
   * Поддерживает rem, em, %, px и любые другие CSS-единицы.
   */
  let local_gapPxResolved = 0;

  /**
   * Возвращает размер слайда по индексу (ширина или высота в зависимости от direction).
   * При autoWidth/autoHeight — измеренный размер из DOM, иначе — общий slideSize.
   */
  function local_getSlideSize(index: number): number {
    if (local_slideSizes.length > 0 && index >= 0 && index < local_slideSizes.length) {
      const size = local_slideSizes[index];
      return size ?? local_slideSize;
    }
    return local_slideSize;
  }

  function local_isCenterActive(): boolean {
    const c = deps.__tvistInternal_options.center;
    if (!c) return false;
    if (c === true) return true;
    return c.active ?? false;
  }

  function local_isCenterFocus(): boolean {
    const c = deps.__tvistInternal_options.center;
    if (!c || c === true) return false;
    return c.focus ?? false;
  }

  /** Режим центрирования активного слайда (strict active или focus с trim у краёв). */
  function local_isCenterMode(): boolean {
    return local_isCenterActive() || local_isCenterFocus();
  }

  function local_isCenterJustify(): boolean {
    const c = deps.__tvistInternal_options.center;
    if (!c || c === true) return false;
    return c.justify ?? false;
  }

  /**
   * Вычисляет offset для центрирования
   */
  function local_getCenterOffset(index: number): number {
    if (!local_isCenterMode()) {
      return 0;
    }
    if (!local_scrollCacheValid) local_updateScrollCache();
    const rootSize = local_cachedRootSize;
    const size = local_getSlideSize(index);
    return (rootSize - local_peekStart - local_peekEnd - size) / 2;
  }

  /**
   * Ограничивает позицию скролла для center.focus (trim у краёв, как Splide trimSpace).
   */
  function local_clampCenterPosition(position: number): number {
    const minPos = local_getMinScrollPosition();
    const maxPos = local_getMaxScrollPosition();
    return Math.max(maxPos, Math.min(minPos, position));
  }

  /**
   * Получить realIndex (из data-tvist-slide-index) для слайда на указанной DOM-позиции.
   * Если атрибут отсутствует, возвращает domIndex как есть.
   */
  function local_getEventIndex(domIndex: number): number {
    const slide = deps.__tvistInternal_tvist.__tvistInternal_slides[domIndex];
    if (!slide) return domIndex;
    const dataAttr = slide.getAttribute(TVIST_SLIDE_INDEX_ATTR);
    if (dataAttr !== null) {
      return parseInt(dataAttr, 10);
    }
    return domIndex;
  }

  function local_isLoopEnabled(): boolean {
    return loopEnabled(deps.__tvistInternal_options.loop);
  }

  function local_isLoopWithClonesEnabled(): boolean {
    const l = deps.__tvistInternal_options.loop;
    if (typeof l === 'object' && l !== null && l.withClones === true && l.enabled !== false) {
      return true;
    }
    // Если LoopModule динамически включил клоны (например, мало слайдов),
    // первый слайд будет клоном.
    if (
      deps.__tvistInternal_tvist.__tvistInternal_slides.length > 0 &&
      deps.__tvistInternal_tvist.__tvistInternal_slides[0]?.classList.contains(
        TVIST_CLASSES.slideClone
      )
    ) {
      return true;
    }
    return false;
  }

  /**
   * Позиция скролла для индекса. При loop peekTrim не применяется.
   */
  function local_getScrollPositionForIndex(index: number): number {
    const basePosition = -local_getSlidePosition(index);
    const centerOffset = local_getCenterOffset(index);
    if (local_isLoopEnabled()) {
      if (local_isCenterMode()) {
        const pos = basePosition + centerOffset;
        return pos === 0 ? 0 : pos;
      }
      return basePosition === 0 ? 0 : basePosition;
    }
    if (local_isCenterFocus()) {
      const pos = local_clampCenterPosition(basePosition + centerOffset);
      return pos === 0 ? 0 : pos;
    }
    if (local_isCenterActive()) {
      const pos = basePosition + centerOffset;
      return pos === 0 ? 0 : pos;
    }
    const endIndex = local_getEndIndex();
    const peekTrim = deps.__tvistInternal_options.peekTrim !== false;
    if (index === 0) return peekTrim ? local_getMinScrollPosition() : 0;
    if (index === endIndex) {
      const pos = peekTrim ? local_getMaxScrollPosition() : basePosition;
      return pos === 0 ? 0 : pos;
    }
    if (local_isAutoSize() && peekTrim) {
      const maxScroll = local_getMaxScrollPosition();
      if (basePosition < maxScroll) return maxScroll;
    }
    return basePosition === 0 ? 0 : basePosition;
  }

  /**
   * Обновляет кеш размера track элемента (viewport слайдера)
   */
  function local_updateTrackSizeCache(): void {
    local_cachedTrackWidth = getOuterWidth(deps.__tvistInternal_tvist.__tvistInternal_track);
    local_cachedTrackHeight = getOuterHeight(deps.__tvistInternal_tvist.__tvistInternal_track);
    local_trackSizeCacheValid = true;
  }

  /**
   * Получает размер root элемента (с кешированием)
   */
  function local_getRootSize(): number {
    if (!local_trackSizeCacheValid) {
      local_updateTrackSizeCache();
    }
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    return isVertical ? local_cachedTrackHeight : local_cachedTrackWidth;
  }

  /**
   * Инвалидирует кеш размера root элемента
   */
  function local_invalidateRootSizeCache(): void {
    local_trackSizeCacheValid = false;
  }

  /**
   * База для gap в процентах при переводе в px.
   * По CSS margin/padding в % для любой стороны считаются от **ширины** содержащего блока,
   * в т.ч. margin-top/bottom. Gap задаётся margin по оси скролла, поэтому для vertical
   * нельзя умножать % на высоту viewport (containerSize).
   */
  function local_getMarginPercentageBasePx(): number {
    for (const el of [
      deps.__tvistInternal_tvist.__tvistInternal_root,
      deps.__tvistInternal_tvist.__tvistInternal_track,
      deps.__tvistInternal_tvist.__tvistInternal_container,
    ]) {
      const w = getOuterWidth(el);
      if (w > 0) return w;
    }
    return local_containerSize;
  }

  /** База для height в процентах (fixedHeight и т.п.) */
  function local_getVerticalPercentageBasePx(): number {
    for (const el of [
      deps.__tvistInternal_tvist.__tvistInternal_root,
      deps.__tvistInternal_tvist.__tvistInternal_track,
      deps.__tvistInternal_tvist.__tvistInternal_container,
    ]) {
      const h = getOuterHeight(el);
      if (h > 0) return h;
    }
    return local_containerSize;
  }

  function local_isFixedDimensionOption(
    value: number | string | undefined
  ): value is number | string {
    if (value === undefined || value === '' || value === 0) return false;
    if (typeof value === 'number') return value > 0;
    return true;
  }

  /** Переводит опцию fixedWidth/fixedHeight в px. Число → как есть, строка → через CSS-резолюцию. */
  function local_resolveFixedDimensionPx(
    value: number | string,
    axis: 'width' | 'height',
    probe: HTMLElement,
    percentBasePx: number
  ): number {
    if (typeof value === 'number') return value;
    return resolveCssLengthToPixels(value, axis, { probe, percentBasePx });
  }

  /**
   * Измеряет fixedWidth / fixedHeight в px до applyPeek (для лимита peek и perPage).
   */
  function local_resolveFixedDimensionsEarly(): void {
    local_fixedWidthPxResolved = 0;
    local_fixedHeightPxResolved = 0;
    const slide = deps.__tvistInternal_tvist.__tvistInternal_slides[0];
    if (!slide) return;
    const { fixedWidth: fw, fixedHeight: fh } = deps.__tvistInternal_options;
    if (local_isFixedDimensionOption(fw)) {
      local_fixedWidthPxResolved = local_resolveFixedDimensionPx(
        fw,
        'width',
        slide,
        local_getMarginPercentageBasePx()
      );
    }
    if (local_isFixedDimensionOption(fh)) {
      local_fixedHeightPxResolved = local_resolveFixedDimensionPx(
        fh,
        'height',
        slide,
        local_getVerticalPercentageBasePx()
      );
    }
  }

  /** Базовый размер слайда для лимита peek (50%) и updatePeekValues */
  function local_getSlideBaseSizeForPeekLayout(rootSize: number): number {
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    const gap = local_gapPxResolved;
    const perPage = deps.__tvistInternal_options.perPage ?? 1;
    if (
      !isVertical &&
      local_fixedWidthPxResolved > 0 &&
      local_isFixedDimensionOption(deps.__tvistInternal_options.fixedWidth)
    ) {
      return local_fixedWidthPxResolved;
    }
    if (
      isVertical &&
      local_fixedHeightPxResolved > 0 &&
      local_isFixedDimensionOption(deps.__tvistInternal_options.fixedHeight)
    ) {
      return local_fixedHeightPxResolved;
    }
    return (rootSize - gap * (perPage - 1)) / perPage;
  }

  /**
   * Вычисляет gap в пикселях без DOM-мутаций:
   * - число → уже px
   * - "16px" → parseFloat
   * - "1rem" → rootFontSize * n
   * - "1em"  → parentFontSize * n (font-size трека)
   * - "50%"  → ширина root/track/container * n (как margin % в CSS)
   * - остальное → временный DOM-запрос (один reflow, без мутаций стиля)
   */
  function local_resolveGap(): void {
    const gapValue = deps.__tvistInternal_options.gap;
    if (!gapValue) {
      local_gapPxResolved = 0;
      return;
    }
    if (typeof gapValue === 'number') {
      local_gapPxResolved = gapValue;
      return;
    }
    const trimmed = gapValue.trim();
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n)) {
      local_gapPxResolved = 0;
      return;
    }
    if (trimmed.endsWith('px')) {
      local_gapPxResolved = n;
      return;
    }
    if (trimmed.endsWith('rem')) {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      local_gapPxResolved = n * rootFontSize;
      return;
    }
    if (trimmed.endsWith('em')) {
      const parentFontSize =
        parseFloat(getComputedStyle(deps.__tvistInternal_tvist.__tvistInternal_track).fontSize) ||
        16;
      local_gapPxResolved = n * parentFontSize;
      return;
    }
    if (trimmed.endsWith('%')) {
      local_gapPxResolved = (n / 100) * local_getMarginPercentageBasePx();
      return;
    }
    // vw/vh и прочие редкие единицы — применяем временно и читаем computed style (один reflow)
    const slides = deps.__tvistInternal_tvist.__tvistInternal_slides;
    const firstSlide = slides[0];
    if (!firstSlide) {
      local_gapPxResolved = 0;
      return;
    }
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    const prop = axis.__tvistInternal_margin;
    firstSlide.style[prop] = gapCssForMargin(gapValue);
    local_gapPxResolved = resolveGapToPixels(firstSlide, isVertical ? 'vertical' : 'horizontal');
    firstSlide.style[prop] = '';
  }

  /**
   * Публичный геттер gap в пикселях (вычисленный через computed style браузера).
   * Используется модулями (DragModule, GridModule) для расчётов.
   */
  function read_gapPxValue(): number {
    return local_gapPxResolved;
  }

  /**
   * Применяет peek к контейнеру слайдов
   */
  function local_applyPeek(): void {
    // Ограничиваем peek так, чтобы он не превышал 50% базовой ширины/высоты слайда.
    // Базовый размер считаем по root без учёта peek:
    // slideBaseSize = (rootSize - gap * (perPage - 1)) / perPage
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    const rootSize = isVertical
      ? local_cachedTrackHeight || getOuterHeight(deps.__tvistInternal_tvist.__tvistInternal_root)
      : local_cachedTrackWidth || getOuterWidth(deps.__tvistInternal_tvist.__tvistInternal_root);
    const slideBaseSize = local_getSlideBaseSizeForPeekLayout(rootSize);
    const maxPeek = slideBaseSize > 0 && isFinite(slideBaseSize) ? slideBaseSize / 2 : undefined;
    applyPeek(
      deps.__tvistInternal_tvist.__tvistInternal_track,
      deps.__tvistInternal_options,
      maxPeek
    );
  }

  function local_calculateSizes(isDisabled = false): void {
    if (deps.__tvistInternal_tvist.__tvistInternal_slides.length === 0) {
      local_resetSizes();
      return;
    }
    const isAutoSize = local_isAutoSize();
    // ⚠️ Сбрасываем размеры слайдов ДО измерения track.
    //
    // Иначе в grid/flex-родителях без `min-width: 0` слайды со style.width
    // из прошлого прогона увеличивают intrinsic-размер контейнера, контейнер
    // тянет track (overflow:hidden не всегда обрезает intrinsic sizing),
    // ResizeObserver видит рост, зовёт update — и calculateFixedSlideSize
    // считает всё большие и большие значения. Итог — ширина слайда и
    // translate3d уходят в миллионы пикселей при center: { justify: true }
    // и других лейаутах. См. tests/integration/center-justify-feedback.test.ts.
    //
    // Сброс делаем только в fixed-size режиме: в autoSize размеры слайдов
    // задаёт пользователь/контент, сбрасывать их нельзя.
    if (!isDisabled && !isAutoSize) {
      local_resetSlideStylesForMeasurement();
      local_invalidateRootSizeCache();
      local_trackSizeCacheValid = false;
    }
    local_updatePeekValues(isDisabled);
    local_containerSize = local_getRootSize() - local_peekStart - local_peekEnd;
    if (isAutoSize) {
      local_slideSize = 0;
      local_applyAndMeasureAutoSize(isDisabled);
    } else {
      local_calculateFixedSlideSize();
      local_applyFixedSize(isDisabled);
    }
  }

  /**
   * Сбрасывает inline-размеры и margin по основной оси у всех слайдов.
   * Нужно вызывать перед измерением track/root, чтобы предыдущий прогон
   * calculateSizes не «раздувал» intrinsic-размер родителя.
   */
  function local_resetSlideStylesForMeasurement(): void {
    for (const slide of deps.__tvistInternal_tvist.__tvistInternal_slides) {
      slide.style[axis.__tvistInternal_dimension] = '';
      slide.style[axis.__tvistInternal_margin] = '';
    }
  }

  function local_resetSizes(): void {
    local_containerSize = 0;
    local_slideSize = 0;
    local_peekStart = 0;
    local_peekEnd = 0;
  }

  function local_isAutoSize(): boolean {
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    if (isVertical) {
      if (local_isFixedDimensionOption(deps.__tvistInternal_options.fixedHeight)) {
        return false;
      }
      return deps.__tvistInternal_options.autoHeight === true;
    }
    if (local_isFixedDimensionOption(deps.__tvistInternal_options.fixedWidth)) {
      return false;
    }
    return deps.__tvistInternal_options.autoWidth === true;
  }

  function local_updatePeekValues(isDisabled: boolean): void {
    const startSide = axis.__tvistInternal_start;
    const endSide = axis.__tvistInternal_end;
    local_peekStart = getPeekValueFromOptions(deps.__tvistInternal_options, startSide);
    local_peekEnd = getPeekValueFromOptions(deps.__tvistInternal_options, endSide);
    if (deps.__tvistInternal_options.peek && !isDisabled) {
      if (local_peekStart === 0) {
        local_peekStart = getPeekValue(deps.__tvistInternal_tvist.__tvistInternal_track, startSide);
      }
      if (local_peekEnd === 0) {
        local_peekEnd = getPeekValue(deps.__tvistInternal_tvist.__tvistInternal_track, endSide);
      }
    }
    // Дополнительно ограничиваем числовые peek значением не более 50% базового
    // размера слайда (как и в applyPeek), чтобы математическая модель
    // соответствовала DOM.
    const rootSize = local_getRootSize();
    const slideBaseSize = local_getSlideBaseSizeForPeekLayout(rootSize);
    const maxPeek = slideBaseSize > 0 && isFinite(slideBaseSize) ? slideBaseSize / 2 : 0;
    if (maxPeek > 0) {
      if (local_peekStart > maxPeek) local_peekStart = maxPeek;
      if (local_peekEnd > maxPeek) local_peekEnd = maxPeek;
    }
  }

  function local_calculateFixedSlideSize(): void {
    // Только верхнеуровневый gap: межстраничные отступы grid задаёт GridModule в DOM,
    // позиции для grid перезаписываются в fixEnginePositions по offsetLeft.
    const gap = local_gapPxResolved;
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    // Фиксированный размер по основной оси: fixedWidth для горизонтали, fixedHeight для вертикали.
    const fixedPx = isVertical ? local_fixedHeightPxResolved : local_fixedWidthPxResolved;
    if (!fixedPx && deps.__tvistInternal_options.slideMinSize) {
      deps.__tvistInternal_options.perPage = Math.max(
        1,
        Math.floor((local_containerSize + gap) / (deps.__tvistInternal_options.slideMinSize + gap))
      );
    }
    if (fixedPx > 0) {
      deps.__tvistInternal_options.perPage = Math.max(
        1,
        Math.floor((local_containerSize + gap) / (fixedPx + gap))
      );
      local_slideSize = fixedPx;
      local_slideSizes = [];
      return;
    }
    const perPage = deps.__tvistInternal_options.perPage ?? 1;
    local_slideSize = (local_containerSize - gap * (perPage - 1)) / perPage;
    if (local_slideSize < 0 || !isFinite(local_slideSize)) {
      local_slideSize = 0;
    }
    local_slideSizes = [];
  }

  function local_applyAndMeasureAutoSize(isDisabled: boolean): void {
    const gapCss = gapCssForMargin(deps.__tvistInternal_options.gap);
    if (!isDisabled) {
      deps.__tvistInternal_tvist.__tvistInternal_slides.forEach((slide, i) => {
        slide.style.marginRight = '';
        slide.style.marginBottom = '';
        if (gapCss && i !== deps.__tvistInternal_tvist.__tvistInternal_slides.length - 1) {
          slide.style[axis.__tvistInternal_margin] = gapCss;
        }
      });
    }
    if (!local_slideSizesCacheValid) {
      if (isDisabled) {
        // Стили не применены — оставляем предыдущие размеры или инициализируем нулями
        if (local_slideSizes.length === 0) {
          local_slideSizes = deps.__tvistInternal_tvist.__tvistInternal_slides.map(() => 0);
        }
      } else {
        local_slideSizes = deps.__tvistInternal_tvist.__tvistInternal_slides.map((slide) =>
          axis.__tvistInternal_measure(slide)
        );
      }
      local_slideSizesCacheValid = true;
    }
  }

  function local_applyFixedSize(isDisabled: boolean): void {
    const isVertical = deps.__tvistInternal_options.direction === 'vertical';
    const gapCss = toCssValue(deps.__tvistInternal_options.gap);
    // CSS-значения по основной и поперечной осям.
    // Основная ось: fixedWidth для горизонтали, fixedHeight для вертикали.
    // Поперечная ось: fixedHeight для горизонтали, fixedWidth для вертикали.
    const primaryCss = toCssValue(
      isVertical
        ? deps.__tvistInternal_options.fixedHeight
        : deps.__tvistInternal_options.fixedWidth
    );
    const crossCss = toCssValue(
      isVertical
        ? deps.__tvistInternal_options.fixedWidth
        : deps.__tvistInternal_options.fixedHeight
    );
    if (!isDisabled) {
      deps.__tvistInternal_tvist.__tvistInternal_slides.forEach((slide, i) => {
        slide.style.width = '';
        slide.style.height = '';
        slide.style.marginRight = '';
        slide.style.marginBottom = '';
        if (local_slideSize > 0) {
          const primarySizeCss = primaryCss || `${local_slideSize}px`;
          slide.style[axis.__tvistInternal_dimension] = primarySizeCss;
        }
        if (isVertical) {
          slide.style.width = crossCss || '100%';
        } else if (crossCss) {
          slide.style.height = crossCss;
        }
        if (gapCss && i !== deps.__tvistInternal_tvist.__tvistInternal_slides.length - 1) {
          slide.style[axis.__tvistInternal_margin] = gapCss;
        }
      });
    }
    local_slideSizes = [];
    local_slideSizesCacheValid = false;
  }

  /**
   * Рассчитывает позиции всех слайдов
   */
  function local_calculatePositions(): void {
    const slides = deps.__tvistInternal_tvist.__tvistInternal_slides;
    const gap = local_gapPxResolved;
    local_slidePositions = [];
    if (local_slideSizes.length > 0) {
      let pos = 0;
      for (let i = 0; i < slides.length; i++) {
        local_slidePositions.push(pos);
        pos += (local_slideSizes[i] ?? 0) + gap;
      }
    } else {
      for (let i = 0; i < slides.length; i++) {
        local_slidePositions.push(i * (local_slideSize + gap));
      }
    }
    // Обновляем кэш scroll-позиций после пересчёта layout
    local_updateScrollCache();
  }

  /**
   * Пересчитывает кэш scroll-позиций (minScroll, maxScroll, rootSize).
   * Вызывается после calculatePositions/calculateSizes и при любом изменении layout.
   */
  function local_updateScrollCache(): void {
    // ВАЖНО: cachedRootSize нужен для getCenterOffset даже при loop
    local_cachedRootSize = local_getRootSize();
    // minScroll: используем peekStart (уже вычислен в calculateSizes)
    local_cachedMinScroll = local_peekStart === 0 ? 0 : -local_peekStart;
    // maxScroll: правый/нижний край последнего слайда совпадает с краем root (без дыры справа/снизу).
    // Для этого используем cachedRootSize, а не containerSize, чтобы перекрыть peekEnd.
    const lastIndex = deps.__tvistInternal_tvist.__tvistInternal_slides.length - 1;
    if (lastIndex >= 0) {
      const lastPageRight = local_getSlidePosition(lastIndex) + local_getSlideSize(lastIndex);
      local_cachedMaxScroll = local_cachedRootSize - local_peekStart - lastPageRight;
    } else {
      local_cachedMaxScroll = 0;
    }
    local_scrollCacheValid = true;
  }

  /**
   * Инвалидирует кэш scroll-позиций.
   * Следующий вызов getMinScrollPosition/getMaxScrollPosition пересчитает значения.
   */
  function local_invalidateScrollCache(): void {
    local_scrollCacheValid = false;
  }

  /**
   * Установить позиции слайдов вручную (используется в GridModule)
   */
  function local_setSlidePositions(positions: number[]): void {
    local_slidePositions = positions;
    local_invalidateScrollCache();
  }

  /**
   * Установить размер слайда вручную (используется в GridModule)
   */
  function local_setSlideSize(size: number): void {
    local_slideSize = size;
  }

  /**
   * Вычисляет последний допустимый индекс для скролла
   */
  function local_getEndIndex(): number {
    const slideCount = deps.__tvistInternal_tvist.__tvistInternal_slides.length;
    if (
      local_isLoopEnabled() ||
      local_isCenterMode() ||
      deps.__tvistInternal_options.isNavigation ||
      local_isAutoSize()
    ) {
      return slideCount - 1;
    }
    const perPage = deps.__tvistInternal_options.perPage ?? 1;
    return Math.max(0, Math.min(slideCount - perPage, slideCount - 1));
  }

  /**
   * Минимальная позиция скролла (при trim — первый слайд прижат к левому краю, левый peek не показывается).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  function local_getMinScrollPosition(): number {
    if (!local_scrollCacheValid) local_updateScrollCache();
    return local_cachedMinScroll;
  }

  /**
   * Максимальная позиция скролла (отрицательная).
   * При этой позиции правый край последнего слайда совпадает с правым краем root — правый peek не показывается (trim).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  function local_getMaxScrollPosition(): number {
    if (!local_scrollCacheValid) local_updateScrollCache();
    return local_cachedMaxScroll;
  }

  /**
   * Получить позицию слайда по индексу
   */
  function local_getSlidePosition(index: number): number {
    if (index < 0 || index >= local_slidePositions.length) {
      return 0;
    }
    return local_slidePositions[index] ?? 0;
  }

  /**
   * Получить все позиции слайдов (публичный метод для тестов)
   */
  function local_getSlidePositions(): number[] {
    return [...local_slidePositions];
  }

  /**
   * Вычисляет endIndex для Counter на основе текущих опций
   */
  function local_calculateCounterEndIndex(): number {
    const slideCount = deps.__tvistInternal_tvist.__tvistInternal_slides.length;
    const perPage = deps.__tvistInternal_options.perPage ?? 1;
    return lastScrollIndex(
      slideCount,
      perPage,
      local_isLoopEnabled() || !!deps.__tvistInternal_options.isNavigation || local_isCenterMode()
    );
  }

  /**
   * Обновляет Counter.endIndex и Counter.max после изменения perPage/slideCount
   */
  function local_updateCounterLimits(): void {
    deps.__tvistInternal_index.endIndex = local_calculateCounterEndIndex();
    deps.__tvistInternal_index.max = deps.__tvistInternal_tvist.__tvistInternal_slides.length;
  }
  const component: Layout = {
    __tvistInternal_getScrollPositionForIndex: local_getScrollPositionForIndex,
    __tvistInternal_invalidateRootSizeCache: local_invalidateRootSizeCache,
    get __tvistInternal_slideSizesCacheValid() {
      return local_slideSizesCacheValid;
    },
    set __tvistInternal_slideSizesCacheValid(value) {
      local_slideSizesCacheValid = value;
    },
    __tvistInternal_calculateSizes: local_calculateSizes,
    __tvistInternal_calculatePositions: local_calculatePositions,
    __tvistInternal_updateCounterLimits: local_updateCounterLimits,
    __tvistInternal_resolveGap: local_resolveGap,
    __tvistInternal_resolveFixedDimensionsEarly: local_resolveFixedDimensionsEarly,
    __tvistInternal_applyPeek: local_applyPeek,
    __tvistInternal_isAutoSize: local_isAutoSize,
    get __tvistInternal_slideSizes() {
      return local_slideSizes;
    },
    set __tvistInternal_slideSizes(value) {
      local_slideSizes = value;
    },
    get __tvistInternal_slideSize() {
      return local_slideSize;
    },
    set __tvistInternal_slideSize(value) {
      local_slideSize = value;
    },
    get __tvistInternal_containerSize() {
      return local_containerSize;
    },
    set __tvistInternal_containerSize(value) {
      local_containerSize = value;
    },
    __tvistInternal_isLoopEnabled: local_isLoopEnabled,
    __tvistInternal_getMaxScrollPosition: local_getMaxScrollPosition,
    __tvistInternal_getMinScrollPosition: local_getMinScrollPosition,
    __tvistInternal_getSlidePosition: local_getSlidePosition,
    __tvistInternal_getSlideSize: local_getSlideSize,
    get __tvistInternal_peekStart() {
      return local_peekStart;
    },
    set __tvistInternal_peekStart(value) {
      local_peekStart = value;
    },
    get __tvistInternal_peekEnd() {
      return local_peekEnd;
    },
    set __tvistInternal_peekEnd(value) {
      local_peekEnd = value;
    },
    __tvistInternal_getEndIndex: local_getEndIndex,
    __tvistInternal_isCenterMode: local_isCenterMode,
    __tvistInternal_getEventIndex: local_getEventIndex,
    __tvistInternal_isLoopWithClonesEnabled: local_isLoopWithClonesEnabled,
    __tvistInternal_isCenterJustify: local_isCenterJustify,
    get __tvistInternal_scrollCacheValid() {
      return local_scrollCacheValid;
    },
    set __tvistInternal_scrollCacheValid(value) {
      local_scrollCacheValid = value;
    },
    __tvistInternal_updateScrollCache: local_updateScrollCache,
    get __tvistInternal_cachedRootSize() {
      return local_cachedRootSize;
    },
    set __tvistInternal_cachedRootSize(value) {
      local_cachedRootSize = value;
    },
    __tvistInternal_isCenterActive: local_isCenterActive,
    __tvistInternal_isCenterFocus: local_isCenterFocus,
    __tvistInternal_getCenterOffset: local_getCenterOffset,
    __tvistInternal_clampCenterPosition: local_clampCenterPosition,
    __tvistInternal_read_gapPxValue: read_gapPxValue,
    __tvistInternal_setSlidePositions: local_setSlidePositions,
    __tvistInternal_setSlideSize: local_setSlideSize,
    __tvistInternal_getSlidePositions: local_getSlidePositions,
    __tvistInternal_calculateCounterEndIndex: local_calculateCounterEndIndex,
  };
  return component;
}
