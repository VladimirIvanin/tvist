import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'

describe('Padding calculation without mocked offsetWidth', () => {
  let root: HTMLElement
  let tvist: Tvist | null = null

  beforeEach(() => {
    root = document.createElement('div')
    root.className = 'tvist'
    root.innerHTML = `
      <div class="tvist__container">
        <div class="tvist__slide">Slide 1</div>
        <div class="tvist__slide">Slide 2</div>
        <div class="tvist__slide">Slide 3</div>
      </div>
    `
    document.body.appendChild(root)
  })

  afterEach(() => {
    if (tvist) {
      tvist.destroy()
      tvist = null
    }
    if (root.parentElement) {
      root.parentElement.removeChild(root)
    }
  })

  it('should NOT produce exponential width values without padding', () => {
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 10
      // padding не задан
    })

    const slides = Array.from(root.querySelectorAll('.tvist__slide')) as HTMLElement[]
    
    slides.forEach(slide => {
      const width = slide.style.width
      console.log('Slide width:', width)
      
      // Проверяем что ширина не содержит экспоненциальную нотацию
      expect(width).not.toMatch(/e\+/)
      
      if (width) {
        const numericWidth = parseFloat(width)
        // Проверяем что значение разумное
        expect(numericWidth).toBeGreaterThanOrEqual(0)
        expect(numericWidth).toBeLessThan(100000) // Не должно быть огромным числом
      }
    })
  })

  it('should NOT produce exponential width values with padding: 0', () => {
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 10,
      padding: 0
    })

    const slides = Array.from(root.querySelectorAll('.tvist__slide')) as HTMLElement[]
    
    slides.forEach(slide => {
      const width = slide.style.width
      console.log('Slide width with padding:0:', width)
      
      expect(width).not.toMatch(/e\+/)
      
      if (width) {
        const numericWidth = parseFloat(width)
        expect(numericWidth).toBeGreaterThanOrEqual(0)
        expect(numericWidth).toBeLessThan(100000)
      }
    })
  })

  it('should handle empty object padding', () => {
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 10,
      padding: {}
    })

    const slides = Array.from(root.querySelectorAll('.tvist__slide')) as HTMLElement[]
    
    slides.forEach(slide => {
      const width = slide.style.width
      console.log('Slide width with padding:{}:', width)
      
      expect(width).not.toMatch(/e\+/)
      
      if (width) {
        const numericWidth = parseFloat(width)
        expect(numericWidth).toBeGreaterThanOrEqual(0)
        expect(numericWidth).toBeLessThan(100000)
      }
    })
  })

  it('should handle partial object padding', () => {
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 10,
      padding: { left: 50 } // только left, right должен быть 0
    })

    const slides = Array.from(root.querySelectorAll('.tvist__slide')) as HTMLElement[]
    
    slides.forEach(slide => {
      const width = slide.style.width
      console.log('Slide width with padding:{left:50}:', width)
      
      expect(width).not.toMatch(/e\+/)
      
      if (width) {
        const numericWidth = parseFloat(width)
        expect(numericWidth).toBeGreaterThanOrEqual(0)
        expect(numericWidth).toBeLessThan(100000)
      }
    })
  })
})
