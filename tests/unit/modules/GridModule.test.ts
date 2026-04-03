import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import { GridModule } from '@modules/grid/GridModule'

describe('GridModule', () => {
  let container: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    Tvist.registerModule('grid', GridModule)

    document.body.innerHTML = ''
    const root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.innerHTML = `
      <div class="${TVIST_CLASSES.track}">
        <div class="${TVIST_CLASSES.container}"></div>
      </div>
    `
    document.body.appendChild(root)
    container = root
  })

  afterEach(() => {
    slider?.destroy()
    document.body.innerHTML = ''
    Tvist.unregisterModule('grid')
  })

  const createSlides = (count: number) => {
    const sliderContainer = container.querySelector(`.${TVIST_CLASSES.container}`)!
    for (let i = 0; i < count; i++) {
      const slide = document.createElement('div')
      slide.className = TVIST_CLASSES.slide
      slide.textContent = `Slide ${i + 1}`
      sliderContainer.appendChild(slide)
    }
  }

  describe('Fixed Grid (rows + cols)', () => {
    it('должен создавать страницы с фиксированной сеткой 2×2', () => {
      createSlides(8)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(2)

      pages.forEach(page => {
        const rows = page.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
        expect(rows).toHaveLength(2)

        rows.forEach(row => {
          const cols = row.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)
          expect(cols).toHaveLength(2)
        })
      })
    })

    it('должен создавать неполную последнюю страницу', () => {
      createSlides(10)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(3)

      const lastPage = pages[2]
      const items = lastPage?.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(items).toHaveLength(2)
    })

    it('должен задавать строгую ширину колонки через calc()', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: { row: 10, col: 20 } },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const firstRow = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const cols = firstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)

      // Ширина = calc(50% - 20px * 0.5)
      const expectedWidth = 'calc(50% - 20px * 0.5)'
      const firstCol = cols?.[0] as HTMLElement
      const lastCol = cols?.[1] as HTMLElement

      expect(firstCol?.style.width).toBe(expectedWidth)
      expect(lastCol?.style.width).toBe(expectedWidth)
    })

    it('должен задавать строгую высоту строки через calc()', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: { row: 10, col: 20 } },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const rows = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)

      // Высота = calc(50% - 10px * 0.5)
      const expectedHeight = 'calc(50% - 10px * 0.5)'
      const firstRow = rows?.[0] as HTMLElement
      const lastRow = rows?.[1] as HTMLElement

      expect(firstRow?.style.height).toBe(expectedHeight)
      expect(lastRow?.style.height).toBe(expectedHeight)
    })

    it('должен применять margin-right между колонками (кроме последней)', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: { row: 10, col: 20 } },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const firstRow = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const cols = firstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)

      const firstCol = cols?.[0] as HTMLElement
      const lastCol = cols?.[1] as HTMLElement

      expect(firstCol?.style.marginRight).toBe('20px')
      expect(lastCol?.style.marginRight).toBe('')
    })

    it('должен применять margin-bottom между строками (кроме последней)', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: { row: 10, col: 20 } },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const rows = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)

      const firstRow = rows?.[0] as HTMLElement
      const lastRow = rows?.[1] as HTMLElement

      expect(firstRow?.style.marginBottom).toBe('10px')
      expect(lastRow?.style.marginBottom).toBe('')
    })

    it('без gap: ширина колонки calc(50%), высота строки calc(50%)', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const firstRow = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const firstCol = firstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement
      const rowEl = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0] as HTMLElement

      expect(firstCol?.style.width).toBe('calc(50%)')
      expect(rowEl?.style.height).toBe('calc(50%)')
    })

    it('должен работать с вертикальной ориентацией', () => {
      createSlides(6)

      slider = new Tvist(container, {
        direction: 'vertical',
        grid: { rows: 3, cols: 1 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(2)

      pages.forEach(page => {
        const rows = page.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
        expect(rows).toHaveLength(3)
      })
    })

    it('gap = 0: нет margin между строками и колонками', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: 0 },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const rows = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      const firstRow = rows?.[0] as HTMLElement
      const firstCol = firstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement

      expect(firstRow?.style.marginBottom).toBe('')
      expect(firstCol?.style.marginRight).toBe('')
    })
  })

  describe('Dimensions Grid', () => {
    it('должен создавать страницы с разными размерами', () => {
      createSlides(10)

      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2],
            [1, 2],
            [2, 2],
          ],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(3)

      const page1Rows = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      expect(page1Rows).toHaveLength(2)
      expect(page1Rows?.[0]?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)).toHaveLength(2)

      const page2Rows = pages[1]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      expect(page2Rows).toHaveLength(1)
      expect(page2Rows?.[0]?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)).toHaveLength(2)

      const page3Rows = pages[2]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      expect(page3Rows).toHaveLength(2)
    })

    it('должен циклически применять dimensions к страницам', () => {
      createSlides(12)

      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2],
            [1, 2],
          ],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(4)

      expect(pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)).toHaveLength(2)
      expect(pages[1]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)).toHaveLength(1)
      expect(pages[2]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)).toHaveLength(2)
      expect(pages[3]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)).toHaveLength(1)
    })

    it('должен корректно распределять слайды по dimensions страницам', () => {
      createSlides(7)

      slider = new Tvist(container, {
        grid: {
          dimensions: [
            [2, 2],
            [1, 2],
            [1, 1],
          ],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)

      const page1Items = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(page1Items).toHaveLength(4)
      expect(page1Items?.[0]?.textContent).toBe('Slide 1')
      expect(page1Items?.[3]?.textContent).toBe('Slide 4')

      const page2Items = pages[1]?.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(page2Items).toHaveLength(2)
      expect(page2Items?.[0]?.textContent).toBe('Slide 5')
      expect(page2Items?.[1]?.textContent).toBe('Slide 6')

      const page3Items = pages[2]?.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(page3Items).toHaveLength(1)
      expect(page3Items?.[0]?.textContent).toBe('Slide 7')
    })

    it('должен задавать calc() ширину для dimensions страниц', () => {
      createSlides(6)

      slider = new Tvist(container, {
        grid: {
          gap: 15,
          dimensions: [
            [2, 2],
            [1, 2],
          ],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)

      // Страница 1: 2×2 — ширина колонки calc(50% - 15px * 0.5)
      const page1FirstRow = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const page1FirstCol = page1FirstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement
      expect(page1FirstCol?.style.width).toBe('calc(50% - 15px * 0.5)')

      // Страница 2: 1×2 — ширина колонки calc(50% - 15px * 0.5)
      const page2FirstRow = pages[1]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const page2FirstCol = page2FirstRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement
      expect(page2FirstCol?.style.width).toBe('calc(50% - 15px * 0.5)')
    })

    it('должен задавать отступ между страницами при grid.gap без top-level gap', () => {
      createSlides(8)

      slider = new Tvist(container, {
        grid: {
          gap: 10,
          dimensions: [
            [2, 2],
            [1, 2],
          ],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages.length).toBeGreaterThanOrEqual(2)

      const firstPage = pages[0] as HTMLElement
      expect(firstPage.style.marginRight).toBe('10px')

      const lastPage = pages[pages.length - 1] as HTMLElement
      expect(lastPage.style.marginRight).toBe('')
    })
  })

  describe('Строгие размеры при неполном заполнении', () => {
    it('неполная последняя страница: ячейки имеют те же calc() размеры, что и полные', () => {
      createSlides(6)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: 10 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      // 6 слайдов: страница 1 (4 слайда), страница 2 (2 слайда)
      expect(pages).toHaveLength(2)

      const expectedColWidth = 'calc(50% - 10px * 0.5)'
      const expectedRowHeight = 'calc(50% - 10px * 0.5)'

      // Полная страница
      const fullPageRow = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const fullPageCol = fullPageRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement
      expect(fullPageCol?.style.width).toBe(expectedColWidth)
      expect((fullPageRow as HTMLElement)?.style.height).toBe(expectedRowHeight)

      // Неполная страница — размеры те же
      const partialPageRow = pages[1]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const partialPageCol = partialPageRow?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement
      expect(partialPageCol?.style.width).toBe(expectedColWidth)
      expect((partialPageRow as HTMLElement)?.style.height).toBe(expectedRowHeight)
    })

    it('1 слайд на странице 2×2: ячейка имеет calc() размер, не растягивается', () => {
      createSlides(1)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, gap: 8 },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const row = page?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)[0]
      const col = row?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)[0] as HTMLElement

      // Ширина строго calc(), не 100%
      expect(col?.style.width).toBe('calc(50% - 8px * 0.5)')
      expect((row as HTMLElement)?.style.height).toBe('calc(50% - 8px * 0.5)')
    })
  })

  describe('Сохранение и восстановление слайдов', () => {
    it('должен сохранять оригинальные слайды', () => {
      createSlides(4)
      const originalSlides = Array.from(container.querySelectorAll(`.${TVIST_CLASSES.slide}`))

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      const gridItems = container.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(gridItems).toHaveLength(4)

      gridItems.forEach((item, index) => {
        expect(item.textContent).toBe(originalSlides[index]?.textContent)
      })
    })

    it('должен восстанавливать оригинальные слайды при destroy', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      expect(container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)).toHaveLength(1)

      slider.destroy()

      expect(container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)).toHaveLength(0)
      expect(container.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)).toHaveLength(0)

      const slides = container.querySelectorAll(`.${TVIST_CLASSES.slide}`)
      expect(slides).toHaveLength(4)
      expect(slides[0]?.classList.contains(TVIST_CLASSES.gridItem)).toBe(false)
    })

    it('должен корректно пересоздавать grid при update', () => {
      createSlides(8)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      expect(container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)).toHaveLength(2)

      slider.destroy()

      slider = new Tvist(container, {
        grid: { rows: 1, cols: 4 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(2)

      pages.forEach(page => {
        const rows = page.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
        expect(rows).toHaveLength(1)

        const cols = rows[0]?.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)
        expect(cols).toHaveLength(4)
      })
    })

    it('должен переключаться между fixed и dimensions режимами', () => {
      createSlides(6)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      expect(container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)).toHaveLength(2)

      slider.destroy()

      slider = new Tvist(container, {
        grid: {
          dimensions: [[3, 2]],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(1)

      const rows = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      expect(rows).toHaveLength(3)
    })
  })

  describe('Edge cases', () => {
    it('должен корректно работать с 1 слайдом', () => {
      createSlides(1)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(1)

      const items = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridItem}`)
      expect(items).toHaveLength(1)
    })

    it('должен работать с пустым dimensions массивом (fallback на fixed grid)', () => {
      createSlides(4)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2, dimensions: [] },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(1)
    })

    it('должен работать с dimensions имеющим 1 элемент', () => {
      createSlides(8)

      slider = new Tvist(container, {
        grid: {
          dimensions: [[2, 2]],
        },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(2)

      pages.forEach(page => {
        const rows = page.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
        expect(rows).toHaveLength(2)
      })
    })

    it('должен работать с большими числами rows/cols', () => {
      createSlides(20)

      slider = new Tvist(container, {
        grid: { rows: 5, cols: 4 },
      })

      const pages = container.querySelectorAll(`.${TVIST_CLASSES.slideGridPage}`)
      expect(pages).toHaveLength(1)

      const rows = pages[0]?.querySelectorAll(`.${TVIST_CLASSES.gridRow}`)
      expect(rows).toHaveLength(5)

      rows?.forEach(row => {
        const cols = row.querySelectorAll(`.${TVIST_CLASSES.gridCol}`)
        expect(cols).toHaveLength(4)
      })
    })

    it('1 колонка: ширина calc(100%)', () => {
      createSlides(3)

      slider = new Tvist(container, {
        grid: { rows: 3, cols: 1 },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const firstCol = page?.querySelector(`.${TVIST_CLASSES.gridCol}`) as HTMLElement
      expect(firstCol?.style.width).toBe('calc(100%)')
    })

    it('1 строка: высота calc(100%)', () => {
      createSlides(3)

      slider = new Tvist(container, {
        grid: { rows: 1, cols: 3 },
      })

      const page = container.querySelector(`.${TVIST_CLASSES.slideGridPage}`)
      const firstRow = page?.querySelector(`.${TVIST_CLASSES.gridRow}`) as HTMLElement
      expect(firstRow?.style.height).toBe('calc(100%)')
    })
  })

  describe('Межстраничный gap (глобальный gap)', () => {
    it('сохраняет margin между grid-страницами после update()', () => {
      createSlides(8)
      const pageGap = 24

      slider = new Tvist(container, {
        gap: pageGap,
        grid: { rows: 2, cols: 2, gap: 8 },
      })

      const assertPageMargins = () => {
        const pages = container.querySelectorAll(
          `.${TVIST_CLASSES.slideGridPage}`,
        ) as NodeListOf<HTMLElement>
        expect(pages.length).toBeGreaterThanOrEqual(2)
        expect(pages[0]?.style.marginRight).toBe(`${pageGap}px`)
      }

      assertPageMargins()
      slider.update()
      assertPageMargins()
    })

    it('в вертикальном режиме сохраняет margin-bottom между страницами после update()', () => {
      createSlides(8)
      const pageGap = 16

      slider = new Tvist(container, {
        direction: 'vertical',
        gap: pageGap,
        grid: { rows: 2, cols: 2 },
      })

      const assertPageMargins = () => {
        const pages = container.querySelectorAll(
          `.${TVIST_CLASSES.slideGridPage}`,
        ) as NodeListOf<HTMLElement>
        expect(pages.length).toBeGreaterThanOrEqual(2)
        expect(pages[0]?.style.marginBottom).toBe(`${pageGap}px`)
      }

      assertPageMargins()
      slider.update()
      assertPageMargins()
    })
  })

  describe('Engine integration', () => {
    it('должен обновлять позиции слайдов в Engine', () => {
      createSlides(8)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      expect(slider.slides).toHaveLength(2)
      expect(slider.slides[0]?.classList.contains(TVIST_CLASSES.slideGridPage)).toBe(true)
    })

    it('должен правильно считать количество страниц для навигации', () => {
      createSlides(10)

      slider = new Tvist(container, {
        grid: { rows: 2, cols: 2 },
      })

      expect(slider.slides.length).toBe(3)
    })
  })
})
