import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export function setCubeEffect(
    tvist: Tvist,
    translate: number,
    options: TvistOptions
): void {
    const { slides, container, root } = tvist
    const cubeOptions = options.cubeEffect || {}
    const slideWidth = tvist.engine.slideWidthValue
    
    // Options
    const slideShadows = cubeOptions.slideShadows ?? true
    
    // Container Perspective & Transform
    // Perspective must be on the parent of the 3D transformed element
    root.style.perspective = '1000px'
    // @ts-ignore - webkit prefix
    root.style.webkitPerspective = '1000px'
    
    // Note: We do NOT set overflow: visible on root anymore.
    // _base.scss sets overflow: hidden, which is correct to prevent page scrollbars.
    // Since preserve-3d is on the container (child of root), root's overflow: hidden
    // simply clips the 3D scene without flattening the container's 3D context.


    container.style.transformStyle = 'preserve-3d'
    // @ts-ignore - webkit prefix
    container.style.webkitTransformStyle = 'preserve-3d'
    
    // Separate original slides from clones
    // Cube effect should only use original slides - clones cause overlapping faces
    const originalSlides = slides.filter(slide => 
        slide.dataset.tvistClone !== 'true'
    )
    const cloneSlides = slides.filter(slide => 
        slide.dataset.tvistClone === 'true'
    )
    
    // Hide all clones - cube is inherently cyclic and doesn't need them
    cloneSlides.forEach(clone => {
        clone.style.visibility = 'hidden'
    })
    
    const numOriginalSlides = originalSlides.length
    
    // Calculate wrapper rotation
    // translate corresponds to linear movement.
    // Width = 90 degrees.
    // We invert the rotation direction so that "next" slide (right) comes to front
    const progressTotal = -translate / slideWidth
    const wrapperRotate = -(progressTotal * 90)
    
    // Origin is deeper in Z (center of the cube)
    const zOffset = slideWidth / 2
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
        slide.style.position = 'absolute'
        slide.style.left = '0'
        slide.style.top = '0'
        slide.style.width = '100%'
        slide.style.height = '100%'

        // Reset any margin that might be set by the engine
        slide.style.margin = '0'
        
        // Fix for content clipping issues:
        // Ensure 3D context is preserved for children (content + shadows)
        slide.style.transformStyle = 'preserve-3d'
        // @ts-ignore
        slide.style.webkitTransformStyle = 'preserve-3d'

        // Set origin to center (standard rotation around own axis)
        // Previous logic using -zOffset caused gaps between faces
        slide.style.transformOrigin = '50% 50%'
        
        // Z-Index and depth: angle relative to viewport (normalize to 0-360 range)
        let netAngle = (slideAngle + wrapperRotate) % 360
        if (netAngle < 0) netAngle += 360
        
        // Standard Cube Logic: Rotate around center, then push out by radius (zOffset)
        const transform = `rotateY(${slideAngle}deg) translateZ(${zOffset}px)`
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
        slide.style.backfaceVisibility = 'hidden'
        // @ts-ignore
        slide.style.webkitBackfaceVisibility = 'hidden'

        // _base.scss sets content-visibility: auto. 
        slide.style.contentVisibility = 'visible'

        // Show only slides in range
        slide.style.visibility = isInRange ? 'visible' : 'hidden'
        
        const slideIndex = slide.dataset.tvistSlideIndex || i
        console.log(`  Slide ${slideIndex}: angle=${netAngle.toFixed(1)}° z=${zIndex} progress=${slideProgress.toFixed(2)} inRange=${isInRange} vis=${isInRange ? 'SHOW' : 'hide'}`)
        
        // Shadows
        if (slideShadows) {
             // Opacity increases as face turns away (sin of angle)
             // 0deg -> 0, 90deg -> 1
             let opacity = Math.abs(Math.sin(netAngle * Math.PI / 180))
             // Cap opacity to be less dark
             opacity = Math.min(opacity, 0.7)
             addSlideShadows(slide, opacity)
        }
    })
}

function addSlideShadows(slide: HTMLElement, opacity: number) {
    let shadow = slide.querySelector('.tvist-shadow') as HTMLElement
    if (!shadow) {
        shadow = document.createElement('div')
        shadow.className = 'tvist-shadow'
        shadow.style.position = 'absolute'
        shadow.style.left = '0'
        shadow.style.top = '0'
        shadow.style.width = '100%'
        shadow.style.height = '100%'
        shadow.style.pointerEvents = 'none'
        // shadow.style.transition = 'opacity 0.1s' // REMOVED: Causes flickering during drag
        shadow.style.background = 'rgba(0,0,0,1)' // Base color
        slide.appendChild(shadow)
    }
    
    shadow.style.opacity = opacity.toString()
}
