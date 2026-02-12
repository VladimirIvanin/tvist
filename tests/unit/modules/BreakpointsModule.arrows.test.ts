/**
 * Тесты для взаимодействия Breakpoints с Arrows/Pagination
 * Проверяем что hideWhenSinglePage работает при смене breakpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { TVIST_CLASSES } from '../../../src/core/constants'
import { createSliderFixture, resizeSlider } from '../../fixtures'
import '../../../src/modules/breakpoints'
import '../../../src/modules/navigation'
import '../../../src/modules/pagination'

function createSliderWithNavigation(slidesCount: number, width: number) {
  const fixture = createSliderFixture({ slidesCount, width })
  const root = fixture.root

  const arrowsWrap = document.createElement('div')
  arrowsWrap.className = 'tvist-v1__arrows'
  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.className = `${TVIST_CLASSES.arrowPrev}`
  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = `${TVIST_CLASSES.arrowNext}`
  arrowsWrap.appendChild(prevBtn)
  arrowsWrap.appendChild(nextBtn)
  root.appendChild(arrowsWrap)

  const paginationEl = document.createElement('div')
  paginationEl.className = TVIST_CLASSES.pagination
  root.appendChild(paginationEl)

  return { fixture, root }
}

describe('BreakpointsModule + Navigation (hideWhenSinglePage)', () => {
  let fixture: ReturnType<typeof createSliderFixture>
  let root: HTMLElement

  afterEach(() => {
    fixture?.cleanup()
  })

  it('должен показывать стрелки при разблокировке через breakpoint', () => {
    const created = createSliderWithNavigation(2, 1200)
    fixture = created.fixture
    root = created.root

    const slider = new Tvist(root, {
      perPage: 2,
      gap: 16,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    const prevArrow = root.querySelector(`.${TVIST_CLASSES.arrowPrev}`) as HTMLElement
    const nextArrow = root.querySelector(`.${TVIST_CLASSES.arrowNext}`) as HTMLElement

    // На десктопе (perPage: 2, 2 слайда) -> locked -> стрелки скрыты
    expect(slider.engine.isLocked).toBe(true)
    expect(prevArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    expect(nextArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)

    // Сужаем экран
    resizeSlider(root, 600)
    slider.update()

    // На мобиле (perPage: 1, 2 слайда) -> unlocked -> стрелки видны
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.options.perPage).toBe(1)
    expect(prevArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)
    expect(nextArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)

    slider.destroy()
  })

  it('должен скрывать стрелки при блокировке через breakpoint', () => {
    const created = createSliderWithNavigation(2, 600)
    fixture = created.fixture
    root = created.root
    resizeSlider(root, 600)

    const slider = new Tvist(root, {
      perPage: 2,
      gap: 16,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    const prevArrow = root.querySelector(`.${TVIST_CLASSES.arrowPrev}`) as HTMLElement
    const nextArrow = root.querySelector(`.${TVIST_CLASSES.arrowNext}`) as HTMLElement

    // На мобиле (perPage: 1, 2 слайда) -> unlocked -> стрелки видны
    expect(slider.engine.isLocked).toBe(false)
    expect(prevArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(false)

    // Расширяем экран
    resizeSlider(root, 1200)
    slider.update()

    // На десктопе (perPage: 2, 2 слайда) -> locked -> стрелки скрыты
    expect(slider.engine.isLocked).toBe(true)
    expect(slider.options.perPage).toBe(2)
    expect(prevArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)
    expect(nextArrow?.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(true)

    slider.destroy()
  })

  it('должен обновлять пагинацию при смене breakpoint', () => {
    const created = createSliderWithNavigation(2, 1200)
    fixture = created.fixture
    root = created.root

    const slider = new Tvist(root, {
      perPage: 2,
      gap: 16,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    const pagination = root.querySelector(`.${TVIST_CLASSES.pagination}`) as HTMLElement

    // На десктопе (perPage: 2, 2 слайда) -> 1 страница -> пагинация скрыта
    expect(slider.engine.isLocked).toBe(true)
    expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)

    // Сужаем экран
    resizeSlider(root, 600)
    slider.update()

    // На мобиле (perPage: 1, 2 слайда) -> 2 страницы -> пагинация видна
    expect(slider.engine.isLocked).toBe(false)
    expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)

    const bullets = pagination?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    expect(bullets?.length).toBe(2)

    slider.destroy()
  })

  it('должен сбрасывать позицию при блокировке через breakpoint', () => {
    const created = createSliderWithNavigation(2, 600)
    fixture = created.fixture
    root = created.root
    resizeSlider(root, 600)

    const slider = new Tvist(root, {
      perPage: 2,
      gap: 16,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    expect(slider.engine.isLocked).toBe(false)
    expect(slider.options.perPage).toBe(1)

    slider.scrollTo(1, { instant: true })
    expect(slider.engine.index.get()).toBe(1)

    const mobilePosition = slider.engine.location.get()
    expect(mobilePosition).toBeLessThan(0)

    // Расширяем экран
    resizeSlider(root, 1200)
    slider.update()

    expect(slider.engine.isLocked).toBe(true)
    expect(slider.options.perPage).toBe(2)

    const desktopPosition = slider.engine.location.get()
    expect(desktopPosition).toBeCloseTo(0, 5)
    expect(slider.engine.index.get()).toBe(0)

    slider.destroy()
  })
})
