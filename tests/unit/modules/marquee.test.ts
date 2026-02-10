/**
 * Marquee Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../../src/modules/marquee' // Импортируем для регистрации
import { MarqueeModule } from '../../../src/modules/marquee'

describe('MarqueeModule', () => {
  let root: HTMLElement
  let slider: Tvist | null = null

  beforeEach(() => {
    // Создаём DOM структуру
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.innerHTML = `
      <div class="${TVIST_CLASSES.container}">
        <div class="${TVIST_CLASSES.slide}">Slide 1</div>
        <div class="${TVIST_CLASSES.slide}">Slide 2</div>
        <div class="${TVIST_CLASSES.slide}">Slide 3</div>
      </div>
    `
    document.body.appendChild(root)
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    document.body.removeChild(root)
  })

  it('должен создавать модуль при marquee: true', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    const module = slider.modules.get('marquee')
    expect(module).toBeDefined()
    expect(module?.name).toBe('marquee')
  })

  it('не должен быть активным при marquee: false', () => {
    slider = new Tvist(root, {
      marquee: false
    })

    expect(slider.slides.length).toBe(3)
  })

  it('должен сохранять исходное количество слайдов при marquee: true', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    const slides = slider.slides
    expect(slides.length).toBe(3)
  })

  it('должен применять настройки скорости и направления', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'right'
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()
    
    expect(api?.getSpeed()).toBe(100)
    expect(api?.getDirection()).toBe('right')
  })

  it('должен использовать дефолтные значения', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()
    
    expect(api?.getSpeed()).toBe(50) // дефолтная скорость
    expect(api?.getDirection()).toBe('left') // дефолтное направление для horizontal
  })

  it('должен использовать дефолтное направление для vertical', () => {
    slider = new Tvist(root, {
      direction: 'vertical',
      marquee: true
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()
    
    expect(api?.getDirection()).toBe('up') // дефолтное направление для vertical
  })

  it('публичное API должно работать', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()

    expect(api).toBeDefined()
    expect(typeof api?.start).toBe('function')
    expect(typeof api?.stop).toBe('function')
    expect(typeof api?.pause).toBe('function')
    expect(typeof api?.resume).toBe('function')
    expect(typeof api?.setSpeed).toBe('function')
    expect(typeof api?.setDirection).toBe('function')
  })

  it('должен изменять скорость через API', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 50
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()

    api?.setSpeed(200)
    expect(api?.getSpeed()).toBe(200)
  })

  it('должен изменять направление через API', () => {
    slider = new Tvist(root, {
      marquee: {
        direction: 'left'
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()

    api?.setDirection('right')
    expect(api?.getDirection()).toBe('right')
  })

  it('должен эмитить события', () => {
    const onMarqueeStart = vi.fn()
    const onMarqueeStop = vi.fn()

    slider = new Tvist(root, {
      marquee: true,
      on: {
        marqueeStart: onMarqueeStart,
        marqueeStop: onMarqueeStop
      }
    })

    // Start вызывается автоматически при init
    expect(onMarqueeStart).toHaveBeenCalled()

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()

    api?.stop()
    expect(onMarqueeStop).toHaveBeenCalled()
  })

  it('при destroy слайды остаются в DOM', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    expect(slider.slides.length).toBe(3)

    slider.destroy()

    const container = root.querySelector(`.${TVIST_CLASSES.container}`)
    const remainingSlides = container?.querySelectorAll(`.${TVIST_CLASSES.slide}`)
    expect(remainingSlides?.length).toBe(3)
  })

  it('должен поддерживать динамическое включение/выключение', () => {
    slider = new Tvist(root, {
      marquee: false
    })

    expect(slider.slides.length).toBe(3)

    slider.updateOptions({
      marquee: {
        speed: 80
      }
    })

    expect(slider.slides.length).toBe(3)

    slider.updateOptions({
      marquee: false
    })

    expect(slider.slides.length).toBe(3)
  })

  it('должен поддерживать pauseOnHover', () => {
    const onMarqueePause = vi.fn()
    const onMarqueeResume = vi.fn()

    slider = new Tvist(root, {
      marquee: {
        pauseOnHover: true
      },
      on: {
        marqueePause: onMarqueePause,
        marqueeResume: onMarqueeResume
      }
    })

    // Симулируем mouseenter
    root.dispatchEvent(new Event('mouseenter'))
    expect(onMarqueePause).toHaveBeenCalled()

    // Симулируем mouseleave
    root.dispatchEvent(new Event('mouseleave'))
    expect(onMarqueeResume).toHaveBeenCalled()
  })

  it('должен корректно работать с gap', () => {
    slider = new Tvist(root, {
      marquee: true,
      gap: 20
    })

    const module = slider.modules.get('marquee')
    expect(module).toBeDefined()
    
    // Проверяем что модуль инициализирован
    const api = (module as MarqueeModule)?.getMarquee()
    expect(api).toBeDefined()
  })

  it('должен корректно менять направление', () => {
    slider = new Tvist(root, {
      marquee: {
        direction: 'left'
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()

    expect(api?.getDirection()).toBe('left')
    expect(slider.slides.length).toBe(3)

    api?.setDirection('right')

    expect(api?.getDirection()).toBe('right')
    expect(slider.slides.length).toBe(3)
  })

  it('должен корректно применять transform при смене направления', () => {
    slider = new Tvist(root, {
      marquee: {
        direction: 'left',
        speed: 60
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()
    const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement

    // Для left: transform начинается с translate3d(-0px, 0, 0) = translate3d(0px, 0, 0)
    const initialTransform = container.style.transform
    expect(initialTransform).toMatch(/translate3d\((0px|-0px), 0, 0\)/)
    
    // Меняем направление на right
    api?.setDirection('right')

    // Для right: transform начинается с translate3d(-totalSize, 0, 0)
    // В тестовой среде JSDOM слайды имеют нулевые размеры, поэтому totalSize = 0
    // В реальном браузере это будет отрицательное значение
    const newTransform = container.style.transform
    // Проверяем что transform был применен (содержит translate3d)
    expect(newTransform).toMatch(/translate3d\([^)]*\)/)
  })

})
