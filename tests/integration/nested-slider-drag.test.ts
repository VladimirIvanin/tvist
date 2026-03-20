/**
 * Вложенные слайдеры: drag на внутреннем экземпляре не должен запускать drag родителя.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist, type TvistRootElement } from '@core/Tvist'
import { createSliderFixture, createMouseEvent, type SliderFixture } from '../fixtures'
import '../../src/modules/drag'

function appendInnerTvistRoot(
  hostSlide: HTMLElement,
  options: { rootWidth: number; rootHeight: number; slideWidth: number; slidesCount: number }
): { innerRoot: HTMLElement; innerSlides: HTMLElement[] } {
  const { rootWidth, rootHeight, slideWidth, slidesCount } = options

  const innerRoot = document.createElement('div')
  innerRoot.className = TVIST_CLASSES.block
  innerRoot.style.width = `${rootWidth}px`
  innerRoot.style.height = `${rootHeight}px`

  const innerContainer = document.createElement('div')
  innerContainer.className = TVIST_CLASSES.container

  const innerSlides: HTMLElement[] = []
  for (let i = 0; i < slidesCount; i++) {
    const slide = document.createElement('div')
    slide.className = TVIST_CLASSES.slide
    slide.textContent = `Inner ${i + 1}`
    slide.style.width = `${slideWidth}px`
    slide.style.height = `${rootHeight}px`
    innerContainer.appendChild(slide)
    innerSlides.push(slide)
  }

  innerRoot.appendChild(innerContainer)
  hostSlide.textContent = ''
  hostSlide.appendChild(innerRoot)

  Object.defineProperty(innerRoot, 'offsetWidth', { configurable: true, value: rootWidth })
  Object.defineProperty(innerRoot, 'offsetHeight', { configurable: true, value: rootHeight })
  Object.defineProperty(innerRoot, 'clientWidth', { configurable: true, value: rootWidth })
  Object.defineProperty(innerRoot, 'clientHeight', { configurable: true, value: rootHeight })

  Object.defineProperty(innerContainer, 'offsetWidth', { configurable: true, value: rootWidth })
  Object.defineProperty(innerContainer, 'clientWidth', { configurable: true, value: rootWidth })

  innerSlides.forEach((slide) => {
    Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: slideWidth })
    Object.defineProperty(slide, 'offsetHeight', { configurable: true, value: rootHeight })
  })

  return { innerRoot, innerSlides }
}

describe('nested sliders + drag', () => {
  let fixture: SliderFixture
  let parent: Tvist
  let child: Tvist
  let innerRoot: HTMLElement
  let innerSlides: HTMLElement[]

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 2,
      width: 600,
      height: 400,
    })
    const nested = appendInnerTvistRoot(fixture.slides[0]!, {
      rootWidth: 400,
      rootHeight: 280,
      slideWidth: 400,
      slidesCount: 3,
    })
    innerRoot = nested.innerRoot
    innerSlides = nested.innerSlides

    parent = new Tvist(fixture.root, {
      drag: true,
      perPage: 1,
      speed: 300,
      gap: 0,
    })
    child = new Tvist(innerRoot, {
      drag: true,
      perPage: 1,
      speed: 300,
      gap: 0,
    })
  })

  afterEach(() => {
    child.destroy()
    parent.destroy()
    fixture.cleanup()
  })

  it('по умолчанию parent.destroy() не трогает вложенный экземпляр', () => {
    const innerEl = innerRoot as TvistRootElement
    expect(innerEl.tvistInstance).toBe(child)
    parent.destroy()
    expect(innerEl.tvistInstance).toBe(child)
    child.destroy()
  })

  it('parent.destroy({ destroyNested: true }) рекурсивно уничтожает вложенные', () => {
    const innerEl = innerRoot as TvistRootElement
    expect(innerEl.tvistInstance).toBe(child)
    parent.destroy({ destroyNested: true })
    expect(innerEl.tvistInstance).toBeNull()
  })

  it('родитель не подмешивает слайды вложенного экземпляра в список и data-tvist-slide-index', () => {
    expect(parent.slides).toHaveLength(2)
    expect(child.slides).toHaveLength(3)
    expect(parent.slides.map((s) => s.getAttribute('data-tvist-slide-index'))).toEqual(['0', '1'])
    expect(child.slides.map((s) => s.getAttribute('data-tvist-slide-index'))).toEqual(['0', '1', '2'])
  })

  it('drag на вложенном слайде не вызывает dragStart у родителя и не двигает его location', () => {
    const parentSpy = vi.fn()
    const childSpy = vi.fn()
    parent.on('dragStart', parentSpy)
    child.on('dragStart', childSpy)

    const parentLocBefore = parent.engine.location.get()

    const innerTarget = innerSlides[0]!
    innerTarget.dispatchEvent(
      createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
    )
    document.dispatchEvent(createMouseEvent('mousemove', { clientX: 160, clientY: 100 }))
    document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
    document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))

    expect(childSpy).toHaveBeenCalled()
    expect(parentSpy).not.toHaveBeenCalled()
    expect(parent.engine.location.get()).toBe(parentLocBefore)
  })

  it('drag на слайде родителя без вложенного слайдера вызывает dragStart у родителя', () => {
    const parentSpy = vi.fn()
    parent.on('dragStart', parentSpy)

    const outerSlide = fixture.slides[1]!
    outerSlide.dispatchEvent(
      createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
    )
    document.dispatchEvent(createMouseEvent('mousemove', { clientX: 160, clientY: 100 }))
    document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
    document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))

    expect(parentSpy).toHaveBeenCalled()
  })
})
