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
  private loopFixed = false // Флаг, что loopFix уже был вызван в этом жесте
  private isFirstMove = true // Флаг первого движения
  private lastDirection: 'prev' | 'next' | null = null // Последнее направление движения
  
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
    // После loopFix обновляем стартовую позицию, если идёт драг
    if (this.isDragging) {
      this.startPosition = this.tvist.engine.location.get()
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
   * При center: true используем getScrollPositionForIndex для корректного учета centerOffset.
   */
  private updateBounds(): void {
    const { engine, slides } = this.tvist
    const perPage = this.options.perPage ?? 1

    if (this.options.loop) {
      this.minPosition = Infinity
      this.maxPosition = -Infinity
    } else {
      // При center: true используем getScrollPositionForIndex, который уже учитывает centerOffset
      if (this.options.center) {
        this.minPosition = engine.getScrollPositionForIndex(0)
        this.maxPosition = engine.getScrollPositionForIndex(slides.length - 1)
      } else {
        const usePeekTrim = this.options.peekTrim !== false
        this.minPosition = usePeekTrim ? engine.getMinScrollPosition() : 0
        this.maxPosition = usePeekTrim
          ? engine.getMaxScrollPosition()
          : -engine.getSlidePosition(slides.length - perPage)
      }
    }
    
    // Отладка границ
    if (this.options.debug) {
      console.log('[DragModule] Границы обновлены:', {
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

    // Passive для touchstart (не блокируем скролл)
    root.addEventListener('touchstart', this.onPointerDown, { passive: true })
    root.addEventListener('mousedown', this.onPointerDown)

    // PointerEvents для универсальности (если поддерживается)
    if ('PointerEvent' in window) {
      root.addEventListener('pointerdown', this.onPointerDown)
    }
  }

  /**
   * Отключение event listeners
   */
  private detachEvents(): void {
    const { root } = this.tvist

    root.removeEventListener('touchstart', this.onPointerDown)
    root.removeEventListener('mousedown', this.onPointerDown)

    if ('PointerEvent' in window) {
      root.removeEventListener('pointerdown', this.onPointerDown)
    }

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
    this.startPosition = this.tvist.engine.location.get()
    this.startIndex = this.tvist.engine.index.get()
    
    // Сбрасываем события для velocity tracking
    this.baseEvent = null
    this.prevBaseEvent = null
    this.lastMoveTime = 0
    
    // Сбрасываем флаги для loop
    this.loopFixed = false
    this.isFirstMove = true
    this.lastDirection = null

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
        
        // КРИТИЧНО: вызываем loopFix ДО первого применения transform
        if (this.options.loop && this.isFirstMove && !this.loopFixed) {
          const loopModule = this.tvist.getModule('loop') as { 
            fix?: (params: { direction?: 'next' | 'prev'; slideTo?: boolean; setTranslate?: boolean }) => void 
          }
          if (loopModule?.fix) {
            // Определяем направление движения:
            // Движение вправо (delta > 0) = движение к началу = 'prev'
            // Движение влево (delta < 0) = движение к концу = 'next'
            const delta = isHorizontal ? deltaX : deltaY
            const direction = delta > 0 ? 'prev' : 'next'
            
            // Вызываем loopFix для подготовки слайдов
            loopModule.fix({ direction })
            this.isFirstMove = false
            this.loopFixed = true // Предотвращаем повторный вызов для этого направления
            // КРИТИЧНО: обновляем startPosition после loopFix
            this.startPosition = this.tvist.engine.location.get()
          }
        }
        
        // Инициализируем базовое событие
        this.baseEvent = { x: point.x, y: point.y, time: now }
        this.lastMoveTime = now
        // Emit события
        this.emit('dragStart', e)
        // Добавляем класс dragging (отключает transition)
        this.tvist.root.classList.add(TVIST_CLASSES.dragging)
      } else {
        return // Ждем превышения порога
      }
    }

    const delta = isHorizontal ? deltaX : deltaY
    
    // Определяем текущее направление движения
    const currentDirection: 'prev' | 'next' = delta > 0 ? 'prev' : 'next'
    
    // Если направление изменилось, вызываем loopFix для нового направления
    if (this.options.loop && this.lastDirection !== null && this.lastDirection !== currentDirection) {
      const loopModule = this.tvist.getModule('loop') as { 
        fix?: (params: { direction?: 'next' | 'prev' }) => void 
      }
      if (loopModule?.fix) {
        loopModule.fix({ direction: currentDirection })
        // КРИТИЧНО: обновляем startPosition после loopFix
        this.startPosition = this.tvist.engine.location.get()
      }
    }
    this.lastDirection = currentDirection

    // Применяем dragSpeed
    const dragSpeed = this.options.dragSpeed ?? 1
    let distance = delta * dragSpeed

    // Устанавливаем позицию
    // При center: true нужно учитывать centerOffset для корректного расчета
    let newPosition: number
    if (this.options.center) {
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

    // Проверяем достижение границ для loopFix
    if (this.options.loop && !this.loopFixed) {
      const loopModule = this.tvist.getModule('loop') as { 
        fix?: (params: { direction?: 'next' | 'prev'; setTranslate?: boolean; activeSlideIndex?: number }) => void 
      }
      if (loopModule?.fix) {
        const slides = this.tvist.slides
        const perPage = this.options.perPage ?? 1
        const currentIndex = this.tvist.engine.index.get()
        
        // Вычисляем пороги
        const slideSize = this.tvist.engine.getSlideSize(0)
        const threshold = slideSize / 2
        
        // Движение к началу (prev)
        if (delta > 0 && newPosition > -threshold && currentIndex === 0) {
          loopModule.fix({ 
            direction: 'prev', 
            setTranslate: true, 
            activeSlideIndex: 0 
          })
          this.loopFixed = true
          this.startPosition = this.tvist.engine.location.get()
        }
        // Движение к концу (next)
        else if (delta < 0 && currentIndex === slides.length - perPage) {
          const maxPos = this.tvist.engine.getScrollPositionForIndex(slides.length - perPage)
          if (newPosition < maxPos - threshold) {
            loopModule.fix({ 
              direction: 'next', 
              setTranslate: true, 
              activeSlideIndex: slides.length - perPage 
            })
            this.loopFixed = true
            this.startPosition = this.tvist.engine.location.get()
          }
        }
      }
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

      // Вычисляем velocity
      const velocity = this.calculateVelocity()

      // Emit события
      this.emit('dragEnd', e)

      // Применяем инерцию или snap
      if (this.options.drag === 'free') {
        this.startMomentum(velocity)
      } else {
        this.snapToNearest(velocity)
      }
    }
    
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
    const basePoint = (this.baseEvent && this.baseEvent.time === now && this.prevBaseEvent)
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
      console.log('[DragModule] startMomentum:', {
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
          console.log('[DragModule] Out of bounds, skipping momentum')
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
    
    if (this.options.debug) {
      console.log('[DragModule] snapToNearestSlide:', {
        currentPosition,
        nearestIndex,
        minDistance
      })
    }
    
    // Переходим к ближайшему слайду
    engine.scrollTo(nearestIndex)
  }

  /**
   * Обычный snap: используем threshold от начальной позиции drag
   */
  private snapWithThreshold(): void {
    const { engine } = this.tvist
    const startIndex = engine.activeIndex
    
    // Размер слайда с gap
    const slideSize = engine.slideSizeValue
    const gap = this.options.gap ?? 0
    const slideWithGap = slideSize + gap
    
    if (slideWithGap === 0) {
      engine.scrollTo(startIndex)
      return
    }
    
    // Вычисляем ЧИСТОЕ расстояние drag (без модификаторов)
    const isHorizontal = this.options.direction !== 'vertical'
    const dragDistance = isHorizontal 
      ? this.currentX - this.startX 
      : this.currentY - this.startY
    
    // Threshold = 20% от размера слайда (как в Embla)
    // Или минимум 80px (как swipeThreshold в Glide)
    const threshold = Math.max(slideSize * 0.2, 80)
    
    // Определяем целевой индекс
    let targetIndex: number
    
    if (Math.abs(dragDistance) < threshold) {
      // Недостаточно сдвинули - возвращаемся к текущему
      targetIndex = startIndex
    } else {
      // Достаточно сдвинули - переходим в направлении свайпа
      if (dragDistance > 0) {
        // Свайп вправо = предыдущий слайд
        targetIndex = startIndex - 1
      } else {
        // Свайп влево = следующий слайд
        targetIndex = startIndex + 1
      }
    }
    
    // Snap через scrollTo
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

