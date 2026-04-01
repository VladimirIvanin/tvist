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
 * @param maxNumericPx - максимальное числовое значение peek в пикселях
 *   (если передано, все числовые значения будут ограничены этим порогом,
 *   строковые peek вроде '10%' остаются как есть)
 * @returns CSS строка
 */
export function getCssPeek(
  options: TvistOptions,
  side: 'left' | 'right' | 'top' | 'bottom',
  maxNumericPx?: number
): string {
  const { peek } = options

  if (!peek) {
    return '0px'
  }

  if (isPeekObject(peek)) {
    const raw = (peek as Record<string, number | string | undefined>)[side]
    if (typeof raw === 'number' && typeof maxNumericPx === 'number' && maxNumericPx > 0) {
      const limited = Math.min(raw, maxNumericPx)
      return unit(limited)
    }
    return unit(raw)
  }

  if (typeof peek === 'number' && typeof maxNumericPx === 'number' && maxNumericPx > 0) {
    const limited = Math.min(peek, maxNumericPx)
    return unit(limited)
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
 * Устанавливает или удаляет CSS padding на элементе.
 * Если значение равно '0px', свойство удаляется (присваивается ''),
 * чтобы не загрязнять inline-стили нулевыми значениями.
 */
function setPaddingOrRemove(element: HTMLElement, prop: keyof CSSStyleDeclaration, value: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(element.style as any)[prop] = value === '0px' ? '' : value
}

/**
 * Применяет peek к элементу (через CSS padding контейнера)
 * @param element - DOM элемент
 * @param options - опции слайдера
 * @param maxNumericPx - максимальное числовое значение peek (в пикселях)
 */
export function applyPeek(
  element: HTMLElement,
  options: TvistOptions,
  maxNumericPx?: number
): void {
  const isVertical = options.direction === 'vertical'

  if (isVertical) {
    setPaddingOrRemove(element, 'paddingTop', getCssPeek(options, 'top', maxNumericPx))
    setPaddingOrRemove(element, 'paddingBottom', getCssPeek(options, 'bottom', maxNumericPx))
  } else {
    setPaddingOrRemove(element, 'paddingLeft', getCssPeek(options, 'left', maxNumericPx))
    setPaddingOrRemove(element, 'paddingRight', getCssPeek(options, 'right', maxNumericPx))
  }
}
