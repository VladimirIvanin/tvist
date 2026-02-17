/**
 * Утилиты для работы с breakpoints
 */

import type { TvistOptions } from '../core/types'

// Кеш размеров для оптимизации производительности
let cachedContainerWidth = 0
let cachedContainerElement: HTMLElement | null = null
let cachedWindowWidth = 0
let cacheTimestamp = 0
const CACHE_DURATION = 16 // ~1 frame at 60fps (миллисекунды)

/**
 * Находит подходящий breakpoint для текущей ширины
 * Desktop-first подход: max-width
 * 
 * @param root - корневой элемент слайдера
 * @param options - опции слайдера
 * @param forceRefresh - принудительно обновить кеш размеров
 * @returns номер breakpoint или null
 */
export function findMatchingBreakpoint(
  root: HTMLElement, 
  options: TvistOptions,
  forceRefresh = false
): number | null {
  if (!options.breakpoints || Object.keys(options.breakpoints).length === 0) {
    return null
  }

  const now = Date.now()
  const cacheExpired = now - cacheTimestamp > CACHE_DURATION

  let currentWidth: number
  
  if (options.breakpointsBase === 'container') {
    // Используем кеш для container-based breakpoints
    // Инвалидируем кеш если изменился элемент или истекло время
    const containerChanged = cachedContainerElement !== root
    if (forceRefresh || cacheExpired || containerChanged) {
      cachedContainerWidth = root.clientWidth
      cachedContainerElement = root
      cacheTimestamp = now
    }
    currentWidth = cachedContainerWidth
  } else {
    // Используем кеш для window-based breakpoints
    // Проверяем наличие window для совместимости с тестовым окружением
    if (typeof window !== 'undefined') {
      // Инвалидируем кеш если размер окна изменился или истекло время
      const actualWidth = window.innerWidth
      const widthChanged = actualWidth !== cachedWindowWidth
      if (forceRefresh || cacheExpired || widthChanged) {
        cachedWindowWidth = actualWidth
        cacheTimestamp = now
      }
    }
    currentWidth = cachedWindowWidth
  }

  // Находим подходящий breakpoint (desktop-first, max-width)
  const breakpoints = Object.keys(options.breakpoints)
    .map(Number)
    .sort((a, b) => a - b) // ascending для правильной логики max-width

  let result = null
  for (const bp of breakpoints) {
    if (currentWidth <= bp) {
      result = bp
      break
    }
  }

  return result
}

/**
 * Применяет начальный breakpoint к опциям (вызывается ДО создания Engine)
 * Desktop-first подход: max-width
 * 
 * @param root - корневой элемент слайдера
 * @param options - опции слайдера (мутируются)
 */
export function applyInitialBreakpoint(root: HTMLElement, options: TvistOptions): void {
  const matchedBreakpoint = findMatchingBreakpoint(root, options)

  // Применяем опции из breakpoint
  if (matchedBreakpoint !== null && options.breakpoints?.[matchedBreakpoint]) {
    const breakpointOptions = options.breakpoints[matchedBreakpoint]
    
    // Deep merge для вложенных объектов (pagination, arrows, etc.)
    Object.keys(breakpointOptions).forEach((key) => {
      const value = breakpointOptions[key as keyof typeof breakpointOptions]
      
      if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Для объектов делаем merge
        const currentValue = options[key as keyof TvistOptions]
        if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
          options[key as keyof TvistOptions] = { ...currentValue, ...value } as never
        } else {
          options[key as keyof TvistOptions] = value as never
        }
      } else {
        // Для примитивов просто заменяем
        options[key as keyof TvistOptions] = value as never
      }
    })
  }
}

/**
 * Применяет опции breakpoint с deep merge
 * 
 * @param target - целевой объект опций
 * @param breakpointOptions - опции из breakpoint
 */
export function mergeBreakpointOptions(target: TvistOptions, breakpointOptions: Partial<TvistOptions>): void {
  Object.keys(breakpointOptions).forEach((key) => {
    const value = breakpointOptions[key as keyof typeof breakpointOptions]
    
    if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Для объектов делаем merge
      const currentValue = target[key as keyof TvistOptions]
      if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        target[key as keyof TvistOptions] = { ...currentValue, ...value } as never
      } else {
        target[key as keyof TvistOptions] = value as never
      }
    } else {
      // Для примитивов просто заменяем
      target[key as keyof TvistOptions] = value as never
    }
  })
}
