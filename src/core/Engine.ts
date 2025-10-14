/**
 * Engine - ядро расчётов позиций, размеров, прокрутки
 * Основано на архитектуре Embla (чистая логика) + Splide (компонентный подход)
 */

import { Vector1D } from './Vector1D'
import { Counter } from './Counter'
import { Animator } from './Animator'
import type { Velosiped } from './Velosiped'
import type { VelosipedOptions } from './types'
import { getOuterWidth } from '../utils/dom'

export class Engine {
  // Позиции
  readonly location: Vector1D // Текущая позиция
  readonly target: Vector1D // Целевая позиция

  // Индексы
  readonly index: Counter // Текущий индекс слайда

  // Анимация
  private animator: Animator

  // Кэш размеров
  private containerWidth: number = 0
  private slideWidth: number = 0
  private slidePositions: number[] = []

  // Ссылки
  private velosiped: Velosiped
  private options: VelosipedOptions

  constructor(velosiped: Velosiped, options: VelosipedOptions) {
    this.velosiped = velosiped
    this.options = options

    const slideCount = velosiped.slides.length
    const startIndex = options.start || 0

    this.location = new Vector1D(0)
    this.target = new Vector1D(0)
    this.index = new Counter(slideCount, startIndex, options.loop === true)
    this.animator = new Animator()

    // Первичный расчёт размеров
    this.calculateSizes()
    this.calculatePositions()
  }

  /**
   * Рассчитывает размеры контейнера и слайдов
   */
  private calculateSizes(): void {
    const slides = this.velosiped.slides

    if (slides.length === 0) {
      this.containerWidth = 0
      this.slideWidth = 0
      return
    }

    // Размер контейнера
    this.containerWidth = getOuterWidth(this.velosiped.root)

    // Размер одного слайда с учётом perPage и gap
    const perPage = this.options.perPage || 1
    const gap = this.options.gap || 0

    // Формула: slideWidth = (containerWidth - gap * (perPage - 1)) / perPage
    this.slideWidth = (this.containerWidth - gap * (perPage - 1)) / perPage

    // Защита от некорректных значений
    if (this.slideWidth < 0 || !isFinite(this.slideWidth)) {
      this.slideWidth = 0
    }

    // Устанавливаем ширину слайдам
    slides.forEach((slide) => {
      if (this.slideWidth > 0) {
        slide.style.width = `${this.slideWidth}px`
      }
      if (gap > 0 && slide !== slides[slides.length - 1]) {
        slide.style.marginRight = `${gap}px`
      }
    })
  }

  /**
   * Рассчитывает позиции всех слайдов
   */
  private calculatePositions(): void {
    const slides = this.velosiped.slides
    const gap = this.options.gap || 0

    this.slidePositions = []

    for (let i = 0; i < slides.length; i++) {
      // Позиция = index * (slideWidth + gap)
      const position = i * (this.slideWidth + gap)
      this.slidePositions.push(position)
    }
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
  scrollTo(index: number, instant: boolean = false): void {
    // Нормализуем индекс через Counter
    const normalizedIndex = this.index.set(index) ?? 0

    // Получаем целевую позицию
    const targetPosition = -this.getSlidePosition(normalizedIndex)

    // События
    this.velosiped.emit('beforeSlideChange', normalizedIndex)
    this.options.on?.beforeSlideChange?.(normalizedIndex)

    if (instant) {
      // Мгновенный переход
      this.target.set(targetPosition)
      this.location.set(targetPosition)
      this.applyTransform()
      
      // События после изменения
      this.velosiped.emit('slideChanged', normalizedIndex)
      this.options.on?.slideChanged?.(normalizedIndex)
    } else {
      // Анимированный переход
      this.target.set(targetPosition)
      const speed = this.options.speed || 300

      this.animator.animate(
        this.location.get(),
        targetPosition,
        speed,
        (value) => {
          this.location.set(value)
          this.applyTransform()
          
          // Событие во время прокрутки
          this.velosiped.emit('scroll')
          this.options.on?.scroll?.()
        },
        () => {
          // Событие после завершения
          this.velosiped.emit('slideChanged', normalizedIndex)
          this.options.on?.slideChanged?.(normalizedIndex)
        }
      )
      
      // Событие начала изменения
      this.velosiped.emit('slideChange', normalizedIndex)
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
    const container = this.velosiped.container
    const x = this.location.get()

    if (this.options.direction === 'vertical') {
      container.style.transform = `translate3d(0, ${x}px, 0)`
    } else {
      container.style.transform = `translate3d(${x}px, 0, 0)`
    }
  }

  /**
   * Обновление размеров (вызывается при resize)
   */
  update(): void {
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
   * Получить ширину слайда
   */
  get slideWidthValue(): number {
    return this.slideWidth
  }

  /**
   * Получить ширину контейнера
   */
  get containerWidthValue(): number {
    return this.containerWidth
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
    return this.velosiped.slides.length
  }

  /**
   * Проверить, можно ли листать вперёд
   */
  canScrollNext(): boolean {
    if (this.options.loop) return true
    return this.index.get() < this.slideCount - 1
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

