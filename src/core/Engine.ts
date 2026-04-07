/**
 * Engine - ядро расчётов позиций, размеров, прокрутки
 */

import { Vector1D } from './Vector1D'
import { Counter } from './Counter'
import { Animator, easings, type EasingFunction } from './Animator'
import { TVIST_CLASSES } from './constants'
import type { Tvist } from './Tvist'
import type { TvistOptions } from './types'
import { getOuterWidth, getOuterHeight } from '../utils/dom'
import { applyPeek, getPeekValue, getPeekValueFromOptions } from '../utils/peek'
import {
  findDomIndexByRealIndex,
  findDomIndexByRealIndexForTransition,
  TVIST_SLIDE_INDEX_ATTR,
} from '../utils/slideRealIndex'

/** Как Splide Scroll: длительность snap после drag = max(|dx|/base, min) */
const DRAG_SNAP_BASE_VELOCITY_PX_PER_MS = 1.5
const DRAG_SNAP_MIN_DURATION_MS = 800

/** Контекст для передачи между подметодами scrollTo */
interface ScrollContext {
  requestedIndex: number
  clampedIndex: number
  normalizedIndex: number
  eventIndex: number
  indexChanged: boolean
}

export class Engine {
  readonly location: Vector1D
  readonly target: Vector1D
  readonly index: Counter
  readonly animator: Animator

  private containerSize = 0
  private slideSize = 0
  /** Размеры каждого слайда при autoWidth/autoHeight */
  private slideSizes: number[] = []
  private slidePositions: number[] = []
  private peekStart = 0
  private peekEnd = 0

  private cachedMinScroll = 0
  private cachedMaxScroll = 0
  private cachedRootSize = 0
  private scrollCacheValid = false

  private cachedRootWidth = 0
  private cachedRootHeight = 0
  private rootSizeCacheValid = false
  private slideSizesCacheValid = false

  private _isLocked = false

  private tvist: Tvist
  private options: TvistOptions

  constructor(tvist: Tvist, options: TvistOptions) {
    this.tvist = tvist
    this.options = options

    const startIndex = options.start ?? 0

    this.location = new Vector1D(0)
    this.target = new Vector1D(0)
    this.index = new Counter(tvist.slides.length, startIndex, this.isLoopEnabled(), this.calculateCounterEndIndex())
    this.animator = new Animator()

    this.applyPeek()
    this.calculateSizes()
    this.calculatePositions()
    this.checkLock()

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
    const dataAttr = slide.getAttribute(TVIST_SLIDE_INDEX_ATTR)
    if (dataAttr !== null) {
      return parseInt(dataAttr, 10)
    }
    return domIndex
  }

  private isLoopEnabled(): boolean {
    const l = this.options.loop
    return l === true || (typeof l === 'object' && l !== null && l.enabled !== false)
  }

  private isLoopWithClonesEnabled(): boolean {
    const l = this.options.loop
    return (
      typeof l === 'object' &&
      l !== null &&
      l.withClones === true &&
      l.enabled !== false
    )
  }

  /**
   * Позиция скролла для индекса. При loop peekTrim не применяется.
   */
  public getScrollPositionForIndex(index: number): number {
    const basePosition = -this.getSlidePosition(index)
    const centerOffset = this.getCenterOffset(index)

    if (this.isLoopEnabled()) {
      if (this.options.center || this.isLoopWithClonesEnabled()) {
        const pos = basePosition + centerOffset
        return pos === 0 ? 0 : pos
      }

      // Ограничиваем позицию чтобы viewport не выходил за пределы контента
      // (важно при небольшом количестве слайдов с peek, иначе появляются "дыры").
      if (!this.scrollCacheValid) this.updateScrollCache()
      const clamped = Math.max(this.cachedMaxScroll, Math.min(this.cachedMinScroll, basePosition))
      return clamped === 0 ? 0 : clamped
    }

    if (this.options.center) {
      const pos = basePosition + centerOffset
      return pos === 0 ? 0 : pos
    }

    const endIndex = this.getEndIndex()
    const peekTrim = this.options.peekTrim !== false

    if (index === 0) return peekTrim ? this.getMinScrollPosition() : 0
    if (index === endIndex) {
      const pos = peekTrim ? this.getMaxScrollPosition() : basePosition
      return pos === 0 ? 0 : pos
    }

    if (this.isAutoSize() && peekTrim) {
      const maxScroll = this.getMaxScrollPosition()
      if (basePosition < maxScroll) return maxScroll
    }

    return basePosition === 0 ? 0 : basePosition
  }

  /**
   * Обновляет кеш размера track элемента (viewport слайдера)
   */
  private updateRootSizeCache(): void {
    this.cachedRootWidth = getOuterWidth(this.tvist.track)
    this.cachedRootHeight = getOuterHeight(this.tvist.track)
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
    // Ограничиваем peek так, чтобы он не превышал 50% базовой ширины/высоты слайда.
    // Базовый размер считаем по root без учёта peek:
    // slideBaseSize = (rootSize - gap * (perPage - 1)) / perPage
    const isVertical = this.options.direction === 'vertical'
    const rootSize = isVertical ? this.cachedRootHeight || getOuterHeight(this.tvist.root)
      : this.cachedRootWidth || getOuterWidth(this.tvist.root)
    const gap = this.options.gap ?? 0
    const perPage = this.options.perPage ?? 1
    const slideBaseSize = (rootSize - gap * (perPage - 1)) / perPage
    const maxPeek = slideBaseSize > 0 && isFinite(slideBaseSize) ? slideBaseSize / 2 : undefined

    applyPeek(this.tvist.track, this.options, maxPeek)
  }

  private calculateSizes(isDisabled = false): void {
    if (this.tvist.slides.length === 0) {
      this.resetSizes()
      return
    }

    this.updatePeekValues(isDisabled)
    this.containerSize = this.getRootSize() - this.peekStart - this.peekEnd

    const isAutoSize = this.isAutoSize()

    if (isAutoSize) {
      this.slideSize = 0
      this.applyAndMeasureAutoSize(isDisabled)
    } else {
      this.calculateFixedSlideSize()
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

    // Дополнительно ограничиваем числовые peek значением не более 50% базового
    // размера слайда (как и в applyPeek), чтобы математическая модель
    // соответствовала DOM.
    const rootSize = this.getRootSize()
    const gap = this.options.gap ?? 0
    const perPage = this.options.perPage ?? 1
    const slideBaseSize = (rootSize - gap * (perPage - 1)) / perPage
    const maxPeek = slideBaseSize > 0 && isFinite(slideBaseSize) ? slideBaseSize / 2 : 0

    if (maxPeek > 0) {
      if (this.peekStart > maxPeek) this.peekStart = maxPeek
      if (this.peekEnd > maxPeek) this.peekEnd = maxPeek
    }
  }

  private calculateFixedSlideSize(): void {
    // Только верхнеуровневый gap: межстраничные отступы grid задаёт GridModule в DOM,
    // позиции для grid перезаписываются в fixEnginePositions по offsetLeft.
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
        // Стили не применены — оставляем предыдущие размеры или инициализируем нулями
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

    if (this.isLoopEnabled() || this.options.center || this.options.isNavigation || this.isAutoSize()) {
      return slideCount - 1
    }

    const perPage = this.options.perPage ?? 1
    return Math.max(0, Math.min(slideCount - perPage, slideCount - 1))
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
    return (this.isLoopEnabled() || this.options.isNavigation || this.options.center)
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
   * @param afterDragSnap - смягчённый snap после отпускания (длительность от расстояния, как Splide)
   */
  scrollTo(index: number, instant = false, afterDragSnap = false): void {
    const endIndex = this.getEndIndex()
    const previousIndex = this.index.get()
    const ctx = this.resolveTargetIndex(index, endIndex, previousIndex)

    if (ctx.indexChanged && !instant) {
      this.handleBeforeTransition(ctx, previousIndex)
    }

    this.index.set(ctx.clampedIndex)

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
      this.performAnimatedScroll(targetPosition, ctx, endIndex, afterDragSnap)
    }
  }

  private resolveTargetIndex(index: number, endIndex: number, previousIndex: number): ScrollContext {
    const loopEnabled = this.isLoopEnabled()
    let clampedIndex = loopEnabled || this.options.isNavigation || this.options.center
      ? index
      : Math.max(0, Math.min(index, endIndex))

    if (this.options.rewind && !loopEnabled) {
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
      requestedIndex: index,
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

    // LoopModule переставил слайды: DOM-позиция целевого слайда могла измениться.
    // Ищем новую DOM-позицию по eventIndex (= realIndex).
    if (counterBeforeEmit !== counterAfterEmit && this.isLoopEnabled()) {
      const withClones = this.isLoopWithClonesEnabled()
      const targetDomIndex = withClones
        ? findDomIndexByRealIndexForTransition(
            this.tvist.slides,
            ctx.eventIndex,
            counterAfterEmit,
            direction
          )
        : findDomIndexByRealIndex(this.tvist.slides, ctx.eventIndex)

      if (targetDomIndex !== -1) {
        ctx.clampedIndex = targetDomIndex
        ctx.normalizedIndex = targetDomIndex
      } else {
        // Fallback: delta-подход
        const delta = ctx.clampedIndex - counterBeforeEmit
        ctx.clampedIndex = counterAfterEmit + delta
        ctx.normalizedIndex = ((ctx.clampedIndex % this.index.max) + this.index.max) % this.index.max
      }
      // realIndex изменился — события должны эмититься независимо от DOM-позиции
      ctx.indexChanged = true
    }
  }

  /** При навигации применяем ограничения (но не для center режима) */
  private clampTargetPosition(position: number, endIndex: number): number {
    if (!this.options.isNavigation || this.isLoopEnabled() || this.options.center) {
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
      this.emitReachEdge(ctx, endIndex)
    }
  }

  private performAnimatedScroll(
    targetPosition: number,
    ctx: ScrollContext,
    endIndex: number,
    afterDragSnap: boolean
  ): void {
    this.target.set(targetPosition)
    const defaultSpeed = this.options.speed ?? 300

    if (ctx.indexChanged) {
      this.tvist.emit('transitionStart', ctx.eventIndex)
      this.tvist.emit('slideChangeStart', ctx.eventIndex)
    }

    // Проверяем, нужна ли анимация для корректировки позиции
    const currentLocation = this.location.get()
    const needsAnimation = Math.abs(currentLocation - targetPosition) > 0.5

    const travel = Math.abs(currentLocation - targetPosition)
    let duration = defaultSpeed
    let easingFn: EasingFunction = easings.easeOutQuad
    if (afterDragSnap) {
      duration = Math.max(
        travel / DRAG_SNAP_BASE_VELOCITY_PX_PER_MS,
        DRAG_SNAP_MIN_DURATION_MS
      )
      easingFn = easings.easeOutQuart
    }

    if (needsAnimation) {
      this.animator.animate(
        currentLocation,
        targetPosition,
        duration,
        (value) => {
          this.location.set(value)
          this.applyTransform()
          this.tvist.emit('scroll')
        },
        () => {
          // transitionEnd эмитим всегда по завершении анимации
          this.tvist.emit('transitionEnd', ctx.eventIndex)

          if (ctx.indexChanged) {
            this.tvist.emit('slideChangeEnd', ctx.eventIndex)
            this.emitReachEdge(ctx, endIndex)
          }
        },
        easingFn
      )
    } else if (!ctx.indexChanged) {
      // Позиция уже корректна; microtask чтобы событие было асинхронным как после анимации
      void Promise.resolve().then(() => {
        this.tvist.emit('transitionEnd', ctx.eventIndex)
      })
    }
  }

  /** Прогресс прокрутки 0..1 (только при !loop) */
  private emitProgress(): void {
    if (this.isLoopEnabled()) return
    const minScroll = this.getMinScrollPosition()
    const maxScroll = this.getMaxScrollPosition()
    const range = maxScroll - minScroll
    if (range <= 0) return
    const pos = this.location.get()
    const progress = Math.max(0, Math.min(1, (pos - minScroll) / range))
    this.tvist.emit('progress', progress)
  }

  /** События достижения начала/конца (reachBeginning / reachEnd) */
  private emitReachEdge(ctx: ScrollContext, endIndex: number): void {
    const index = ctx.eventIndex
    // reach-edge только когда requestedIndex вышел за пределы доступного диапазона
    const loopEnabled = this.isLoopEnabled()
    const triedBeforeStart = !loopEnabled && ctx.requestedIndex < 0
    const triedAfterEnd = !loopEnabled && !this.options.rewind && ctx.requestedIndex > endIndex

    if (index <= 0 && triedBeforeStart) {
      this.tvist.emit('reachBeginning')
    }
    if (index >= endIndex && triedAfterEnd) {
      this.tvist.emit('reachEnd')
    }
  }

  scrollBy(delta: number, afterDragSnap = false): void {
    const targetIndex = this.index.get() + delta
    // В loop-режиме направление определяется по знаку delta, а не по сравнению индексов
    const direction = delta > 0 ? 'next' : delta < 0 ? 'prev' : undefined
    if (direction) this.tvist._scrollDirection = direction
    this.scrollTo(targetIndex, false, afterDragSnap)
  }

  /**
   * Применяет transform к контейнеру
   */
  applyTransform(): void {
    const container = this.tvist.container
    const rawPos = this.location.get()
    const pos = this.options.roundLengths === false ? rawPos : Math.round(rawPos)

    if (this.options.direction === 'vertical') {
      container.style.transform = `translate3d(0, ${pos}px, 0)`
    } else {
      container.style.transform = `translate3d(${pos}px, 0, 0)`
    }

    this.tvist.emit('setTranslate', this.tvist, pos)
    this.emitProgress()
  }

  /** Пересчёт без применения стилей (слайдер disabled) */
  updateDisabled(): void {
    this.invalidateRootSizeCache()
    this.slideSizesCacheValid = false
    this.calculateSizes(true)
    this.calculatePositions()
    this.updateCounterLimits()
    this.checkLock(true)
    this.syncPositionToIndex(false)
  }

  /** Пересчёт размеров и позиций (resize) */
  update(): void {
    this.invalidateRootSizeCache()
    this.slideSizesCacheValid = false
    this.applyPeek()
    this.calculateSizes()
    this.calculatePositions()
    this.updateCounterLimits()
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

    const contentFits = this.getContentSize() <= this.containerSize + 1

    if (this.isLoopEnabled()) {
      const smallLoopCarousel = slideCount <= perPage + 1

      if (!smallLoopCarousel) {
        this.setLocked(contentFits, isDisabled)
        return
      }

      // Для малого loop: дополнительно проверяем, достаточен ли диапазон скролла.
      // Если он меньше 60% размера слайда, листать "некуда" с точки зрения пользователя.
      let shouldLock = contentFits

      if (!shouldLock) {
        const scrollRange = Math.abs(this.getMinScrollPosition() - this.getMaxScrollPosition())
        const MIN_MEANINGFUL_SCROLL = this.getSlideSize(0) * 0.6

        if (scrollRange < MIN_MEANINGFUL_SCROLL) {
          shouldLock = true
        }
      }

      this.setLocked(shouldLock, isDisabled)
      return
    }

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
    // В disabled-режиме не меняем стейт: при enable() checkLock() должен
    // применить классы заново, что произойдёт только если _isLocked изменится.
    if (isDisabled) return

    if (this._isLocked !== isLocked) {
      this._isLocked = isLocked
      this.tvist.root.classList.toggle(TVIST_CLASSES.locked, isLocked)

      if (isLocked) {
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
   * Для эффекта cube маска граней задаётся в SlideStatesModule через `getCubeSlidesInRange`.
   *
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
    if (this.isLoopEnabled() || this.options.rewind) return true

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
    if (this.isLoopEnabled() || this.options.rewind) return true
    return this.index.get() > 0
  }

  /**
   * Очистка
   */
  destroy(): void {
    this.animator.stop()
  }
}
