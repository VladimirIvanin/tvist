/**
 * Marquee Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import '../../../src/modules/marquee' // Импортируем для регистрации
import { MarqueeModule } from '../../../src/modules/marquee'

describe('MarqueeModule', () => {
  let root: HTMLElement
  let slider: Tvist | null = null

  beforeEach(() => {
    // Создаём DOM структуру
    root = document.createElement('div')
    root.className = 'tvist'
    root.innerHTML = `
      <div class="tvist__container">
        <div class="tvist__slide">Slide 1</div>
        <div class="tvist__slide">Slide 2</div>
        <div class="tvist__slide">Slide 3</div>
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

    // Модуль создается, но не должен создавать клоны
    expect(slider.slides.length).toBe(3) // только оригинальные слайды
    
    const clones = Array.from(slider.slides).filter(slide => 
      slide.hasAttribute('data-tvist-marquee-clone')
    )
    expect(clones.length).toBe(0) // клонов нет
  })

  it('должен создавать клоны слайдов', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    // Оригинальных слайдов 3, должно быть 6 (3 оригинала + 3 клона)
    const slides = slider.slides
    expect(slides.length).toBe(6)

    // Проверяем наличие клонов
    const clones = Array.from(slides).filter(slide => 
      slide.hasAttribute('data-tvist-marquee-clone')
    )
    expect(clones.length).toBe(3)
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

  it('должен удалять клоны при destroy', () => {
    slider = new Tvist(root, {
      marquee: true
    })

    expect(slider.slides.length).toBe(6) // 3 оригинала + 3 клона

    slider.destroy()

    // После destroy должны остаться только оригинальные слайды
    const container = root.querySelector('.tvist__container')
    const remainingSlides = container?.querySelectorAll('.tvist__slide')
    expect(remainingSlides?.length).toBe(3)
  })

  it('должен поддерживать динамическое включение/выключение', () => {
    slider = new Tvist(root, {
      marquee: false
    })

    // Изначально клонов нет
    expect(slider.slides.length).toBe(3)

    // Включаем marquee
    slider.updateOptions({
      marquee: {
        speed: 80
      }
    })

    expect(slider.slides.length).toBe(6) // клоны созданы

    // Выключаем marquee
    slider.updateOptions({
      marquee: false
    })

    expect(slider.slides.length).toBe(3) // клоны удалены
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
})
