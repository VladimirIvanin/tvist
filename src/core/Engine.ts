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
import { applyPadding, getPaddingValue, getPaddingValueFromOptions } from '../utils/padding'

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
  private paddingStart = 0 // padding слева/сверху
  private paddingEnd = 0   // padding справа/снизу

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
    
    // В режиме loop или navigation разрешаем выбирать любой слайд
    const counterEndIndex = (isLoop || options.isNavigation)
      ? slideCount - 1 
      : Math.max(0, slideCount - perPage)
    
    this.index = new Counter(slideCount, startIndex, isLoop, counterEndIndex)
    this.animator = new Animator()

    // Применяем padding к контейнеру
    this.applyContainerPadding()
    
    // Первичный расчёт размеров
    this.calculateSizes()
    this.calculatePositions()
  }

  /**
   * Применяет padding к контейнеру слайдов
   */
  private applyContainerPadding(): void {
    applyPadding(this.tvist.container, this.options)
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
      this.paddingStart = 0
      this.paddingEnd = 0
      return
    }

    // Получаем значения padding
    // Сначала пытаемся получить из опций (для числовых значений)
    if (isVertical) {
      this.paddingStart = getPaddingValueFromOptions(this.options, 'top')
      this.paddingEnd = getPaddingValueFromOptions(this.options, 'bottom')
      
      // Если padding задан строкой (CSS единицы), читаем из DOM
      if (this.paddingStart === 0 && this.options.padding) {
        this.paddingStart = getPaddingValue(this.tvist.container, 'top')
      }
      if (this.paddingEnd === 0 && this.options.padding) {
        this.paddingEnd = getPaddingValue(this.tvist.container, 'bottom')
      }
    } else {
      this.paddingStart = getPaddingValueFromOptions(this.options, 'left')
      this.paddingEnd = getPaddingValueFromOptions(this.options, 'right')
      
      // Если padding задан строкой (CSS единицы), читаем из DOM
      if (this.paddingStart === 0 && this.options.padding) {
        this.paddingStart = getPaddingValue(this.tvist.container, 'left')
      }
      if (this.paddingEnd === 0 && this.options.padding) {
        this.paddingEnd = getPaddingValue(this.tvist.container, 'right')
      }
    }

    // Размер контейнера (внешний размер root элемента)
    const rootSize = isVertical 
      ? getOuterHeight(this.tvist.root)
      : getOuterWidth(this.tvist.root)
    
    // Доступный размер для слайдов = размер контейнера - padding
    this.containerSize = rootSize - this.paddingStart - this.paddingEnd

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
   * Вычисляет последний допустимый индекс для скролла
   * Логика из Splide: endIndex = slideCount - perPage
   * Это гарантирует, что всегда показывается perPage слайдов
   */
  private getEndIndex(): number {
    const slideCount = this.tvist.slides.length
    const perPage = this.options.perPage ?? 1
    const isLoop = this.options.loop === true

    if (isLoop) {
      // В режиме loop можно скроллить к любому слайду
      return slideCount - 1
    }

    // Логика Splide: endIndex = slideCount - perPage
    const end = slideCount - perPage
    return Math.max(0, Math.min(end, slideCount - 1))
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

    // Если включен режим навигации, разрешаем выбор слайдов за пределами endIndex
    const clampedIndex = this.options.loop || isNavigation
      ? index 
      : Math.max(0, Math.min(index, endIndex))

    // Нормализуем индекс через Counter
    const normalizedIndex = this.index.set(clampedIndex) ?? 0

    // Получаем целевую позицию
    let targetPosition = -this.getSlidePosition(normalizedIndex)
    
    // В режиме навигации (без loop) ограничиваем позицию скролла
    if (isNavigation && !this.options.loop) {
      const endPosition = -this.getSlidePosition(endIndex)
      targetPosition = Math.max(targetPosition, endPosition)
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
    // Переприменяем padding (может измениться при breakpoints)
    this.applyContainerPadding()
    
    this.calculateSizes()
    this.calculatePositions()

    // Пересчитываем позицию для текущего слайда
    const currentIndex = this.index.get()
    const targetPosition = -this.getSlidePosition(currentIndex)

    this.target.set(targetPosition)
    this.location.set(targetPosition)
    this.applyTransform()
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
