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

  /**
   * Сбросить текущий breakpoint (для пересчёта при updateOptions).
   */
  resetCurrentBreakpoint(): void {
    this.currentBreakpoint = null
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
   * Обработчик изменения media query.
   * Проверяет breakpoints и при необходимости вызывает update().
   */
  private handleMediaChange = (): void => {
    // Проверяем breakpoints напрямую (не через update, т.к. слайдер может быть отключён)
    this.checkBreakpoints()
    
    // Если слайдер включён, вызываем update для пересчёта размеров
    if (this.tvist.isEnabled) {
      this.tvist.update()
    }
  }

  /**
   * Проверка текущего breakpoint
   */
  private checkBreakpoints(): void {
    // Не применяем брейкпоинты во время enable/disable
    if (this.tvist.isTogglingEnabled) {
      return
    }

    const originalOptions = this.getOriginalOptions()
    
    // Создаем временный объект опций с breakpointsBase для findMatchingBreakpoint
    const optionsForCheck: TvistOptions = {
      ...originalOptions,
      breakpointsBase: originalOptions.breakpointsBase
    }

    const newBreakpoint = findMatchingBreakpoint(this.tvist.root, optionsForCheck)

    // Проверяем, был ли вручную изменён enabled
    const manualEnabledChange = this.tvist.checkAndResetManualEnabledChange()

    // Запоминаем старый breakpoint для события
    const oldBreakpoint = this.currentBreakpoint
    const breakpointChanged = newBreakpoint !== oldBreakpoint

    // Применяем если breakpoint изменился ИЛИ был ручной вызов enable/disable
    if (breakpointChanged || manualEnabledChange) {
      this.currentBreakpoint = newBreakpoint
      
      this.applyBreakpoint(newBreakpoint)
      
      // Эмитим событие только если breakpoint реально изменился
      if (breakpointChanged) {
        this.emit('breakpoint', newBreakpoint)

        // Вызываем callback из опций
        if (originalOptions.on?.breakpoint) {
          originalOptions.on.breakpoint(newBreakpoint)
        }
      }
    }
  }

  /**
   * Применение опций breakpoint
   */
  private applyBreakpoint(bp: number | null): void {
    const originalOptions = this.getOriginalOptions()
    
    // Начинаем с оригинальных опций (deep clone)
    const newOptions = JSON.parse(JSON.stringify(originalOptions)) as TvistOptions

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
    // ВАЖНО: enable/disable вызывают update(), что может привести к повторному onResize
    // Но это не проблема, т.к. currentBreakpoint уже обновлён и повторного apply не будет
    if (shouldBeEnabled && !this.tvist.isEnabled) {
      this.tvist.enable()
    } else if (!shouldBeEnabled && this.tvist.isEnabled) {
      this.tvist.disable()
    }
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

