import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

interface StackCache {
  slides: HTMLElement[]
  shadows: WeakMap<HTMLElement, HTMLElement>
  lastSlidesList: HTMLElement[]
}

const stackCache = new WeakMap<Tvist, StackCache>()

/**
 * translate (px) для режима cover — единственный эталон геометрии stack.
 */
function coverStackTranslatePx(
  progress: number,
  slidePosition: number,
  translate: number,
  slideSize: number
): number {
  if (progress > -1 && progress <= 0) return translate
  if (progress <= -1) return -slideSize
  return -slidePosition
}

/**
 * Переход uncover: те же ветки по progress и для next (накрываем), и для prev (снимаем карту).
 * progress∈(-1,0] — закреплён «нижний» ряд; progress∈(0,1] — верхний едет с translate.
 */
function uncoverTransitionTranslatePx(
  progress: number,
  slidePosition: number,
  translate: number,
  slideSize: number
): number {
  if (progress > -1 && progress <= 0) return -slidePosition
  if (progress <= -1) return -slideSize
  return translate
}

function coverStackZIndex(progress: number, numSlides: number): string {
  if (progress > 0) return String(numSlides - Math.round(progress))
  if (progress > -1) return String(numSlides * 2 - Math.abs(Math.round(progress)))
  return '0'
}

/** Z-index при uncover в переходе: верх — progress>0 (наезжающий / снимаемый слой). */
function uncoverTransitionZIndex(progress: number, numSlides: number): string {
  if (progress > 0) {
    return String(numSlides * 2 - Math.abs(Math.round(Math.min(progress, 1))))
  }
  if (progress > -1) return String(numSlides - Math.abs(Math.round(progress)))
  return '0'
}

function getCachedSlides(tvist: Tvist): HTMLElement[] {
  const { slides } = tvist
  let cache = stackCache.get(tvist)

  if (!cache?.lastSlidesList || cache.lastSlidesList !== slides) {
    cache = {
      slides: Array.from(slides),
      shadows: cache?.shadows ?? new WeakMap(),
      lastSlidesList: slides,
    }
    stackCache.set(tvist, cache)
  }

  return cache.slides
}

export function setStackEffect(
  tvist: Tvist,
  translate: number,
  options: TvistOptions
): void {
  const stackOptions = options.stackEffect ?? {}
  const mode = stackOptions.mode ?? 'cover'
  const slideShadows = stackOptions.slideShadows ?? false
  const rotate = stackOptions.rotate ?? false
  const perSlideRotate = stackOptions.perSlideRotate ?? 2
  const perSlideScale = stackOptions.perSlideScale ?? 0
  const perSlideDepth = stackOptions.perSlideDepth ?? 0
  const perSlideOffset = stackOptions.perSlideOffset ?? 0
  const isVertical = options.direction === 'vertical'

  const slideSize = tvist.engine.slideSizeValue
  const slidesList = getCachedSlides(tvist)
  const numSlides = slidesList.length

  const engine = tvist.engine
  const scrollTarget = engine.target.get()
  /** Позиция «в покое» для текущего activeIndex (как после snap). */
  const restForActive = engine.getScrollPositionForIndex(engine.activeIndex)
  const isEngineAnimating = engine.animator.isAnimating()
  const POS_EPS = 0.5

  /**
   * Next: анимация к более отрицательному target, или драг влево при «старом» target.
   */
  const movingNext =
    (isEngineAnimating && translate > scrollTarget + POS_EPS) ||
    (!isEngineAnimating && translate < restForActive - POS_EPS)

  /**
   * Prev: анимация к менее отрицательному target, или драг вправо от позиции покоя.
   */
  const movingPrev =
    (isEngineAnimating && translate < scrollTarget - POS_EPS) ||
    (!isEngineAnimating && translate > restForActive + POS_EPS)

  const uncoverInTransition = movingNext || movingPrev

  // Container is frozen — each slide manages its own screen position
  tvist.container.style.transform = 'translate3d(0, 0, 0)'

  slidesList.forEach((slide, i) => {
    const slidePosition = tvist.engine.getSlidePosition(i)
    // progress=0 → active, >0 → upcoming, <0 → already viewed
    const offset = translate + slidePosition
    const progress = Math.min(Math.max(offset / slideSize, -numSlides), numSlides)
    const absProgress = Math.abs(progress)

    let tX: string
    let tY: string
    let tZ = 0
    let scale = 1
    let rotateZ = 0

    if (mode === 'cover') {
      // COVER: active slide moves on top of stationary next slides.
      //
      // progress ∈ (-1, 0]: transitioning — follows translate (drag/animation)
      // progress <= -1:      already-viewed — hidden off-screen (behind left/top edge)
      // progress > 0:        upcoming — fixed at screen pos 0 (wait underneath)
      const tCover = coverStackTranslatePx(progress, slidePosition, translate, slideSize)
      setTranslate2D(isVertical, tCover, '0px', (v) => { tX = v }, (v) => { tY = v })

      slide.style.zIndex = coverStackZIndex(progress, numSlides)
    } else {
      // UNCOVER: в покое — как cover (стопка). В переходе next/prev — «карты»: накрываем / снимаем.
      const tUncover = uncoverInTransition
        ? uncoverTransitionTranslatePx(progress, slidePosition, translate, slideSize)
        : coverStackTranslatePx(progress, slidePosition, translate, slideSize)
      setTranslate2D(isVertical, tUncover, '0px', (v) => { tX = v }, (v) => { tY = v })

      slide.style.zIndex = uncoverInTransition
        ? uncoverTransitionZIndex(progress, numSlides)
        : coverStackZIndex(progress, numSlides)
    }

    // Уже просмотренные слайды (progress < 0): глубина, масштаб, поворот, смещение стопки вправо/вниз
    if (progress < 0) {
      tZ = perSlideDepth > 0 ? -perSlideDepth * absProgress : 0
      scale = perSlideScale > 0 ? Math.max(1 - perSlideScale * absProgress, 0.5) : 1
      rotateZ = rotate ? perSlideRotate * absProgress : 0
      if (perSlideOffset > 0) {
        const delta = perSlideOffset * absProgress
        const px = (s: string) => parseFloat(s) || 0
        tX = `${px(tX) + delta}px`
        tY = `${px(tY) + delta}px`
      }
    }

    slide.style.transform = `translate3d(${tX}, ${tY}, ${tZ}px) rotateZ(${rotateZ}deg) scale(${scale})`
    slide.style.visibility = absProgress > numSlides ? 'hidden' : ''

    if (slideShadows) {
      updateSlideShadow(slide, progress, tvist)
    }
  })
}

function setTranslate2D(
  isVertical: boolean,
  px: number,
  zero: string,
  setX: (v: string) => void,
  setY: (v: string) => void
): void {
  if (isVertical) {
    setX(zero)
    setY(`${px}px`)
  } else {
    setX(`${px}px`)
    setY(zero)
  }
}

function updateSlideShadow(slide: HTMLElement, progress: number, tvist: Tvist): void {
  const cache = stackCache.get(tvist)
  if (!cache) return

  const opacity = Math.min(Math.max((Math.abs(progress) - 0.5) / 0.5, 0), 1)

  let shadowEl = cache.shadows.get(slide)

  if (!shadowEl) {
    shadowEl = document.createElement('div')
    shadowEl.className = `${TVIST_CLASSES.block}-slide-shadow`
    slide.appendChild(shadowEl)
    cache.shadows.set(slide, shadowEl)
  }

  shadowEl.style.opacity = String(opacity)
}

export function cleanupStackCache(tvist: Tvist): void {
  stackCache.delete(tvist)
}
