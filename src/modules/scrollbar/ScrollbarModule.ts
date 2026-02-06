/**
 * Scrollbar - модуль кастомного скроллбара для навигации слайдера
 * Поддерживает горизонтальное и вертикальное направление
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

interface ScrollbarOptions {
  /** Селектор или элемент для контейнера скроллбара */
  container?: string | HTMLElement
  /** Автоматически скрывать скроллбар при бездействии */
  hide?: boolean
  /** Задержка перед скрытием (мс) */
  hideDelay?: number
  /** CSS класс для скроллбара */
  scrollbarClass?: string
  /** CSS класс для трека скроллбара */
  trackClass?: string
  /** CSS класс для ползунка */
  thumbClass?: string
  /** Возможность перетаскивания ползунка */
  draggable?: boolean
}

export class ScrollbarModule extends Module {
  readonly name = 'Scrollbar'

  // DOM элементы
  private scrollbarEl?: HTMLElement
  private trackEl?: HTMLElement
  private thumbEl?: HTMLElement
  private isCustomContainer = false

  // Настройки
  private hide: boolean
  private hideDelay: number
  private draggable: boolean

  // Состояние
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragStartScroll = 0
  private hideTimer?: number

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    const scrollbarOptions = this.getScrollbarOptions()
    this.hide = scrollbarOptions.hide ?? false
    this.hideDelay = scrollbarOptions.hideDelay ?? 1000
    this.draggable = scrollbarOptions.draggable ?? true
  }

  /**
   * Получить опции scrollbar из конфигурации
   */
  private getScrollbarOptions(): ScrollbarOptions {
    const scrollbar = this.options.scrollbar
    
    if (typeof scrollbar === 'boolean') {
      return {}
    }
    
    return scrollbar ?? {}
  }

  /**
   * Проверить, должен ли модуль быть активен
   */
  protected override shouldBeActive(): boolean {
    return this.options.scrollbar !== false && this.options.scrollbar !== undefined
  }

  override init(): void {
    if (!this.shouldBeActive()) {
      return
    }

    this.createScrollbar()
    this.attachEventListeners()
    this.updateScrollbar()
  }

  /**
   * Создать элементы скроллбара
   */
  private createScrollbar(): void {
    const scrollbarOptions = this.getScrollbarOptions()
    const isVertical = this.options.direction === 'vertical'

    // Проверяем, указан ли кастомный контейнер
    if (scrollbarOptions.container) {
      const container = typeof scrollbarOptions.container === 'string'
        ? document.querySelector<HTMLElement>(scrollbarOptions.container)
        : scrollbarOptions.container

      if (container) {
        this.scrollbarEl = container
        this.isCustomContainer = true
      }
    }

    // Если кастомный контейнер не указан, создаём свой
    if (!this.scrollbarEl) {
      this.scrollbarEl = document.createElement('div')
      this.scrollbarEl.className = scrollbarOptions.scrollbarClass ?? 'tvist__scrollbar'
      
      // Добавляем класс направления
      if (isVertical) {
        this.scrollbarEl.classList.add('tvist__scrollbar--vertical')
      } else {
        this.scrollbarEl.classList.add('tvist__scrollbar--horizontal')
      }

      this.tvist.root.appendChild(this.scrollbarEl)
    }

    // Создаём трек и ползунок
    this.trackEl = document.createElement('div')
    this.trackEl.className = scrollbarOptions.trackClass ?? 'tvist__scrollbar-track'

    this.thumbEl = document.createElement('div')
    this.thumbEl.className = scrollbarOptions.thumbClass ?? 'tvist__scrollbar-thumb'

    this.trackEl.appendChild(this.thumbEl)
    this.scrollbarEl.appendChild(this.trackEl)

    // Применяем класс hide если нужно
    if (this.hide) {
      this.scrollbarEl.classList.add('tvist__scrollbar--hidden')
    }
  }

  /**
   * Прикрепить обработчики событий
   */
  private attachEventListeners(): void {
    if (!this.scrollbarEl || !this.thumbEl || !this.trackEl) return

    // Клик по треку (переход к позиции)
    this.trackEl.addEventListener('click', this.handleTrackClick)

    // Перетаскивание ползунка
    if (this.draggable) {
      this.thumbEl.addEventListener('mousedown', this.handleThumbMouseDown)
      this.thumbEl.addEventListener('touchstart', this.handleThumbTouchStart, { passive: true })
    }

    // События слайдера
    this.on('scroll', this.handleScroll)
    this.on('slideChanged', this.handleSlideChanged)

    // Автоскрытие
    if (this.hide) {
      this.tvist.root.addEventListener('mouseenter', this.showScrollbar)
      this.tvist.root.addEventListener('mouseleave', this.startHideTimer)
    }
  }

  /**
   * Обработчик клика по треку
   */
  private handleTrackClick = (event: MouseEvent): void => {
    if (!this.trackEl || !this.thumbEl) return
    if (event.target === this.thumbEl) return // Игнорируем клик по ползунку

    const isVertical = this.options.direction === 'vertical'
    const rect = this.trackEl.getBoundingClientRect()
    
    let clickPosition: number
    let trackSize: number

    if (isVertical) {
      clickPosition = event.clientY - rect.top
      trackSize = rect.height
    } else {
      clickPosition = event.clientX - rect.left
      trackSize = rect.width
    }

    // Вычисляем процент клика
    const percent = clickPosition / trackSize
    
    // Вычисляем целевой индекс
    const slideCount = this.tvist.slides.length
    const targetIndex = Math.round(percent * (slideCount - 1))

    // Переходим к слайду
    this.tvist.scrollTo(targetIndex)
  }

  /**
   * Обработчик начала перетаскивания (мышь)
   */
  private handleThumbMouseDown = (event: MouseEvent): void => {
    event.preventDefault()
    this.startDrag(event.clientX, event.clientY)

    document.addEventListener('mousemove', this.handleThumbMouseMove)
    document.addEventListener('mouseup', this.handleThumbMouseUp)
  }

  /**
   * Обработчик начала перетаскивания (тач)
   */
  private handleThumbTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) return

    const touch = event.touches[0]
    if (!touch) return
    
    this.startDrag(touch.clientX, touch.clientY)

    document.addEventListener('touchmove', this.handleThumbTouchMove, { passive: false })
    document.addEventListener('touchend', this.handleThumbTouchEnd)
  }

  /**
   * Начать перетаскивание
   */
  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true
    this.dragStartX = clientX
    this.dragStartY = clientY
    this.dragStartScroll = this.tvist.engine.location.get()

    this.scrollbarEl?.classList.add('tvist__scrollbar--dragging')
  }

  /**
   * Обработчик движения мыши при перетаскивании
   */
  private handleThumbMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return
    event.preventDefault()
    this.updateDrag(event.clientX, event.clientY)
  }

  /**
   * Обработчик движения тача при перетаскивании
   */
  private handleThumbTouchMove = (event: TouchEvent): void => {
    if (!this.isDragging || event.touches.length !== 1) return
    event.preventDefault()

    const touch = event.touches[0]
    if (!touch) return
    
    this.updateDrag(touch.clientX, touch.clientY)
  }

  /**
   * Обновить позицию при перетаскивании
   */
  private updateDrag(clientX: number, clientY: number): void {
    if (!this.trackEl) return

    const isVertical = this.options.direction === 'vertical'
    const rect = this.trackEl.getBoundingClientRect()

    let delta: number
    let trackSize: number

    if (isVertical) {
      delta = clientY - this.dragStartY
      trackSize = rect.height
    } else {
      delta = clientX - this.dragStartX
      trackSize = rect.width
    }

    // Вычисляем процент перемещения
    const percent = delta / trackSize
    
    // Вычисляем общий диапазон прокрутки
    const slideCount = this.tvist.slides.length
    
    // Получаем позицию первого и последнего слайда
    const firstSlideScroll = this.tvist.engine.getScrollPositionForIndex(0)
    const lastSlideScroll = this.tvist.engine.getScrollPositionForIndex(slideCount - 1)
    
    // Общий диапазон прокрутки (разница между первым и последним слайдом)
    const scrollRange = lastSlideScroll - firstSlideScroll
    
    // Вычисляем новую позицию скролла
    const newScroll = this.dragStartScroll + (percent * scrollRange)
    
    // Ограничиваем позицию в пределах допустимого диапазона
    const minScroll = this.tvist.engine.getMinScrollPosition()
    const maxScroll = this.tvist.engine.getMaxScrollPosition()
    const clampedScroll = Math.max(maxScroll, Math.min(minScroll, newScroll))
    
    // Применяем позицию напрямую через engine (плавное следование)
    this.tvist.engine.location.set(clampedScroll)
    this.tvist.engine.target.set(clampedScroll)
    this.tvist.engine.applyTransformPublic()
    
    // Обновляем визуальное положение ползунка
    this.updateScrollbar()
    
    // Вычисляем ближайший индекс для обновления состояния
    let closestIndex = 0
    let minDistance = Infinity

    for (let i = 0; i < slideCount; i++) {
      const slidePos = this.tvist.engine.getScrollPositionForIndex(i)
      const distance = Math.abs(slidePos - clampedScroll)
      
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
    
    // Обновляем индекс без анимации
    this.tvist.engine.index.set(closestIndex)
    
    // Генерируем события прокрутки
    this.tvist.emit('scroll')
  }

  /**
   * Завершить перетаскивание (мышь)
   */
  private handleThumbMouseUp = (): void => {
    this.endDrag()
    document.removeEventListener('mousemove', this.handleThumbMouseMove)
    document.removeEventListener('mouseup', this.handleThumbMouseUp)
  }

  /**
   * Завершить перетаскивание (тач)
   */
  private handleThumbTouchEnd = (): void => {
    this.endDrag()
    document.removeEventListener('touchmove', this.handleThumbTouchMove)
    document.removeEventListener('touchend', this.handleThumbTouchEnd)
  }

  /**
   * Завершить перетаскивание
   */
  private endDrag(): void {
    this.isDragging = false
    this.scrollbarEl?.classList.remove('tvist__scrollbar--dragging')
    
    // После завершения drag делаем snap к ближайшему слайду
    const currentPos = this.tvist.engine.location.get()
    const slideCount = this.tvist.slides.length
    
    let closestIndex = 0
    let minDistance = Infinity

    for (let i = 0; i < slideCount; i++) {
      const slidePos = this.tvist.engine.getScrollPositionForIndex(i)
      const distance = Math.abs(slidePos - currentPos)
      
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
    
    // Плавный переход к ближайшему слайду
    this.tvist.scrollTo(closestIndex)
  }

  /**
   * Обработчик скролла
   */
  private handleScroll = (): void => {
    this.updateScrollbar()
  }

  /**
   * Обработчик изменения слайда
   */
  private handleSlideChanged = (): void => {
    this.updateScrollbar()
  }

  /**
   * Обновить позицию и размер скроллбара
   */
  private updateScrollbar(): void {
    if (!this.thumbEl || !this.trackEl) return

    const isVertical = this.options.direction === 'vertical'
    const slideCount = this.tvist.slides.length
    
    if (slideCount <= 1) return

    // Вычисляем размер ползунка (пропорционально количеству видимых слайдов)
    const perPage = this.options.perPage ?? 1
    const thumbSizePercent = (perPage / slideCount) * 100

    // Получаем текущую позицию из engine для плавного движения
    const currentPosition = Math.abs(this.tvist.engine.location.get())
    const lastSlidePosition = Math.abs(this.tvist.engine.getSlidePosition(slideCount - 1))
    
    // Вычисляем процент прогресса (0-1) с учетом реальной позиции скролла
    const progress = lastSlidePosition > 0 ? currentPosition / lastSlidePosition : 0
    
    // Вычисляем доступный диапазон для движения ползунка (с учётом его размера)
    const availableRange = 100 - thumbSizePercent
    
    // Позиция ползунка в процентах (от 0 до availableRange)
    const positionPercent = Math.max(0, Math.min(availableRange, progress * availableRange))

    // Применяем стили
    if (isVertical) {
      this.thumbEl.style.height = `${thumbSizePercent}%`
      this.thumbEl.style.width = '100%'
      this.thumbEl.style.top = `${positionPercent}%`
      this.thumbEl.style.left = '0'
      this.thumbEl.style.transform = 'none'
    } else {
      this.thumbEl.style.width = `${thumbSizePercent}%`
      this.thumbEl.style.height = '100%'
      this.thumbEl.style.left = `${positionPercent}%`
      this.thumbEl.style.top = '0'
      this.thumbEl.style.transform = 'none'
    }
  }

  /**
   * Показать скроллбар
   */
  private showScrollbar = (): void => {
    if (!this.hide) return
    
    this.scrollbarEl?.classList.remove('tvist__scrollbar--hidden')
    
    // Сбрасываем таймер скрытия
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer)
      this.hideTimer = undefined
    }
  }

  /**
   * Запустить таймер скрытия
   */
  private startHideTimer = (): void => {
    if (!this.hide || this.isDragging) return

    this.hideTimer = window.setTimeout(() => {
      this.scrollbarEl?.classList.add('tvist__scrollbar--hidden')
    }, this.hideDelay)
  }

  /**
   * Хук обновления
   */
  override onUpdate(): void {
    this.updateScrollbar()
  }

  /**
   * Хук обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.scrollbar !== undefined) {
      const scrollbarOptions = typeof newOptions.scrollbar === 'boolean' 
        ? {} 
        : (newOptions.scrollbar ?? {})
      
      this.hide = scrollbarOptions.hide ?? false
      this.hideDelay = scrollbarOptions.hideDelay ?? 1000
      this.draggable = scrollbarOptions.draggable ?? true

      // Применяем класс hide
      if (this.hide) {
        this.scrollbarEl?.classList.add('tvist__scrollbar--hidden')
      } else {
        this.scrollbarEl?.classList.remove('tvist__scrollbar--hidden')
      }

      this.updateScrollbar()
    }
  }

  override destroy(): void {
    // Очищаем таймеры
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer)
    }

    // Удаляем обработчики событий
    if (this.trackEl) {
      this.trackEl.removeEventListener('click', this.handleTrackClick)
    }

    if (this.thumbEl) {
      this.thumbEl.removeEventListener('mousedown', this.handleThumbMouseDown)
      this.thumbEl.removeEventListener('touchstart', this.handleThumbTouchStart)
    }

    document.removeEventListener('mousemove', this.handleThumbMouseMove)
    document.removeEventListener('mouseup', this.handleThumbMouseUp)
    document.removeEventListener('touchmove', this.handleThumbTouchMove)
    document.removeEventListener('touchend', this.handleThumbTouchEnd)

    if (this.hide) {
      this.tvist.root.removeEventListener('mouseenter', this.showScrollbar)
      this.tvist.root.removeEventListener('mouseleave', this.startHideTimer)
    }

    // Удаляем DOM элементы (если не кастомный контейнер)
    if (!this.isCustomContainer && this.scrollbarEl) {
      this.scrollbarEl.remove()
    }
  }
}
