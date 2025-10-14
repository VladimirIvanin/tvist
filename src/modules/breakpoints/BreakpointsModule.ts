/**
 * Breakpoints Module
 * 
 * Возможности:
 * - Адаптивность через media queries
 * - breakpointsBase: 'window' | 'container'
 * - Мёрджинг опций для текущего breakpoint
 * - События при смене breakpoint
 */

import { Module } from '../Module'
import type { Velosiped } from '../../core/Velosiped'
import type { VelosipedOptions } from '../../core/types'

export class BreakpointsModule extends Module {
  readonly name = 'breakpoints'

  private mediaQueries: Map<number, MediaQueryList> = new Map()
  private currentBreakpoint: number | null = null
  private originalOptions: VelosipedOptions

  constructor(velosiped: Velosiped, options: VelosipedOptions) {
    super(velosiped, options)
    
    // Сохраняем оригинальные опции
    this.originalOptions = { ...options }
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.setupMediaQueries()
    this.checkBreakpoints()
  }

  override destroy(): void {
    // Отключаем все media queries
    this.mediaQueries.forEach((mq) => {
      mq.removeEventListener('change', this.handleMediaChange)
    })
    this.mediaQueries.clear()
  }

  protected override shouldBeActive(): boolean {
    return !!(this.options.breakpoints && Object.keys(this.options.breakpoints).length > 0)
  }

  /**
   * Настройка media queries
   */
  private setupMediaQueries(): void {
    if (!this.options.breakpoints) return

    // Сортируем breakpoints от большего к меньшему
    const breakpoints = Object.keys(this.options.breakpoints)
      .map(Number)
      .sort((a, b) => b - a)

    breakpoints.forEach((bp) => {
      const mq = window.matchMedia(`(max-width: ${bp}px)`)
      
      // Слушаем изменения
      mq.addEventListener('change', this.handleMediaChange)
      
      this.mediaQueries.set(bp, mq)
    })
  }

  /**
   * Обработчик изменения media query
   */
  private handleMediaChange = (): void => {
    this.checkBreakpoints()
  }

  /**
   * Проверка текущего breakpoint
   */
  private checkBreakpoints(): void {
    let newBreakpoint: number | null = null

    // Находим первый подходящий breakpoint (от большего к меньшему)
    for (const [bp, mq] of this.mediaQueries) {
      if (mq.matches) {
        newBreakpoint = bp
        break
      }
    }

    // Если breakpoint изменился
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint
      
      this.applyBreakpoint(newBreakpoint)
      this.emit('breakpoint', newBreakpoint)

      // Вызываем callback из опций
      if (this.originalOptions.on?.breakpoint) {
        this.originalOptions.on.breakpoint(newBreakpoint)
      }
    }
  }

  /**
   * Применение опций breakpoint
   */
  private applyBreakpoint(bp: number | null): void {
    // Начинаем с оригинальных опций
    const newOptions: VelosipedOptions = { ...this.originalOptions }

    // Если есть breakpoint - мёрджим его опции
    if (bp !== null && this.options.breakpoints?.[bp]) {
      Object.assign(newOptions, this.options.breakpoints[bp])
    }

    // Применяем новые опции к слайдеру
    Object.assign(this.velosiped.options, newOptions)

    // Обновляем слайдер
    this.velosiped.update()
  }

  /**
   * Получить текущий breakpoint
   */
  getCurrentBreakpoint(): number | null {
    return this.currentBreakpoint
  }

  /**
   * Хук при resize
   */
  override onResize(): void {
    // Проверяем breakpoints при resize
    this.checkBreakpoints()
  }
}

