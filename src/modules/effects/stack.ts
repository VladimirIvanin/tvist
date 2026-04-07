import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

interface StackCache {
  slides: HTMLElement[]
  shadows: WeakMap<HTMLElement, HTMLElement>
  lastSlidesList: HTMLElement[]
}

const stackCache = new WeakMap<Tvist, StackCache>()

/** Доля визуального смещения относительно полного хода движка (аналог части Cards в Swiper). */
function scaleStackTranslate(translate: number, restForActive: number, ratio: number): number {
  if (ratio >= 1 - 1e-6) return translate
  return restForActive + (translate - restForActive) * ratio
}

/**
 * translate (px) для режима cover — единственный эталон геометрии stack.
 * @param usePileLayout — при `stackLayout: 'pile'` ожидающие (`progress > 0`) делят текущий `translate`
 *   с активным (колода в одном «слоте» вьюпорта), а не `-slidePosition` следующего на рельсе.
 */
function coverStackTranslatePx(
  progress: number,
  slidePosition: number,
  translate: number,
  slideSize: number,
  usePileLayout: boolean,
  restForActive: number,
  slideTravelRatio: number
): number {
  if (progress > -1 && progress <= 0) {
    return scaleStackTranslate(translate, restForActive, slideTravelRatio)
  }
  if (progress <= -1) return usePileLayout ? translate : -slideSize
  if (usePileLayout) return translate
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
  slideSize: number,
  restForActive: number,
  slideTravelRatio: number,
  usePileLayout: boolean
): number {
  // track: −slidePosition фиксирует «нижнюю» карту в координатах рельса.
  // pile: та же идея в локали вьюпорта — сырой translate + rebase даёт 0 на экране для любого индекса.
  if (progress > -1 && progress <= 0) return usePileLayout ? translate : -slidePosition
  if (progress <= -1) return usePileLayout ? translate : -slideSize
  return scaleStackTranslate(translate, restForActive, slideTravelRatio)
}

/** Progress для слоёв: при scale меньше 1 z-index пересчитывается раньше по ходу жеста. */
function progressForZIndex(progress: number, numSlides: number, zIndexProgressScale: number): number {
  const s = zIndexProgressScale > 1e-6 ? zIndexProgressScale : 1
  return Math.min(Math.max(progress / s, -numSlides), numSlides)
}

function coverStackZIndex(progress: number, numSlides: number, zIndexProgressScale: number): string {
  const p = progressForZIndex(progress, numSlides, zIndexProgressScale)
  if (p > 0) return String(numSlides - Math.round(p))
  if (p > -1) return String(numSlides * 2 - Math.abs(Math.round(p)))
  return '0'
}

/** Z-index при uncover в переходе: верх — progress>0 (наезжающий / снимаемый слой). */
function uncoverTransitionZIndex(progress: number, numSlides: number, zIndexProgressScale: number): string {
  const p = progressForZIndex(progress, numSlides, zIndexProgressScale)
  if (p > 0) {
    return String(numSlides * 2 - Math.abs(Math.round(Math.min(p, 1))))
  }
  if (p > -1) return String(numSlides - Math.abs(Math.round(p)))
  return '0'
}

function applyPerSlideOffsetDelta(
  isVertical: boolean,
  crossAxisOnly: boolean,
  delta: number,
  tX: string,
  tY: string
): { tX: string; tY: string } {
  const px = (s: string) => parseFloat(s) || 0
  if (crossAxisOnly) {
    if (isVertical) {
      return { tX: `${px(tX) + delta}px`, tY: tY }
    }
    return { tX: tX, tY: `${px(tY) + delta}px` }
  }
  return {
    tX: `${px(tX) + delta}px`,
    tY: `${px(tY) + delta}px`,
  }
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
  const stackLayout = stackOptions.stackLayout ?? 'track'
  const slideShadows = stackOptions.slideShadows ?? false
  const rotate = stackOptions.rotate ?? false
  const perSlideRotate = stackOptions.perSlideRotate ?? 2
  const perSlideScale = stackOptions.perSlideScale ?? 0
  const perSlideDepth = stackOptions.perSlideDepth ?? 0
  const perSlideOffset = stackOptions.perSlideOffset ?? 0
  const zIndexProgressScale = stackOptions.zIndexProgressScale ?? 1
  let slideTravelRatio = stackOptions.slideTravelRatio ?? 1
  if (slideTravelRatio > 1) slideTravelRatio = 1
  if (slideTravelRatio < 1e-6) slideTravelRatio = 1e-6
  const isVertical = options.direction === 'vertical'

  const slideSize = tvist.engine.slideSizeValue
  const slidesList = getCachedSlides(tvist)
  const numSlides = slidesList.length

  const engine = tvist.engine
  const usePileLayout = stackLayout === 'pile' && numSlides > 0
  const scrollTarget = engine.target.get()
  /** Позиция «в покое» для текущего activeIndex (как после snap). */
  const restForActive = engine.getScrollPositionForIndex(engine.activeIndex)
  const isEngineAnimating = engine.animator.isAnimating()
  const POS_EPS = 0.5

  /**
   * Next/prev для логов и интуиции: по target при анимации, по rest при драге.
   */
  const movingNext =
    (isEngineAnimating && translate > scrollTarget + POS_EPS) ||
    (!isEngineAnimating && translate < restForActive - POS_EPS)

  const movingPrev =
    (isEngineAnimating && translate < scrollTarget - POS_EPS) ||
    (!isEngineAnimating && translate > restForActive + POS_EPS)

  /**
   * Режим «карты» uncover: нельзя опираться только на translate >/< target пока крутится Animator.
   */
  const uncoverInTransition = mode === 'uncover' && (movingNext || movingPrev)

  const logStack = options.debug === true
  const scrollAxisLabel = isVertical ? 'y' : 'x'

  const slidePositionActive = engine.getSlidePosition(engine.activeIndex)
  const deltaFromActiveRest = translate - restForActive

  // ─── ВАЖНО: два принципиально разных CSS-режима ──────────────────────────────
  //
  // PILE  (.tvist--stack-pile)
  //   Контейнер заморожен в transform:translate3d(0,0,0).
  //   Слайды — position:absolute; left:0; top:0 (CSS _stack.scss).
  //   Координата слайда = абсолютная позиция в viewport (transform задаёт реальное смещение).
  //   Все слайды лежат в одной "точке" — декор (rotate/scale/offset) создаёт иллюзию стопки.
  //
  // TRACK (.tvist--stack, без .tvist--stack-pile)
  //   Контейнер также заморожен в translate3d(0,0,0), но слайды — обычный flex-поток.
  //   Каждый слайд занимает свою позицию в потоке: slidePosition = i * slideSize.
  //   transform слайда — ДЕЛЬТА поверх его позиции в потоке, а не абсолютная координата.
  //   Например, чтобы слайд с flex-позицией 360px оказался на экране в 0px,
  //   нужен transform: translateY(-360px)  →  coverStackTranslatePx возвращает -slidePosition.
  //
  //   !! Функции coverStackTranslatePx / uncoverTransitionTranslatePx рассчитаны именно под
  //   track-режим: их результат прибавляется к flex-позиции слайда.
  //   Если менять эти формулы — проверять оба режима отдельно.
  // ──────────────────────────────────────────────────────────────────────────────
  tvist.container.style.transform = 'translate3d(0, 0, 0)'

  const debugSlides: Record<string, number | string | boolean | undefined>[] = []

  slidesList.forEach((slide, i) => {
    const slidePosition = tvist.engine.getSlidePosition(i)

    let tX = '0px'
    let tY = '0px'
    let tZ = 0
    let scale = 1
    let rotateZ = 0

    if (usePileLayout) {
      // PILE режим: progress вычисляется непрерывно по translate, без зависимости от activeIndex.
      // Аналог Swiper Cards: progress = (translate + slidePosition) / slideSize
      // progress=0 → слайд точно в viewport (активный), >0 → ещё не показан, <0 → уже просмотрен.
      const rawProgress = slideSize > 1e-6 ? (translate + slidePosition) / slideSize : 0
      const progress = Math.min(Math.max(rawProgress, -numSlides), numSlides)
      const absProgress = Math.abs(progress)

      // Позиция по оси прокрутки: все слайды фиксированы в точке 0 viewport (колода)
      // Активный (progress ≈ 0) уже в 0; остальные тоже в 0 благодаря rebase (translate - translate = 0)
      setTranslate2D(isVertical, 0, '0px', (v) => { tX = v }, (v) => { tY = v })

      // Z-index для pile: строгий порядок без дублей, чтобы слои не "флипались".
      // Используем abs(progress) как основную метрику глубины + индекс как tie-breaker.
      const depthRank = Math.round(Math.min(absProgress, numSlides) * 1000)
      const tieBreaker = numSlides - i
      slide.style.zIndex = String(numSlides * 10000 - depthRank * 10 + tieBreaker)

      // Декор: rotate, scale, offset — только для не-активных
      if (absProgress > 1e-6) {
        const p = Math.min(absProgress, numSlides)
        tZ = perSlideDepth > 0 ? -perSlideDepth * p : 0
        scale = perSlideScale > 0 ? Math.max(1 - perSlideScale * p, 0.5) : 1
        rotateZ = rotate ? perSlideRotate * p : 0
        if (Math.abs(perSlideOffset) > 1e-6) {
          const delta = perSlideOffset * p
          const out = applyPerSlideOffsetDelta(isVertical, true, delta, tX, tY)
          tX = out.tX
          tY = out.tY
        }
      }

      slide.style.transform = `translate3d(${tX}, ${tY}, ${tZ}px) rotateZ(${rotateZ}deg) scale(${scale})`
      slide.style.visibility = absProgress > numSlides ? 'hidden' : ''

      if (logStack) {
        const px = (s: string) => parseFloat(s) || 0
        debugSlides.push({
          i,
          progress,
          zIndex: slide.style.zIndex,
          tXpx: px(tX),
          tYpx: px(tY),
          rotateZ,
          scale,
          transform: slide.style.transform,
        })
      }

      if (slideShadows) {
        updateSlideShadow(slide, progress, tvist)
      }
      return
    }

    // TRACK режим: непрерывный progress как в оригинале
    const trackOffset = translate + slidePosition
    const progress = Math.min(Math.max(trackOffset / slideSize, -numSlides), numSlides)
    const absProgress = Math.abs(progress)

    let rawAlong = 0
    let uncoverPinned: boolean | undefined

    if (mode === 'cover') {
      const tCover = coverStackTranslatePx(
        progress,
        slidePosition,
        translate,
        slideSize,
        false,
        restForActive,
        slideTravelRatio
      )
      rawAlong = tCover
      setTranslate2D(isVertical, tCover, '0px', (v) => { tX = v }, (v) => { tY = v })
      slide.style.zIndex = coverStackZIndex(progress, numSlides, zIndexProgressScale)
    } else {
      uncoverPinned = uncoverInTransition && progress > -1 && progress <= 0
      const tUncover = uncoverInTransition
        ? uncoverTransitionTranslatePx(
            progress,
            slidePosition,
            translate,
            slideSize,
            restForActive,
            slideTravelRatio,
            false
          )
        : coverStackTranslatePx(
            progress,
            slidePosition,
            translate,
            slideSize,
            false,
            restForActive,
            slideTravelRatio
          )
      rawAlong = tUncover
      setTranslate2D(isVertical, tUncover, '0px', (v) => { tX = v }, (v) => { tY = v })
      slide.style.zIndex = uncoverInTransition
        ? uncoverTransitionZIndex(progress, numSlides, zIndexProgressScale)
        : coverStackZIndex(progress, numSlides, zIndexProgressScale)
    }

    if (progress < 0) {
      tZ = perSlideDepth > 0 ? -perSlideDepth * absProgress : 0
      scale = perSlideScale > 0 ? Math.max(1 - perSlideScale * absProgress, 0.5) : 1
      rotateZ = rotate ? perSlideRotate * absProgress : 0
      if (Math.abs(perSlideOffset) > 1e-6) {
        const delta = perSlideOffset * absProgress
        const out = applyPerSlideOffsetDelta(isVertical, false, delta, tX, tY)
        tX = out.tX
        tY = out.tY
      }
    }

    slide.style.transform = `translate3d(${tX}, ${tY}, ${tZ}px) rotateZ(${rotateZ}deg) scale(${scale})`
    slide.style.visibility = absProgress > numSlides ? 'hidden' : ''

    if (logStack) {
      const px = (s: string) => parseFloat(s) || 0
      const progressZone = progress <= -1 ? '<=-1' : progress <= 0 ? '(-1,0]' : '>0'
      debugSlides.push({
        i,
        progress,
        progressZone,
        slidePosition,
        rawAlong,
        uncoverPinned: mode === 'uncover' ? uncoverPinned : undefined,
        zIndex: slide.style.zIndex,
        tXpx: px(tX),
        tYpx: px(tY),
        rotateZ,
        scale,
        transform: slide.style.transform,
      })
    }

    if (slideShadows) {
      updateSlideShadow(slide, progress, tvist)
    }
  })

  if (logStack) {
    const distToTarget = translate - scrollTarget
    const distToRest = translate - restForActive
    // eslint-disable-next-line no-console -- отладочный вывод по options.debug
    console.log('[tvist stack] setTranslate', {
      scrollAxis: scrollAxisLabel,
      translate,
      slideSize,
      activeIndex: engine.activeIndex,
      slidePositionActive,
      deltaFromActiveRest,
      restForActive,
      scrollTarget,
      distToTarget,
      distToRest,
      isEngineAnimating,
      movingNext,
      movingPrev,
      uncoverInTransition,
      uncoverGate:
        mode === 'uncover'
          ? {
              isEngineAnimating,
              translateLtRestMinusEps: translate < restForActive - POS_EPS,
              translateGtRestPlusEps: translate > restForActive + POS_EPS,
            }
          : undefined,
      effectTranslateBranch:
        mode === 'uncover'
          ? uncoverInTransition
            ? 'uncoverTransition'
            : 'coverStack (fallback)'
          : 'cover',
      mode,
      stackLayout,
      usePileLayout,
      slideTravelRatio,
      slides: debugSlides,
    })
  }
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
