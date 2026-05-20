/**
 * LoopModule — бесконечная прокрутка.
 *
 * Режим без клонов: перестановка оригинальных DOM-узлов (prepend/append) + коррекция translate.
 * Режим withClones: клоны по краям, без перестановки оригиналов; старт на первом не-клоне с нужным realIndex.
 */

import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { TvistOptions } from '../../core/types'
import { findDomIndexByRealIndex } from '../../utils/slideRealIndex'

interface LoopFixParams {
  slideRealIndex?: number
  slideTo?: boolean
  direction?: 'next' | 'prev'
  setTranslate?: boolean
  activeSlideIndex?: number
  /** Первый вызов при инициализации */
  initial?: boolean
}

export class LoopModule extends Module {
  readonly name = 'loop'

  /** Количество слайдов в буфере для loop (вычисляется динамически) */
  public loopedSlides = 0

  private isInitialized = false

  private _withClones = false
  private _clonesPerSide = 0

  init(): void {
    const config = this.getLoopConfig()
    const loopEnabled = config.enabled
    this._withClones = config.withClones

    if (!loopEnabled || this.isInitialized) return

    if (this._withClones) {
      this.createClones()
      this.tvist.engine.update()
    }

    const slidesCount = this.tvist.slides.length
    if (slidesCount < 1) return

    this.isInitialized = true

    const initialRealIndex = this.options.start ?? 0
    const bothDirections = this.tvist.engine.isCenterActive() || this.options.peek !== undefined
    const hasPeek = this.options.peek !== undefined

    this.loopFix({
      slideRealIndex: initialRealIndex,
      direction: (bothDirections || hasPeek) ? undefined : 'next',
      initial: true,
    })

    this.on('beforeTransitionStart', (data: { index: number; direction: 'next' | 'prev' }) => {
      this.loopFix({ direction: data.direction })
    })
  }

  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    const loopOpt = newOptions.loop
    const loopEnabled =
      loopOpt === true || (typeof loopOpt === 'object' && loopOpt.enabled !== false)

    if (loopEnabled) {
      this.init()
    } else if (newOptions.loop === false) {
      this.destroy()
    }
  }

  /**
   * Публичный вызов loopFix из других модулей.
   * Возвращает скорректированный активный индекс.
   */
  public fix(params: LoopFixParams = {}): number {
    return this.loopFix(params)
  }

  /**
   * Состояние transform для отладки и тестирования.
   */
  public getTransformState(): {
    location: number
    target: number
    activeIndex: number
    realIndex: number
    transform: string
    slidesOrder: string[]
    slidesText: string[]
    loopedSlides: number
  } {
    const slides = this.tvist.slides
    return {
      location: this.tvist.engine.location.get(),
      target: this.tvist.engine.target.get(),
      activeIndex: this.tvist.engine.index.get(),
      realIndex: this.tvist.realIndex,
      transform: this.tvist.container.style.transform,
      slidesOrder: slides.map(s => s.getAttribute('data-tvist-slide-index') ?? '?'),
      slidesText: slides.map(s => s.textContent?.trim() || '?'),
      loopedSlides: this.loopedSlides,
    }
  }

  private loopFix(params: LoopFixParams = {}): number {
    const {
      slideRealIndex,
      slideTo = true,
      direction,
      setTranslate,
      activeSlideIndex,
      initial = false,
    } = params

    const loopEnabled = this.getLoopConfig().enabled
    const withClones = this._withClones
    if (!loopEnabled) return this.tvist.engine.index.get()

    this.emit('beforeLoopFix')

    const slides = this.tvist.slides
    const container = this.tvist.container
    const slidesCount = slides.length
    const bothDirections = this.tvist.engine.isCenterActive() || this.options.peek !== undefined

    const loopedSlides = this.computeLoopedSlides(bothDirections)
    this.loopedSlides = loopedSlides

    const slidesPerView = this.getSlidesPerView(bothDirections)

    let requiredSlides = slidesPerView + loopedSlides
    if (bothDirections) {
      requiredSlides += Math.floor(slidesPerView / 2)
    }

    if (slidesCount < requiredSlides) {
      console.warn(
        '[Tvist Loop] Warning: Not enough slides for loop mode. Need at least',
        requiredSlides,
        'slides, but have',
        slidesCount
      )
    }

    const activeIndex = activeSlideIndex ?? this.tvist.engine.index.get()

    if (withClones && !initial) {
      this.teleportIfNeeded(activeIndex, slidesPerView, slidesCount)
    }

    const isNext = direction === 'next' || !direction
    const isPrev = direction === 'prev' || !direction

    const activeColIndexWithShift =
      activeIndex +
      (bothDirections && typeof setTranslate === 'undefined' ? -slidesPerView / 2 + 0.5 : 0)

    const hasPeek = this.options.peek !== undefined
    const needsPrepend = isPrev || hasPeek
    const needsAppend = isNext || hasPeek

    const prependIndexes = !withClones && needsPrepend
      ? this.preparePrependIndexes(activeColIndexWithShift, loopedSlides, slidesCount)
      : []

    const appendIndexes = !withClones && needsAppend && prependIndexes.length === 0
      ? this.prepareAppendIndexes(activeColIndexWithShift, slidesPerView, loopedSlides, slidesCount)
      : []

    const oldSlidePositions: number[] = []
    if (slideTo) {
      for (let i = 0; i < slides.length; i++) {
        oldSlidePositions[i] = this.tvist.engine.getSlidePosition(i)
      }
    }

    this.applyDomRearrangement(container, slides, isPrev, isNext, prependIndexes, appendIndexes)

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    container.offsetLeft

    this.tvist.updateSlidesList()

    if (slideTo) {
      if (prependIndexes.length > 0) {
        this.tvist.engine.index.set(activeIndex + Math.ceil(prependIndexes.length))
      } else if (appendIndexes.length > 0) {
        this.tvist.engine.index.set(activeIndex - appendIndexes.length)
      }
    }

    if (prependIndexes.length > 0 || appendIndexes.length > 0) {
      const locationBeforeUpdate = this.tvist.engine.location.get()
      const targetBeforeUpdate = this.tvist.engine.target.get()
      this.tvist.update()
      this.tvist.engine.location.set(locationBeforeUpdate)
      this.tvist.engine.target.set(targetBeforeUpdate)
    }

    const actualNewIndex = this.tvist.engine.index.get()

    if (prependIndexes.length > 0) {
      this.correctPositionAfterRearrange(
        activeIndex,
        actualNewIndex,
        oldSlidePositions
      )
    } else if (appendIndexes.length > 0) {
      this.correctPositionAfterRearrange(
        activeIndex,
        actualNewIndex,
        oldSlidePositions
      )
    }

    if (
      (initial || prependIndexes.length > 0 || appendIndexes.length > 0) &&
      typeof slideRealIndex !== 'undefined'
    ) {
      const found = findDomIndexByRealIndex(this.tvist.slides, slideRealIndex, {
        preferNonClone: withClones,
      })
      if (found !== -1) {
        this.tvist.engine.index.set(found)
        const targetPosition = this.tvist.engine.getScrollPositionForIndex(found)
        this.tvist.engine.location.set(targetPosition)
        this.tvist.engine.target.set(targetPosition)
        this.tvist.engine.applyTransform()
      }
    }

    this.emit('loopFix')
    return this.tvist.engine.index.get()
  }

  private getSlidesPerView(bothDirections: boolean): number {
    const perPage = this.options.perPage ?? 1
    let slidesPerView = typeof perPage === 'number' ? perPage : 1
    if (bothDirections && slidesPerView % 2 === 0) {
      slidesPerView += 1
    }
    return slidesPerView
  }

  private computeLoopedSlides(bothDirections: boolean): number {
    const slidesPerView = this.getSlidesPerView(bothDirections)
    const slidesPerGroup = this.options.slidesPerGroup ?? 1
    const hasPeek = this.options.peek !== undefined

    let loopedSlides = bothDirections || hasPeek
      ? Math.max(slidesPerGroup, Math.ceil(slidesPerView / 2) + (hasPeek ? 1 : 0))
      : Math.max(slidesPerGroup, slidesPerView + (hasPeek ? 1 : 0))

    if (loopedSlides % slidesPerGroup !== 0) {
      loopedSlides += slidesPerGroup - (loopedSlides % slidesPerGroup)
    }

    return Math.max(loopedSlides, hasPeek ? 2 : 1)
  }

  private preparePrependIndexes(
    activeColIndexWithShift: number,
    loopedSlides: number,
    slidesCount: number
  ): number[] {
    if (activeColIndexWithShift >= loopedSlides) return []

    const slidesPerGroup = this.options.slidesPerGroup ?? 1
    const calculatedPrepended = Math.max(loopedSlides - activeColIndexWithShift, slidesPerGroup)
    const slidesPrepended = Math.min(calculatedPrepended, slidesCount - 1)
    
    const indexes: number[] = []
    for (let i = 0; i < slidesPrepended; i++) {
      indexes.push(slidesCount - (i % slidesCount) - 1)
    }
    return indexes
  }

  private prepareAppendIndexes(
    activeColIndexWithShift: number,
    slidesPerView: number,
    loopedSlides: number,
    slidesCount: number
  ): number[] {
    if (activeColIndexWithShift + slidesPerView <= slidesCount - loopedSlides) return []

    const slidesPerGroup = this.options.slidesPerGroup ?? 1
    const calculatedAppended = Math.max(activeColIndexWithShift - (slidesCount - loopedSlides * 2), slidesPerGroup)
    const slidesAppended = Math.min(calculatedAppended, slidesCount - 1)
    
    const indexes: number[] = []
    for (let i = 0; i < slidesAppended; i++) {
      indexes.push(i % slidesCount)
    }
    return indexes
  }

  private applyDomRearrangement(
    container: HTMLElement,
    slides: readonly HTMLElement[],
    isPrev: boolean,
    isNext: boolean,
    prependIndexes: number[],
    appendIndexes: number[]
  ): void {
    if (isPrev && prependIndexes.length > 0) {
      const fragment = document.createDocumentFragment()
      for (let i = prependIndexes.length - 1; i >= 0; i--) {
        const idx = prependIndexes[i]
        const slide = idx !== undefined ? slides[idx] : undefined
        if (slide) fragment.appendChild(slide)
      }
      container.prepend(fragment)
    }

    if (isNext && appendIndexes.length > 0) {
      const fragment = document.createDocumentFragment()
      appendIndexes.forEach(index => {
        const slide = slides[index]
        if (slide) fragment.appendChild(slide)
      })
      container.append(fragment)
    }
  }

  private teleportIfNeeded(
    activeIndex: number,
    slidesPerView: number,
    slidesCount: number
  ): void {
    const safeZone = this._clonesPerSide > 0 ? this._clonesPerSide : slidesPerView
    if (activeIndex >= safeZone && activeIndex < slidesCount - safeZone) return

    const currentRealIndex = this.tvist.realIndex
    const targetDomIndex = findDomIndexByRealIndex(this.tvist.slides, currentRealIndex, {
      preferNonClone: true,
    })

    if (targetDomIndex !== -1 && targetDomIndex !== activeIndex) {
      const newPosition = this.tvist.engine.getScrollPositionForIndex(targetDomIndex)
      this.tvist.engine.index.set(targetDomIndex)
      this.tvist.engine.location.set(newPosition)
      this.tvist.engine.target.set(newPosition)
      this.tvist.engine.applyTransform()
    }
  }

  private correctPositionAfterRearrange(
    oldActiveIndex: number,
    newActiveIndex: number,
    oldSlidePositions: number[]
  ): void {
    const currentTranslate = this.tvist.engine.location.get()
    const oldSlidePosition = oldSlidePositions[oldActiveIndex] ?? 0
    const newSlidePosition = this.tvist.engine.getSlidePosition(newActiveIndex)
    const diff = newSlidePosition - oldSlidePosition
    const newTranslate = currentTranslate - diff

    this.tvist.engine.location.set(newTranslate)
    this.tvist.engine.target.set(newTranslate)
    this.tvist.engine.applyTransform()
  }

  override destroy(): void {
    if (!this.isInitialized) return

    const slides = this.tvist.slides
    const container = this.tvist.container
    const realIndex = this.tvist.realIndex

    const newSlidesOrder: (HTMLElement | undefined)[] = []
    slides.forEach(slideEl => {
      const indexAttr = slideEl.getAttribute('data-tvist-slide-index')
      if (indexAttr) {
        newSlidesOrder[parseInt(indexAttr, 10)] = slideEl
      }
    })

    slides.forEach(slideEl => slideEl.removeAttribute('data-tvist-slide-index'))

    const fragment = document.createDocumentFragment()
    newSlidesOrder.forEach(slideEl => {
      if (slideEl) fragment.appendChild(slideEl)
    })
    container.appendChild(fragment)

    this.tvist.updateSlidesList()
    this.tvist.update()
    this.tvist.scrollTo(realIndex, true)

    this.isInitialized = false
  }

  private getLoopConfig(): { enabled: boolean; withClones: boolean } {
    const raw = this.options.loop

    let enabled = false
    let withClones = false

    if (raw === true) {
      enabled = true
      withClones = false
    } else if (typeof raw === 'object' && raw !== null) {
      enabled = raw.enabled !== false
      withClones = raw.withClones === true
    }

    if (enabled && !withClones) {
      const slidesCount = this.tvist.slides.length
      const bothDirections = this.tvist.engine.isCenterActive() || this.options.peek !== undefined
      const slidesPerView = this.getSlidesPerView(bothDirections)
      const loopedSlides = this.computeLoopedSlides(bothDirections)
      
      let requiredSlides = slidesPerView + loopedSlides
      if (bothDirections) {
        requiredSlides += Math.floor(slidesPerView / 2)
      }
      
      if (slidesCount > slidesPerView && slidesCount < requiredSlides) {
        withClones = true
      }
    }

    return { enabled, withClones }
  }

  /**
   * Создаёт DOM-клоны по краям для режима withClones.
   */
  private createClones(): void {
    const slides = this.tvist.slides
    const container = this.tvist.container
    const originalCount = slides.length

    if (originalCount === 0) return

    const perPage = this.options.perPage ?? 1
    const slidesPerGroup = this.options.slidesPerGroup ?? 1
    const base = typeof perPage === 'number' ? perPage : 1
    
    // Добавляем +1 к base, так как peek может показывать часть следующего слайда,
    // и нам нужен запасной клон, чтобы не было "дыры" во время анимации.
    const needed = Math.max(base + 1, slidesPerGroup)
    const clonesPerSide = Math.ceil(needed / originalCount) * originalCount
    this._clonesPerSide = clonesPerSide

    for (let i = 0; i < clonesPerSide; i++) {
      const original = slides[i % originalCount]
      if (!original) continue
      const clone = original.cloneNode(true) as HTMLElement
      clone.classList.add(TVIST_CLASSES.slideClone)
      const realIndexAttr = original.getAttribute('data-tvist-slide-index')
      if (realIndexAttr != null) clone.setAttribute('data-tvist-slide-index', realIndexAttr)
      container.appendChild(clone)
    }

    const headFragment = document.createDocumentFragment()
    for (let i = 0; i < clonesPerSide; i++) {
      const original = slides[(originalCount - 1 - (i % originalCount) + originalCount) % originalCount]
      if (!original) continue
      const clone = original.cloneNode(true) as HTMLElement
      clone.classList.add(TVIST_CLASSES.slideClone)
      const realIndexAttr = original.getAttribute('data-tvist-slide-index')
      if (realIndexAttr != null) clone.setAttribute('data-tvist-slide-index', realIndexAttr)
      headFragment.prepend(clone)
    }
    container.prepend(headFragment)

    this.tvist.updateSlidesList()
  }
}
