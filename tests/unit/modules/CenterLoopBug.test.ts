/**
 * Тест для локализации бага с центрированием слайдов при loop
 * 
 * Проблема: при включенном loop + center слайды не центрируются корректно.
 * Из HTML видно что transform неправильный для центрирования активного слайда.
 * 
 * Ожидаемое поведение:
 * - Активный слайд должен быть в центре viewport
 * - getCenterOffset должен возвращать корректное смещение
 * - getScrollPositionForIndex должен учитывать centerOffset при loop
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../../src'
import { createSliderFixture, type SliderFixture } from '../../fixtures'

describe('Center + Loop: centering bug', () => {
  let fixture: SliderFixture
  let root: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ 
      slidesCount: 7, 
      width: 800 
    })
    root = fixture.root
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
  })

  describe('getCenterOffset calculation', () => {
    it('should calculate centerOffset correctly with loop enabled', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      // Получаем размеры
      const rootWidth = root.offsetWidth // 800px
      const slideWidth = slider.engine.getSlideSize(0)
      const gap = 20
      const containerSize = slider.engine.containerSizeValue
      
      // При loop peek не применяется, поэтому:
      // containerSize должен быть равен rootWidth
      // centerOffset = (containerSize - slideWidth) / 2
      const expectedCenterOffset = (containerSize - slideWidth) / 2
      
      const actualCenterOffset = slider.engine.getCenterOffset(0)
      
      // Получаем peek значения через приватные поля (для отладки)
      const peekStart = (slider.engine as any).peekStart
      const peekEnd = (slider.engine as any).peekEnd
      
      console.log('Debug centerOffset with loop:', {
        rootWidth,
        containerSize,
        slideWidth,
        gap,
        peekStart,
        peekEnd,
        expectedCenterOffset,
        actualCenterOffset,
        peekApplied: rootWidth !== containerSize
      })
      
      expect(actualCenterOffset).toBeCloseTo(expectedCenterOffset, 1)
    })

    it('should calculate centerOffset correctly WITHOUT loop', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: false,
        start: 0,
        speed: 0
      })

      const rootWidth = root.offsetWidth
      const slideWidth = slider.engine.getSlideSize(0)
      const containerSize = slider.engine.containerSizeValue
      
      // Без loop peek не применяется (если не задан явно)
      // centerOffset = (containerSize - slideWidth) / 2
      const expectedCenterOffset = (containerSize - slideWidth) / 2
      
      const actualCenterOffset = slider.engine.getCenterOffset(0)
      
      console.log('Debug centerOffset without loop:', {
        rootWidth,
        containerSize,
        slideWidth,
        expectedCenterOffset,
        actualCenterOffset,
        peekApplied: rootWidth !== containerSize
      })
      
      expect(actualCenterOffset).toBeCloseTo(expectedCenterOffset, 1)
    })

    it('should calculate centerOffset for different slide indices', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 3,
        speed: 0
      })

      const slideWidth = slider.engine.getSlideSize(3)
      const rootWidth = root.offsetWidth
      const expectedCenterOffset = (rootWidth - slideWidth) / 2
      
      const actualCenterOffset = slider.engine.getCenterOffset(3)
      
      expect(actualCenterOffset).toBeCloseTo(expectedCenterOffset, 1)
    })
  })

  describe('getScrollPositionForIndex with loop + center', () => {
    it('should include centerOffset in scroll position calculation', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      const index = 0
      const basePosition = -slider.engine.getSlidePosition(index)
      const centerOffset = slider.engine.getCenterOffset(index)
      const expectedPosition = basePosition + centerOffset
      
      const actualPosition = slider.engine.getScrollPositionForIndex(index)
      
      console.log('Debug scrollPosition for index 0:', {
        index,
        basePosition,
        centerOffset,
        expectedPosition,
        actualPosition
      })
      
      expect(actualPosition).toBeCloseTo(expectedPosition, 1)
    })

    it('should calculate correct scroll position for middle slide', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 3,
        speed: 0
      })

      const index = 3
      const basePosition = -slider.engine.getSlidePosition(index)
      const centerOffset = slider.engine.getCenterOffset(index)
      const expectedPosition = basePosition + centerOffset
      
      const actualPosition = slider.engine.getScrollPositionForIndex(index)
      
      console.log('Debug scrollPosition for index 3:', {
        index,
        basePosition,
        centerOffset,
        expectedPosition,
        actualPosition
      })
      
      expect(actualPosition).toBeCloseTo(expectedPosition, 1)
    })
  })

  describe('Visual centering with loop', () => {
    it('should center the active slide visually at start', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      // После инициализации с loop, activeIndex может отличаться от realIndex
      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      console.log('Visual centering at start:', {
        activeIndex,
        realIndex: (slider as any).realIndex,
        slideCenter,
        rootCenter,
        diff: Math.abs(slideCenter - rootCenter),
        slideRect: { left: slideRect.left, width: slideRect.width },
        rootRect: { left: rootRect.left, width: rootRect.width }
      })

      // Центр слайда должен быть примерно в центре root
      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('should center the active slide after navigation', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      // Переходим на другой слайд
      slider.scrollTo(3, true)
      
      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      console.log('Visual centering after navigation:', {
        activeIndex,
        realIndex: (slider as any).realIndex,
        slideCenter,
        rootCenter,
        diff: Math.abs(slideCenter - rootCenter),
        location: slider.engine.location.get(),
        target: slider.engine.target.get()
      })

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('should center slide 6 correctly (from HTML example)', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 6,
        speed: 0
      })

      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      console.log('Visual centering for slide 6:', {
        activeIndex,
        realIndex: (slider as any).realIndex,
        slideCenter,
        rootCenter,
        diff: Math.abs(slideCenter - rootCenter),
        location: slider.engine.location.get(),
        target: slider.engine.target.get(),
        slideWidth: slideRect.width,
        slideLeft: slideRect.left,
        rootWidth: rootRect.width,
        rootLeft: rootRect.left
      })

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })

  describe('Loop initialization with center', () => {
    it('should set correct initial position with center + loop', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 3,
        speed: 0
      })

      const activeIndex = slider.engine.index.get()
      const location = slider.engine.location.get()
      
      // Ожидаемая позиция = basePosition + centerOffset
      const expectedPosition = slider.engine.getScrollPositionForIndex(activeIndex)
      
      console.log('Initial position with center + loop:', {
        activeIndex,
        realIndex: (slider as any).realIndex,
        location,
        expectedPosition,
        diff: Math.abs(location - expectedPosition)
      })
      
      expect(location).toBeCloseTo(expectedPosition, 1)
    })

    it('should maintain centering after loopFix', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      const loopModule = slider['modules'].get('loop') as { 
        fix?: (params: unknown) => void 
      } | undefined

      if (!loopModule?.fix) {
        throw new Error('Loop module not initialized')
      }

      // Вызываем loopFix
      loopModule.fix({ direction: 'next' })

      // Проверяем что слайд все еще центрирован
      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      console.log('Centering after loopFix:', {
        activeIndex,
        realIndex: (slider as any).realIndex,
        slideCenter,
        rootCenter,
        diff: Math.abs(slideCenter - rootCenter)
      })

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })

  describe('Edge cases', () => {
    it('should center first slide with loop', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 0,
        speed: 0
      })

      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('should center last slide with loop', () => {
      slider = new Tvist(root, {
        perPage: 3,
        gap: 20,
        center: true,
        loop: true,
        start: 6,
        speed: 0
      })

      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })

    it('should work with perPage: 1 and center + loop', () => {
      slider = new Tvist(root, {
        perPage: 1,
        gap: 20,
        center: true,
        loop: true,
        start: 3,
        speed: 0
      })

      const activeIndex = slider.engine.index.get()
      const activeSlide = slider.slides[activeIndex]
      
      if (!activeSlide) {
        throw new Error(`Active slide not found at index ${activeIndex}`)
      }

      const rootRect = root.getBoundingClientRect()
      const slideRect = activeSlide.getBoundingClientRect()

      const slideCenter = slideRect.left + slideRect.width / 2
      const rootCenter = rootRect.left + rootRect.width / 2

      expect(Math.abs(slideCenter - rootCenter)).toBeLessThan(5)
    })
  })
})
