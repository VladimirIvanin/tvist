/**
 * LoopModule - бесконечная прокрутка с клонированием
 * 
 * Подход как в Splide:
 * 1. Создаём клоны слайдов в начале и конце
 * 2. DOM не меняется во время работы
 * 3. loopFix - мгновенный прыжок когда достигаем клона
 * 
 * DOM структура:
 * [clone-N-1, clone-N] [slide-0, slide-1, ..., slide-N-1] [clone-0, clone-1]
 *   prepend клоны         оригинальные слайды           append клоны
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class LoopModule extends Module {
  readonly name = 'loop'
  
  /** Количество клонов с каждой стороны */
  private cloneCount = 0
  
  /** Общее количество оригинальных слайдов */
  private originalSlidesCount = 0
  
  /** Массив клонированных элементов (для удаления при destroy) */
  private clones: HTMLElement[] = []
  
  /** Флаг инициализации */
  private isInitialized = false
  
  /** Сохранённый оригинальный scrollTo */
  // private originalScrollTo!: (index: number, instant?: boolean) => Tvist

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  init(): void {
    if (!this.options.loop) {
      return
    }

    // Защита от повторной инициализации
    if (this.isInitialized) {
      return
    }

    this.originalSlidesCount = this.tvist.slides.length

    if (this.originalSlidesCount < 2) {
      return
    }

    this.isInitialized = true

    // Вычисляем количество клонов
    this.cloneCount = this.computeCloneCount()

    // Создаём клоны
    this.createClones()

    // Обновляем список слайдов в Tvist
    this.tvist.updateSlidesList()

    // Пересчитываем размеры слайдов (теперь их больше)
    this.tvist.engine.update()

    // ВАЖНО: Отключаем loop в Counter - теперь индексация линейная [0, totalSlides-1]
    // loopFix будет сам делать прыжок когда достигаем клона
    this.tvist.engine.index.loop = false
    this.tvist.engine.index.max = this.tvist.slides.length

    // Стартуем с первого оригинального слайда (пропускаем prepend клоны)
    this.tvist.engine.index.set(this.cloneCount)
    const startPosition = -this.tvist.engine.getSlidePosition(this.cloneCount)
    this.tvist.engine.location.set(startPosition)
    this.tvist.engine.target.set(startPosition)
    this.tvist.engine.applyTransformPublic()

    // Настраиваем резолвер индекса
    this.tvist.indexResolver = this.resolveIndex.bind(this)
    
    // Теперь патчим навигацию
    this.patchNavigation()

    // Подписываемся на события для loopFix
    this.on('slideChanged', () => this.loopFix())
    // Также проверяем во время скролла (для drag)
    this.on('scroll', () => this.checkClonePosition())
    // И во время драга
    this.on('drag', () => this.checkClonePosition())
  }

  /**
   * Патч для scrollTo - принимает логический индекс
   * Ищет кратчайший путь к целевому слайду (с учетом клонов)
   */
  resolveIndex(index: number): number {
    const currentPhysical = this.tvist.engine.index.get()
    const targetLogical = ((index % this.originalSlidesCount) + this.originalSlidesCount) % this.originalSlidesCount
    
    // Возможные целевые физические индексы
    const candidates = [
      targetLogical + this.cloneCount, // Основной оригинал
      targetLogical + this.cloneCount + this.originalSlidesCount, // Append клон
      targetLogical + this.cloneCount - this.originalSlidesCount // Prepend клон
    ]
    
    const totalPhysical = this.originalSlidesCount + this.cloneCount * 2
    
    // Выбираем ближайший валидный индекс
    let bestPhysical = candidates[0]
    let minDiff = Math.abs(currentPhysical - bestPhysical)
    
    for (const candidate of candidates) {
      // Проверяем валидность индекса (должен быть в пределах массива слайдов)
      if (candidate >= 0 && candidate < totalPhysical) {
        const diff = Math.abs(currentPhysical - candidate)
        if (diff < minDiff) {
          minDiff = diff
          bestPhysical = candidate
        }
      }
    }
    
    return bestPhysical
  }

  /**
   * Вычисляет количество клонов
   * cloneCount = perPage для гарантированного покрытия viewport
   */
  private computeCloneCount(): number {
    const perPage = this.options.perPage || 1
    // Достаточно perPage клонов с каждой стороны
    return Math.min(perPage, this.originalSlidesCount)
  }

  /**
   * Создаёт клоны слайдов
   * 
   * DOM структура для 4 слайдов, count=2:
   * [C3, C4] [1, 2, 3, 4] [C1, C2]
   * prepend   оригиналы    append
   */
  private createClones(): void {
    const container = this.tvist.container
    const originalSlides = Array.from(this.tvist.slides)
    const count = this.cloneCount
    const N = this.originalSlidesCount

    // Маркируем оригинальные слайды ДО клонирования
    originalSlides.forEach((slide, index) => {
      slide.setAttribute('data-tvist-slide-index', String(index))
      slide.setAttribute('data-tvist-original', 'true')
    })

    // Prepend клоны: последние N слайдов [N-count, ..., N-1]
    // Добавляем в обратном порядке через prepend: сначала N-1, потом N-2
    for (let i = count - 1; i >= 0; i--) {
      const originalIndex = N - count + i // для count=2: i=1 → N-1, i=0 → N-2
      const sourceSlide = originalSlides[originalIndex]
      const clone = this.cloneSlide(sourceSlide, originalIndex, 'prepend')
      container.prepend(clone)
      this.clones.push(clone)
    }

    // Append клоны: первые N слайдов [0, 1, ..., count-1]
    for (let i = 0; i < count; i++) {
      const sourceSlide = originalSlides[i]
      const clone = this.cloneSlide(sourceSlide, i, 'append')
      container.appendChild(clone)
      this.clones.push(clone)
    }
  }

  /**
   * Клонирует слайд
   */
  private cloneSlide(source: HTMLElement, originalIndex: number, position: 'prepend' | 'append'): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement
    
    // Маркируем как клон
    clone.setAttribute('data-tvist-clone', 'true')
    clone.setAttribute('data-tvist-slide-index', String(originalIndex))
    clone.classList.add('tvist__slide--clone')
    
    // Удаляем атрибуты оригинала
    clone.removeAttribute('id')
    clone.removeAttribute('data-tvist-original')
    
    return clone
  }

  /**
   * Патчит навигацию для работы с loop
   */
  private patchNavigation(): void {
    // Добавляем геттер realIndex
    Object.defineProperty(this.tvist, 'realIndex', {
      get: () => this.getRealIndex(),
      configurable: true
    })
  }

  /**
   * Конвертирует логический индекс (0..N-1) в физический (с учётом клонов)
   */
  private logicalToPhysical(logicalIndex: number): number {
    // Нормализуем индекс
    const normalized = ((logicalIndex % this.originalSlidesCount) + this.originalSlidesCount) % this.originalSlidesCount
    // Добавляем offset для prepend клонов
    return normalized + this.cloneCount
  }

  /**
   * Конвертирует физический индекс в логический (realIndex)
   */
  private physicalToLogical(physicalIndex: number): number {
    // Физический индекс без клонов
    const withoutClones = physicalIndex - this.cloneCount
    // Нормализуем
    return ((withoutClones % this.originalSlidesCount) + this.originalSlidesCount) % this.originalSlidesCount
  }

  /**
   * Проверяет позицию во время скролла/драга
   * Более плавный переход - проверяет по позиции, а не индексу
   */
  private checkClonePosition(): void {
    const position = this.tvist.engine.location.get()
    const slideWidth = this.tvist.engine.slideWidthValue
    const gap = this.options.gap || 0
    const slideWithGap = slideWidth + gap

    if (slideWithGap === 0) return

    // Вычисляем текущий индекс по позиции (может быть дробным)
    const currentFloatIndex = -position / slideWithGap
    const totalSlides = this.originalSlidesCount + this.cloneCount * 2

    // Границы для прыжка
    const prependBoundary = this.cloneCount - 0.5 // За 0.5 слайда до границы
    const appendBoundary = this.originalSlidesCount + this.cloneCount - 0.5

    // Если близко к prepend клону
    if (currentFloatIndex < prependBoundary) {
      const offset = this.originalSlidesCount * slideWithGap
      const newPosition = position - offset
      this.tvist.engine.location.set(newPosition)
      this.tvist.engine.target.set(newPosition)
      this.tvist.engine.applyTransformPublic()
      
      // Обновляем индекс
      const newIndex = Math.round(-newPosition / slideWithGap)
      this.tvist.engine.index.set(newIndex)

      // Сообщаем о смещении координат (для DragModule)
      const delta = newPosition - position
      this.emit('positionShifted', delta)
      return
    }

    // Если близко к append клону
    if (currentFloatIndex > appendBoundary) {
      const offset = this.originalSlidesCount * slideWithGap
      const newPosition = position + offset
      this.tvist.engine.location.set(newPosition)
      this.tvist.engine.target.set(newPosition)
      this.tvist.engine.applyTransformPublic()
      
      // Обновляем индекс
      const newIndex = Math.round(-newPosition / slideWithGap)
      this.tvist.engine.index.set(newIndex)

      // Сообщаем о смещении координат (для DragModule)
      const delta = newPosition - position
      this.emit('positionShifted', delta)
      return
    }
  }

  /**
   * loopFix - мгновенный прыжок когда достигаем клона
   * Используется после анимации (slideChanged)
   */
  private loopFix(): void {
    const currentIndex = this.tvist.engine.index.get()

    // На prepend клоне (index < cloneCount)
    if (currentIndex < this.cloneCount) {
      const targetIndex = this.originalSlidesCount + currentIndex
      this.jumpTo(targetIndex)
      return
    }

    // На append клоне (index >= originalSlidesCount + cloneCount)
    if (currentIndex >= this.originalSlidesCount + this.cloneCount) {
      const targetIndex = currentIndex - this.originalSlidesCount
      this.jumpTo(targetIndex)
      return
    }
  }

  /**
   * Мгновенный прыжок без анимации
   * Применяет transform напрямую без вызова scrollTo (чтобы избежать событий)
   */
  private jumpTo(physicalIndex: number): void {
    // Останавливаем текущую анимацию
    this.tvist.engine.animator.stop()
    
    // Устанавливаем индекс
    this.tvist.engine.index.set(physicalIndex)
    
    // Вычисляем новую позицию
    const position = -this.tvist.engine.getSlidePosition(physicalIndex)
    
    // Устанавливаем позицию напрямую
    this.tvist.engine.location.set(position)
    this.tvist.engine.target.set(position)
    
    // Применяем transform напрямую через публичный метод
    this.tvist.engine.applyTransformPublic()
  }

  /**
   * Получает realIndex (логический индекс текущего слайда)
   */
  getRealIndex(): number {
    const physicalIndex = this.tvist.engine.index.get()
    return this.physicalToLogical(physicalIndex)
  }

  /**
   * Получает количество оригинальных слайдов
   */
  getOriginalSlidesCount(): number {
    return this.originalSlidesCount
  }

  destroy(): void {
    if (!this.isInitialized) {
      return
    }

    // Удаляем клоны
    this.clones.forEach(clone => clone.remove())
    this.clones = []

    // Восстанавливаем оригинальный scrollTo
    // if (this.originalScrollTo) {
    //   this.tvist.engine.scrollTo = this.originalScrollTo
    // }

    // Удаляем атрибуты с оригинальных слайдов
    this.tvist.slides.forEach(slide => {
      slide.removeAttribute('data-tvist-slide-index')
      slide.removeAttribute('data-tvist-original')
    })

    // Удаляем realIndex геттер
    if (Object.getOwnPropertyDescriptor(this.tvist, 'realIndex')) {
      delete (this.tvist as any).realIndex
    }

    // Удаляем резолвер
    if (this.tvist.indexResolver === this.resolveIndex) {
      this.tvist.indexResolver = undefined
    }

    // Обновляем список слайдов
    this.tvist.updateSlidesList()

    this.isInitialized = false
  }
}
