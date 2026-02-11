/**
 * SlideStatesModule - управление классами состояний слайдов
 * Применяет классы active, prev, next, visible к слайдам
 */

import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class SlideStatesModule extends Module {
  readonly name = 'slide-states'

  // Классы состояний
  private readonly CLASS_ACTIVE = TVIST_CLASSES.slideActive
  private readonly CLASS_PREV = TVIST_CLASSES.slidePrev
  private readonly CLASS_NEXT = TVIST_CLASSES.slideNext
  private readonly CLASS_VISIBLE = TVIST_CLASSES.slideVisible

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    // Обновляем классы при создании
    this.updateClasses()

    // Слушаем события изменения слайдов
    this.tvist.on('slideChangeStart', () => this.updateClasses())
    this.tvist.on('slideChangeEnd', () => this.updateClasses())
    this.tvist.on('scroll', () => this.updateVisibleClasses())
  }

  override onUpdate(): void {
    this.updateClasses()
  }

  /**
   * Обновление всех классов состояний
   */
  private updateClasses(): void {
    this.updateActiveClasses()
    this.updateVisibleClasses()
  }

  /**
   * Обновление классов активного, предыдущего и следующего слайдов
   */
  private updateActiveClasses(): void {
    const slides = this.tvist.slides
    const activeIndex = this.tvist.activeIndex
    const activeSlide = slides[activeIndex]

    if (!activeSlide) return

    // Режим Loop: по атрибуту на слайде (после инита Loop) или по опции (до проставления атрибутов)
    const activeAttr = activeSlide.getAttribute('data-tvist-slide-index')
    const isLoop = activeAttr !== null || this.options.loop === true

    let activeLogicalIndex = activeIndex
    let originalCount = slides.length

    if (activeAttr !== null) {
      activeLogicalIndex = parseInt(activeAttr, 10)
      
      // Считаем количество оригинальных слайдов
      const originalsCount = slides.reduce((count, slide) => {
        return slide.hasAttribute('data-tvist-original') ? count + 1 : count
      }, 0)
      
      if (originalsCount > 0) {
        originalCount = originalsCount
      }
    }

    // Вычисляем целевые логические индексы для prev/next
    let prevTargetIndex = activeLogicalIndex - 1
    let nextTargetIndex = activeLogicalIndex + 1

    if (isLoop) {
      // В loop режиме индексы циклические относительно originalCount
      prevTargetIndex = (activeLogicalIndex - 1 + originalCount) % originalCount
      nextTargetIndex = (activeLogicalIndex + 1) % originalCount
    }

    slides.forEach((slide, index) => {
      let currentLogicalIndex = index

      // В режиме loop используем логический индекс из атрибута
      if (isLoop) {
        const attr = slide.getAttribute('data-tvist-slide-index')
        if (attr !== null) {
          currentLogicalIndex = parseInt(attr, 10)
        }
      }

      // Проверяем совпадение
      const isActive = currentLogicalIndex === activeLogicalIndex
      let isPrev = false
      let isNext = false

      if (isLoop) {
        // В loop режиме сравниваем логические индексы (включая клоны)
        isPrev = currentLogicalIndex === prevTargetIndex
        isNext = currentLogicalIndex === nextTargetIndex
      } else {
        // В обычном режиме сравниваем физические индексы
        isPrev = index === activeIndex - 1
        isNext = index === activeIndex + 1
      }

      // Классы active/prev/next проставляются независимо от видимости
      // (даже если слайд находится вне viewport)
      this.toggleClass(slide, this.CLASS_ACTIVE, isActive)
      this.toggleClass(slide, this.CLASS_PREV, isPrev)
      this.toggleClass(slide, this.CLASS_NEXT, isNext)
    })
  }

  /**
   * Обновление классов видимости слайдов
   * Проверяет, находится ли слайд (полностью или частично) в видимой области
   */
  private updateVisibleClasses(): void {
    const slides = this.tvist.slides
    const rootRect = this.tvist.root.getBoundingClientRect()
    const isVertical = this.options.direction === 'vertical'

    slides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect()
      const isVisible = isVertical
        ? this.isVerticallyVisible(slideRect, rootRect)
        : this.isHorizontallyVisible(slideRect, rootRect)

      const hadVisible = slide.classList.contains(this.CLASS_VISIBLE)
      if (isVisible && !hadVisible) {
        slide.classList.add(this.CLASS_VISIBLE)
        this.tvist.emit('visible', slide, index)
      } else if (!isVisible && hadVisible) {
        slide.classList.remove(this.CLASS_VISIBLE)
        this.tvist.emit('hidden', slide, index)
      }
    })
  }

  /**
   * Проверка горизонтальной видимости слайда
   */
  private isHorizontallyVisible(
    slideRect: DOMRect,
    rootRect: DOMRect
  ): boolean {
    // Слайд видим, если он имеет значительное пересечение с viewport
    // Используем порог 1px чтобы избежать ложных срабатываний при касании краев
    const THRESHOLD = 1
    return (
      slideRect.left < rootRect.right - THRESHOLD &&
      slideRect.right > rootRect.left + THRESHOLD
    )
  }

  /**
   * Проверка вертикальной видимости слайда
   */
  private isVerticallyVisible(
    slideRect: DOMRect,
    rootRect: DOMRect
  ): boolean {
    // Слайд видим, если он имеет значительное пересечение с viewport
    // Используем порог 1px чтобы избежать ложных срабатываний при касании краев
    const THRESHOLD = 1
    return (
      slideRect.top < rootRect.bottom - THRESHOLD &&
      slideRect.bottom > rootRect.top + THRESHOLD
    )
  }

  /**
   * Переключение класса элемента
   */
  private toggleClass(
    element: HTMLElement,
    className: string,
    condition: boolean
  ): void {
    if (condition && !element.classList.contains(className)) {
      element.classList.add(className)
    } else if (!condition && element.classList.contains(className)) {
      element.classList.remove(className)
    }
  }

  override destroy(): void {
    // Удаляем все классы состояний
    const slides = this.tvist.slides
    slides.forEach((slide) => {
      slide.classList.remove(
        this.CLASS_ACTIVE,
        this.CLASS_PREV,
        this.CLASS_NEXT,
        this.CLASS_VISIBLE
      )
    })
  }
}
