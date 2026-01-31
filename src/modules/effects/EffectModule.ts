import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'
import { setFadeEffect } from './fade'
import { setCubeEffect } from './cube'

export class EffectModule extends Module {
  name = 'effect'

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  init(): void {
    if (!this.options.effect || this.options.effect === 'slide') {
      return
    }

    // Effects require perPage: 1
    if (this.options.perPage !== 1) {
      console.warn(
        'Tvist: Effects work only with perPage: 1. Automatically setting perPage: 1'
      )
      this.options.perPage = 1
      this.tvist.update()
    }
    
    // Set container styles for 3D
    if (this.options.effect === 'cube') {
        this.tvist.container.style.transformStyle = 'preserve-3d'
        this.tvist.root.style.overflow = 'visible' // Cube might extend
    }

    this.tvist.on('setTranslate', this.onSetTranslate.bind(this))
  }

  destroy(): void {
    this.tvist.off('setTranslate', this.onSetTranslate.bind(this))
    
    // Reset styles
    this.tvist.slides.forEach(slide => {
        slide.style.opacity = ''
        slide.style.transform = ''
        slide.style.zIndex = ''
        slide.style.backfaceVisibility = ''
        slide.style.visibility = ''
    })
    this.tvist.container.style.transformStyle = ''
    this.tvist.container.style.perspective = ''
    this.tvist.root.style.overflow = ''
  }

  private onSetTranslate(tvist: Tvist, translate: number): void {
    const { slides } = this.tvist
    const slideWidth = this.tvist.engine.slideWidthValue
    
    slides.forEach((slide, i) => {
      const slidePosition = this.tvist.engine.getSlidePosition(i)
      // translate is negative location
      const offset = translate + slidePosition
      const progress = offset / slideWidth
      
      // Store progress
      ;(slide as any).progress = progress
      
      if (this.options.effect === 'fade') {
        setFadeEffect(slide, progress, this.options)
      }
    })
    
    if (this.options.effect === 'cube') {
        setCubeEffect(this.tvist, translate, this.options)
    }
  }
}
