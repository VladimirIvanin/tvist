import { describe, it, expect } from 'vitest'
import { Vector1D } from '../../../src/core/Vector1D'

describe('Vector1D', () => {
  describe('constructor', () => {
    it('should initialize with given value', () => {
      const vector = new Vector1D(100)
      expect(vector.get()).toBe(100)
    })

    it('should initialize with zero', () => {
      const vector = new Vector1D(0)
      expect(vector.get()).toBe(0)
    })

    it('should initialize with negative value', () => {
      const vector = new Vector1D(-50)
      expect(vector.get()).toBe(-50)
    })
  })

  describe('set', () => {
    it('should set new value', () => {
      const vector = new Vector1D(0)
      vector.set(200)
      expect(vector.get()).toBe(200)
    })

    it('should return this for chaining', () => {
      const vector = new Vector1D(0)
      const result = vector.set(100)
      expect(result).toBe(vector)
    })
  })

  describe('get', () => {
    it('should return current value', () => {
      const vector = new Vector1D(42)
      expect(vector.get()).toBe(42)
    })
  })

  describe('add', () => {
    it('should add positive value', () => {
      const vector = new Vector1D(10)
      vector.add(5)
      expect(vector.get()).toBe(15)
    })

    it('should add negative value', () => {
      const vector = new Vector1D(10)
      vector.add(-3)
      expect(vector.get()).toBe(7)
    })

    it('should support chaining', () => {
      const vector = new Vector1D(0)
      vector.add(5).add(10).add(15)
      expect(vector.get()).toBe(30)
    })
  })

  describe('subtract', () => {
    it('should subtract value', () => {
      const vector = new Vector1D(20)
      vector.subtract(8)
      expect(vector.get()).toBe(12)
    })

    it('should subtract negative value', () => {
      const vector = new Vector1D(10)
      vector.subtract(-5)
      expect(vector.get()).toBe(15)
    })
  })

  describe('multiply', () => {
    it('should multiply by factor', () => {
      const vector = new Vector1D(10)
      vector.multiply(3)
      expect(vector.get()).toBe(30)
    })

    it('should multiply by decimal', () => {
      const vector = new Vector1D(100)
      vector.multiply(0.5)
      expect(vector.get()).toBe(50)
    })

    it('should multiply by zero', () => {
      const vector = new Vector1D(100)
      vector.multiply(0)
      expect(vector.get()).toBe(0)
    })
  })

  describe('lerp', () => {
    it('should interpolate to target with factor 0.5', () => {
      const vector = new Vector1D(0)
      vector.lerp(100, 0.5)
      expect(vector.get()).toBe(50)
    })

    it('should not move with factor 0', () => {
      const vector = new Vector1D(10)
      vector.lerp(100, 0)
      expect(vector.get()).toBe(10)
    })

    it('should reach target with factor 1', () => {
      const vector = new Vector1D(10)
      vector.lerp(100, 1)
      expect(vector.get()).toBe(100)
    })

    it('should work with multiple lerp calls (smoothing)', () => {
      const vector = new Vector1D(0)
      const target = 100
      const factor = 0.2
      
      // Simulate smooth animation
      vector.lerp(target, factor) // 20
      vector.lerp(target, factor) // 36
      vector.lerp(target, factor) // 48.8
      
      expect(vector.get()).toBeCloseTo(48.8, 1)
    })
  })

  describe('normalize', () => {
    it('should normalize value in range', () => {
      const vector = new Vector1D(50)
      const normalized = vector.normalize(0, 100)
      expect(normalized).toBe(0.5)
    })

    it('should return 0 for min value', () => {
      const vector = new Vector1D(0)
      const normalized = vector.normalize(0, 100)
      expect(normalized).toBe(0)
    })

    it('should return 1 for max value', () => {
      const vector = new Vector1D(100)
      const normalized = vector.normalize(0, 100)
      expect(normalized).toBe(1)
    })

    it('should handle equal min and max', () => {
      const vector = new Vector1D(50)
      const normalized = vector.normalize(100, 100)
      expect(normalized).toBe(0)
    })

    it('should work with negative ranges', () => {
      const vector = new Vector1D(0)
      const normalized = vector.normalize(-100, 100)
      expect(normalized).toBe(0.5)
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const original = new Vector1D(100)
      const clone = original.clone()
      
      expect(clone.get()).toBe(100)
      expect(clone).not.toBe(original)
    })

    it('should not affect original when clone is modified', () => {
      const original = new Vector1D(100)
      const clone = original.clone()
      
      clone.set(200)
      
      expect(original.get()).toBe(100)
      expect(clone.get()).toBe(200)
    })
  })

  describe('chaining', () => {
    it('should support complex method chaining', () => {
      const vector = new Vector1D(10)
      vector
        .add(5)        // 15
        .multiply(2)   // 30
        .subtract(10)  // 20
        .lerp(100, 0.5) // 60
      
      expect(vector.get()).toBe(60)
    })
  })
})

