/**
 * Navigation Module
 * 
 * Возможности:
 * - Стрелки prev/next
 * - Disabled состояния на границах
 * - Hidden когда слайдов мало
 * - Accessibility (aria-label)
 * - Кастомные элементы или auto-search
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class NavigationModule extends Module {
  readonly name = 'navigation'

  private prevButton: HTMLElement | null = null
  private nextButton: HTMLElement | null = null

  private prevClickHandler?: () => void
  private nextClickHandler?: () => void

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.findOrCreateArrows()

    if (!this.prevButton || !this.nextButton) {
      console.warn('Tvist Navigation: arrows not found')
      return
    }

    this.attachEvents()
    this.updateArrowsState()

    // Обновляем состояние при изменении слайда
    this.on('slideChanged', () => this.updateArrowsState())
  }

  override destroy(): void {
    this.detachEvents()
    this.prevButton = null
    this.nextButton = null
  }

  protected override shouldBeActive(): boolean {
    const { arrows } = this.options
    return !!arrows
  }

  /**
   * Поиск или создание стрелок
   */
  private findOrCreateArrows(): void {
    const arrows = this.options.arrows

    if (typeof arrows === 'object' && arrows !== null) {
      // Кастомные элементы из опций
      if (arrows.prev) {
        this.prevButton = typeof arrows.prev === 'string' 
          ? document.querySelector(arrows.prev)
          : arrows.prev
      }
      if (arrows.next) {
        this.nextButton = typeof arrows.next === 'string'
          ? document.querySelector(arrows.next)
          : arrows.next
      }
    }

    // Если не найдены - ищем по дефолтным классам
    this.prevButton ??= this.tvist.root.querySelector<HTMLElement>('.tvist__arrow--prev')
    this.nextButton ??= this.tvist.root.querySelector<HTMLElement>('.tvist__arrow--next')
  }

  /**
   * Подключение обработчиков
   */
  private attachEvents(): void {
    if (!this.prevButton || !this.nextButton) return

    this.prevClickHandler = () => this.onPrevClick()
    this.nextClickHandler = () => this.onNextClick()

    this.prevButton.addEventListener('click', this.prevClickHandler)
    this.nextButton.addEventListener('click', this.nextClickHandler)
  }

  /**
   * Отключение обработчиков
   */
  private detachEvents(): void {
    if (this.prevButton && this.prevClickHandler) {
      this.prevButton.removeEventListener('click', this.prevClickHandler)
    }
    if (this.nextButton && this.nextClickHandler) {
      this.nextButton.removeEventListener('click', this.nextClickHandler)
    }
  }

  /**
   * Клик на prev
   */
  private onPrevClick(): void {
    if (!this.prevButton?.hasAttribute('disabled')) {
      this.tvist.prev()
    }
  }

  /**
   * Клик на next
   */
  private onNextClick(): void {
    if (!this.nextButton?.hasAttribute('disabled')) {
      this.tvist.next()
    }
  }

  /**
   * Обновление состояния стрелок
   */
  private updateArrowsState(): void {
    if (!this.prevButton || !this.nextButton) return

    const { canScrollPrev, canScrollNext } = this.tvist
    const arrows = this.options.arrows
    const disabledClass = typeof arrows === 'object' && arrows !== null
      ? arrows.disabledClass ?? 'disabled'
      : 'disabled'
    const hiddenClass = typeof arrows === 'object' && arrows !== null
      ? arrows.hiddenClass ?? 'hidden'
      : 'hidden'

    // С loop всегда можно листать
    if (this.options.loop) {
      this.enableArrow(this.prevButton, disabledClass)
      this.enableArrow(this.nextButton, disabledClass)
      this.showArrow(this.prevButton, hiddenClass)
      this.showArrow(this.nextButton, hiddenClass)
      return
    }

    // Без loop проверяем границы
    if (canScrollPrev) {
      this.enableArrow(this.prevButton, disabledClass)
      this.showArrow(this.prevButton, hiddenClass)
    } else {
      this.disableArrow(this.prevButton, disabledClass)
    }

    if (canScrollNext) {
      this.enableArrow(this.nextButton, disabledClass)
      this.showArrow(this.nextButton, hiddenClass)
    } else {
      this.disableArrow(this.nextButton, disabledClass)
    }

    // Скрываем если слайдов мало
    const { slides, options } = this.tvist
    const perPage = options.perPage ?? 1
    if (slides.length <= perPage) {
      this.hideArrow(this.prevButton, hiddenClass)
      this.hideArrow(this.nextButton, hiddenClass)
    }
  }

  /**
   * Включить стрелку
   */
  private enableArrow(arrow: HTMLElement, disabledClass: string): void {
    arrow.removeAttribute('disabled')
    arrow.classList.remove(disabledClass)
    arrow.setAttribute('aria-disabled', 'false')
  }

  /**
   * Выключить стрелку
   */
  private disableArrow(arrow: HTMLElement, disabledClass: string): void {
    arrow.setAttribute('disabled', '')
    arrow.classList.add(disabledClass)
    arrow.setAttribute('aria-disabled', 'true')
  }

  /**
   * Показать стрелку
   */
  private showArrow(arrow: HTMLElement, hiddenClass: string): void {
    arrow.classList.remove(hiddenClass)
    arrow.setAttribute('aria-hidden', 'false')
  }

  /**
   * Скрыть стрелку
   */
  private hideArrow(arrow: HTMLElement, hiddenClass: string): void {
    arrow.classList.add(hiddenClass)
    arrow.setAttribute('aria-hidden', 'true')
  }

  /**
   * Хук при обновлении
   */
  override onUpdate(): void {
    this.updateArrowsState()
  }
}

