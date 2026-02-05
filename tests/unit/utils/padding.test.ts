import { describe, it, expect, beforeEach } from 'vitest'
import { unit, getCssPadding, getPaddingValue, applyPadding } from '../../../src/utils/padding'
import type { TvistOptions } from '../../../src/core/types'

describe('padding utils', () => {
  describe('unit', () => {
    it('should convert number to px string', () => {
      expect(unit(10)).toBe('10px')
      expect(unit(100)).toBe('100px')
    })

    it('should return string as is', () => {
      expect(unit('1rem')).toBe('1rem')
      expect(unit('2em')).toBe('2em')
      expect(unit('50%')).toBe('50%')
    })

    it('should return 0px for zero', () => {
      expect(unit(0)).toBe('0px')
    })

    it('should return 0px for undefined', () => {
      expect(unit(undefined)).toBe('0px')
    })
  })

  describe('getCssPadding', () => {
    it('should return 0px when padding is not defined', () => {
      const options: TvistOptions = {}
      expect(getCssPadding(options, 'left')).toBe('0px')
      expect(getCssPadding(options, 'right')).toBe('0px')
      expect(getCssPadding(options, 'top')).toBe('0px')
      expect(getCssPadding(options, 'bottom')).toBe('0px')
    })

    it('should handle number padding (same for all sides)', () => {
      const options: TvistOptions = { padding: 10 }
      expect(getCssPadding(options, 'left')).toBe('10px')
      expect(getCssPadding(options, 'right')).toBe('10px')
      expect(getCssPadding(options, 'top')).toBe('10px')
      expect(getCssPadding(options, 'bottom')).toBe('10px')
    })

    it('should handle string padding (same for all sides)', () => {
      const options: TvistOptions = { padding: '1rem' }
      expect(getCssPadding(options, 'left')).toBe('1rem')
      expect(getCssPadding(options, 'right')).toBe('1rem')
      expect(getCssPadding(options, 'top')).toBe('1rem')
      expect(getCssPadding(options, 'bottom')).toBe('1rem')
    })

    it('should handle object padding with left/right', () => {
      const options: TvistOptions = { 
        padding: { left: 10, right: 20 } 
      }
      expect(getCssPadding(options, 'left')).toBe('10px')
      expect(getCssPadding(options, 'right')).toBe('20px')
    })

    it('should handle object padding with mixed units', () => {
      const options: TvistOptions = { 
        padding: { left: '1rem', right: 20 } 
      }
      expect(getCssPadding(options, 'left')).toBe('1rem')
      expect(getCssPadding(options, 'right')).toBe('20px')
    })

    it('should handle object padding with top/bottom', () => {
      const options: TvistOptions = { 
        padding: { top: 10, bottom: 20 } 
      }
      expect(getCssPadding(options, 'top')).toBe('10px')
      expect(getCssPadding(options, 'bottom')).toBe('20px')
    })

    it('should return 0px for missing object property', () => {
      const options: TvistOptions = { 
        padding: { left: 10 } 
      }
      expect(getCssPadding(options, 'left')).toBe('10px')
      expect(getCssPadding(options, 'right')).toBe('0px')
    })
  })

  describe('getPaddingValue', () => {
    let element: HTMLElement

    beforeEach(() => {
      element = document.createElement('div')
      document.body.appendChild(element)
    })

    it('should return 0 when no padding is set', () => {
      expect(getPaddingValue(element, 'left')).toBe(0)
      expect(getPaddingValue(element, 'right')).toBe(0)
      expect(getPaddingValue(element, 'top')).toBe(0)
      expect(getPaddingValue(element, 'bottom')).toBe(0)
    })

    it('should return padding value in pixels', () => {
      element.style.paddingLeft = '10px'
      element.style.paddingRight = '20px'
      
      expect(getPaddingValue(element, 'left')).toBe(10)
      expect(getPaddingValue(element, 'right')).toBe(20)
    })
  })

  describe('applyPadding', () => {
    let element: HTMLElement

    beforeEach(() => {
      element = document.createElement('div')
      document.body.appendChild(element)
    })

    it('should apply horizontal padding for horizontal direction', () => {
      const options: TvistOptions = { 
        direction: 'horizontal',
        padding: 10 
      }
      
      applyPadding(element, options)
      
      expect(element.style.paddingLeft).toBe('10px')
      expect(element.style.paddingRight).toBe('10px')
      expect(element.style.paddingTop).toBe('')
      expect(element.style.paddingBottom).toBe('')
    })

    it('should apply vertical padding for vertical direction', () => {
      const options: TvistOptions = { 
        direction: 'vertical',
        padding: 10 
      }
      
      applyPadding(element, options)
      
      expect(element.style.paddingTop).toBe('10px')
      expect(element.style.paddingBottom).toBe('10px')
      expect(element.style.paddingLeft).toBe('')
      expect(element.style.paddingRight).toBe('')
    })

    it('should apply different padding values with object', () => {
      const options: TvistOptions = { 
        direction: 'horizontal',
        padding: { left: '1rem', right: '2rem' } 
      }
      
      applyPadding(element, options)
      
      expect(element.style.paddingLeft).toBe('1rem')
      expect(element.style.paddingRight).toBe('2rem')
    })

    it('should default to horizontal when direction is not specified', () => {
      const options: TvistOptions = { 
        padding: 10 
      }
      
      applyPadding(element, options)
      
      expect(element.style.paddingLeft).toBe('10px')
      expect(element.style.paddingRight).toBe('10px')
    })
  })
})
