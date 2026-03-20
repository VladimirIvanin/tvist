import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

/**
 * Grid Module
 * Позволяет располагать слайды в виде сетки (grid layout)
 * 
 * В режиме dimensions каждый элемент массива [rows, cols] определяет
 * количество рядов и колонок для одной страницы (wrapper slide).
 * Оригинальные слайды последовательно распределяются по этим страницам.
 */
export class GridModule extends Module {
  readonly name = 'grid'
  
  private isActive = false
  private originalSlides: HTMLElement[] = []
  private wrapperSlides: HTMLElement[] = []
  /** Сигнатура структуры сетки + отступов; при совпадении onUpdate не пересоздаёт DOM */
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

  /**
   * Ключ для решения, нужно ли пересобирать DOM сетки (rows/cols/dimensions и gap).
   */
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

  /**
   * Стабильная строка по настройкам gap (совпадает с тем, как {@link getGapValue} их читает).
   */
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
    // Активен если есть grid опции и заданы rows/cols или dimensions
    return !!grid && (!!grid.rows || !!grid.cols || (!!grid.dimensions && grid.dimensions.length > 0))
  }

  /**
   * Проверяет, используется ли режим dimensions
   */
  private hasDimensions(): boolean {
    const { grid } = this.options
    return !!(grid?.dimensions && grid.dimensions.length > 0)
  }

  /**
   * Создает grid структуру с вложенными элементами 
   * Поддерживает как фиксированную сетку (rows + cols), так и dimensions
   */
  private buildGrid(): void {
    const { grid } = this.options
    if (!grid) return

    // Сохраняем оригинальные слайды только если ещё не сохранены
    if (this.originalSlides.length === 0) {
      this.originalSlides = Array.from(this.tvist.slides)
    }
    
    // Очищаем контейнер
    const container = this.tvist.container
    container.innerHTML = ''
    
    // Для grid используем flexbox
    container.style.display = 'flex'
    
    // Создаем wrapper-слайды (страницы)
    this.wrapperSlides = []
    
    if (this.hasDimensions()) {
      // Режим dimensions: каждый элемент [rows, cols] = одна страница
      this.buildDimensionsGrid()
    } else {
      // Фиксированная сетка: все страницы одинаковые rows × cols
      this.buildFixedGrid()
    }
    
    // Обновляем список слайдов в Tvist
    this.tvist.updateSlidesList()
  }

  /**
   * Создает grid с фиксированными размерами (все страницы rows × cols)
   */
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

  /**
   * Создает grid с переменными размерами страниц (dimensions)
   * dimensions = [ [rows1, cols1], [rows2, cols2], ... ]
   * Каждый элемент определяет размер одной страницы
   */
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
   * Заполняет одну страницу сеткой rows×cols; возвращает индекс следующего оригинального слайда.
   */
  private fillGridPage(
    pageRoot: HTMLElement,
    rows: number,
    cols: number,
    startSlideIndex: number
  ): number {
    let index = startSlideIndex

    for (let row = 0; row < rows; row++) {
      const rowEl = this.createRowElement(row, rows)
      const rowFragment = document.createDocumentFragment()

      for (let col = 0; col < cols; col++) {
        if (index >= this.originalSlides.length) break

        const slide = this.originalSlides[index]
        if (slide) {
          const colWrapper = this.createColWrapper(col, cols)
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

  /**
   * Создает внешний слайд (страницу)
   */
  private createOuterSlide(): HTMLElement {
    const outerSlide = document.createElement('div')
    outerSlide.className = `${TVIST_CLASSES.slide} ${TVIST_CLASSES.slideGridPage}`
    outerSlide.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;'
    return outerSlide
  }

  /**
   * Создает элемент ряда
   */
  private createRowElement(rowIndex: number, totalRows: number): HTMLElement {
    const rowEl = document.createElement('div')
    rowEl.className = TVIST_CLASSES.gridRow
    rowEl.style.cssText = `
      display: flex;
      flex: 1;
      ${rowIndex < totalRows - 1 ? `margin-bottom: ${this.getGapValue('row')}px;` : ''}
    `
    return rowEl
  }

  /**
   * Создает обертку для колонки
   */
  private createColWrapper(colIndex: number, totalCols: number): HTMLElement {
    const colWrapper = document.createElement('div')
    colWrapper.className = TVIST_CLASSES.gridCol
    colWrapper.style.cssText = `
      flex: 1;
      ${colIndex < totalCols - 1 ? `margin-right: ${this.getGapValue('col')}px;` : ''}
    `
    return colWrapper
  }

  /**
   * Оборачивает оригинальный слайд в колонку
   */
  private wrapSlide(originalSlide: HTMLElement, colWrapper: HTMLElement): void {
    // Убираем класс tvist-v1__slide, чтобы updateSlidesList не находил его
    originalSlide.classList.remove(TVIST_CLASSES.slide)
    originalSlide.classList.add(TVIST_CLASSES.gridItem)
    originalSlide.style.width = '100%'
    originalSlide.style.height = '100%'
    colWrapper.appendChild(originalSlide)
  }

  /**
   * Получает значение gap для строк или колонок
   */
  private getGapValue(axis: 'row' | 'col'): number {
    const { grid, gap: globalGap = 0 } = this.options
    if (!grid) return 0

    const { gap: gridGap } = grid

    if (gridGap === undefined) {
      return this.gapToPixels(globalGap)
    }

    if (typeof gridGap === 'object') {
      const raw = gridGap[axis] ?? globalGap
      return this.gapToPixels(raw)
    }

    return this.gapToPixels(gridGap)
  }

  /** Число пикселей для margin (число или строка вроде "12" / "12px"). */
  private gapToPixels(value: string | number): number {
    if (typeof value === 'number') return value
    const n = parseInt(value, 10)
    return Number.isFinite(n) ? n : 0
  }

  /**
   * Удаляет grid структуру и восстанавливает оригинальные слайды
   */
  private removeGrid(): void {
    if (this.originalSlides.length > 0) {
      // Восстанавливаем оригинальные слайды
      const container = this.tvist.container
      container.style.display = ''
      container.innerHTML = ''
      
      const fragment = document.createDocumentFragment()
      this.originalSlides.forEach(slide => {
        // Восстанавливаем класс tvist-v1__slide
        slide.classList.remove(TVIST_CLASSES.gridItem)
        slide.classList.add(TVIST_CLASSES.slide)
        slide.style.width = ''
        slide.style.height = ''
        fragment.appendChild(slide)
      })
      container.appendChild(fragment)
      
      // Обновляем список слайдов
      this.tvist.updateSlidesList()
      
      this.originalSlides = []
      this.wrapperSlides = []
    }
  }

  /**
   * Пересчитываем позиции слайдов для grid и обновляем состояние Engine
   */
  private fixEnginePositions(): void {
    const engine = this.tvist.engine
    const slides = this.tvist.slides

    // Для grid с wrapper-слайдами позиции простые: каждая страница - это один слайд
    // offsetLeft уже правильный для каждой страницы
    const newPositions = slides.map(slide => slide.offsetLeft)
    engine.setSlidePositions(newPositions)
    
    // Размер слайда = ширина страницы
    if (slides.length > 0) {
      const firstSlide = slides[0]
      if (firstSlide) {
        const realSlideSize = firstSlide.offsetWidth
        engine.setSlideSize(realSlideSize)
      }
    }

    // Нужно обновить текущую позицию (location/target), так как Engine мог рассчитать её 
    // по старой (линейной) логике во время update()
    const currentIndex = engine.index.get()
    const correctPosition = engine.getScrollPositionForIndex(currentIndex)

    engine.target.set(correctPosition)
    engine.location.set(correctPosition)
    engine.applyTransformPublic()
    
    // Проверяем блокировку после обновления позиций (возможно контент теперь влезает)
    engine.checkLock()
  }
}
