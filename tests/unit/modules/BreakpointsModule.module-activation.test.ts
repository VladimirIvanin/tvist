/**
 * Тесты реактивности модулей при смене брейкпоинта
 *
 * Проблема: модули инициализируются один раз при старте через shouldBeActive().
 * Если pagination: false на верхнем уровне — PaginationModule не создаётся вообще.
 * При смене брейкпоинта опции обновляются, но модуль так и не инициализируется.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { TVIST_CLASSES } from '../../../src/core/constants'
import { createSliderFixture, resizeSlider } from '../../fixtures'
import type { SliderFixture } from '../../fixtures'
import '../../../src/modules/breakpoints'
import '../../../src/modules/navigation'
import '../../../src/modules/pagination'
import '../../../src/modules/autoplay'

function createSliderWithModuleContainers(slidesCount: number, width: number) {
  const fixture = createSliderFixture({ slidesCount, width })
  const root = fixture.root

  const arrowsWrap = document.createElement('div')
  arrowsWrap.className = TVIST_CLASSES.arrows
  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.className = TVIST_CLASSES.arrowPrev
  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = TVIST_CLASSES.arrowNext
  arrowsWrap.appendChild(prevBtn)
  arrowsWrap.appendChild(nextBtn)
  root.appendChild(arrowsWrap)

  const paginationEl = document.createElement('div')
  paginationEl.className = TVIST_CLASSES.pagination
  root.appendChild(paginationEl)

  return { fixture, root }
}

describe('BreakpointsModule — реактивность модулей', () => {
  let fixture: SliderFixture
  let root: HTMLElement

  afterEach(() => {
    fixture?.cleanup()
  })

  describe('Pagination: false → true при смене брейкпоинта', () => {
    it('должен инициализировать pagination при переходе в брейкпоинт с pagination: true', () => {
      const created = createSliderWithModuleContainers(3, 1200)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        pagination: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            pagination: true
          }
        }
      })

      const paginationEl = root.querySelector(`.${TVIST_CLASSES.pagination}`) as HTMLElement

      // На десктопе — pagination: false, модуль не активен, буллеты не созданы
      expect(slider['modules'].has('pagination')).toBe(false)
      const bulletsDesktop = paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bulletsDesktop?.length ?? 0).toBe(0)

      // Сужаем экран — попадаем в брейкпоинт с pagination: true
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Модуль пагинации должен быть инициализирован
      expect(slider['modules'].has('pagination')).toBe(true)

      // Буллеты должны быть созданы (3 слайда, perPage: 1)
      const bulletsMobile = paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bulletsMobile?.length).toBe(3)

      slider.destroy()
    })

    it('должен уничтожить pagination при выходе из брейкпоинта с pagination: true', () => {
      const created = createSliderWithModuleContainers(3, 600)
      fixture = created.fixture
      root = created.root
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        pagination: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            pagination: true
          }
        }
      })

      const paginationEl = root.querySelector(`.${TVIST_CLASSES.pagination}`) as HTMLElement

      // На мобиле — pagination: true, модуль активен
      expect(slider['modules'].has('pagination')).toBe(true)
      const bulletsMobile = paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bulletsMobile?.length).toBe(3)

      // Расширяем экран — возвращаемся к pagination: false
      resizeSlider(root, 1200)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Модуль пагинации должен быть уничтожен
      expect(slider['modules'].has('pagination')).toBe(false)

      // Буллеты должны быть очищены
      const bulletsDesktop = paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bulletsDesktop?.length ?? 0).toBe(0)

      slider.destroy()
    })

    it('должен корректно переключать pagination при нескольких сменах брейкпоинта', () => {
      const created = createSliderWithModuleContainers(3, 1200)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        pagination: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            pagination: true
          }
        }
      })

      const paginationEl = root.querySelector(`.${TVIST_CLASSES.pagination}`) as HTMLElement

      // Десктоп — нет пагинации
      expect(slider['modules'].has('pagination')).toBe(false)

      // Мобиле — есть пагинация
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider['modules'].has('pagination')).toBe(true)
      expect(paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`).length).toBe(3)

      // Снова десктоп — нет пагинации
      resizeSlider(root, 1200)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider['modules'].has('pagination')).toBe(false)
      expect(paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`).length ?? 0).toBe(0)

      // Снова мобиле — пагинация снова появляется
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider['modules'].has('pagination')).toBe(true)
      expect(paginationEl?.querySelectorAll(`.${TVIST_CLASSES.bullet}`).length).toBe(3)

      slider.destroy()
    })
  })

  describe('Navigation (arrows): false → true при смене брейкпоинта', () => {
    it('должен инициализировать navigation при переходе в брейкпоинт с arrows: true', () => {
      const created = createSliderWithModuleContainers(3, 1200)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        arrows: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            arrows: true
          }
        }
      })

      // На десктопе — arrows: false, модуль не активен
      expect(slider['modules'].has('navigation')).toBe(false)

      // Сужаем экран — попадаем в брейкпоинт с arrows: true
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Модуль навигации должен быть инициализирован
      expect(slider['modules'].has('navigation')).toBe(true)

      slider.destroy()
    })

    it('должен уничтожить navigation при выходе из брейкпоинта с arrows: true', () => {
      const created = createSliderWithModuleContainers(3, 600)
      fixture = created.fixture
      root = created.root
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        arrows: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            arrows: true
          }
        }
      })

      // На мобиле — arrows: true, модуль активен
      expect(slider['modules'].has('navigation')).toBe(true)

      // Расширяем экран — возвращаемся к arrows: false
      resizeSlider(root, 1200)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      // Модуль навигации должен быть уничтожен
      expect(slider['modules'].has('navigation')).toBe(false)

      slider.destroy()
    })
  })

  describe('Несколько модулей одновременно', () => {
    it('должен активировать и деактивировать несколько модулей при смене брейкпоинта', () => {
      const created = createSliderWithModuleContainers(3, 1200)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        arrows: false,
        pagination: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            arrows: true,
            pagination: true
          }
        }
      })

      // Десктоп — оба модуля неактивны
      expect(slider['modules'].has('navigation')).toBe(false)
      expect(slider['modules'].has('pagination')).toBe(false)

      // Мобиле — оба модуля активны
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider['modules'].has('navigation')).toBe(true)
      expect(slider['modules'].has('pagination')).toBe(true)

      // Снова десктоп — оба модуля деактивированы
      resizeSlider(root, 1200)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()
      expect(slider['modules'].has('navigation')).toBe(false)
      expect(slider['modules'].has('pagination')).toBe(false)

      slider.destroy()
    })
  })

  describe('enable() не должен инициализировать неактивные модули', () => {
    it('не должен создавать autoplay при enable() если autoplay не задан', () => {
      const created = createSliderWithModuleContainers(3, 1000)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        enabled: false,
        // autoplay не задан — AutoplayModule.shouldBeActive() вернёт false
        breakpointsBase: 'container',
        breakpoints: {
          768: { enabled: true }
        }
      })

      // Слайдер отключён, autoplay не должен быть создан
      expect(slider['modules'].has('autoplay')).toBe(false)

      // Включаем через breakpoint
      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(true)
      // autoplay по-прежнему не должен быть создан — shouldBeActive() = false
      expect(slider['modules'].has('autoplay')).toBe(false)

      slider.destroy()
    })

    it('не должен создавать pagination при enable() если pagination: false', () => {
      const created = createSliderWithModuleContainers(3, 1000)
      fixture = created.fixture
      root = created.root

      const slider = new Tvist(root, {
        enabled: false,
        pagination: false,
        breakpointsBase: 'container',
        breakpoints: {
          768: { enabled: true }
          // pagination остаётся false — не должен появиться
        }
      })

      expect(slider['modules'].has('pagination')).toBe(false)

      resizeSlider(root, 600)
      slider['modules'].get('breakpoints')?.['checkBreakpoints']()

      expect(slider.isEnabled).toBe(true)
      // pagination: false — модуль не должен быть создан через enable()
      expect(slider['modules'].has('pagination')).toBe(false)

      slider.destroy()
    })
  })
})
