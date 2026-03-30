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
    return []
  }
  if (slideSize <= 0) {
    return Array.from({ length: numSlides }, () => false)
  }

  const progressTotal = -translate / slideSize
  const result: boolean[] = []

  for (let i = 0; i < numSlides; i++) {
    let slideProgress = i - progressTotal
    if (Math.abs(slideProgress) > numSlides / 2) {
      slideProgress -= numSlides * Math.round(slideProgress / numSlides)
    }
    result.push(Math.abs(slideProgress) <= 1)
  }

  return result
}
