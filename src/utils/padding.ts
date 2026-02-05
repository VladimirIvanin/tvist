/**
 * Утилиты для работы с padding
 */

import type { TvistOptions } from '../core/types'

/**
 * Преобразует значение в CSS строку с единицами измерения
 */
export function unit(value: number | string | undefined): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && value !== 0) {
    return `${value}px`
  }
  return '0px'
}

/**
 * Проверяет, является ли padding объектом
 */
function isPaddingObject(
  padding: unknown
): padding is { left?: number | string; right?: number | string } | { top?: number | string; bottom?: number | string } {
  return typeof padding === 'object' && padding !== null
}

/**
 * Получает CSS значение padding для указанной стороны
 * @param options - опции слайдера
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns CSS строка с padding
 */
export function getCssPadding(
  options: TvistOptions,
  side: 'left' | 'right' | 'top' | 'bottom'
): string {
  const { padding } = options

  if (!padding) {
    return '0px'
  }

  // Если padding - объект
  if (isPaddingObject(padding)) {
    const value = (padding as Record<string, number | string | undefined>)[side]
    return unit(value)
  }

  // Если padding - число или строка (одинаковое значение для всех сторон)
  return unit(padding)
}

/**
 * Получает числовое значение padding из опций
 * @param options - опции слайдера
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns значение в пикселях (только для числовых значений, для CSS единиц возвращает 0)
 */
export function getPaddingValueFromOptions(
  options: TvistOptions,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const { padding } = options

  if (!padding) {
    return 0
  }

  // Если padding - объект
  if (isPaddingObject(padding)) {
    const value = (padding as Record<string, number | string | undefined>)[side]
    return typeof value === 'number' ? value : 0
  }

  // Если padding - число (одинаковое значение для всех сторон)
  if (typeof padding === 'number') {
    return padding
  }

  // Для строковых значений возвращаем 0 (нужно читать из DOM)
  return 0
}

/**
 * Получает числовое значение padding в пикселях из DOM элемента
 * @param element - DOM элемент
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns значение в пикселях
 */
export function getPaddingValue(
  element: HTMLElement,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const propName = `padding${side.charAt(0).toUpperCase()}${side.slice(1)}` as keyof CSSStyleDeclaration
  const value = window.getComputedStyle(element)[propName]
  return parseFloat(value as string) || 0
}

/**
 * Применяет padding к элементу
 * @param element - DOM элемент
 * @param options - опции слайдера
 */
export function applyPadding(element: HTMLElement, options: TvistOptions): void {
  const isVertical = options.direction === 'vertical'

  if (isVertical) {
    element.style.paddingTop = getCssPadding(options, 'top')
    element.style.paddingBottom = getCssPadding(options, 'bottom')
  } else {
    element.style.paddingLeft = getCssPadding(options, 'left')
    element.style.paddingRight = getCssPadding(options, 'right')
  }
}
