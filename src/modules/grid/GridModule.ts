import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

/**
 * Grid Module
 * Позволяет располагать слайды в несколько рядов (grid layout)
 */
export class GridModule extends Module {
  readonly name = 'grid'

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (this.shouldBeActive()) {
      this.applyGrid()
      this.fixEnginePositions()
    }
  }

  override destroy(): void {
    this.removeGrid()
  }

  override onUpdate(): void {
    if (this.shouldBeActive()) {
      this.applyGrid()
      this.fixEnginePositions()
    } else {
      this.removeGrid()
    }
  }

  protected override shouldBeActive(): boolean {
    const { grid } = this.options
    // Активен если есть grid опции и заданы rows/cols или dimensions
    return !!grid && (!!grid.rows || !!grid.cols || !!grid.dimensions)
  }

  private applyGrid(): void {
    const { grid, gap: globalGap = 0 } = this.options
    if (!grid) return

    const rows = grid.rows || 1
    const cols = grid.cols || 1
    const dimensions = grid.dimensions
    
    // Gap handling
    let rowGap: string | number = globalGap
    let colGap: string | number = globalGap

    if (grid.gap) {
      if (typeof grid.gap === 'object') {
        rowGap = grid.gap.row ?? globalGap
        colGap = grid.gap.col ?? globalGap
      } else {
        rowGap = grid.gap
        colGap = grid.gap
      }
    }
    
    // Нормализация единиц измерения для gap
    const toCssValue = (val: string | number) => typeof val === 'number' ? `${val}px` : val
    
    // Получаем базовый размер слайда (ширину колонки) из Engine
    // При cols > 1, Engine.slideSize может быть не тем, что нам нужно, если мы хотим фиксированное число колонок
    // Но пока полагаемся на то, что CSS Grid сам распределит
    const slideSize = this.tvist.engine.slideSizeValue

    // Добавляем класс
    this.tvist.container.classList.add('tvist__container--grid')
    
    // Применяем стили к контейнеру
    const styles: Partial<CSSStyleDeclaration> = {
      rowGap: toCssValue(rowGap),
      columnGap: toCssValue(colGap)
    }

    if (grid.rows) {
      styles.gridTemplateRows = `repeat(${rows}, 1fr)`
    }
    
    if (grid.cols) {
       styles.gridTemplateColumns = `repeat(${cols}, 1fr)`
    } else {
       // Если колонок нет, авто-колонки по размеру слайда
       styles.gridAutoColumns = `${slideSize}px`
    }

    Object.assign(this.tvist.container.style, styles)

    // Применяем стили к слайдам
    this.tvist.slides.forEach((slide, index) => {
      // Сбрасываем стили Engine
      slide.style.marginRight = ''
      slide.style.marginBottom = ''
      slide.style.width = '100%'
      slide.style.height = '100%'
      
      // Dimensions
      if (dimensions && dimensions.length > 0) {
        // Безопасное получение dimensions с повторением
        const dimension = dimensions[index % dimensions.length]
        if (dimension) {
            const [colSpan, rowSpan] = dimension
            slide.style.gridColumn = `span ${colSpan}`
            slide.style.gridRow = `span ${rowSpan}`
        }
      } else {
        slide.style.gridColumn = ''
        slide.style.gridRow = ''
      }
    })
  }

  private removeGrid(): void {
    this.tvist.container.classList.remove('tvist__container--grid')
    Object.assign(this.tvist.container.style, {
      gridTemplateRows: '',
      gridTemplateColumns: '',
      gridAutoColumns: '',
      rowGap: '',
      columnGap: ''
    })
    
    this.tvist.slides.forEach(slide => {
      slide.style.gridColumn = ''
      slide.style.gridRow = ''
      slide.style.width = ''
      slide.style.height = ''
    })
  }

  /**
   * Пересчитываем позиции слайдов для сетки и обновляем состояние Engine
   */
  private fixEnginePositions(): void {
    const engine = this.tvist.engine as any
    const slides = this.tvist.slides

    // Считываем реальные позиции из DOM
    // offsetLeft дает позицию относительно контейнера
    // В случае grid, слайды могут быть "в куче" или распределены по колонкам
    // Для корректной навигации нам нужно знать "страницу" каждого слайда
    // Но Engine ожидает slidePositions как массив координат для каждого слайда.
    // Если слайды идут друг под другом (rows > 1), у них будет одинаковый offsetLeft.
    // Это нормально для Engine, он просто будет скроллить к этому offsetLeft.
    
    const newPositions = slides.map(slide => slide.offsetLeft)

    // Перезаписываем позиции в Engine
    engine.slidePositions = newPositions

    // Нужно обновить текущую позицию (location/target), так как Engine мог рассчитать её 
    // по старой (линейной) логике во время update()
    const currentIndex = engine.index.get()
    const correctPosition = engine.getScrollPositionForIndex(currentIndex)

    engine.target.set(correctPosition)
    engine.location.set(correctPosition)
    engine.applyTransform()
  }
}
