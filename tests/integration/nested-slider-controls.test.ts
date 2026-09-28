import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import type { TvistOptions } from '@core/types'
import { createSliderFixture, type SliderFixture } from '../fixtures'
import '../../src/modules/navigation'
import '../../src/modules/pagination'

describe('Nested slider controls', () => {
  let outer: SliderFixture
  let inner: SliderFixture
  const sliders: Tvist[] = []
  const selector = (className: string) => `.${className}`

  function mount(root: HTMLElement, options: TvistOptions = {}): Tvist {
    const slider = new Tvist(root, { speed: 0, arrows: true, pagination: true, ...options })
    sliders.push(slider)
    return slider
  }

  function controls(root: HTMLElement) {
    return {
      prev: root.querySelector<HTMLButtonElement>(`:scope > ${selector(TVIST_CLASSES.arrowPrev)}`)!,
      next: root.querySelector<HTMLButtonElement>(`:scope > ${selector(TVIST_CLASSES.arrowNext)}`)!,
      pagination: root.querySelector<HTMLElement>(`:scope > ${selector(TVIST_CLASSES.pagination)}`)!,
    }
  }

  function appendControls(root: HTMLElement) {
    const wrapper = document.createElement('div')
    const prev = document.createElement('button')
    const next = document.createElement('button')
    const pagination = document.createElement('div')
    prev.className = TVIST_CLASSES.arrowPrev
    next.className = TVIST_CLASSES.arrowNext
    pagination.className = TVIST_CLASSES.pagination
    prev.textContent = 'Custom prev'
    next.textContent = 'Custom next'
    wrapper.append(prev, next, pagination)
    root.append(wrapper)
    return { prev, next, pagination }
  }

  beforeEach(() => {
    outer = createSliderFixture({ slidesCount: 4, width: 800 })
    inner = createSliderFixture({ slidesCount: 3, width: 400 })
    outer.slides[0]!.appendChild(inner.root)
  })

  afterEach(() => {
    sliders.forEach(slider => slider.destroy())
    sliders.length = 0
    inner.cleanup()
    outer.cleanup()
  })

  it.each(['child first', 'parent first'])('creates independent controls when initialized %s', order => {
    const child = order === 'child first' ? mount(inner.root) : undefined
    const parent = mount(outer.root)
    const nested = child ?? mount(inner.root)
    const parentControls = controls(outer.root)
    const childControls = controls(inner.root)

    for (const element of Object.values(parentControls)) {
      expect(element?.parentElement).toBe(outer.root)
    }
    for (const element of Object.values(childControls)) {
      expect(element?.parentElement).toBe(inner.root)
    }
    expect(parentControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(4)
    expect(childControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(3)

    childControls.next.click()
    expect(nested.activeIndex).toBe(1)
    expect(parent.activeIndex).toBe(0)
    expect(parentControls.prev.disabled).toBe(true)
    parentControls.next.click()
    expect(parent.activeIndex).toBe(1)
    expect(nested.activeIndex).toBe(1)
    parentControls.pagination.querySelectorAll<HTMLElement>(selector(TVIST_CLASSES.bullet))[3]!.click()
    expect(parent.activeIndex).toBe(3)
    expect(nested.activeIndex).toBe(1)
    childControls.pagination.querySelectorAll<HTMLElement>(selector(TVIST_CLASSES.bullet))[2]!.click()
    expect(nested.activeIndex).toBe(2)
    expect(parent.activeIndex).toBe(3)
    expect(parentControls.next.disabled).toBe(true)
    expect(childControls.next.disabled).toBe(true)
  })

  it('skips child controls and reuses parent controls appearing later inside a wrapper', () => {
    const child = mount(inner.root)
    const childControls = controls(inner.root)
    const parentControls = appendControls(outer.root)
    const parent = mount(outer.root)

    expect(controls(outer.root)).toEqual({ prev: null, next: null, pagination: null })
    expect(parentControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(4)
    expect(childControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(3)
    parentControls.next.click()
    expect(parent.activeIndex).toBe(1)
    expect(child.activeIndex).toBe(0)
    parent.destroy()
    expect(parentControls.prev.isConnected).toBe(true)
    expect(parentControls.next.textContent).toBe('Custom next')
    expect(parentControls.pagination.isConnected).toBe(true)
    expect(parentControls.pagination.children).toHaveLength(0)
    childControls.next.click()
    expect(child.activeIndex).toBe(1)
    expect(childControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(3)
  })

  it.each(['prev', 'next'] as const)('creates only the missing parent arrow when %s already exists', direction => {
    const child = mount(inner.root)
    const existing = document.createElement('button')
    existing.className = direction === 'prev' ? TVIST_CLASSES.arrowPrev : TVIST_CLASSES.arrowNext
    outer.root.appendChild(existing)
    const parent = mount(outer.root)
    const parentControls = controls(outer.root)
    expect(parentControls[direction]).toBe(existing)
    expect(parentControls.prev.parentElement).toBe(outer.root)
    expect(parentControls.next.parentElement).toBe(outer.root)
    parentControls.next.click()
    expect(parent.activeIndex).toBe(1)
    expect(child.activeIndex).toBe(0)
  })

  it('ignores child markup even when the child has not been initialized', () => {
    const childControls = appendControls(inner.root)
    childControls.pagination.textContent = 'Child placeholder'
    const parent = mount(outer.root)
    expect(controls(outer.root).next?.parentElement).toBe(outer.root)
    expect(childControls.pagination.textContent).toBe('Child placeholder')
    parent.destroy()
    expect(childControls.pagination.textContent).toBe('Child placeholder')
    const child = mount(inner.root)
    childControls.next.click()
    expect(child.activeIndex).toBe(1)
  })

  it('keeps child controls working when parent controls are toggled or destroyed', () => {
    const parent = mount(outer.root)
    const child = mount(inner.root)
    const childControls = controls(inner.root)
    const childBullets = Array.from(childControls.pagination.children)

    for (let cycle = 0; cycle < 3; cycle++) {
      parent.updateOptions({ arrows: false, pagination: false })
      expect(controls(outer.root)).toEqual({ prev: null, next: null, pagination: null })
      parent.updateOptions({ arrows: true, pagination: true })
      const parentControls = controls(outer.root)
      expect(parentControls.next?.parentElement).toBe(outer.root)
      expect(parentControls.pagination?.parentElement).toBe(outer.root)
      expect(Array.from(childControls.pagination.children)).toEqual(childBullets)
    }

    parent.destroy()
    childControls.next.click()
    expect(child.activeIndex).toBe(1)
    expect(controls(inner.root)).toEqual(childControls)
    const remountedParent = mount(outer.root)
    controls(outer.root).next.click()
    expect(remountedParent.activeIndex).toBe(1)
    expect(child.activeIndex).toBe(1)
    expect(Array.from(childControls.pagination.children)).toEqual(childBullets)
  })

  it('ignores controls in deeper nested roots', () => {
    const deep = createSliderFixture({ slidesCount: 2, width: 200 })
    inner.slides[0]!.appendChild(deep.root)
    try {
      const deepest = mount(deep.root)
      const child = mount(inner.root)
      const parent = mount(outer.root)
      const deepControls = controls(deep.root)
      expect(controls(inner.root).next?.parentElement).toBe(inner.root)
      expect(controls(outer.root).next?.parentElement).toBe(outer.root)
      expect(controls(inner.root).pagination?.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(3)
      expect(controls(outer.root).pagination?.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(4)
      deepControls.next.click()
      expect(deepest.activeIndex).toBe(1)
      expect(child.activeIndex).toBe(0)
      expect(parent.activeIndex).toBe(0)
    } finally {
      deep.cleanup()
    }
  })

  it.each(['selectors', 'elements'])('preserves explicit external controls supplied as %s with nested controls present', kind => {
    const child = mount(inner.root)
    const childControls = controls(inner.root)
    const external = document.createElement('div')
    document.body.appendChild(external)
    const parentControls = appendControls(external)
    parentControls.prev.id = 'parent-prev'
    parentControls.next.id = 'parent-next'
    parentControls.pagination.id = 'parent-pagination'
    try {
      const parent = mount(outer.root, {
        arrows: {
          prev: kind === 'selectors' ? '#parent-prev' : parentControls.prev,
          next: kind === 'selectors' ? '#parent-next' : parentControls.next,
        },
        pagination: { container: kind === 'selectors' ? '#parent-pagination' : parentControls.pagination },
      })
      expect(controls(outer.root)).toEqual({ prev: null, next: null, pagination: null })
      parentControls.next.click()
      expect(parent.activeIndex).toBe(1)
      expect(child.activeIndex).toBe(0)
      expect(childControls.pagination.querySelectorAll(selector(TVIST_CLASSES.bullet))).toHaveLength(3)
    } finally {
      external.remove()
    }
  })
})
