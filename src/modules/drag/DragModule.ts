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
import type { Velosiped } from '../../core/Velosiped'
import type { VelosipedOptions } from '../../core/types'

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

  constructor(velosiped: Velosiped, options: VelosipedOptions) {
    super(velosiped, options)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.attachEvents()
    this.updateBounds()

    // Обновляем границы при resize
    this.on('resize', () => this.updateBounds())
  }

  override destroy(): void {
    this.detachEvents()
    this.stopMomentum()
  }

  protected override shouldBeActive(): boolean {
    return this.options.drag !== false
  }

  /**
   * Обновление границ для rubberband
   */
  private updateBounds(): void {
    const { slides } = this.velosiped
    const perPage = this.options.perPage ?? 1

    this.minPosition = 0
    this.maxPosition = -(slides.length - perPage)

    // С loop границ нет
    if (this.options.loop) {
      this.minPosition = -Infinity
      this.maxPosition = Infinity
    }
  }

  /**
   * Подключение event listeners
   */
  private attachEvents(): void {
    const { container } = this.velosiped

    // Passive для touchstart (не блокируем скролл)
    container.addEventListener('touchstart', this.onPointerDown, { passive: true })
    container.addEventListener('mousedown', this.onPointerDown)

    // PointerEvents для универсальности (если поддерживается)
    if ('PointerEvent' in window) {
      container.addEventListener('pointerdown', this.onPointerDown)
    }
  }

  /**
   * Отключение event listeners
   */
  private detachEvents(): void {
    const { container } = this.velosiped

    container.removeEventListener('touchstart', this.onPointerDown)
    container.removeEventListener('mousedown', this.onPointerDown)

    if ('PointerEvent' in window) {
      container.removeEventListener('pointerdown', this.onPointerDown)
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

    this.isDragging = true
    this.startX = point.x
    this.startY = point.y
    this.startPosition = this.velosiped.engine.location.get()
    this.history = []

    // Останавливаем momentum если был
    this.stopMomentum()

    // Добавляем move/up listeners
    this.addDocumentEvents()

    // Emit события
    this.emit('dragStart', e)

    // Убираем transition для плавного драга
    this.velosiped.container.style.transition = 'none'
  }

  /**
   * Движение при драге
   */
  private onPointerMove = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isDragging) return

    const point = this.getPointerPosition(e)
    if (!point) return

    // Направление (horizontal/vertical)
    const isHorizontal = this.options.direction !== 'vertical'
    const delta = isHorizontal ? point.x - this.startX : point.y - this.startY

    // Применяем dragSpeed
    const dragSpeed = this.options.dragSpeed ?? 1
    let distance = delta * dragSpeed

    // Применяем rubberband на границах
    if (this.options.rubberband !== false) {
      distance = this.applyRubberband(distance)
    }

    // Устанавливаем позицию
    const newPosition = this.startPosition + distance
    this.velosiped.engine.location.set(newPosition)
    this.velosiped.engine.update()

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
    if (!this.isDragging) return

    this.isDragging = false

    // Удаляем listeners
    this.removeDocumentEvents()

    // Восстанавливаем transition
    this.velosiped.container.style.transition = ''

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
    const focusableSelectors = this.options.focusableElements || 
      'input, textarea, select, button, a[href], [tabindex]'
    
    return element.matches(focusableSelectors)
  }

  /**
   * Rubberband эффект (из Keen Slider)
   * Параболическое торможение при выходе за границы
   */
  private applyRubberband(distance: number): number {
    const position = this.startPosition + distance
    const { container } = this.velosiped
    const containerWidth = container.clientWidth

    // Внутри границ - нормальное движение
    if (position <= this.maxPosition && position >= this.minPosition) {
      return distance
    }

    // За границей - вычисляем сопротивление
    const overflow = position < this.minPosition 
      ? this.minPosition - position 
      : position - this.maxPosition

    // Параболическое торможение: resistance = (1 - overflow/width * 2)²
    const resistance = Math.max(0, 1 - (overflow / containerWidth) * 2)
    
    return distance * resistance * resistance
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
      const currentPosition = this.velosiped.engine.location.get()
      const newPosition = currentPosition + velocity

      this.velosiped.engine.location.set(newPosition)
      this.velosiped.engine.update()

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
   */
  private snapToNearest(velocity: number): void {
    const currentPosition = this.velosiped.engine.location.get()
    
    // Экстраполируем позицию с учётом velocity
    const extrapolatedPosition = currentPosition + velocity * 0.5

    // Находим ближайший индекс
    const nearestIndex = Math.round(-extrapolatedPosition)
    
    // Snap через scrollTo
    this.velosiped.scrollTo(nearestIndex)
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

