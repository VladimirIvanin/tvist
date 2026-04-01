/**
 * Регрессия: perPage > числа оригиналов, withClones.
 *
 * Баги которые покрываем:
 * 1. Counter.max создавался по числу оригиналов до createClones → index нормализовался неверно.
 * 2. Слайдер стартовал на клоне вместо оригинала → буфер слева заканчивался быстро.
 * 3. При достижении края буфера нужна телепортация на эквивалентный оригинал (невидимая).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { TVIST_CLASSES } from '../../src/core/constants'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'
import '../../src/modules/loop'
import '../../src/modules/slide-states/init'

describe('loop withClones + perPage больше числа слайдов', () => {
  let fixture: ReturnType<typeof createSliderFixture>

  afterEach(() => {
    fixture?.cleanup()
  })

  it('стартует на оригинальном слайде, а не на клоне (Counter.max обновляется после createClones)', () => {
    fixture = createSliderFixture({ slidesCount: 4, width: 648 })
    const slider = new Tvist(fixture.root, {
      perPage: 5,
      gap: 0,
      speed: 0,
      loop: { enabled: true, withClones: true },
    })

    const activeSlide = slider.slides[slider.activeIndex]
    expect(activeSlide?.classList.contains(TVIST_CLASSES.slideClone)).toBe(false)
    expect(slider.realIndex).toBe(0)
  })

  it('prev 30 раз — realIndex циклически уменьшается на 1 каждый шаг', () => {
    // Телепортация (невидимая) позволяет бесконечно листать без прыжков.
    // Проверяем по realIndex, а не по location — телепортация меняет location мгновенно,
    // но анимация всегда идёт ровно на 1 слайд.
    fixture = createSliderFixture({ slidesCount: 4, width: 648 })
    const slider = new Tvist(fixture.root, {
      perPage: 5,
      gap: 0,
      speed: 0,
      loop: { enabled: true, withClones: true },
    })

    const originalCount = 4
    let expectedRealIndex = slider.realIndex

    for (let i = 0; i < 30; i++) {
      slider.prev()
      expectedRealIndex = ((expectedRealIndex - 1) + originalCount) % originalCount
      expect(slider.realIndex).toBe(expectedRealIndex)
    }
  })

  it('next 30 раз — realIndex циклически увеличивается на 1 каждый шаг', () => {
    fixture = createSliderFixture({ slidesCount: 4, width: 648 })
    const slider = new Tvist(fixture.root, {
      perPage: 5,
      gap: 0,
      speed: 0,
      loop: { enabled: true, withClones: true },
    })

    const originalCount = 4
    let expectedRealIndex = slider.realIndex

    for (let i = 0; i < 30; i++) {
      slider.next()
      expectedRealIndex = (expectedRealIndex + 1) % originalCount
      expect(slider.realIndex).toBe(expectedRealIndex)
    }
  })

  it('ровно один tvist-v1__slide--active после многих prev', () => {
    fixture = createSliderFixture({ slidesCount: 4, width: 648 })
    const slider = new Tvist(fixture.root, {
      perPage: 5,
      gap: 0,
      speed: 0,
      loop: { enabled: true, withClones: true },
    })

    const countActive = () =>
      slider.slides.filter((s) => s.classList.contains(TVIST_CLASSES.slideActive)).length

    for (let i = 0; i < 20; i++) {
      slider.prev()
      expect(countActive()).toBe(1)
    }
  })
})
