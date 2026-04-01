/**
 * Регрессия для сценария docs VideoDocExample:
 * `video` + `autoplay: { pauseOnHover: true }`.
 *
 * Ожидание: при наведении на root слайдера паузится не только таймер автоплея,
 * но и HTML-video на активном слайде; при уходе курсора — воспроизведение возобновляется.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../../src/modules/video'
import '../../../src/modules/autoplay'

function createSliderHTML(slidesContent: string[]): string {
  const slides = slidesContent
    .map(content => `<div class="${TVIST_CLASSES.slide}">${content}</div>`)
    .join('')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.track}">
        <div class="${TVIST_CLASSES.container}">
          ${slides}
        </div>
      </div>
    </div>
  `
}

function patchVideoForTest(video: HTMLVideoElement): {
  playSpy: ReturnType<typeof vi.fn>
  pauseSpy: ReturnType<typeof vi.fn>
} {
  Object.defineProperty(video, 'readyState', {
    value: 4,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(video, 'duration', {
    value: 10,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(video, 'currentTime', {
    value: 0,
    writable: true,
    configurable: true,
  })
  let paused = false
  Object.defineProperty(video, 'paused', {
    get: () => paused,
    configurable: true,
  })
  Object.defineProperty(video, 'ended', {
    value: false,
    writable: true,
    configurable: true,
  })

  const playSpy = vi.fn().mockImplementation(() => {
    paused = false
    return Promise.resolve()
  })
  const pauseSpy = vi.fn().mockImplementation(() => {
    paused = true
  })

  video.play = playSpy
  video.pause = pauseSpy

  return { playSpy, pauseSpy }
}

describe('Video + autoplay pauseOnHover (VideoDocExample)', () => {
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

  it('should pause active HTML video when pointer hovers root (pauseOnHover)', () => {
    container.innerHTML = createSliderHTML([
      '<video src="test.mp4"></video>',
      '<div>slide 2</div>',
    ])

    const root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    const video = root.querySelector('video') as HTMLVideoElement
    const { pauseSpy } = patchVideoForTest(video)

    const slider = new Tvist(root, {
      loop: true,
      video: {
        autoplay: true,
        muted: true,
        playsinline: true,
        pauseOnLeave: true,
      },
      autoplay: {
        delay: 2000,
        pauseOnHover: true,
        waitForVideo: true,
      },
    })

    slider.root.dispatchEvent(new Event('mouseenter'))

    expect(pauseSpy).toHaveBeenCalled()

    slider.destroy()
  })

  it('should resume active HTML video when pointer leaves root (pauseOnHover)', () => {
    container.innerHTML = createSliderHTML([
      '<video src="test.mp4"></video>',
      '<div>slide 2</div>',
    ])

    const root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    const video = root.querySelector('video') as HTMLVideoElement
    const { playSpy } = patchVideoForTest(video)

    const slider = new Tvist(root, {
      loop: true,
      video: {
        autoplay: true,
        muted: true,
        playsinline: true,
        pauseOnLeave: true,
      },
      autoplay: {
        delay: 2000,
        pauseOnHover: true,
        waitForVideo: true,
      },
    })

    const playsAfterInit = playSpy.mock.calls.length
    expect(playsAfterInit).toBeGreaterThan(0)

    slider.root.dispatchEvent(new Event('mouseenter'))
    slider.root.dispatchEvent(new Event('mouseleave'))

    expect(playSpy.mock.calls.length).toBeGreaterThan(playsAfterInit)

    slider.destroy()
  })
})
