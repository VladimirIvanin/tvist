import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../../../src/core/EventEmitter'

describe('EventEmitter', () => {
  describe('on and emit', () => {
    it('should call handler when event is emitted', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      emitter.on('test', handler)
      emitter.emit('test')
      
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      emitter.on('test', handler)
      emitter.emit('test', 'arg1', 42, { key: 'value' })
      
      expect(handler).toHaveBeenCalledWith('arg1', 42, { key: 'value' })
    })

    it('should support multiple handlers for same event', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.emit('test')
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should support multiple different events', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.on('event1', handler1)
      emitter.on('event2', handler2)
      
      emitter.emit('event1')
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should return this for chaining', () => {
      const emitter = new EventEmitter()
      const result = emitter.on('test', () => {})
      expect(result).toBe(emitter)
    })

    it('should not throw if event has no listeners', () => {
      const emitter = new EventEmitter()
      expect(() => emitter.emit('nonexistent')).not.toThrow()
    })

    it('should catch and log errors in handlers', () => {
      const emitter = new EventEmitter()
      const errorHandler = vi.fn(() => {
        throw new Error('Test error')
      })
      const validHandler = vi.fn()
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      emitter.on('test', errorHandler)
      emitter.on('test', validHandler)
      emitter.emit('test')
      
      expect(consoleError).toHaveBeenCalled()
      expect(validHandler).toHaveBeenCalledTimes(1) // Should still be called
      
      consoleError.mockRestore()
    })
  })

  describe('off', () => {
    it('should remove specific handler', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test', handler1)
      emitter.emit('test')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove all handlers when handler not specified', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test')
      emitter.emit('test')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should not affect other events', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.on('event1', handler1)
      emitter.on('event2', handler2)
      emitter.off('event1')
      
      emitter.emit('event1')
      emitter.emit('event2')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should handle removing non-existent handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      expect(() => emitter.off('test', handler)).not.toThrow()
    })

    it('should return this for chaining', () => {
      const emitter = new EventEmitter()
      const result = emitter.off('test')
      expect(result).toBe(emitter)
    })
  })

  describe('once', () => {
    it('should call handler only once', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      emitter.once('test', handler)
      emitter.emit('test')
      emitter.emit('test')
      emitter.emit('test')
      
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      emitter.once('test', handler)
      emitter.emit('test', 'arg1', 42)
      
      expect(handler).toHaveBeenCalledWith('arg1', 42)
    })

    it('should work alongside regular handlers', () => {
      const emitter = new EventEmitter()
      const onceHandler = vi.fn()
      const regularHandler = vi.fn()
      
      emitter.once('test', onceHandler)
      emitter.on('test', regularHandler)
      
      emitter.emit('test')
      emitter.emit('test')
      
      expect(onceHandler).toHaveBeenCalledTimes(1)
      expect(regularHandler).toHaveBeenCalledTimes(2)
    })
  })

  describe('onAny and offAny', () => {
    it('should call handler for any event', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      
      emitter.onAny(handler)
      emitter.emit('event1', 'arg1')
      emitter.emit('event2', 'arg2')
      
      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenNthCalledWith(1, 'event1', 'arg1')
      expect(handler).toHaveBeenNthCalledWith(2, 'event2', 'arg2')
    })

    it('should call both specific and any handlers', () => {
      const emitter = new EventEmitter()
      const specificHandler = vi.fn()
      const anyHandler = vi.fn()
      
      emitter.on('test', specificHandler)
      emitter.onAny(anyHandler)
      emitter.emit('test', 'arg')
      
      expect(specificHandler).toHaveBeenCalledWith('arg')
      expect(anyHandler).toHaveBeenCalledWith('test', 'arg')
    })

    it('should remove specific any handler', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.onAny(handler1)
      emitter.onAny(handler2)
      emitter.offAny(handler1)
      emitter.emit('test')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove all any handlers when handler not specified', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter.onAny(handler1)
      emitter.onAny(handler2)
      emitter.offAny()
      emitter.emit('test')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should catch and log errors in any handlers', () => {
      const emitter = new EventEmitter()
      const errorHandler = vi.fn(() => {
        throw new Error('Test error')
      })
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      emitter.onAny(errorHandler)
      emitter.emit('test')
      
      expect(consoleError).toHaveBeenCalled()
      
      consoleError.mockRestore()
    })
  })

  describe('clear', () => {
    it('should remove all listeners', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const anyHandler = vi.fn()
      
      emitter.on('event1', handler1)
      emitter.on('event2', handler2)
      emitter.onAny(anyHandler)
      
      emitter.clear()
      
      emitter.emit('event1')
      emitter.emit('event2')
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
      expect(anyHandler).not.toHaveBeenCalled()
    })
  })

  describe('eventNames', () => {
    it('should return array of event names', () => {
      const emitter = new EventEmitter()
      
      emitter.on('event1', () => {})
      emitter.on('event2', () => {})
      emitter.on('event3', () => {})
      
      const names = emitter.eventNames()
      
      expect(names).toContain('event1')
      expect(names).toContain('event2')
      expect(names).toContain('event3')
      expect(names).toHaveLength(3)
    })

    it('should return empty array when no events', () => {
      const emitter = new EventEmitter()
      expect(emitter.eventNames()).toEqual([])
    })
  })

  describe('listenerCount', () => {
    it('should return number of listeners for event', () => {
      const emitter = new EventEmitter()
      
      emitter.on('test', () => {})
      emitter.on('test', () => {})
      emitter.on('test', () => {})
      
      expect(emitter.listenerCount('test')).toBe(3)
    })

    it('should return 0 for event with no listeners', () => {
      const emitter = new EventEmitter()
      expect(emitter.listenerCount('nonexistent')).toBe(0)
    })

    it('should update after removing listeners', () => {
      const emitter = new EventEmitter()
      const handler = () => {}
      
      emitter.on('test', handler)
      emitter.on('test', () => {})
      
      expect(emitter.listenerCount('test')).toBe(2)
      
      emitter.off('test', handler)
      
      expect(emitter.listenerCount('test')).toBe(1)
    })
  })

  describe('chaining', () => {
    it('should support method chaining', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      emitter
        .on('event1', handler1)
        .on('event2', handler2)
        .emit('event1')
        .emit('event2')
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })
})

