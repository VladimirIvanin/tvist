import { describe, it, expect } from 'vitest'
import { getCubeSlidesInRange } from '@modules/effects/cubeSlideInRange'

describe('getCubeSlidesInRange', () => {
  it('между двумя слайдами помечает ровно две грани', () => {
    const slideSize = 1000
    const translate = -slideSize / 2
    const flags = getCubeSlidesInRange(translate, slideSize, 5)

    expect(flags.filter(Boolean).length).toBe(2)
    expect(flags[0]).toBe(true)
    expect(flags[1]).toBe(true)
    expect(flags.slice(2).every((v) => !v)).toBe(true)
  })

  it('при numSlides === 0 возвращает пустой массив', () => {
    expect(getCubeSlidesInRange(0, 100, 0)).toEqual([])
  })

  it('при slideSize <= 0 все false', () => {
    expect(getCubeSlidesInRange(0, 0, 3)).toEqual([false, false, false])
  })
})
