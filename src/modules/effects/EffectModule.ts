import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'
import { setFadeEffect } from './fade'
import { setCubeEffect } from './cube'
import { setStackEffect, cleanupStackCache } from './stack'
import { getPeekValueFromOptions } from '../../utils/peek'
import { getOptionsPerPage } from '../../utils/perPage'

export class EffectModule extends Module {
  name = 'effect'
  private slideProgress = new WeakMap<HTMLElement, number>()
  private currentEffect: TvistOptions['effect'] = 'slide'
  /** Чтобы снять longhand-padding после destroy / смены опций */
  private stackViewportPaddingApplied = false
  private readonly setTranslateHandler = this.onSetTranslate.bind(this)

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override shouldBeActive(): boolean {
    return (
      this.options.effect === 'fade' ||
      this.options.effect === 'cube' ||
      this.options.effect === 'stack'
    )
  }

  init(): void {
    if (!this.shouldBeActive()) {
      return
    }

    this.currentEffect = this.options.effect

    // Effects require perPage: 1
    if (getOptionsPerPage(this.options) !== 1) {
      if (this.options.debug) {
        console.warn(
          'Tvist: Effects work only with perPage: 1. Automatically setting perPage: 1'
        )
      }
      this.options.perPage = 1
      this.tvist.update()
    }
    
    // Set container styles for 3D
    if (this.options.effect === 'cube') {
      this.applyCubeRootStyles()
    }

    if (this.options.effect === 'stack') {
      this.applyStackRootStyles()
    }

    this.tvist.on('setTranslate', this.setTranslateHandler)
  }

  override onUpdate(): void {
    if (this.options.effect === 'stack') {
      this.applyStackViewportPadding()
      this.syncStackPileClass()
    }
  }

  destroy(): void {
    this.tvist.off('setTranslate', this.setTranslateHandler)
    this.cleanupEffectStyles(this.currentEffect)
    this.currentEffect = 'slide'
  }

  override onOptionsUpdate(): void {
    const nextEffect = this.options.effect ?? 'slide'

    if (nextEffect !== this.currentEffect) {
      this.cleanupEffectStyles(this.currentEffect)
      this.currentEffect = nextEffect

      if (nextEffect === 'cube') {
        this.applyCubeRootStyles()
      }

      if (nextEffect === 'stack') {
        this.applyStackRootStyles()
      }
      return
    }

    if (nextEffect === 'stack') {
      this.syncStackPileClass()
    }
  }

  private onSetTranslate(_tvist: Tvist, translate: number): void {
    const { slides } = this.tvist
    const slideSize = this.tvist.engine.slideSizeValue
    
    slides.forEach((slide, i) => {
      const slidePosition = this.tvist.engine.getSlidePosition(i)
      // translate is negative location
      const offset = translate + slidePosition
      const progress = offset / slideSize
      this.slideProgress.set(slide, progress)

      if (this.options.effect === 'fade') {
        setFadeEffect(slide, progress, this.options)
      }
    })
    
    if (this.options.effect === 'cube') {
      setCubeEffect(this.tvist, translate, this.options)
    }

    if (this.options.effect === 'stack') {
      setStackEffect(this.tvist, translate, this.options)
    }
  }

  private applyStackRootStyles(): void {
    this.tvist.root.classList.add(TVIST_CLASSES.stack)
    this.syncStackPileClass()
    this.applyStackViewportPadding()
  }

  private syncStackPileClass(): void {
    if (this.options.effect !== 'stack') return
    const usePile = this.options.stackEffect?.stackLayout === 'pile'
    this.tvist.root.classList.toggle(TVIST_CLASSES.stackPile, usePile)
    if (usePile) {
      this.tvist.container.style.width = '100%'
      this.tvist.container.style.height = '100%'
    } else {
      this.tvist.container.style.removeProperty('width')
      this.tvist.container.style.removeProperty('height')
    }
  }

  /**
   * После `Engine.applyPeek()` (в `update()`), иначе padding трека затирается longhand peek.
   */
  private applyStackViewportPadding(): void {
    const track = this.tvist.track
    const extra = this.options.stackEffect?.viewportPadding ?? 0
    if (extra <= 0) {
      if (this.stackViewportPaddingApplied) {
        track.style.removeProperty('padding-top')
        track.style.removeProperty('padding-right')
        track.style.removeProperty('padding-bottom')
        track.style.removeProperty('padding-left')
        track.style.removeProperty('box-sizing')
        this.stackViewportPaddingApplied = false
      }
      return
    }

    this.stackViewportPaddingApplied = true
    const o = this.options
    const sides = ['top', 'right', 'bottom', 'left'] as const
    for (const side of sides) {
      const base = getPeekValueFromOptions(o, side)
      const prop =
        side === 'top'
          ? 'paddingTop'
          : side === 'right'
            ? 'paddingRight'
            : side === 'bottom'
              ? 'paddingBottom'
              : 'paddingLeft'
      track.style[prop] = `${base + extra}px`
    }
    track.style.boxSizing = 'border-box'
  }

  private applyCubeRootStyles(): void {
    this.tvist.container.style.transformStyle = 'preserve-3d'
    this.tvist.root.classList.add(TVIST_CLASSES.cube)
    const padding = this.options.cubeEffect?.viewportPadding ?? 10
    this.tvist.track.style.padding = `${padding}px`
    this.tvist.track.style.boxSizing = 'border-box'
  }

  private cleanupEffectStyles(effect: TvistOptions['effect']): void {
    this.tvist.slides.forEach((slide) => {
      slide.style.opacity = ''
      slide.style.transform = ''
      slide.style.zIndex = ''
      slide.style.backfaceVisibility = ''
      slide.style.contentVisibility = ''
      slide.style.visibility = ''
      slide.querySelectorAll(`.${TVIST_CLASSES.block}-slide-shadow-cube`).forEach((shadow) => {
        shadow.remove()
      })
      slide.querySelectorAll(`.${TVIST_CLASSES.block}-slide-shadow`).forEach((shadow) => {
        shadow.remove()
      })
    })

    if (effect === 'cube') {
      this.tvist.container.style.transformStyle = ''
      this.tvist.container.style.width = ''
      this.tvist.container.style.height = ''
      this.tvist.container.style.transformOrigin = ''
      this.tvist.track.style.removeProperty('perspective')
      this.tvist.track.style.removeProperty('-webkit-perspective')
      this.tvist.track.style.removeProperty('perspective-origin')
      this.tvist.track.style.removeProperty('overflow')
      this.tvist.track.style.removeProperty('padding')
      this.tvist.track.style.removeProperty('box-sizing')
      this.tvist.root.classList.remove(TVIST_CLASSES.cube)
    }

    if (effect === 'stack') {
      this.tvist.container.style.transform = ''
      this.tvist.container.style.removeProperty('width')
      this.tvist.container.style.removeProperty('height')
      this.tvist.track.style.removeProperty('padding')
      this.tvist.track.style.removeProperty('padding-top')
      this.tvist.track.style.removeProperty('padding-right')
      this.tvist.track.style.removeProperty('padding-bottom')
      this.tvist.track.style.removeProperty('padding-left')
      this.tvist.track.style.removeProperty('box-sizing')
      this.stackViewportPaddingApplied = false
      this.tvist.root.classList.remove(TVIST_CLASSES.stack, TVIST_CLASSES.stackPile)
      cleanupStackCache(this.tvist)
    }
  }
}
