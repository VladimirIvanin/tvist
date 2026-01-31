import type { TvistOptions } from '../../core/types'

export function setFadeEffect(
  slide: HTMLElement,
  progress: number,
  options: TvistOptions
): void {
  const fadeOptions = options.fadeEffect || {}
  // const crossFade = fadeOptions.crossFade ?? false
  
  // Opacity
  // Visible when progress is around 0.
  // 0 -> 1 opacity
  // 1 -> 0 opacity
  // -1 -> 0 opacity
  const opacity = Math.max(1 - Math.abs(progress), 0)

  slide.style.opacity = String(opacity)
  
  // Transform
  // Counteract the flex layout shift.
  // progress * 100% moves the slide relative to its width.
  // If progress is 0, we want 0 transform.
  // If progress is 1 (it is next slide), it physically is at +100%. We want it at 0 (underneath).
  // So we need translate -100%.
  // So `translate(${-progress * 100}%)` ?
  // Let's check:
  // Slide 1 (index 1) is at 100%.
  // If we show Slide 0 (index 0). Slide 1 progress is 1.
  // Slide 1 needs to be hidden or under.
  // If we move it -100%, it goes to 0 position (overlap with slide 0).
  // Yes, for fade we want all slides to overlap at 0.
  
  // Wait, `slide.style.transform` is applied ON TOP of layout.
  // Slide 1 is at 100%. `translateX(-100%)` moves it to 0.
  // But progress is 1. So `-progress * 100%` = -100%. Correct.
  
  // Slide 0 is at 0%. Progress 0. Translate 0. Correct.
  
  slide.style.transform = `translate3d(${-progress * 100}%, 0, 0)`
  
  // Z-Index
  // Active slide (progress 0) should be on top.
  // Slide with progress 1 should be below?
  // Swiper logic: 
  // Custom z-index management might be needed.
  // Usually fade effect implies stacking.
  const zIndex = Math.max(1, 100 - Math.abs(progress * 10))
  slide.style.zIndex = String(Math.round(zIndex))
}
