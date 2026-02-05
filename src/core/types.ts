/**
 * Базовые типы для Tvist
 */

import type { Tvist } from './Tvist'

/**
 * Расширение типа Tvist для модулей
 */
declare module './Tvist' {
  interface Tvist {
    /** Логический индекс текущего слайда (для loop режима) */
    realIndex?: number
  }
}

/**
 * Основные опции слайдера
 */
export interface TvistOptions {
  // Базовые настройки
  perPage?: number
  slideMinWidth?: number // Минимальная ширина слайда для автоматического расчета perPage
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
  fadeEffect?: {
    crossFade?: boolean
  }
  cubeEffect?: {
    slideShadows?: boolean
    shadow?: boolean
    shadowOffset?: number
    shadowScale?: number
    /** Perspective distance (px). Smaller = stronger depth (closer bigger, farther smaller). Default 800. */
    perspective?: number
    /** Perspective origin Y (%). Default 60 — join between faces appears lower. */
    perspectiveOriginY?: number
    /** Padding inside root so overflow:hidden doesn't clip rotating edges (px). Default 10. */
    viewportPadding?: number
  }
  
  // Thumbs
  thumbs?: {
    slider: Tvist
  }
  
  // Virtual
  virtual?: boolean | {
    addSlidesBefore?: number
    addSlidesAfter?: number
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- virtual slide data is user-defined */
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
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
    [key: string]: ((...args: any[]) => void) | undefined
  }
}

