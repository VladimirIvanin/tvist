import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'

describe('Engine Navigation Mode', () => {
  let container: HTMLElement
  let tvist: Tvist

  beforeEach(() => {
    // Создаем DOM структуру
    container = document.createElement('div')
    container.className = 'tvist'
    container.innerHTML = `
      <div class="tvist__container">
        ${Array.from({ length: 8 }).map((_, i) => `<div class="tvist__slide">${i}</div>`).join('')}
      </div>
    `
    document.body.appendChild(container)

    // Мокаем размеры
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 800 },
      offsetWidth: { get: () => 800 }
    })
    // @ts-ignore
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 } as DOMRect)
  })

  afterEach(() => {
    tvist?.destroy()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('should restrict index to endIndex by default', () => {
    tvist = new Tvist(container, {
      perPage: 4,
      speed: 0 // instant
    })

    // endIndex = 8 - 4 = 4
    tvist.scrollTo(7)
    
    expect(tvist.activeIndex).toBe(4)
  })

  it('should allow index beyond endIndex when isNavigation is true', () => {
    tvist = new Tvist(container, {
      perPage: 4,
      isNavigation: true,
      speed: 0
    })

    // Пытаемся скроллить к последнему слайду
    tvist.scrollTo(7)
    
    // Ожидаем, что индекс будет 7
    expect(tvist.activeIndex).toBe(7)
    
    // Но позиция должна быть как у слайда 4 (начало последней группы)
    // slideWidth = 800 / 4 = 200
    // pos(4) = 4 * 200 = 800. Target = -800
    // pos(7) = 7 * 200 = 1400. Target = -1400
    
    // Проверяем internal location через engine (нужно привести тип)
    const location = (tvist.engine as any).location.get()
    
    // Ожидаем, что слайдер остановился на позиции endIndex (4)
    expect(location).toBe(-800) 
  })

  it('should calculate bounds correctly with gap in navigation mode', () => {
    // 6 slides, 150px width, 10px gap
    // Container width = 4 * 150 + 3 * 10 = 630
    
    // Override mocks for this test
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 630 },
      offsetWidth: { get: () => 630 }
    })
    // @ts-ignore
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 630 } as DOMRect)

    container.innerHTML = `
      <div class="tvist__container">
        ${Array.from({ length: 6 }).map((_, i) => `<div class="tvist__slide">${i}</div>`).join('')}
      </div>
    `
    
    tvist = new Tvist(container, {
      perPage: 4,
      gap: 10,
      isNavigation: true,
      speed: 0
    })

    // (630 - 3 * 10) / 4 = 150
    expect(tvist.engine.slideSizeValue).toBe(150)

    // Scroll to last slide
    tvist.scrollTo(5)
    
    expect(tvist.activeIndex).toBe(5)
    
    // Content width = 6 * 150 + 5 * 10 = 900 + 50 = 950?
    // Wait. calculateSizes uses:
    // pos[i] = i * (slideSize + gap)
    // pos[5] = 5 * (150 + 10) = 800.
    // End of slide 5 = 800 + 150 = 950.
    
    // Max scroll = RootSize - ContentSize = 630 - 950 = -320.
    
    const location = (tvist.engine as any).location.get()
    expect(location).toBe(-320)
  })
})
