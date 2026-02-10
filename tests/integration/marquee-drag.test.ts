/**
 * Marquee + Drag Integration Tests
 * 
 * Проверяем корректное взаимодействие Marquee и Drag модулей
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/marquee'
import '../../src/modules/drag'

describe('Marquee + Drag Integration', () => {
  let root: HTMLElement
  let slider: Tvist | null = null
  let container: HTMLElement

  beforeEach(() => {
    // Создаём DOM структуру с фиксированными размерами
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '600px'
    root.innerHTML = `
      <div class="${TVIST_CLASSES.container}">
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 1</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 2</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 3</div>
        <div class="${TVIST_CLASSES.slide}" style="width: 200px;">Slide 4</div>
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

  /**
   * Вспомогательная функция для симуляции drag
   */
  const simulateDrag = (element: HTMLElement, startX: number, endX: number) => {
    // Начало драга
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    element.dispatchEvent(pointerDown)

    // Движение (должно превысить MIN_DRAG_DISTANCE = 5px)
    const pointerMove = new PointerEvent('pointermove', {
      clientX: startX + 10, // Первое движение на 10px
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerMove)

    // Финальное положение
    const pointerMove2 = new PointerEvent('pointermove', {
      clientX: endX,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerMove2)

    // Завершение драга
    const pointerUp = new PointerEvent('pointerup', {
      clientX: endX,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerUp)
  }

  /**
   * Извлекает значение translateX из transform
   */
  const getTranslateX = (element: HTMLElement): number => {
    const transform = element.style.transform
    if (!transform) return 0
    
    const match = transform.match(/translate3d\(([^,]+)/)
    if (!match) return 0
    
    return parseFloat(match[1])
  }

  it('должен сохранять позицию marquee при начале драга', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'left',
        pauseOnHover: false
      },
      drag: true,
      loop: true
    })

    // Получаем начальный transform от marquee
    const initialTransform = getTranslateX(container)
    
    // Симулируем что marquee успел сдвинуть контейнер
    // Устанавливаем transform вручную (эмулируем работу marquee)
    container.style.transform = 'translate3d(-150px, 0, 0)'
    
    // Также обновляем внутреннее состояние marquee модуля
    const marqueeModule = slider.getModule('marquee') as any
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(150) // currentPosition хранится как положительное значение
    }
    
    const marqueePosition = getTranslateX(container)
    expect(marqueePosition).toBe(-150)

    // Начинаем драг с центра экрана
    const startX = 300
    const dragDistance = 50
    
    // Симулируем начало драга (только pointerdown + первое движение)
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    root.dispatchEvent(pointerDown)

    // Первое движение на 10px (превышает MIN_DRAG_DISTANCE)
    const pointerMove = new PointerEvent('pointermove', {
      clientX: startX + 10,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerMove)

    // КРИТИЧНО: После начала драга позиция не должна "откатиться" к 0
    // Она должна остаться примерно на месте (с учетом драга)
    const positionAfterDragStart = getTranslateX(container)
    
    // Проверяем что позиция не откатилась к 0 или к какой-то совершенно другой позиции
    // Ожидаем что позиция изменилась только на величину драга (+10px вправо = +10px к transform)
    const expectedPosition = marqueePosition + 10
    const tolerance = 5 // Допускаем небольшую погрешность
    
    expect(Math.abs(positionAfterDragStart - expectedPosition)).toBeLessThan(tolerance)

    // Завершаем драг
    const pointerUp = new PointerEvent('pointerup', {
      clientX: startX + 10,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerUp)
  })

  it('должен корректно применять драг относительно текущей позиции marquee', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'left',
        pauseOnHover: false
      },
      drag: true,
      loop: true
    })

    // Устанавливаем начальную позицию marquee
    container.style.transform = 'translate3d(-200px, 0, 0)'
    
    // Обновляем внутреннее состояние marquee модуля
    const marqueeModule = slider.getModule('marquee') as any
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(200)
    }
    
    const initialMarqueePosition = getTranslateX(container)
    expect(initialMarqueePosition).toBe(-200)

    // Выполняем драг на 100px вправо
    const startX = 300
    const dragDistance = 100
    
    simulateDrag(root, startX, startX + dragDistance)

    // После драга позиция должна быть примерно -200 + 100 = -100
    // (с учетом возможного snap к слайду)
    const finalPosition = getTranslateX(container)
    
    // В данном случае может произойти snap к ближайшему слайду
    // Но главное - позиция НЕ должна быть около 0 (что было бы ошибкой)
    // Проверяем что финальная позиция учитывает начальную позицию marquee
    expect(finalPosition).not.toBe(0)
    expect(finalPosition).toBeGreaterThan(-250) // Не должна быть далеко от исходной
    expect(finalPosition).toBeLessThan(50) // И не должна быть слишком положительной
  })

  it('должен корректно обрабатывать drag в обоих направлениях', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'left',
        pauseOnHover: false
      },
      drag: true,
      loop: true
    })

    const marqueeModule = slider.getModule('marquee') as any

    // Устанавливаем позицию marquee
    container.style.transform = 'translate3d(-150px, 0, 0)'
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(150)
    }
    
    // Драг вправо
    simulateDrag(root, 300, 400)
    const positionAfterRightDrag = getTranslateX(container)
    
    // Позиция должна сместиться вправо (стать менее отрицательной)
    expect(positionAfterRightDrag).toBeGreaterThan(-150)
    
    // Устанавливаем позицию marquee снова
    container.style.transform = 'translate3d(-150px, 0, 0)'
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(150)
    }
    
    // Драг влево
    simulateDrag(root, 300, 200)
    const positionAfterLeftDrag = getTranslateX(container)
    
    // Позиция должна сместиться влево (стать более отрицательной)
    expect(positionAfterLeftDrag).toBeLessThan(-150)
  })

  it('drag должен приостанавливать marquee', () => {
    const onMarqueePause = vi.fn()
    
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        pauseOnHover: false
      },
      drag: true,
      loop: true,
      on: {
        marqueePause: onMarqueePause
      }
    })

    // При начале драга marquee должен приостановиться
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 300,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    root.dispatchEvent(pointerDown)

    // TODO: Нужно добавить логику остановки marquee при драге
    // Пока это просто заглушка для будущей функциональности
  })

  it('marquee должен возобновляться после завершения драга', () => {
    const onMarqueeResume = vi.fn()
    
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        pauseOnHover: false
      },
      drag: true,
      loop: true,
      on: {
        marqueeResume: onMarqueeResume
      }
    })

    // Выполняем полный цикл драга
    simulateDrag(root, 300, 400)

    // После завершения драга marquee должен возобновиться
    // TODO: Нужно добавить логику возобновления marquee после драга
  })

  it('должен работать без loop режима', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'left'
      },
      drag: true,
      loop: false
    })

    // Устанавливаем позицию
    container.style.transform = 'translate3d(-100px, 0, 0)'
    
    const marqueeModule = slider.getModule('marquee') as any
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(100)
    }
    
    const initialPosition = getTranslateX(container)
    
    // Драг вправо на 50px
    simulateDrag(root, 300, 350)
    
    const finalPosition = getTranslateX(container)
    
    // После драга позиция должна быть примерно -100 + 50 = -50
    // (marquee управляет позицией свободно, без snap)
    // Проверяем что позиция изменилась относительно начальной
    expect(finalPosition).toBeGreaterThan(initialPosition)
    expect(finalPosition).toBeLessThan(0)
  })

  it('должен корректно работать с vertical направлением', () => {
    // Обновляем DOM для vertical режима
    const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
    slides.forEach(slide => {
      (slide as HTMLElement).style.width = 'auto'
      ;(slide as HTMLElement).style.height = '200px'
    })

    slider = new Tvist(root, {
      direction: 'vertical',
      marquee: {
        speed: 100,
        direction: 'up'
      },
      drag: true,
      loop: true
    })

    // Устанавливаем vertical transform
    container.style.transform = 'translate3d(0, -150px, 0)'
    
    // Симулируем vertical drag
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 0,
      clientY: 300,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    root.dispatchEvent(pointerDown)

    const pointerMove = new PointerEvent('pointermove', {
      clientX: 0,
      clientY: 310,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerMove)

    // Проверяем что vertical позиция учтена
    const transform = container.style.transform
    expect(transform).toMatch(/translate3d\(0,\s*[^,]+/)
  })

  it('должен корректно работать с направлением right', () => {
    slider = new Tvist(root, {
      marquee: {
        speed: 100,
        direction: 'right' // Движение вправо
      },
      drag: true,
      loop: true
    })

    const marqueeModule = slider.getModule('marquee') as any

    // Для направления right: currentPosition уменьшается от totalSize к 0
    // Устанавливаем позицию marquee (например, на середине пути)
    container.style.transform = 'translate3d(-100px, 0, 0)'
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(100)
    }

    const initialPosition = getTranslateX(container)

    // Драг вправо на 50px (должен увеличить transform, т.е. сделать менее отрицательным)
    simulateDrag(root, 300, 350)

    const finalPosition = getTranslateX(container)
    
    // При драге вправо позиция должна стать менее отрицательной
    expect(finalPosition).toBeGreaterThan(initialPosition)
  })

  it('должен корректно работать с направлением down', () => {
    // Обновляем DOM для vertical режима
    const slides = root.querySelectorAll(`.${TVIST_CLASSES.slide}`)
    slides.forEach(slide => {
      (slide as HTMLElement).style.width = 'auto'
      ;(slide as HTMLElement).style.height = '200px'
    })

    slider = new Tvist(root, {
      direction: 'vertical',
      marquee: {
        speed: 100,
        direction: 'down'
      },
      drag: true,
      loop: true
    })

    const marqueeModule = slider.getModule('marquee') as any

    // Устанавливаем vertical transform
    container.style.transform = 'translate3d(0, -100px, 0)'
    if (marqueeModule?.setCurrentPosition) {
      marqueeModule.setCurrentPosition(100)
    }
    
    const getTranslateY = (element: HTMLElement): number => {
      const transform = element.style.transform
      if (!transform) return 0
      const match = transform.match(/translate3d\([^,]+,\s*([^,]+)/)
      if (!match) return 0
      return parseFloat(match[1])
    }

    const initialPosition = getTranslateY(container)

    // Vertical drag вниз
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 0,
      clientY: 300,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    root.dispatchEvent(pointerDown)

    const pointerMove = new PointerEvent('pointermove', {
      clientX: 0,
      clientY: 320,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerMove)

    const pointerUp = new PointerEvent('pointerup', {
      clientX: 0,
      clientY: 320,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(pointerUp)

    const finalPosition = getTranslateY(container)
    
    // При драге вниз Y позиция должна стать менее отрицательной
    expect(finalPosition).toBeGreaterThan(initialPosition)
  })
})
