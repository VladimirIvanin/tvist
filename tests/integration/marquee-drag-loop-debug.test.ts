/**
 * Отладочный тест для marquee + drag + loop
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/marquee'
import '../../src/modules/drag'
import '../../src/modules/loop'

describe('DEBUG: Marquee + Drag + Loop', () => {
  let root: HTMLElement
  let slider: Tvist | null = null
  let container: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '800px'
    root.innerHTML = `
      <div class="${TVIST_CLASSES.container}">
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 1</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 2</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 3</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 4</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 5</div>
      </div>
    `
    document.body.appendChild(root)
    container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    document.body.removeChild(root)
  })

  const getTranslateX = (element: HTMLElement): number => {
    const transform = element.style.transform
    if (!transform) return 0
    const match = transform.match(/translate3d\(([^,]+)/)
    if (!match) return 0
    return parseFloat(match[1])
  }

  it('DEBUG: drag с начальной позицией marquee (100px)', async () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'left'
      },
      drag: true,
      loop: true,
      gap: 20
    })

    const marqueeModule = slider.getModule('marquee') as any
    const dragModule = slider.getModule('drag') as any
    const loopModule = slider.getModule('loop') as any

    // Симулируем что marquee уже прокрутился на 100px
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(100)
      container.style.transform = 'translate3d(-100px, 0, 0)'
    }

    console.log('\n===НАЧАЛЬНОЕ СОСТОЯНИЕ (marquee на 100px) ===')
    console.log('Location:', slider.engine.location.get())
    console.log('Transform:', getTranslateX(container))
    console.log('Marquee position:', marqueeModule.getCurrentPosition())
    console.log('Slides order:', loopModule.getTransformState().slidesOrder.join(', '))

    // Начинаем drag
    const downEvent = new PointerEvent('pointerdown', {
      clientX: 400,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    root.dispatchEvent(downEvent)
    await new Promise(resolve => setTimeout(resolve, 10))

    console.log('\n=== ПОСЛЕ POINTERDOWN ===')
    console.log('Location:', slider.engine.location.get())
    console.log('Transform:', getTranslateX(container))
    console.log('Marquee position:', marqueeModule.getCurrentPosition())
    console.log('Slides order:', loopModule.getTransformState().slidesOrder.join(', '))
    console.log('DragModule.startMarqueePosition:', (dragModule as any).startMarqueePosition)

    // Первое движение (превышает threshold + вызывает loopFix)
    const moveEvent1 = new PointerEvent('pointermove', {
      clientX: 415,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(moveEvent1)
    await new Promise(resolve => setTimeout(resolve, 10))

    console.log('\n=== ПОСЛЕ ПЕРВОГО ДВИЖЕНИЯ (15px) ===')
    console.log('Location:', slider.engine.location.get())
    console.log('Transform:', getTranslateX(container))
    console.log('Marquee position:', marqueeModule.getCurrentPosition())
    console.log('Slides order:', loopModule.getTransformState().slidesOrder.join(', '))
    console.log('DragModule.startMarqueePosition:', (dragModule as any).startMarqueePosition)
    console.log('DragModule.startPosition:', (dragModule as any).startPosition)
    console.log('DragModule.startX:', (dragModule as any).startX)
    console.log('DragModule.startY:', (dragModule as any).startY)

    // Второе движение
    const moveEvent2 = new PointerEvent('pointermove', {
      clientX: 430,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(moveEvent2)
    await new Promise(resolve => setTimeout(resolve, 10))

    console.log('\n=== ПОСЛЕ ВТОРОГО ДВИЖЕНИЯ (30px) ===')
    console.log('Location:', slider.engine.location.get())
    console.log('Transform:', getTranslateX(container))
    console.log('Marquee position:', marqueeModule.getCurrentPosition())
    console.log('Slides order:', loopModule.getTransformState().slidesOrder.join(', '))

    // Завершаем drag
    const upEvent = new PointerEvent('pointerup', {
      clientX: 430,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(upEvent)
    await new Promise(resolve => setTimeout(resolve, 10))

    console.log('\n=== ПОСЛЕ POINTERUP ===')
    console.log('Location:', slider.engine.location.get())
    console.log('Transform:', getTranslateX(container))
    console.log('Marquee position:', marqueeModule.getCurrentPosition())
    console.log('Slides order:', loopModule.getTransformState().slidesOrder.join(', '))

    // Финальные проверки
    const finalLocation = slider.engine.location.get()
    console.log('\n=== ИТОГОВАЯ ПРОВЕРКА ===')
    console.log('Финальный location:', finalLocation)
    console.log('Location должен быть <= 0:', finalLocation <= 0)

    expect(finalLocation).toBeLessThanOrEqual(0)
  })
})
