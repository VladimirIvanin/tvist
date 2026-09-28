/**
 * Позиция грани рядом с текущим поворотом куба. Крайние слайды замыкают
 * соседние грани независимо от loop, не меняя границы навигации.
 */
export function getCubeSlideIndex(index: number, progressTotal: number, numSlides: number): number {
  const slideProgress = index - progressTotal;
  if (numSlides > 0 && Math.abs(slideProgress) > numSlides / 2) {
    return index - numSlides * Math.round(slideProgress / numSlides);
  }
  return index;
}

/**
 * Определяет, какие грани куба участвуют в сцене (до двух соседних от дробной позиции).
 * Одна формула для setCubeEffect (visibility) и SlideStatesModule (--visible / visible).
 */
export function getCubeSlidesInRange(
  translate: number,
  slideSize: number,
  numSlides: number
): boolean[] {
  if (numSlides === 0) {
    return [];
  }
  if (slideSize <= 0) {
    return Array.from({ length: numSlides }, () => false);
  }

  const progressTotal = -translate / slideSize;
  const result: boolean[] = [];

  for (let i = 0; i < numSlides; i++) {
    const slideProgress = getCubeSlideIndex(i, progressTotal, numSlides) - progressTotal;
    result.push(Math.abs(slideProgress) <= 1);
  }

  return result;
}
