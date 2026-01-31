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
 * - Passive listeners для производительности
 */

import { Module } from '../Module'
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
  private currentX = 0 // Текущая позиция курсора
  private currentY = 0
  private history: DragPoint[] = []

  // RAF для momentum
  private animationId: number | null = null
  
  // Границы для rubberband
  private minPosition = 0
  private maxPosition = 0

  // Настройки
  private readonly FRICTION = 0.85
  private readonly HISTORY_LENGTH = 5
  private readonly MIN_VELOCITY = 0.1

  private readonly MIN_DRAG_DISTANCE = 5
  private isPotentialDrag = false

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.attachEvents()
    this.updateBounds()

    // Обновляем границы при resize
    this.on('resize', () => this.updateBounds())

    // Слушаем сдвиг позиций (от LoopModule)
    this.on('positionShifted', this.onPositionShifted)
  }

  override destroy(): void {
    this.detachEvents()
    this.stopMomentum()
    this.off('positionShifted', this.onPositionShifted)
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
   * Обновление границ для rubberband (в пикселях)
   */
  private updateBounds(): void {
    const { slides, engine } = this.tvist
    const perPage = this.options.perPage ?? 1

    // Границы в пикселях (позиции первого и последнего слайда)
    this.minPosition = 0
    this.maxPosition = -engine.getSlidePosition(slides.length - perPage)

    // С loop границ нет
    if (this.options.loop) {
      this.minPosition = Infinity
      this.maxPosition = -Infinity
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
    this.history = []

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
        // Emit события
        this.emit('dragStart', e)
        // Добавляем класс dragging (отключает transition)
        this.tvist.root.classList.add('tvist--dragging')
      } else {
        return // Ждем превышения порога
      }
    }

    const delta = isHorizontal ? deltaX : deltaY

    // Применяем dragSpeed
    const dragSpeed = this.options.dragSpeed ?? 1
    let distance = delta * dragSpeed

    // Применяем rubberband на границах (только если включен)
    if (this.options.rubberband !== false) {
      distance = this.applyRubberband(distance)
    }

    // Устанавливаем позицию
    const newPosition = this.startPosition + distance
    // console.log('Updating location to', newPosition)
    this.tvist.engine.location.set(newPosition)
    
    // Применяем transform напрямую (без пересчёта размеров)
    this.tvist.engine.applyTransformPublic()

    // Сохраняем в историю для velocity tracking
    this.history.push({
      x: point.x,
      y: point.y,
      time: Date.now()
    })

    // Ограничиваем размер истории
    if (this.history.length > this.HISTORY_LENGTH) {
      this.history.shift()
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
      this.tvist.root.classList.remove('tvist--dragging')

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
   * Rubberband эффект - более мягкий вариант
   * Позволяет перетягивать за границы с плавным сопротивлением
   */
  private applyRubberband(distance: number): number {
    const position = this.startPosition + distance
    const { container } = this.tvist
    const containerWidth = container.clientWidth

    // Внутри границ - полное движение БЕЗ сопротивления
    // maxPosition отрицательный (например -1200), minPosition = 0
    // Поэтому: -1200 <= position <= 0
    if (position >= this.maxPosition && position <= this.minPosition) {
      return distance
    }

    // За границей - применяем мягкое сопротивление
    const overflow = position > this.minPosition 
      ? position - this.minPosition 
      : this.maxPosition - position

    // ИСПРАВЛЕННАЯ формула: более мягкое сопротивление
    // Было: resistance = (1 - overflow/width * 2)² - слишком агрессивно
    // Стало: resistance = 1 / (1 + overflow/width * 3) - более плавно
    const friction = 3 // коэффициент трения (чем больше, тем сильнее сопротивление)
    const resistance = 1 / (1 + (overflow / containerWidth) * friction)
    
    return distance * resistance
  }

  /**
   * Вычисление velocity из истории
   */
  private calculateVelocity(): number {
    if (this.history.length < 2) return 0

    const recent = this.history[this.history.length - 1]
    const previous = this.history[0]

    if (!recent || !previous) return 0

    const isHorizontal = this.options.direction !== 'vertical'
    const distance = isHorizontal 
      ? recent.x - previous.x 
      : recent.y - previous.y

    const time = recent.time - previous.time

    if (time === 0) return 0

    return distance / time
  }

  /**
   * Momentum scroll (free mode)
   */
  private startMomentum(initialVelocity: number): void {
    let velocity = initialVelocity

    const animate = (): void => {
      // Применяем friction
      velocity *= this.FRICTION

      // Обновляем позицию
      const currentPosition = this.tvist.engine.location.get()
      const newPosition = currentPosition + velocity

      this.tvist.engine.location.set(newPosition)
      
      // Применяем transform напрямую (без пересчёта размеров)
      this.tvist.engine.applyTransformPublic()

      // Сообщаем о скролле для LoopModule
      this.emit('scroll')

      // Продолжаем если velocity достаточная
      if (Math.abs(velocity) > this.MIN_VELOCITY) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.stopMomentum()
        // Финальный snap если не free mode
        if (this.options.drag !== 'free') {
          this.snapToNearest(0)
        }
      }
    }

    animate()
  }

  /**
   * Snap к ближайшему слайду
   * Логика из Glide + Embla: сравниваем пройденное расстояние с threshold
   */
  private snapToNearest(_velocity: number): void {
    const { engine } = this.tvist
    const startIndex = engine.activeIndex
    
    // Размер слайда с gap
    const slideWidth = engine.slideWidthValue
    const gap = this.options.gap ?? 0
    const slideWithGap = slideWidth + gap
    
    if (slideWithGap === 0) {
      this.tvist.engine.scrollTo(startIndex)
      return
    }
    
    // Вычисляем ЧИСТОЕ расстояние drag (без модификаторов)
    const isHorizontal = this.options.direction !== 'vertical'
    const dragDistance = isHorizontal 
      ? this.currentX - this.startX 
      : this.currentY - this.startY
    
    // Threshold = 20% от ширины слайда (как в Embla)
    // Или минимум 80px (как swipeThreshold в Glide)
    const threshold = Math.max(slideWidth * 0.2, 80)
    
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
    this.tvist.engine.scrollTo(targetIndex)
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

