/**
 * Регрессионный тест: стрелки не получают disabled после перехода к границе
 *
 * Баг: когда пользователь долистывает слайдер до конца (через drag или кнопки),
 * стрелка «вперёд» не получает disabled-состояние.
 *
 * Причина: в Engine.performAnimatedScroll при indexChanged=false && needsAnimation=false
 * (позиция уже у цели, индекс не изменился — snap на тот же endIndex)
 * ветка `else if (!ctx.indexChanged)` не покрывала случай indexChanged=true,
 * а `else` (без условия) не эмитировала slideChangeEnd/transitionEnd вообще.
 *
 * Фикс: заменить `else if (!ctx.indexChanged)` на `else` — эмитировать transitionEnd
 * всегда при needsAnimation=false, slideChangeEnd — если indexChanged=true.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import '../../../src/modules/navigation'
import { createSliderFixture, type SliderFixture } from '../../fixtures'

describe('NavigationModule — arrows disabled state at boundaries', () => {
  let fixture: SliderFixture
  let slider: Tvist
  let prevBtn: HTMLButtonElement
  let nextBtn: HTMLButtonElement

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 600, slideWidth: 200 })

    prevBtn = document.createElement('button')
    prevBtn.className = TVIST_CLASSES.arrowPrev
    nextBtn = document.createElement('button')
    nextBtn.className = TVIST_CLASSES.arrowNext
    fixture.root.appendChild(prevBtn)
    fixture.root.appendChild(nextBtn)

    slider = new Tvist(fixture.root, {
      arrows: true,
      loop: false,
      speed: 0,
    })
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
    vi.restoreAllMocks()
  })

  it('prev disabled and next enabled at start', () => {
    expect(prevBtn.getAttribute('aria-disabled')).toBe('true')
    expect(nextBtn.getAttribute('aria-disabled')).toBe('false')
  })

  it('next disabled and prev enabled at end (instant scrollTo)', async () => {
    const endIndex = slider.engine['getEndIndex']()
    slider.scrollTo(endIndex, true)
    await Promise.resolve()

    expect(nextBtn.getAttribute('aria-disabled')).toBe('true')
    expect(nextBtn.classList.contains(TVIST_CLASSES.arrowDisabled)).toBe(true)
    expect(prevBtn.getAttribute('aria-disabled')).toBe('false')
  })

  it('next disabled at end (animated scrollTo, speed:0)', async () => {
    // speed:0 → Animator вызывает onComplete синхронно → slideChangeEnd сразу
    const endIndex = slider.engine['getEndIndex']()
    slider.scrollTo(endIndex, false)
    await Promise.resolve()

    expect(nextBtn.getAttribute('aria-disabled')).toBe('true')
    expect(nextBtn.classList.contains(TVIST_CLASSES.arrowDisabled)).toBe(true)
  })

  it('next disabled when scrollTo beyond endIndex (clamp)', async () => {
    // targetIndex > endIndex → clampedIndex = endIndex = previousIndex → indexChanged=false
    // needsAnimation=false (уже у цели после предыдущего scrollTo)
    // Баг: transitionEnd не эмитировался → updateArrowsState не вызывался
    const endIndex = slider.engine['getEndIndex']()
    slider.scrollTo(endIndex, true)
    await Promise.resolve()

    // Теперь ещё раз scrollTo за пределы — clampedIndex=endIndex=previousIndex
    slider.scrollTo(endIndex + 5, false)
    await Promise.resolve()

    expect(nextBtn.getAttribute('aria-disabled')).toBe('true')
    expect(nextBtn.classList.contains(TVIST_CLASSES.arrowDisabled)).toBe(true)
  })

  it('prev disabled when scrollTo below 0 (clamp)', async () => {
    // Аналогично для начала: targetIndex < 0 → clampedIndex=0=previousIndex
    slider.scrollTo(0, true)
    await Promise.resolve()

    slider.scrollTo(-5, false)
    await Promise.resolve()

    expect(prevBtn.getAttribute('aria-disabled')).toBe('true')
    expect(prevBtn.classList.contains(TVIST_CLASSES.arrowDisabled)).toBe(true)
  })

  it('arrows re-enable after moving away from boundary', async () => {
    const endIndex = slider.engine['getEndIndex']()
    slider.scrollTo(endIndex, true)
    await Promise.resolve()

    expect(nextBtn.getAttribute('aria-disabled')).toBe('true')

    slider.scrollTo(endIndex - 1, false)
    await Promise.resolve()

    expect(nextBtn.getAttribute('aria-disabled')).toBe('false')
    expect(prevBtn.getAttribute('aria-disabled')).toBe('false')
  })

  it('both boundaries work in sequence', async () => {
    const endIndex = slider.engine['getEndIndex']()

    // Конец
    slider.scrollTo(endIndex, false)
    await Promise.resolve()
    expect(nextBtn.getAttribute('aria-disabled')).toBe('true')
    expect(prevBtn.getAttribute('aria-disabled')).toBe('false')

    // Начало
    slider.scrollTo(0, false)
    await Promise.resolve()
    expect(prevBtn.getAttribute('aria-disabled')).toBe('true')
    expect(nextBtn.getAttribute('aria-disabled')).toBe('false')
  })
})
