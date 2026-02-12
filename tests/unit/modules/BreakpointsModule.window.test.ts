/**
 * @vitest-environment happy-dom
 *
 * BreakpointsModule: window-based breakpoints и resize.
 * findMatchingBreakpoint, инициализация по window.innerWidth, смена breakpoint при resize,
 * matchMedia callback и полный цикл update().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import { findMatchingBreakpoint } from '@utils/breakpoints'
import type { TvistOptions } from '@core/types'
import '../../../src/modules/breakpoints'

// ============================================================================
// Хелперы
// ============================================================================

function createSliderHTML(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, i) =>
    `<div class="${TVIST_CLASSES.slide}" style="width:100px">Slide ${i + 1}</div>`
  ).join('\n')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        ${slides}
      </div>
    </div>
  `
}

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

function mockElementWidths(width: number): void {
  Object.defineProperties(HTMLElement.prototype, {
    clientWidth: { configurable: true, get: () => width },
    offsetWidth: { configurable: true, get: () => width },
  })
  // @ts-expect-error мок для getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = () => ({ width, height: 400, top: 0, left: 0, right: width, bottom: 400 } as DOMRect)
}

// ============================================================================
// Тесты
// ============================================================================

describe('BreakpointsModule — window-based и resize', () => {
  let container: HTMLElement
  let root: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Блок 1: findMatchingBreakpoint — чистая функция, граничные условия
  // ==========================================================================

  describe('findMatchingBreakpoint — граничные условия (window-based)', () => {
    let dummyRoot: HTMLElement

    beforeEach(() => {
      dummyRoot = document.createElement('div')
    })

    it('width < breakpoint → matched', () => {
      setWindowWidth(767)
      const options: TvistOptions = {
        breakpoints: { 768: { perPage: 1 } }
      }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBe(768)
    })

    it('width === breakpoint → matched', () => {
      setWindowWidth(768)
      const options: TvistOptions = {
        breakpoints: { 768: { perPage: 1 } }
      }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBe(768)
    })

    it('width === breakpoint + 1 → NOT matched', () => {
      setWindowWidth(769)
      const options: TvistOptions = {
        breakpoints: { 768: { perPage: 1 } }
      }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBeNull()
    })

    it('width значительно больше breakpoint → NOT matched', () => {
      setWindowWidth(792)
      const options: TvistOptions = {
        breakpoints: { 768: { perPage: 1 } }
      }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBeNull()
    })

    it('width значительно больше breakpoint (1024) → NOT matched', () => {
      setWindowWidth(1024)
      const options: TvistOptions = {
        breakpoints: { 768: { perPage: 1 } }
      }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBeNull()
    })

    it('несколько breakpoints, width между ними → ближайший больший', () => {
      setWindowWidth(800)
      const options: TvistOptions = {
        breakpoints: {
          768: { perPage: 1 },
          992: { perPage: 2 },
          1200: { perPage: 3 }
        }
      }
      // 800 <= 992, ближайший min среди >=
      expect(findMatchingBreakpoint(dummyRoot, options)).toBe(992)
    })

    it('без breakpoints → null', () => {
      setWindowWidth(500)
      const options: TvistOptions = {}
      expect(findMatchingBreakpoint(dummyRoot, options)).toBeNull()
    })

    it('пустой breakpoints → null', () => {
      setWindowWidth(500)
      const options: TvistOptions = { breakpoints: {} }
      expect(findMatchingBreakpoint(dummyRoot, options)).toBeNull()
    })
  })

  // ==========================================================================
  // Блок 2: Инициализация при разной ширине окна (window-based)
  // ==========================================================================

  describe('Инициализация — window-based, 2 слайда, perPage:2, bp 768: perPage:1', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('при window.innerWidth=1024 → perPage:2, locked', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)
      slider.destroy()
    })

    it('при window.innerWidth=792 → perPage:2, locked (792 > 768)', () => {
      setWindowWidth(792)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)
      slider.destroy()
    })

    it('при window.innerWidth=769 → perPage:2, locked (769 > 768)', () => {
      setWindowWidth(769)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)
      slider.destroy()
    })

    it('при window.innerWidth=768 → perPage:1, NOT locked', () => {
      setWindowWidth(768)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })
      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)
      slider.destroy()
    })

    it('при window.innerWidth=500 → perPage:1, NOT locked', () => {
      setWindowWidth(500)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })
      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)
      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 3: Переход из мобильного breakpoint в десктоп (resize вверх)
  // ==========================================================================

  describe('Resize: мобилка → десктоп (выход из breakpoint)', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('init при 700 (bp 768 active), resize до 792 → perPage должен стать 2', () => {
      setWindowWidth(700)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      setWindowWidth(792)
      slider.update()

      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('init при 768 (bp 768 active), resize до 769 → perPage должен стать 2', () => {
      setWindowWidth(768)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(1)

      setWindowWidth(769)
      slider.update()

      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('init при 700, resize до 800 → originalOptions не мутированы', () => {
      setWindowWidth(700)
      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpoints: { 768: { perPage: 1, gap: 0 } }
      })

      expect(slider._originalOptions).toBeDefined()
      expect(slider._originalOptions?.perPage).toBe(2)
      expect(slider._originalOptions?.gap).toBe(16)

      setWindowWidth(800)
      slider.update()

      expect(slider._originalOptions?.perPage).toBe(2)
      expect(slider._originalOptions?.gap).toBe(16)
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(16)

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 4: Переход десктоп → мобилка (resize вниз)
  // ==========================================================================

  describe('Resize: десктоп → мобилка (вход в breakpoint)', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('init при 1024 (no bp), resize до 768 → perPage должен стать 1', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(768)
      slider.update()

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })

    it('init при 1024, resize до 500 → perPage должен стать 1', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(2)

      setWindowWidth(500)
      slider.update()

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 5: Туда-сюда (cycle: desktop → mobile → desktop)
  // ==========================================================================

  describe('Resize cycle: desktop → mobile → desktop', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('1024 → 700 → 800 → perPage должен восстановиться до 2', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpoints: { 768: { perPage: 1, gap: 0 } }
      })

      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(16)
      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(700)
      slider.update()
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)
      expect(slider.engine.isLocked).toBe(false)

      setWindowWidth(800)
      slider.update()
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(16)
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('500 → 1024 → 500 → perPage меняется корректно', () => {
      setWindowWidth(500)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(1)

      setWindowWidth(1024)
      slider.update()
      expect(slider.options.perPage).toBe(2)

      setWindowWidth(500)
      slider.update()
      expect(slider.options.perPage).toBe(1)

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 6: matchMedia callback — engine.update() после смены breakpoint
  // ==========================================================================

  describe('matchMedia callback — engine.update() после смены breakpoint', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('при вызове matchMedia change callback — options обновляются', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(2)

      const bpModule = (slider as any).modules.get('breakpoints')
      expect(bpModule).toBeDefined()

      setWindowWidth(700)
      ;(bpModule as any).handleMediaChange()

      expect(slider.options.perPage).toBe(1)

      slider.destroy()
    })

    it('при вызове matchMedia change → Engine.isLocked должен обновиться', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(700)
      const bpMod = (slider as any).modules.get('breakpoints')
      ;(bpMod as any).handleMediaChange()

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })

    it('при вызове onResize → Engine.isLocked обновляется корректно', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(700)
      slider.update()

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 7: matchMedia + resize
  // ==========================================================================

  describe('matchMedia + resize', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('matchMedia first, затем update() — options и engine оба корректны', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(700)
      const bpModule = (slider as any).modules.get('breakpoints')
      ;(bpModule as any).handleMediaChange()

      expect(slider.options.perPage).toBe(1)

      slider.update()

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })

    it('matchMedia вызывает полный цикл update — Engine пересчитывает layout', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      const engineUpdateSpy = vi.spyOn(slider.engine, 'update')

      setWindowWidth(700)
      const bpModule = (slider as any).modules.get('breakpoints')
      ;(bpModule as any).handleMediaChange()

      expect(engineUpdateSpy).toHaveBeenCalled()
      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 8: Инициализация — applyInitialBreakpoint + BreakpointsModule.init()
  // ==========================================================================

  describe('Инициализация: applyInitialBreakpoint + BreakpointsModule.init()', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('при инициализации в breakpoint — options мутируются applyInitialBreakpoint', () => {
      setWindowWidth(700)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(1)

      const bpModule = (slider as any).modules.get('breakpoints')
      expect(bpModule.getCurrentBreakpoint()).toBe(768)

      slider.destroy()
    })

    it('при инициализации вне breakpoint — currentBreakpoint = null', () => {
      setWindowWidth(1024)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.options.perPage).toBe(2)

      const bpModule = (slider as any).modules.get('breakpoints')
      expect(bpModule.getCurrentBreakpoint()).toBeNull()

      slider.destroy()
    })
  })

  // ==========================================================================
  // Блок 9: E2E — perPage:2, 2 слайда, breakpoint 768: perPage:1
  // ==========================================================================

  describe('E2E: perPage:2, 2 слайда, breakpoint 768: perPage:1', () => {
    beforeEach(() => {
      mockElementWidths(1200)
      container.innerHTML = createSliderHTML(2)
      root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement
    })

    it('init при ≤768, resize до 792 — слайдер должен показать 2 слайда', () => {
      setWindowWidth(740)
      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        drag: true,
        arrows: true,
        pagination: true,
        breakpoints: {
          768: { perPage: 1 }
        }
      })

      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      for (const w of [742, 743, 746, 758, 768]) {
        setWindowWidth(w)
        slider.update()
        expect(slider.options.perPage).toBe(1)
      }

      setWindowWidth(775)
      slider.update()
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(792)
      slider.update()
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('init при >768, resize до ≤768 и обратно', () => {
      setWindowWidth(792)
      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpoints: {
          768: { perPage: 1 }
        }
      })

      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      setWindowWidth(767)
      slider.update()
      expect(slider.options.perPage).toBe(1)
      expect(slider.engine.isLocked).toBe(false)

      setWindowWidth(792)
      slider.update()
      expect(slider.options.perPage).toBe(2)
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('Engine.index.endIndex пересчитывается при смене breakpoint', () => {
      setWindowWidth(700)
      const slider = new Tvist(root, {
        perPage: 2,
        breakpoints: { 768: { perPage: 1 } }
      })

      expect(slider.engine.index.endIndex).toBe(1)

      setWindowWidth(800)
      slider.update()

      expect(slider.engine.index.endIndex).toBe(0)

      slider.destroy()
    })

    it('Engine.slideSize пересчитывается при смене breakpoint', () => {
      setWindowWidth(700)
      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpoints: { 768: { perPage: 1, gap: 0 } }
      })

      const sizeMobile = slider.engine.slideSize

      setWindowWidth(800)
      slider.update()

      const sizeDesktop = slider.engine.slideSize

      expect(sizeDesktop).toBeLessThan(sizeMobile)

      slider.destroy()
    })
  })
})
