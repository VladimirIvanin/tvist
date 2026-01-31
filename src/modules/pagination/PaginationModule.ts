/**
 * Pagination Module
 * 
 * Типы:
 * - bullets: точки
 * - fraction: 1 / 6
 * - progress: прогресс-бар
 * - custom: кастомный рендер
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class PaginationModule extends Module {
  readonly name = 'pagination'

  private container: HTMLElement | null = null
  private bullets: HTMLElement[] = []
  private clickHandlers = new Map<HTMLElement, () => void>()

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.findOrCreateContainer()

    if (!this.container) {
      console.warn('Tvist Pagination: container not found')
      return
    }

    this.render()
    this.updateActive()

    // Обновляем при изменении слайда
    this.on('slideChanged', () => this.updateActive())
  }

  override destroy(): void {
    this.detachClickHandlers()
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.container = null
    this.bullets = []
  }

  protected override shouldBeActive(): boolean {
    return this.options.pagination !== false
  }

  /**
   * Поиск или создание контейнера
   */
  private findOrCreateContainer(): void {
    const pagination = this.options.pagination

    if (typeof pagination === 'object' && pagination !== null) {
      if (pagination.container) {
        this.container = typeof pagination.container === 'string'
          ? document.querySelector(pagination.container)
          : pagination.container
      }
    }

    // Если не найден - ищем по дефолтному классу
    this.container ??= this.tvist.root.querySelector('.tvist__pagination')
  }

  /**
   * Получить тип пагинации
   */
  private getType(): 'bullets' | 'fraction' | 'progress' | 'custom' {
    const pagination = this.options.pagination
    if (typeof pagination === 'object' && pagination !== null) {
      return pagination.type ?? 'bullets'
    }
    return 'bullets'
  }

  /**
   * Рендер пагинации
   */
  private render(): void {
    if (!this.container) return

    const type = this.getType()

    switch (type) {
      case 'bullets':
        this.renderBullets()
        break
      case 'fraction':
        this.renderFraction()
        break
      case 'progress':
        this.renderProgress()
        break
      case 'custom':
        this.renderCustom()
        break
    }
  }

  /**
   * Рендер bullets
   */
  private renderBullets(): void {
    if (!this.container) return
    const container = this.container

    const { slides } = this.tvist
    const pagination = this.options.pagination
    const clickable = typeof pagination === 'object' && pagination !== null
      ? pagination.clickable ?? true
      : true
    const bulletClass = typeof pagination === 'object' && pagination !== null
      ? pagination.bulletClass ?? 'tvist__bullet'
      : 'tvist__bullet'

    this.container.innerHTML = ''
    this.bullets = []
    this.detachClickHandlers()

    // Вычисляем количество страниц с учетом perPage
    const perPage = this.options.perPage ?? 1
    const slideCount = slides.length
    const isLoop = this.options.loop === true
    
    // Вычисляем endIndex (последний допустимый индекс)
    const endIndex = isLoop ? slideCount - 1 : Math.max(0, slideCount - perPage)
    
    // Используем количество возможных позиций (snap points) вместо страниц
    // Если слайдов нет, то 0 страниц
    const pageCount = slideCount === 0 ? 0 : endIndex + 1

    // Создаем точки для каждой возможной позиции
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      let bulletHTML: string

      // Кастомный рендер
      if (typeof pagination === 'object' && pagination?.renderBullet) {
        bulletHTML = pagination.renderBullet(pageIndex, bulletClass)
      } else {
        bulletHTML = `<span class="${bulletClass}" data-index="${pageIndex}"></span>`
      }

      const bullet = this.createElementFromHTML(bulletHTML)
      container.appendChild(bullet)
      this.bullets.push(bullet)

      // Clickable - переходим к соответствующему индексу
      if (clickable) {
        const slideIndex = pageIndex
        
        const handler = () => this.tvist.scrollTo(slideIndex)
        this.clickHandlers.set(bullet, handler)
        bullet.addEventListener('click', handler)
        bullet.style.cursor = 'pointer'
      }
    }
  }

  /**
   * Рендер fraction
   */
  private renderFraction(): void {
    if (!this.container) return

    const pagination = this.options.pagination
    const { slides } = this.tvist
    const perPage = this.options.perPage ?? 1
    const slideCount = slides.length
    const isLoop = this.options.loop === true
    const endIndex = isLoop ? slideCount - 1 : Math.max(0, slideCount - perPage)
    
    const currentPage = this.tvist.activeIndex + 1
    const totalPages = slideCount === 0 ? 0 : endIndex + 1
    
    let html: string

    if (typeof pagination === 'object' && pagination?.renderFraction) {
      html = pagination.renderFraction(currentPage, totalPages)
    } else {
      html = `
        <span class="tvist__pagination-current">${currentPage}</span>
        <span class="tvist__pagination-separator"> / </span>
        <span class="tvist__pagination-total">${totalPages}</span>
      `
    }

    this.container.innerHTML = html
  }

  /**
   * Рендер progress
   */
  private renderProgress(): void {
    if (!this.container) return

    const { slides } = this.tvist
    const perPage = this.options.perPage ?? 1
    const slideCount = slides.length
    const isLoop = this.options.loop === true
    const endIndex = isLoop ? slideCount - 1 : Math.max(0, slideCount - perPage)

    const currentPage = this.tvist.activeIndex + 1
    const totalPages = slideCount === 0 ? 0 : endIndex + 1
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0

    this.container.innerHTML = `
      <div class="tvist__pagination-progress">
        <div class="tvist__pagination-progress-bar" style="width: ${progress}%"></div>
      </div>
    `
  }

  /**
   * Рендер custom
   */
  private renderCustom(): void {
    if (!this.container) return

    const pagination = this.options.pagination

    if (typeof pagination === 'object' && pagination?.renderCustom) {
      const html = pagination.renderCustom(
        this.tvist.activeIndex + 1,
        this.tvist.slides.length
      )
      this.container.innerHTML = html
    }
  }

  /**
   * Обновление активного элемента
   */
  private updateActive(): void {
    if (!this.container) return

    const type = this.getType()

    switch (type) {
      case 'bullets':
        this.updateBulletsActive()
        break
      case 'fraction':
        this.renderFraction() // Перерисовываем fraction
        break
      case 'progress':
        this.updateProgressActive()
        break
      case 'custom':
        this.renderCustom() // Перерисовываем custom
        break
    }
  }

  /**
   * Обновление активного bullet
   */
  private updateBulletsActive(): void {
    const pagination = this.options.pagination
    const activeClass = typeof pagination === 'object' && pagination !== null
      ? pagination.bulletActiveClass ?? 'active'
      : 'active'

    // Текущая страница соответствует индексу
    const currentPage = this.tvist.activeIndex

    this.bullets.forEach((bullet, pageIndex) => {
      if (pageIndex === currentPage) {
        bullet.classList.add(activeClass)
        bullet.setAttribute('aria-current', 'true')
      } else {
        bullet.classList.remove(activeClass)
        bullet.removeAttribute('aria-current')
      }
    })
  }

  /**
   * Обновление progress bar
   */
  private updateProgressActive(): void {
    const progressBar = this.container?.querySelector<HTMLElement>('.tvist__pagination-progress-bar')
    if (progressBar) {
      const { slides } = this.tvist
      const perPage = this.options.perPage ?? 1
      const slideCount = slides.length
      const isLoop = this.options.loop === true
      const endIndex = isLoop ? slideCount - 1 : Math.max(0, slideCount - perPage)

      const currentPage = this.tvist.activeIndex + 1
      const totalPages = slideCount === 0 ? 0 : endIndex + 1
      const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0
      progressBar.style.width = `${progress}%`
    }
  }

  /**
   * Создание элемента из HTML строки
   */
  private createElementFromHTML(html: string): HTMLElement {
    const template = document.createElement('template')
    template.innerHTML = html.trim()
    return template.content.firstChild as HTMLElement
  }

  /**
   * Отключение click handlers
   */
  private detachClickHandlers(): void {
    this.clickHandlers.forEach((handler, bullet) => {
      bullet.removeEventListener('click', handler)
    })
    this.clickHandlers.clear()
  }

  /**
   * Хук при обновлении
   */
  override onUpdate(): void {
    // При изменении количества слайдов - перерисовываем
    const type = this.getType()
    if (type === 'bullets') {
      this.render()
      this.updateActive()
    }
  }
}

