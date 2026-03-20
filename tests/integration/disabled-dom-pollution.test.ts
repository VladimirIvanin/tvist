/**
 * Тесты DOM-загрязнения при инициализации в disabled состоянии.
 *
 * Проблема: модули после BreakpointsModule в порядке регистрации
 * (scrollbar, grid, marquee и др.) могут создавать DOM-элементы
 * в init() уже после того как breakpoints вызвал disable().
 * Эти элементы не убираются clearSliderStyles() и остаются в DOM.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/index'
import { createSliderFixture, resizeSlider } from '../fixtures'
import type { SliderFixture } from '../fixtures'

describe('DOM-загрязнение при disabled — container-based', () => {
  let fixture: SliderFixture

  afterEach(() => fixture?.cleanup())

  it('scrollbar: DOM-элементы не создаются при начальном disabled breakpoint', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 500 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    expect(slider.isEnabled).toBe(false)
    // scrollbar DOM не должен быть создан
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })

  it('scrollbar: DOM-элементы убираются при переходе в disabled breakpoint', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    // На десктопе scrollbar должен быть
    expect(slider.isEnabled).toBe(true)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).not.toBeNull()

    // Переходим на мобильный
    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()

    expect(slider.isEnabled).toBe(false)
    // scrollbar DOM должен быть удалён
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })

  it('scrollbar: туда-сюда — DOM чист при каждом disabled', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpointsBase: 'container',
      breakpoints: { 768: { enabled: false } },
    })

    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()

    resizeSlider(fixture.root, 1000)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).not.toBeNull()

    resizeSlider(fixture.root, 500)
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })
})

describe('DOM-загрязнение при disabled — window-based', () => {
  let fixture: SliderFixture

  beforeEach(() => { window.innerWidth = 1024 })
  afterEach(() => { fixture?.cleanup(); window.innerWidth = 1024 })

  function setWindowWidth(slider: Tvist, width: number) {
    window.innerWidth = width
    slider['modules'].get('breakpoints')?.['checkBreakpoints']()
  }

  it('scrollbar: DOM-элементы не создаются при начальном disabled breakpoint', () => {
    window.innerWidth = 500
    fixture = createSliderFixture({ slidesCount: 6, width: 500 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpoints: { 768: { enabled: false } },
    })

    expect(slider.isEnabled).toBe(false)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })

  it('scrollbar: DOM-элементы убираются при переходе в disabled breakpoint', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpoints: { 768: { enabled: false } },
    })

    expect(slider.isEnabled).toBe(true)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).not.toBeNull()

    setWindowWidth(slider, 500)

    expect(slider.isEnabled).toBe(false)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })

  it('scrollbar: туда-сюда — DOM чист при каждом disabled', () => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1000 })

    const slider = new Tvist(fixture.root, {
      enabled: true,
      perPage: 2,
      scrollbar: true,
      breakpoints: { 768: { enabled: false } },
    })

    setWindowWidth(slider, 500)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()

    setWindowWidth(slider, 1024)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).not.toBeNull()

    setWindowWidth(slider, 500)
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.scrollbar}`)).toBeNull()
  })
})
