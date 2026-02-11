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
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

const PAGINATION_DEBUG = false
const log = (..._args: unknown[]) => {
  if (PAGINATION_DEBUG) {
    // debug logging
  }
}

/**
 * Структура группы слайдов для точки пагинации
 */
interface BulletGroup {
  /** Индекс начального слайда группы */
  startIndex: number
  /** Индекс конечного слайда группы (включительно) */
  endIndex: number
  /** Количество слайдов в группе */
  count: number
}

export class PaginationModule extends Module {
  readonly name = 'pagination'

  private container: HTMLElement | null = null
  private bullets: HTMLElement[] = []
  private clickHandlers = new Map<HTMLElement, () => void>()
  
  // Счётчик обновлений для отладки
  private updateCounter = 0
  
  // Группы слайдов для каждой точки (используется при limit)
  private bulletGroups: BulletGroup[] = []
  
  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.findOrCreateContainer()

    if (!this.container) {
      if (this.options.debug) {
        console.warn('Tvist Pagination: container not found')
      }
      return
    }

    log('Init', {
      loop: this.options.loop,
      perPage: this.options.perPage,
      slidesCount: this.tvist.slides.length,
      hasRealIndexGetter: 'realIndex' in this.tvist
    })

    this.render()
    this.updateActive()
    this.emit('pagination:mounted')

    // Обновляем при изменении слайда СИНХРОННО (slideChangeStart эмитится ДО анимации),
    // чтобы к моменту slideChangeEnd (после анимации) bullet'ы были уже актуальны.
    // Также слушаем slideChangeEnd для instant-переходов (scrollTo с instant=true).
    this.on('slideChangeStart', (_index: number) => {
      this.updateActive()
    })
    
    this.on('slideChangeEnd', (_index: number) => {
      this.updateActive()
      if (this.options.loop) this.scheduleUpdateActive()
    })
    
    // Для loop режима нужны дополнительные события
    if (this.options.loop) {
      this.on('loopFix', () => {
        this.updateActive()
        this.scheduleUpdateActive()
      })
      
      this.on('transitionEnd', () => {
        this.updateActive()
        this.scheduleUpdateActive()
      })
    }
  }
  
  /** Дополнительное отложенное обновление (для loop: после применения DOM/индекса) */
  private scheduleUpdateActive(): void {
    if (this.updateScheduled) return
    this.updateScheduled = true
    requestAnimationFrame(() => {
      this.updateActive()
      this.updateScheduled = false
    })
  }
  
  private updateScheduled = false

  override destroy(): void {
    this.detachClickHandlers()
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.container = null
    this.bullets = []
  }

  protected override shouldBeActive(): boolean {
    const { pagination } = this.options
    return !!pagination
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
    this.container ??= this.tvist.root.querySelector(`.${TVIST_CLASSES.pagination}`)
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
   * Вычисление групп слайдов при использовании limit
   * @param totalSlides - общее количество слайдов
   * @param limit - максимальное количество точек
   * @returns массив групп слайдов для каждой точки
   */
  private calculateBulletGroups(totalSlides: number, limit: number): BulletGroup[] {
    const pagination = this.options.pagination
    const strategy = typeof pagination === 'object' && pagination !== null
      ? pagination.strategy ?? 'even'
      : 'even'

    if (strategy === 'even') {
      return this.calculateEvenGroups(totalSlides, limit)
    } else {
      return this.calculateCenterGroups(totalSlides, limit)
    }
  }

  /**
   * Равномерное распределение слайдов по точкам
   * @param totalSlides - общее количество слайдов
   * @param limit - количество точек
   */
  private calculateEvenGroups(totalSlides: number, limit: number): BulletGroup[] {
    const pagination = this.options.pagination
    const remainderStrategy = typeof pagination === 'object' && pagination !== null
      ? pagination.remainderStrategy ?? 'center'
      : 'center'

    const groups: BulletGroup[] = []
    const baseSize = Math.floor(totalSlides / limit)
    const remainder = totalSlides % limit

    let currentIndex = 0

    for (let i = 0; i < limit; i++) {
      let groupSize = baseSize
      
      // Распределяем остаток
      if (remainder > 0) {
        if (remainderStrategy === 'left') {
          // Добавляем к левым точкам
          if (i < remainder) {
            groupSize++
          }
        } else if (remainderStrategy === 'center') {
          // Добавляем к центральным точкам
          const startOffset = Math.ceil((limit - remainder) / 2)
          if (i >= startOffset && i < startOffset + remainder) {
            groupSize++
          }
        } else if (remainderStrategy === 'right') {
          // Добавляем к правым точкам
          if (i >= limit - remainder) {
            groupSize++
          }
        }
      }

      groups.push({
        startIndex: currentIndex,
        endIndex: currentIndex + groupSize - 1,
        count: groupSize
      })

      currentIndex += groupSize
    }

    return groups
  }

  /**
   * Центральное распределение слайдов по точкам
   * Крайние точки (первая и последняя) = 1 слайд
   * Центральные точки = делим оставшиеся слайды
   * @param totalSlides - общее количество слайдов
   * @param limit - количество точек
   */
  private calculateCenterGroups(totalSlides: number, limit: number): BulletGroup[] {
    const groups: BulletGroup[] = []

    if (limit === 1) {
      // Одна точка - все слайды
      groups.push({
        startIndex: 0,
        endIndex: totalSlides - 1,
        count: totalSlides
      })
      return groups
    }

    if (limit === 2) {
      // Две точки - делим пополам
      const half = Math.ceil(totalSlides / 2)
      groups.push({
        startIndex: 0,
        endIndex: half - 1,
        count: half
      })
      groups.push({
        startIndex: half,
        endIndex: totalSlides - 1,
        count: totalSlides - half
      })
      return groups
    }

    // Для limit >= 3
    // Первая точка - первый слайд
    groups.push({
      startIndex: 0,
      endIndex: 0,
      count: 1
    })

    // Последняя точка - последний слайд
    const lastSlideIndex = totalSlides - 1
    
    // Центральные точки - делим оставшиеся слайды
    const centerPoints = limit - 2
    const centerSlidesCount = totalSlides - 2
    const baseCenterSize = Math.floor(centerSlidesCount / centerPoints)
    const centerRemainder = centerSlidesCount % centerPoints

    let currentIndex = 1

    for (let i = 0; i < centerPoints; i++) {
      let groupSize = baseCenterSize
      
      // Распределяем остаток равномерно (в центре)
      const startOffset = Math.ceil((centerPoints - centerRemainder) / 2)
      if (i >= startOffset && i < startOffset + centerRemainder) {
        groupSize++
      }

      groups.push({
        startIndex: currentIndex,
        endIndex: currentIndex + groupSize - 1,
        count: groupSize
      })

      currentIndex += groupSize
    }

    // Последняя точка
    groups.push({
      startIndex: lastSlideIndex,
      endIndex: lastSlideIndex,
      count: 1
    })

    return groups
  }

  /**
   * Определить индекс активной точки по текущему индексу слайда
   * @param slideIndex - текущий индекс слайда
   * @returns индекс активной точки
   */
  private getActiveBulletIndex(slideIndex: number): number {
    if (this.bulletGroups.length === 0) {
      return slideIndex
    }

    // Ищем группу, в которую попадает текущий слайд
    for (let i = 0; i < this.bulletGroups.length; i++) {
      const group = this.bulletGroups[i]
      if (group && slideIndex >= group.startIndex && slideIndex <= group.endIndex) {
        return i
      }
    }

    // Fallback
    return 0
  }

  /**
   * Получить текущий индекс слайда с учётом loop режима
   * В loop режиме используем realIndex, иначе activeIndex
   */
  private getCurrentSlideIndex(): number {
    const activeIndex = this.tvist.activeIndex
    
    if (!this.options.loop) {
      return activeIndex
    }
    
    // В loop режиме всегда пытаемся получить realIndex
    // Сначала проверяем геттер (если LoopModule установил его)
    const hasRealIndexGetter = 'realIndex' in this.tvist
    const realIndexFromGetter = hasRealIndexGetter ? this.tvist.realIndex : undefined
    
    // Если геттер вернул число, используем его
    if (typeof realIndexFromGetter === 'number') {
      return realIndexFromGetter
    }
    
    // Fallback: вычисляем realIndex из data-tvist-slide-index
    const activeSlide = this.tvist.slides[activeIndex]
    if (activeSlide) {
      const dataIndex = activeSlide.getAttribute('data-tvist-slide-index')
      if (dataIndex !== null && dataIndex !== '') {
        const calculatedRealIndex = parseInt(dataIndex, 10)
        if (!isNaN(calculatedRealIndex)) {
          log('getCurrentSlideIndex (calculated from data-attr)', {
            activeIndex,
            calculatedRealIndex,
            hasGetter: hasRealIndexGetter,
            getterValue: realIndexFromGetter
          })
          return calculatedRealIndex
        }
      }
    }
    
    // Последний fallback: activeIndex
    log('getCurrentSlideIndex (fallback to activeIndex)', {
      activeIndex,
      hasGetter: hasRealIndexGetter,
      getterValue: realIndexFromGetter,
      slideHasDataAttr: activeSlide?.hasAttribute('data-tvist-slide-index')
    })
    return activeIndex
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
      ? pagination.bulletClass ?? TVIST_CLASSES.bullet
      : TVIST_CLASSES.bullet

    this.container.innerHTML = ''
    this.bullets = []
    this.bulletGroups = []
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

    // Проверяем, используется ли лимит
    const limit = typeof pagination === 'object' && pagination?.limit
      ? Math.min(pagination.limit, pageCount)
      : undefined

    // Если используется лимит, вычисляем группы слайдов
    if (limit && limit < pageCount) {
      this.bulletGroups = this.calculateBulletGroups(pageCount, limit)
      
      // Создаем ограниченное количество точек
      for (let bulletIndex = 0; bulletIndex < limit; bulletIndex++) {
        const group = this.bulletGroups[bulletIndex]
        if (!group) continue
        
        let bulletHTML: string

        // Кастомный рендер
        if (typeof pagination === 'object' && pagination?.renderBullet) {
          bulletHTML = pagination.renderBullet(bulletIndex, bulletClass)
        } else {
          bulletHTML = `<span class="${bulletClass}" data-index="${bulletIndex}" data-group-start="${group.startIndex}" data-group-end="${group.endIndex}"></span>`
        }

        const bullet = this.createElementFromHTML(bulletHTML)
        container.appendChild(bullet)
        this.bullets.push(bullet)

        // Clickable - переходим к начальному индексу группы
        if (clickable) {
          const slideIndex = group.startIndex
          
          const handler = () => this.tvist.scrollTo(slideIndex)
          this.clickHandlers.set(bullet, handler)
          bullet.addEventListener('click', handler)
          bullet.style.cursor = 'pointer'
        }
      }
    } else {
      // Обычный режим - создаем точки для каждой возможной позиции
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
    
    const currentPage = this.getCurrentSlideIndex() + 1
    const totalPages = slideCount === 0 ? 0 : endIndex + 1
    
    let html: string

    if (typeof pagination === 'object' && pagination?.renderFraction) {
      html = pagination.renderFraction(currentPage, totalPages)
    } else {
      html = `
        <span class="${TVIST_CLASSES.paginationCurrent}">${currentPage}</span>
        <span class="${TVIST_CLASSES.paginationSeparator}"> / </span>
        <span class="${TVIST_CLASSES.paginationTotal}">${totalPages}</span>
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

    const currentPage = this.getCurrentSlideIndex() + 1
    const totalPages = slideCount === 0 ? 0 : endIndex + 1
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0

    this.container.innerHTML = `
      <div class="${TVIST_CLASSES.paginationProgress}">
        <div class="${TVIST_CLASSES.paginationProgressBar}" style="width: ${progress}%"></div>
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
        this.getCurrentSlideIndex() + 1,
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

    this.updateCounter++
    
    log(`updateActive #${this.updateCounter}`, {
      activeIndex: this.tvist.activeIndex,
      realIndex: this.options.loop ? this.tvist.realIndex : undefined,
      currentSlideIndex: this.getCurrentSlideIndex(),
      type: this.getType()
    })


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

    // Текущая страница соответствует индексу (в loop режиме используем realIndex)
    const currentSlideIndex = this.getCurrentSlideIndex()

    // Если используются группы, определяем активную точку через группы
    const activeBulletIndex = this.bulletGroups.length > 0
      ? this.getActiveBulletIndex(currentSlideIndex)
      : currentSlideIndex

    log('updateBulletsActive', {
      currentSlideIndex,
      activeBulletIndex,
      bulletsCount: this.bullets.length,
      hasGroups: this.bulletGroups.length > 0,
      activeIndex: this.tvist.activeIndex,
      realIndex: this.options.loop ? this.tvist.realIndex : undefined
    })

    this.bullets.forEach((bullet, bulletIndex) => {
      if (bulletIndex === activeBulletIndex) {
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
    const progressBar = this.container?.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`)
    if (progressBar) {
      const { slides } = this.tvist
      const perPage = this.options.perPage ?? 1
      const slideCount = slides.length
      const isLoop = this.options.loop === true
      const endIndex = isLoop ? slideCount - 1 : Math.max(0, slideCount - perPage)

      const currentPage = this.getCurrentSlideIndex() + 1
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

