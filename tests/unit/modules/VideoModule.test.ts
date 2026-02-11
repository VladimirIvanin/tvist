/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модули для автоматической регистрации
import '../../../src/modules/video'
import '../../../src/modules/autoplay'

/**
 * Создать mock <video> элемент с базовыми свойствами.
 * happy-dom не полностью эмулирует HTMLVideoElement.
 */
function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video') as HTMLVideoElement
  // happy-dom может не иметь readyState, эмулируем
  Object.defineProperty(video, 'readyState', {
    value: 4, // HAVE_ENOUGH_DATA
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

  // mock play() — возвращаем resolved Promise
  video.play = vi.fn().mockResolvedValue(undefined)
  video.pause = vi.fn()

  return video
}

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

describe('VideoModule', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should not activate when video option is false', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>', 'Image'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: false,
      })

      expect(slider.video).toBeUndefined()
      slider.destroy()
    })

    it('should activate when video option is true', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>', 'Image'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      expect(slider.video).toBeDefined()
      expect(typeof slider.video!.play).toBe('function')
      expect(typeof slider.video!.pause).toBe('function')
      expect(typeof slider.video!.mute).toBe('function')
      expect(typeof slider.video!.unmute).toBe('function')
      expect(typeof slider.video!.isMuted).toBe('function')
      slider.destroy()
    })

    it('should set muted and playsinline attributes on videos', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: { muted: true, playsinline: true },
      })

      const video = slider.slides[0].querySelector('video')!
      expect(video.muted).toBe(true)
      expect(video.getAttribute('playsinline')).toBe('')

      slider.destroy()
    })

    it('should set loop attribute when configured', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: { loop: true },
      })

      const video = slider.slides[0].querySelector('video')!
      expect(video.loop).toBe(true)

      slider.destroy()
    })

    it('should remove native autoplay attribute', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4" autoplay></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      const video = slider.slides[0].querySelector('video')!
      expect(video.getAttribute('autoplay')).toBeNull()

      slider.destroy()
    })
  })

  describe('Public API', () => {
    it('should start muted by default', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      expect(slider.video!.isMuted()).toBe(true)
      slider.destroy()
    })

    it('should toggle mute state', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      expect(slider.video!.isMuted()).toBe(true)

      slider.video!.unmute()
      expect(slider.video!.isMuted()).toBe(false)

      slider.video!.mute()
      expect(slider.video!.isMuted()).toBe(true)

      slider.destroy()
    })
  })

  describe('Events', () => {
    it('should emit videoReady on loadedmetadata', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const readySpy = vi.fn()

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
        on: {
          videoReady: readySpy,
        },
      })

      // Симулируем событие loadedmetadata
      const video = slider.slides[0].querySelector('video')!
      video.dispatchEvent(new Event('loadedmetadata'))

      expect(readySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          slide: slider.slides[0],
          video,
          index: 0,
        })
      )

      slider.destroy()
    })

    it('should emit videoEnded on ended', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const endedSpy = vi.fn()

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
        on: {
          videoEnded: endedSpy,
        },
      })

      // Симулируем событие ended
      const video = slider.slides[0].querySelector('video')!
      video.dispatchEvent(new Event('ended'))

      expect(endedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          slide: slider.slides[0],
          video,
          index: 0,
        })
      )

      slider.destroy()
    })

    it('should emit videoProgress on timeupdate', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const progressSpy = vi.fn()

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
        on: {
          videoProgress: progressSpy,
        },
      })

      const video = slider.slides[0].querySelector('video')!

      // Устанавливаем duration и currentTime
      Object.defineProperty(video, 'duration', { value: 10, configurable: true })
      Object.defineProperty(video, 'currentTime', { value: 5, configurable: true })

      video.dispatchEvent(new Event('timeupdate'))

      expect(progressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          slide: slider.slides[0],
          video,
          index: 0,
          progress: 0.5,
          currentTime: 5,
          duration: 10,
        })
      )

      slider.destroy()
    })
  })

  describe('iframe support', () => {
    it('should add allow="autoplay" attribute to YouTube iframes', () => {
      container.innerHTML = createSliderHTML([
        '<iframe src="https://www.youtube.com/embed/test123"></iframe>',
      ])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      const iframe = slider.slides[0].querySelector('iframe')!
      expect(iframe.getAttribute('allow')).toContain('autoplay')

      slider.destroy()
    })

    it('should add allow="autoplay" to Vimeo iframes', () => {
      container.innerHTML = createSliderHTML([
        '<iframe src="https://player.vimeo.com/video/123456"></iframe>',
      ])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      const iframe = slider.slides[0].querySelector('iframe')!
      expect(iframe.getAttribute('allow')).toContain('autoplay')

      slider.destroy()
    })

    it('should not modify non-video iframes', () => {
      container.innerHTML = createSliderHTML([
        '<iframe src="https://example.com/embed"></iframe>',
      ])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      const iframe = slider.slides[0].querySelector('iframe')!
      // Не видео iframe — не должно быть allow="autoplay"
      expect(iframe.getAttribute('allow')).toBeNull()

      slider.destroy()
    })
  })

  describe('Options update for video', () => {
    it('should enable video module when updated from false to true', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: false,
      })

      expect(slider.video).toBeUndefined()

      slider.updateOptions({ video: true })
      expect(slider.video).toBeDefined()

      slider.destroy()
    })

    it('should disable video module when updated from true to false', () => {
      container.innerHTML = createSliderHTML(['<video src="test.mp4"></video>'])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        video: true,
      })

      expect(slider.video).toBeDefined()

      slider.updateOptions({ video: false })
      expect(slider.video).toBeUndefined()

      slider.destroy()
    })
  })
})
