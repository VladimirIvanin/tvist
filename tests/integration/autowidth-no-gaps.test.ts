/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'

describe('AutoWidth - No Gaps on Prev Navigation', () => {
  let root: HTMLElement
  let container: HTMLElement
  let slides: HTMLElement[]
  let slider: Tvist | null = null

  /**
   * Создаёт слайдер с autoWidth и различными размерами слайдов
   */
  function createAutoWidthSlider(slideWidths: number[], containerWidth = 1000) {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = `${containerWidth}px`

    container = document.createElement('div')
    container.className = TVIST_CLASSES.container

    slides = slideWidths.map((width, i) => {
      const slide = document.createElement('div')
      slide.className = TVIST_CLASSES.slide
      slide.style.width = `${width}px`
      slide.textContent = `Slide ${i + 1} (${width}px)`
      container.appendChild(slide)
      return slide
    })

    root.appendChild(container)
    document.body.appendChild(root)

    // Мокируем размеры для happy-dom
    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: containerWidth })
    slides.forEach((slide, i) => {
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: slideWidths[i] })
      Object.defineProperty(slide, 'offsetHeight', { configurable: true, value: 150 })
    })

    slider = new Tvist(root, {
      autoWidth: true,
      gap: 16,
      perPage: 1,
      speed: 0, // Мгновенная прокрутка для тестов
    })

    return slider
  }

  /**
   * Получает правую границу последнего слайда относительно контейнера
   */
  function getLastSlideRightEdge(slider: Tvist): number {
    const transform = slider.container.style.transform
    const translateX = parseFloat(transform.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')
    
    const lastIndex = slider.slides.length - 1
    const lastSlidePosition = slider.engine.getSlidePosition(lastIndex)
    const lastSlideSize = slider.engine.getSlideSize(lastIndex)
    
    return lastSlidePosition + lastSlideSize - translateX
  }

  /**
   * Получает текущий translateX контейнера
   */
  function getTranslateX(slider: Tvist): number {
    const transform = slider.container.style.transform
    return parseFloat(transform.match(/translate3d\((-?\d+\.?\d*)px/)?.[1] || '0')
  }

  afterEach(() => {
    slider?.destroy()
    slider = null
    if (root?.parentNode) {
      document.body.removeChild(root)
    }
  })

  describe('Базовый сценарий', () => {
    it('не должно быть дыры справа при переходе с последнего на предпоследний слайд', () => {
      // Сценарий из реального примера
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      // Переходим к последнему слайду
      slider.scrollTo(5, true)
      expect(slider.activeIndex).toBe(5)

      // Переходим на предпоследний слайд
      slider.scrollTo(4, true)
      expect(slider.activeIndex).toBe(4)

      // Проверяем, что нет дыры справа
      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1) // -1 для погрешности
    })

    it('не должно быть дыры при использовании prev() с последнего слайда', () => {
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      // Переходим к последнему слайду
      slider.scrollTo(5, true)
      
      // Используем prev()
      slider.prev()
      expect(slider.activeIndex).toBe(4)

      // Проверяем отсутствие дыры
      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
    })
  })

  describe('Последовательная прокрутка назад', () => {
    it('не должно быть дыр при последовательной прокрутке от конца к началу', () => {
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      // Переходим к последнему слайду
      slider.scrollTo(5, true)

      // Прокручиваем назад по одному слайду и проверяем отсутствие дыр
      for (let targetIndex = 4; targetIndex >= 0; targetIndex--) {
        slider.scrollTo(targetIndex, true)
        
        const lastSlideRight = getLastSlideRightEdge(slider)
        expect(lastSlideRight).toBeGreaterThanOrEqual(
          containerWidth - 1,
          `Обнаружена дыра при переходе на индекс ${targetIndex}`
        )
      }
    })

    it('не должно быть дыр при прокрутке назад через prev()', () => {
      const slideWidths = [200, 250, 300, 350, 400]
      const containerWidth = 800
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      // Переходим к последнему слайду
      slider.scrollTo(4, true)

      // Прокручиваем назад через prev()
      let iterations = 0
      while (slider.activeIndex > 0 && iterations < 10) {
        slider.prev()
        
        const lastSlideRight = getLastSlideRightEdge(slider)
        expect(lastSlideRight).toBeGreaterThanOrEqual(
          containerWidth - 1,
          `Дыра обнаружена на индексе ${slider.activeIndex}`
        )
        
        iterations++
      }
    })
  })

  describe('Крайние случаи', () => {
    it('должен корректно работать с очень широким последним слайдом', () => {
      const slideWidths = [200, 200, 200, 800]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      slider.scrollTo(2, true)

      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
    })

    it('должен корректно работать с очень узким последним слайдом', () => {
      const slideWidths = [300, 350, 400, 100]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      slider.scrollTo(2, true)

      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
    })

    it('должен работать с одинаковыми размерами слайдов', () => {
      const slideWidths = [250, 250, 250, 250, 250]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(4, true)
      
      for (let i = 3; i >= 0; i--) {
        slider.scrollTo(i, true)
        const lastSlideRight = getLastSlideRightEdge(slider)
        expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
      }
    })

    it('должен работать с малым количеством слайдов', () => {
      const slideWidths = [400, 500]
      const containerWidth = 800
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(1, true)
      slider.scrollTo(0, true)

      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
    })
  })

  describe('Проверка позиции transform', () => {
    it('должен использовать maxScroll вместо basePosition когда это необходимо', () => {
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      // Переходим к последнему слайду
      slider.scrollTo(5, true)
      const translateAtEnd = getTranslateX(slider)
      
      // Переходим на индекс 4
      slider.scrollTo(4, true)
      const translateAt4 = getTranslateX(slider)
      
      // Получаем maxScroll
      const maxScroll = slider.engine.getMaxScrollPosition()
      
      // translateAt4 должен быть равен maxScroll (а не базовой позиции слайда)
      expect(Math.abs(translateAt4 - maxScroll)).toBeLessThan(1)
      
      // При этом translateAtEnd должен быть равен maxScroll
      expect(Math.abs(translateAtEnd - maxScroll)).toBeLessThan(1)
    })

    it('не должен применять maxScroll когда basePosition корректен', () => {
      const slideWidths = [180, 280, 380, 260, 200, 340]
      const containerWidth = 1000
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(5, true)
      
      // При переходе на индекс 0, 1, 2 не должно быть коррекции
      slider.scrollTo(1, true)
      const translateAt1 = getTranslateX(slider)
      const expectedAt1 = -slider.engine.getSlidePosition(1)
      
      // Должен использоваться basePosition без коррекции
      expect(Math.abs(translateAt1 - expectedAt1)).toBeLessThan(1)
    })
  })

  describe('Интеграция с другими опциями', () => {
    it('должен работать с разными значениями gap', () => {
      const slideWidths = [200, 250, 300, 350]
      const gaps = [0, 8, 16, 24, 32]
      const containerWidth = 900

      gaps.forEach(gap => {
        const slider = createAutoWidthSlider(slideWidths, containerWidth)
        slider.update({ gap })

        slider.scrollTo(3, true)
        slider.scrollTo(2, true)

        const lastSlideRight = getLastSlideRightEdge(slider)
        expect(lastSlideRight).toBeGreaterThanOrEqual(
          containerWidth - 1,
          `Дыра с gap=${gap}`
        )

        slider.destroy()
      })
    })

    it('должен работать после update() с изменением размеров', () => {
      const slideWidths = [200, 250, 300, 350]
      const containerWidth = 900
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      slider.scrollTo(2, true)

      // Изменяем размеры слайдов
      const newWidths = [220, 270, 320, 370]
      slides.forEach((slide, i) => {
        slide.style.width = `${newWidths[i]}px`
        Object.defineProperty(slide, 'offsetWidth', { 
          configurable: true, 
          value: newWidths[i] 
        })
      })

      slider.update()

      // Проверяем снова
      slider.scrollTo(3, true)
      slider.scrollTo(2, true)

      const lastSlideRight = getLastSlideRightEdge(slider)
      expect(lastSlideRight).toBeGreaterThanOrEqual(containerWidth - 1)
    })
  })

  describe('canScrollNext и canScrollPrev', () => {
    it('canScrollPrev должен быть true на последнем слайде', () => {
      const slideWidths = [200, 250, 300, 350]
      const containerWidth = 800
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      expect(slider.canScrollPrev).toBe(true)
    })

    it('canScrollNext должен быть false на последнем слайде', () => {
      const slideWidths = [200, 250, 300, 350]
      const containerWidth = 800
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      expect(slider.canScrollNext).toBe(false)
    })

    it('canScrollNext должен обновляться при переходе назад', () => {
      const slideWidths = [200, 250, 300, 350]
      const containerWidth = 800
      const slider = createAutoWidthSlider(slideWidths, containerWidth)

      slider.scrollTo(3, true)
      expect(slider.canScrollNext).toBe(false)

      slider.scrollTo(2, true)
      expect(slider.canScrollNext).toBe(true)
    })
  })
})
