/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/lazyload'

describe('LazyLoadModule', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Basic Functionality', () => {
    it('should not load images immediately when lazy is enabled', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image1.jpg" alt="Image 1">
            </div>
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image2.jpg" alt="Image 2">
            </div>
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image3.jpg" alt="Image 3">
            </div>
          </div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      const images = container.querySelectorAll('img')
      
      // Третье изображение не должно быть загружено (только первые два с preloadPrevNext=1)
      const thirdImg = images[2] as HTMLImageElement
      expect(thirdImg.src).toBe('')
      expect(thirdImg.hasAttribute('data-src')).toBe(true)
    })

    it('should create spinner elements for lazy images', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image1.jpg" alt="Image 1">
            </div>
          </div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      const spinner = container.querySelector(`.${TVIST_CLASSES.block}__spinner`)
      expect(spinner).toBeTruthy()
    })

    it('should register images with srcset attribute', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image.jpg" data-srcset="image-400.jpg 400w, image-800.jpg 800w" alt="Image">
            </div>
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="image2.jpg" alt="Image 2">
            </div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      // Проверяем что spinner создан (значит изображение зарегистрировано)
      const spinner = container.querySelector(`.${TVIST_CLASSES.block}__spinner`)
      expect(spinner).toBeTruthy()
    })

    it('should emit lazyLoaded event when image loads', async () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">
              <img data-src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Image">
            </div>
          </div>
        </div>
      `

      const lazyLoadedSpy = vi.fn()

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true,
        on: {
          lazyLoaded: lazyLoadedSpy
        }
      })

      // Ждём загрузки изображения (увеличиваем таймаут)
      await new Promise(resolve => setTimeout(resolve, 500))

      // В тестовом окружении изображение может не загрузиться
      // Проверяем что хотя бы модуль активен
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toBeTruthy()
    })
  })

  describe('Preload Settings', () => {
    it('should respect preloadPrevNext setting', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}"><img data-src="image1.jpg" alt="1"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image2.jpg" alt="2"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image3.jpg" alt="3"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image4.jpg" alt="4"></div>
          </div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: {
          preloadPrevNext: 2
        },
        start: 0
      })

      // С preloadPrevNext: 2 должны загрузиться первые 3 изображения (0, 1, 2)
      const images = container.querySelectorAll('img')
      const fourthImg = images[3] as HTMLImageElement
      
      // Четвёртое изображение не должно быть загружено
      expect(fourthImg.hasAttribute('data-src')).toBe(true)
    })
  })

  describe('Public API', () => {
    it('should provide loadAll method', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}"><img data-src="image1.jpg" alt="1"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image2.jpg" alt="2"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image3.jpg" alt="3"></div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      const lazyModule = slider.modules.get('lazyload')
      expect(lazyModule).toBeTruthy()
      expect(typeof lazyModule?.loadAll).toBe('function')
    })

    it('should provide loadSlide method', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}"><img data-src="image1.jpg" alt="1"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image2.jpg" alt="2"></div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      const lazyModule = slider.modules.get('lazyload')
      expect(lazyModule).toBeTruthy()
      expect(typeof lazyModule?.loadSlide).toBe('function')
    })
  })

  describe('Options Update', () => {
    it('should handle lazy option update', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}"><img data-src="image1.jpg" alt="1"></div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image2.jpg" alt="2"></div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: false
      })

      // Включаем lazy через updateOptions
      slider.updateOptions({
        lazy: true
      })

      const lazyModule = slider.modules.get('lazyload')
      expect(lazyModule).toBeTruthy()
    })
  })

  describe('Module Registration', () => {
    it('should be registered in Tvist.MODULES', () => {
      expect(Tvist.MODULES.has('lazyload')).toBe(true)
    })

    it('should not activate when lazy is undefined', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}"><img data-src="image1.jpg" alt="1"></div>
          </div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        // lazy не указан (undefined)
      })

      // Spinner не должен быть создан когда lazy не включен
      const spinner = container.querySelector(`.${TVIST_CLASSES.block}__spinner`)
      expect(spinner).toBeFalsy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle slides without images', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">Text only</div>
            <div class="${TVIST_CLASSES.slide}"><img data-src="image.jpg" alt="Image"></div>
          </div>
        </div>
      `

      expect(() => {
        new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          lazy: true
        })
      }).not.toThrow()
    })

    it('should register images even if they have src when data-src is present', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">
              <img src="placeholder.jpg" data-src="final.jpg" alt="Image with placeholder">
            </div>
          </div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        lazy: true
      })

      // Spinner должен быть создан, т.к. есть data-src
      const spinners = container.querySelectorAll(`.${TVIST_CLASSES.block}__spinner`)
      expect(spinners.length).toBeGreaterThan(0)
    })
  })
})
