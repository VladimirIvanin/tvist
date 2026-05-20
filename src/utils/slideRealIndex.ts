/**
 * Поиск слайда по логическому индексу (realIndex): data-tvist-slide-index и fallback по DOM.
 */

import { TVIST_CLASSES } from '../core/constants'

/** Атрибут логического индекса слайда (loop, события slideChange*). */
export const TVIST_SLIDE_INDEX_ATTR = 'data-tvist-slide-index' as const

/**
 * DOM-позиция слайда с указанным realIndex по атрибуту.
 * Без fallback по числовому индексу (как в нелoop режиме).
 *
 * `preferNonClone`: при loop.withClones несколько узлов делят один realIndex;
 * для старта и навигации нужен оригинал в «основной» полосе, а не первый клон слева.
 *
 * @returns индекс в массиве slides или -1
 */
export function findDomIndexByRealIndex(
  slides: readonly HTMLElement[],
  realIndex: number,
  options?: { preferNonClone?: boolean }
): number {
  if (options?.preferNonClone) {
    for (let i = 0; i < slides.length; i++) {
      const el = slides[i]
      if (!el || el.classList.contains(TVIST_CLASSES.slideClone)) continue
      const dataAttr = el.getAttribute(TVIST_SLIDE_INDEX_ATTR)
      if (dataAttr != null && parseInt(dataAttr, 10) === realIndex) {
        return i
      }
    }
  }
  for (let i = 0; i < slides.length; i++) {
    const dataAttr = slides[i]?.getAttribute(TVIST_SLIDE_INDEX_ATTR)
    if (dataAttr != null && parseInt(dataAttr, 10) === realIndex) {
      return i
    }
  }
  return -1
}

/**
 * DOM-индекс для realIndex при нескольких клонах: выбираем узел в сторону `direction` от `referenceDomIndex`
 * (после loopFix — обычно текущий активный DOM-индекс).
 */
export function findDomIndexByRealIndexForTransition(
  slides: readonly HTMLElement[],
  realIndex: number,
  referenceDomIndex: number,
  direction: 'next' | 'prev'
): number {
  const matches: number[] = []
  for (let i = 0; i < slides.length; i++) {
    const dataAttr = slides[i]?.getAttribute(TVIST_SLIDE_INDEX_ATTR)
    if (dataAttr != null && parseInt(dataAttr, 10) === realIndex) {
      matches.push(i)
    }
  }

  if (matches.length === 0) return -1
  if (matches.length === 1) {
    const singleMatch = matches[0]
    if (singleMatch == null) return -1
    return singleMatch
  }

  if (direction === 'prev') {
    for (let j = matches.length - 1; j >= 0; j--) {
      const idx = matches[j]
      if (idx == null) continue
      if (idx < referenceDomIndex) return idx
    }
    const last = matches[matches.length - 1]
    return last ?? -1
  }
  for (const idx of matches) {
    if (idx == null) continue
    if (idx > referenceDomIndex) return idx
  }
  const first = matches[0]
  return first ?? -1
}

/**
 * Элемент слайда по realIndex: сначала по {@link TVIST_SLIDE_INDEX_ATTR}, иначе по DOM-индексу в пределах [0, length).
 */
export function findSlideByRealIndex(
  slides: readonly HTMLElement[],
  realIndex: number,
  options?: { preferNonClone?: boolean }
): HTMLElement | null {
  const domIndex = findDomIndexByRealIndex(slides, realIndex, options)
  if (domIndex !== -1) {
    return slides[domIndex] ?? null
  }
  if (realIndex >= 0 && realIndex < slides.length) {
    return slides[realIndex] ?? null
  }
  return null
}
