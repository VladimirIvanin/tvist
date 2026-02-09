/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'

describe('Engine - autoWidth / autoHeight', () => {
  let root: HTMLElement
  let container: HTMLElement
  let slides: HTMLElement[]

  function createSliderWithAutoWidth(slideWidths: number[], options: { gap?: number; center?: boolean } = {}) {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '1000px'

    container = document.createElement('div')
    container.className = TVIST_CLASSES.container

    slides = slideWidths.map((_, i) => {
      const slide = document.createElement('div')
      slide.className = TVIST_CLASSES.slide
      slide.textContent = `Slide ${i + 1}`
      container.appendChild(slide)
      return slide
    })

    root.appendChild(container)
    document.body.appendChild(root)

    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 1000 })

    slides.forEach((slide, i) => {
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: slideWidths[i] })
      Object.defineProperty(slide, 'offsetHeight', { configurable: true, value: 100 })
    })

    return new Tvist(root, {
      autoWidth: true,
      gap: options.gap ?? 16,
      perPage: 1,
      center: options.center ?? false,
      speed: 0,
    })
  }

  function createSliderWithAutoHeight(slideHeights: number[], options: { gap?: number } = {}) {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '400px'
    root.style.height = '500px'

    container = document.createElement('div')
    container.className = TVIST_CLASSES.container

    slides = slideHeights.map((_, i) => {
      const slide = document.createElement('div')
      slide.className = TVIST_CLASSES.slide
      slide.textContent = `Slide ${i + 1}`
      container.appendChild(slide)
      return slide
    })

    root.appendChild(container)
    document.body.appendChild(root)

    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 400 })
    Object.defineProperty(root, 'offsetHeight', { configurable: true, value: 500 })

    slides.forEach((slide, i) => {
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 400 })
      Object.defineProperty(slide, 'offsetHeight', { configurable: true, value: slideHeights[i] })
    })

    return new Tvist(root, {
      direction: 'vertical',
      autoHeight: true,
      gap: options.gap ?? 12,
      perPage: 1,
      speed: 0,
    })
  }

  afterEach(() => {
    if (root?.parentNode) {
      document.body.removeChild(root)
    }
  })

  describe('autoWidth', () => {
    it('should not set width on slides when autoWidth: true', () => {
      const slideWidths = [180, 280, 380]
      createSliderWithAutoWidth(slideWidths)

      slides.forEach((slide) => {
        expect(slide.style.width).toBe('')
      })
    })

    it('should measure slide sizes from DOM and return via getSlideSize', () => {
      const slideWidths = [180, 280, 380, 260, 200]
      const slider = createSliderWithAutoWidth(slideWidths)

      slideWidths.forEach((width, i) => {
        expect(slider.engine.getSlideSize(i)).toBe(width)
      })
    })

    it('should calculate positions as cumulative sum of sizes + gap', () => {
      const slideWidths = [180, 280, 380]
      const gap = 16
      const slider = createSliderWithAutoWidth(slideWidths, { gap })

      expect(slider.engine.getSlidePosition(0)).toBe(0)
      expect(slider.engine.getSlidePosition(1)).toBe(180 + gap)
      expect(slider.engine.getSlidePosition(2)).toBe(180 + gap + 280 + gap)
    })

    it('slideSizeValue should return first slide size when autoWidth', () => {
      const slideWidths = [180, 280, 380]
      const slider = createSliderWithAutoWidth(slideWidths)

      expect(slider.engine.slideSizeValue).toBe(180)
    })

    it('should allow scrolling to last slide (endIndex = slideCount - 1)', () => {
      const slideWidths = [180, 280, 380]
      const slider = createSliderWithAutoWidth(slideWidths)

      slider.scrollTo(2, true)
      expect(slider.activeIndex).toBe(2)

      slider.scrollTo(10, true)
      expect(slider.activeIndex).toBe(2)
    })

    it('should scroll to specific index with autoWidth', () => {
      const slideWidths = [180, 280, 380, 260]
      const slider = createSliderWithAutoWidth(slideWidths)

      slider.scrollTo(0, true)
      expect(slider.activeIndex).toBe(0)

      slider.scrollTo(3, true)
      expect(slider.activeIndex).toBe(3)
    })

    it('canScrollNext/canScrollPrev should work with autoWidth', () => {
      // Суммарная ширина контента должна быть больше контейнера, иначе слайдер блокируется (lock)
      const slideWidths = [400, 400, 400]
      const slider = createSliderWithAutoWidth(slideWidths)

      slider.scrollTo(0, true)
      expect(slider.canScrollNext).toBe(true)
      expect(slider.canScrollPrev).toBe(false)

      slider.scrollTo(2, true)
      expect(slider.canScrollNext).toBe(false)
      expect(slider.canScrollPrev).toBe(true)
    })

    it('should apply transform when scrolling with autoWidth', () => {
      const slideWidths = [180, 280]
      const slider = createSliderWithAutoWidth(slideWidths)

      slider.scrollTo(1, true)

      const transform = slider.container.style.transform
      expect(transform).toContain('translate3d')
      expect(transform).not.toContain('0px, 0, 0')
    })

    it('getCenterOffset should use slide size for active index when center: true', () => {
      const slideWidths = [180, 280, 380]
      const slider = createSliderWithAutoWidth(slideWidths, { center: true })

      const offset0 = slider.engine.getCenterOffset(0)
      const offset1 = slider.engine.getCenterOffset(1)

      expect(offset0).toBe((1000 - 180) / 2)
      expect(offset1).toBe((1000 - 280) / 2)
    })
  })

  describe('autoHeight', () => {
    it('should not set height on slides when autoHeight: true and direction vertical', () => {
      const slideHeights = [100, 180, 140]
      createSliderWithAutoHeight(slideHeights)

      slides.forEach((slide) => {
        expect(slide.style.height).toBe('')
      })
    })

    it('should measure slide heights from DOM and return via getSlideSize', () => {
      const slideHeights = [100, 180, 140, 160, 90]
      const slider = createSliderWithAutoHeight(slideHeights)

      slideHeights.forEach((height, i) => {
        expect(slider.engine.getSlideSize(i)).toBe(height)
      })
    })

    it('should calculate vertical positions as cumulative sum of heights + gap', () => {
      const slideHeights = [100, 180, 140]
      const gap = 12
      const slider = createSliderWithAutoHeight(slideHeights, { gap })

      expect(slider.engine.getSlidePosition(0)).toBe(0)
      expect(slider.engine.getSlidePosition(1)).toBe(100 + gap)
      expect(slider.engine.getSlidePosition(2)).toBe(100 + gap + 180 + gap)
    })

    it('should scroll vertically with autoHeight', () => {
      const slideHeights = [100, 180, 140]
      const slider = createSliderWithAutoHeight(slideHeights)

      slider.scrollTo(2, true)
      expect(slider.activeIndex).toBe(2)

      const transform = slider.container.style.transform
      expect(transform).toContain('translate3d(0,')
    })
  })

  describe('autoWidth without autoHeight (default direction)', () => {
    it('should use horizontal layout and getOuterWidth for slides', () => {
      const slideWidths = [200, 300]
      const slider = createSliderWithAutoWidth(slideWidths)

      expect(slider.engine.getSlideSize(0)).toBe(200)
      expect(slider.engine.getSlideSize(1)).toBe(300)
      expect(slider.engine.getSlidePosition(1)).toBe(200 + 16)
    })
  })

  describe('update with autoWidth', () => {
    it('should recalculate sizes and positions after update()', () => {
      const slideWidths = [180, 280]
      const slider = createSliderWithAutoWidth(slideWidths)

      expect(slider.engine.getSlidePosition(0)).toBe(0)
      expect(slider.engine.getSlidePosition(1)).toBe(196)

      Object.defineProperty(slides[0], 'offsetWidth', { configurable: true, value: 200 })
      Object.defineProperty(slides[1], 'offsetWidth', { configurable: true, value: 300 })
      slider.update()

      expect(slider.engine.getSlideSize(0)).toBe(200)
      expect(slider.engine.getSlideSize(1)).toBe(300)
      expect(slider.engine.getSlidePosition(0)).toBe(0)
      expect(slider.engine.getSlidePosition(1)).toBe(200 + 16)
    })
  })

  describe('autoWidth - no gaps on prev from end', () => {
    it('should not create gap on right when going prev from last slide', () => {
      // Контейнер 1000px, слайды разной ширины
      // При переходе с последнего на предыдущий не должно быть пустого места справа
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const gap = 16
      const slider = createSliderWithAutoWidth(slideWidths, { gap })

      // Переходим к последнему слайду
      slider.scrollTo(5, true)
      expect(slider.activeIndex).toBe(5)

      // Получаем текущую позицию контейнера
      const transformAtEnd = slider.container.style.transform
      const translateXAtEnd = parseFloat(transformAtEnd.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')

      // Переходим назад на один слайд
      slider.scrollTo(4, true)
      expect(slider.activeIndex).toBe(4)

      const transformAfterPrev = slider.container.style.transform
      const translateXAfterPrev = parseFloat(transformAfterPrev.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')

      // Вычисляем правую границу последнего слайда
      const lastSlidePosition = slider.engine.getSlidePosition(5)
      const lastSlideSize = slider.engine.getSlideSize(5)
      const lastSlideRight = lastSlidePosition - translateXAfterPrev

      // Правая граница последнего слайда не должна быть меньше ширины контейнера
      // (т.е. не должно быть пустого места справа)
      expect(lastSlideRight + lastSlideSize).toBeGreaterThanOrEqual(1000)
    })

    it('should not create gap when going prev from end with different sizes', () => {
      // Сценарий из примера: узкий, средний, широкий, средний, узкий, широкий
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const gap = 16
      const slider = createSliderWithAutoWidth(slideWidths, { gap })
      const containerWidth = 1000

      // Идём к концу
      slider.scrollTo(5, true)

      // Теперь идём назад по одному слайду
      for (let targetIndex = 4; targetIndex >= 0; targetIndex--) {
        slider.scrollTo(targetIndex, true)

        const transform = slider.container.style.transform
        const translateX = parseFloat(transform.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')

        // Проверяем, что последний слайд не выходит за правую границу контейнера
        const lastSlidePos = slider.engine.getSlidePosition(5)
        const lastSlideSize = slider.engine.getSlideSize(5)
        const lastSlideRightEdge = lastSlidePos + lastSlideSize - translateX

        // Правая граница последнего слайда должна быть >= ширины контейнера
        // (не должно быть "дыры" справа)
        expect(lastSlideRightEdge).toBeGreaterThanOrEqual(
          containerWidth - 1, // -1 для погрешности округления
          `Gap detected when at index ${targetIndex}: last slide right edge is ${lastSlideRightEdge}, but container width is ${containerWidth}`
        )
      }
    })

    it('should handle edge case with very wide last slide', () => {
      // Случай когда последний слайд очень широкий
      const slideWidths = [200, 200, 200, 800]
      const gap = 16
      const slider = createSliderWithAutoWidth(slideWidths, { gap })

      slider.scrollTo(3, true)
      slider.scrollTo(2, true)

      const transform = slider.container.style.transform
      const translateX = parseFloat(transform.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')

      const lastSlidePos = slider.engine.getSlidePosition(3)
      const lastSlideSize = slider.engine.getSlideSize(3)
      const lastSlideRightEdge = lastSlidePos + lastSlideSize - translateX

      expect(lastSlideRightEdge).toBeGreaterThanOrEqual(999) // 1000 - 1px погрешность
    })
  })
})
