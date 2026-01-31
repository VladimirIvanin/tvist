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
    // overflow !== visible forces transform-style: flat for descendants (spec). Use important to override _base.scss.
    root.style.setProperty('overflow', 'visible', 'important')

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
    container.style.transformOrigin = `50% 50% -${zOffset}px`
    
    // Override engine's translate with rotate
    container.style.transform = `translate3d(0,0,0) rotateY(${wrapperRotate}deg)`
    
    console.log('🔵 CUBE:', {
        translate: translate.toFixed(1),
        progressTotal: progressTotal.toFixed(2),
        wrapperRotate: wrapperRotate.toFixed(1)
    })
    
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

        // Set origin to cube center (rotation happens around this point)
        slide.style.transformOrigin = `50% 50% -${zOffset}px`
        
        // Z-Index and depth: angle relative to viewport (normalize to 0-360 range)
        let netAngle = (slideAngle + wrapperRotate) % 360
        if (netAngle < 0) netAngle += 360
        
        // Push each face outward from cube center so faces sit on cube surface.
        // Without this, all faces share the same 3D point → Chrome z-fighting at -230°..-244°.
        const transform = `rotateY(${slideAngle}deg) translateZ(${zOffset}px)`
        slide.style.transform = transform
        
        // Cosine = how "front" the face is. 0°→1, 180°→-1. Keep z-index for stacking fallback.
        const zIndex = Math.round(Math.cos(netAngle * Math.PI / 180) * 100)
        slide.style.zIndex = `${100 + zIndex}`
        
        // Calculate progress (distance from current position)
        // Similar to Swiper's slideEl.progress
        const slideProgress = i - progressTotal
        
        // Fix: Always render all slides for proper 3D cube structure.
        // Use z-index for visual occlusion (front faces have higher z-index).
        const isInRange = true
        
        // Chrome bug: backface-visibility: hidden can cull content layer while keeping
        // background visible (face visible, content transparent). Use visible so both
        // sides render; z-index above already orders faces correctly.
        slide.style.backfaceVisibility = 'visible'
        // @ts-ignore
        slide.style.webkitBackfaceVisibility = 'visible'

        // _base.scss sets content-visibility: auto on .tvist__slide. With 3D transforms,
        // Chrome can treat rotated faces as "off-screen" and skip painting children → content disappears.
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
