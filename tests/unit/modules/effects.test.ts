import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import Tvist from '@core/Tvist'
import { EffectModule } from '@modules/effects/EffectModule'

// Manually register for test isolation or import the index
Tvist.registerModule('effect', EffectModule)

describe('EffectModule', () => {
  let container: HTMLElement
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        </div>
      </div>
    `
    container = document.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    
    // Mock offsetWidth to allow calculation of slideWidth
    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      value: 1000
    })
  })

  it('должен инициализироваться корректно', () => {
    const slider = new Tvist(container, {
      effect: 'fade'
    })
    
    const module = slider.getModule('effect')
    expect(module).toBeInstanceOf(EffectModule)
  })

  it('должен принудительно устанавливать perPage: 1 для эффектов', () => {
    const slider = new Tvist(container, {
      effect: 'fade',
      perPage: 3
    })
    
    expect(slider.options.perPage).toBe(1)
  })

  it('должен применять стили fade при прокрутке', () => {
    const slider = new Tvist(container, {
      effect: 'fade'
    })
    
    // Эмулируем прокрутку
    slider.scrollTo(1, true)
    
    const slides = slider.slides
    // Slide 0 (предыдущий) должен быть прозрачным (opacity 0)
    // Slide 1 (активный) должен быть видимым (opacity 1)
    
    // При переходе progress рассчитывается:
    // Slide 0: progress = -1 (или около того) -> opacity 0
    // Slide 1: progress = 0 -> opacity 1
    
    expect(slides[0].style.opacity).toBe('0')
    expect(slides[1].style.opacity).toBe('1')
  })

  it('должен применять стили cube при инициализации', () => {
    const slider = new Tvist(container, {
      effect: 'cube'
    })
    
    expect(slider.container.style.transformStyle).toBe('preserve-3d')
  })
})
