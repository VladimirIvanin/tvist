/**
 * Drag Module
 * 
 * Возможности:
 * - Touch и Mouse поддержка
 * - Velocity tracking для инерции
 * - Rubberband эффект на границах
 * - Momentum scroll с friction
 * - Snap к ближайшему слайду
 * - Free mode без snap
 * - Free mode с опциональным snap (freeSnap)
 * - Passive listeners для производительности
 */

import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

const DRAG_DEBUG = false
const dragLog = (..._args: unknown[]) => {
  if (DRAG_DEBUG) {
    // debug logging
  }
}

interface DragPoint {
  x: number
  y: number
  time: number
}

export class DragModule extends Module {
  readonly name = 'drag'

  private isDragging = false
  private startX = 0
  private startY = 0
  private startPosition = 0
  private startIndex = 0 // Индекс слайда при начале драга (для center mode)
  private currentX = 0 // Текущая позиция курсора
  private currentY = 0
  
  // Для восстановления анимации при коротком клике
  private wasAnimating = false
  private animationTarget: number | null = null

  // RAF для momentum
  private animationId: number | null = null
  
  // Границы для rubberband
  private minPosition = 0
  private maxPosition = 0

  // Настройки
  private readonly FRICTION = 0.92 // более плавное затухание
  private readonly MIN_VELOCITY = 0.05 // Снижен порог для более длинной инерции
  private readonly LOG_INTERVAL = 200 // Интервал обновления базового события (мс)
  
  private readonly MIN_DRAG_DISTANCE = 5
  private isPotentialDrag = false
  
  // Флаги для loop
  private isFirstMove = true // Флаг первого движения
  // Frame-based cooldown для coverageFix: после любого loopFix (isFirstMove или
  // coverageFix) пропускаем N pointermove событий. Это предотвращает каскадный
  // ping-pong (PREV→NEXT→PREV...) при быстрых drag-ах в маленьких каруселях.
  private coverageFixCooldown = 0
  
  // Для расчёта velocity
  private lastMoveTime = 0
  private baseEvent: DragPoint | null = null
  private prevBaseEvent: DragPoint | null = null

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.attachEvents()
    this.updateBounds()

    // Обновляем границы при resize
    this.on('resized', () => this.updateBounds())

    // Слушаем сдвиг позиций (от LoopModule)
    this.on('positionShifted', this.onPositionShifted)
    
    // Слушаем loopFix для обновления стартовой позиции
    this.on('loopFix', this.onLoopFix)
  }

  private onLoopFix = (): void => {
    if (this.isDragging) {
      const before = this.startPosition
      this.startPosition = this.tvist.engine.location.get()
      dragLog('onLoopFix (during drag)', {
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
        startPositionBefore: before,
        startPositionAfter: this.startPosition
      })
    }
  }

  override destroy(): void {
    this.detachEvents()
    this.stopMomentum()
    this.off('positionShifted', this.onPositionShifted)
    this.off('loopFix', this.onLoopFix)
  }

  private onPositionShifted = (delta: number): void => {
    if (this.isDragging) {
      this.startPosition += delta
      
      // Обновляем историю для корректного расчета скорости
      // (хотя скорость зависит от относительного смещения, координаты в истории абсолютные?)
      // В history мы храним clientX/clientY (экранные координаты), они не меняются при сдвиге слайдов.
      // calculateVelocity использует (x - prevX). Это не зависит от slide position.
      // Так что history обновлять не нужно.
    }
  }

  protected override shouldBeActive(): boolean {
    return this.options.drag !== false
  }

  /**
   * Обновление границ для rubberband.
   * При loop границ нет. Без loop: peekTrim — min/max без левого/правого peek.
   * При center: true (без loop) используем getScrollPositionForIndex для корректного учета centerOffset.
   * При marquee границ нет (свободная прокрутка).
   */
  private updateBounds(): void {
    const { engine, slides } = this.tvist
    const perPage = this.options.perPage ?? 1
    const isMarqueeActive = this.options.marquee !== false && this.options.marquee !== undefined

    if (this.options.loop || isMarqueeActive) {
      // При loop или marquee границ нет (бесконечная прокрутка)
      this.minPosition = Infinity
      this.maxPosition = -Infinity
    } else if (this.options.center) {
      // При center: true (без loop) используем getScrollPositionForIndex, который уже учитывает centerOffset
      this.minPosition = engine.getScrollPositionForIndex(0)
      this.maxPosition = engine.getScrollPositionForIndex(slides.length - 1)
    } else {
      const usePeekTrim = this.options.peekTrim !== false
      this.minPosition = usePeekTrim ? engine.getMinScrollPosition() : 0
      this.maxPosition = usePeekTrim
        ? engine.getMaxScrollPosition()
        : -engine.getSlidePosition(slides.length - perPage)
    }
    
    // Отладка границ
    if (this.options.debug) {
      console.warn('[DragModule] Границы обновлены:', {
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        loop: this.options.loop,
        center: this.options.center,
        peekTrim: this.options.peekTrim !== false,
        slidesCount: slides.length,
        perPage
      })
    }
  }

  /**
   * Подключение event listeners
   */
  private attachEvents(): void {
    const { root } = this.tvist

    // Используем Pointer Events если поддерживаются (они покрывают mouse и touch)
    // Иначе используем отдельные обработчики для mouse и touch
    if ('PointerEvent' in window) {
      root.addEventListener('pointerdown', this.onPointerDown)
    } else {
      // Fallback для старых браузеров
      root.addEventListener('touchstart', this.onPointerDown, { passive: true })
      root.addEventListener('mousedown', this.onPointerDown)
    }

    // Предотвращаем нативный drag-and-drop (браузер перехватывает pointer events
    // при попытке перетащить изображение или выделенный текст внутри слайдов)
    root.addEventListener('dragstart', this.onDragStart)

    // Класс --draggable: user-select: none, cursor: grab, touch-action
    root.classList.add(TVIST_CLASSES.draggable)
  }

  /**
   * Предотвращение нативного drag-and-drop
   */
  private onDragStart = (e: Event): void => {
    e.preventDefault()
  }

  /**
   * Отключение event listeners
   */
  private detachEvents(): void {
    const { root } = this.tvist

    if ('PointerEvent' in window) {
      root.removeEventListener('pointerdown', this.onPointerDown)
    } else {
      root.removeEventListener('touchstart', this.onPointerDown)
      root.removeEventListener('mousedown', this.onPointerDown)
    }

    root.removeEventListener('dragstart', this.onDragStart)
    root.classList.remove(TVIST_CLASSES.draggable)
    this.removeDocumentEvents()
  }

  /**
   * Начало драга
   */
  private onPointerDown = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    // Игнорируем если уже драгаем
    if (this.isDragging) return
    
    // Игнорируем если слайдер заблокирован
    if (this.tvist.engine.isLocked) return

    // Игнорируем правую кнопку мыши
    if ('button' in e && e.button !== 0) return

    // Проверяем focusable элементы
    const target = e.target as HTMLElement
    if (this.isFocusableElement(target)) return

    const point = this.getPointerPosition(e)
    if (!point) return

    // Только подготавливаемся, но не начинаем драг сразу (ждем threshold)
    this.isPotentialDrag = true
    this.startX = point.x
    this.startY = point.y
    this.currentX = point.x
    this.currentY = point.y
    this.startIndex = this.tvist.engine.index.get()
    
    // Приостанавливаем marquee если активен.
    // MarqueeModule.pause() сам синхронизирует engine.location с визуальной позицией.
    const marqueeModule = this.tvist.getModule('marquee') as { pause?: () => void }
    marqueeModule?.pause?.()
    
    // startPosition читаем ПОСЛЕ паузы marquee
    // (если marquee активен, engine.location уже синхронизирован в pause())
    this.startPosition = this.tvist.engine.location.get()

    // Сбрасываем события для velocity tracking
    this.baseEvent = null
    this.prevBaseEvent = null
    this.lastMoveTime = 0
    
    // Сбрасываем флаги для loop
    this.isFirstMove = true

    // Запоминаем состояние анимации для возможного восстановления
    this.wasAnimating = this.tvist.engine.animator.isAnimating()
    if (this.wasAnimating) {
      // Сохраняем целевой индекс анимации (activeIndex уже обновлен)
      this.animationTarget = this.tvist.engine.activeIndex
    }

    dragLog('pointerDown', {
      activeIndex: this.tvist.engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      location: this.tvist.engine.location.get(),
      startPosition: this.startPosition,
      startIndex: this.startIndex,
      wasAnimating: this.wasAnimating,
      animationTarget: this.animationTarget,
      loop: this.options.loop,
      rewind: this.options.rewind,
      autoplay: this.options.autoplay,
      slidesCount: this.tvist.slides.length,
      slideSize: this.tvist.engine.slideSizeValue,
      expectedLocationForIndex3: this.tvist.engine.getScrollPositionForIndex(3)
    })

    // Останавливаем активную анимацию если была
    this.stopMomentum()
    this.tvist.engine.animator.stop()

    // Добавляем move/up listeners
    this.addDocumentEvents()
  }

  /**
   * Движение при драге
   */
  private onPointerMove = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return

    const point = this.getPointerPosition(e)
    if (!point) return

    const now = Date.now()

    // Сохраняем текущую позицию курсора
    this.currentX = point.x
    this.currentY = point.y

    // Направление (horizontal/vertical)
    const isHorizontal = this.options.direction !== 'vertical'
    const deltaX = point.x - this.startX
    const deltaY = point.y - this.startY
    const absDelta = isHorizontal ? Math.abs(deltaX) : Math.abs(deltaY)

    // Если еще не начали драг, проверяем threshold
    if (!this.isDragging) {
      if (absDelta > this.MIN_DRAG_DISTANCE) {
        this.isDragging = true
        
        // Останавливаем активную анимацию только когда начинается реальный драг
        this.stopMomentum()
        this.tvist.engine.animator.stop()
        
        // КРИТИЧНО: вызываем loopFix ДО первого применения transform
        if (this.options.loop && this.isFirstMove) {
          const isMarqueeActiveDrag = this.options.marquee !== false && this.options.marquee !== undefined
          
          if (isMarqueeActiveDrag) {
            // В режиме marquee НЕ вызываем loopFix при драге.
            // engine.location уже синхронизирован с визуальной позицией в MarqueeModule.pause().
            // Слайды уже расставлены MarqueeModule для непрерывной прокрутки.
            this.isFirstMove = false
          } else {
            const loopModule = this.tvist.getModule('loop') as { 
              fix?: (params: { direction?: 'next' | 'prev'; slideTo?: boolean; setTranslate?: boolean }) => void 
            }
            if (loopModule?.fix) {
              // Определяем направление движения:
              // Движение вправо (delta > 0) = движение к началу = 'prev'
              // Движение влево (delta < 0) = движение к концу = 'next'
              const delta = isHorizontal ? deltaX : deltaY
              const direction = delta > 0 ? 'prev' : 'next'
              
              dragLog('firstMove loopFix (before)', {
                direction,
                activeIndex: this.tvist.engine.index.get(),
                realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
                location: this.tvist.engine.location.get()
              })
              
              loopModule.fix({ direction })
              this.isFirstMove = false
              
              // Для обычного режима: обновляем startPosition
              this.startPosition = this.tvist.engine.location.get()
              this.startX = point.x
              this.startY = point.y
              this.startIndex = this.tvist.engine.index.get()
              this.coverageFixCooldown = 5
              
              dragLog('firstMove loopFix (after)', {
                activeIndex: this.tvist.engine.index.get(),
                realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
                startPosition: this.startPosition,
                startIndex: this.startIndex
              })
            }
          }
        }
        
        this.baseEvent = { x: point.x, y: point.y, time: now }
        this.lastMoveTime = now
        dragLog('dragStart', {
          activeIndex: this.tvist.engine.index.get(),
          realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
          startIndex: this.startIndex,
          startPosition: this.startPosition
        })
        this.emit('dragStart', e)
        // Добавляем класс dragging (отключает transition)
        this.tvist.root.classList.add(TVIST_CLASSES.dragging)
      } else {
        return // Ждем превышения порога
      }
    }

    const delta = isHorizontal ? deltaX : deltaY

    // direction change loopFix УДАЛЁН:
    // Ранее при смене направления drag вызывался loopFix, но это создавало
    // каскадные сбросы startX/startPosition. Каждый сброс давал dragDelta ≈ 0
    // на следующем кадре, что провоцировало ложные coverageFix и новые direction change.
    // Теперь покрытие viewport обеспечивается только через checkContentCoverageAndFix,
    // который срабатывает по реальным пустотам (с проверкой направления и порога).

    // Применяем dragSpeed
    const dragSpeed = this.options.dragSpeed ?? 1
    let distance = delta * dragSpeed

    // Устанавливаем позицию
    let newPosition: number
    
    // Проверяем активность marquee
    const isMarqueeActive = this.options.marquee !== false && this.options.marquee !== undefined
    
    if (isMarqueeActive) {
      // startPosition уже синхронизирован с визуальной позицией marquee (через pause() в onPointerDown)
      // и корректируется в onLoopFix после перестановки слайдов
      newPosition = this.startPosition + distance
      
      // В marquee с loop режимом не применяем rubberband
      if (this.options.rubberband !== false && !this.options.loop) {
        newPosition = this.applyRubberbandToPosition(newPosition)
      }
    } else if (this.options.center && !this.options.loop) {
      // При center: true (без loop) нужно учитывать centerOffset для корректного расчета
      // Получаем базовую позицию слайда без centerOffset
      const basePosition = -this.tvist.engine.getSlidePosition(this.startIndex)
      // Получаем centerOffset для текущего слайда
      const centerOffset = this.tvist.engine.getCenterOffset(this.startIndex)
      // Рассчитываем новую позицию: базовая позиция + центрирование + смещение от драга
      newPosition = basePosition + centerOffset + distance
      
      // Применяем rubberband на границах (только если включен)
      if (this.options.rubberband !== false) {
        newPosition = this.applyRubberbandToPosition(newPosition)
      }
    } else {
      // Применяем rubberband на границах (только если включен)
      if (this.options.rubberband !== false) {
        distance = this.applyRubberband(distance)
      }
      newPosition = this.startPosition + distance
    }
    this.tvist.engine.location.set(newPosition)
    
    // Применяем transform напрямую (без пересчёта размеров)
    this.tvist.engine.applyTransformPublic()

    // Проверяем покрытие viewport контентом и подставляем слайды при необходимости
    // Работает для всех loop-режимов (обычный loop и marquee + loop)
    if (this.options.loop) {
      this.checkContentCoverageAndFix(newPosition, point)
    }

    // Обновляем базовое событие если прошло достаточно времени
    const elapsed = now - this.lastMoveTime
    if (elapsed > this.LOG_INTERVAL) {
      this.prevBaseEvent = this.baseEvent
      this.baseEvent = { x: point.x, y: point.y, time: now }
      this.lastMoveTime = now
    }

    // Emit события
    this.emit('drag', e)

    // Prevent default для touchmove (избегаем скролла)
    if (e.type === 'touchmove') {
      e.preventDefault()
    }
  }

  /**
   * Окончание драга
   */
  private onPointerUp = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return

    const wasDragging = this.isDragging
    this.isPotentialDrag = false

    // Если был драг
    if (this.isDragging) {
      this.isDragging = false

      // Восстанавливаем transition (удаляем класс)
      this.tvist.root.classList.remove(TVIST_CLASSES.dragging)

      // Проверяем и ограничиваем позицию после drag (rubberband мог вывести за границы)
      if (!this.options.loop) {
        const currentPosition = this.tvist.engine.location.get()
        let clampedPosition = currentPosition
        
        if (currentPosition > this.minPosition) {
          clampedPosition = this.minPosition
        } else if (currentPosition < this.maxPosition) {
          clampedPosition = this.maxPosition
        }
        
        // Если позиция была скорректирована, устанавливаем её
        if (clampedPosition !== currentPosition) {
          this.tvist.engine.location.set(clampedPosition)
          this.tvist.engine.applyTransformPublic()
        }
      }

      const velocity = this.calculateVelocity()

      dragLog('dragEnd', {
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
        location: this.tvist.engine.location.get(),
        startPosition: this.startPosition,
        startIndex: this.startIndex,
        currentX: this.currentX,
        startX: this.startX,
        dragDistance: this.currentX - this.startX,
        willSnap: !(this.options.marquee !== false && this.options.marquee !== undefined),
        dragMode: this.options.drag,
        loop: this.options.loop,
        rewind: this.options.rewind
      })
      this.emit('dragEnd', e)

      const isMarqueeActive = this.options.marquee !== false && this.options.marquee !== undefined
      
      if (isMarqueeActive) {
        // MarqueeModule сам подхватит позицию из engine.location через resume()
        // при получении события dragEnd (уже emitted выше).
        // Не делаем snap — marquee продолжит прокрутку.
      } else {
        // Применяем инерцию или snap для обычного режима
        if (this.options.drag === 'free') {
          this.startMomentum(velocity)
        } else {
          this.snapToNearest(velocity)
        }
      }
    } else if (!wasDragging && this.wasAnimating && this.animationTarget !== null) {
      // Если не было драга, но была анимация - возобновляем её
      // Используем scrollTo без immediate чтобы продолжить анимацию
      this.tvist.scrollTo(this.animationTarget, false)
    }
    
    // Если не было реального drag (tap) — возобновляем marquee если был на паузе.
    // MarqueeModule.resume() безопасен для вызова если не на паузе (проверка внутри).
    if (!wasDragging) {
      const mq = this.tvist.getModule('marquee') as { resume?: () => void }
      mq?.resume?.()
    }
    
    // Сбрасываем флаги
    this.wasAnimating = false
    this.animationTarget = null
    
    // Удаляем listeners в любом случае
    this.removeDocumentEvents()
  }

  /**
   * Добавление document listeners (для move/up вне container)
   */
  private addDocumentEvents(): void {
    // Non-passive для touchmove (нужен preventDefault)
    document.addEventListener('touchmove', this.onPointerMove, { passive: false })
    document.addEventListener('touchend', this.onPointerUp)
    document.addEventListener('touchcancel', this.onPointerUp)

    document.addEventListener('mousemove', this.onPointerMove)
    document.addEventListener('mouseup', this.onPointerUp)

    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', this.onPointerMove)
      document.addEventListener('pointerup', this.onPointerUp)
      document.addEventListener('pointercancel', this.onPointerUp)
    }
  }

  /**
   * Удаление document listeners
   */
  private removeDocumentEvents(): void {
    document.removeEventListener('touchmove', this.onPointerMove)
    document.removeEventListener('touchend', this.onPointerUp)
    document.removeEventListener('touchcancel', this.onPointerUp)

    document.removeEventListener('mousemove', this.onPointerMove)
    document.removeEventListener('mouseup', this.onPointerUp)

    if ('PointerEvent' in window) {
      document.removeEventListener('pointermove', this.onPointerMove)
      document.removeEventListener('pointerup', this.onPointerUp)
      document.removeEventListener('pointercancel', this.onPointerUp)
    }
  }

  /**
   * Получение позиции pointer (универсально для touch/mouse)
   */
  private getPointerPosition(e: TouchEvent | MouseEvent | PointerEvent): { x: number; y: number } | null {
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0]
      return touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY }
    }
    return null
  }

  /**
   * Проверка на focusable элемент
   */
  private isFocusableElement(element: HTMLElement): boolean {
    const focusableSelectors = this.options.focusableElements ?? 
      'input, textarea, select, button, a[href], [tabindex]'
    
    return element.matches(focusableSelectors)
  }

  /**
   * Проверяет покрытие viewport контентом и вызывает loopFix при необходимости.
   * Работает для всех loop-режимов (обычный loop и marquee + loop).
   * Заменяет старую проверку по индексу — использует реальные позиции слайдов.
   */
  private checkContentCoverageAndFix(
    currentPosition: number,
    point: { x: number; y: number }
  ): void {
    const loopModule = this.tvist.getModule('loop') as { 
      fix?: (params: { direction?: 'next' | 'prev'; activeSlideIndex?: number }) => void 
    }
    if (!loopModule?.fix) return

    const isHorizontal = this.options.direction !== 'vertical'
    const viewportSize = isHorizontal 
      ? this.tvist.root.offsetWidth 
      : this.tvist.root.offsetHeight

    // Координаты viewport в пространстве контента
    const vpStart = -currentPosition
    const vpEnd = vpStart + viewportSize

    // Границы контента
    const slides = this.tvist.slides
    if (slides.length === 0) return

    const contentStart = this.tvist.engine.getSlidePosition(0)
    const lastIdx = slides.length - 1
    const contentEnd = this.tvist.engine.getSlidePosition(lastIdx) + this.tvist.engine.getSlideSize(lastIdx)

    // Проверяем только ту сторону, в которую тянет пользователь.
    // Это предотвращает пинг-понг: coverageFix PREV → viewport сдвигается →
    // coverageFix NEXT → viewport сдвигается обратно → бесконечный цикл.
    const isHoriz = this.options.direction !== 'vertical'
    const dragDelta = isHoriz ? (point.x - this.startX) : (point.y - this.startY)

    // Пропускаем проверку если |dragDelta| слишком мал — направление ненадёжно.
    // После каждого loopFix startX сбрасывается к point.x, и на следующем кадре
    // dragDelta ≈ 0.4px с произвольным знаком, что вызывает ложные срабатывания.
    const MIN_COVERAGE_DRAG_DELTA = 10
    if (Math.abs(dragDelta) < MIN_COVERAGE_DRAG_DELTA) {
      return
    }

    // Frame-based cooldown: после любого loopFix (isFirstMove или coverageFix)
    // пропускаем N pointermove событий. При быстрых drag-ах в маленьких каруселях
    // coverageFix вызывает ping-pong (PREV→NEXT→PREV...) потому что каждый fix
    // сдвигает viewport к противоположному краю контента. Пауза в N кадров
    // даёт позиции стабилизироваться.
    if (this.coverageFixCooldown > 0) {
      this.coverageFixCooldown--
      return
    }

    // Буфер = -5px: игнорируем субпиксельные зазоры от floating point,
    // реагируем только на реальные видимые пустоты (> 5px).
    const buffer = -5

    let fixed = false

    if (dragDelta > 0 && vpStart < contentStart + buffer) {
      dragLog('checkContentCoverageAndFix PREV', {
        dragDelta,
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined
      })
      loopModule.fix({ direction: 'prev', activeSlideIndex: 0 })
      fixed = true
    } else if (dragDelta < 0 && vpEnd > contentEnd - buffer) {
      const coverageActiveIdx = this.findSlideNearViewportEdge(vpStart, slides)
      dragLog('checkContentCoverageAndFix NEXT', {
        dragDelta,
        coverageActiveIdx,
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined
      })
      loopModule.fix({ direction: 'next', activeSlideIndex: coverageActiveIdx })
      fixed = true
    }

    if (fixed) {
      // После loopFix обновляем стартовые точки drag для корректного расчёта delta
      this.startPosition = this.tvist.engine.location.get()
      this.startX = point.x
      this.startY = point.y
      this.startIndex = this.tvist.engine.index.get()
      
      // Cooldown: пропускаем следующие N pointermove для стабилизации
      this.coverageFixCooldown = 5
    }
  }

  /**
   * Находит индекс слайда, ближайшего к левому краю viewport.
   * Используется для определения корректного activeSlideIndex при coverageFix NEXT,
   * чтобы loopFix переместил правильное количество слайдов и сделал верную коррекцию позиции.
   * 
   * Проблема: если передать lastIdx, loopFix перемещает слишком много слайдов 
   * (например, 3 из 4) и коррекция создаёт пустоту на противоположном краю.
   * Используя слайд у левого края viewport, мы перемещаем только слайды,
   * которые уже за пределами видимости (слева от viewport).
   */
  private findSlideNearViewportEdge(
    viewportLeft: number,
    slides: HTMLElement[]
  ): number {
    // Находим последний слайд, чья позиция <= viewport left.
    // Это слайд, видимый у левого края viewport.
    let nearestIdx = 0
    for (let i = 0; i < slides.length; i++) {
      const pos = this.tvist.engine.getSlidePosition(i)
      if (pos <= viewportLeft) {
        nearestIdx = i
      }
    }

    // Гарантируем минимум 1, чтобы порог append-проверки в loopFix
    // (activeIdx + slidesPerView > slidesCount - loopedSlides) всегда срабатывал.
    // При index=0 проверка может не пройти для маленьких каруселей.
    return Math.max(nearestIdx, 1)
  }

  /**
   * Rubberband эффект
   * Простое деление на константу для сопротивления за границами
   */
  private applyRubberband(distance: number): number {
    const position = this.startPosition + distance

    // Внутри границ - полное движение БЕЗ сопротивления
    if (position >= this.maxPosition && position <= this.minPosition) {
      return distance
    }

    const FRICTION = 5
    
    // Вычисляем, какая часть distance выходит за границу
    let inBounds = distance
    let outOfBounds = 0
    
    if (position > this.minPosition) {
      // Вышли за правую границу
      const overflow = position - this.minPosition
      inBounds = distance - overflow
      outOfBounds = overflow
    } else if (position < this.maxPosition) {
      // Вышли за левую границу  
      const overflow = this.maxPosition - position
      inBounds = distance + overflow
      outOfBounds = -overflow
    }
    
    // Часть внутри границ движется нормально, часть за границей - с трением
    return inBounds + outOfBounds / FRICTION
  }

  /**
   * Rubberband эффект для абсолютной позиции (используется в center режиме)
   */
  private applyRubberbandToPosition(position: number): number {
    // Внутри границ - возвращаем позицию как есть
    if (position >= this.maxPosition && position <= this.minPosition) {
      return position
    }

    const FRICTION = 5
    
    if (position > this.minPosition) {
      // Вышли за правую границу
      const overflow = position - this.minPosition
      return this.minPosition + overflow / FRICTION
    } else if (position < this.maxPosition) {
      // Вышли за левую границу
      const overflow = this.maxPosition - position
      return this.maxPosition - overflow / FRICTION
    }
    
    return position
  }

  /**
   * Вычисление velocity по последнему событию
   */
  private calculateVelocity(): number {
    // В loop режиме или если не превышены границы - считаем velocity
    const isLoop = this.options.loop
    const currentPosition = this.tvist.engine.location.get()
    const exceeded = currentPosition > this.minPosition || currentPosition < this.maxPosition
    
    if (!isLoop && exceeded) {
      return 0 // Не применяем momentum если за границами
    }

    const now = Date.now()
    const currentPoint = { x: this.currentX, y: this.currentY, time: now }
    
    // Используем prevBaseEvent если baseEvent совпадает с текущим
    const basePoint = (this.baseEvent?.time === now && this.prevBaseEvent)
      ? this.prevBaseEvent
      : this.baseEvent
    
    if (!basePoint) return 0
    
    const timeDiff = now - basePoint.time
    
    // Если времени прошло слишком много или слишком мало - нет velocity
    if (timeDiff === 0 || timeDiff >= this.LOG_INTERVAL) {
      return 0
    }

    const isHorizontal = this.options.direction !== 'vertical'
    const distance = isHorizontal 
      ? currentPoint.x - basePoint.x 
      : currentPoint.y - basePoint.y

    return distance / timeDiff
  }

  /**
   * Momentum scroll (free mode)
   * Простая инерционная анимация с затуханием
   */
  private startMomentum(initialVelocity: number): void {
    // Проверяем, не за границами ли мы уже (для не-loop режима)
    const currentPosition = this.tvist.engine.location.get()
    const isLoop = this.options.loop
    
    if (this.options.debug) {
      console.warn('[DragModule] startMomentum:', {
        currentPosition,
        initialVelocity,
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        isLoop
      })
    }
    
    if (!isLoop) {
      const isOutOfBounds = currentPosition > this.minPosition || currentPosition < this.maxPosition
      
      // Если за границами - не применяем momentum, сразу snap
      if (isOutOfBounds) {
        if (this.options.debug) {
          console.warn('[DragModule] Out of bounds, skipping momentum')
        }
        if (this.options.drag !== 'free' || this.options.freeSnap) {
          this.snapToNearest(initialVelocity)
        }
        return
      }
    }
    
    // Если velocity слишком маленькая - пропускаем momentum
    if (Math.abs(initialVelocity) < 0.1) {
      if (this.options.drag !== 'free' || this.options.freeSnap) {
        this.snapToNearest(initialVelocity)
      }
      return
    }

    const flickPower = this.options.flickPower ?? 600
    
    // Преобразуем velocity (px/ms) в начальную скорость для анимации
    // Умножаем на flickPower для более выраженного эффекта
    let velocity = initialVelocity * flickPower / 60 // Делим на 60 для нормализации к FPS
    
    const animate = (): void => {
      // Применяем friction для плавного затухания
      velocity *= this.FRICTION

      // Обновляем позицию
      const currentPos = this.tvist.engine.location.get()
      let newPosition = currentPos + velocity
      
      // Проверяем границы (если не loop)
      let hitBoundary = false
      if (!isLoop) {
        if (newPosition > this.minPosition) {
          newPosition = this.minPosition
          velocity = 0
          hitBoundary = true
        } else if (newPosition < this.maxPosition) {
          newPosition = this.maxPosition
          velocity = 0
          hitBoundary = true
        }
      }

      this.tvist.engine.location.set(newPosition)
      
      // Применяем transform напрямую (без пересчёта размеров)
      this.tvist.engine.applyTransformPublic()

      // Сообщаем о скролле для LoopModule
      this.emit('scroll')

      // Продолжаем если velocity достаточная
      if (Math.abs(velocity) > this.MIN_VELOCITY && !hitBoundary) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.stopMomentum()
        // Финальный snap если не free mode ИЛИ если включён freeSnap
        if (this.options.drag !== 'free' || this.options.freeSnap) {
          this.snapToNearest(initialVelocity)
        }
      }
    }

    animate()
  }

  /**
   * Snap к ближайшему слайду
   * Две стратегии: threshold для обычного режима, nearest для free+snap
   */
  private snapToNearest(_velocity: number): void {
    const isFreeSnap = this.options.drag === 'free' && this.options.freeSnap
    
    if (isFreeSnap) {
      // Free+Snap: находим БЛИЖАЙШИЙ слайд к текущей позиции
      this.snapToNearestSlide()
    } else {
      // Обычный режим: используем threshold от стартовой позиции
      this.snapWithThreshold()
    }
  }

  /**
   * Free+Snap: находим ближайший слайд к текущей позиции
   */
  private snapToNearestSlide(): void {
    const { engine, slides } = this.tvist
    const currentPosition = engine.location.get()
    
    let nearestIndex = 0
    let minDistance = Infinity
    
    // Ищем слайд, чья позиция ближе всего к текущей
    for (let i = 0; i < slides.length; i++) {
      const slidePosition = engine.getScrollPositionForIndex(i)
      const distance = Math.abs(currentPosition - slidePosition)
      
      if (distance < minDistance) {
        minDistance = distance
        nearestIndex = i
      }
    }
    
    dragLog('snapToNearestSlide', {
      currentPosition,
      nearestIndex,
      minDistance,
      activeIndex: engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined
    })
    
    engine.scrollTo(nearestIndex)
  }

  /**
   * Обычный snap: используем threshold от начальной позиции drag
   */
  private snapWithThreshold(): void {
    const { engine } = this.tvist
    const startIndex = engine.activeIndex
    
    const slideSize = engine.slideSizeValue
    const gap = this.options.gap ?? 0
    const slideWithGap = slideSize + gap
    
    if (slideWithGap === 0) {
      dragLog('snapWithThreshold (no size)', { targetIndex: startIndex })
      engine.scrollTo(startIndex)
      return
    }
    
    const isHorizontal = this.options.direction !== 'vertical'
    const dragDistance = isHorizontal 
      ? this.currentX - this.startX 
      : this.currentY - this.startY
    
    const threshold = Math.max(slideSize * 0.2, 80)
    
    let targetIndex: number
    
    if (Math.abs(dragDistance) < threshold) {
      targetIndex = startIndex
    } else {
      if (dragDistance > 0) {
        targetIndex = startIndex - 1
      } else {
        targetIndex = startIndex + 1
      }
    }

    dragLog('snapWithThreshold', {
      startIndex,
      startIndexFromEngine: this.startIndex,
      targetIndex,
      dragDistance,
      currentLocation: engine.location.get(),
      startPosition: this.startPosition,
      threshold,
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      loop: this.options.loop,
      rewind: this.options.rewind
    })
    
    dragLog('>>> CALLING engine.scrollTo', targetIndex)
    engine.scrollTo(targetIndex)
  }

  /**
   * Остановка momentum анимации
   */
  private stopMomentum(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Хук при resize
   */
  override onResize(): void {
    this.updateBounds()
  }
}

