/**
 * Engine - ядро расчётов позиций, размеров, прокрутки
 * Основано на архитектуре Embla (чистая логика) + Splide (компонентный подход)
 */

import { Vector1D } from './Vector1D'
import { Counter } from './Counter'
import { Animator } from './Animator'
import type { Tvist } from './Tvist'
import type { TvistOptions } from './types'
import { getOuterWidth, getOuterHeight } from '../utils/dom'
import { applyPeek, getPeekValue, getPeekValueFromOptions } from '../utils/peek'

export class Engine {
  // Позиции
  readonly location: Vector1D // Текущая позиция
  readonly target: Vector1D // Целевая позиция

  // Индексы
  readonly index: Counter // Текущий индекс слайда

  // Анимация
  readonly animator: Animator

  // Кэш размеров
  private containerSize = 0
  private slideSize = 0
  private slidePositions: number[] = []
  private peekStart = 0 // peek слева/сверху
  private peekEnd = 0   // peek справа/снизу

  // Состояние блокировки (когда контент меньше контейнера)
  private _isLocked = false

  // Ссылки
  private tvist: Tvist
  private options: TvistOptions

  constructor(tvist: Tvist, options: TvistOptions) {
    this.tvist = tvist
    this.options = options

    const slideCount = tvist.slides.length
    const startIndex = options.start ?? 0
    const isLoop = options.loop === true

    this.location = new Vector1D(0)
    this.target = new Vector1D(0)
    
    // Вычисляем endIndex для Counter
    const perPage = options.perPage ?? 1
    
    // В режиме loop или navigation или center разрешаем выбирать любой слайд
    const counterEndIndex = (isLoop || options.isNavigation || options.center)
      ? slideCount - 1 
      : Math.max(0, slideCount - perPage)
    
    this.index = new Counter(slideCount, startIndex, isLoop, counterEndIndex)
    this.animator = new Animator()

    // Применяем peek к контейнеру
    this.applyPeek()
    
    // Первичный расчёт размеров
    this.calculateSizes()
    this.calculatePositions()
    this.checkLock()

    // Начальная позиция с учётом trim (в начале — без левого peek, в конце — без правого)
    const initialPos = this.getScrollPositionForIndex(startIndex)
    this.location.set(initialPos)
    this.target.set(initialPos)
    this.applyTransform()
  }

  /**
   * Вычисляет offset для центрирования (аналог Splide offset и Swiper centeredSlides)
   */
  public getCenterOffset(_index: number): number {
    if (!this.options.center) return 0
    
    const isVertical = this.options.direction === 'vertical'
    const rootSize = isVertical
      ? getOuterHeight(this.tvist.root)
      : getOuterWidth(this.tvist.root)
    
    // Формула из Splide: (listSize - slideSize) / 2
    // listSize - это размер видимой области (root), slideSize - размер одного слайда
    return (rootSize - this.peekStart - this.peekEnd - this.slideSize) / 2
  }

  /**
   * Позиция скролла для индекса. При loop peekTrim не применяется.
   */
  public getScrollPositionForIndex(index: number): number {
    const basePosition = -this.getSlidePosition(index)
    const centerOffset = this.getCenterOffset(index)
    
    if (this.options.loop) {
      return basePosition + centerOffset
    }
    
    const endIndex = this.getEndIndex()
    const peekTrim = this.options.peekTrim !== false
    
    // При центрировании применяем offset
    if (this.options.center) {
      return basePosition + centerOffset
    }
    
    // Без центрирования применяем старую логику с peekTrim
    if (index === 0) return peekTrim ? this.getMinScrollPosition() : 0
    if (index === endIndex) return peekTrim ? this.getMaxScrollPosition() : basePosition
    return basePosition
  }

  /**
   * Применяет peek к контейнеру слайдов
   */
  private applyPeek(): void {
    applyPeek(this.tvist.container, this.options)
  }

  /**
   * Рассчитывает размеры контейнера и слайдов
   */
  private calculateSizes(): void {
    const slides = this.tvist.slides
    const isVertical = this.options.direction === 'vertical'

    if (slides.length === 0) {
      this.containerSize = 0
      this.slideSize = 0
      this.peekStart = 0
      this.peekEnd = 0
      return
    }

    // Получаем значения peek из опций (для числовых значений)
    if (isVertical) {
      this.peekStart = getPeekValueFromOptions(this.options, 'top')
      this.peekEnd = getPeekValueFromOptions(this.options, 'bottom')

      if (this.peekStart === 0 && this.options.peek) {
        this.peekStart = getPeekValue(this.tvist.container, 'top')
      }
      if (this.peekEnd === 0 && this.options.peek) {
        this.peekEnd = getPeekValue(this.tvist.container, 'bottom')
      }
    } else {
      this.peekStart = getPeekValueFromOptions(this.options, 'left')
      this.peekEnd = getPeekValueFromOptions(this.options, 'right')

      if (this.peekStart === 0 && this.options.peek) {
        this.peekStart = getPeekValue(this.tvist.container, 'left')
      }
      if (this.peekEnd === 0 && this.options.peek) {
        this.peekEnd = getPeekValue(this.tvist.container, 'right')
      }
    }

    const rootSize = isVertical
      ? getOuterHeight(this.tvist.root)
      : getOuterWidth(this.tvist.root)

    this.containerSize = rootSize - this.peekStart - this.peekEnd

    // Автоматический расчет perPage если задан slideMinSize
    if (this.options.slideMinSize && this.options.slideMinSize > 0) {
      const gap = this.options.gap ?? 0
      const minSize = this.options.slideMinSize
      
      // (size + gap) / (minSize + gap)
      const calculatedPerPage = Math.floor(
        (this.containerSize + gap) / (minSize + gap)
      )
      
      this.options.perPage = Math.max(1, calculatedPerPage)
    }

    // Размер одного слайда с учётом perPage и gap
    const perPage = this.options.perPage ?? 1
    const gap = this.options.gap ?? 0

    // Формула: slideSize = (containerSize - gap * (perPage - 1)) / perPage
    this.slideSize = (this.containerSize - gap * (perPage - 1)) / perPage

    // Защита от некорректных значений
    if (this.slideSize < 0 || !isFinite(this.slideSize)) {
      this.slideSize = 0
    }

    // Устанавливаем размеры слайдам
    slides.forEach((slide) => {
      // Сбрасываем стили перед установкой новых (на случай смены ориентации)
      slide.style.width = ''
      slide.style.height = ''
      slide.style.marginRight = ''
      slide.style.marginBottom = ''

      if (this.slideSize > 0) {
        if (isVertical) {
          slide.style.height = `${this.slideSize}px`
          slide.style.width = '100%' // Слайд должен занимать всю ширину контейнера
        } else {
          slide.style.width = `${this.slideSize}px`
        }
      }

      if (gap > 0 && slide !== slides[slides.length - 1]) {
        if (isVertical) {
          slide.style.marginBottom = `${gap}px`
        } else {
          slide.style.marginRight = `${gap}px`
        }
      }
    })
  }

  /**
   * Рассчитывает позиции всех слайдов
   */
  private calculatePositions(): void {
    const slides = this.tvist.slides
    const gap = this.options.gap ?? 0

    this.slidePositions = []

    for (let i = 0; i < slides.length; i++) {
      // Позиция = index * (slideSize + gap)
      const position = i * (this.slideSize + gap)
      this.slidePositions.push(position)
    }
  }

  /**
   * Установить позиции слайдов вручную (используется в GridModule)
   */
  public setSlidePositions(positions: number[]): void {
    this.slidePositions = positions
  }

  /**
   * Вычисляет последний допустимый индекс для скролла
   * Логика из Splide: endIndex = slideCount - perPage
   * Это гарантирует, что всегда показывается perPage слайдов
   * При center: true (аналог hasFocus в Splide) всегда slideCount - 1
   */
  private getEndIndex(): number {
    const slideCount = this.tvist.slides.length
    const perPage = this.options.perPage ?? 1
    const isLoop = this.options.loop === true

    if (isLoop || this.options.center || this.options.isNavigation) {
      // В режиме loop, center или navigation можно скроллить к любому слайду
      return slideCount - 1
    }

    // Логика Splide: endIndex = slideCount - perPage
    const end = slideCount - perPage
    return Math.max(0, Math.min(end, slideCount - 1))
  }

  /**
   * Минимальная позиция скролла (при trim — первый слайд прижат к левому краю, левый peek не показывается).
   */
  getMinScrollPosition(): number {
    if (this.options.loop) return -Infinity
    const isVertical = this.options.direction === 'vertical'
    const peekStart = isVertical
      ? getPeekValue(this.tvist.container, 'top')
      : getPeekValue(this.tvist.container, 'left')
    return -(peekStart || this.peekStart)
  }

  /**
   * Максимальная позиция скролла (отрицательная).
   * При этой позиции правый край последнего слайда совпадает с правым краем root — правый peek не показывается (trim).
   * Формула: чтобы контент lastPageRight был у правого края root: position = rootSize - peekStart - lastPageRight.
   */
  getMaxScrollPosition(): number {
    if (this.options.loop) return -Infinity
    
    // Рассчитываем правую границу всего контента по последнему слайду
    const lastIndex = this.tvist.slides.length - 1
    const lastPageRight = this.getSlidePosition(lastIndex) + this.slideSize

    const isVertical = this.options.direction === 'vertical'
    const rootSize = isVertical
      ? getOuterHeight(this.tvist.root)
      : getOuterWidth(this.tvist.root)
    let peekStart = isVertical
      ? getPeekValue(this.tvist.container, 'top')
      : getPeekValue(this.tvist.container, 'left')
    if (peekStart === 0 && this.peekStart > 0) peekStart = this.peekStart
    return rootSize - peekStart - lastPageRight
  }

  /**
   * Получить позицию слайда по индексу
   */
  getSlidePosition(index: number): number {
    if (index < 0 || index >= this.slidePositions.length) {
      return 0
    }
    return this.slidePositions[index] ?? 0
  }

  /**
   * Переход к слайду
   * @param index - индекс целевого слайда
   * @param instant - мгновенный переход без анимации
   */
  scrollTo(index: number, instant = false): void {
    // Ограничиваем индекс до endIndex (если не loop)
    const endIndex = this.getEndIndex()
    const isNavigation = this.options.isNavigation

    // Если включен режим навигации или center, разрешаем выбор слайдов за пределами endIndex
    const clampedIndex = this.options.loop || isNavigation || this.options.center
      ? index 
      : Math.max(0, Math.min(index, endIndex))

    // Нормализуем индекс через Counter
    const normalizedIndex = this.index.set(clampedIndex) ?? 0

    let targetPosition = this.getScrollPositionForIndex(normalizedIndex)

    // При навигации применяем ограничения (но не для center режима)
    if (isNavigation && !this.options.loop && !this.options.center) {
      const peekTrim = this.options.peekTrim !== false
      const maxPos = peekTrim ? this.getMaxScrollPosition() : -this.getSlidePosition(endIndex)
      const minPos = peekTrim ? this.getMinScrollPosition() : 0
      targetPosition = Math.max(maxPos, Math.min(minPos, targetPosition))
    }

    // События
    this.tvist.emit('beforeSlideChange', normalizedIndex)
    this.options.on?.beforeSlideChange?.(normalizedIndex)

    if (instant) {
      // Мгновенный переход
      this.target.set(targetPosition)
      this.location.set(targetPosition)
      this.applyTransform()
      
      // События после изменения
      this.tvist.emit('slideChanged', normalizedIndex)
      this.options.on?.slideChanged?.(normalizedIndex)
    } else {
      // Анимированный переход
      this.target.set(targetPosition)
      const speed = this.options.speed ?? 300

      this.animator.animate(
        this.location.get(),
        targetPosition,
        speed,
        (value) => {
          this.location.set(value)
          this.applyTransform()
          
          // Событие во время прокрутки
          this.tvist.emit('scroll')
          this.options.on?.scroll?.()
        },
        () => {
          // Событие после завершения
          this.tvist.emit('slideChanged', normalizedIndex)
          this.options.on?.slideChanged?.(normalizedIndex)
        }
      )
      
      // Событие начала изменения
      this.tvist.emit('slideChange', normalizedIndex)
      this.options.on?.slideChange?.(normalizedIndex)
    }
  }

  /**
   * Относительная прокрутка
   * @param delta - смещение в слайдах
   */
  scrollBy(delta: number): void {
    const currentIndex = this.index.get()
    this.scrollTo(currentIndex + delta)
  }

  /**
   * Применяет transform к контейнеру
   */
  private applyTransform(): void {
    const container = this.tvist.container
    const pos = this.location.get()

    if (this.options.direction === 'vertical') {
      container.style.transform = `translate3d(0, ${pos}px, 0)`
    } else {
      container.style.transform = `translate3d(${pos}px, 0, 0)`
    }
    
    this.tvist.emit('setTranslate', this.tvist, pos)
  }

  /**
   * Применяет transform к контейнеру (публичный метод для модулей)
   * Используется в DragModule для real-time обновления позиции
   */
  applyTransformPublic(): void {
    this.applyTransform()
  }

  /**
   * Обновление размеров (вызывается при resize)
   */
  update(): void {
    this.applyPeek()
    
    this.calculateSizes()
    this.calculatePositions()

    const currentIndex = this.index.get()
    const targetPosition = this.getScrollPositionForIndex(currentIndex)

    this.target.set(targetPosition)
    this.location.set(targetPosition)
    this.applyTransform()
    this.checkLock()
  }

  /**
   * Проверка на необходимость блокировки слайдера
   * Блокировка включается, если весь контент помещается в контейнер
   */
  public checkLock(): void {
    const isLocked = this.getMaxScrollPosition() >= this.getMinScrollPosition()
    
    if (this._isLocked !== isLocked) {
      this._isLocked = isLocked
      
      this.tvist.root.classList.toggle('tvist--locked', isLocked)
      
      if (isLocked) {
        this.tvist.emit('lock')
        this.options.on?.lock?.()
      } else {
        this.tvist.emit('unlock')
        this.options.on?.unlock?.()
      }
    }
  }

  /**
   * Получить состояние блокировки
   */
  get isLocked(): boolean {
    return this._isLocked
  }

  /**
   * Получить размер слайда (ширина или высота)
   */
  get slideSizeValue(): number {
    return this.slideSize
  }

  /**
   * Получить размер контейнера (ширина или высота)
   */
  get containerSizeValue(): number {
    return this.containerSize
  }

  /**
   * Получить текущий индекс
   */
  get activeIndex(): number {
    return this.index.get()
  }

  /**
   * Получить количество слайдов
   */
  get slideCount(): number {
    return this.tvist.slides.length
  }

  /**
   * Проверить, можно ли листать вперёд
   */
  canScrollNext(): boolean {
    if (this.options.loop) return true
    
    // В режиме навигации лимит - это последний слайд
    const limit = this.options.isNavigation
      ? this.tvist.slides.length - 1
      : this.getEndIndex()

    return this.index.get() < limit
  }

  /**
   * Проверить, можно ли листать назад
   */
  canScrollPrev(): boolean {
    if (this.options.loop) return true
    return this.index.get() > 0
  }

  /**
   * Очистка
   */
  destroy(): void {
    this.animator.stop()
  }
}
