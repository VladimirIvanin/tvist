/**
 * LoopModule - бесконечная прокрутка (метод перестановки слайдов)
 * 
 * 1. Проставляем data-tvist-slide-index всем слайдам для идентификации.
 * 2. При прокрутке переставляем реальные DOM-узлы (prepend/append).
 * 3. Мгновенно корректируем позицию, чтобы избежать визуальных прыжков.
 * 4. Клоны НЕ создаются - работаем только с оригинальными слайдами.
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

const LOOP_DEBUG = false
const log = (_msg: string, _data?: unknown) => {
  if (LOOP_DEBUG) {
    // debug logging
  }
}

interface LoopFixParams {
  slideRealIndex?: number
  slideTo?: boolean
  direction?: 'next' | 'prev'
  setTranslate?: boolean
  activeSlideIndex?: number
  initial?: boolean // Первый вызов при инициализации
}

export class LoopModule extends Module {
  readonly name = 'loop'
  
  /** Количество слайдов в буфере для loop (вычисляется динамически) */
  public loopedSlides = 0
  
  /** Флаг инициализации */
  private isInitialized = false

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  init(): void {
    if (!this.options.loop) return
    if (this.isInitialized) return

    const slidesCount = this.tvist.slides.length
    if (slidesCount < 1) return

    this.isInitialized = true
    log('Init started', { slidesCount })

    // 2. Первый loopFix для начальной расстановки слайдов
    const initialRealIndex = this.options.start ?? 0
    const bothDirections = this.options.center ?? false
    
    this.loopFix({
      slideRealIndex: initialRealIndex,
      direction: bothDirections ? undefined : 'next',
      initial: true
    })

    log('Init complete', { 
      loopedSlides: this.loopedSlides, 
      totalSlides: this.tvist.slides.length,
      activeIndex: this.tvist.engine.index.get()
    })

    // Подписываемся на beforeTransitionStart для автоматического loopFix
    this.on('beforeTransitionStart', (data: { index: number; direction: 'next' | 'prev' }) => {
      log('beforeTransitionStart received', data)
      this.loopFix({
        direction: data.direction,
      })
    })
    
    // Патчим геттер realIndex
    Object.defineProperty(this.tvist, 'realIndex', {
      get: () => {
        const result = this.getRealIndex()
        if (LOOP_DEBUG) {
          log('realIndex getter called', { result, activeIndex: this.tvist.engine.index.get() })
        }
        return result
      },
      configurable: true
    })
    
    log('realIndex getter installed', {
      hasGetter: 'realIndex' in this.tvist,
      testValue: this.tvist.realIndex
    })
  }

  /**
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.loop === true) {
      this.init()
    } else if (newOptions.loop === false) {
      this.destroy()
    }
  }

  /**
   * Публичный метод для вызова loopFix из других модулей
   * Возвращает скорректированный индекс после loopFix
   */
  public fix(params: LoopFixParams = {}): number {
    return this.loopFix(params)
  }

  /**
   * Получить текущее состояние transform для отладки и тестирования
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
      realIndex: this.getRealIndex(),
      transform: this.tvist.container.style.transform,
      slidesOrder: slides.map(s => s.getAttribute('data-tvist-slide-index') ?? '?'),
      slidesText: slides.map(s => s.textContent?.trim() || '?'),
      loopedSlides: this.loopedSlides
    }
  }

  /**
   * Остановить анимацию и залогировать текущее состояние (для тестирования)
   */
  public pause(label?: string): void {
    // Останавливаем анимацию
    this.tvist.engine.animator.stop()
    if (LOOP_DEBUG) {
      const state = this.getTransformState()
      const prefix = label ? `[Loop Pause: ${label}]` : '[Loop Pause]'
      log(prefix, state)
    }
  }

  /**
   * Основная логика loop: перестановка слайдов и коррекция позиции
   * Возвращает скорректированный активный индекс
   */
  private loopFix(params: LoopFixParams = {}): number {
    const {
      slideRealIndex,
      slideTo = true,
      direction,
      setTranslate,
      activeSlideIndex,
      initial = false
    } = params

    if (!this.options.loop) return this.tvist.engine.index.get()

    log('LoopFix called', {
      slideRealIndex,
      slideTo,
      direction,
      setTranslate,
      activeSlideIndex,
      initial,
      currentIndex: this.tvist.engine.index.get(),
      currentLocation: this.tvist.engine.location.get(),
      currentTarget: this.tvist.engine.target.get()
    })

    this.emit('beforeLoopFix')

    const slides = this.tvist.slides
    const container = this.tvist.container
    const slidesCount = slides.length

    // Вычисляем slidesPerView
    const perPage = this.options.perPage ?? 1
    let slidesPerView = typeof perPage === 'number' ? perPage : 1

    // Для center режима, если четное количество, делаем нечетным
    const bothDirections = this.options.center ?? false
    if (bothDirections && slidesPerView % 2 === 0) {
      slidesPerView = slidesPerView + 1
    }

    // Вычисляем loopedSlides (буфер для loop)
    const slidesPerGroup = this.options.slidesPerGroup ?? 1
    let loopedSlides = bothDirections
      ? Math.max(slidesPerGroup, Math.ceil(slidesPerView / 2))
      : slidesPerView // Используем slidesPerView по умолчанию, если slidesPerGroup < slidesPerView? 
                      // loopedSlides = params.loopedSlides || params.slidesPerView
    
    // Если loopedSlides явно не задан (у нас нет опции loopedSlides), используем slidesPerView для надежности
    // Но если slidesPerGroup > slidesPerView (редко), то берем его
    if (!bothDirections) {
      loopedSlides = Math.max(slidesPerGroup, slidesPerView)
    }

    // Округляем до кратности группе
    if (loopedSlides % slidesPerGroup !== 0) {
      loopedSlides += slidesPerGroup - (loopedSlides % slidesPerGroup)
    }

    this.loopedSlides = loopedSlides

    // Проверка достаточности слайдов
    if (slidesCount < slidesPerView + loopedSlides) {
      console.warn(
        '[Tvist Loop] Warning: Not enough slides for loop mode. Need at least',
        slidesPerView + loopedSlides,
        'slides, but have',
        slidesCount
      )
    }

    // Определяем активный индекс
    const activeIndex = activeSlideIndex ?? this.tvist.engine.index.get()

    const isNext = direction === 'next' || !direction
    const isPrev = direction === 'prev' || !direction

    let slidesPrepended = 0
    let slidesAppended = 0

    const prependSlidesIndexes: number[] = []
    const appendSlidesIndexes: number[] = []

    // Вычисляем activeColIndexWithShift для bothDirections
    const activeColIndexWithShift =
      activeIndex +
      (bothDirections && typeof setTranslate === 'undefined' ? -slidesPerView / 2 + 0.5 : 0)

    log('Loop check', {
      activeIndex,
      activeColIndexWithShift,
      loopedSlides,
      slidesPerView,
      slidesCount,
      isPrev,
      isNext,
      needPrepend: activeColIndexWithShift < loopedSlides,
      needAppend: activeColIndexWithShift + slidesPerView > slidesCount - loopedSlides
    })

    // Prepend: если активный слайд слишком близко к началу
    // Используем slidesPerGroup для определения порога
    if (activeColIndexWithShift < loopedSlides && isPrev) {
      slidesPrepended = Math.max(loopedSlides - activeColIndexWithShift, slidesPerGroup)
      for (let i = 0; i < slidesPrepended; i += 1) {
        const index = i - Math.floor(i / slidesCount) * slidesCount
        prependSlidesIndexes.push(slidesCount - index - 1)
      }
      log('Prepend needed', { slidesPrepended, indexes: prependSlidesIndexes })
    }
    // Append: если активный слайд слишком близко к концу
    else if (activeColIndexWithShift + slidesPerView > slidesCount - loopedSlides && isNext) {
      slidesAppended = Math.max(
        activeColIndexWithShift - (slidesCount - loopedSlides * 2),
        slidesPerGroup
      )
      for (let i = 0; i < slidesAppended; i += 1) {
        const index = i - Math.floor(i / slidesCount) * slidesCount
        appendSlidesIndexes.push(index)
      }
      log('Append needed', { slidesAppended, indexes: appendSlidesIndexes })
    } else {
      log('No rearrangement needed')
    }

    // Запоминаем текущие позиции ДО изменения DOM 
    const currentTranslate = this.tvist.engine.location.get()
    const oldSlidePositions: number[] = []
    
    if (slideTo) {
      // Сохраняем старые позиции слайдов
      for (let i = 0; i < slides.length; i++) {
        oldSlidePositions[i] = this.tvist.engine.getSlidePosition(i)
      }
    }

    // Перемещаем слайды в DOM
    if (isPrev) {
      prependSlidesIndexes.forEach((index) => {
        const slide = slides[index]
        if (slide) {
          container.prepend(slide)
        }
      })
    }

    if (isNext) {
      appendSlidesIndexes.forEach((index) => {
        const slide = slides[index]
        if (slide) {
          container.append(slide)
        }
      })
    }

    // Принудительный reflow для синхронизации DOM 
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    container.offsetLeft

    // Обновляем список слайдов после перемещения
    this.tvist.updateSlidesList()

    // ВАЖНО: Обновляем индекс ДО вызова update(), чтобы модули (Pagination) видели корректный realIndex
    if (slideTo) {
      if (prependSlidesIndexes.length > 0) {
        this.tvist.engine.index.set(activeIndex + Math.ceil(slidesPrepended))
      } else if (appendSlidesIndexes.length > 0) {
        this.tvist.engine.index.set(activeIndex - slidesAppended)
      }
    }
    
    // Сохраняем текущий location перед update (чтобы не было скачка)
    const locationBeforeUpdate = this.tvist.engine.location.get()
    const targetBeforeUpdate = this.tvist.engine.target.get()
    
    this.tvist.update()
    
    // КРИТИЧНО: Если не было перестановки, восстанавливаем location
    // update() всегда сбрасывает location на позицию текущего индекса,
    // но при быстрой смене направления во время анимации это вызывает визуальный скачок
    if (prependSlidesIndexes.length === 0 && appendSlidesIndexes.length === 0) {
      this.tvist.engine.location.set(locationBeforeUpdate)
      this.tvist.engine.target.set(targetBeforeUpdate)
      this.tvist.engine.applyTransformPublic()
      log('Location restored after update (no rearrangement)')
    }

    // Корректируем позицию, чтобы избежать визуального прыжка
    if (prependSlidesIndexes.length > 0) {
      // Вычисляем разницу в позиции слайда (используем сохранённые позиции)
      const oldSlidePosition = oldSlidePositions[activeIndex] ?? 0
      // Используем activeIndex + slidesPrepended, что совпадает с новым индексом, который мы только что установили
      const newSlidePosition = this.tvist.engine.getSlidePosition(activeIndex + Math.ceil(slidesPrepended))
      const diff = newSlidePosition - oldSlidePosition

      log('Prepend correction', {
        activeIndex,
        slidesPrepended,
        oldPosition: oldSlidePosition,
        newPosition: newSlidePosition,
        diff,
        currentTranslate,
        newTranslate: currentTranslate - diff,
        slideTo
      })

      // Корректируем translate мгновенно
      const newTranslate = currentTranslate - diff
      this.tvist.engine.location.set(newTranslate)
      this.tvist.engine.target.set(newTranslate)
      
      // Применяем transform
      this.tvist.engine.applyTransformPublic()

    } else if (appendSlidesIndexes.length > 0) {
      // Вычисляем разницу в позиции слайда (используем сохранённые позиции)
      const oldSlidePosition = oldSlidePositions[activeIndex] ?? 0
      // Используем activeIndex - slidesAppended, что совпадает с новым индексом
      const newSlidePosition = this.tvist.engine.getSlidePosition(activeIndex - slidesAppended)
      const diff = newSlidePosition - oldSlidePosition

      log('Append correction', {
        activeIndex,
        slidesAppended,
        oldPosition: oldSlidePosition,
        newPosition: newSlidePosition,
        diff,
        currentTranslate,
        newTranslate: currentTranslate - diff,
        slideTo
      })

      // Корректируем translate мгновенно 
      const newTranslate = currentTranslate - diff
      this.tvist.engine.location.set(newTranslate)
      this.tvist.engine.target.set(newTranslate)
      
      // Применяем transform
      this.tvist.engine.applyTransformPublic()
    }

    // При инициализации или после перестановки нужно установить activeIndex на слайд с нужным realIndex
    if ((initial || prependSlidesIndexes.length > 0 || appendSlidesIndexes.length > 0) && typeof slideRealIndex !== 'undefined') {
      const slides = this.tvist.slides
      for (let i = 0; i < slides.length; i++) {
        const dataIndex = slides[i]?.getAttribute('data-tvist-slide-index')
        if (dataIndex && parseInt(dataIndex, 10) === slideRealIndex) {
          log('Index correction for realIndex', {
            slideRealIndex,
            foundAtIndex: i,
            currentIndex: this.tvist.engine.index.get(),
            initial
          })
          this.tvist.engine.index.set(i)
          
          // Пересчитываем позицию для нового индекса
          const targetPosition = this.tvist.engine.getScrollPositionForIndex(i)
          this.tvist.engine.location.set(targetPosition)
          this.tvist.engine.target.set(targetPosition)
          this.tvist.engine.applyTransformPublic()
          break
        }
      }
    }

    this.emit('loopFix')

    const finalIndex = this.tvist.engine.index.get()
    
    log('LoopFix complete', {
      prepended: prependSlidesIndexes.length,
      appended: appendSlidesIndexes.length,
      activeIndex: finalIndex
    })
    
    return finalIndex
  }

  /**
   * Возвращает "реальный" индекс (0..N-1) по data-tvist-slide-index
   */
  private getRealIndex(): number {
    const slides = this.tvist.slides
    const activeIndex = this.tvist.engine.index.get()
    
    if (activeIndex < 0 || activeIndex >= slides.length) {
      return 0
    }

    const activeSlide = slides[activeIndex]
    if (!activeSlide) return 0

    const realIndexAttr = activeSlide.getAttribute('data-tvist-slide-index')
    if (realIndexAttr) {
      const parsed = parseInt(realIndexAttr, 10)
      if (LOOP_DEBUG) {
        console.log('[Loop] getRealIndex', { activeIndex, attr: realIndexAttr, parsed })
      }
      return parsed
    }

    return activeIndex
  }

  override destroy(): void {
    if (!this.isInitialized) return

    log('Destroying loop...')

    // Больше не нужно отписываться от beforeTransitionStart

    const slides = this.tvist.slides
    const container = this.tvist.container

    // Получаем realIndex перед изменениями
    const realIndex = this.getRealIndex()

    // Восстанавливаем исходный порядок слайдов по data-tvist-slide-index
    const newSlidesOrder: (HTMLElement | undefined)[] = []
    
    slides.forEach((slideEl) => {
      const indexAttr = slideEl.getAttribute('data-tvist-slide-index')
      if (indexAttr) {
        const index = parseInt(indexAttr, 10)
        newSlidesOrder[index] = slideEl
      }
    })

    // Удаляем атрибуты
    slides.forEach((slideEl) => {
      slideEl.removeAttribute('data-tvist-slide-index')
    })

    // Перестраиваем DOM в правильном порядке
    newSlidesOrder.forEach((slideEl) => {
      if (slideEl) {
        container.append(slideEl)
      }
    })

    // Обновляем список слайдов
    this.tvist.updateSlidesList()
    this.tvist.update()

    // Переходим на тот же реальный слайд
    this.tvist.scrollTo(realIndex, true)
    
    // Удаляем геттер
    if (Object.getOwnPropertyDescriptor(this.tvist, 'realIndex')) {
      const tvistAny = this.tvist as unknown as Record<string, unknown>
      delete tvistAny.realIndex
    }

    this.isInitialized = false
    log('Destroy complete')
  }
}
