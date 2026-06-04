/**
 * Тесты интеграции ThumbsModule + DragModule
 * Проверяем, что короткие свайпы в thumbSlider не влияют на основной слайдер
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { waitForAnimation, simulateDrag, createSliderFixture, type SliderFixture } from '../fixtures'

describe('ThumbsModule + DragModule Integration', () => {
  let mainFixture: SliderFixture
  let thumbFixture: SliderFixture
  let mainSlider: Tvist
  let thumbSlider: Tvist

  beforeEach(() => {
    // Фикстуры с размерами нужны для расчёта позиций Engine (slideSize, snap)
    mainFixture = createSliderFixture({
      slidesCount: 5,
      width: 600,
      height: 400,
      id: 'main-slider'
    })
    thumbFixture = createSliderFixture({
      slidesCount: 5,
      width: 600,
      height: 100,
      id: 'thumb-slider'
    })

    mainSlider = new Tvist(mainFixture.root, {
      perPage: 1,
      drag: true
    })

    thumbSlider = new Tvist(thumbFixture.root, {
      perPage: 3,
      isNavigation: true,
      drag: true
    })

    // Синхронизация: thumbSlider управляет основным
    thumbSlider.on('slideChangeEnd', (index: number) => {
      mainSlider.scrollTo(index)
    })
  })

  afterEach(() => {
    mainSlider?.destroy()
    thumbSlider?.destroy()
    mainFixture?.cleanup()
    thumbFixture?.cleanup()
  })
  
  it('короткий свайп в thumbSlider (< threshold) НЕ должен менять основной слайд', async () => {
    // Переходим к последнему слайду в обоих слайдерах
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    expect(mainSlider.activeIndex).toBe(4)
    expect(thumbSlider.activeIndex).toBe(4)
    
    // Эмулируем короткий свайп в thumbSlider (меньше threshold)
    // DragModule вешает обработчики на root
    const thumbRoot = thumbSlider.root

    // Начало drag
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 0 } as Touch],
      bubbles: true
    })
    thumbRoot.dispatchEvent(touchStart)
    
    // Короткое движение (только 30px, что меньше threshold = 80px)
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientX: 130, clientY: 0 } as Touch],
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(touchMove)
    
    // Отпускание
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true
    })
    document.dispatchEvent(touchEnd)
    
    // Ждём завершения анимации snap
    await waitForAnimation(400)
    
    // thumbSlider должен остаться на слайде 4 (не поменялся)
    expect(thumbSlider.activeIndex).toBe(4)
    
    // Основной слайдер тоже должен остаться на слайде 4
    // (раньше он ошибочно менялся из-за генерации slideChangeEnd события)
    expect(mainSlider.activeIndex).toBe(4)
  })
  
  it('длинный свайп в thumbSlider (> threshold) должен менять оба слайда', async () => {
    // Переходим к последнему слайду
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    expect(mainSlider.activeIndex).toBe(4)
    expect(thumbSlider.activeIndex).toBe(4)
    
    // Эмулируем длинный свайп в thumbSlider (150px вправо, больше threshold = 80px)
    // Несколько шагов touchmove нужны для корректной обработки драга
    await simulateDrag({
      element: thumbSlider.root,
      startX: 100,
      startY: 50,
      deltaX: 150,
      steps: 5,
      type: 'touch'
    })
    
    // Snap после drag (~speed) + синхронизация main через scrollTo
    await waitForAnimation(500)
    
    // Оба слайдера должны перейти к предыдущему слайду
    expect(thumbSlider.activeIndex).toBe(3)
    expect(mainSlider.activeIndex).toBe(3)
  })
  
  it('короткий свайп на границе (loop=false) не должен генерировать события', async () => {
    // Переходим к последнему слайду
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    const slideChangedSpy = vi.fn()
    thumbSlider.on('slideChangeEnd', slideChangedSpy)
    
    // Эмулируем короткий свайп влево (пытаемся пойти дальше последнего)
    const thumbRoot = thumbSlider.root

    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 0 } as Touch],
      bubbles: true
    })
    thumbRoot.dispatchEvent(touchStart)
    
    // Короткий свайп влево
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientX: 70, clientY: 0 } as Touch],
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(touchMove)
    
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true
    })
    document.dispatchEvent(touchEnd)
    
    await waitForAnimation(400)
    
    // slideChangeEnd НЕ должен был вызваться (индекс не изменился)
    expect(slideChangedSpy).not.toHaveBeenCalled()
    
    // Оба слайдера остались на месте
    expect(thumbSlider.activeIndex).toBe(4)
    expect(mainSlider.activeIndex).toBe(4)
  })

  describe('syncOnDrag: false', () => {
    let mainFixtureSync: SliderFixture
    let thumbFixtureSync: SliderFixture
    let mainSliderSync: Tvist
    let thumbSliderSync: Tvist

    beforeEach(() => {
      mainFixtureSync = createSliderFixture({
        slidesCount: 5,
        width: 600,
        height: 400,
        id: 'main-slider-sync'
      })
      thumbFixtureSync = createSliderFixture({
        slidesCount: 5,
        width: 600,
        height: 100,
        id: 'thumb-slider-sync'
      })

      mainSliderSync = new Tvist(mainFixtureSync.root, {
        perPage: 1,
        drag: true
      })

      thumbSliderSync = new Tvist(thumbFixtureSync.root, {
        perPage: 3,
        isNavigation: true,
        drag: true,
        syncOnDrag: false
      })

      mainSliderSync.sync(thumbSliderSync)
    })

    afterEach(() => {
      mainSliderSync?.destroy()
      thumbSliderSync?.destroy()
      mainFixtureSync?.cleanup()
      thumbFixtureSync?.cleanup()
    })

    it('длинный свайп в thumbSlider НЕ должен менять основной слайд, если syncOnDrag: false', async () => {
      // Переходим к последнему слайду
      mainSliderSync.scrollTo(4, true)
      thumbSliderSync.scrollTo(4, true)
      
      expect(mainSliderSync.activeIndex).toBe(4)
      expect(thumbSliderSync.activeIndex).toBe(4)
      
      // Эмулируем длинный свайп в thumbSlider (150px вправо)
      await simulateDrag({
        element: thumbSliderSync.root,
        startX: 100,
        startY: 50,
        deltaX: 150,
        steps: 5,
        type: 'touch'
      })
      
      await waitForAnimation(1100)
      
      // thumbSlider должен перейти к предыдущему слайду
      expect(thumbSliderSync.activeIndex).toBe(3)
      // Основной слайдер должен остаться на месте
      expect(mainSliderSync.activeIndex).toBe(4)
    })

    it('клики по thumbSlider ДОЛЖНЫ менять основной слайд, даже если syncOnDrag: false', async () => {
      expect(mainSliderSync.activeIndex).toBe(0)
      expect(thumbSliderSync.activeIndex).toBe(0)
      
      const slideToClick = thumbSliderSync.slides[2]
      if (!slideToClick) throw new Error('Slide not found')
      
      slideToClick.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      
      await waitForAnimation(400)
      
      expect(thumbSliderSync.activeIndex).toBe(2)
      expect(mainSliderSync.activeIndex).toBe(2)
    })
  })
})
