/**
 * Приведение CSS длины (width/height) к пикселям для расчётов движка.
 */

import { getOuterHeight, getOuterWidth } from './dom'

export interface ResolveCssLengthContext {
  /** Элемент для измерения редких единиц (vw, ch и т.д.) и em */
  probe: HTMLElement
  /** База для процентов (ширина или высота содержащего блока) */
  percentBasePx: number
}

/**
 * Число → px как есть (должно быть > 0 снаружи).
 * Строка: px, rem, em, %, чистое число как px; иначе — временная установка на probe и чтение offset.
 */
export function resolveCssLengthToPixels(
  value: string,
  axis: 'width' | 'height',
  ctx: ResolveCssLengthContext
): number {
  const trimmed = value.trim()
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n) || n <= 0) {
    return 0
  }

  if (trimmed.endsWith('px')) {
    return n
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return n
  }

  if (trimmed.endsWith('rem')) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return n * rootFontSize
  }

  if (trimmed.endsWith('em')) {
    const parentFontSize = parseFloat(getComputedStyle(ctx.probe).fontSize) || 16
    return n * parentFontSize
  }

  if (trimmed.endsWith('%')) {
    return (n / 100) * ctx.percentBasePx
  }

  const prop = axis === 'width' ? 'width' : 'height'
  const prev = ctx.probe.style[prop]
  ctx.probe.style[prop] = trimmed
  const px = axis === 'width' ? getOuterWidth(ctx.probe) : getOuterHeight(ctx.probe)
  ctx.probe.style[prop] = prev
  return Number.isFinite(px) && px > 0 ? px : 0
}
