/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/autoplay'

describe('AutoplayModule', () => {
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

  describe('Basic functionality', () => {
    it('should start autoplay with default delay', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: true
      })

      expect(slider.activeIndex).toBe(0)

      // Ждём 3000мс (дефолтная задержка)
      vi.advanceTimersByTime(3000)
      expect(slider.activeIndex).toBe(1)

      vi.advanceTimersByTime(3000)
      expect(slider.activeIndex).toBe(2)

      slider.destroy()
    })

    it('should use custom delay', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1500
      })

      expect(slider.activeIndex).toBe(0)

      vi.advanceTimersByTime(1500)
      expect(slider.activeIndex).toBe(1)

      vi.advanceTimersByTime(1500)
      expect(slider.activeIndex).toBe(2)

      slider.destroy()
    })

    it('should stop at the end without loop', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        loop: false
      })

      expect(slider.activeIndex).toBe(0)

      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      // Ещё один тик - должны остаться на последнем слайде
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      slider.destroy()
    })
  })

  describe('Pause on hover', () => {
    it('should pause on mouseenter and resume on mouseleave', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnHover: true
      })

      expect(slider.activeIndex).toBe(0)

      // Наводим курсор
      slider.root.dispatchEvent(new Event('mouseenter'))

      // Ждём - слайд не должен переключиться
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      // Убираем курсор
      slider.root.dispatchEvent(new Event('mouseleave'))

      // Теперь должен переключиться
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })

    it('should not pause when pauseOnHover is false', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnHover: false
      })

      expect(slider.activeIndex).toBe(0)

      // Наводим курсор
      slider.root.dispatchEvent(new Event('mouseenter'))

      // Ждём - слайд должен переключиться
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })
  })

  describe('Pause on interaction', () => {
    it('should pause during drag and resume after', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnInteraction: true,
        drag: true
      })

      expect(slider.activeIndex).toBe(0)

      // Начинаем перетаскивание
      slider.emit('dragStart')

      // Ждём - слайд не должен переключиться
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      // Заканчиваем перетаскивание
      slider.emit('dragEnd')
      // Snap-анимация завершается transitionEnd — resume автоплея
      slider.emit('transitionEnd', 0)

      // Теперь должен переключиться
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })

    it('should reset timer after drag to prevent immediate autoplay', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnInteraction: true,
        drag: true
      })

      expect(slider.activeIndex).toBe(0)

      // Ждём 800мс из 1000мс интервала
      vi.advanceTimersByTime(800)
      expect(slider.activeIndex).toBe(0)

      // Начинаем перетаскивание (осталось 200мс до автоперелистывания)
      slider.emit('dragStart')

      // Ждём 100мс во время драга
      vi.advanceTimersByTime(100)

      // Заканчиваем перетаскивание
      slider.emit('dragEnd')
      // Snap-анимация завершается transitionEnd — resume автоплея
      slider.emit('transitionEnd', 0)

      // После transitionEnd таймер должен сброситься!
      // Если таймер НЕ сбросился, то через 200мс произойдёт автоперелистывание
      // Это баг - пользователь только что перелистнул, а слайдер сразу перелистывает ещё раз
      vi.advanceTimersByTime(200)
      expect(slider.activeIndex).toBe(0) // НЕ должен перелистнуться!

      // Должен перелистнуться только через полный интервал (1000мс) после transitionEnd
      vi.advanceTimersByTime(800) // 200 + 800 = 1000мс
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })

    it('should stop on interaction when disableOnInteraction is true', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnInteraction: true,
        disableOnInteraction: true,
        drag: true
      })

      expect(slider.activeIndex).toBe(0)

      // Начинаем перетаскивание
      slider.emit('dragStart')

      // Заканчиваем перетаскивание
      slider.emit('dragEnd')

      // Ждём - слайд не должен переключиться (autoplay остановлен)
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      slider.destroy()
    })
  })

  describe('Public API', () => {
    it('should expose autoplay control methods', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000
      })

      const autoplay = slider.autoplay

      expect(autoplay.isRunning()).toBe(true)
      expect(autoplay.isPaused()).toBe(false)
      expect(autoplay.isStopped()).toBe(false)

      autoplay.pause()
      expect(autoplay.isPaused()).toBe(true)

      autoplay.resume()
      expect(autoplay.isPaused()).toBe(false)

      autoplay.stop()
      expect(autoplay.isRunning()).toBe(false)

      slider.destroy()
    })
  })

  describe('Rewind functionality', () => {
    it('should rewind to first slide when reaching the end with rewind enabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        rewind: true,
        loop: false
      })

      expect(slider.activeIndex).toBe(0)

      // Переходим на слайд 1
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      // Переходим на слайд 2
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      // Должны вернуться к слайду 0
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      // Цикл продолжается
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })

    it('should not rewind when rewind is disabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        rewind: false,
        loop: false
      })

      expect(slider.activeIndex).toBe(0)

      // Переходим на слайд 1
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      // Переходим на слайд 2
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      // Должны остаться на слайде 2
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      slider.destroy()
    })

    it('should not rewind when loop is enabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        rewind: true,
        loop: true
      })

      expect(slider.activeIndex).toBe(0)

      // С loop включённым, rewind не должен применяться
      // loop имеет приоритет
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      // В loop режиме переход на следующий слайд (0)
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      slider.destroy()
    })

    it('should work with manual navigation when rewind is enabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        rewind: true,
        loop: false
      })

      expect(slider.activeIndex).toBe(0)

      // Ручная навигация
      slider.next()
      expect(slider.activeIndex).toBe(1)

      slider.next()
      expect(slider.activeIndex).toBe(2)

      // Следующий next() должен вернуть к началу
      slider.next()
      expect(slider.activeIndex).toBe(0)

      slider.destroy()
    })

    it('should work with perPage > 1', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
            <div class="${TVIST_CLASSES.slide}">4</div>
            <div class="${TVIST_CLASSES.slide}">5</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        rewind: true,
        perPage: 2,
        loop: false
      })

      expect(slider.activeIndex).toBe(0)

      // Переходим на индекс 1
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      // Переходим на индекс 2
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(2)

      // Переходим на индекс 3
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(3)

      // Должны вернуться к индексу 0
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(0)

      slider.destroy()
    })
  })

  describe('Options update', () => {
    it('should enable autoplay when updated from false to true', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: false
      })

      expect(slider.activeIndex).toBe(0)

      // Autoplay выключен
      vi.advanceTimersByTime(3000)
      expect(slider.activeIndex).toBe(0)

      // Включаем autoplay
      slider.updateOptions({ autoplay: 1000 })

      // Теперь должен работать
      vi.advanceTimersByTime(1000)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })

    it('should update delay when autoplay is already enabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 2000
      })

      expect(slider.activeIndex).toBe(0)

      // Обновляем задержку
      slider.updateOptions({ autoplay: 500 })

      // Должен переключиться с новой задержкой
      vi.advanceTimersByTime(500)
      expect(slider.activeIndex).toBe(1)

      slider.destroy()
    })
  })

  describe('Events', () => {
    it('should emit autoplay events', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      `

      const startSpy = vi.fn()
      const stopSpy = vi.fn()
      const pauseSpy = vi.fn()
      const resumeSpy = vi.fn()

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        autoplay: 1000,
        pauseOnHover: true,
        on: {
          autoplayStart: startSpy,
          autoplayStop: stopSpy,
          autoplayPause: pauseSpy,
          autoplayResume: resumeSpy
        }
      })

      // Start вызывается при инициализации
      expect(startSpy).toHaveBeenCalled()

      // Пауза при hover
      slider.root.dispatchEvent(new Event('mouseenter'))
      expect(pauseSpy).toHaveBeenCalled()

      // Возобновление
      slider.root.dispatchEvent(new Event('mouseleave'))
      expect(resumeSpy).toHaveBeenCalled()

      // Остановка
      slider.autoplay.stop()
      expect(stopSpy).toHaveBeenCalled()

      slider.destroy()
    })
  })
})
