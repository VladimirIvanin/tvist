import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { EffectModule } from '@modules/effects/EffectModule'
import { createSliderFixture } from '../../../fixtures'
import type { SliderFixture } from '../../../fixtures'

Tvist.registerModule('effect', EffectModule)

describe('Stack Effect - Pile Animation Issues', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
  })

  describe('mode: uncover + pile — анимация при листании', () => {
    /**
     * Проблема: при листании анимация ломается.
     * Базовое состояние (translate=0, activeIndex=0) отображается правильно,
     * но при листании позиции слайдов становятся неправильными.
     */

    it('инициализация pile + uncover: все слайды на translate (колода в одном слоте)', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile', rotate: true, perSlideRotate: 2 },
      })

      const ss = slider.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Все слайды должны быть на позиции translate=0
      slider.slides.forEach((slide, i) => {
        const ty = parseTY(slide.style.transform)
        expect(Math.abs(ty)).toBeLessThan(1, `slide[${i}] tY должна быть близка к 0`)
      })

      // Активный слайд должен быть индекс 0
      expect(slider.activeIndex).toBe(0)
    })

    it('после next(): активный слайд должен остаться на экране (tY=0)', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile', rotate: true },
      })

      slider.next()

      const ss = slider.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      const activeTY = parseTY(slider.slides[slider.activeIndex].style.transform)
      expect(Math.abs(activeTY)).toBeLessThan(1, `активный слайд должен быть на экране (tY ≈ 0), а не ${activeTY}`)
    })

    it('во время анимации к slide[1]: active должен плавно переходить к 0', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile' },
      })

      const ss = slider.engine.slideSizeValue
      const engine = slider.engine as any

      // Симулируем анимацию: переходим от index 0 к index 1
      engine.index.set(1)
      engine.target.set(-ss)

      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Промежуточный кадр анимации
      engine.location.set(-ss * 0.5)
      slider.emit('setTranslate', slider, -ss * 0.5)

      const activeTY = parseTY(slider.slides[1].style.transform)
      expect(Math.abs(activeTY)).toBeLessThan(1, `на середине анимации активный должен быть на экране`)

      // Конечный кадр анимации
      engine.location.set(-ss)
      slider.emit('setTranslate', slider, -ss)

      const activeTYEnd = parseTY(slider.slides[1].style.transform)
      expect(Math.abs(activeTYEnd)).toBeLessThan(1, `в конце анимации активный должен быть на экране`)
    })

    it('первый кадр анимации: translate=0 но activeIndex уже 1 — no jump', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile', rotate: true, perSlideRotate: 2 },
      })

      const ss = slider.engine.slideSizeValue
      const engine = slider.engine as any

      // Симулируем первый кадр анимации
      engine.index.set(1)
      engine.target.set(-ss)
      engine.location.set(0)

      vi.spyOn(slider.engine.animator, 'isAnimating').mockReturnValue(true)
      slider.emit('setTranslate', slider, 0)

      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Slide 0 должна быть в стопке (отрицательная или нулевая позиция)
      const ty0 = parseTY(slider.slides[0].style.transform)
      expect(ty0).toBeLessThanOrEqual(0, `slide[0] при first frame не должна быть на экране`)

      // Slide 1 (новый активный) должна быть на экране
      const ty1 = parseTY(slider.slides[1].style.transform)
      expect(Math.abs(ty1)).toBeLessThan(1, `slide[1] должна быть на экране при first frame`)

      vi.restoreAllMocks()
    })

    it('последовательные листания: позиции должны быть монотонны', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile' },
      })

      const ss = slider.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Последовательное листание
      slider.next() // к slide 1
      const ty1After = parseTY(slider.slides[1].style.transform)
      expect(Math.abs(ty1After)).toBeLessThan(1)

      slider.next() // к slide 2
      const ty2After = parseTY(slider.slides[2].style.transform)
      expect(Math.abs(ty2After)).toBeLessThan(1)

      slider.next() // к slide 3
      const ty3After = parseTY(slider.slides[3].style.transform)
      expect(Math.abs(ty3After)).toBeLessThan(1)

      // Все активные слайды должны быть на экране
      expect(Math.abs(ty1After)).toBeLessThan(1)
      expect(Math.abs(ty2After)).toBeLessThan(1)
      expect(Math.abs(ty3After)).toBeLessThan(1)
    })

    it('просмотренные слайды в pile не уходят вниз (translateY <= 0)', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { mode: 'uncover', stackLayout: 'pile', perSlideOffset: 8 },
      })

      slider.next()
      slider.next()

      const ss = slider.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Slide 0 и slide 1 — просмотренные
      const ty0 = parseTY(slider.slides[0].style.transform)
      const ty1 = parseTY(slider.slides[1].style.transform)

      // В текущей pile-геометрии просмотренные могут оставаться на 0,
      // но не должны уходить ниже линии экрана (в плюс).
      expect(ty0).toBeLessThanOrEqual(0, `slide[0] не должна уходить вниз`)
      expect(ty1).toBeLessThanOrEqual(0, `slide[1] не должна уходить вниз`)

      // Active (slide 2) должна быть на экране
      const ty2 = parseTY(slider.slides[2].style.transform)
      expect(Math.abs(ty2)).toBeLessThan(1, `slide[2] активный должен быть на экране`)
    })

    it('нет больших скачков при переходе между слайдами', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 100, // с анимацией
        stackEffect: { mode: 'uncover', stackLayout: 'pile' },
      })

      const ss = slider.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      // Исходная позиция slide 0
      const initialTY0 = parseTY(slider.slides[0].style.transform)

      // Листаем
      slider.next()

      // Позиция slide 0 после листания должна измениться плавно
      const afterTY0 = parseTY(slider.slides[0].style.transform)

      // Скачок не должен быть больше slideSize
      const jump = Math.abs(afterTY0 - initialTY0)
      expect(jump).toBeLessThan(ss * 1.5, `скачок slide[0] слишком большой: ${jump}`)
    })
  })

  describe('cover vs uncover + pile — согласованность', () => {
    it('cover mode: slide[0] всегда на экране (translate=0)', () => {
      slider = new Tvist(fixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { stackLayout: 'pile', mode: 'cover' },
      })

      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      slider.next()
      slider.next()

      // В cover режиме активный всегда на экране
      const activeTY = parseTY(slider.slides[slider.activeIndex].style.transform)
      expect(Math.abs(activeTY)).toBeLessThan(1)
    })
  })
})
