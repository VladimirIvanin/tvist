/**
 * Marquee + Drag + Loop - Тесты для локализации проблемы с "дырами"
 * 
 * ПРОБЛЕМА: при drag в marquee режиме появляются пустые пространства (дыры)
 * потому что логика loop не срабатывает корректно
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/marquee'
import '../../src/modules/drag'
import '../../src/modules/loop'

describe('Marquee + Drag + Loop: Локализация проблемы с дырами', () => {
  let root: HTMLElement
  let slider: Tvist | null = null
  let container: HTMLElement

  beforeEach(() => {
    // Создаём DOM с фиксированными размерами для предсказуемости
    root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    root.style.width = '800px' // viewport
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

    // Мокируем offsetWidth/clientWidth для happy-dom
    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 800 })
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 800 })
    Object.defineProperty(root, 'offsetHeight', { configurable: true, value: 400 })
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(container, 'offsetWidth', { configurable: true, value: 800 })
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 })
    const slides = container.querySelectorAll(`.${TVIST_CLASSES.slide}`)
    slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 200 })
      Object.defineProperty(slide, 'offsetHeight', { configurable: true, value: 400 })
    })
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

  const simulateDrag = async (element: HTMLElement, startX: number, deltaX: number, steps = 10) => {
    // pointerdown
    const downEvent = new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: 0,
      bubbles: true,
      cancelable: true,
      button: 0
    })
    element.dispatchEvent(downEvent)
    await new Promise(resolve => setTimeout(resolve, 10))

    // pointermove с несколькими шагами
    for (let i = 1; i <= steps; i++) {
      const currentX = startX + (deltaX * i / steps)
      const moveEvent = new PointerEvent('pointermove', {
        clientX: currentX,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(moveEvent)
      await new Promise(resolve => setTimeout(resolve, 5))
    }

    // pointerup
    const upEvent = new PointerEvent('pointerup', {
      clientX: startX + deltaX,
      clientY: 0,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(upEvent)
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  describe('ТЕСТ 1: Проверка начального состояния', () => {
    it('должен правильно инициализировать marquee с loop', () => {
      slider = new Tvist(root, {
        marquee: {
          speed: 100,
          direction: 'left'
        },
        drag: true,
        loop: true,
        gap: 20
      })

      const loopModule = slider.getModule('loop') as any
      const marqueeModule = slider.getModule('marquee') as any

      expect(loopModule).toBeDefined()
      expect(marqueeModule).toBeDefined()
      
      // Проверяем что loop был автоматически включен marquee
      expect(slider.options.loop).toBe(true)
      
      // Проверяем начальное состояние
      const state = loopModule.getTransformState()
      console.log('Начальное состояние:')
      console.log('  Location:', state.location)
      console.log('  Active Index:', state.activeIndex)
      console.log('  Slides Order:', state.slidesOrder.join(', '))
      console.log('  Looped Slides:', state.loopedSlides)
      
      // В начале location должен быть 0
      expect(state.location).toBe(0)
    })

    it('должен иметь data-tvist-slide-index на всех слайдах', () => {
      slider = new Tvist(root, {
        marquee: true,
        drag: true,
        loop: true
      })

      slider.slides.forEach((slide, index) => {
        const dataIndex = slide.getAttribute('data-tvist-slide-index')
        expect(dataIndex).toBe(String(index))
      })
    })
  })

  describe('ТЕСТ 2: Минимальный drag вправо', () => {
    it('слайды должны быть перестроены если нужно', async () => {
      slider = new Tvist(root, {
        marquee: {
          speed: 100,
          direction: 'left'
        },
        drag: true,
        loop: true,
        gap: 20
      })

      const loopModule = slider.getModule('loop') as any
      let loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const before = {
          location: slider.engine.location.get(),
          slidesOrder: [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        }
        const result = originalFix(params)
        const after = {
          location: slider.engine.location.get(),
          slidesOrder: [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        }
        
        loopFixCalls.push({
          params,
          before,
          after,
          reordered: before.slidesOrder.join(',') !== after.slidesOrder.join(',')
        })
        
        return result
      }

      console.log('\n=== ОТСЛЕЖИВАНИЕ LOOPFIX ===')
      
      await simulateDrag(root, 400, 30, 3)

      console.log('Вызовов loopFix:', loopFixCalls.length)
      loopFixCalls.forEach((call, i) => {
        console.log(`\nВызов #${i + 1}:`)
        console.log('  Params:', call.params)
        console.log('  Slides BEFORE:', call.before.slidesOrder.join(', '))
        console.log('  Slides AFTER:', call.after.slidesOrder.join(', '))
        console.log('  Location BEFORE:', call.before.location)
        console.log('  Location AFTER:', call.after.location)
        console.log('  Reordered:', call.reordered)
      })

      // АНАЛИЗ: был ли вызван loopFix и перестроил ли он слайды?
      const anyReordered = loopFixCalls.some(call => call.reordered)
      console.log('\nБыли ли перестроены слайды?', anyReordered)
      
      if (!anyReordered && loopFixCalls.length > 0) {
        console.log('❌ ПРОБЛЕМА: loopFix был вызван, но НЕ перестроил слайды')
        console.log('   Возможно условия для prepend не выполнились')
      }
    })
  })

  describe('ТЕСТ 3: Drag вправо с marquee позицией', () => {
    it('должен учитывать текущую позицию marquee при drag', async () => {
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
      const loopModule = slider.getModule('loop') as any

      console.log('\n=== ТЕСТ 3: Drag с начальной позицией marquee ===')
      
      // Симулируем что marquee уже прокрутился на 100px
      if (marqueeModule?.setCurrentPosition) {
        marqueeModule.setCurrentPosition(100)
        container.style.transform = 'translate3d(-100px, 0, 0)'
      }

      const initialTransform = getTranslateX(container)
      console.log('Начальный transform:', initialTransform)
      console.log('Marquee position:', marqueeModule.getCurrentPosition())

      // Драг вправо на 50px
      await simulateDrag(root, 400, 50, 5)

      const finalTransform = getTranslateX(container)
      const finalLocation = slider.engine.location.get()
      
      console.log('Финальный transform:', finalTransform)
      console.log('Финальный location:', finalLocation)
      console.log('Marquee position после:', marqueeModule.getCurrentPosition())

      // ПРОВЕРКА: трансформ должен учитывать начальную позицию marquee
      // Ожидаемая позиция: -100 (начальная) + 50 (драг) = -50
      const expectedRange = [-60, -40] // Допуск
      
      if (finalTransform < expectedRange[0] || finalTransform > expectedRange[1]) {
        console.log('❌ ПРОБЛЕМА: финальный transform =', finalTransform)
        console.log('   Ожидался диапазон:', expectedRange)
        console.log('   Начальная позиция marquee не была учтена корректно')
      }
    })

    it('startMarqueePosition должен быть сохранен при начале драга', async () => {
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

      // Устанавливаем позицию marquee
      if (marqueeModule?.setCurrentPosition) {
        marqueeModule.setCurrentPosition(150)
        container.style.transform = 'translate3d(-150px, 0, 0)'
      }

      console.log('\n=== ПРОВЕРКА СОХРАНЕНИЯ MARQUEE ПОЗИЦИИ ===')
      console.log('Marquee position перед драгом:', marqueeModule.getCurrentPosition())

      // Начинаем драг (только down + первое движение)
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 400,
        clientY: 0,
        bubbles: true,
        cancelable: true,
        button: 0
      })
      root.dispatchEvent(downEvent)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Первое движение (превышает threshold)
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 410,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(moveEvent)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Еще одно движение после dragStart (накопленный delta вычтен)
      const moveEvent2 = new PointerEvent('pointermove', {
        clientX: 415,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(moveEvent2)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Проверяем что позиция не "откатилась"
      const transformAfterStart = getTranslateX(container)
      console.log('Transform после начала драга:', transformAfterStart)
      
      // Позиция должна быть больше -150 (двинулись вправо)
      expect(transformAfterStart).toBeGreaterThan(-150)
      // Но не слишком далеко
      expect(Math.abs(transformAfterStart - (-150))).toBeLessThan(30)

      // Завершаем драг
      const upEvent = new PointerEvent('pointerup', {
        clientX: 410,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(upEvent)
    })
  })

  describe('ТЕСТ 4: Проверка логики подстановки слайдов', () => {
    it('при drag вправо последние слайды должны быть добавлены в начало', async () => {
      slider = new Tvist(root, {
        marquee: {
          speed: 100,
          direction: 'left'
        },
        drag: true,
        loop: true,
        gap: 20,
        perPage: 4 // Показываем 4 слайда (800px / 200px)
      })

      const loopModule = slider.getModule('loop') as any
      
      console.log('\n=== ТЕСТ 4: Подстановка слайдов при drag вправо ===')
      
      const initialOrder = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
      console.log('Начальный порядок слайдов:', initialOrder.join(', '))
      console.log('Looped slides:', loopModule.loopedSlides)

      // Большой drag вправо (должен вызвать prepend)
      await simulateDrag(root, 400, 100, 10)

      const finalOrder = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
      console.log('Финальный порядок слайдов:', finalOrder.join(', '))

      const location = slider.engine.location.get()
      const activeIndex = slider.engine.index.get()
      
      console.log('Location:', location)
      console.log('Active Index:', activeIndex)

      // АНАЛИЗ: изменился ли порядок слайдов?
      const orderChanged = initialOrder.join(',') !== finalOrder.join(',')
      console.log('Порядок изменился?', orderChanged)

      // После исправления Bug 2: loopFix теперь вызывается при drag в marquee режиме,
      // поэтому слайды ДОЛЖНЫ быть перестроены при drag вправо
      expect(orderChanged).toBe(true)
      console.log('✓ Слайды были перестроены')
    })

    it('loopFix ДОЛЖЕН вызываться при drag в режиме marquee для подстановки слайдов', async () => {
      slider = new Tvist(root, {
        marquee: {
          speed: 100,
          direction: 'left'
        },
        drag: true,
        loop: true,
        gap: 20
      })

      const loopModule = slider.getModule('loop') as any
      const loopFixParams: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        loopFixParams.push(params)
        return originalFix(params)
      }

      console.log('\n=== ПРОВЕРКА ПАРАМЕТРОВ LOOPFIX ===')

      await simulateDrag(root, 400, 100, 10)

      console.log('Вызовы loopFix:', loopFixParams.length)
      loopFixParams.forEach((params, i) => {
        console.log(`Вызов #${i + 1}:`, params)
      })

      // После исправления Bug 2: loopFix ДОЛЖЕН вызываться при drag в marquee режиме,
      // чтобы подставлять слайды и предотвращать пустоты (gaps).
      // Ранее loopFix пропускался, что приводило к дырам при drag.
      expect(loopFixParams.length).toBeGreaterThan(0)
    })
  })

  describe('ТЕСТ 5: Конфликт между marquee и loop логикой', () => {
    it('marquee не должен переставлять слайды во время drag', async () => {
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
      
      console.log('\n=== ТЕСТ 5: Marquee vs Loop конфликт ===')
      
      // Проверяем что marquee остановлен во время drag
      const api = marqueeModule.getMarquee()
      console.log('Marquee running перед драгом?', api.isRunning())

      // Начинаем драг
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 400,
        clientY: 0,
        bubbles: true,
        cancelable: true,
        button: 0
      })
      root.dispatchEvent(downEvent)
      await new Promise(resolve => setTimeout(resolve, 10))

      const moveEvent = new PointerEvent('pointermove', {
        clientX: 420,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(moveEvent)
      await new Promise(resolve => setTimeout(resolve, 10))

      console.log('Marquee running во время драга?', api.isRunning())
      console.log('Marquee paused во время драга?', api.isPaused())

      // ПРОВЕРКА: marquee должен быть на паузе
      expect(api.isPaused()).toBe(true)
      expect(api.isRunning()).toBe(false)

      // Завершаем драг
      const upEvent = new PointerEvent('pointerup', {
        clientX: 420,
        clientY: 0,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(upEvent)
      await new Promise(resolve => setTimeout(resolve, 50))

      console.log('Marquee running после драга?', api.isRunning())
      
      // После драга marquee должен возобновиться
      expect(api.isRunning()).toBe(true)
    })
  })
})
