import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import type { TvistOptions } from '@core/types'
import { createSliderFixture, type SliderFixture } from '../fixtures'
import '../../src/modules/navigation'
import '../../src/modules/pagination'
import '../../src/modules/breakpoints'
import '../../src/modules/loop'

describe('Automatically created controls', () => {
  const fixtures: SliderFixture[] = []
  const sliders: Tvist[] = []

  function fixture(slidesCount = 4): SliderFixture {
    const result = createSliderFixture({ slidesCount, width: 800 })
    fixtures.push(result)
    return result
  }

  function mount(root: HTMLElement, options: TvistOptions = {}): Tvist {
    const slider = new Tvist(root, { speed: 0, ...options })
    sliders.push(slider)
    return slider
  }

  function controls(root: HTMLElement) {
    return {
      prev: root.querySelector<HTMLButtonElement>(`.${TVIST_CLASSES.arrowPrev}`)!,
      next: root.querySelector<HTMLButtonElement>(`.${TVIST_CLASSES.arrowNext}`)!,
      pagination: root.querySelector<HTMLElement>(`.${TVIST_CLASSES.pagination}`)!,
    }
  }

  function expectSingleControls(root: HTMLElement): void {
    for (const className of [TVIST_CLASSES.arrowPrev, TVIST_CLASSES.arrowNext, TVIST_CLASSES.pagination]) {
      expect(root.querySelectorAll(`.${className}`)).toHaveLength(1)
    }
  }

  afterEach(() => {
    sliders.forEach(slider => slider.destroy())
    fixtures.forEach(result => result.cleanup())
    sliders.length = 0
    fixtures.length = 0
    vi.restoreAllMocks()
  })

  it.each([{}, { arrows: false, pagination: false }])('does not create controls without enabled options: %j', options => {
    const { root } = fixture()
    mount(root, options)
    expect(root.querySelectorAll(`.${TVIST_CLASSES.arrowPrev}, .${TVIST_CLASSES.arrowNext}, .${TVIST_CLASSES.pagination}`)).toHaveLength(0)
  })

  it.each([
    { arrows: true, pagination: true },
    { arrows: {}, pagination: {} },
  ])('creates working controls for enabled options: %j', options => {
    const { root, track, container } = fixture()
    const slider = mount(root, options)
    const { prev, next, pagination } = controls(root)

    expectSingleControls(root)
    for (const element of [prev, next, pagination]) {
      expect(element.parentElement).toBe(root)
      expect(track.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(container.contains(element)).toBe(false)
    }
    expect(prev.type).toBe('button')
    expect(next.type).toBe('button')
    expect(prev.getAttribute('aria-label')).toBe('Предыдущий слайд')
    expect(next.getAttribute('aria-label')).toBe('Следующий слайд')
    expect(prev.classList.contains(`${TVIST_CLASSES.block}__arrow`)).toBe(true)
    expect(next.classList.contains(`${TVIST_CLASSES.block}__arrow`)).toBe(true)
    expect(prev.querySelector('svg')).not.toBeNull()
    expect(next.querySelector('svg')).not.toBeNull()
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(false)

    next.click()
    expect(slider.activeIndex).toBe(1)
    expect(prev.disabled).toBe(false)
    prev.click()
    expect(slider.activeIndex).toBe(0)

    const bullets = pagination.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)
    expect(bullets).toHaveLength(4)
    bullets[3]!.click()
    expect(slider.activeIndex).toBe(3)
    expect(bullets[3]!.classList.contains(TVIST_CLASSES.bulletActive)).toBe(true)
    expect(next.disabled).toBe(true)
  })

  it('respects addIcons: false for newly created arrows', () => {
    const { root } = fixture()
    mount(root, { arrows: { addIcons: false } })
    expect(controls(root).prev.querySelector('svg')).toBeNull()
    expect(controls(root).next.querySelector('svg')).toBeNull()
  })

  it.each(['prev', 'next'] as const)('creates only the missing arrow when %s already exists', direction => {
    const { root } = fixture()
    const existing = document.createElement('button')
    existing.className = direction === 'prev' ? TVIST_CLASSES.arrowPrev : TVIST_CLASSES.arrowNext
    existing.textContent = 'Custom arrow'
    root.appendChild(existing)
    const slider = mount(root, { arrows: true })

    expect(controls(root)[direction]).toBe(existing)
    expect(existing.textContent).toBe('Custom arrow')
    expect(root.querySelectorAll('button')).toHaveLength(2)
    slider.destroy()
    expect(root.querySelectorAll('button')).toHaveLength(1)
    expect(existing.parentElement).toBe(root)
  })

  it.each(['selectors', 'elements'] as const)('reuses external controls passed as %s and preserves them on destroy', kind => {
    const { root } = fixture()
    const prev = document.createElement('button')
    const next = document.createElement('button')
    const pagination = document.createElement('div')
    prev.id = 'external-prev'
    next.id = 'external-next'
    pagination.id = 'external-pagination'
    next.textContent = 'Next'
    document.body.append(prev, next, pagination)
    const slider = mount(root, {
      arrows: { prev: kind === 'selectors' ? '#external-prev' : prev, next: kind === 'selectors' ? '#external-next' : next },
      pagination: { container: kind === 'selectors' ? '#external-pagination' : pagination },
    })
    expect(controls(root)).toEqual({ prev: null, next: null, pagination: null })
    next.click()
    expect(slider.activeIndex).toBe(1)
    pagination.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)[2]!.click()
    expect(slider.activeIndex).toBe(2)

    const nextSpy = vi.spyOn(slider, 'next')
    slider.destroy()
    next.click()
    expect(nextSpy).not.toHaveBeenCalled()
    expect(prev.isConnected).toBe(true)
    expect(next.isConnected).toBe(true)
    expect(next.textContent).toBe('Next')
    expect(pagination.isConnected).toBe(true)
    expect(pagination.children).toHaveLength(0)
  })

  it('falls back to standard elements before creating controls for missing selectors', () => {
    const { root } = fixture()
    const prev = document.createElement('button')
    prev.className = TVIST_CLASSES.arrowPrev
    const pagination = document.createElement('div')
    pagination.className = TVIST_CLASSES.pagination
    root.append(prev, pagination)
    const slider = mount(root, {
      arrows: { prev: '#missing-prev', next: '#missing-next' },
      pagination: { container: '#missing-pagination' },
    })
    expectSingleControls(root)
    expect(controls(root).prev).toBe(prev)
    expect(controls(root).pagination).toBe(pagination)
    slider.destroy()
    expect(root.querySelectorAll('button')).toHaveLength(1)
    expect(pagination.parentElement).toBe(root)
  })

  it('creates controls when custom selectors and standard elements are absent', () => {
    const { root } = fixture()
    mount(root, {
      arrows: { prev: '#missing-prev', next: '#missing-next' },
      pagination: { container: '#missing-pagination' },
    })
    expectSingleControls(root)
  })

  it.each(['bullets', 'fraction', 'progress', 'custom'] as const)('renders %s in an automatically created container', type => {
    const { root } = fixture()
    const slider = mount(root, {
      pagination: { type, renderCustom: (current, total) => `<strong>${current} of ${total}</strong>` },
    })
    const { pagination } = controls(root)
    expect(pagination.parentElement).toBe(root)
    slider.scrollTo(2, { instant: true })
    if (type === 'bullets') {
      expect(pagination.querySelectorAll(`.${TVIST_CLASSES.bullet}`)).toHaveLength(4)
      expect(pagination.querySelector(`.${TVIST_CLASSES.bulletActive}`)?.getAttribute('data-index')).toBe('2')
    } else if (type === 'fraction') {
      expect(pagination.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)?.textContent).toBe('3')
      expect(pagination.querySelector(`.${TVIST_CLASSES.paginationTotal}`)?.textContent).toBe('4')
    } else if (type === 'progress') {
      expect(pagination.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`)?.style.width).toBe('75%')
    } else {
      expect(pagination.querySelector('strong')?.textContent).toBe('3 of 4')
    }
  })

  it('updates without replacing or duplicating automatically created controls', () => {
    const { root } = fixture()
    const slider = mount(root, { arrows: true, pagination: true })
    const initial = controls(root)
    slider.update()
    slider.updateOptions({ perPage: 2 })
    expectSingleControls(root)
    expect(controls(root)).toEqual(initial)
    expect(initial.pagination.querySelectorAll(`.${TVIST_CLASSES.bullet}`)).toHaveLength(3)
  })

  it.each([true, 'free'] as const)('removes generated controls and subscriptions across toggles with drag: %s', drag => {
    const { root } = fixture()
    const slider = mount(root, { drag })
    const externalHandler = vi.fn()
    slider.on('slideChangeEnd', externalHandler)
    const events = ['slideChangeStart', 'slideChangeEnd', 'transitionEnd', 'lock', 'unlock', 'scroll', 'loopFix']
    const listenerCounts = () => events.map(event => slider['events'].listenerCount(event))
    const baseline = listenerCounts()
    const nextSpy = vi.spyOn(slider, 'next')
    const scrollSpy = vi.spyOn(slider, 'scrollTo')

    for (let cycle = 0; cycle < 3; cycle++) {
      slider.updateOptions({ arrows: true, pagination: true })
      expectSingleControls(root)
      const { prev, next, pagination } = controls(root)
      const bullet = pagination.querySelector<HTMLElement>(`.${TVIST_CLASSES.bullet}`)!
      nextSpy.mockClear()
      next.click()
      expect(nextSpy).toHaveBeenCalledTimes(1)
      slider.updateOptions({ arrows: false, pagination: false })
      expect(listenerCounts()).toEqual(baseline)
      expect(prev.isConnected).toBe(false)
      expect(next.isConnected).toBe(false)
      expect(pagination.isConnected).toBe(false)
      nextSpy.mockClear()
      scrollSpy.mockClear()
      next.click()
      bullet.click()
      expect(nextSpy).not.toHaveBeenCalled()
      expect(scrollSpy).not.toHaveBeenCalled()
    }
    externalHandler.mockClear()
    slider.emit('slideChangeEnd', 0)
    expect(externalHandler).toHaveBeenCalledTimes(1)
  })

  it('preserves manually supplied controls across option toggles', () => {
    const { root } = fixture()
    const prev = document.createElement('button')
    prev.className = TVIST_CLASSES.arrowPrev
    const next = document.createElement('button')
    next.className = TVIST_CLASSES.arrowNext
    const pagination = document.createElement('div')
    pagination.className = TVIST_CLASSES.pagination
    root.append(prev, next, pagination)
    const slider = mount(root, { arrows: true, pagination: true })
    const nextSpy = vi.spyOn(slider, 'next')
    slider.updateOptions({ arrows: false, pagination: false })
    next.click()
    expect(nextSpy).not.toHaveBeenCalled()
    expectSingleControls(root)
    expect(pagination.children).toHaveLength(0)
    slider.updateOptions({ arrows: true, pagination: true })
    expect(controls(root)).toEqual({ prev, next, pagination })
    next.click()
    expect(nextSpy).toHaveBeenCalledTimes(1)
    slider.destroy()
    expectSingleControls(root)
  })

  it('removes generated controls on destroy and supports remounting the same root', () => {
    const { root } = fixture()
    mount(root, { arrows: true, pagination: true }).destroy()
    expect(root.children).toHaveLength(1)
    const slider = mount(root, { arrows: true, pagination: true })
    expectSingleControls(root)
    controls(root).next.click()
    expect(slider.activeIndex).toBe(1)
  })

  it('toggles generated controls through window breakpoints without duplicates', () => {
    window.innerWidth = 1200
    const { root } = fixture()
    const slider = mount(root, {
      arrows: true,
      pagination: true,
      breakpoints: { 767: { arrows: false, pagination: false } },
    })
    for (let cycle = 0; cycle < 3; cycle++) {
      window.innerWidth = 600
      expect(slider.getModule('navigation')).toBeUndefined()
      expect(slider.getModule('pagination')).toBeUndefined()
      expect(root.children).toHaveLength(1)
      window.innerWidth = 1200
      expectSingleControls(root)
    }
    controls(root).next.click()
    expect(slider.activeIndex).toBe(1)
  })

  it.each([true, false])('respects hideWhenSinglePage: %s', hideWhenSinglePage => {
    const { root } = fixture(1)
    mount(root, {
      arrows: { hideWhenSinglePage },
      pagination: { hideWhenSinglePage },
    })
    const { prev, next, pagination } = controls(root)
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(true)
    expect(prev.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(hideWhenSinglePage)
    expect(next.classList.contains(TVIST_CLASSES.arrowHidden)).toBe(hideWhenSinglePage)
    expect(pagination.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(hideWhenSinglePage)
  })

  it('supports loop controls and cancels pending pagination updates on disable', () => {
    const { root } = fixture()
    const slider = mount(root, { loop: true, arrows: true, pagination: true })
    const { prev, next, pagination } = controls(root)
    expect(prev.disabled).toBe(false)
    expect(next.disabled).toBe(false)
    expect(pagination.querySelectorAll(`.${TVIST_CLASSES.bullet}`)).toHaveLength(4)
    next.click()
    expect(slider.realIndex).toBe(1)
    const module = slider.getModule('pagination')!
    slider.emit('loopFix')
    const frameId = (module as unknown as { updateFrameId: number | null }).updateFrameId
    expect(frameId).not.toBeNull()
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    slider.updateOptions({ pagination: false })
    expect(cancelSpy).toHaveBeenCalledWith(frameId)
    expect(pagination.isConnected).toBe(false)
    const requestSpy = vi.spyOn(globalThis, 'requestAnimationFrame')
    slider.emit('loopFix')
    slider.emit('slideChangeEnd', 1)
    expect(requestSpy).not.toHaveBeenCalled()
    slider.updateOptions({ pagination: true })
    expectSingleControls(root)
  })

  it('keeps controls independent between multiple sliders', () => {
    const first = fixture()
    const second = fixture()
    const firstSlider = mount(first.root, { arrows: true, pagination: true })
    const secondSlider = mount(second.root, { arrows: true, pagination: true })
    controls(first.root).next.click()
    expect(firstSlider.activeIndex).toBe(1)
    expect(secondSlider.activeIndex).toBe(0)
    firstSlider.destroy()
    expectSingleControls(second.root)
    controls(second.root).pagination.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)[2]!.click()
    expect(secondSlider.activeIndex).toBe(2)
  })
})
