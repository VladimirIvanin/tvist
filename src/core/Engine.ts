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

    const isVertical = this.options.direction === 'vertical'
    const rootSize = isVertical
      ? getOuterHeight(this.tvist.root)
      : getOuterWidth(this.tvist.root)
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
   * Применяет peek к контейнеру слайдов
   */
  private applyPeek(): void {
    applyPeek(this.tvist.container, this.options)
  }

  /**
   * Применяет peek к контейнеру слайдов (публичный метод)
   * Используется при динамическом обновлении опций
   */
  public applyPeekPublic(): void {
    this.applyPeek()
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

    const gap = this.options.gap ?? 0
    const autoWidth = !isVertical && this.options.autoWidth === true
    const autoHeight = isVertical && this.options.autoHeight === true
    const isAutoSize = autoWidth || autoHeight

    if (!isAutoSize) {
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
    } else {
      this.slideSize = 0
    }

    if (isAutoSize) {
      // В режиме autoWidth/autoHeight только добавляем gap, НЕ трогаем размеры
      slides.forEach((slide, i) => {
        // Сбрасываем только margin (gap может измениться)
        slide.style.marginRight = ''
        slide.style.marginBottom = ''
        
        if (gap > 0 && i !== slides.length - 1) {
          if (isVertical) {
            slide.style.marginBottom = `${gap}px`
          } else {
            slide.style.marginRight = `${gap}px`
          }
        }
      })
      
      // Измеряем реальные размеры из DOM (CSS или инлайн стили)
      this.slideSizes = slides.map((slide) =>
        isVertical ? getOuterHeight(slide) : getOuterWidth(slide)
      )
    } else {
      // В обычном режиме устанавливаем размеры принудительно
      slides.forEach((slide, i) => {
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
        
        if (gap > 0 && i !== slides.length - 1) {
          if (isVertical) {
            slide.style.marginBottom = `${gap}px`
          } else {
            slide.style.marginRight = `${gap}px`
          }
        }
      })
      
      // Очищаем массив размеров (используем общий slideSize)
      this.slideSizes = []
    }
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
  }

  /**
   * Установить позиции слайдов вручную (используется в GridModule)
   */
  public setSlidePositions(positions: number[]): void {
    this.slidePositions = positions
  }

  /**
   * Установить размер слайда вручную (используется в GridModule)
   */
  public setSlideSize(size: number): void {
    this.slideSize = size
  }

  /**
   * Вычисляет последний допустимый индекс для скролла
   * endIndex = slideCount - perPage
   * При autoWidth/autoHeight эффективно perPage = 1
   */
  private getEndIndex(): number {
    const slideCount = this.tvist.slides.length
    const isLoop = this.options.loop === true
    const isAutoSize =
      this.options.autoWidth === true || this.options.autoHeight === true

    if (isLoop || this.options.center || this.options.isNavigation || isAutoSize) {
      return slideCount - 1
    }

    const perPage = this.options.perPage ?? 1
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
    
    const lastIndex = this.tvist.slides.length - 1
    const lastPageRight =
      this.getSlidePosition(lastIndex) + this.getSlideSize(lastIndex)

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
   * Получить все позиции слайдов (публичный метод для тестов)
   */
  public getSlidePositions(): number[] {
    return [...this.slidePositions]
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
    let clampedIndex = this.options.loop || isNavigation || this.options.center
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

    // Сохраняем текущий индекс ДО изменения
    const previousIndex = this.index.get()
    
    // Вычисляем нормализованный индекс БЕЗ изменения Counter (для beforeTransitionStart)
    let normalizedIndex = this.index.loop
      ? (clampedIndex < 0 ? clampedIndex + this.index.max : clampedIndex % this.index.max)
      : Math.max(0, Math.min(clampedIndex, this.index.endIndex))
    
    // Проверяем, действительно ли индекс изменился
    let indexChanged = normalizedIndex !== previousIndex
    
    // eventIndex — realIndex для событий (slideChangeStart, slideChangeEnd и пр.)
    // В loop-режиме normalizedIndex = DOM-позиция, eventIndex = realIndex из data-tvist-slide-index.
    // В обычном режиме они совпадают.
    const eventIndex = this.getEventIndex(normalizedIndex)

    // Событие ПЕРЕД началом анимации и ДО изменения Counter (для loopFix)
    if (indexChanged && !instant) {
      const savedDirection = this.tvist._scrollDirection
      const direction = savedDirection ?? (normalizedIndex > previousIndex ? 'next' : 'prev')
      this.tvist._scrollDirection = undefined
      
      const counterBeforeEmit = this.index.get()
      
      this.tvist.emit('beforeTransitionStart', { index: eventIndex, direction })
      
      const counterAfterEmit = this.index.get()
      
      // LoopModule переставил слайды и обновил Counter на DOM-позицию текущего слайда.
      // После перестановки DOM-позиция целевого слайда могла измениться.
      // Находим DOM-позицию целевого слайда по его eventIndex (= realIndex).
      if (counterBeforeEmit !== counterAfterEmit && this.options.loop) {
        // Ищем DOM-позицию слайда с data-tvist-slide-index === eventIndex
        const targetDomIndex = this.findDomIndexByRealIndex(eventIndex)
        
        if (targetDomIndex !== -1) {
          clampedIndex = targetDomIndex
          normalizedIndex = targetDomIndex
        } else {
          // Fallback: delta подход
          const delta = clampedIndex - counterBeforeEmit
          clampedIndex = counterAfterEmit + delta
          normalizedIndex = ((clampedIndex % this.index.max) + this.index.max) % this.index.max
        }
        // indexChanged определяем по eventIndex (realIndex), а не по DOM-позиции.
        // LoopModule мог переместить целевой слайд на ту же DOM-позицию, что и counterAfterEmit,
        // но realIndex всё равно изменился — нужно эмитить события.
        indexChanged = true
      }
    }
    
    // Обновляем Counter
    this.index.set(clampedIndex)

    engineLog('scrollTo', {
      inputIndex: index,
      clampedIndex,
      normalizedIndex,
      previousIndex,
      indexChanged,
      instant,
      loop: this.options.loop,
      endIndex,
      stack: new Error().stack?.split('\n').slice(2, 6).join(' <- ')
    })

    let targetPosition = this.getScrollPositionForIndex(normalizedIndex)

    // При навигации применяем ограничения (но не для center режима)
    if (isNavigation && !this.options.loop && !this.options.center) {
      const peekTrim = this.options.peekTrim !== false
      const maxPos = peekTrim ? this.getMaxScrollPosition() : -this.getSlidePosition(endIndex)
      const minPos = peekTrim ? this.getMinScrollPosition() : 0
      targetPosition = Math.max(maxPos, Math.min(minPos, targetPosition))
    }

    // События генерируем только если индекс действительно изменился
    if (indexChanged) {
      this.tvist.emit('beforeSlideChange', eventIndex)
    }

    if (instant) {
      this.target.set(targetPosition)
      this.location.set(targetPosition)
      this.applyTransform()
      this.emitProgress()
      
      if (indexChanged) {
        this.tvist.emit('slideChangeEnd', eventIndex)
        this.emitReachEdge(eventIndex, endIndex)
      }
    } else {

      this.target.set(targetPosition)
      const speed = this.options.speed ?? 300

      if (indexChanged) {
        this.tvist.emit('transitionStart', eventIndex)
        this.tvist.emit('slideChangeStart', eventIndex)
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
        indexChanged
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
            this.emitProgress()
            this.tvist.emit('scroll')
          },
          () => {
            engineLog('Position correction completed', {
              finalLocation: this.location.get(),
              targetPosition,
              normalizedIndex
            })
            
            // transitionEnd эмитим ВСЕГДА по завершении анимации,
            // чтобы модули (AutoplayModule и др.) могли корректно реагировать
            this.tvist.emit('transitionEnd', eventIndex)

            if (indexChanged) {
              this.tvist.emit('slideChangeEnd', eventIndex)
              this.emitReachEdge(eventIndex, endIndex)
            }
          }
        )
      } else {
        // Позиция уже корректна, но эмитим transitionEnd для модулей
        // (например, AutoplayModule ждет это событие для resume)
        if (!indexChanged) {
          // Используем microtask чтобы событие было асинхронным как после анимации
          void Promise.resolve().then(() => {
            this.tvist.emit('transitionEnd', eventIndex)
          })
        }
      }
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
  private applyTransform(): void {
    const container = this.tvist.container
    const pos = this.location.get()

    if (this.options.direction === 'vertical') {
      container.style.transform = `translate3d(0, ${pos}px, 0)`
    } else {
      container.style.transform = `translate3d(${pos}px, 0, 0)`
    }

    this.tvist.emit('setTranslate', this.tvist, pos)
    this.emitProgress()
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
    
    // Проверяем блокировку после обновления (важно для resize)
    this.checkLock()

    const currentIndex = this.index.get()
    const targetPosition = this.getScrollPositionForIndex(currentIndex)

    this.target.set(targetPosition)
    this.location.set(targetPosition)
    this.applyTransform()
  }

  /**
   * Проверка на необходимость блокировки слайдера.
   * Блокировка включается, если весь контент помещается в контейнер и некуда листать.
   */
  public checkLock(): void {
    const slideCount = this.tvist.slides.length
    const perPage = this.options.perPage ?? 1
    const hasSizes = this.slideSize > 0 || this.slideSizes.length === slideCount

    if (this.options.loop) {
      if (hasSizes) {
        const contentFits = this.getContentSize() <= this.containerSize + 1
        this.setLocked(contentFits)
      } else {
        this.setLocked(slideCount <= perPage)
      }
      return
    }

    const cannotScroll = hasSizes
      ? this.getMaxScrollPosition() >= this.getMinScrollPosition() - 1
      : false

    if (slideCount > perPage) {
      this.setLocked(hasSizes && cannotScroll)
      return
    }

    const contentFits = this.getContentSize() <= this.containerSize + 1
    this.setLocked(hasSizes ? contentFits && cannotScroll : slideCount <= perPage)
  }

  /**
   * Вычисляет реальный размер контента (включая клоны)
   */
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
    
    // console.log('checkLock debug', { minPos, maxPos, diff: maxPos - minPos, container: this.containerSize, slides: slides.length })

    if (minPos === Infinity) return 0
    
    return maxPos - minPos
  }

  private setLocked(isLocked: boolean): void {
    if (this._isLocked !== isLocked) {
      this._isLocked = isLocked
      
      this.tvist.root.classList.toggle(TVIST_CLASSES.locked, isLocked)
      
      if (isLocked) {
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
