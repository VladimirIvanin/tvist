import { getRuntime } from '../../../src/core/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { createDragModule as DragModule } from '@modules/drag/DragModule'
import { createSliderFixture } from '../../fixtures'

describe('Drag momentum timing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()

  })

  it('travels the same distance in equal time at 30 and 60 FPS', () => {


    const travel = (fps: number): number => {
      const fixture = createSliderFixture({ slidesCount: 10, width: 600 })
      const frames: FrameRequestCallback[] = []
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      })
      vi.stubGlobal('cancelAnimationFrame', () => undefined)

      const slider = new Tvist(fixture.root, { drag: 'free', perPage: 1 })
      slider.scrollTo(3, true)
      const start = getRuntime(slider).engine.location.get()
      const module = getRuntime(slider).getModule('drag') as unknown as { startMomentum(velocity: number): void }
      module.startMomentum(-0.25)
      const base = performance.now()

      for (let frame = 1; frame <= fps; frame++) {
        frames.shift()?.(base + frame * 1000 / fps)
      }

      const distance = getRuntime(slider).engine.location.get() - start
      slider.destroy()
      fixture.cleanup()
      return distance
    }

    expect(travel(30)).toBeCloseTo(travel(60), 0)
  })
})
