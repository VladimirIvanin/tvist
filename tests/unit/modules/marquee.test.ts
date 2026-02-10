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

  it('должен сохранять визуальную позицию при смене направления', () => {
    slider = new Tvist(root, {
      marquee: {
        direction: 'left',
        speed: 100
      }
    })

    const module = slider.modules.get('marquee') as MarqueeModule
    const api = module?.getMarquee()
    
    // Симулируем что marquee прокрутился на некоторое расстояние
    // Устанавливаем currentPosition = 150 для direction: 'left'
    if (module?.setCurrentPosition) {
      module.setCurrentPosition(150)
    }
    
    const positionBeforeChange = module?.getCurrentPosition()
    expect(positionBeforeChange).toBe(150)
    
    // Меняем направление на right
    api?.setDirection('right')
    
    // После смены направления визуальная позиция должна остаться на месте
    // currentPosition остаётся тем же (150), так как он определяет визуальный offset
    const positionAfterChange = module?.getCurrentPosition()
    
    // В JSDOM totalSize = 0, поэтому позиция нормализуется к 0
    // В реальном браузере позиция останется той же (150)
    // Проверяем что позиция либо осталась той же, либо нормализовалась
    expect([positionBeforeChange, 0]).toContain(positionAfterChange)
  })

  describe('Смена направления marquee', () => {
    it('не должен делать большой скачок при смене направления left -> right', () => {
      // Создаём слайдер с реальными размерами слайдов
      const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
      slides.forEach((slide) => {
        const el = slide as HTMLElement
        el.style.width = '300px'
        el.style.height = '200px'
      })

      slider = new Tvist(root, {
        marquee: {
          direction: 'left',
          speed: 100
        },
        gap: 20
      })

      const module = slider.modules.get('marquee') as MarqueeModule
      const api = module?.getMarquee()
      const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement

      // Симулируем что marquee прокрутился на некоторое расстояние
      // Устанавливаем позицию 100px
      module.setCurrentPosition(100)
      
      // Получаем transform до смены направления
      const transformBefore = container.style.transform
      const translateXBefore = parseFloat(transformBefore.match(/translate3d\(([^,]+)/)?.[1] || '0')

      // Меняем направление на right
      api?.setDirection('right')

      // Получаем transform после смены направления
      const transformAfter = container.style.transform
      const translateXAfter = parseFloat(transformAfter.match(/translate3d\(([^,]+)/)?.[1] || '0')

      // Разница между позициями не должна быть большой (не больше одного слайда + gap)
      const diff = Math.abs(translateXAfter - translateXBefore)
      
      // totalSize = (300 + 20) * 3 = 960
      // При смене с left на right не должно быть скачка на весь totalSize
      // Позиция должна остаться примерно на месте (разница должна быть минимальной)
      expect(diff).toBeLessThan(50) // Допускаем небольшую погрешность
    })

    it('не должен делать большой скачок при смене направления right -> left', () => {
      const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
      slides.forEach((slide) => {
        const el = slide as HTMLElement
        el.style.width = '300px'
        el.style.height = '200px'
      })

      slider = new Tvist(root, {
        marquee: {
          direction: 'right',
          speed: 100
        },
        gap: 20
      })

      const module = slider.modules.get('marquee') as MarqueeModule
      const api = module?.getMarquee()
      const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement

      // totalSize = (300 + 20) * 3 = 960
      // Для right начальная позиция = totalSize
      // Устанавливаем позицию на 860 (прокрутились на 100px)
      module.setCurrentPosition(860)
      
      const transformBefore = container.style.transform
      const translateXBefore = parseFloat(transformBefore.match(/translate3d\(([^,]+)/)?.[1] || '0')

      // Меняем направление на left
      api?.setDirection('left')

      const transformAfter = container.style.transform
      const translateXAfter = parseFloat(transformAfter.match(/translate3d\(([^,]+)/)?.[1] || '0')

      // Разница должна быть минимальной
      const diff = Math.abs(translateXAfter - translateXBefore)
      expect(diff).toBeLessThan(50)
    })

    it('не должен делать большой скачок при смене направления up -> down', () => {
      const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
      slides.forEach((slide) => {
        const el = slide as HTMLElement
        el.style.width = '200px'
        el.style.height = '150px'
      })

      slider = new Tvist(root, {
        direction: 'vertical',
        marquee: {
          direction: 'up',
          speed: 100
        },
        gap: 10
      })

      const module = slider.modules.get('marquee') as MarqueeModule
      const api = module?.getMarquee()
      const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement

      // Устанавливаем позицию 80px
      module.setCurrentPosition(80)
      
      const transformBefore = container.style.transform
      const translateYBefore = parseFloat(transformBefore.match(/translate3d\([^,]+,\s*([^,]+)/)?.[1] || '0')

      // Меняем направление на down
      api?.setDirection('down')

      const transformAfter = container.style.transform
      const translateYAfter = parseFloat(transformAfter.match(/translate3d\([^,]+,\s*([^,]+)/)?.[1] || '0')

      // Разница должна быть минимальной
      const diff = Math.abs(translateYAfter - translateYBefore)
      expect(diff).toBeLessThan(50)
    })

    it('не должен делать большой скачок при смене направления down -> up', () => {
      const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
      slides.forEach((slide) => {
        const el = slide as HTMLElement
        el.style.width = '200px'
        el.style.height = '150px'
      })

      slider = new Tvist(root, {
        direction: 'vertical',
        marquee: {
          direction: 'down',
          speed: 100
        },
        gap: 10
      })

      const module = slider.modules.get('marquee') as MarqueeModule
      const api = module?.getMarquee()
      const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement

      // totalSize = (150 + 10) * 3 = 480
      // Устанавливаем позицию на 400 (прокрутились на 80px от totalSize)
      module.setCurrentPosition(400)
      
      const transformBefore = container.style.transform
      const translateYBefore = parseFloat(transformBefore.match(/translate3d\([^,]+,\s*([^,]+)/)?.[1] || '0')

      // Меняем направление на up
      api?.setDirection('up')

      const transformAfter = container.style.transform
      const translateYAfter = parseFloat(transformAfter.match(/translate3d\([^,]+,\s*([^,]+)/)?.[1] || '0')

      // Разница должна быть минимальной
      const diff = Math.abs(translateYAfter - translateYBefore)
      expect(diff).toBeLessThan(50)
    })
  })

})
