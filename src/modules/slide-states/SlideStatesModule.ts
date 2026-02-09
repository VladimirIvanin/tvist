/**
 * SlideStatesModule - управление классами состояний слайдов
 * Применяет классы active, prev, next, visible к слайдам
 * На основе Splide (Slide.ts) и Swiper (updateSlidesClasses.mjs)
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
    this.tvist.on('slideChange', () => this.updateClasses())
    this.tvist.on('slideChanged', () => this.updateClasses())
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

    // Проверяем режим Loop по наличию атрибута data-tvist-slide-index на активном слайде
    const activeAttr = activeSlide.getAttribute('data-tvist-slide-index')
    const isLoop = activeAttr !== null

    let activeLogicalIndex = activeIndex
    let originalCount = slides.length

    if (isLoop) {
      activeLogicalIndex = parseInt(activeAttr!, 10)
      
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

      // Применяем классы
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
    // Слайд видим, если его левый край <= правого края root
    // И правый край >= левого края root
    return (
      Math.floor(slideRect.left) < Math.ceil(rootRect.right) &&
      Math.ceil(slideRect.right) > Math.floor(rootRect.left)
    )
  }

  /**
   * Проверка вертикальной видимости слайда
   */
  private isVerticallyVisible(
    slideRect: DOMRect,
    rootRect: DOMRect
  ): boolean {
    // Слайд видим, если его верхний край <= нижнего края root
    // И нижний край >= верхнего края root
    return (
      Math.floor(slideRect.top) < Math.ceil(rootRect.bottom) &&
      Math.ceil(slideRect.bottom) > Math.floor(rootRect.top)
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
