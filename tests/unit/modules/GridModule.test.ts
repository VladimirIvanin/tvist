import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { GridModule } from '../../../src/modules/grid/GridModule'

describe('GridModule', () => {
  let container: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('grid', GridModule)
    
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.className = 'tvist'
    container.innerHTML = `
      <div class="tvist__container"></div>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    slider?.destroy()
    document.body.innerHTML = ''
    Tvist.unregisterModule('grid')
  })

  const createSlides = (count: number) => {
    const sliderContainer = container.querySelector('.tvist__container')!
    for (let i = 0; i < count; i++) {
      const slide = document.createElement('div')
      slide.className = 'tvist__slide'
      slide.textContent = `Slide ${i + 1}`
      sliderContainer.appendChild(slide)
    }
  }

  describe('Fixed Grid (rows + cols)', () => {
    it('должен создавать страницы с фиксированной сеткой 2×2', () => {
      createSlides(8)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // Должно быть 2 страницы (8 слайдов / 4 слайда на страницу)
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(2)

      // Каждая страница должна иметь 2 ряда
      pages.forEach(page => {
        const rows = page.querySelectorAll('.tvist__grid-row')
        expect(rows).toHaveLength(2)
        
        // Каждый ряд должен иметь 2 колонки
        rows.forEach(row => {
          const cols = row.querySelectorAll('.tvist__grid-col')
          expect(cols).toHaveLength(2)
        })
      })
    })

    it('должен создавать неполную последнюю страницу', () => {
      createSlides(10)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // Должно быть 3 страницы (10 слайдов: 4+4+2)
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(3)

      // На последней странице только 2 слайда
      const lastPage = pages[2]
      const items = lastPage?.querySelectorAll('.tvist__grid-item')
      expect(items).toHaveLength(2)
    })

    it('должен применять gap между рядами и колонками', () => {
      createSlides(4)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2,
          gap: {
            row: 10,
            col: 20
          }
        }
      })

      const page = container.querySelector('.tvist__slide--grid-page')
      const rows = page?.querySelectorAll('.tvist__grid-row')
      
      // Первый ряд должен иметь margin-bottom
      const firstRow = rows?.[0] as HTMLElement
      expect(firstRow?.style.marginBottom).toBe('10px')
      
      // Последний ряд не должен иметь margin-bottom (пустая строка или 0)
      const lastRow = rows?.[1] as HTMLElement
      const marginBottom = lastRow?.style.marginBottom
      expect(marginBottom === '' || marginBottom === '0px').toBe(true)

      // Колонки в первом ряду
      const cols = firstRow?.querySelectorAll('.tvist__grid-col')
      const firstCol = cols?.[0] as HTMLElement
      expect(firstCol?.style.marginRight).toBe('20px')
      
      const lastCol = cols?.[1] as HTMLElement
      expect(lastCol?.style.marginRight).toBe('')
    })

    it('должен работать с вертикальной ориентацией', () => {
      createSlides(6)
      
      slider = new Tvist(container, {
        direction: 'vertical',
        grid: {
          rows: 3,
          cols: 1
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(2) // 6 слайдов / 3 = 2 страницы
      
      pages.forEach(page => {
        const rows = page.querySelectorAll('.tvist__grid-row')
        expect(rows).toHaveLength(3)
      })
    })
  })

  describe('Dimensions Grid', () => {
    it('должен создавать страницы с разными размерами', () => {
      createSlides(10)
      
      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2], // 4 слайда
            [1, 2], // 2 слайда
            [2, 2], // 4 слайда
          ]
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(3)

      // Страница 1: 2×2
      const page1Rows = pages[0]?.querySelectorAll('.tvist__grid-row')
      expect(page1Rows).toHaveLength(2)
      const page1Row1Cols = page1Rows?.[0]?.querySelectorAll('.tvist__grid-col')
      expect(page1Row1Cols).toHaveLength(2)

      // Страница 2: 1×2
      const page2Rows = pages[1]?.querySelectorAll('.tvist__grid-row')
      expect(page2Rows).toHaveLength(1)
      const page2Row1Cols = page2Rows?.[0]?.querySelectorAll('.tvist__grid-col')
      expect(page2Row1Cols).toHaveLength(2)

      // Страница 3: 2×2
      const page3Rows = pages[2]?.querySelectorAll('.tvist__grid-row')
      expect(page3Rows).toHaveLength(2)
    })

    it('должен циклически применять dimensions к страницам', () => {
      createSlides(12)
      
      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2], // 4 слайда
            [1, 2], // 2 слайда
          ]
        }
      })

      // 12 слайдов: 4 (стр1) + 2 (стр2) + 4 (стр3) + 2 (стр4) = 12
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(4)

      // Проверяем цикличность
      expect(pages[0]?.querySelectorAll('.tvist__grid-row')).toHaveLength(2) // 2×2
      expect(pages[1]?.querySelectorAll('.tvist__grid-row')).toHaveLength(1) // 1×2
      expect(pages[2]?.querySelectorAll('.tvist__grid-row')).toHaveLength(2) // 2×2 (цикл)
      expect(pages[3]?.querySelectorAll('.tvist__grid-row')).toHaveLength(1) // 1×2 (цикл)
    })

    it('должен корректно распределять слайды по dimensions страницам', () => {
      createSlides(7)
      
      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2], // 4 слайда
            [1, 2], // 2 слайда  
            [1, 1], // 1 слайд
          ]
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      
      // Страница 1: 4 слайда
      const page1Items = pages[0]?.querySelectorAll('.tvist__grid-item')
      expect(page1Items).toHaveLength(4)
      expect(page1Items?.[0]?.textContent).toBe('Slide 1')
      expect(page1Items?.[3]?.textContent).toBe('Slide 4')

      // Страница 2: 2 слайда
      const page2Items = pages[1]?.querySelectorAll('.tvist__grid-item')
      expect(page2Items).toHaveLength(2)
      expect(page2Items?.[0]?.textContent).toBe('Slide 5')
      expect(page2Items?.[1]?.textContent).toBe('Slide 6')

      // Страница 3: 1 слайд (последний)
      const page3Items = pages[2]?.querySelectorAll('.tvist__grid-item')
      expect(page3Items).toHaveLength(1)
      expect(page3Items?.[0]?.textContent).toBe('Slide 7')
    })

    it('должен применять gap к dimensions страницам', () => {
      createSlides(6)
      
      slider = new Tvist(container, {
        grid: {
          gap: 15,
          dimensions: [
            [2, 2],
            [1, 2],
          ]
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      
      // Проверяем gap на первой странице (2×2)
      const page1Rows = pages[0]?.querySelectorAll('.tvist__grid-row')
      const page1FirstRow = page1Rows?.[0] as HTMLElement
      expect(page1FirstRow?.style.marginBottom).toBe('15px')

      // Проверяем gap на второй странице (1×2)
      const page2Rows = pages[1]?.querySelectorAll('.tvist__grid-row')
      const page2Row = page2Rows?.[0] as HTMLElement
      const page2Cols = page2Row?.querySelectorAll('.tvist__grid-col')
      const page2FirstCol = page2Cols?.[0] as HTMLElement
      expect(page2FirstCol?.style.marginRight).toBe('15px')
    })
  })

  describe('Сохранение и восстановление слайдов', () => {
    it('должен сохранять оригинальные слайды', () => {
      createSlides(4)
      const originalSlides = Array.from(container.querySelectorAll('.tvist__slide'))
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // Оригинальные слайды должны быть обернуты, но не удалены
      const gridItems = container.querySelectorAll('.tvist__grid-item')
      expect(gridItems).toHaveLength(4)
      
      // Проверяем, что это те же элементы
      gridItems.forEach((item, index) => {
        expect(item.textContent).toBe(originalSlides[index]?.textContent)
      })
    })

    it('должен восстанавливать оригинальные слайды при destroy', () => {
      createSlides(4)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // Grid создан
      expect(container.querySelectorAll('.tvist__slide--grid-page')).toHaveLength(1)

      // Уничтожаем
      slider.destroy()

      // Grid структура удалена
      expect(container.querySelectorAll('.tvist__slide--grid-page')).toHaveLength(0)
      expect(container.querySelectorAll('.tvist__grid-row')).toHaveLength(0)
      
      // Оригинальные слайды восстановлены
      const slides = container.querySelectorAll('.tvist__slide')
      expect(slides).toHaveLength(4)
      expect(slides[0]?.classList.contains('tvist__grid-item')).toBe(false)
    })

    it('должен корректно пересоздавать grid при update', () => {
      createSlides(8)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      expect(container.querySelectorAll('.tvist__slide--grid-page')).toHaveLength(2)

      // Уничтожаем и создаем новый с другими опциями
      slider.destroy()
      
      slider = new Tvist(container, {
        grid: {
          rows: 1,
          cols: 4
        }
      })

      // Должно быть 2 страницы по 4 колонки
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(2)
      
      pages.forEach(page => {
        const rows = page.querySelectorAll('.tvist__grid-row')
        expect(rows).toHaveLength(1) // Только 1 ряд
        
        const cols = rows[0]?.querySelectorAll('.tvist__grid-col')
        expect(cols).toHaveLength(4) // 4 колонки
      })
    })

    it('должен переключаться между fixed и dimensions режимами', () => {
      createSlides(6)
      
      // Начинаем с fixed grid
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      expect(container.querySelectorAll('.tvist__slide--grid-page')).toHaveLength(2) // 6/4 = 2 страницы (неполная)

      // Уничтожаем и переключаемся на dimensions
      slider.destroy()
      
      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [3, 2], // 6 слайдов на одной странице
          ]
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(1) // Все 6 слайдов на одной странице
      
      const rows = pages[0]?.querySelectorAll('.tvist__grid-row')
      expect(rows).toHaveLength(3) // 3 ряда
    })
  })

  describe('Edge cases', () => {
    it('должен корректно работать с 1 слайдом', () => {
      createSlides(1)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(1)
      
      const items = pages[0]?.querySelectorAll('.tvist__grid-item')
      expect(items).toHaveLength(1)
    })

    it('должен работать с пустым dimensions массивом', () => {
      createSlides(4)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2,
          dimensions: []
        }
      })

      // Должен использовать fixed grid (fallback)
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(1)
    })

    it('должен работать с dimensions имеющим 1 элемент', () => {
      createSlides(8)
      
      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2], // 4 слайда на страницу
          ]
        }
      })

      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(2) // 8/4 = 2 страницы
      
      // Обе страницы должны иметь одинаковую структуру
      pages.forEach(page => {
        const rows = page.querySelectorAll('.tvist__grid-row')
        expect(rows).toHaveLength(2)
      })
    })

    it('должен корректно работать с gap = 0', () => {
      createSlides(4)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2,
          gap: 0
        }
      })

      const page = container.querySelector('.tvist__slide--grid-page')
      const rows = page?.querySelectorAll('.tvist__grid-row')
      const firstRow = rows?.[0] as HTMLElement
      
      expect(firstRow?.style.marginBottom).toBe('0px')
    })

    it('должен работать с большими числами rows/cols', () => {
      createSlides(20)
      
      slider = new Tvist(container, {
        grid: {
          rows: 5,
          cols: 4
        }
      })

      // 20 слайдов / 20 на страницу = 1 страница
      const pages = container.querySelectorAll('.tvist__slide--grid-page')
      expect(pages).toHaveLength(1)
      
      const rows = pages[0]?.querySelectorAll('.tvist__grid-row')
      expect(rows).toHaveLength(5)
      
      rows?.forEach(row => {
        const cols = row.querySelectorAll('.tvist__grid-col')
        expect(cols).toHaveLength(4)
      })
    })
  })

  describe('Engine integration', () => {
    it('должен обновлять позиции слайдов в Engine', () => {
      createSlides(8)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // После создания grid, slides должны быть wrapper-страницами
      expect(slider.slides).toHaveLength(2) // 2 страницы
      expect(slider.slides[0]?.classList.contains('tvist__slide--grid-page')).toBe(true)
    })

    it('должен правильно считать количество страниц для навигации', () => {
      createSlides(10)
      
      slider = new Tvist(container, {
        grid: {
          rows: 2,
          cols: 2
        }
      })

      // 10 слайдов / 4 = 3 страницы
      expect(slider.slides.length).toBe(3)
    })
  })
})
