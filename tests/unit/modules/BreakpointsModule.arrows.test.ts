/**
 * Тесты для взаимодействия Breakpoints с Arrows/Pagination
 * Проверяем что hideWhenSinglePage работает при смене breakpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { JSDOM } from 'jsdom'
import '../../../src/modules/breakpoints'
import '../../../src/modules/navigation'
import '../../../src/modules/pagination'

describe('BreakpointsModule + Navigation (hideWhenSinglePage)', () => {
  let dom: JSDOM
  let container: HTMLElement

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="slider" style="width: 1200px;">
            <div class="tvist-v1__container">
              <div class="tvist-v1__slide">1</div>
              <div class="tvist-v1__slide">2</div>
            </div>
            <div class="tvist-v1__arrows">
              <button type="button" class="tvist-v1__arrow tvist-v1__arrow--prev"></button>
              <button type="button" class="tvist-v1__arrow tvist-v1__arrow--next"></button>
            </div>
            <div class="tvist-v1__pagination"></div>
          </div>
        </body>
      </html>
    `)
    global.document = dom.window.document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis
    global.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement
    global.Element = dom.window.Element as unknown as typeof Element
    
    container = document.getElementById('slider') as HTMLElement
  })

  it('должен показывать стрелки при разблокировке через breakpoint', () => {
    let currentWidth = 1200
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => currentWidth
    })

    const slider = new Tvist(container, {
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

    // Получаем стрелки
    const prevArrow = container.querySelector('.tvist-v1__arrow--prev') as HTMLElement
    const nextArrow = container.querySelector('.tvist-v1__arrow--next') as HTMLElement

    // На десктопе (perPage: 2, 2 слайда) -> locked -> стрелки скрыты
    expect(slider.engine.isLocked).toBe(true)
    expect(prevArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(true)
    expect(nextArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(true)

    // Сужаем экран
    currentWidth = 600
    slider.update()

    // На мобиле (perPage: 1, 2 слайда) -> unlocked -> стрелки видны
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.options.perPage).toBe(1)
    
    // ВАЖНО: стрелки должны стать видимыми
    expect(prevArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(false)
    expect(nextArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(false)

    slider.destroy()
  })

  it('должен скрывать стрелки при блокировке через breakpoint', () => {
    let currentWidth = 600
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => currentWidth
    })

    const slider = new Tvist(container, {
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

    // Получаем стрелки
    const prevArrow = container.querySelector('.tvist-v1__arrow--prev') as HTMLElement
    const nextArrow = container.querySelector('.tvist-v1__arrow--next') as HTMLElement

    // На мобиле (perPage: 1, 2 слайда) -> unlocked -> стрелки видны
    expect(slider.engine.isLocked).toBe(false)
    expect(prevArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(false)

    // Расширяем экран
    currentWidth = 1200
    slider.update()

    // На десктопе (perPage: 2, 2 слайда) -> locked -> стрелки скрыты
    expect(slider.engine.isLocked).toBe(true)
    expect(slider.options.perPage).toBe(2)
    expect(prevArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(true)
    expect(nextArrow?.classList.contains('tvist-v1__arrow--hidden')).toBe(true)

    slider.destroy()
  })

  it('должен обновлять пагинацию при смене breakpoint', () => {
    let currentWidth = 1200
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => currentWidth
    })

    const slider = new Tvist(container, {
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

    // Получаем пагинацию
    const pagination = container.querySelector('.tvist-v1__pagination') as HTMLElement

    // На десктопе (perPage: 2, 2 слайда) -> 1 страница -> пагинация скрыта
    expect(slider.engine.isLocked).toBe(true)
    expect(pagination?.classList.contains('tvist-v1__pagination--hidden')).toBe(true)

    // Сужаем экран
    currentWidth = 600
    slider.update()

    // На мобиле (perPage: 1, 2 слайда) -> 2 страницы -> пагинация видна
    expect(slider.engine.isLocked).toBe(false)
    expect(pagination?.classList.contains('tvist-v1__pagination--hidden')).toBe(false)
    
    // Должно быть 2 буллета
    const bullets = pagination?.querySelectorAll('.tvist-v1__bullet')
    expect(bullets?.length).toBe(2)

    slider.destroy()
  })

  it('должен сбрасывать позицию при блокировке через breakpoint', () => {
    let currentWidth = 600
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => currentWidth
    })

    const slider = new Tvist(container, {
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

    // На мобиле (perPage: 1, 2 слайда) -> unlocked
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.options.perPage).toBe(1)

    // Переходим на второй слайд (instant чтобы не ждать анимацию)
    slider.scrollTo(1, { instant: true })
    expect(slider.engine.index.get()).toBe(1)
    
    // Позиция должна быть отрицательной (прокручено вправо)
    const mobilePosition = slider.engine.location.get()
    expect(mobilePosition).toBeLessThan(0)

    // Расширяем экран
    currentWidth = 1200
    slider.update()

    // На десктопе (perPage: 2, 2 слайда) -> locked
    expect(slider.engine.isLocked).toBe(true)
    expect(slider.options.perPage).toBe(2)
    
    // Позиция должна быть сброшена на 0 (начало)
    const desktopPosition = slider.engine.location.get()
    expect(desktopPosition).toBeCloseTo(0, 5)
    
    // Индекс должен быть сброшен на 0
    expect(slider.engine.index.get()).toBe(0)

    slider.destroy()
  })
})
