/**
 * Virtual Module — большие списки: в DOM только окно слайдов вокруг активного индекса.
 * Референс по идее: Swiper virtual (смещение первого слайда через margin).
 */

import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import { TVIST_SLIDE_INDEX_ATTR } from '../../utils/slideRealIndex'
import { getOptionsPerPage } from '../../utils/perPage'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions, VirtualOptions, VirtualSlideAPI } from '../../core/types'

function normalizeVirtual(v: TvistOptions['virtual']): VirtualOptions | null {
  if (v === undefined || v === null || v === false) return null
  if (v === true) return { cache: true }
  return v
}

function isLoopEnabled(options: TvistOptions): boolean {
  const l = options.loop
  return l === true || (typeof l === 'object' && l !== null && l.enabled !== false)
}

export class VirtualModule extends Module {
  readonly name = 'virtual'

  private slidesData: unknown[] = []

  private virtualOpts!: VirtualOptions

  private renderFn!: (data: unknown, index: number) => string

  private useCache = true

  private elementCache = new Map<number, HTMLElement>()

  private prevFrom = -1

  private prevTo = -1

  /** Защита от рекурсии tvist.update → onUpdate → syncWindow */
  private syncUpdateLock = false

  private readonly onTranslate = (): void => {
    if (!this.shouldBeActive()) return
    this.syncWindow(false)
  }

  private readonly onSlideBoundary = (): void => {
    if (!this.shouldBeActive()) return
    this.syncWindow(false)
  }

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  public override shouldBeActive(): boolean {
    const v = normalizeVirtual(this.options.virtual)
    if (!v) return false
    const hasSlidesOption = Array.isArray(v.slides) && v.slides.length > 0
    const hasDomSlides = this.tvist.slides.length > 0
    if (!hasSlidesOption && !hasDomSlides) return false
    if (isLoopEnabled(this.options)) return false
    if (this.options.autoWidth === true || this.options.autoHeight === true) return false
    if (this.options.grid !== undefined && this.options.grid !== null) return false
    if (this.options.marquee === true || typeof this.options.marquee === 'object') return false
    const fx = this.options.effect
    if (fx === 'cube' || fx === 'stack') return false
    return true
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    const v = normalizeVirtual(this.options.virtual)
    if (!v) return

    this.virtualOpts = v
    this.useCache = v.cache !== false

    if (Array.isArray(v.slides) && v.slides.length > 0) {
      this.slidesData = [...v.slides]
    } else {
      this.slidesData = this.tvist.slides.map((el) => el.innerHTML)
    }

    if (this.slidesData.length === 0) {
      console.warn('Tvist virtual: пустой список слайдов')
      return
    }

    this.renderFn =
      v.renderSlide ?? ((data: unknown, index: number) => this.defaultRender(data, index))

    const c = this.tvist.container
    while (c.firstChild) {
      c.removeChild(c.firstChild)
    }
    this.tvist.updateSlidesList()

    this.tvist.engine.setVirtualLogicalCount(this.slidesData.length)
    this.tvist.root.classList.add(TVIST_CLASSES.virtual)

    this.prevFrom = -1
    this.prevTo = -1
    this.syncWindow(true)

    this.on('setTranslate', this.onTranslate)
    this.on('slideChangeStart', this.onSlideBoundary)
    this.on('slideChangeEnd', this.onSlideBoundary)
  }

  override destroy(): void {
    this.off('setTranslate', this.onTranslate)
    this.off('slideChangeStart', this.onSlideBoundary)
    this.off('slideChangeEnd', this.onSlideBoundary)

    this.elementCache.clear()
    this.tvist.root.classList.remove(TVIST_CLASSES.virtual)
    this.tvist.engine.setVirtualLogicalCount(null)
    this.prevFrom = -1
    this.prevTo = -1
  }

  override onUpdate(): void {
    if (!this.shouldBeActive() || this.syncUpdateLock) return
    this.syncWindow(false)
  }

  override onSlideChange(): void {
    if (!this.shouldBeActive()) return
    this.syncWindow(false)
  }

  getVirtual(): VirtualSlideAPI {
    return {
      getSlideCount: () => this.slidesData.length,
      update: (force = false) => this.syncWindow(force),
      setSlides: (slides: unknown[]) => this.applySetSlides(slides),
    }
  }

  private applySetSlides(slides: unknown[]): void {
    if (!this.shouldBeActive()) return
    this.slidesData = [...slides]
    this.elementCache.clear()
    this.tvist.engine.setVirtualLogicalCount(this.slidesData.length)
    this.prevFrom = -1
    this.prevTo = -1
    this.syncWindow(true)
  }

  private defaultRender(data: unknown, _index: number): string {
    if (typeof data === 'string') return data
    return `<span>${String(data)}</span>`
  }

  private runTvistUpdate(): void {
    this.syncUpdateLock = true
    try {
      this.tvist.update()
    } finally {
      this.syncUpdateLock = false
    }
  }

  private createSlideElement(index: number): HTMLElement {
    const data = this.slidesData[index]
    const html = this.renderFn(data, index)
    const el = document.createElement('div')
    el.className = TVIST_CLASSES.slide
    el.setAttribute(TVIST_SLIDE_INDEX_ATTR, String(index))
    el.innerHTML = html
    return el
  }

  private applyLeadingOffset(): void {
    if (this.tvist.engine.getVirtualLogicalCount() == null) return
    const slides = [...this.tvist.slides]
    if (slides.length === 0) return

    const isVert = this.options.direction === 'vertical'
    slides.sort((a, b) => {
      const ia = parseInt(a.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '0', 10)
      const ib = parseInt(b.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '0', 10)
      return ia - ib
    })

    const container = this.tvist.container
    slides.forEach((el) => {
      container.appendChild(el)
    })

    const first = slides[0]
    if (!first) return
    const firstIdx = parseInt(first.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '0', 10)
    const pos = this.tvist.engine.getSlidePosition(firstIdx)
    const rounded = this.options.roundLengths === false ? pos : Math.round(pos)

    slides.forEach((el) => {
      el.style.marginLeft = ''
      el.style.marginTop = ''
    })

    if (isVert) {
      first.style.marginTop = `${rounded}px`
    } else {
      first.style.marginLeft = `${rounded}px`
    }
  }

  private syncWindow(force: boolean): void {
    if (!this.shouldBeActive()) return

    const total = this.slidesData.length
    if (total === 0) return

    const active = this.tvist.activeIndex
    const perPage = getOptionsPerPage(this.options)
    const group = this.options.slidesPerGroup ?? 1
    const addB = this.virtualOpts.addSlidesBefore ?? 0
    const addA = this.virtualOpts.addSlidesAfter ?? 0
    const buf = perPage + Math.max(0, group - 1)

    let from = Math.max(0, active - buf - addB)
    let to = Math.min(total - 1, active + buf + addA)

    if (this.options.center) {
      const half = Math.floor(perPage / 2)
      from = Math.max(0, active - buf - half - addB)
      to = Math.min(total - 1, active + buf + half + addA)
    }

    if (!force && from === this.prevFrom && to === this.prevTo) {
      this.applyLeadingOffset()
      return
    }

    this.prevFrom = from
    this.prevTo = to

    const container = this.tvist.container
    const slideSel = `.${TVIST_CLASSES.slide}`
    const existing = Array.from(container.querySelectorAll<HTMLElement>(slideSel)).filter(
      (el) => el.closest(`.${TVIST_CLASSES.block}`) === this.tvist.root
    )

    let domChanged = false

    for (const el of existing) {
      const idx = parseInt(el.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '-1', 10)
      if (Number.isNaN(idx) || idx < from || idx > to) {
        el.remove()
        if (this.useCache && !Number.isNaN(idx) && idx >= 0) {
          this.elementCache.set(idx, el)
        }
        domChanged = true
      }
    }

    this.tvist.updateSlidesList()

    const domIndices = new Set(
      this.tvist.slides.map((el) => parseInt(el.getAttribute(TVIST_SLIDE_INDEX_ATTR) ?? '-2', 10))
    )

    for (let i = from; i <= to; i++) {
      if (domIndices.has(i)) continue
      domChanged = true
      let el: HTMLElement
      if (this.useCache && this.elementCache.has(i)) {
        const cached = this.elementCache.get(i)
        this.elementCache.delete(i)
        el = cached ?? this.createSlideElement(i)
      } else {
        el = this.createSlideElement(i)
      }
      container.appendChild(el)
    }

    this.tvist.updateSlidesList()
    this.applyLeadingOffset()

    if (domChanged) {
      this.runTvistUpdate()
    }
  }
}
