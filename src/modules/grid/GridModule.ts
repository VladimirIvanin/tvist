import { Module } from '../Module'
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

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (this.shouldBeActive()) {
      this.isActive = true
      this.buildGrid()
      this.fixEnginePositions()
    }
  }

  override destroy(): void {
    this.removeGrid()
  }

  override onUpdate(): void {
    const wasActive = this.isActive
    
    if (this.shouldBeActive()) {
      if (wasActive) {
        // Пересоздаем grid
        this.removeGrid()
      }
      
      this.isActive = true
      this.buildGrid()
      this.fixEnginePositions()
    } else if (wasActive) {
      this.isActive = false
      this.removeGrid()
      // Форсим обновление Engine, чтобы он вернул свои стили
      this.tvist.engine.update()
    }
  }

  protected override shouldBeActive(): boolean {
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
   * Создает grid структуру с вложенными элементами (как Splide Grid)
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

    const rows = grid.rows
    const cols = grid.cols
    const slidesPerPage = rows * cols
    const pagesCount = Math.ceil(this.originalSlides.length / slidesPerPage)
    
    let slideIndex = 0
    
    for (let pageIndex = 0; pageIndex < pagesCount; pageIndex++) {
      const outerSlide = this.createOuterSlide()
      
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const rowEl = this.createRowElement(rowIndex, rows)
        
        for (let colIndex = 0; colIndex < cols; colIndex++) {
          if (slideIndex < this.originalSlides.length) {
            const originalSlide = this.originalSlides[slideIndex]
            if (originalSlide) {
              const colWrapper = this.createColWrapper(colIndex, cols)
              this.wrapSlide(originalSlide, colWrapper)
              rowEl.appendChild(colWrapper)
            }
            slideIndex++
          }
        }
        
        outerSlide.appendChild(rowEl)
      }
      
      this.wrapperSlides.push(outerSlide)
      this.tvist.container.appendChild(outerSlide)
    }
  }

  /**
   * Создает grid с переменными размерами страниц (dimensions)
   * dimensions = [ [rows1, cols1], [rows2, cols2], ... ]
   * Каждый элемент определяет размер одной страницы
   */
  private buildDimensionsGrid(): void {
    const { grid } = this.options
    if (!grid?.dimensions) return

    const dimensions = grid.dimensions
    let slideIndex = 0
    let dimensionIndex = 0
    
    // Создаем страницы пока есть слайды
    while (slideIndex < this.originalSlides.length) {
      // Получаем размеры текущей страницы (циклически)
      const [rows, cols] = dimensions[dimensionIndex % dimensions.length] ?? [1, 1]

      const outerSlide = this.createOuterSlide()
      
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const rowEl = this.createRowElement(rowIndex, rows)
        
        for (let colIndex = 0; colIndex < cols; colIndex++) {
          if (slideIndex < this.originalSlides.length) {
            const originalSlide = this.originalSlides[slideIndex]
            if (originalSlide) {
              const colWrapper = this.createColWrapper(colIndex, cols)
              this.wrapSlide(originalSlide, colWrapper)
              rowEl.appendChild(colWrapper)
            }
            slideIndex++
          }
        }
        
        outerSlide.appendChild(rowEl)
      }
      
      this.wrapperSlides.push(outerSlide)
      this.tvist.container.appendChild(outerSlide)
      dimensionIndex++
    }
  }

  /**
   * Создает внешний слайд (страницу)
   */
  private createOuterSlide(): HTMLElement {
    const outerSlide = document.createElement('div')
    outerSlide.className = 'tvist__slide tvist__slide--grid-page'
    outerSlide.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;'
    return outerSlide
  }

  /**
   * Создает элемент ряда
   */
  private createRowElement(rowIndex: number, totalRows: number): HTMLElement {
    const rowEl = document.createElement('div')
    rowEl.className = 'tvist__grid-row'
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
    colWrapper.className = 'tvist__grid-col'
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
    // Убираем класс tvist__slide, чтобы updateSlidesList не находил его
    originalSlide.classList.remove('tvist__slide')
    originalSlide.classList.add('tvist__grid-item')
    originalSlide.style.width = '100%'
    originalSlide.style.height = '100%'
    colWrapper.appendChild(originalSlide)
  }

  /**
   * Получает значение gap для строк или колонок
   */
  private getGapValue(type: 'row' | 'col'): number {
    const { grid, gap: globalGap = 0 } = this.options
    if (!grid) return 0
    
    const toNumber = (val: string | number): number => {
      return typeof val === 'number' ? val : parseInt(val, 10) || 0
    }
    
    if (grid.gap) {
      if (typeof grid.gap === 'object') {
        const value = grid.gap[type] ?? globalGap
        return toNumber(value)
      }
      return toNumber(grid.gap)
    }
    
    return toNumber(globalGap)
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
      
      this.originalSlides.forEach(slide => {
        // Восстанавливаем класс tvist__slide
        slide.classList.remove('tvist__grid-item')
        slide.classList.add('tvist__slide')
        slide.style.width = ''
        slide.style.height = ''
        container.appendChild(slide)
      })
      
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
