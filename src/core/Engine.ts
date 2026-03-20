/**
 * Engine - ядро расчётов позиций, размеров, прокрутки
 */

import { Vector1D } from './Vector1D'
import { Counter } from './Counter'
import { Animator } from './Animator'
import { TVIST_CLASSES } from './constants'
import type { Tvist } from './Tvist'
import type { TvistOptions } from './types'
import { getOuterWidth, getOuterHeight } from '../utils/dom'
import { applyPeek, getPeekValue, getPeekValueFromOptions } from '../utils/peek'

const ENGINE_DEBUG = false
const engineLog = (_label: string, _data?: Record<string, unknown>) => {
  if (ENGINE_DEBUG) {
    // debug logging
  }
}

/** Контекст для передачи между подметодами scrollTo */
interface ScrollContext {
  clampedIndex: number
  normalizedIndex: number
  eventIndex: number
  indexChanged: boolean
}

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
  /** Размеры каждого слайда при autoWidth/autoHeight (измеренные из DOM) */
  private slideSizes: number[] = []
  private slidePositions: number[] = []
  private peekStart = 0 // peek слева/сверху
  private peekEnd = 0   // peek справа/снизу

  // Кэш scroll-позиций (инвалидируется в updateScrollCache)
  private cachedMinScroll = 0
  private cachedMaxScroll = 0
  private cachedRootSize = 0
  private scrollCacheValid = false

  // Кэш размера root элемента (для оптимизации производительности)
  private cachedRootWidth = 0
  private cachedRootHeight = 0
  private rootSizeCacheValid = false
  private slideSizesCacheValid = false

  // Состояние блокировки (когда контент меньше контейнера)
  private _isLocked = false

  // Ссылки
  private tvist: Tvist
  private options: TvistOptions

  constructor(tvist: Tvist, options: TvistOptions) {
    this.tvist = tvist
    this.options = options

    const startIndex = options.start ?? 0
    const isLoop = options.loop === true

    this.location = new Vector1D(0)
    this.target = new Vector1D(0)
    // В режиме loop или navigation или center разрешаем выбирать любой слайд
    this.index = new Counter(tvist.slides.length, startIndex, isLoop, this.calculateCounterEndIndex())
    this.animator = new Animator()

    // Применяем peek к контейнеру
    this.applyPeek()
    // Первичный расчёт размеров
    this.calculateSizes()
    this.calculatePositions()
    // Проверяем блокировку после расчета размеров
    this.checkLock()

    // Начальная позиция с учётом trim (в начале — без левого peek, в конце — без правого)
    const initialPos = this.getScrollPositionForIndex(startIndex)
    this.location.set(initialPos)
    this.target.set(initialPos)
    this.applyTransform()
  }

  /**
   * Возвращает размер слайда по индексу (ширина или высота в зависимости от direction).
   * При autoWidth/autoHeight — измеренный размер из DOM, иначе — общий slideSize.
   */
  public getSlideSize(index: number): number {
    if (
      this.slideSizes.length > 0 &&
      index >= 0 &&
      index < this.slideSizes.length
    ) {
      const size = this.slideSizes[index]
      return size ?? this.slideSize
    }
    return this.slideSize
  }

  /**
   * Вычисляет offset для центрирования
   */
  public getCenterOffset(index: number): number {
    if (!this.options.center) return 0

    if (!this.scrollCacheValid) this.updateScrollCache()
    const rootSize = this.cachedRootSize
    const size = this.getSlideSize(index)
    return (rootSize - this.peekStart - this.peekEnd - size) / 2
  }

  /**
   * Получить realIndex (из data-tvist-slide-index) для слайда на указанной DOM-позиции.
   * Если атрибут отсутствует, возвращает domIndex как есть.
   */
  private getEventIndex(domIndex: number): number {
    const slide = this.tvist.slides[domIndex]
    if (!slide) return domIndex
    const dataAttr = slide.getAttribute('data-tvist-slide-index')
    if (dataAttr !== null) {
      return parseInt(dataAttr, 10)
    }
    return domIndex
  }

  /**
   * Найти DOM-позицию слайда по его realIndex (data-tvist-slide-index).
   * Возвращает -1, если слайд не найден.
   */
  private findDomIndexByRealIndex(realIndex: number): number {
    const slides = this.tvist.slides
    for (let i = 0; i < slides.length; i++) {
      const dataAttr = slides[i]?.getAttribute('data-tvist-slide-index')
      if (dataAttr != null && parseInt(dataAttr, 10) === realIndex) {
        return i
      }
    }
    return -1
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
    
    // В режиме autoWidth/autoHeight проверяем, не создаст ли basePosition дыру справа/снизу
    const isAutoSize = (!this.options.direction || this.options.direction === 'horizontal') 
      ? this.options.autoWidth 
      : this.options.autoHeight
    
    if (isAutoSize && peekTrim) {
      const maxScroll = this.getMaxScrollPosition()
      
      // Если basePosition < maxScroll, значит последний слайд не дотянется до правого края
      // и образуется "дыра". Используем maxScroll вместо basePosition.
      if (basePosition < maxScroll) {
        return maxScroll
      }
    }
    
    return basePosition
  }

  /**
   * Обновляет кеш размера root элемента
   */
  private updateRootSizeCache(): void {
    this.cachedRootWidth = getOuterWidth(this.tvist.root)
    this.cachedRootHeight = getOuterHeight(this.tvist.root)
    this.rootSizeCacheValid = true
  }

  /**
   * Получает размер root элемента (с кешированием)
   */
  private getRootSize(): number {
    if (!this.rootSizeCacheValid) {
      this.updateRootSizeCache()
    }
    const isVertical = this.options.direction === 'vertical'
    return isVertical ? this.cachedRootHeight : this.cachedRootWidth
  }

  /**
   * Инвалидирует кеш размера root элемента
   */
  private invalidateRootSizeCache(): void {
    this.rootSizeCacheValid = false
  }

  /**
   * Применяет peek к контейнеру слайдов
   */
  applyPeek(): void {
    applyPeek(this.tvist.container, this.options)
  }

  /**
   * Рассчитывает размеры контейнера и слайдов
   * @param isDisabled - если true, то не применяем стили к DOM-элементам
   */
  private calculateSizes(isDisabled = false): void {
    if (this.tvist.slides.length === 0) {
      this.resetSizes()
      return
    }

    this.updatePeekValues(isDisabled)
    
    this.containerSize = this.getRootSize() - this.peekStart - this.peekEnd

    const isAutoSize = this.isAutoSize()

    if (!isAutoSize) {
      this.calculateFixedSlideSize()
    } else {
      this.slideSize = 0
    }

    if (isAutoSize) {
      this.applyAndMeasureAutoSize(isDisabled)
    } else {
      this.applyFixedSize(isDisabled)
    }
  }

  private resetSizes(): void {
    this.containerSize = 0
    this.slideSize = 0
    this.peekStart = 0
    this.peekEnd = 0
  }

  private isAutoSize(): boolean {
    const isVertical = this.options.direction === 'vertical'
    return isVertical ? this.options.autoHeight === true : this.options.autoWidth === true
  }

  private updatePeekValues(isDisabled: boolean): void {
    const isVertical = this.options.direction === 'vertical'
    const startSide = isVertical ? 'top' : 'left'
    const endSide = isVertical ? 'bottom' : 'right'

    this.peekStart = getPeekValueFromOptions(this.options, startSide)
    this.peekEnd = getPeekValueFromOptions(this.options, endSide)

    if (this.options.peek && !isDisabled) {
      if (this.peekStart === 0) {
        this.peekStart = getPeekValue(this.tvist.container, startSide)
      }
      if (this.peekEnd === 0) {
        this.peekEnd = getPeekValue(this.tvist.container, endSide)
      }
    }
  }

  private calculateFixedSlideSize(): void {
    const gap = this.options.gap ?? 0
    
    if (this.options.slideMinSize && this.options.slideMinSize > 0) {
      const minSize = this.options.slideMinSize
      const calculatedPerPage = Math.floor(
        (this.containerSize + gap) / (minSize + gap)
      )
      this.options.perPage = Math.max(1, calculatedPerPage)
    }

    const perPage = this.options.perPage ?? 1
    this.slideSize = (this.containerSize - gap * (perPage - 1)) / perPage
    
    if (this.slideSize < 0 || !isFinite(this.slideSize)) {
      this.slideSize = 0
    }
    
    this.slideSizes = []
  }

  private applyAndMeasureAutoSize(isDisabled: boolean): void {
    const gap = this.options.gap ?? 0
    const isVertical = this.options.direction === 'vertical'

    if (!isDisabled) {
      this.tvist.slides.forEach((slide, i) => {
        slide.style.marginRight = ''
        slide.style.marginBottom = ''
        
        if (gap > 0 && i !== this.tvist.slides.length - 1) {
          if (isVertical) {
            slide.style.marginBottom = `${gap}px`
          } else {
            slide.style.marginRight = `${gap}px`
          }
        }
      })
    }
    
    if (!this.slideSizesCacheValid) {
      if (isDisabled) {
        // Если слайдер выключен, мы не можем получить правильные размеры из DOM
        // так как мы не применили стили. Оставляем предыдущие размеры или нули
        if (this.slideSizes.length === 0) {
          this.slideSizes = this.tvist.slides.map(() => 0)
        }
      } else {
        this.slideSizes = this.tvist.slides.map((slide) =>
          isVertical ? getOuterHeight(slide) : getOuterWidth(slide)
        )
      }
      this.slideSizesCacheValid = true
    }
  }

  private applyFixedSize(isDisabled: boolean): void {
    const gap = this.options.gap ?? 0
    const isVertical = this.options.direction === 'vertical'

    if (!isDisabled) {
      this.tvist.slides.forEach((slide, i) => {
        slide.style.width = ''
        slide.style.height = ''
        slide.style.marginRight = ''
        slide.style.marginBottom = ''

        if (this.slideSize > 0) {
          if (isVertical) {
            slide.style.height = `${this.slideSize}px`
            slide.style.width = '100%'
          } else {
            slide.style.width = `${this.slideSize}px`
          }
        }
        
        if (gap > 0 && i !== this.tvist.slides.length - 1) {
          if (isVertical) {
            slide.style.marginBottom = `${gap}px`
          } else {
            slide.style.marginRight = `${gap}px`
          }
        }
      })
    }
    
    this.slideSizes = []
    this.slideSizesCacheValid = false
  }

  /**
   * Рассчитывает позиции всех слайдов
   */
  private calculatePositions(): void {
    const slides = this.tvist.slides
    const gap = this.options.gap ?? 0

    this.slidePositions = []

    if (this.slideSizes.length > 0) {
      let pos = 0
      for (let i = 0; i < slides.length; i++) {
        this.slidePositions.push(pos)
        pos += (this.slideSizes[i] ?? 0) + gap
      }
    } else {
      for (let i = 0; i < slides.length; i++) {
        this.slidePositions.push(i * (this.slideSize + gap))
      }
    }

    // Обновляем кэш scroll-позиций после пересчёта layout
    this.updateScrollCache()
  }

  /**
   * Пересчитывает кэш scroll-позиций (minScroll, maxScroll, rootSize).
   * Вызывается после calculatePositions/calculateSizes и при любом изменении layout.
   */
  private updateScrollCache(): void {
    // ВАЖНО: cachedRootSize нужен для getCenterOffset даже при loop
    this.cachedRootSize = this.getRootSize()

    if (this.options.loop) {
      this.cachedMinScroll = -Infinity
      this.cachedMaxScroll = -Infinity
      this.scrollCacheValid = true
      return
    }

    // minScroll: используем peekStart (уже вычислен в calculateSizes)
    this.cachedMinScroll = -this.peekStart

    // maxScroll: rootSize - peekStart - lastPageRight
    const lastIndex = this.tvist.slides.length - 1
    if (lastIndex >= 0) {
      const lastPageRight =
        this.getSlidePosition(lastIndex) + this.getSlideSize(lastIndex)
      this.cachedMaxScroll = this.cachedRootSize - this.peekStart - lastPageRight
    } else {
      this.cachedMaxScroll = 0
    }

    this.scrollCacheValid = true
  }

  /**
   * Инвалидирует кэш scroll-позиций.
   * Следующий вызов getMinScrollPosition/getMaxScrollPosition пересчитает значения.
   */
  private invalidateScrollCache(): void {
    this.scrollCacheValid = false
  }

  /**
   * Установить позиции слайдов вручную (используется в GridModule)
   */
  public setSlidePositions(positions: number[]): void {
    this.slidePositions = positions
    this.invalidateScrollCache()
  }

  /**
   * Установить размер слайда вручную (используется в GridModule)
   */
  public setSlideSize(size: number): void {
    this.slideSize = size
  }

  /**
   * Вычисляет последний допустимый индекс для скролла
   */
  private getEndIndex(): number {
    const slideCount = this.tvist.slides.length
    const isLoop = this.options.loop === true

    if (isLoop || this.options.center || this.options.isNavigation || this.isAutoSize()) {
      return slideCount - 1
    }

    const perPage = this.options.perPage ?? 1
    const end = slideCount - perPage
    return Math.max(0, Math.min(end, slideCount - 1))
  }

  /**
   * Минимальная позиция скролла (при trim — первый слайд прижат к левому краю, левый peek не показывается).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  getMinScrollPosition(): number {
    if (!this.scrollCacheValid) this.updateScrollCache()
    return this.cachedMinScroll
  }

  /**
   * Максимальная позиция скролла (отрицательная).
   * При этой позиции правый край последнего слайда совпадает с правым краем root — правый peek не показывается (trim).
   * Возвращает кэшированное значение; кэш обновляется при calculatePositions/update.
   */
  getMaxScrollPosition(): number {
    if (!this.scrollCacheValid) this.updateScrollCache()
    return this.cachedMaxScroll
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
   * Получить все позиции слайдов (публичный метод для тестов)
   */
  public getSlidePositions(): number[] {
    return [...this.slidePositions]
  }

  /**
   * Вычисляет endIndex для Counter на основе текущих опций
   */
  private calculateCounterEndIndex(): number {
    const slideCount = this.tvist.slides.length
    const perPage = this.options.perPage ?? 1
    const isLoop = this.options.loop === true
    return (isLoop || this.options.isNavigation || this.options.center)
      ? slideCount - 1
      : Math.max(0, slideCount - perPage)
  }

  /**
   * Обновляет Counter.endIndex и Counter.max после изменения perPage/slideCount
   */
  private updateCounterLimits(): void {
    this.index.endIndex = this.calculateCounterEndIndex()
    this.index.max = this.tvist.slides.length
  }

  /**
   * Синхронизирует location и target с позицией текущего индекса
   * @param applyDOM - применить transform к DOM (false для disabled-режима)
   */
  private syncPositionToIndex(applyDOM = true): void {
    const currentIndex = this.index.get()
    const targetPosition = this.getScrollPositionForIndex(currentIndex)
    this.target.set(targetPosition)
    this.location.set(targetPosition)
    if (applyDOM) this.applyTransform()
  }

  /**
   * Переход к слайду
   * @param index - индекс целевого слайда
   * @param instant - мгновенный переход без анимации
   */
  scrollTo(index: number, instant = false): void {
    const endIndex = this.getEndIndex()
    const previousIndex = this.index.get()
    const ctx = this.resolveTargetIndex(index, endIndex, previousIndex)

    if (ctx.indexChanged && !instant) {
      this.handleBeforeTransition(ctx, previousIndex)
    }

    this.index.set(ctx.clampedIndex)

    engineLog('scrollTo', {
      inputIndex: index,
      ...ctx,
      previousIndex,
      instant,
      loop: this.options.loop,
      endIndex,
      stack: new Error().stack?.split('\n').slice(2, 6).join(' <- ')
    })

    const targetPosition = this.clampTargetPosition(
      this.getScrollPositionForIndex(ctx.normalizedIndex),
      endIndex
    )

    if (ctx.indexChanged) {
      this.tvist.emit('beforeSlideChange', ctx.eventIndex)
    }

    if (instant) {
      this.performInstantScroll(targetPosition, ctx, endIndex)
    } else {
      this.performAnimatedScroll(targetPosition, ctx, endIndex)
    }
  }

  private resolveTargetIndex(index: number, endIndex: number, previousIndex: number): ScrollContext {
    // Если включен режим навигации или center, разрешаем выбор слайдов за пределами endIndex
    let clampedIndex = this.options.loop || this.options.isNavigation || this.options.center
      ? index
      : Math.max(0, Math.min(index, endIndex))

    // Rewind: если индекс вышел за пределы и включён rewind — перематываем
    if (this.options.rewind && !this.options.loop) {
      if (index > endIndex) {
        clampedIndex = 0
      } else if (index < 0) {
        clampedIndex = endIndex
      }
    }

    const normalizedIndex = this.index.loop
      ? (clampedIndex < 0 ? clampedIndex + this.index.max : clampedIndex % this.index.max)
      : Math.max(0, Math.min(clampedIndex, this.index.endIndex))

    // eventIndex — realIndex для событий (slideChangeStart, slideChangeEnd и пр.)
    // В loop-режиме normalizedIndex = DOM-позиция, eventIndex = realIndex из data-tvist-slide-index.
    // В обычном режиме они совпадают.
    return {
      clampedIndex,
      normalizedIndex,
      eventIndex: this.getEventIndex(normalizedIndex),
      indexChanged: normalizedIndex !== previousIndex,
    }
  }

  /**
   * Обрабатывает beforeTransitionStart и loop re-indexing.
   * Может мутировать ctx при loop-перестановке слайдов.
   */
  private handleBeforeTransition(ctx: ScrollContext, previousIndex: number): void {
    const savedDirection = this.tvist._scrollDirection
    const direction = savedDirection ?? (ctx.normalizedIndex > previousIndex ? 'next' : 'prev')
    this.tvist._scrollDirection = undefined

    const counterBeforeEmit = this.index.get()
    this.tvist.emit('beforeTransitionStart', { index: ctx.eventIndex, direction })
    const counterAfterEmit = this.index.get()

    // LoopModule переставил слайды и обновил Counter на DOM-позицию текущего слайда.
    // После перестановки DOM-позиция целевого слайда могла измениться.
    // Находим DOM-позицию целевого слайда по его eventIndex (= realIndex).
    if (counterBeforeEmit !== counterAfterEmit && this.options.loop) {
      // Ищем DOM-позицию слайда с data-tvist-slide-index === eventIndex
      const targetDomIndex = this.findDomIndexByRealIndex(ctx.eventIndex)

      if (targetDomIndex !== -1) {
        ctx.clampedIndex = targetDomIndex
        ctx.normalizedIndex = targetDomIndex
      } else {
        // Fallback: delta подход
        const delta = ctx.clampedIndex - counterBeforeEmit
        ctx.clampedIndex = counterAfterEmit + delta
        ctx.normalizedIndex = ((ctx.clampedIndex % this.index.max) + this.index.max) % this.index.max
      }
      // indexChanged определяем по eventIndex (realIndex), а не по DOM-позиции.
      // LoopModule мог переместить целевой слайд на ту же DOM-позицию, что и counterAfterEmit,
      // но realIndex всё равно изменился — нужно эмитить события.
      ctx.indexChanged = true
    }
  }

  /** При навигации применяем ограничения (но не для center режима) */
  private clampTargetPosition(position: number, endIndex: number): number {
    if (!this.options.isNavigation || this.options.loop || this.options.center) {
      return position
    }
    const peekTrim = this.options.peekTrim !== false
    const maxPos = peekTrim ? this.getMaxScrollPosition() : -this.getSlidePosition(endIndex)
    const minPos = peekTrim ? this.getMinScrollPosition() : 0
    return Math.max(maxPos, Math.min(minPos, position))
  }

  private performInstantScroll(targetPosition: number, ctx: ScrollContext, endIndex: number): void {
    this.target.set(targetPosition)
    this.location.set(targetPosition)
    this.applyTransform()

    if (ctx.indexChanged) {
      this.tvist.emit('slideChangeEnd', ctx.eventIndex)
      this.emitReachEdge(ctx.eventIndex, endIndex)
    }
  }

  private performAnimatedScroll(targetPosition: number, ctx: ScrollContext, endIndex: number): void {
    this.target.set(targetPosition)
    const speed = this.options.speed ?? 300

    if (ctx.indexChanged) {
      this.tvist.emit('transitionStart', ctx.eventIndex)
      this.tvist.emit('slideChangeStart', ctx.eventIndex)
    }

    // Проверяем, нужна ли анимация для корректировки позиции
    const currentLocation = this.location.get()
    const positionDiff = Math.abs(currentLocation - targetPosition)
    const needsAnimation = positionDiff > 0.5 // tolerance 0.5px

    engineLog('Position correction check', {
      currentLocation,
      targetPosition,
      positionDiff,
      needsAnimation,
      indexChanged: ctx.indexChanged
    })

    if (needsAnimation) {
      // Запускаем анимацию для корректировки позиции
      this.animator.animate(
        currentLocation,
        targetPosition,
        speed,
        (value) => {
          this.location.set(value)
          this.applyTransform()
          this.tvist.emit('scroll')
        },
        () => {
          engineLog('Position correction completed', {
            finalLocation: this.location.get(),
            targetPosition,
            normalizedIndex: ctx.normalizedIndex
          })

          // transitionEnd эмитим ВСЕГДА по завершении анимации,
          // чтобы модули (AutoplayModule и др.) могли корректно реагировать
          this.tvist.emit('transitionEnd', ctx.eventIndex)

          if (ctx.indexChanged) {
            this.tvist.emit('slideChangeEnd', ctx.eventIndex)
            this.emitReachEdge(ctx.eventIndex, endIndex)
          }
        }
      )
    } else if (!ctx.indexChanged) {
      // Позиция уже корректна, но эмитим transitionEnd для модулей
      // (например, AutoplayModule ждет это событие для resume)
      // Используем microtask чтобы событие было асинхронным как после анимации
      void Promise.resolve().then(() => {
        this.tvist.emit('transitionEnd', ctx.eventIndex)
      })
    }
  }

  /** Прогресс прокрутки 0..1 (только при !loop) */
  private emitProgress(): void {
    if (this.options.loop) return
    const minScroll = this.getMinScrollPosition()
    const maxScroll = this.getMaxScrollPosition()
    const range = maxScroll - minScroll
    if (range <= 0) return
    const pos = this.location.get()
    const progress = Math.max(0, Math.min(1, (pos - minScroll) / range))
    this.tvist.emit('progress', progress)
  }

  /** События достижения начала/конца (reachBeginning / reachEnd) */
  private emitReachEdge(index: number, endIndex: number): void {
    if (index <= 0) {
      this.tvist.emit('reachBeginning')
    }
    if (index >= endIndex) {
      this.tvist.emit('reachEnd')
    }
  }

  /**
   * Относительная прокрутка
   * @param delta - смещение в слайдах
   */
  scrollBy(delta: number): void {
    const targetIndex = this.index.get() + delta

    // Определяем направление для loop
    // Важно: в loop режиме направление определяется по знаку delta, а не по сравнению индексов
    const direction = delta > 0 ? 'next' : delta < 0 ? 'prev' : undefined
    
    // Сохраняем направление для beforeTransitionStart
    if (direction) {
      this.tvist._scrollDirection = direction
    }
    
    this.scrollTo(targetIndex)
  }

  /**
   * Применяет transform к контейнеру
   */
  applyTransform(): void {
    const container = this.tvist.container
    const pos = this.location.get()

    engineLog('applyTransform', {
      position: pos,
      activeIndex: this.index.get(),
      target: this.target.get()
    })

    if (this.options.direction === 'vertical') {
      container.style.transform = `translate3d(0, ${pos}px, 0)`
    } else {
      container.style.transform = `translate3d(${pos}px, 0, 0)`
    }

    this.tvist.emit('setTranslate', this.tvist, pos)
    this.emitProgress()
  }

  /**
   * Обновление без применения стилей в DOM (используется когда слайдер disabled)
   */
  updateDisabled(): void {
    // Инвалидируем кеши перед обновлением
    this.invalidateRootSizeCache()
    this.slideSizesCacheValid = false

    // Получаем новые значения из опций, но не вызываем DOM-методы типа applyPeek
    this.calculateSizes(true)
    this.calculatePositions()
    // Обновляем Counter.endIndex после изменения perPage
    this.updateCounterLimits()
    // Проверяем блокировку после обновления (важно для resize). Передаём true чтобы не применять классы
    this.checkLock(true)
    // НЕ применяем трансформации — только пересчитываем позиции
    this.syncPositionToIndex(false)
  }

  /**
   * Обновление размеров (вызывается при resize)
   */
  update(): void {
    // Инвалидируем кеши перед обновлением
    this.invalidateRootSizeCache()
    this.slideSizesCacheValid = false

    this.applyPeek()
    this.calculateSizes()
    this.calculatePositions()
    // Обновляем Counter.endIndex после изменения perPage
    this.updateCounterLimits()
    // Проверяем блокировку после обновления (важно для resize)
    this.checkLock()
    this.syncPositionToIndex()
  }

  /**
   * Проверка на необходимость блокировки слайдера.
   * Блокировка включается, если весь контент помещается в контейнер и некуда листать.
   */
  public checkLock(isDisabled = false): void {
    const slideCount = this.tvist.slides.length
    const perPage = this.options.perPage ?? 1
    const hasSizes = this.slideSize > 0 || this.slideSizes.length === slideCount

    // Если размеры ещё не рассчитаны, блокируем просто по количеству слайдов
    if (!hasSizes) {
      this.setLocked(slideCount <= perPage, isDisabled)
      return
    }

    // Размеры доступны: проверяем, помещается ли контент полностью
    const contentFits = this.getContentSize() <= this.containerSize + 1

    if (this.options.loop) {
      this.setLocked(contentFits, isDisabled)
      return
    }

    // Для обычного режима дополнительно проверяем возможность скролла
    const cannotScroll = this.getMaxScrollPosition() >= this.getMinScrollPosition() - 1

    if (slideCount > perPage) {
      this.setLocked(cannotScroll, isDisabled)
    } else {
      this.setLocked(contentFits && cannotScroll, isDisabled)
    }
  }

  /**
   * Получить общий размер всего контента (публичный метод для модулей)
   */
  public getTotalSize(): number {
    return this.getContentSize()
  }

  private getContentSize(): number {
    const slides = this.tvist.slides

    if (slides.length === 0) return 0

    let minPos = Infinity
    let maxPos = -Infinity

    for (let i = 0; i < slides.length; i++) {
      const pos = this.getSlidePosition(i)
      const size = this.getSlideSize(i)
      if (pos < minPos) minPos = pos
      if (pos + size > maxPos) maxPos = pos + size
    }

    if (minPos === Infinity) return 0
    
    return maxPos - minPos
  }

  private setLocked(isLocked: boolean, isDisabled = false): void {
    // Если слайдер выключен, мы не должны менять его стейт блокировки, 
    // чтобы при включении (enable) метод checkLock мог корректно обновить состояние и применить классы.
    // Если мы обновим _isLocked здесь, то при enable() checkLock() вызовет setLocked() с тем же значением isLocked, 
    // условие this._isLocked !== isLocked не выполнится, и классы не обновятся.
    if (isDisabled) {
      return
    }

    if (this._isLocked !== isLocked) {
      this._isLocked = isLocked
      
      this.tvist.root.classList.toggle(TVIST_CLASSES.locked, isLocked)
      
      if (isLocked) {
        // При блокировке сбрасываем позицию на начало (индекс 0)
        this.index.set(0)
        const initialPos = this.getScrollPositionForIndex(0)
        this.location.set(initialPos)
        this.target.set(initialPos)
        
        this.applyTransform()
        this.tvist.emit('lock')
      } else {
        this.tvist.emit('unlock')
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
   * Получить размер слайда (ширина или высота).
   * При autoWidth/autoHeight возвращает размер первого слайда для совместимости с модулями.
   */
  get slideSizeValue(): number {
    return this.slideSizes.length > 0 ? this.getSlideSize(0) : this.slideSize
  }

  /**
   * Получить размер контейнера (ширина или высота)
   */
  get containerSizeValue(): number {
    return this.containerSize
  }

  /**
   * Вычисляет видимость каждого слайда математически (без DOM-запросов).
   * Использует закэшированные slidePositions, slideSizes и текущий location.
   * @returns массив булевых значений видимости для каждого слайда
   */
  public getVisibleSlides(): boolean[] {
    const currentPos = this.location.get()
    const viewportSize = this.containerSize
    const slides = this.tvist.slides
    const result: boolean[] = []
    const THRESHOLD = 1

    for (let i = 0; i < slides.length; i++) {
      // slidePosition — позиция слайда в координатах контента
      // currentPos — отрицательное смещение (translate), поэтому видимая область:
      // от -currentPos до -currentPos + viewportSize
      const viewportStart = -currentPos
      const viewportEnd = viewportStart + viewportSize

      const slideStart = this.getSlidePosition(i)
      const slideEnd = slideStart + this.getSlideSize(i)

      const isVisible = slideStart < viewportEnd - THRESHOLD && slideEnd > viewportStart + THRESHOLD
      result.push(isVisible)
    }

    return result
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
    if (this.isLocked) return false
    if (this.options.loop || this.options.rewind) return true

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
    if (this.isLocked) return false
    if (this.options.loop || this.options.rewind) return true
    return this.index.get() > 0
  }

  /**
   * Очистка
   */
  destroy(): void {
    this.animator.stop()
  }
}
