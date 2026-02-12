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
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'
import { findMatchingBreakpoint, mergeBreakpointOptions } from '../../utils/breakpoints'

export class BreakpointsModule extends Module {
  readonly name = 'breakpoints'

  private mediaQueries = new Map<number, MediaQueryList>()
  private currentBreakpoint: number | null = null

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
    
    // Сохраняем текущий breakpoint чтобы не применять его повторно при init
    this.currentBreakpoint = findMatchingBreakpoint(tvist.root, options)
  }
  
  /**
   * Получить оригинальные опции (до применения breakpoint)
   */
  private getOriginalOptions(): TvistOptions {
    return this.tvist._originalOptions ?? { ...this.options }
  }


  override init(): void {
    if (!this.shouldBeActive()) return

    // Если база - окно, используем matchMedia для оптимизации
    if (this.options.breakpointsBase !== 'container') {
      this.setupMediaQueries()
    }
    
    // Применяем breakpoint при инициализации (важно для container-based)
    this.checkBreakpoints()
  }

  override destroy(): void {
    // Отключаем все media queries
    this.mediaQueries.forEach((mq) => {
      try {
        mq.removeEventListener('change', this.handleMediaChange)
      } catch {
        // Fallback for older browsers
        mq.removeListener(this.handleMediaChange)
      }
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
    
    // Проверяем поддержку matchMedia
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const originalOptions = this.getOriginalOptions()
    if (!originalOptions.breakpoints) return

    // Сортируем breakpoints от большего к меньшему
    const breakpoints = Object.keys(originalOptions.breakpoints)
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
    const originalOptions = this.getOriginalOptions()
    
    // Создаем временный объект опций с breakpointsBase для findMatchingBreakpoint
    const optionsForCheck: TvistOptions = {
      ...originalOptions,
      breakpointsBase: originalOptions.breakpointsBase
    }
    
    const newBreakpoint = findMatchingBreakpoint(this.tvist.root, optionsForCheck)

    // Применяем только если breakpoint изменился
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint
      
      this.applyBreakpoint(newBreakpoint)
      
      // Эмитим событие
      this.emit('breakpoint', newBreakpoint)

      // Вызываем callback из опций
      if (originalOptions.on?.breakpoint) {
        originalOptions.on.breakpoint(newBreakpoint)
      }
    }
  }

  /**
   * Применение опций breakpoint
   */
  private applyBreakpoint(bp: number | null): void {
    const originalOptions = this.getOriginalOptions()
    
    // Начинаем с оригинальных опций (deep clone)
    const newOptions: TvistOptions = JSON.parse(JSON.stringify(originalOptions))

    // Если есть breakpoint - мёрджим его опции
    if (bp !== null && originalOptions.breakpoints?.[bp]) {
      mergeBreakpointOptions(newOptions, originalOptions.breakpoints[bp])
    }

    // Проверяем enabled флаг
    const shouldBeEnabled = newOptions.enabled !== false

    // Применяем новые опции к слайдеру (заменяем полностью, кроме breakpoints)
    const breakpoints = this.tvist.options.breakpoints
    Object.keys(this.tvist.options).forEach(key => {
      if (key !== 'breakpoints' && key !== 'on') {
        delete (this.tvist.options as Record<string, unknown>)[key]
      }
    })
    Object.assign(this.tvist.options, newOptions)
    this.tvist.options.breakpoints = breakpoints

    // Включаем или отключаем слайдер в зависимости от enabled
    if (shouldBeEnabled && !this.tvist.isEnabled) {
      this.tvist.enable()
    } else if (!shouldBeEnabled && this.tvist.isEnabled) {
      this.tvist.disable()
    }
    // НЕ вызываем update() здесь - он уже вызван в Tvist.update()
    // Опции применены, engine.update() и модули обновятся автоматически
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

