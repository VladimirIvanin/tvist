/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модули для автоматической регистрации
import '../../src/modules/video'
import '../../src/modules/autoplay'
import '../../src/modules/loop'

/**
 * Создать mock <video> элемент с базовыми свойствами.
 */
function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video') as HTMLVideoElement
  
  Object.defineProperty(video, 'readyState', {
    value: 4, // HAVE_ENOUGH_DATA
    writable: true,
    configurable: true,
  })
  Object.defineProperty(video, 'duration', {
    value: 1, // Короткое видео для быстрого теста
    writable: true,
    configurable: true,
  })
  Object.defineProperty(video, 'currentTime', {
    value: 0,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(video, 'paused', {
    value: true,
    writable: true,
    configurable: true,
  })

  // mock play() — возвращаем resolved Promise
  video.play = vi.fn().mockImplementation(() => {
    Object.defineProperty(video, 'paused', { value: false, writable: true, configurable: true })
    return Promise.resolve()
  })
  
  video.pause = vi.fn().mockImplementation(() => {
    Object.defineProperty(video, 'paused', { value: true, writable: true, configurable: true })
  })

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

/**
 * Mock readyState и play() на всех <video> в контейнере.
 * happy-dom не реализует media pipeline, поэтому readyState=0 и play() undefined.
 */
function mockVideos(root: HTMLElement): void {
  root.querySelectorAll('video').forEach((video) => {
    Object.defineProperty(video, 'readyState', {
      value: 4, // HAVE_ENOUGH_DATA — safePlay() не будет ждать canplay
      writable: true,
      configurable: true,
    })
    // Если play ещё не замокан — мокаем
    if (!vi.isMockFunction(video.play)) {
      vi.spyOn(video, 'play').mockResolvedValue(undefined)
    }
  })
}

describe('VideoModule + LoopModule + AutoplayModule Integration', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('Loop with video slides', () => {
    it('should play video on first slide after looping from last slide', async () => {
      // Создаем 3 слайда: video, image, video
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image slide</div>',
        '<video src="video2.mp4"></video>',
      ])

      // Mock до создания Tvist — safePlay() проверяет readyState
      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
          playsinline: true,
        },
      })

      // Получаем видео элементы (уже замоканы через mockVideos)
      const video1 = slider.slides[0].querySelector('video')!
      const video2 = slider.slides[2].querySelector('video')!

      // Переходим на второй слайд (image)
      slider.next()
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(1)
      })

      // Переходим на третий слайд (video2)
      slider.next()
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      })

      // Проверяем что второе видео воспроизводится
      expect(video2.play).toHaveBeenCalled()

      // Переходим на первый слайд через loop (2 -> 0)
      slider.next()
      await vi.waitFor(() => {
        // В loop-режиме activeIndex = DOM-позиция, realIndex = оригинальный индекс
        expect(slider.realIndex).toBe(0)
      })

      // КРИТИЧНО: Проверяем что первое видео снова воспроизводится после loop
      expect(video1.play).toHaveBeenCalled()

      slider.destroy()
    })

    it('should correctly handle video index after loop rearrangement', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image slide</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slideChangeSpy = vi.fn()

      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        on: {
          slideChangeStart: slideChangeSpy,
        },
      })

      // Переходим к последнему слайду
      slider.scrollTo(2)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      })

      // Очищаем spy для чистоты теста
      slideChangeSpy.mockClear()

      // Сбрасываем play spy для отслеживания
      const video1 = slider.slides[0].querySelector('video')!
      ;(video1.play as ReturnType<typeof vi.fn>).mockClear()

      // Переходим на первый слайд через loop
      slider.next()
      await vi.waitFor(() => {
        // В loop-режиме realIndex = оригинальный индекс слайда
        expect(slider.realIndex).toBe(0)
      })

      // Проверяем что slideChangeStart был вызван
      expect(slideChangeSpy).toHaveBeenCalled()

      // Проверяем что видео на целевом слайде (realIndex=0) было воспроизведено
      // После loop rearrangement видео может оказаться на другом DOM-индексе
      const activeSlide = slider.slides[slider.activeIndex]
      const activeVideo = activeSlide?.querySelector('video')
      expect(activeVideo).toBeTruthy()
      expect(activeVideo!.play).toHaveBeenCalled()

      slider.destroy()
    })

    it('should use data-tvist-slide-index for video lookup in loop mode', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
      })

      // Находим видео по realIndex
      const findSlideByReal = (realIdx: number) =>
        slider.slides.find(s => s.getAttribute('data-tvist-slide-index') === String(realIdx))!
      
      const video1 = findSlideByReal(0).querySelector('video')!
      const video2 = findSlideByReal(2).querySelector('video')!
      
      const video1PlaySpy = vi.spyOn(video1, 'play').mockResolvedValue(undefined)
      const video2PlaySpy = vi.spyOn(video2, 'play').mockResolvedValue(undefined)

      // Переходим на последний слайд
      slider.scrollTo(2)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      })

      expect(video2PlaySpy).toHaveBeenCalled()

      // Очищаем счетчик вызовов
      vi.clearAllMocks()

      // Переходим через loop на первый слайд
      slider.next()
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      })

      // После loop DOM-элементы перемещаются, но data-tvist-slide-index остается
      // VideoModule должен найти видео по realIndex (data-tvist-slide-index)
      const currentSlide = slider.slides[slider.activeIndex]
      const dataIndex = currentSlide.getAttribute('data-tvist-slide-index')
      
      // Проверяем что data-tvist-slide-index указывает на первый слайд
      expect(dataIndex).toBe('0')

      // Проверяем что правильное видео воспроизводится
      expect(video1PlaySpy).toHaveBeenCalled()

      slider.destroy()
    })
  })

  describe('Loop with video + autoplay + waitForVideo', () => {
    it('should wait for video to end before transitioning in loop', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const videoEndedSpy = vi.fn()
      const slideChangeSpy = vi.fn()

      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        autoplay: {
          delay: 1000,
          waitForVideo: true,
        },
        on: {
          videoEnded: videoEndedSpy,
          slideChangeStart: slideChangeSpy,
        },
      })

      const video2 = slider.slides[2].querySelector('video')!

      // Переходим на последний слайд с видео
      slider.scrollTo(2)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      })

      slideChangeSpy.mockClear()

      // Симулируем окончание видео
      video2.dispatchEvent(new Event('ended'))

      // Ждем пока autoplay обработает videoEnded и вызовет next()
      await vi.waitFor(() => {
        expect(videoEndedSpy).toHaveBeenCalled()
      })

      // Проверяем что произошел переход на первый слайд
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 1000 })

      // slideChangeStart вызван (DOM-индекс может отличаться от realIndex)
      expect(slideChangeSpy).toHaveBeenCalled()

      slider.destroy()
    })

    it('should continue loop cycle after video ends', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        autoplay: {
          delay: 100,
          waitForVideo: true,
        },
      })

      // Находим видео по realIndex (data-tvist-slide-index), а не по DOM-позиции
      const findSlideByReal = (realIdx: number) =>
        slider.slides.find(s => s.getAttribute('data-tvist-slide-index') === String(realIdx))!
      
      const video1 = findSlideByReal(0).querySelector('video')!
      const video2 = findSlideByReal(2).querySelector('video')!
      
      // mockVideos уже замокал play, но мы ставим spy заново после init
      mockVideos(root as HTMLElement)
      const video1PlaySpy = vi.spyOn(video1, 'play').mockResolvedValue(undefined)

      // Симулируем полный цикл: 0 -> 1 -> 2 -> 0
      
      // Окончание первого видео (slider на realIndex=0)
      video1.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(1)
      })

      // Ждем autoplay на image слайде (delay)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      }, { timeout: 500 })

      // Сброс spy перед проверкой повторного воспроизведения
      video1PlaySpy.mockClear()

      // Окончание второго видео — должен произойти loop wrap на realIndex=0
      video2.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      })

      // Проверяем что первое видео снова воспроизводится после loop
      expect(video1PlaySpy).toHaveBeenCalled()

      slider.destroy()
    })
  })

  describe('Multiple loop iterations with video + autoplay', () => {
    it('should complete 3 full loop cycles with video(0) + image(1) + video(2)', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        autoplay: {
          delay: 50, // короткий delay для image-слайда
          waitForVideo: true,
        },
      })

      // Находим видео по realIndex (стабильно при loop перестановках)
      const findSlideByReal = (realIdx: number) =>
        slider.slides.find(s => s.getAttribute('data-tvist-slide-index') === String(realIdx))!

      const video0 = findSlideByReal(0).querySelector('video')!
      const video2 = findSlideByReal(2).querySelector('video')!
      mockVideos(root as HTMLElement) // обновляем spy после init

      const slideChangeLog: number[] = []
      slider.on('slideChangeStart', (idx: number) => slideChangeLog.push(idx))

      // === Итерация 1: 0 → 1 → 2 → (loop wrap) 0 ===

      // Слайд 0: видео — диспатчим ended
      video0.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(1)
      }, { timeout: 500 })

      // Слайд 1: image — ждём autoplay delay
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      }, { timeout: 500 })

      // Слайд 2: видео — диспатчим ended → loop wrap на 0
      video2.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 500 })

      // === Итерация 2: 0 → 1 → 2 → 0 ===

      video0.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(1)
      }, { timeout: 500 })

      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      }, { timeout: 500 })

      video2.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 500 })

      // === Итерация 3: 0 → 1 → 2 → 0 ===

      video0.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(1)
      }, { timeout: 500 })

      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      }, { timeout: 500 })

      video2.dispatchEvent(new Event('ended'))
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 500 })

      // Проверяем что за 3 итерации было 9 переходов (3 x [0→1, 1→2, 2→0])
      console.log('slideChangeStart log:', slideChangeLog)
      expect(slideChangeLog).toEqual([1, 2, 0, 1, 2, 0, 1, 2, 0])

      slider.destroy()
    })
  })

  describe('Hover during video playback (waitForVideo)', () => {
    it('should NOT get stuck when hover happens during video playback', async () => {
      /**
       * БАГ: mouseenter при waitingForVideo=true → pause() → videoEnded IGNORED →
       * mouseleave → resume() → run() → waitingForVideo=true → return → ЗАВИСАНИЕ
       *
       * speed: 0 для мгновенных переходов. Порядок событий контролируем вручную:
       * переходим на видео-слайд, затем эмулируем hover + videoEnded + mouseleave.
       */
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        autoplay: {
          delay: 50,
          waitForVideo: true,
          pauseOnHover: true,
        },
      })

      mockVideos(root as HTMLElement)

      // Переходим вручную на видео-слайд (realIndex=2)
      slider.scrollTo(2)
      expect(slider.realIndex).toBe(2)

      // slideChangeEnd эмитится мгновенно (speed: 0), handleSlideChangedForVideo
      // установил waitingForVideo=true и подписался на videoEnded.
      // Ждём чтобы всё обработалось
      await new Promise(r => setTimeout(r, 10))

      // Эмулируем баг: hover во время воспроизведения видео
      // 1. mouseenter → pause() (paused=true, waitingForVideo=true)
      slider.root.dispatchEvent(new Event('mouseenter'))

      // 2. Видео закончилось пока paused=true → videoEnded эмитится VideoModule'ем
      //    Эмитим напрямую через slider чтобы AutoplayModule получил событие
      slider.emit('videoEnded')

      // 3. mouseleave → resume() — должен обработать отложенный videoEnded
      slider.root.dispatchEvent(new Event('mouseleave'))

      // После resume слайдер должен вызвать next() и перейти к realIndex=0 (loop wrap)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 500 })

      slider.destroy()
    })

    it('should resume normal delay after hover on image slide', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const root = container.querySelector(`.${TVIST_CLASSES.block}`)!
      mockVideos(root as HTMLElement)

      const slider = new Tvist(root, {
        perPage: 1,
        speed: 0,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
        autoplay: {
          delay: 50,
          waitForVideo: true,
          pauseOnHover: true,
        },
      })

      mockVideos(root as HTMLElement)

      // Переходим на image-слайд
      slider.scrollTo(1)
      expect(slider.realIndex).toBe(1)
      await new Promise(r => setTimeout(r, 10))

      // Hover на image-слайде — прогресс должен остановиться
      slider.root.dispatchEvent(new Event('mouseenter'))
      await new Promise(r => setTimeout(r, 100)) // ждём больше delay (50ms)
      expect(slider.realIndex).toBe(1) // всё ещё на image, таймер на паузе

      // Убираем hover — delay возобновляется
      slider.root.dispatchEvent(new Event('mouseleave'))

      // Должен перейти на realIndex=2 после delay
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      }, { timeout: 300 })

      slider.destroy()
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid next() calls in loop mode with video', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<video src="video2.mp4"></video>',
        '<video src="video3.mp4"></video>',
      ])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
      })

      // Быстро вызываем next() несколько раз
      slider.next()
      slider.next()
      slider.next()

      // Ждем завершения всех переходов — после 3 next() должны вернуться к началу
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(0)
      }, { timeout: 2000 })

      // Проверяем что слайдер не сломался
      expect(slider.realIndex).toBeGreaterThanOrEqual(0)
      expect(slider.realIndex).toBeLessThan(3)

      slider.destroy()
    })

    it('should not break when video element is removed during loop', async () => {
      container.innerHTML = createSliderHTML([
        '<video src="video1.mp4"></video>',
        '<div>Image</div>',
        '<video src="video2.mp4"></video>',
      ])

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 1,
        loop: true,
        video: {
          autoplay: true,
          muted: true,
        },
      })

      // Переходим на последний слайд
      slider.scrollTo(2)
      await vi.waitFor(() => {
        expect(slider.realIndex).toBe(2)
      })

      // Удаляем видео элемент
      const video2 = slider.slides[slider.activeIndex].querySelector('video')!
      video2.remove()

      // Пытаемся перейти на первый слайд через loop
      expect(() => {
        slider.next()
      }).not.toThrow()

      slider.destroy()
    })
  })
})
