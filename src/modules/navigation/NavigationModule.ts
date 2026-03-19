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
    
    // Обновляем состояние при lock/unlock (для breakpoints)
    this.on('lock', () => this.updateArrowsState())
    this.on('unlock', () => this.updateArrowsState())
  }

  override destroy(): void {
    this.detachEvents()
    this.prevButton = null
    this.nextButton = null
  }

  public override shouldBeActive(): boolean {
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
        if (typeof arrows.prev === 'string') {
          this.prevButton = document.querySelector(arrows.prev)
        } else if (arrows.prev instanceof Element || (arrows.prev as HTMLElement).classList !== undefined) {
          this.prevButton = arrows.prev as HTMLElement
        }
      }
      if (arrows.next) {
        if (typeof arrows.next === 'string') {
          this.nextButton = document.querySelector(arrows.next)
        } else if (arrows.next instanceof Element || (arrows.next as HTMLElement).classList !== undefined) {
          this.nextButton = arrows.next as HTMLElement
        }
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
   * Вычисляет количество страниц с учетом perPage и slidesPerGroup
   */
  private calculatePageCount(): number {
    const { slides, options } = this.tvist
    const perPage = options.perPage ?? 1
    const slidesPerGroup = options.slidesPerGroup ?? 1
    const slideCount = slides.length
    const isLoop = options.loop === true

    if (slideCount === 0) return 0

    // В loop режиме можно листать по всем слайдам
    if (isLoop) {
      return Math.ceil(slideCount / slidesPerGroup)
    }

    // Без loop: вычисляем количество возможных позиций
    const endIndex = Math.max(0, slideCount - perPage)
    return Math.ceil((endIndex + 1) / slidesPerGroup)
  }

  /**
   * Обновление состояния стрелок
   */
  private updateArrowsState(): void {
    if (!this.prevButton || !this.nextButton) return

    const { canScrollPrev, canScrollNext } = this.tvist
    const arrows = this.options.arrows
    const disabledClass = typeof arrows === 'object' && arrows !== null
      ? arrows.disabledClass ?? TVIST_CLASSES.arrowDisabled
      : TVIST_CLASSES.arrowDisabled
    const hiddenClass = typeof arrows === 'object' && arrows !== null
      ? arrows.hiddenClass ?? TVIST_CLASSES.arrowHidden
      : TVIST_CLASSES.arrowHidden
    const hideWhenSinglePage = typeof arrows === 'object' && arrows !== null
      ? arrows.hideWhenSinglePage ?? true
      : true

    // Если слайдер заблокирован (контент влезает), отключаем стрелки
    if (this.tvist.engine.isLocked) {
      this.disableArrow(this.prevButton, disabledClass)
      this.disableArrow(this.nextButton, disabledClass)
      
      // Скрываем только если hideWhenSinglePage включен
      if (hideWhenSinglePage) {
        this.hideArrow(this.prevButton, hiddenClass)
        this.hideArrow(this.nextButton, hiddenClass)
        this.updateRootClass(true)
      } else {
        this.showArrow(this.prevButton, hiddenClass)
        this.showArrow(this.nextButton, hiddenClass)
        this.updateRootClass(false)
      }
      return
    }

    // Проверяем количество страниц для hideWhenSinglePage
    const pageCount = this.calculatePageCount()
    if (hideWhenSinglePage && pageCount <= 1) {
      this.hideArrow(this.prevButton, hiddenClass)
      this.hideArrow(this.nextButton, hiddenClass)
      this.updateRootClass(true)
      return
    }

    // Показываем стрелки (убираем класс single-page)
    this.updateRootClass(false)

    // С loop или rewind всегда можно листать (если не заблокирован)
    if (this.options.loop || this.options.rewind) {
      this.enableArrow(this.prevButton, disabledClass)
      this.enableArrow(this.nextButton, disabledClass)
      this.showArrow(this.prevButton, hiddenClass)
      this.showArrow(this.nextButton, hiddenClass)
      return
    }

    // Показываем обе стрелки (они не single-page и не locked)
    this.showArrow(this.prevButton, hiddenClass)
    this.showArrow(this.nextButton, hiddenClass)

    // Без loop и rewind проверяем границы для disabled состояния
    if (canScrollPrev) {
      this.enableArrow(this.prevButton, disabledClass)
    } else {
      this.disableArrow(this.prevButton, disabledClass)
    }

    if (canScrollNext) {
      this.enableArrow(this.nextButton, disabledClass)
    } else {
      this.disableArrow(this.nextButton, disabledClass)
    }
  }

  /**
   * Обновление класса single-page на root элементе
   */
  private updateRootClass(isSinglePage: boolean): void {
    if (isSinglePage) {
      this.tvist.root.classList.add(TVIST_CLASSES.singlePage)
    } else {
      this.tvist.root.classList.remove(TVIST_CLASSES.singlePage)
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

