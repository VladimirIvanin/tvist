import { describe, it, expect } from 'vitest'
import { Counter } from '../../../src/core/Counter'

describe('Counter', () => {
  describe('constructor', () => {
    it('should initialize with default start value 0', () => {
      const counter = new Counter(5)
      expect(counter.get()).toBe(0)
    })

    it('should initialize with custom start value', () => {
      const counter = new Counter(5, 2)
      expect(counter.get()).toBe(2)
    })

    it('should store max value', () => {
      const counter = new Counter(10)
      expect(counter.max).toBe(10)
    })

    it('should constrain start value within bounds', () => {
      const counter = new Counter(5, 10)
      expect(counter.get()).toBe(4) // max-1
    })

    it('should constrain negative start value', () => {
      const counter = new Counter(5, -3)
      expect(counter.get()).toBe(0)
    })
  })

  describe('set without loop', () => {
    it('should set value within bounds', () => {
      const counter = new Counter(10)
      counter.set(5)
      expect(counter.get()).toBe(5)
    })

    it('should clamp value to max-1', () => {
      const counter = new Counter(5)
      counter.set(10)
      expect(counter.get()).toBe(4)
    })

    it('should clamp negative value to 0', () => {
      const counter = new Counter(5)
      counter.set(-3)
      expect(counter.get()).toBe(0)
    })

    it('should return normalized value', () => {
      const counter = new Counter(5)
      const result = counter.set(10)
      expect(result).toBe(4)
    })
  })

  describe('set with loop', () => {
    it('should wrap positive overflow', () => {
      const counter = new Counter(5, 0, true)
      counter.set(5)
      expect(counter.get()).toBe(0)
    })

    it('should wrap negative index', () => {
      const counter = new Counter(5, 0, true)
      counter.set(-1)
      expect(counter.get()).toBe(4)
    })

    it('should wrap multiple times', () => {
      const counter = new Counter(5, 0, true)
      counter.set(12) // 12 % 5 = 2
      expect(counter.get()).toBe(2)
    })

    it('should wrap negative multiple times', () => {
      const counter = new Counter(5, 0, true)
      counter.set(-7) // -7 + 10 = 3
      expect(counter.get()).toBe(3)
    })
  })

  describe('get', () => {
    it('should return current value', () => {
      const counter = new Counter(10, 5)
      expect(counter.get()).toBe(5)
    })
  })

  describe('add', () => {
    it('should add positive value', () => {
      const counter = new Counter(10, 3)
      counter.add(2)
      expect(counter.get()).toBe(5)
    })

    it('should add negative value', () => {
      const counter = new Counter(10, 5)
      counter.add(-2)
      expect(counter.get()).toBe(3)
    })

    it('should clamp when exceeding max without loop', () => {
      const counter = new Counter(5, 3)
      counter.add(10)
      expect(counter.get()).toBe(4)
    })

    it('should wrap when exceeding max with loop', () => {
      const counter = new Counter(5, 3, true)
      counter.add(3) // 3 + 3 = 6, 6 % 5 = 1
      expect(counter.get()).toBe(1)
    })

    it('should return this for chaining', () => {
      const counter = new Counter(10)
      const result = counter.add(1)
      expect(result).toBe(counter)
    })

    it('should support chaining', () => {
      const counter = new Counter(10, 0)
      counter.add(2).add(3).add(1)
      expect(counter.get()).toBe(6)
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const original = new Counter(10, 5)
      const clone = original.clone()
      
      expect(clone.get()).toBe(5)
      expect(clone.max).toBe(10)
      expect(clone).not.toBe(original)
    })

    it('should not affect original when clone is modified', () => {
      const original = new Counter(10, 5)
      const clone = original.clone()
      
      clone.set(8)
      
      expect(original.get()).toBe(5)
      expect(clone.get()).toBe(8)
    })

    it('should preserve loop setting', () => {
      const original = new Counter(5, 2, true)
      const clone = original.clone()
      
      clone.set(-1)
      expect(clone.get()).toBe(4) // Should wrap
    })
  })

  describe('edge cases', () => {
    it('should handle max = 0', () => {
      const counter = new Counter(0)
      expect(counter.get()).toBe(0)
      counter.set(5)
      expect(counter.get()).toBe(0)
    })

    it('should handle max = 1', () => {
      const counter = new Counter(1)
      expect(counter.get()).toBe(0)
      counter.set(1)
      expect(counter.get()).toBe(0)
    })

    it('should handle large indices with loop', () => {
      const counter = new Counter(5, 0, true)
      counter.set(1000)
      expect(counter.get()).toBe(0) // 1000 % 5 = 0
    })
  })

  describe('navigation scenarios', () => {
    it('should navigate through slides without loop', () => {
      const counter = new Counter(5, 0, false)
      
      counter.add(1) // 1
      expect(counter.get()).toBe(1)
      
      counter.add(1) // 2
      expect(counter.get()).toBe(2)
      
      counter.add(10) // Should clamp to 4
      expect(counter.get()).toBe(4)
      
      counter.add(1) // Should stay at 4
      expect(counter.get()).toBe(4)
    })

    it('should navigate infinitely with loop', () => {
      const counter = new Counter(3, 0, true)
      
      counter.add(1) // 1
      expect(counter.get()).toBe(1)
      
      counter.add(1) // 2
      expect(counter.get()).toBe(2)
      
      counter.add(1) // Should wrap to 0
      expect(counter.get()).toBe(0)
      
      counter.add(-1) // Should wrap to 2
      expect(counter.get()).toBe(2)
    })
  })
})

