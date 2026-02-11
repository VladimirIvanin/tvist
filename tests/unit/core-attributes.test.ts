/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { TVIST_CLASSES } from '../../src/core/constants'
// Register modules
import '../../src/modules/loop'

function createSliderHTML(count = 3): string {
  const slides = Array.from({ length: count })
    .map((_, i) => `<div class="${TVIST_CLASSES.slide}">Slide ${i}</div>`)
    .join('')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.container}">
        ${slides}
      </div>
    </div>
  `
}

describe('Core Attributes (data-tvist-slide-index)', () => {
  let container: HTMLElement
  let root: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should set data-tvist-slide-index when loop is false', () => {
    container.innerHTML = createSliderHTML(3)
    root = container.querySelector(`.${TVIST_CLASSES.block}`)!

    const slider = new Tvist(root, {
      loop: false
    })

    const slides = slider.slides
    expect(slides.length).toBe(3)
    
    expect(slides[0].getAttribute('data-tvist-slide-index')).toBe('0')
    expect(slides[1].getAttribute('data-tvist-slide-index')).toBe('1')
    expect(slides[2].getAttribute('data-tvist-slide-index')).toBe('2')

    slider.destroy()
  })

  it('should set data-tvist-slide-index when loop is true', () => {
    container.innerHTML = createSliderHTML(3)
    root = container.querySelector(`.${TVIST_CLASSES.block}`)!

    const slider = new Tvist(root, {
      loop: true
    })

    // In current implementation (before refactor), LoopModule sets this.
    // In new implementation, Tvist should set this.
    // Result should be the same.
    const slides = slider.slides
    
    expect(slides[0].getAttribute('data-tvist-slide-index')).toBe('0')
    expect(slides[1].getAttribute('data-tvist-slide-index')).toBe('1')
    expect(slides[2].getAttribute('data-tvist-slide-index')).toBe('2')

    slider.destroy()
  })

  it('should preserve correct data-tvist-slide-index after loop rearrangement', () => {
    // 5 slides to allow rearrangement
    container.innerHTML = createSliderHTML(5)
    root = container.querySelector(`.${TVIST_CLASSES.block}`)!

    const slider = new Tvist(root, {
      loop: true,
      perPage: 1
    })

    // Initially 0, 1, 2, 3, 4
    expect(slider.slides[0].getAttribute('data-tvist-slide-index')).toBe('0')
    expect(slider.slides[4].getAttribute('data-tvist-slide-index')).toBe('4')

    // Move backwards to cause prepend
    // This moves last slides to start
    slider.prev() 

    // With 5 slides, perPage 1.
    // prev() moves to index 4.
    // Loop logic might prepend slide 4 to the beginning.
    
    const firstSlideInDom = slider.container.firstElementChild as HTMLElement
    const lastSlideInDom = slider.container.lastElementChild as HTMLElement

    // If rearrangement happened, the DOM order changed.
    // We want to ensure that 'data-tvist-slide-index' still matches the content "Slide X"
    
    // Check first slide in DOM
    const firstIndex = firstSlideInDom.getAttribute('data-tvist-slide-index')
    const firstContent = firstSlideInDom.textContent
    expect(firstContent).toBe(`Slide ${firstIndex}`)

    // Check last slide in DOM
    const lastIndex = lastSlideInDom.getAttribute('data-tvist-slide-index')
    const lastContent = lastSlideInDom.textContent
    expect(lastContent).toBe(`Slide ${lastIndex}`)

    slider.destroy()
  })
})
