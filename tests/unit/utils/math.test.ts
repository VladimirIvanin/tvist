import { describe, it, expect } from 'vitest'
import { clamp, lerp, map, modulo, inRange, roundTo } from '../../../src/utils/math'

describe('math utils', () => {
  describe('clamp', () => {
    it('should clamp value to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('should clamp value to max', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should return value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('should work with negative ranges', () => {
      expect(clamp(-15, -10, 0)).toBe(-10)
      expect(clamp(5, -10, 0)).toBe(0)
    })
  })

  describe('lerp', () => {
    it('should return start when t=0', () => {
      expect(lerp(0, 100, 0)).toBe(0)
    })

    it('should return end when t=1', () => {
      expect(lerp(0, 100, 1)).toBe(100)
    })

    it('should return middle when t=0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50)
    })

    it('should work with negative values', () => {
      expect(lerp(-100, 100, 0.5)).toBe(0)
    })

    it('should extrapolate when t>1', () => {
      expect(lerp(0, 100, 2)).toBe(200)
    })
  })

  describe('map', () => {
    it('should map value from one range to another', () => {
      expect(map(5, 0, 10, 0, 100)).toBe(50)
    })

    it('should map min to outMin', () => {
      expect(map(0, 0, 10, 0, 100)).toBe(0)
    })

    it('should map max to outMax', () => {
      expect(map(10, 0, 10, 0, 100)).toBe(100)
    })

    it('should work with negative ranges', () => {
      expect(map(0, -10, 10, 0, 100)).toBe(50)
    })

    it('should work with inverted output range', () => {
      expect(map(5, 0, 10, 100, 0)).toBe(50)
    })
  })

  describe('modulo', () => {
    it('should return positive modulo for positive numbers', () => {
      expect(modulo(7, 5)).toBe(2)
    })

    it('should return positive modulo for negative numbers', () => {
      expect(modulo(-3, 5)).toBe(2)
    })

    it('should handle zero', () => {
      expect(modulo(0, 5)).toBe(0)
    })

    it('should handle exact multiples', () => {
      expect(modulo(10, 5)).toBe(0)
      expect(modulo(-10, 5)).toBe(0)
    })
  })

  describe('inRange', () => {
    it('should return true for value in range', () => {
      expect(inRange(5, 0, 10)).toBe(true)
    })

    it('should return true for value at min', () => {
      expect(inRange(0, 0, 10)).toBe(true)
    })

    it('should return true for value at max', () => {
      expect(inRange(10, 0, 10)).toBe(true)
    })

    it('should return false for value below min', () => {
      expect(inRange(-1, 0, 10)).toBe(false)
    })

    it('should return false for value above max', () => {
      expect(inRange(11, 0, 10)).toBe(false)
    })
  })

  describe('roundTo', () => {
    it('should round to specified decimals', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23)
    })

    it('should round up when needed', () => {
      expect(roundTo(1.236, 2)).toBe(1.24)
    })

    it('should handle zero decimals', () => {
      expect(roundTo(1.6, 0)).toBe(2)
    })

    it('should handle negative numbers', () => {
      expect(roundTo(-1.235, 2)).toBe(-1.24)
    })
  })
})

