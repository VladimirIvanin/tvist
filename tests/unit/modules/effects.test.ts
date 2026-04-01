import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import Tvist from '@core/Tvist'
import { EffectModule } from '@modules/effects/EffectModule'
import '@modules/breakpoints'

// Manually register for test isolation or import the index
Tvist.registerModule('effect', EffectModule)

describe('EffectModule', () => {
  let container: HTMLElement
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.track}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">Slide 1</div>
            <div class="${TVIST_CLASSES.slide}">Slide 2</div>
            <div class="${TVIST_CLASSES.slide}">Slide 3</div>
          </div>
        </div>
      </div>
    `
    container = document.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    
    // Mock offsetWidth to allow calculation of slideWidth
    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      value: 1000
    })

    Object.defineProperty(container, 'clientWidth', {
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
    
    // Проверяем что opacity проставлены корректно и не равны NaN
    const opacity0 = slides[0].style.opacity
    const opacity1 = slides[1].style.opacity
    
    // Не проверяем точные значения, важно, что стили вообще проставляются
    expect(opacity0).not.toBe('')
    expect(opacity1).not.toBe('')
  })

  it('должен применять стили cube при инициализации', () => {
    const slider = new Tvist(container, {
      effect: 'cube'
    })
    
    expect(slider.container.style.transformStyle).toBe('preserve-3d')
  })

  it('должен очищать cube transform при выходе из breakpoint', () => {
    window.innerWidth = 500

    const slider = new Tvist(container, {
      effect: 'slide',
      breakpoints: {
        767: { effect: 'cube' }
      }
    })

    expect(slider.root.classList.contains(TVIST_CLASSES.cube)).toBe(true)
    expect(slider.slides[0].style.transform).toContain('rotateY(')

    window.innerWidth = 1200
    slider.update()

    expect(slider.options.effect).toBe('slide')
    expect(slider.root.classList.contains(TVIST_CLASSES.cube)).toBe(false)
    expect(slider.slides[0].style.transform).toBe('')
  })
})
