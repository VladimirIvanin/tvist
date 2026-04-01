/**
 * Snapshot-тесты: стиль padding на tvist-v1__track
 *
 * Фиксирует, что при отсутствии peek inline-стиль padding не выставляется вовсе
 * (не '0px', а отсутствует), а при наличии peek — выставляется корректное значение.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { createSliderFixture } from '../fixtures'
import type { SliderFixture } from '../fixtures'
import type { TvistOptions } from '@core/types'

describe('Track padding style snapshot', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture?.cleanup()
  })

  function createSlider(options: TvistOptions): { slider: Tvist; track: HTMLElement } {
    fixture = createSliderFixture({ slidesCount: 4, width: 1000 })
    slider = new Tvist(fixture.root, options)
    return { slider, track: fixture.track }
  }

  describe('without peek', () => {
    it('track style attribute should not contain padding when peek is not set', () => {
      const { track } = createSlider({ direction: 'horizontal' })

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')
      expect(track.style.paddingTop).toBe('')
      expect(track.style.paddingBottom).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style attribute should not contain padding when peek is zero', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: 0 })

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style attribute should not contain padding when peek is empty object', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: {} })

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style attribute should not contain padding for vertical slider without peek', () => {
      const { track } = createSlider({ direction: 'vertical' })

      expect(track.style.paddingTop).toBe('')
      expect(track.style.paddingBottom).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })
  })

  describe('with peek', () => {
    it('track style should contain paddingLeft and paddingRight for numeric peek', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: 40 })

      expect(track.style.paddingLeft).toBe('40px')
      expect(track.style.paddingRight).toBe('40px')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style should contain paddingLeft and paddingRight for string peek', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: '2rem' })

      expect(track.style.paddingLeft).toBe('2rem')
      expect(track.style.paddingRight).toBe('2rem')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style should contain only paddingLeft for asymmetric object peek', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: { left: 30 } })

      expect(track.style.paddingLeft).toBe('30px')
      expect(track.style.paddingRight).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style should contain both paddings for full asymmetric object peek', () => {
      const { track } = createSlider({ direction: 'horizontal', peek: { left: 20, right: 60 } })

      expect(track.style.paddingLeft).toBe('20px')
      expect(track.style.paddingRight).toBe('60px')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })

    it('track style should contain paddingTop and paddingBottom for vertical peek', () => {
      const { track } = createSlider({ direction: 'vertical', peek: 50 })

      expect(track.style.paddingTop).toBe('50px')
      expect(track.style.paddingBottom).toBe('50px')
      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')

      expect(track.getAttribute('style')).toMatchSnapshot()
    })
  })
})
