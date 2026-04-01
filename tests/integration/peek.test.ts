import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/core/Tvist'
import type { TvistOptions } from '../../src/core/types'

describe('Peek integration', () => {
  let root: HTMLElement
  let tvist: Tvist | null = null

  beforeEach(() => {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.innerHTML = `
      <div class="${TVIST_CLASSES.track}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
          <div class="${TVIST_CLASSES.slide}">Slide 4</div>
        </div>
      </div>
    `
    document.body.appendChild(root)

    // Задаём фиксированные размеры для тестов
    root.style.width = '1000px'
    root.style.height = '500px'

    // Мокируем offsetWidth/offsetHeight для тестовой среды
    const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

    Object.defineProperty(root, 'offsetWidth', {
      configurable: true,
      value: 1000
    })
    Object.defineProperty(root, 'offsetHeight', {
      configurable: true,
      value: 500
    })

    Object.defineProperty(track, 'offsetWidth', {
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(track, 'offsetHeight', {
      configurable: true,
      value: 500,
    })
  })

  afterEach(() => {
    if (tvist) {
      tvist.destroy()
      tvist = null
    }
    if (root.parentElement) {
      root.parentElement.removeChild(root)
    }
  })

  describe('Horizontal slider', () => {
    it('should apply numeric peek to container', () => {
      const options: TvistOptions = {
        peek: 50,
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('50px')
      expect(track.style.paddingRight).toBe('50px')
    })

    it('should apply string peek to container', () => {
      const options: TvistOptions = {
        peek: '2rem',
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('2rem')
      expect(track.style.paddingRight).toBe('2rem')
    })

    it('should apply object peek with different left/right values', () => {
      const options: TvistOptions = {
        peek: { left: 30, right: 70 },
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('30px')
      expect(track.style.paddingRight).toBe('70px')
    })

    it('should apply object peek with mixed units', () => {
      const options: TvistOptions = {
        peek: { left: '1rem', right: 50 },
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('1rem')
      expect(track.style.paddingRight).toBe('50px')
    })

    it('should handle partial object peek', () => {
      const options: TvistOptions = {
        peek: { left: 50 },
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('50px')
      expect(track.style.paddingRight).toBe('')
    })
  })

  describe('Vertical slider', () => {
    it('should apply numeric peek to container', () => {
      const options: TvistOptions = {
        peek: 50,
        direction: 'vertical'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingTop).toBe('50px')
      expect(track.style.paddingBottom).toBe('50px')
    })

    it('should apply object peek with different top/bottom values', () => {
      const options: TvistOptions = {
        peek: { top: 30, bottom: 70 },
        direction: 'vertical'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingTop).toBe('30px')
      expect(track.style.paddingBottom).toBe('70px')
    })
  })

  describe('Peek with perPage', () => {
    it('should calculate slide size considering peek', () => {
      const options: TvistOptions = {
        peek: 100, // 100px left + 100px right = 200px total
        perPage: 2,
        gap: 20,
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const slides = Array.from(root.querySelectorAll(`.${TVIST_CLASSES.slide}`)) as HTMLElement[]

      // Доступная ширина = 1000px - 100px (left) - 100px (right) = 800px
      // Размер слайда = (800px - 20px gap) / 2 = 390px
      const expectedSlideWidth = 390

      slides.forEach(slide => {
        const width = parseFloat(slide.style.width)
        expect(width).toBeCloseTo(expectedSlideWidth, 0)
      })
    })

    it('should calculate slide size with asymmetric peek', () => {
      const options: TvistOptions = {
        peek: { left: 50, right: 150 }, // 200px total
        perPage: 2,
        gap: 20,
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const slides = Array.from(root.querySelectorAll(`.${TVIST_CLASSES.slide}`)) as HTMLElement[]

      // Доступная ширина = 1000px - 50px (left) - 150px (right) = 800px
      // Размер слайда = (800px - 20px gap) / 2 = 390px
      const expectedSlideWidth = 390

      slides.forEach(slide => {
        const width = parseFloat(slide.style.width)
        expect(width).toBeCloseTo(expectedSlideWidth, 0)
      })
    })
  })

  describe('Peek without value', () => {
    it('should not set padding when peek is not specified', () => {
      const options: TvistOptions = {
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')
    })
  })

  describe('Peek with CSS units', () => {
    it('should work with rem units', () => {
      const options: TvistOptions = {
        peek: '1rem',
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('1rem')
      expect(track.style.paddingRight).toBe('1rem')
    })

    it('should work with percentage units', () => {
      const options: TvistOptions = {
        peek: '10%',
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('10%')
      expect(track.style.paddingRight).toBe('10%')
    })

    it('should work with em units', () => {
      const options: TvistOptions = {
        peek: '2em',
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('2em')
      expect(track.style.paddingRight).toBe('2em')
    })
  })

  describe('Peek edge cases', () => {
    it('should not set padding when peek is zero', () => {
      const options: TvistOptions = {
        peek: 0,
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')
    })

    it('should not set padding when peek is empty object', () => {
      const options: TvistOptions = {
        peek: {},
        direction: 'horizontal'
      }

      tvist = new Tvist(root, options)
      const track = root.querySelector(`.${TVIST_CLASSES.track}`) as HTMLElement

      expect(track.style.paddingLeft).toBe('')
      expect(track.style.paddingRight).toBe('')
    })
  })
})
