import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
import { resolveTrackGapCssFromOptions } from '../../utils/gridGap';

/** Internal component; state lives in this factory's closure. */
export interface GridModule extends Component {
  readonly name: 'grid';

  init(): void;

  destroy(): void;

  onUpdate(): void;

  shouldBeActive(): boolean;
}

export function createGridModule(tvist: Tvist, options: TvistOptions): GridModule {
  const base = createComponent(tvist, options);

  const local_name = 'grid' as const;

  let local_isActive = false;

  let local_originalSlides: HTMLElement[] = [];

  let local_wrapperSlides: HTMLElement[] = [];

  let local_gridStructureKey = '';

  function local_init(): void {
    if (local_shouldBeActive()) {
      local_isActive = true;
      local_buildGrid();
      local_gridStructureKey = local_computeGridStructureKey();
      local_fixEnginePositions();
    }
  }

  function local_destroy(): void {
    local_gridStructureKey = '';
    local_isActive = false;
    local_removeGrid();
  }

  function local_onUpdate(): void {
    const wasActive = local_isActive;
    if (!local_shouldBeActive()) {
      if (wasActive) {
        local_isActive = false;
        local_gridStructureKey = '';
        local_removeGrid();
        tvist.__tvistInternal_engine.__tvistInternal_update();
      }
      return;
    }
    if (!wasActive) {
      local_isActive = true;
      local_buildGrid();
      local_gridStructureKey = local_computeGridStructureKey();
      local_fixEnginePositions();
      return;
    }
    const nextKey = local_computeGridStructureKey();
    if (nextKey !== local_gridStructureKey) {
      local_removeGrid();
      local_buildGrid();
      local_gridStructureKey = nextKey;
    }
    local_fixEnginePositions();
  }

  function local_computeGridStructureKey(): string {
    const { grid, gap: globalGap = 0 } = options;
    if (!grid) return '';
    const gapFingerprint = local_gapFingerprintForStructureKey(grid.gap, globalGap);
    const hasDimensions = grid.dimensions && grid.dimensions.length > 0;
    if (hasDimensions) {
      return `d:${JSON.stringify(grid.dimensions)}:${gapFingerprint}`;
    }
    const fixed = local_effectiveFixedRowsCols();
    if (!fixed) {
      return `f:::${gapFingerprint}`;
    }
    return `f:${String(fixed.rows)}:${String(fixed.cols)}:${gapFingerprint}`;
  }

  function local_gapFingerprintForStructureKey(
    gridGap: NonNullable<TvistOptions['grid']>['gap'] | undefined,
    globalGap: string | number
  ): string {
    if (gridGap === undefined) {
      return `gg:${globalGap}`;
    }
    if (typeof gridGap === 'object') {
      const row = String(gridGap.row ?? '');
      const col = String(gridGap.col ?? '');
      return `gr:${row}:gc:${col}:gg:${globalGap}`;
    }
    return `g:${String(gridGap)}:gg:${globalGap}`;
  }

  function local_shouldBeActive(): boolean {
    const { grid } = options;
    if (!grid) return false;
    if (grid.dimensions && grid.dimensions.length > 0) return true;
    const r = grid.rows;
    const c = grid.cols;
    const hasRows = typeof r === 'number' && Number.isFinite(r) && r > 0;
    const hasCols = typeof c === 'number' && Number.isFinite(c) && c > 0;
    return hasRows || hasCols;
  }

  function local_hasDimensions(): boolean {
    const { grid } = options;
    return !!(grid?.dimensions && grid.dimensions.length > 0);
  }
  /**
   * Для fixed-сетки без `dimensions`: если задана только одна ось, вторая по умолчанию 1
   * (одна колонка при только `rows`, одна строка при только `cols`), иначе контейнер
   * очищался бы в `buildGrid()` без последующей сборки.
   */
  function local_effectiveFixedRowsCols(): { rows: number; cols: number } | null {
    const { grid } = options;
    if (!grid || local_hasDimensions()) return null;
    const r = grid.rows;
    const c = grid.cols;
    const hasRows = typeof r === 'number' && Number.isFinite(r) && r > 0;
    const hasCols = typeof c === 'number' && Number.isFinite(c) && c > 0;
    if (!hasRows && !hasCols) return null;
    return {
      rows: hasRows ? r : 1,
      cols: hasCols ? c : 1,
    };
  }
  /**
   * Возвращает единицу gap как CSS-строку (px или переданное значение).
   */
  function local_gapUnit(value: string | number | undefined): string {
    if (value === undefined || value === 0 || value === '0') return '0px';
    if (typeof value === 'number') return `${value}px`;
    return value.endsWith('px') ||
      value.endsWith('%') ||
      value.endsWith('em') ||
      value.endsWith('rem')
      ? value
      : `${value}px`;
  }
  /**
   * Возвращает CSS calc() строку для ширины одной колонки.
   * Формула: calc(100% / cols - colGap * (cols - 1) / cols)
   */
  function local_calcColWidth(cols: number, colGap: string | number | undefined): string {
    const gap = local_gapUnit(colGap);
    if (gap === '0px' || cols === 1) {
      return `calc(${100 / cols}%)`;
    }
    return `calc(${100 / cols}% - ${gap} * ${(cols - 1) / cols})`;
  }
  /**
   * Возвращает CSS calc() строку для высоты одной строки.
   * Формула: calc(100% / rows - rowGap * (rows - 1) / rows)
   */
  function local_calcRowHeight(rows: number, rowGap: string | number | undefined): string {
    const gap = local_gapUnit(rowGap);
    if (gap === '0px' || rows === 1) {
      return `calc(${100 / rows}%)`;
    }
    return `calc(${100 / rows}% - ${gap} * ${(rows - 1) / rows})`;
  }

  function local_getGaps(): { row: string | number | undefined; col: string | number | undefined } {
    const { grid, gap: globalGap } = options;
    if (!grid) return { row: undefined, col: undefined };
    const gridGap = grid.gap;
    if (gridGap === undefined) {
      return { row: globalGap, col: globalGap };
    }
    if (typeof gridGap === 'object') {
      return {
        row: gridGap.row ?? globalGap,
        col: gridGap.col ?? globalGap,
      };
    }
    return { row: gridGap, col: gridGap };
  }

  function local_buildGrid(): void {
    const { grid } = options;
    if (!grid) return;
    if (local_originalSlides.length === 0) {
      local_originalSlides = Array.from(tvist.__tvistInternal_slides);
    }
    const container = tvist.__tvistInternal_container;
    container.innerHTML = '';
    container.style.display = 'flex';
    local_wrapperSlides = [];
    if (local_hasDimensions()) {
      local_buildDimensionsGrid();
    } else {
      local_buildFixedGrid();
    }
    tvist.__tvistInternal_updateSlidesList();
    local_applyInterPageGaps();
  }

  function local_buildFixedGrid(): void {
    const fixed = local_effectiveFixedRowsCols();
    if (!fixed) return;
    const { rows, cols } = fixed;
    const cellsPerPage = rows * cols;
    const pageCount = Math.ceil(local_originalSlides.length / cellsPerPage);
    const fragment = document.createDocumentFragment();
    let nextSlideIndex = 0;
    for (let page = 0; page < pageCount; page++) {
      const pageRoot = local_createOuterSlide();
      nextSlideIndex = local_fillGridPage(pageRoot, rows, cols, nextSlideIndex);
      local_wrapperSlides.push(pageRoot);
      fragment.appendChild(pageRoot);
    }
    tvist.__tvistInternal_container.appendChild(fragment);
  }

  function local_buildDimensionsGrid(): void {
    const { grid } = options;
    const specs = grid?.dimensions;
    if (!specs?.length) return;
    const fragment = document.createDocumentFragment();
    let nextSlideIndex = 0;
    let specRound = 0;
    while (nextSlideIndex < local_originalSlides.length) {
      const [rows, cols] = specs[specRound % specs.length] ?? [1, 1];
      const pageRoot = local_createOuterSlide();
      nextSlideIndex = local_fillGridPage(pageRoot, rows, cols, nextSlideIndex);
      local_wrapperSlides.push(pageRoot);
      fragment.appendChild(pageRoot);
      specRound++;
    }
    tvist.__tvistInternal_container.appendChild(fragment);
  }
  /**
   * Заполняет одну страницу сеткой rows×cols.
   * Размеры строк и колонок задаются через calc() — строго, без растяжения.
   * Возвращает индекс следующего оригинального слайда.
   */
  function local_fillGridPage(
    pageRoot: HTMLElement,
    rows: number,
    cols: number,
    startSlideIndex: number
  ): number {
    const { row: rowGap, col: colGap } = local_getGaps();
    const rowHeight = local_calcRowHeight(rows, rowGap);
    const colWidth = local_calcColWidth(cols, colGap);
    const rowGapUnit = local_gapUnit(rowGap);
    const colGapUnit = local_gapUnit(colGap);
    let index = startSlideIndex;
    for (let row = 0; row < rows; row++) {
      const rowEl = local_createRowElement(row, rows, rowHeight, rowGapUnit);
      const rowFragment = document.createDocumentFragment();
      for (let col = 0; col < cols; col++) {
        if (index >= local_originalSlides.length) break;
        const slide = local_originalSlides[index];
        if (slide) {
          const colWrapper = local_createColWrapper(col, cols, colWidth, colGapUnit);
          local_wrapSlide(slide, colWrapper);
          rowFragment.appendChild(colWrapper);
        }
        index++;
      }
      rowEl.appendChild(rowFragment);
      pageRoot.appendChild(rowEl);
    }
    return index;
  }

  function local_createOuterSlide(): HTMLElement {
    const outerSlide = document.createElement('div');
    outerSlide.className = `${TVIST_CLASSES.slide} ${TVIST_CLASSES.slideGridPage}`;
    outerSlide.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;';
    return outerSlide;
  }
  /**
   * Строка сетки с фиксированной высотой через calc().
   */
  function local_createRowElement(
    rowIndex: number,
    totalRows: number,
    rowHeight: string,
    rowGapUnit: string
  ): HTMLElement {
    const rowEl = document.createElement('div');
    rowEl.className = TVIST_CLASSES.gridRow;
    const isLast = rowIndex === totalRows - 1;
    const marginBottom = !isLast && rowGapUnit !== '0px' ? rowGapUnit : '';
    rowEl.style.cssText = [
      `height: ${rowHeight}`,
      'display: flex',
      'flex-shrink: 0',
      marginBottom ? `margin-bottom: ${marginBottom}` : '',
      'padding: 0',
    ]
      .filter(Boolean)
      .join('; ');
    return rowEl;
  }
  /**
   * Колонка сетки с фиксированной шириной через calc().
   */
  function local_createColWrapper(
    colIndex: number,
    totalCols: number,
    colWidth: string,
    colGapUnit: string
  ): HTMLElement {
    const colWrapper = document.createElement('div');
    colWrapper.className = TVIST_CLASSES.gridCol;
    const isLast = colIndex === totalCols - 1;
    const marginRight = !isLast && colGapUnit !== '0px' ? colGapUnit : '';
    colWrapper.style.cssText = [
      `width: ${colWidth}`,
      'height: 100%',
      'flex-shrink: 0',
      marginRight ? `margin-right: ${marginRight}` : '',
    ]
      .filter(Boolean)
      .join('; ');
    return colWrapper;
  }

  function local_wrapSlide(originalSlide: HTMLElement, colWrapper: HTMLElement): void {
    originalSlide.classList.remove(TVIST_CLASSES.slide);
    originalSlide.classList.add(TVIST_CLASSES.gridItem);
    originalSlide.style.width = '100%';
    originalSlide.style.height = '';
    colWrapper.appendChild(originalSlide);
  }

  function local_applyInterPageGaps(): void {
    const trackGapCss = resolveTrackGapCssFromOptions(options);
    const isVertical = options.direction === 'vertical';
    const slides = tvist.__tvistInternal_slides;
    slides.forEach((slide, i) => {
      const isLast = i === slides.length - 1;
      if (isVertical) {
        slide.style.marginRight = '';
        slide.style.marginBottom = !isLast && trackGapCss ? trackGapCss : '';
      } else {
        slide.style.marginBottom = '';
        slide.style.marginRight = !isLast && trackGapCss ? trackGapCss : '';
      }
    });
  }

  function local_removeGrid(): void {
    if (local_originalSlides.length > 0) {
      const container = tvist.__tvistInternal_container;
      container.style.display = '';
      container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      local_originalSlides.forEach((slide) => {
        slide.classList.remove(TVIST_CLASSES.gridItem);
        slide.classList.add(TVIST_CLASSES.slide);
        slide.style.width = '';
        slide.style.height = '';
        fragment.appendChild(slide);
      });
      container.appendChild(fragment);
      tvist.__tvistInternal_updateSlidesList();
      local_originalSlides = [];
      local_wrapperSlides = [];
    }
  }

  function local_fixEnginePositions(): void {
    const engine = tvist.__tvistInternal_engine;
    const slides = tvist.__tvistInternal_slides;
    local_applyInterPageGaps();
    const newPositions = slides.map((slide) => slide.offsetLeft);
    engine.__tvistInternal_setSlidePositions(newPositions);
    if (slides.length > 0) {
      const firstSlide = slides[0];
      if (firstSlide) {
        const realSlideSize = firstSlide.offsetWidth;
        engine.__tvistInternal_setSlideSize(realSlideSize);
      }
    }
    const currentIndex = engine.__tvistInternal_index.get();
    const correctPosition = engine.__tvistInternal_getScrollPositionForIndex(currentIndex);
    engine.__tvistInternal_target.set(correctPosition);
    engine.__tvistInternal_location.set(correctPosition);
    engine.__tvistInternal_applyTransform();
    engine.__tvistInternal_checkLock();
  }
  const component: GridModule = {
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
    onUpdate: local_onUpdate,
    shouldBeActive: local_shouldBeActive,
  };

  return component;
}
