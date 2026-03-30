/**
 * Поиск слайда по логическому индексу (realIndex): data-tvist-slide-index и fallback по DOM.
 */

/** Атрибут логического индекса слайда (loop, события slideChange*). */
export const TVIST_SLIDE_INDEX_ATTR = 'data-tvist-slide-index' as const

/**
 * DOM-позиция слайда с указанным realIndex по атрибуту.
 * Без fallback по числовому индексу (как в нелoop режиме).
 *
 * @returns индекс в массиве slides или -1
 */
export function findDomIndexByRealIndex(
  slides: readonly HTMLElement[],
  realIndex: number
): number {
  for (let i = 0; i < slides.length; i++) {
    const dataAttr = slides[i]?.getAttribute(TVIST_SLIDE_INDEX_ATTR)
    if (dataAttr != null && parseInt(dataAttr, 10) === realIndex) {
      return i
    }
  }
  return -1
}

/**
 * Элемент слайда по realIndex: сначала по {@link TVIST_SLIDE_INDEX_ATTR}, иначе по DOM-индексу в пределах [0, length).
 */
export function findSlideByRealIndex(
  slides: readonly HTMLElement[],
  realIndex: number
): HTMLElement | null {
  const domIndex = findDomIndexByRealIndex(slides, realIndex)
  if (domIndex !== -1) {
    return slides[domIndex] ?? null
  }
  if (realIndex >= 0 && realIndex < slides.length) {
    return slides[realIndex] ?? null
  }
  return null
}
