import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

// Кэш для разделения original/clone слайдов и теней
interface SlideShadows {
    left: HTMLElement
    right: HTMLElement
}

interface CubeCache {
    originalSlides: HTMLElement[]
    cloneSlides: HTMLElement[]
    shadows: WeakMap<HTMLElement, SlideShadows>
    lastSlidesList: HTMLElement[]
}

const cubeCache = new WeakMap<Tvist, CubeCache>()

function getCachedSlides(tvist: Tvist): { originalSlides: HTMLElement[], cloneSlides: HTMLElement[] } {
    const { slides } = tvist
    let cache = cubeCache.get(tvist)
    
    // Если кэш отсутствует или список слайдов изменился — пересоздаём
    if (!cache?.lastSlidesList || cache.lastSlidesList !== slides) {
        const originalSlides: HTMLElement[] = []
        const cloneSlides: HTMLElement[] = []
        
        // Один проход вместо двух filter
        for (const slide of slides) {
            if (slide.dataset.tvistClone === 'true') {
                cloneSlides.push(slide)
            } else {
                originalSlides.push(slide)
            }
        }
        
        cache = {
            originalSlides,
            cloneSlides,
            shadows: cache?.shadows ?? new WeakMap(),
            lastSlidesList: slides
        }
        cubeCache.set(tvist, cache)
    }
    
    return { originalSlides: cache.originalSlides, cloneSlides: cache.cloneSlides }
}

export function setCubeEffect(
    tvist: Tvist,
    translate: number,
    options: TvistOptions
): void {
    const { container, root } = tvist
    const cubeOptions = options.cubeEffect ?? {}
    const slideSize = tvist.engine.slideSizeValue

    // Container must have explicit size when slides are absolute (otherwise it collapses to 0)
    container.style.width = '100%'
    container.style.height = '100%'
    // Use actual rendered width for cube geometry — avoids gap when root has padding
    const faceWidth = container.clientWidth > 0 ? container.clientWidth : slideSize
    const zOffset = faceWidth / 2
    
    // Options
    const slideShadows = cubeOptions.slideShadows ?? true
    
    // Container Perspective & Transform
    // Perspective must be on the parent of the 3D transformed element.
    // Smaller value = stronger depth (closer bigger, farther smaller).
    const perspectivePx = cubeOptions.perspective ?? 800
    root.style.perspective = `${perspectivePx}px`
    root.style.webkitPerspective = `${perspectivePx}px`
    // Lower perspective-origin so the join between cube faces appears lower (natural view from above)
    const perspectiveOriginY = cubeOptions.perspectiveOriginY ?? 60
    root.style.perspectiveOrigin = `50% ${perspectiveOriginY}%`
    
    // Note: We do NOT set overflow: visible on root anymore.
    // _base.scss sets overflow: hidden, which is correct to prevent page scrollbars.
    // Since preserve-3d is on the container (child of root), root's overflow: hidden
    // simply clips the 3D scene without flattening the container's 3D context.


    container.style.transformStyle = 'preserve-3d'
    container.style.webkitTransformStyle = 'preserve-3d'
    
    // Используем кэшированные массивы вместо двух filter на каждом кадре
    const { originalSlides, cloneSlides } = getCachedSlides(tvist)
    
    // Hide all clones - cube is inherently cyclic and doesn't need them
    cloneSlides.forEach(clone => {
        clone.style.display = 'none'
    })
    
    const numOriginalSlides = originalSlides.length
    
    // Calculate wrapper rotation
    // translate corresponds to linear movement.
    // Width = 90 degrees.
    // We invert the rotation direction so that "next" slide (right) comes to front
    const progressTotal = -translate / slideSize
    const wrapperRotate = -(progressTotal * 90)

    // zOffset already computed from faceWidth above (cube radius = half of actual face width)
    // Fix: Rotate around the center of the cube (which is at 0,0,0 in local space because slides are pushed out)
    container.style.transformOrigin = `50% 50%`
    
    // Override engine's translate with rotate
    // Move the whole cube back by zOffset so the front face aligns with the screen plane (Z=0)
    container.style.transform = `translate3d(0,0,-${zOffset}px) rotateY(${wrapperRotate}deg)`
    
    // Process only original slides for cube faces
    originalSlides.forEach((slide, i) => {
        const slideAngle = i * 90
        
        // Fix for horizontal scroll and layout issues:
        // Use position: absolute to collapse the container width and avoid page overflow.
        // Moved to _cube.scss with !important

        // Reset any margin that might be set by the engine
        // Moved to _cube.scss with !important
        
        // Fix for content clipping issues:
        // Ensure 3D context is preserved for children (content + shadows)
        // Moved to _cube.scss

        // Set origin to center (standard rotation around own axis)
        // Previous logic using -zOffset caused gaps between faces
        // Moved to _cube.scss with !important
        
        // Z-Index and depth: angle relative to viewport (normalize to 0-360 range)
        let netAngle = (slideAngle + wrapperRotate) % 360
        if (netAngle < 0) netAngle += 360
        
        // Standard Cube Logic: Rotate around center, then push out by radius (zOffset)
        const transform = `rotateY(${slideAngle}deg) translate3d(0, 0, ${zOffset}px)`
        slide.style.transform = transform
        
        // Cosine = how "front" the face is. 0°→1, 180°→-1. Keep z-index for stacking fallback.
        const zIndex = Math.round(Math.cos(netAngle * Math.PI / 180) * 100)
        slide.style.zIndex = `${100 + zIndex}`
        
        // Calculate progress (distance from current position)
        // Fix for loop mode: normalize diff to be within half of the slide count range.
        let slideProgress = i - progressTotal
        if (Math.abs(slideProgress) > numOriginalSlides / 2) {
             slideProgress -= numOriginalSlides * Math.round(slideProgress / numOriginalSlides)
        }
        
        // Fix: Hide slides that are out of bounds (preventing them from flying around screen)
        // Show only active slide and immediate neighbors (enough for a cube corner)
        // Range 1 is enough because we only see at most 2 faces at once (or one full face).
        const isInRange = Math.abs(slideProgress) <= 1
        
        // Chrome bug workaround: Sometimes Chrome fails to render content with hidden backface.
        // However, for a proper cube effect, we MUST hide backfaces to avoid seeing inside the cube.
        // We rely on z-index to handle sorting, but backface-visibility: hidden gives the cleanest look.
        // Moved to _cube.scss

        // _base.scss sets content-visibility: auto. 
        // Moved to _cube.scss with !important

        // Show only slides in range
        slide.style.visibility = isInRange ? 'visible' : 'hidden'
        
        // Shadows 
        if (slideShadows && isInRange) {
             // Вычисляем progress на основе угла поворота грани относительно фронтальной позиции
             // Нормализуем угол в диапазон -180 до 180
             let angleDiff = netAngle
             if (angleDiff > 180) angleDiff -= 360
             
             // progress = угол поворота / 90 градусов
             // При повороте от 0° к 90°: progress идёт от 0 к 1
             // При повороте от 0° к -90°: progress идёт от 0 к -1
             const progress = Math.max(Math.min(angleDiff / 90, 1), -1)
             createSlideShadows(slide, progress, tvist)
        }
    })
}

/**
 * Создаёт и обновляет тени на слайде
 * Две тени: left (видна при повороте влево) и right (видна при повороте вправо)
 */
function createSlideShadows(slide: HTMLElement, progress: number, tvist: Tvist) {
    const cache = cubeCache.get(tvist)
    if (!cache) return
    
    let shadows = cache.shadows.get(slide)
    
    // Создаём тени если их ещё нет
    if (!shadows) {
        const shadowLeft = document.createElement('div')
        const shadowRight = document.createElement('div')
        
        const prefix = TVIST_CLASSES.block
        shadowLeft.className = `${prefix}-slide-shadow-cube ${prefix}-slide-shadow-left`
        shadowRight.className = `${prefix}-slide-shadow-cube ${prefix}-slide-shadow-right`
        
        // Все стили определены в _cube.scss, только добавляем элементы в DOM
        slide.appendChild(shadowLeft)
        slide.appendChild(shadowRight)
        
        shadows = { left: shadowLeft, right: shadowRight }
        cache.shadows.set(slide, shadows)
    }
    
    // Обновляем opacity:
    // - Левая тень видна когда progress < 0 (слайд поворачивается влево/приходит)
    // - Правая тень видна когда progress > 0 (слайд поворачивается вправо/уходит)
    const leftOpacity = Math.max(-progress, 0)
    const rightOpacity = Math.max(progress, 0)
    
    shadows.left.style.opacity = leftOpacity.toString()
    shadows.right.style.opacity = rightOpacity.toString()
}
