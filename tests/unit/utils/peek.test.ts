import { describe, it, expect, beforeEach } from 'vitest'
import { unit, getCssPeek, getPeekValue, applyPeek } from '../../../src/utils/peek'
import type { TvistOptions } from '../../../src/core/types'

describe('peek utils', () => {
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

  describe('getCssPeek', () => {
    it('should return 0px when peek is not defined', () => {
      const options: TvistOptions = {}
      expect(getCssPeek(options, 'left')).toBe('0px')
      expect(getCssPeek(options, 'right')).toBe('0px')
      expect(getCssPeek(options, 'top')).toBe('0px')
      expect(getCssPeek(options, 'bottom')).toBe('0px')
    })

    it('should handle number peek (same for all sides)', () => {
      const options: TvistOptions = { peek: 10 }
      expect(getCssPeek(options, 'left')).toBe('10px')
      expect(getCssPeek(options, 'right')).toBe('10px')
      expect(getCssPeek(options, 'top')).toBe('10px')
      expect(getCssPeek(options, 'bottom')).toBe('10px')
    })

    it('should handle string peek (same for all sides)', () => {
      const options: TvistOptions = { peek: '1rem' }
      expect(getCssPeek(options, 'left')).toBe('1rem')
      expect(getCssPeek(options, 'right')).toBe('1rem')
      expect(getCssPeek(options, 'top')).toBe('1rem')
      expect(getCssPeek(options, 'bottom')).toBe('1rem')
    })

    it('should handle object peek with left/right', () => {
      const options: TvistOptions = {
        peek: { left: 10, right: 20 }
      }
      expect(getCssPeek(options, 'left')).toBe('10px')
      expect(getCssPeek(options, 'right')).toBe('20px')
    })

    it('should handle object peek with mixed units', () => {
      const options: TvistOptions = {
        peek: { left: '1rem', right: 20 }
      }
      expect(getCssPeek(options, 'left')).toBe('1rem')
      expect(getCssPeek(options, 'right')).toBe('20px')
    })

    it('should handle object peek with top/bottom', () => {
      const options: TvistOptions = {
        peek: { top: 10, bottom: 20 }
      }
      expect(getCssPeek(options, 'top')).toBe('10px')
      expect(getCssPeek(options, 'bottom')).toBe('20px')
    })

    it('should return 0px for missing object property', () => {
      const options: TvistOptions = {
        peek: { left: 10 }
      }
      expect(getCssPeek(options, 'left')).toBe('10px')
      expect(getCssPeek(options, 'right')).toBe('0px')
    })
  })

  describe('getPeekValue', () => {
    let element: HTMLElement

    beforeEach(() => {
      element = document.createElement('div')
      document.body.appendChild(element)
    })

    it('should return 0 when no padding is set', () => {
      expect(getPeekValue(element, 'left')).toBe(0)
      expect(getPeekValue(element, 'right')).toBe(0)
      expect(getPeekValue(element, 'top')).toBe(0)
      expect(getPeekValue(element, 'bottom')).toBe(0)
    })

    it('should return padding value in pixels', () => {
      element.style.paddingLeft = '10px'
      element.style.paddingRight = '20px'

      expect(getPeekValue(element, 'left')).toBe(10)
      expect(getPeekValue(element, 'right')).toBe(20)
    })
  })

  describe('applyPeek', () => {
    let element: HTMLElement

    beforeEach(() => {
      element = document.createElement('div')
      document.body.appendChild(element)
    })

    it('should apply horizontal peek for horizontal direction', () => {
      const options: TvistOptions = {
        direction: 'horizontal',
        peek: 10
      }

      applyPeek(element, options)

      expect(element.style.paddingLeft).toBe('10px')
      expect(element.style.paddingRight).toBe('10px')
      expect(element.style.paddingTop).toBe('')
      expect(element.style.paddingBottom).toBe('')
    })

    it('should apply vertical peek for vertical direction', () => {
      const options: TvistOptions = {
        direction: 'vertical',
        peek: 10
      }

      applyPeek(element, options)

      expect(element.style.paddingTop).toBe('10px')
      expect(element.style.paddingBottom).toBe('10px')
      expect(element.style.paddingLeft).toBe('')
      expect(element.style.paddingRight).toBe('')
    })

    it('should apply different peek values with object', () => {
      const options: TvistOptions = {
        direction: 'horizontal',
        peek: { left: '1rem', right: '2rem' }
      }

      applyPeek(element, options)

      expect(element.style.paddingLeft).toBe('1rem')
      expect(element.style.paddingRight).toBe('2rem')
    })

    it('should default to horizontal when direction is not specified', () => {
      const options: TvistOptions = {
        peek: 10
      }

      applyPeek(element, options)

      expect(element.style.paddingLeft).toBe('10px')
      expect(element.style.paddingRight).toBe('10px')
    })
  })
})
