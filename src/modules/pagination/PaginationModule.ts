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
    if (!this.container) {
      this.container = this.tvist.root.querySelector('.tvist__pagination')
    }
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

    slides.forEach((_, index) => {
      let bulletHTML: string

      // Кастомный рендер
      if (typeof pagination === 'object' && pagination?.renderBullet) {
        bulletHTML = pagination.renderBullet(index, bulletClass)
      } else {
        bulletHTML = `<span class="${bulletClass}" data-index="${index}"></span>`
      }

      const bullet = this.createElementFromHTML(bulletHTML)
      this.container!.appendChild(bullet)
      this.bullets.push(bullet)

      // Clickable
      if (clickable) {
        const handler = () => this.tvist.scrollTo(index)
        this.clickHandlers.set(bullet, handler)
        bullet.addEventListener('click', handler)
        bullet.style.cursor = 'pointer'
      }
    })
  }

  /**
   * Рендер fraction
   */
  private renderFraction(): void {
    if (!this.container) return

    const pagination = this.options.pagination
    let html: string

    if (typeof pagination === 'object' && pagination?.renderFraction) {
      html = pagination.renderFraction(
        this.tvist.activeIndex + 1,
        this.tvist.slides.length
      )
    } else {
      html = `
        <span class="tvist__pagination-current">${this.tvist.activeIndex + 1}</span>
        <span class="tvist__pagination-separator"> / </span>
        <span class="tvist__pagination-total">${this.tvist.slides.length}</span>
      `
    }

    this.container.innerHTML = html
  }

  /**
   * Рендер progress
   */
  private renderProgress(): void {
    if (!this.container) return

    const progress = ((this.tvist.activeIndex + 1) / this.tvist.slides.length) * 100

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

    this.bullets.forEach((bullet, index) => {
      if (index === this.tvist.activeIndex) {
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
      const progress = ((this.tvist.activeIndex + 1) / this.tvist.slides.length) * 100
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

