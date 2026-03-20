/**
 * Тесты очистки артефактов при disabled слайдере.
 *
 * Когда слайдер переходит в состояние disabled (через breakpoint или вручную),
 * он должен полностью очищать все инлайн-стили и классы состояний,
 * которые были выставлены в enabled-режиме.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/index'
import { createSliderFixture, resizeSlider } from '../fixtures'
import type { SliderFixture } from '../fixtures'

function checkDisabledCleanup(slider: Tvist, root: HTMLElement) {
  expect(slider.isEnabled).toBe(false)

  // Инлайн-стили на слайдах
  slider.slides.forEach(slide => {
    expect(slide.style.width).toBe('')
    expect(slide.style.height).toBe('')
    expect(slide.style.marginRight).toBe('')
    expect(slide.style.marginBottom).toBe('')
  })

  // Классы состояний на слайдах
  slider.slides.forEach(slide => {
    expect(slide.classList.contains(TVIST_CLASSES.slideActive)).toBe(false)
    expect(slide.classList.contains(TVIST_CLASSES.slidePrev)).toBe(false)
    expect(slide.classList.contains(TVIST_CLASSES.slideNext)).toBe(false)
    expect(slide.classList.contains(TVIST_CLASSES.slideVisible)).toBe(false)
  })

  // Классы от модулей на руте
  expect(root.classList.contains(TVIST_CLASSES.draggable)).toBe(false)
  expect(root.classList.contains(TVIST_CLASSES.dragging)).toBe(false)
  expect(root.classList.contains(TVIST_CLASSES.singlePage)).toBe(false)
  expect(root.classList.contains(TVIST_CLASSES.nav)).toBe(false)
  expect(root.classList.contains(TVIST_CLASSES.cube)).toBe(false)

  // Transform на контейнере
  expect(slider.container.style.transform).toBe('')
}

// ─── container-based ──────────────────────────────────────────────────────────

describe('disabled cleanup — container-based breakpoints', () => {
  let fixture: SliderFixture

  afterEach(() => fixture?.cleanup())

  it('десктоп→мобильный: очищает width, transform, классы слайдов и рута', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    expect(slider.isEnabled).toBe(true)
    expect(slider.slides[0].style.width).not.toBe('')
    expect(fixture.root.classList.contains(TVIST_CLASSES.draggable)).toBe(true)

    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    checkDisabledCleanup(slider, fixture.root)
  })

  it('туда-сюда: второй переход на мобильный тоже очищает артефакты', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    resizeSlider(fixture.root, 1000)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    checkDisabledCleanup(slider, fixture.root)
  })

  it('начальный рендер сразу в disabled breakpoint: нет артефактов', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 500 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    checkDisabledCleanup(slider, fixture.root)
  })

  it('peek + enabled: false в breakpoint: очищает width', () => {
    const mobile_right_padding = 20
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 3,
      gap: 20,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          peek: { before: 5, after: mobile_right_padding },
          enabled: false,
        },
      },
    })

    resizeSlider(fixture.root, 600)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    checkDisabledCleanup(slider, fixture.root)
  })
})

// ─── window-based ─────────────────────────────────────────────────────────────

describe('disabled cleanup — window-based breakpoints (default)', () => {
  let fixture: SliderFixture

  beforeEach(() => { window.innerWidth = 1024 })
  afterEach(() => { fixture?.cleanup(); window.innerWidth = 1024 })

  function setWindowWidth(slider: Tvist, width: number) {
    window.innerWidth = width
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
  }

  it('десктоп→мобильный: очищает width, transform, классы слайдов и рута', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpoints: { 768: { enabled: false } },
    })

    expect(slider.isEnabled).toBe(true)
    expect(slider.slides[0].style.width).not.toBe('')
    expect(fixture.root.classList.contains(TVIST_CLASSES.draggable)).toBe(true)

    setWindowWidth(slider, 500)

    checkDisabledCleanup(slider, fixture.root)
  })

  it('туда-сюда: второй переход на мобильный тоже очищает артефакты', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpoints: { 768: { enabled: false } },
    })

    setWindowWidth(slider, 500)
    setWindowWidth(slider, 1024)
    setWindowWidth(slider, 500)

    checkDisabledCleanup(slider, fixture.root)
  })

  it('начальный рендер сразу в disabled breakpoint: нет артефактов', () => {
    window.innerWidth = 500
    fixture = createSliderFixture({ slidesCount: 6, width: 500 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpoints: { 768: { enabled: false } },
    })

    checkDisabledCleanup(slider, fixture.root)
  })

  it('три цикла туда-сюда: артефактов нет', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      gap: 16,
      drag: true,
      breakpoints: { 768: { enabled: false } },
    })

    for (let i = 0; i < 3; i++) {
      setWindowWidth(slider, 500)
      checkDisabledCleanup(slider, fixture.root)
      setWindowWidth(slider, 1024)
      expect(slider.isEnabled).toBe(true)
    }
  })
})

// ─── ручной disable() ─────────────────────────────────────────────────────────

describe('disabled cleanup — ручной disable()', () => {
  let fixture: SliderFixture

  afterEach(() => fixture?.cleanup())

  it('disable() очищает width, transform, классы слайдов и рута', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      perPage: 2,
      gap: 16,
      drag: true,
    })

    expect(slider.slides[0].style.width).not.toBe('')
    expect(fixture.root.classList.contains(TVIST_CLASSES.draggable)).toBe(true)

    slider.disable()

    checkDisabledCleanup(slider, fixture.root)
  })

  it('disable() → enable() → disable(): артефактов нет', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })
    const slider = new Tvist(fixture.root, {
      perPage: 2,
      gap: 16,
      drag: true,
    })

    slider.disable()
    slider.enable()
    slider.disable()

    checkDisabledCleanup(slider, fixture.root)
  })
})
