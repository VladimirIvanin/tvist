import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, simulateDrag, createPointerOrMouseEvent, type SliderFixture } from '../../../fixtures'
import { Tvist } from '@core/Tvist'
import { LoopModule } from '@modules/loop/LoopModule'
import { DragModule } from '@modules/drag/DragModule'

Tvist.registerModule('loop', LoopModule)
Tvist.registerModule('drag', DragModule)

describe('LoopModule + DragModule Integration', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 1000 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
  })

  describe('Базовое поведение drag', () => {
    it('не начинает drag при движении меньше threshold (5px)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true })
      const startPos = slider.engine.location.get()

      await simulateDrag({ element: fixture.container, startX: 100, deltaX: 3, steps: 1 })

      expect(slider.engine.location.get()).toBe(startPos)
    })

    it('начинает drag при превышении threshold', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true })
      const dragStartSpy = vi.fn()
      slider.on('dragStart', dragStartSpy)

      await simulateDrag({ element: fixture.container, startX: 100, deltaX: 20, steps: 5 })

      expect(dragStartSpy).toHaveBeenCalled()
    })
  })

  describe('Корректность transform при drag с loop', () => {
    it('нет резкого скачка transform при старте drag', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const locations: number[] = []

      slider.on('drag', () => { locations.push(slider.engine.location.get()) })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 20, steps: 3, duration: 100 })

      for (let i = 1; i < locations.length; i++) {
        const diff = Math.abs(locations[i] - locations[i - 1])
        expect(diff).toBeLessThan(500)
      }
    })
  })

  describe('Нет "дырки" при drag вправо (к началу)', () => {
    it('location не становится положительным при drag вправо (perPage=2)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 100, steps: 10, duration: 300 })

      expect(slider.engine.location.get()).toBeLessThanOrEqual(0)
    })

    it('location не становится положительным при малом drag вправо (30px)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 30, steps: 3, duration: 100 })

      expect(slider.engine.location.get()).toBeLessThanOrEqual(0)
    })

    it('location не становится положительным при drag влево, затем вправо', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: -50, steps: 5, duration: 200 })
      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 100, steps: 10, duration: 300 })

      expect(slider.engine.location.get()).toBeLessThanOrEqual(0)
    })

    it('location не становится положительным при drag вправо (perPage=1)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 80, steps: 8, duration: 250 })

      expect(slider.engine.location.get()).toBeLessThanOrEqual(0)
    })

    it('translateX не положительный после drag вправо', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 100, steps: 10, duration: 300 })

      const transform = slider.container.style.transform
      const match = transform.match(/translate3d\((-?\d+(?:\.\d+)?)px/)
      if (match) {
        expect(parseFloat(match[1])).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('loopFix при drag', () => {
    it('вызывает loopFix при первом движении', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const loopModule = slider.getModule('loop') as any
      let loopFixCalled = false

      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        loopFixCalled = true
        return originalFix(params)
      }

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 50, steps: 5, duration: 200 })

      expect(loopFixCalled).toBe(true)
    })

    it('при drag вправо первый loopFix вызывается с direction=prev', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []

      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        loopFixCalls.push(params)
        return originalFix(params)
      }

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 50, steps: 5, duration: 200 })

      expect(loopFixCalls.length).toBeGreaterThanOrEqual(1)
      expect(loopFixCalls[0].direction).toBe('prev')
    })

    it('при drag вправо слайды перестраиваются (prepend)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []

      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const orderBefore = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        const result = originalFix(params)
        const orderAfter = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        loopFixCalls.push({ reordered: orderBefore.join(',') !== orderAfter.join(',') })
        return result
      }

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 50, steps: 5, duration: 200 })

      expect(loopFixCalls.some(c => c.reordered)).toBe(true)
    })

    it('location корректируется после loopFix так, что слайды остаются в viewport', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })

      await simulateDrag({ element: fixture.container, startX: 500, deltaX: 50, steps: 5, duration: 200 })

      const location = slider.engine.location.get()
      const slideSize = slider.engine.getSlideSize(0)
      const slideWithGap = slideSize + 20

      expect(location).toBeGreaterThan(-slideWithGap * slider.slides.length)
      expect(location).toBeLessThan(slideWithGap)
    })
  })

  describe('Смена направления drag во время жеста', () => {
    it('корректно перестраивает слайды при смене направления без отпускания', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []

      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const orderBefore = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        const result = originalFix(params)
        const orderAfter = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        loopFixCalls.push({
          params,
          reordered: orderBefore.join(',') !== orderAfter.join(','),
        })
        return result
      }

      const startX = 500

      fixture.container.dispatchEvent(createPointerOrMouseEvent('down', { clientX: startX, clientY: 100, bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 10))

      for (let i = 1; i <= 20; i++) {
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX + i * 10, clientY: 100, bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      for (let i = 1; i <= 30; i++) {
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX + 200 - i * 10, clientY: 100, bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      document.dispatchEvent(createPointerOrMouseEvent('up', { clientX: startX - 100, clientY: 100, bubbles: true }))

      expect(loopFixCalls.length).toBeGreaterThanOrEqual(1)
      expect(loopFixCalls[0].params.direction).toBe('prev')
      expect(loopFixCalls[0].reordered).toBe(true)
      expect(Number.isFinite(slider.engine.location.get())).toBe(true)
    })

    it('нет дырки при смене направления drag', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      const startX = 500

      fixture.container.dispatchEvent(createPointerOrMouseEvent('down', { clientX: startX, clientY: 100, bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 10))

      for (let i = 1; i <= 10; i++) {
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX + i * 10, clientY: 100, bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      for (let i = 1; i <= 20; i++) {
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX + 100 - i * 10, clientY: 100, bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      document.dispatchEvent(createPointerOrMouseEvent('up', { clientX: startX - 100, clientY: 100, bubbles: true }))

      expect(slider.slides.length).toBe(5)
    })
  })

  describe('Snap после drag в loop-режиме не ведёт себя как rewind', () => {
    it('drag вперёд на 1 слайд переходит на следующий, а не на первый', async () => {
      // slideSize=1000, threshold=max(1000*0.2, 80)=200px
      // startX сбрасывается при loopFix, поэтому берём deltaX с запасом > threshold
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1, speed: 0 })

      const initialRealIndex = slider.realIndex

      await simulateDrag({ element: fixture.root, startX: 500, deltaX: -300, steps: 15 })
      await new Promise(resolve => setTimeout(resolve, 50))

      const expectedRealIndex = (initialRealIndex + 1) % 5
      expect(slider.realIndex).toBe(expectedRealIndex)
    })

    it('drag назад на 1 слайд переходит на предыдущий, а не на последний', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1, speed: 0 })

      slider.next()
      await new Promise(resolve => setTimeout(resolve, 20))
      const initialRealIndex = slider.realIndex

      await simulateDrag({ element: fixture.root, startX: 500, deltaX: 300, steps: 15 })
      await new Promise(resolve => setTimeout(resolve, 50))

      const expectedRealIndex = (initialRealIndex - 1 + 5) % 5
      expect(slider.realIndex).toBe(expectedRealIndex)
    })
  })

  /**
   * Регрессия: при slidesCount <= perPage + 1 раньше отключали loopFix на драге —
   * перестановка DOM только после mouseup. При wrap 1→0 Engine давал direction prev без _scrollDirection.
   */
  describe('Регрессия: loop + 2 слайда + perPage 1', () => {
    beforeEach(() => {
      fixture.cleanup()
      fixture = createSliderFixture({ slidesCount: 2, width: 800, height: 400 })
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 1,
        gap: 20,
        speed: 0,
      })
    })

    it('beforeLoopFix/loopFix вызываются во время драга (до pointerup), а не только после отпускания', async () => {
      let pointerUp = false
      let eventsBeforeUp = 0

      const bump = () => { if (!pointerUp) eventsBeforeUp++ }
      slider.on('beforeLoopFix', bump)
      slider.on('loopFix', bump)

      const root = fixture.root
      const y = 200
      const startX = 400
      root.dispatchEvent(createPointerOrMouseEvent('down', { clientX: startX, clientY: y }))

      for (let i = 1; i <= 12; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX - i * 50, clientY: y }))
      }

      expect(eventsBeforeUp).toBeGreaterThan(0)

      pointerUp = true
      document.dispatchEvent(createPointerOrMouseEvent('up', { clientX: startX - 600, clientY: y }))
      await new Promise((resolve) => setTimeout(resolve, 40))

      expect(slider.realIndex).toBe(1)
    })

    it('wrap со 2-го на 1-й слайд: beforeTransitionStart.direction === next (жест «вперёд», не ложный prev)', async () => {
      slider.next()
      expect(slider.realIndex).toBe(1)

      const directions: ('next' | 'prev')[] = []
      slider.on('beforeTransitionStart', (d: { direction: 'next' | 'prev' }) => {
        directions.push(d.direction)
      })

      const root = fixture.root
      const y = 200
      const startX = 400
      root.dispatchEvent(createPointerOrMouseEvent('down', { clientX: startX, clientY: y }))

      for (let i = 1; i <= 12; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        document.dispatchEvent(createPointerOrMouseEvent('move', { clientX: startX - i * 55, clientY: y }))
      }

      document.dispatchEvent(createPointerOrMouseEvent('up', { clientX: startX - 660, clientY: y }))
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(slider.realIndex).toBe(0)
      expect(directions.length).toBeGreaterThanOrEqual(1)
      expect(directions[0]).toBe('next')
    })
  })
})
