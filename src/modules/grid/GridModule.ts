import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'
import { resolveTrackGapFromOptions } from '../../utils/gridGap'

/**
 * Grid Module
 * Располагает слайды в виде сетки (grid layout).
 *
 * Размеры строк и колонок задаются через calc() — строгие значения,
 * не зависящие от количества заполненных ячеек (как в splide-extension-grid).
 *
 * В режиме dimensions каждый элемент массива [rows, cols] определяет
 * количество рядов и колонок для одной страницы (wrapper slide).
 */
export class GridModule extends Module {
  readonly name = 'grid'

  private isActive = false
  private originalSlides: HTMLElement[] = []
  private wrapperSlides: HTMLElement[] = []
  private gridStructureKey = ''

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (this.shouldBeActive()) {
      this.isActive = true
      this.buildGrid()
      this.gridStructureKey = this.computeGridStructureKey()
      this.fixEnginePositions()
    }
  }

  override destroy(): void {
    this.gridStructureKey = ''
    this.isActive = false
    this.removeGrid()
  }

  override onUpdate(): void {
    const wasActive = this.isActive

    if (!this.shouldBeActive()) {
      if (wasActive) {
        this.isActive = false
        this.gridStructureKey = ''
        this.removeGrid()
        this.tvist.engine.update()
      }
      return
    }

    if (!wasActive) {
      this.isActive = true
      this.buildGrid()
      this.gridStructureKey = this.computeGridStructureKey()
      this.fixEnginePositions()
      return
    }

    const nextKey = this.computeGridStructureKey()
    if (nextKey !== this.gridStructureKey) {
      this.removeGrid()
      this.buildGrid()
      this.gridStructureKey = nextKey
    }
    this.fixEnginePositions()
  }

  private computeGridStructureKey(): string {
    const { grid, gap: globalGap = 0 } = this.options
    if (!grid) return ''

    const gapFingerprint = this.gapFingerprintForStructureKey(grid.gap, globalGap)

    const hasDimensions = grid.dimensions && grid.dimensions.length > 0
    if (hasDimensions) {
      return `d:${JSON.stringify(grid.dimensions)}:${gapFingerprint}`
    }

    return `f:${String(grid.rows ?? '')}:${String(grid.cols ?? '')}:${gapFingerprint}`
  }

  private gapFingerprintForStructureKey(
    gridGap: NonNullable<TvistOptions['grid']>['gap'] | undefined,
    globalGap: string | number
  ): string {
    if (gridGap === undefined) {
      return `gg:${globalGap}`
    }

    if (typeof gridGap === 'object') {
      const row = String(gridGap.row ?? '')
      const col = String(gridGap.col ?? '')
      return `gr:${row}:gc:${col}:gg:${globalGap}`
    }

    return `g:${String(gridGap)}:gg:${globalGap}`
  }

  public override shouldBeActive(): boolean {
    const { grid } = this.options
    return !!grid && (!!grid.rows || !!grid.cols || (!!grid.dimensions && grid.dimensions.length > 0))
  }

  private hasDimensions(): boolean {
    const { grid } = this.options
    return !!(grid?.dimensions && grid.dimensions.length > 0)
  }

  /**
   * Возвращает единицу gap как CSS-строку (px или переданное значение).
   */
  private gapUnit(value: string | number | undefined): string {
    if (value === undefined || value === 0 || value === '0') return '0px'
    if (typeof value === 'number') return `${value}px`
    return value.endsWith('px') || value.endsWith('%') || value.endsWith('em') || value.endsWith('rem')
      ? value
      : `${value}px`
  }

  /**
   * Возвращает CSS calc() строку для ширины одной колонки.
   * Формула: calc(100% / cols - colGap * (cols - 1) / cols)
   */
  private calcColWidth(cols: number, colGap: string | number | undefined): string {
    const gap = this.gapUnit(colGap)
    if (gap === '0px' || cols === 1) {
      return `calc(${100 / cols}%)`
    }
    return `calc(${100 / cols}% - ${gap} * ${(cols - 1) / cols})`
  }

  /**
   * Возвращает CSS calc() строку для высоты одной строки.
   * Формула: calc(100% / rows - rowGap * (rows - 1) / rows)
   */
  private calcRowHeight(rows: number, rowGap: string | number | undefined): string {
    const gap = this.gapUnit(rowGap)
    if (gap === '0px' || rows === 1) {
      return `calc(${100 / rows}%)`
    }
    return `calc(${100 / rows}% - ${gap} * ${(rows - 1) / rows})`
  }

  private getGaps(): { row: string | number | undefined; col: string | number | undefined } {
    const { grid, gap: globalGap } = this.options
    if (!grid) return { row: undefined, col: undefined }

    const gridGap = grid.gap

    if (gridGap === undefined) {
      return { row: globalGap, col: globalGap }
    }

    if (typeof gridGap === 'object') {
      return {
        row: gridGap.row ?? globalGap,
        col: gridGap.col ?? globalGap,
      }
    }

    return { row: gridGap, col: gridGap }
  }

  private buildGrid(): void {
    const { grid } = this.options
    if (!grid) return

    if (this.originalSlides.length === 0) {
      this.originalSlides = Array.from(this.tvist.slides)
    }

    const container = this.tvist.container
    container.innerHTML = ''
    container.style.display = 'flex'

    this.wrapperSlides = []

    if (this.hasDimensions()) {
      this.buildDimensionsGrid()
    } else {
      this.buildFixedGrid()
    }

    this.tvist.updateSlidesList()
    this.applyInterPageGaps()
  }

  private buildFixedGrid(): void {
    const { grid } = this.options
    if (!grid?.rows || !grid?.cols) return

    const { rows, cols } = grid
    const cellsPerPage = rows * cols
    const pageCount = Math.ceil(this.originalSlides.length / cellsPerPage)

    const fragment = document.createDocumentFragment()
    let nextSlideIndex = 0

    for (let page = 0; page < pageCount; page++) {
      const pageRoot = this.createOuterSlide()
      nextSlideIndex = this.fillGridPage(pageRoot, rows, cols, nextSlideIndex)
      this.wrapperSlides.push(pageRoot)
      fragment.appendChild(pageRoot)
    }

    this.tvist.container.appendChild(fragment)
  }

  private buildDimensionsGrid(): void {
    const { grid } = this.options
    const specs = grid?.dimensions
    if (!specs?.length) return

    const fragment = document.createDocumentFragment()
    let nextSlideIndex = 0
    let specRound = 0

    while (nextSlideIndex < this.originalSlides.length) {
      const [rows, cols] = specs[specRound % specs.length] ?? [1, 1]
      const pageRoot = this.createOuterSlide()
      nextSlideIndex = this.fillGridPage(pageRoot, rows, cols, nextSlideIndex)
      this.wrapperSlides.push(pageRoot)
      fragment.appendChild(pageRoot)
      specRound++
    }

    this.tvist.container.appendChild(fragment)
  }

  /**
   * Заполняет одну страницу сеткой rows×cols.
   * Размеры строк и колонок задаются через calc() — строго, без растяжения.
   * Возвращает индекс следующего оригинального слайда.
   */
  private fillGridPage(
    pageRoot: HTMLElement,
    rows: number,
    cols: number,
    startSlideIndex: number
  ): number {
    const { row: rowGap, col: colGap } = this.getGaps()
    const rowHeight = this.calcRowHeight(rows, rowGap)
    const colWidth = this.calcColWidth(cols, colGap)
    const rowGapUnit = this.gapUnit(rowGap)
    const colGapUnit = this.gapUnit(colGap)

    let index = startSlideIndex

    for (let row = 0; row < rows; row++) {
      const rowEl = this.createRowElement(row, rows, rowHeight, rowGapUnit)
      const rowFragment = document.createDocumentFragment()

      for (let col = 0; col < cols; col++) {
        if (index >= this.originalSlides.length) break

        const slide = this.originalSlides[index]
        if (slide) {
          const colWrapper = this.createColWrapper(col, cols, colWidth, colGapUnit)
          this.wrapSlide(slide, colWrapper)
          rowFragment.appendChild(colWrapper)
        }
        index++
      }

      rowEl.appendChild(rowFragment)
      pageRoot.appendChild(rowEl)
    }

    return index
  }

  private createOuterSlide(): HTMLElement {
    const outerSlide = document.createElement('div')
    outerSlide.className = `${TVIST_CLASSES.slide} ${TVIST_CLASSES.slideGridPage}`
    outerSlide.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;'
    return outerSlide
  }

  /**
   * Строка сетки с фиксированной высотой через calc().
   */
  private createRowElement(
    rowIndex: number,
    totalRows: number,
    rowHeight: string,
    rowGapUnit: string
  ): HTMLElement {
    const rowEl = document.createElement('div')
    rowEl.className = TVIST_CLASSES.gridRow

    const isLast = rowIndex === totalRows - 1
    const marginBottom = !isLast && rowGapUnit !== '0px' ? rowGapUnit : ''

    rowEl.style.cssText = [
      `height: ${rowHeight}`,
      'display: flex',
      'flex-shrink: 0',
      marginBottom ? `margin-bottom: ${marginBottom}` : '',
      'padding: 0',
    ]
      .filter(Boolean)
      .join('; ')

    return rowEl
  }

  /**
   * Колонка сетки с фиксированной шириной через calc().
   */
  private createColWrapper(
    colIndex: number,
    totalCols: number,
    colWidth: string,
    colGapUnit: string
  ): HTMLElement {
    const colWrapper = document.createElement('div')
    colWrapper.className = TVIST_CLASSES.gridCol

    const isLast = colIndex === totalCols - 1
    const marginRight = !isLast && colGapUnit !== '0px' ? colGapUnit : ''

    colWrapper.style.cssText = [
      `width: ${colWidth}`,
      'height: 100%',
      'flex-shrink: 0',
      marginRight ? `margin-right: ${marginRight}` : '',
    ]
      .filter(Boolean)
      .join('; ')

    return colWrapper
  }

  private wrapSlide(originalSlide: HTMLElement, colWrapper: HTMLElement): void {
    originalSlide.classList.remove(TVIST_CLASSES.slide)
    originalSlide.classList.add(TVIST_CLASSES.gridItem)
    originalSlide.style.width = '100%'
    originalSlide.style.height = ''
    colWrapper.appendChild(originalSlide)
  }

  private applyInterPageGaps(): void {
    const trackGap = resolveTrackGapFromOptions(this.options)
    const isVertical = this.options.direction === 'vertical'
    const slides = this.tvist.slides

    slides.forEach((slide, i) => {
      const isLast = i === slides.length - 1
      if (isVertical) {
        slide.style.marginRight = ''
        slide.style.marginBottom =
          trackGap > 0 && !isLast ? `${trackGap}px` : ''
      } else {
        slide.style.marginBottom = ''
        slide.style.marginRight =
          trackGap > 0 && !isLast ? `${trackGap}px` : ''
      }
    })
  }

  private removeGrid(): void {
    if (this.originalSlides.length > 0) {
      const container = this.tvist.container
      container.style.display = ''
      container.innerHTML = ''

      const fragment = document.createDocumentFragment()
      this.originalSlides.forEach(slide => {
        slide.classList.remove(TVIST_CLASSES.gridItem)
        slide.classList.add(TVIST_CLASSES.slide)
        slide.style.width = ''
        slide.style.height = ''
        fragment.appendChild(slide)
      })
      container.appendChild(fragment)

      this.tvist.updateSlidesList()

      this.originalSlides = []
      this.wrapperSlides = []
    }
  }

  private fixEnginePositions(): void {
    const engine = this.tvist.engine
    const slides = this.tvist.slides

    this.applyInterPageGaps()

    const newPositions = slides.map(slide => slide.offsetLeft)
    engine.setSlidePositions(newPositions)

    if (slides.length > 0) {
      const firstSlide = slides[0]
      if (firstSlide) {
        const realSlideSize = firstSlide.offsetWidth
        engine.setSlideSize(realSlideSize)
      }
    }

    const currentIndex = engine.index.get()
    const correctPosition = engine.getScrollPositionForIndex(currentIndex)

    engine.target.set(correctPosition)
    engine.location.set(correctPosition)
    engine.applyTransform()

    engine.checkLock()
  }
}
