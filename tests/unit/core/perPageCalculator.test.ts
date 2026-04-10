/**
 * Тесты для perPage как функции (PerPageCalculator), getOptionsPerPage и связки с брейкпоинтами.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import type { TvistOptions } from '@core/types'
import { getOptionsPerPage } from '@utils/perPage'
import { createSliderFixture, type SliderFixture } from '../../fixtures'

describe('getOptionsPerPage', () => {
  it('возвращает числовое perPage', () => {
    expect(getOptionsPerPage({ perPage: 4 } as TvistOptions)).toBe(4)
  })

  it('для функции в опциях возвращает 1 (до resolve движка)', () => {
    expect(getOptionsPerPage({ perPage: () => 3 } as TvistOptions)).toBe(1)
  })

  it('без perPage возвращает 1', () => {
    expect(getOptionsPerPage({} as TvistOptions)).toBe(1)
  })
})

describe('PerPageCalculator и Tvist', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    window.innerWidth = 1024
  })

  afterEach(() => {
    fixture?.cleanup()
    window.innerWidth = 1024
  })

  it('slideMinSize перезаписывает результат функции perPage', () => {
    fixture = createSliderFixture({ slidesCount: 5, width: 1000 })
    const fn = vi.fn(() => 1)
    const slider = new Tvist(fixture.root, {
      perPage: fn,
      slideMinSize: 200,
      gap: 0,
    })
    expect(fn).toHaveBeenCalled()
    expect(slider.options.perPage).toBe(5)
  })

  it('некорректное число от функции нормализуется к 1', () => {
    fixture = createSliderFixture({ width: 1000 })
    const slider = new Tvist(fixture.root, {
      perPage: () => Number.NaN,
      gap: 0,
    })
    expect(slider.options.perPage).toBe(1)
  })

  it('peek из опций попадает в контекст (left/right)', () => {
    fixture = createSliderFixture({ width: 1000 })
    const fn = vi.fn((ctx) => {
      expect(ctx.peek.start).toBe(15)
      expect(ctx.peek.end).toBe(25)
      return 1
    })
    new Tvist(fixture.root, {
      perPage: fn,
      gap: 0,
      peek: { left: 15, right: 25 },
    })
    expect(fn).toHaveBeenCalled()
  })

  it('updateOptions с новой perPage-функцией пересчитывает без старого кэша', () => {
    fixture = createSliderFixture({ width: 1000 })
    const first = vi.fn(() => 2)
    const slider = new Tvist(fixture.root, { perPage: first, gap: 0 })
    expect(first).toHaveBeenCalledTimes(1)
    expect(slider.options.perPage).toBe(2)

    const second = vi.fn(() => 3)
    slider.updateOptions({ perPage: second })
    expect(second).toHaveBeenCalledTimes(1)
    expect(slider.options.perPage).toBe(3)

    slider.update()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('window-based: при ширине окна ≤ breakpoint применяется perPage-функция из брейкпоинта', () => {
    window.innerWidth = 500
    fixture = createSliderFixture({ slidesCount: 4, width: 500 })
    const rootFn = vi.fn(() => 99)
    const bpFn = vi.fn(() => 1)

    const slider = new Tvist(fixture.root, {
      perPage: rootFn,
      gap: 0,
      breakpoints: {
        600: { perPage: bpFn },
      },
    })

    expect(rootFn).not.toHaveBeenCalled()
    expect(bpFn).toHaveBeenCalled()
    expect(slider.options.perPage).toBe(1)
  })

  it('window-based: без попадания в breakpoint используется корневая perPage-функция', () => {
    window.innerWidth = 1200
    fixture = createSliderFixture({ slidesCount: 4, width: 1200 })
    const rootFn = vi.fn(() => 2)
    const bpFn = vi.fn(() => 1)

    const slider = new Tvist(fixture.root, {
      perPage: rootFn,
      gap: 0,
      breakpoints: {
        600: { perPage: bpFn },
      },
    })

    expect(rootFn).toHaveBeenCalled()
    expect(bpFn).not.toHaveBeenCalled()
    expect(slider.options.perPage).toBe(2)
  })
})
