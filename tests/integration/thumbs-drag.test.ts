/**
 * Тесты интеграции ThumbsModule + DragModule
 * Проверяем, что короткие свайпы в thumbSlider не влияют на основной слайдер
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { waitForAnimation } from '../fixtures'

describe('ThumbsModule + DragModule Integration', () => {
  let container: HTMLElement
  let mainSlider: Tvist
  let thumbSlider: Tvist
  
  beforeEach(() => {
    vi.useFakeTimers()
    // Создаём основной слайдер
    container = document.createElement('div')
    container.innerHTML = `
      <div id="main-slider">
        <div class="tvist-v0__container">
          <div class="tvist-v0__track">
            <div class="tvist-v0__slide">Slide 1</div>
            <div class="tvist-v0__slide">Slide 2</div>
            <div class="tvist-v0__slide">Slide 3</div>
            <div class="tvist-v0__slide">Slide 4</div>
            <div class="tvist-v0__slide">Slide 5</div>
          </div>
        </div>
      </div>
      
      <div id="thumb-slider">
        <div class="tvist-v0__container">
          <div class="tvist-v0__track">
            <div class="tvist-v0__slide">Thumb 1</div>
            <div class="tvist-v0__slide">Thumb 2</div>
            <div class="tvist-v0__slide">Thumb 3</div>
            <div class="tvist-v0__slide">Thumb 4</div>
            <div class="tvist-v0__slide">Thumb 5</div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(container)
    
    const mainEl = document.getElementById('main-slider')!
    const thumbEl = document.getElementById('thumb-slider')!
    
    // Инициализируем слайдеры
    mainSlider = new Tvist(mainEl, {
      perPage: 1,
      drag: true
    })
    
    thumbSlider = new Tvist(thumbEl, {
      perPage: 3,
      isNavigation: true,
      drag: true
    })
    
    // Синхронизация: thumbSlider управляет основным
    thumbSlider.on('slideChanged', (index: number) => {
      mainSlider.scrollTo(index)
    })
  })
  
  afterEach(() => {
    mainSlider?.destroy()
    thumbSlider?.destroy()
    container?.remove()
    vi.useRealTimers()
  })
  
  it('короткий свайп в thumbSlider (< threshold) НЕ должен менять основной слайд', async () => {
    // Переходим к последнему слайду в обоих слайдерах
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    expect(mainSlider.activeIndex).toBe(4)
    expect(thumbSlider.activeIndex).toBe(4)
    
    // Эмулируем короткий свайп в thumbSlider (меньше threshold)
    const thumbTrack = thumbSlider.track
    
    // Начало drag
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 0 } as Touch],
      bubbles: true
    })
    thumbTrack.dispatchEvent(touchStart)
    
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
    // (раньше он ошибочно менялся из-за генерации slideChanged события)
    expect(mainSlider.activeIndex).toBe(4)
  })
  
  it('длинный свайп в thumbSlider (> threshold) должен менять оба слайда', async () => {
    // Переходим к последнему слайду
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    expect(mainSlider.activeIndex).toBe(4)
    expect(thumbSlider.activeIndex).toBe(4)
    
    // Эмулируем длинный свайп в thumbSlider (больше threshold)
    const thumbTrack = thumbSlider.track
    
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 0 } as Touch],
      bubbles: true
    })
    thumbTrack.dispatchEvent(touchStart)
    
    // Длинное движение (150px, что больше threshold = 80px)
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientX: 250, clientY: 0 } as Touch],
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(touchMove)
    
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true
    })
    document.dispatchEvent(touchEnd)
    
    // Ждём завершения анимации
    await waitForAnimation(400)
    
    // Оба слайдера должны перейти к предыдущему слайду
    expect(thumbSlider.activeIndex).toBe(3)
    expect(mainSlider.activeIndex).toBe(3)
  })
  
  it('короткий свайп на границе (loop=false) не должен генерировать события', async () => {
    // Переходим к последнему слайду
    mainSlider.scrollTo(4, true)
    thumbSlider.scrollTo(4, true)
    
    const slideChangedSpy = vi.fn()
    thumbSlider.on('slideChanged', slideChangedSpy)
    
    // Эмулируем короткий свайп влево (пытаемся пойти дальше последнего)
    const thumbTrack = thumbSlider.track
    
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 0 } as Touch],
      bubbles: true
    })
    thumbTrack.dispatchEvent(touchStart)
    
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
    
    // slideChanged НЕ должен был вызваться (индекс не изменился)
    expect(slideChangedSpy).not.toHaveBeenCalled()
    
    // Оба слайдера остались на месте
    expect(thumbSlider.activeIndex).toBe(4)
    expect(mainSlider.activeIndex).toBe(4)
  })
})
