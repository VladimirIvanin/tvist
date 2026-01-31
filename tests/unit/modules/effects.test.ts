import { describe, it, expect, vi, beforeEach } from 'vitest'
import Tvist from '../../../src/core/Tvist'
import { EffectModule } from '../../../src/modules/effects/EffectModule'

// Manually register for test isolation or import the index
Tvist.registerModule('effect', EffectModule)

describe('EffectModule', () => {
  let container: HTMLElement
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">Slide 1</div>
          <div class="tvist__slide">Slide 2</div>
          <div class="tvist__slide">Slide 3</div>
        </div>
      </div>
    `
    container = document.querySelector('.tvist') as HTMLElement
    
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

  it('cube: не должен показывать белые области при перелистывании', () => {
    // Setup 4 slides for proper cube
    document.body.innerHTML = `
      <div class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">Slide 1</div>
          <div class="tvist__slide">Slide 2</div>
          <div class="tvist__slide">Slide 3</div>
          <div class="tvist__slide">Slide 4</div>
        </div>
      </div>
    `
    container = document.querySelector('.tvist') as HTMLElement
    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      value: 300
    })
    
    const slider = new Tvist(container, {
      effect: 'cube',
      loop: true
    })
    
    // Test various positions including intermediate angles
    // The bug appeared at positions like progressTotal = 2.65 (between slides)
    const testCases = [
      { translate: 0, description: 'at slide 0' },
      { translate: -300, description: 'at slide 1' },
      { translate: -600, description: 'at slide 2' },
      { translate: -795, description: 'between slides 2-3 (bug position)' }, // progressTotal: 2.65
      { translate: -741, description: 'between slides 2-3 (another angle)' }, // progressTotal: 2.47
      { translate: -150, description: 'between slides 0-1' }, // progressTotal: 0.5
      { translate: -450, description: 'between slides 1-2' }, // progressTotal: 1.5
    ]
    
    testCases.forEach(({ translate, description }) => {
      // Directly update location and trigger effect
      slider.engine.location.set(translate)
      slider.engine.applyTransformPublic()
      
      // Get original slides (not clones)
      const originalSlides = slider.slides.filter(
        slide => slide.dataset.tvistClone !== 'true'
      )
      
      // Count visible original slides
      const visibleSlides = originalSlides.filter(
        slide => slide.style.visibility === 'visible'
      )
      
      // At any position, at least 1 face should be visible (no white gaps)
      expect(visibleSlides.length, `${description}: no slides visible`).toBeGreaterThanOrEqual(1)
      
      // Check that all visible slides are facing camera (not showing backface)
      visibleSlides.forEach(slide => {
        const transform = slide.style.transform
        const rotateMatch = transform.match(/rotateY\(([-\d.]+)deg\)/)
        if (rotateMatch) {
          const slideAngle = parseFloat(rotateMatch[1])
          const containerRotateMatch = slider.container.style.transform.match(/rotateY\(([-\d.]+)deg\)/)
          const containerRotate = containerRotateMatch ? parseFloat(containerRotateMatch[1]) : 0
          
          let netAngle = (slideAngle + containerRotate) % 360
          if (netAngle < 0) netAngle += 360
          
          // Visible slides must be facing camera (< 90° or > 270°)
          // If this fails, we're showing a backface (white area)
          const isFacingCamera = netAngle < 90 || netAngle > 270
          const slideIdx = slide.dataset.tvistSlideIndex
          expect(isFacingCamera, `${description}: Slide ${slideIdx} at ${netAngle.toFixed(1)}° showing backface`).toBe(true)
        }
      })
    })
  })
})
