/**
 * SlideStatesModule - управление классами состояний слайдов
 * Применяет классы active, prev, next, visible к слайдам
 * На основе Splide (Slide.ts) и Swiper (updateSlidesClasses.mjs)
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class SlideStatesModule extends Module {
  readonly name = 'slide-states'

  // Классы состояний
  private readonly CLASS_ACTIVE = 'tvist__slide--active'
  private readonly CLASS_PREV = 'tvist__slide--prev'
  private readonly CLASS_NEXT = 'tvist__slide--next'
  private readonly CLASS_VISIBLE = 'tvist__slide--visible'

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
    const isLoop = this.options.loop === true

    slides.forEach((slide, index) => {
      // Определяем, является ли слайд активным
      const isActive = index === activeIndex

      // Определяем prev и next с учётом loop
      let isPrev = false
      let isNext = false

      if (isLoop) {
        // В loop режиме prev/next циклические
        const prevIndex = activeIndex === 0 ? slides.length - 1 : activeIndex - 1
        const nextIndex = activeIndex === slides.length - 1 ? 0 : activeIndex + 1
        isPrev = index === prevIndex
        isNext = index === nextIndex
      } else {
        // Без loop prev/next линейные
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

    slides.forEach((slide) => {
      const slideRect = slide.getBoundingClientRect()
      
      // Определяем видимость слайда
      const isVisible = isVertical
        ? this.isVerticallyVisible(slideRect, rootRect)
        : this.isHorizontallyVisible(slideRect, rootRect)

      this.toggleClass(slide, this.CLASS_VISIBLE, isVisible)
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
