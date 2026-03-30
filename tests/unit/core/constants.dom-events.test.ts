import { describe, expect, it } from 'vitest'
import { TVIST_DOM_EVENTS } from '@core/constants'

describe('TVIST_DOM_EVENTS', () => {
  it('стабильные имена DOM CustomEvent для holdToPause (без всплытия)', () => {
    expect(TVIST_DOM_EVENTS.longPressStart).toBe('tvist-long-press-start')
    expect(TVIST_DOM_EVENTS.longPressEnd).toBe('tvist-long-press-end')
  })
})
