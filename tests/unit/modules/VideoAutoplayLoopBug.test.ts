/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '../../../src/core/constants'
import { Tvist } from '../../../src/core/Tvist'
import '../../../src/modules/video'
import '../../../src/modules/autoplay'
import '../../../src/modules/loop'

function createSliderHTML(slidesContent: string[]): string {
  const slides = slidesContent
    .map(content => `<div class="${TVIST_CLASSES.slide}">${content}</div>`)
    .join('')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        ${slides}
      </div>
    </div>
  `
}

describe('Video Autoplay Loop Bug', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should wait for video on initial slide in loop mode', () => {
    container.innerHTML = createSliderHTML([
        '<video src="test.mp4"></video>', 
        'Slide 2', 
        'Slide 3'
    ])

    // Mock video element
    const video = container.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'readyState', { value: 4, writable: true })
    Object.defineProperty(video, 'duration', { value: 10, writable: true }) // 10 seconds
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true })
    video.play = vi.fn().mockResolvedValue(undefined)
    video.pause = vi.fn()

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      video: true,
      autoplay: {
        delay: 3000, // 3 seconds
        waitForVideo: true
      },
      speed: 0 // Instant transition for easier testing
    })

    // Video should be playing
    expect(video.play).toHaveBeenCalled()

    // Advance time by 3100ms (more than autoplay delay)
    vi.advanceTimersByTime(3100)

    // BUG REPRODUCTION:
    // If bug exists, slider will move to next slide because it didn't wait for video
    // If fixed, slider should still be on index 0
    
    // Check if slider moved
    expect(slider.activeIndex).toBe(0)

    // Advance time to simulate video end (although we need to trigger event manually usually)
    // But since we control the event, we just verify that timer didn't fire.
    
    // Now simulate video ended
    video.dispatchEvent(new Event('ended'))

    // Now it should move
    expect(slider.activeIndex).toBe(1)
  })
})
