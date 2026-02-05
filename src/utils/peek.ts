/**
 * Утилиты для peek — отступы, показывающие часть соседних слайдов
 * (цель: дать понять, что в слайдере есть ещё слайды)
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
 * Проверяет, является ли peek объектом
 */
function isPeekObject(
  peek: unknown
): peek is { left?: number | string; right?: number | string } | { top?: number | string; bottom?: number | string } {
  return typeof peek === 'object' && peek !== null
}

/**
 * Получает CSS значение padding для указанной стороны (peek реализуется через padding контейнера)
 * @param options - опции слайдера
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns CSS строка
 */
export function getCssPeek(
  options: TvistOptions,
  side: 'left' | 'right' | 'top' | 'bottom'
): string {
  const { peek } = options

  if (!peek) {
    return '0px'
  }

  if (isPeekObject(peek)) {
    const value = (peek as Record<string, number | string | undefined>)[side]
    return unit(value)
  }

  return unit(peek)
}

/**
 * Получает числовое значение peek из опций
 * @param options - опции слайдера
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns значение в пикселях (только для числовых значений, для CSS единиц возвращает 0)
 */
export function getPeekValueFromOptions(
  options: TvistOptions,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const { peek } = options

  if (!peek) {
    return 0
  }

  if (isPeekObject(peek)) {
    const value = (peek as Record<string, number | string | undefined>)[side]
    return typeof value === 'number' ? value : 0
  }

  if (typeof peek === 'number') {
    return peek
  }

  return 0
}

/**
 * Получает числовое значение padding в пикселях из DOM элемента
 * @param element - DOM элемент
 * @param side - сторона ('left', 'right', 'top', 'bottom')
 * @returns значение в пикселях
 */
export function getPeekValue(
  element: HTMLElement,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const propName = `padding${side.charAt(0).toUpperCase()}${side.slice(1)}` as keyof CSSStyleDeclaration
  const value = window.getComputedStyle(element)[propName]
  return parseFloat(value as string) || 0
}

/**
 * Применяет peek к элементу (через CSS padding контейнера)
 * @param element - DOM элемент
 * @param options - опции слайдера
 */
export function applyPeek(element: HTMLElement, options: TvistOptions): void {
  const isVertical = options.direction === 'vertical'

  if (isVertical) {
    element.style.paddingTop = getCssPeek(options, 'top')
    element.style.paddingBottom = getCssPeek(options, 'bottom')
  } else {
    element.style.paddingLeft = getCssPeek(options, 'left')
    element.style.paddingRight = getCssPeek(options, 'right')
  }
}
