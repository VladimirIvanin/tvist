/**
 * Базовые типы для Tvist
 */

import type { Tvist } from './Tvist'

/**
 * Основные опции слайдера
 */
export interface TvistOptions {
  // Базовые настройки
  perPage?: number
  gap?: number
  speed?: number
  direction?: 'horizontal' | 'vertical'
  
  // Начальные значения
  start?: number
  
  // Drag
  drag?: boolean | 'free'
  dragSpeed?: number
  rubberband?: boolean
  focusableElements?: string
  
  // Navigation
  arrows?: boolean | {
    prev?: string | HTMLElement
    next?: string | HTMLElement
    disabledClass?: string
    hiddenClass?: string
  }
  
  // Pagination
  pagination?: boolean | {
    container?: string | HTMLElement
    type?: 'bullets' | 'fraction' | 'progress' | 'custom'
    clickable?: boolean
    bulletClass?: string
    bulletActiveClass?: string
    renderBullet?: (index: number, className: string) => string
    renderFraction?: (current: number, total: number) => string
    renderCustom?: (current: number, total: number) => string
  }
  
  // Autoplay
  autoplay?: number | boolean
  pauseOnHover?: boolean
  pauseOnInteraction?: boolean
  disableOnInteraction?: boolean
  
  // Loop
  loop?: boolean | 'auto'
  
  // Lazy loading
  lazy?: boolean | {
    preloadPrevNext?: number
  }
  
  // Effects
  effect?: 'slide' | 'fade' | 'cube' | 'card'
  crossFade?: boolean
  
  // Thumbs
  thumbs?: {
    slider: Tvist
  }
  
  // Virtual
  virtual?: boolean | {
    addSlidesBefore?: number
    addSlidesAfter?: number
    renderSlide?: (data: any, index: number) => string
  }
  
  // Marquee
  marquee?: boolean | {
    speed?: number
    direction?: 'left' | 'right'
    pauseOnHover?: boolean
  }
  
  // Keyboard
  keyboard?: boolean | {
    enabled?: boolean
    onlyInViewport?: boolean
  }
  
  // Wheel
  wheel?: boolean | {
    sensitivity?: number
    releaseOnEdges?: boolean
  }
  
  // Responsive
  breakpoints?: Record<number, Partial<TvistOptions>>
  breakpointsBase?: 'window' | 'container'
  
  // Обработчики событий
  on?: {
    created?: (tvist: Tvist) => void
    destroyed?: (tvist: Tvist) => void
    beforeSlideChange?: (index: number) => void
    slideChange?: (index: number) => void
    slideChanged?: (index: number) => void
    dragStart?: () => void
    drag?: () => void
    dragEnd?: () => void
    scroll?: () => void
    resize?: () => void
    breakpoint?: (breakpoint: number | null) => void
    [key: string]: ((...args: any[]) => void) | undefined
  }
}

