/**
 * Интеграционные тесты для режима центрирования
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/index'
import { createSliderFixture } from '../fixtures'

describe('Center Mode Integration', () => {
  let root: HTMLElement
  let tvist: Tvist
  let cleanup: () => void

  beforeEach(() => {
    const fixture = createSliderFixture({
      slidesCount: 7,
    })
    root = fixture.root
    cleanup = fixture.cleanup
  })

  afterEach(() => {
    tvist?.destroy()
    cleanup()
  })

  describe('Positioning', () => {
    it('должен центрировать активный слайд при center: true', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 3,
        speed: 0,
      })

      // В центрированном режиме активный слайд должен быть по центру контейнера
      const activeSlide = tvist.slides[3]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      // Центр слайда должен быть примерно в центре root
      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      // Допускаем небольшую погрешность
      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('должен центрировать первый слайд', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 0,
        speed: 0,
      })

      const activeSlide = tvist.slides[0]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('должен центрировать последний слайд', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 6,
        speed: 0,
      })

      const activeSlide = tvist.slides[6]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })

  describe('Navigation', () => {
    it('должен позволять навигацию к любому слайду с center: true', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 0,
      })

      expect(tvist.engine.canScrollNext()).toBe(true)
      
      tvist.scrollTo(6, true)
      expect(tvist.activeIndex).toBe(6)
      expect(tvist.engine.canScrollPrev()).toBe(true)
    })

    it('endIndex должен быть slideCount - 1 в center режиме', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 0,
      })

      // В center режиме можем скроллить к последнему слайду
      tvist.scrollTo(6, true)
      expect(tvist.activeIndex).toBe(6)
    })

    it('должен корректно работать с next/prev в center режиме', async () => {
      tvist = new Tvist(root, {
        perPage: 2,
        center: true,
        start: 2,
        speed: 0,
      })

      expect(tvist.activeIndex).toBe(2)

      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(tvist.activeIndex).toBe(3)

      tvist.prev()
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(tvist.activeIndex).toBe(2)
    })
  })

  describe('With perPage variations', () => {
    it('должен работать с perPage: 1', () => {
      tvist = new Tvist(root, {
        perPage: 1,
        center: true,
        start: 3,
        speed: 0,
      })

      const activeSlide = tvist.slides[3]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('должен работать с perPage: 2', () => {
      tvist = new Tvist(root, {
        perPage: 2,
        center: true,
        start: 3,
        speed: 0,
      })

      const activeSlide = tvist.slides[3]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('должен работать с perPage: 4', () => {
      tvist = new Tvist(root, {
        perPage: 4,
        center: true,
        start: 3,
        speed: 0,
      })

      const activeSlide = tvist.slides[3]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })

  describe('With gap', () => {
    it('должен корректно центрировать с gap', () => {
      tvist = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        start: 3,
        speed: 0,
      })

      const activeSlide = tvist.slides[3]
      const rootRect = tvist.root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })

  describe('With loop', () => {
    it('должен работать с loop режимом', async () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        loop: true,
        start: 0,
        speed: 0,
      })

      // В режиме loop используем realIndex, так как activeIndex указывает на физический слайд (с учетом клонов)
      expect((tvist as any).realIndex).toBe(0)

      // Можем идти в обе стороны бесконечно
      tvist.prev()
      await new Promise(resolve => setTimeout(resolve, 50))
      expect((tvist as any).realIndex).toBe(6)

      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))
      expect((tvist as any).realIndex).toBe(0)
    })
  })

  describe('State classes integration', () => {
    it('все классы должны корректно обновляться при навигации в center режиме', async () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 3,
        speed: 0,
      })

      const slides = tvist.slides

      // Изначальное состояние
      expect(slides[2].classList.contains('tvist__slide--prev')).toBe(true)
      expect(slides[3].classList.contains('tvist__slide--active')).toBe(true)
      expect(slides[4].classList.contains('tvist__slide--next')).toBe(true)

      // Переходим к следующему
      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Новое состояние
      expect(slides[3].classList.contains('tvist__slide--prev')).toBe(true)
      expect(slides[4].classList.contains('tvist__slide--active')).toBe(true)
      expect(slides[5].classList.contains('tvist__slide--next')).toBe(true)
    })
  })
})
