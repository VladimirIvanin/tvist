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
import { TVIST_CLASSES, NAVIGATION_ARROW_SVG } from '../../core/constants'
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
      if (this.options.debug) {
        console.warn('Tvist Navigation: arrows not found')
      }
      return
    }

    this.injectArrowIcons()
    this.attachEvents()
    this.updateArrowsState()
    this.emit('navigation:mounted')

    // Обновляем состояние при изменении слайда
    this.on('slideChangeEnd', () => this.updateArrowsState())
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
    this.prevButton ??= this.tvist.root.querySelector<HTMLElement>(`.${TVIST_CLASSES.arrowPrev}`)
    this.nextButton ??= this.tvist.root.querySelector<HTMLElement>(`.${TVIST_CLASSES.arrowNext}`)
  }

  /**
   * Вставка SVG иконок в кнопки навигации
   * 1. Проверяем опцию addIcons (по умолчанию true)
   * 2. Проверяем, что кнопка имеет класс стрелки (prev/next)
   * 3. Проверяем, что в кнопке нет дочерних элементов (пользователь не добавил свой контент)
   */
  private injectArrowIcons(): void {
    const arrows = this.options.arrows
    const addIcons = typeof arrows === 'object' && arrows !== null
      ? arrows.addIcons ?? true
      : true

    if (!addIcons) return

    this.injectIconIntoButton(this.prevButton, 'prev')
    this.injectIconIntoButton(this.nextButton, 'next')
  }

  /**
   * Вставка иконки в конкретную кнопку
   */
  private injectIconIntoButton(button: HTMLElement | null, direction: 'prev' | 'next'): void {
    if (!button) return

    const arrowClass = direction === 'prev' ? TVIST_CLASSES.arrowPrev : TVIST_CLASSES.arrowNext

    // Проверяем что кнопка имеет класс стрелки
    if (!button.classList.contains(arrowClass)) return

    // Проверяем что в кнопке нет дочерних элементов (пользователь не добавил свой контент)
    if (button.children.length > 0) return

    // Проверяем что в кнопке нет текстового контента
    const textContent = button.textContent?.trim()
    if (textContent && textContent.length > 0) return

    // Вставляем SVG
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = NAVIGATION_ARROW_SVG
    const svgElement = tempDiv.querySelector('svg')
    
    if (svgElement) {
      button.appendChild(svgElement)
    }
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

    // Если слайдер заблокирован (контент влезает), отключаем и скрываем стрелки
    if (this.tvist.engine.isLocked) {
      this.disableArrow(this.prevButton, disabledClass)
      this.disableArrow(this.nextButton, disabledClass)
      this.hideArrow(this.prevButton, hiddenClass)
      this.hideArrow(this.nextButton, hiddenClass)
      return
    }

    // С loop или rewind всегда можно листать (если не заблокирован)
    if (this.options.loop || this.options.rewind) {
      this.enableArrow(this.prevButton, disabledClass)
      this.enableArrow(this.nextButton, disabledClass)
      this.showArrow(this.prevButton, hiddenClass)
      this.showArrow(this.nextButton, hiddenClass)
      return
    }

    // Без loop и rewind проверяем границы
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

