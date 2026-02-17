/**
 * @vitest-environment happy-dom
 * 
 * Тест для проверки бага с отключением waitForVideo через updateOptions
 * 
 * Баг: Когда videoEndedWhilePaused=true и waitForVideo отключается через updateOptions(),
 * состояние waitingForVideo может остаться true, что приводит к застреванию autoplay
 * при вызове resume(), т.к. run() выходит сразу если waitingForVideo=true.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { TVIST_CLASSES } from '../../../src/core/constants'
import '../../../src/modules/autoplay'
import '../../../src/modules/video'

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

describe('AutoplayModule - waitForVideo Disabled via updateOptions Bug', () => {
  let container: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    slider?.destroy()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should handle waitForVideo being disabled while videoEndedWhilePaused is true', async () => {
    container.innerHTML = createSliderHTML([
      '<video src="test1.mp4"></video>',
      '<video src="test2.mp4"></video>',
      '<video src="test3.mp4"></video>',
    ])

    // Мокаем все video элементы
    const videos = container.querySelectorAll('video')
    videos.forEach((video) => {
      Object.defineProperty(video, 'readyState', { value: 4, writable: true })
      Object.defineProperty(video, 'duration', { value: 10, writable: true })
      Object.defineProperty(video, 'currentTime', { value: 0, writable: true });
      (video as any).play = vi.fn().mockResolvedValue(undefined);
      (video as any).pause = vi.fn()
    })

    slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      video: true,
      autoplay: {
        delay: 1000,
        waitForVideo: true,
        pauseOnHover: true,
      },
      loop: false,
      speed: 300,
    })

    const autoplayModule = slider['modules'].get('autoplay') as any
    const root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement

    // Ждём, пока handleSlideChangedForVideo установит waitingForVideo
    await vi.waitFor(() => expect(autoplayModule.waitingForVideo).toBe(true))

    // Симулируем hover (пауза)
    root.dispatchEvent(new MouseEvent('mouseenter'))
    expect(autoplayModule.paused).toBe(true)

    // Симулируем окончание видео пока на паузе
    const video = container.querySelectorAll('video')[0]
    video.dispatchEvent(new Event('ended'))

    await vi.waitFor(() => expect(autoplayModule.videoEndedWhilePaused).toBe(true))

    // КРИТИЧЕСКИЙ МОМЕНТ: Отключаем waitForVideo через updateOptions
    slider.updateOptions({
      autoplay: {
        delay: 1000,
        waitForVideo: false, // Отключаем waitForVideo
        pauseOnHover: true,
      }
    })

    // Проверяем, что config обновился
    expect(autoplayModule.config.waitForVideo).toBe(false)

    // КРИТИЧЕСКАЯ ПРОВЕРКА: флаги должны быть сброшены
    expect(autoplayModule.waitingForVideo).toBe(false)
    expect(autoplayModule.videoEndedWhilePaused).toBe(false)

    // Симулируем mouseleave (resume)
    root.dispatchEvent(new MouseEvent('mouseleave'))

    // КРИТИЧЕСКАЯ ПРОВЕРКА: autoplay не должен застрять
    // Таймер должен быть запущен
    expect(autoplayModule.timer).not.toBeNull()

    // Проверяем, что autoplay продолжает работать
    vi.advanceTimersByTime(1000)
    
    // Должен произойти переход
    expect(slider.activeIndex).toBe(1)
  })

  it('should reset waitingForVideo when waitForVideo is disabled via updateOptions', () => {
    container.innerHTML = createSliderHTML([
      '<video src="test1.mp4"></video>',
      '<video src="test2.mp4"></video>',
      '<video src="test3.mp4"></video>',
    ])

    // Мокаем все video элементы
    const videos = container.querySelectorAll('video')
    videos.forEach((video) => {
      Object.defineProperty(video, 'readyState', { value: 4, writable: true })
      Object.defineProperty(video, 'duration', { value: 10, writable: true })
      Object.defineProperty(video, 'currentTime', { value: 0, writable: true });
      (video as any).play = vi.fn().mockResolvedValue(undefined);
      (video as any).pause = vi.fn()
    })

    slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      video: true,
      autoplay: {
        delay: 1000,
        waitForVideo: true,
      },
      loop: false,
      speed: 300,
    })

    const autoplayModule = slider['modules'].get('autoplay') as any

    // Ждём, пока waitingForVideo установится
    vi.advanceTimersByTime(100)
    expect(autoplayModule.waitingForVideo).toBe(true)

    // Отключаем waitForVideo
    slider.updateOptions({
      autoplay: {
        delay: 1000,
        waitForVideo: false,
      }
    })

    // КРИТИЧЕСКАЯ ПРОВЕРКА: waitingForVideo должен быть сброшен
    expect(autoplayModule.waitingForVideo).toBe(false)

    // Таймер должен работать
    expect(autoplayModule.timer).not.toBeNull()
  })
})
