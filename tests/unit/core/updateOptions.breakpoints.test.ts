/**
 * Тесты для updateOptions с breakpoints
 * Проверяем корректность работы при динамическом изменении breakpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { BreakpointsModule } from '../../../src/modules/breakpoints/BreakpointsModule'
import { DragModule } from '../../../src/modules/drag/DragModule'

// Регистрируем модули
Tvist.registerModule('breakpoints', BreakpointsModule)
Tvist.registerModule('drag', DragModule)

describe('updateOptions - breakpoints lock/unlock', () => {
  let container: HTMLElement
  let tvist: Tvist

  beforeEach(() => {
    // Создаем контейнер
    container = document.createElement('div')
    container.innerHTML = `
      <div class="tvist-v1">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">Slide 1</div>
          <div class="tvist-v1__slide">Slide 2</div>
        </div>
        <div class="tvist-v1__arrows">
          <button class="tvist-v1__arrow tvist-v1__arrow--prev"></button>
          <button class="tvist-v1__arrow tvist-v1__arrow--next"></button>
        </div>
        <div class="tvist-v1__pagination"></div>
      </div>
    `
    document.body.appendChild(container)

    // Мокаем размеры (больше breakpoint 768)
    const root = container.querySelector('.tvist-v1') as HTMLElement
    Object.defineProperty(root, 'clientWidth', { value: 1200, configurable: true })
    Object.defineProperty(root, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 1200, configurable: true })
    Object.defineProperty(root, 'offsetHeight', { value: 400, configurable: true })
  })

  afterEach(() => {
    tvist?.destroy()
    document.body.removeChild(container)
  })

  it('должен разблокировать слайдер при переходе с perPage:2 на perPage:1 (2 слайда)', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement

    // Создаем слайдер с perPage: 2 (десктоп)
    // При 2 слайдах и perPage: 2 слайдер должен быть заблокирован (lock)
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container', // Важно для тестов!
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // На десктопе (perPage: 2, 2 слайда) слайдер должен быть заблокирован
    expect(tvist.engine.isLocked).toBe(true)
    expect(tvist.canScrollNext).toBe(false)
    expect(tvist.canScrollPrev).toBe(false)

    // Симулируем переход на мобилу: меняем ширину контейнера на 768px
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })

    // Вызываем update (это происходит при resize через ResizeObserver)
    tvist.update()

    // После применения breakpoint (perPage: 1) слайдер должен разблокироваться
    // Потому что теперь 2 слайда и perPage: 1 = 2 страницы
    expect(tvist.engine.isLocked).toBe(false)
    expect(tvist.canScrollNext).toBe(true)
    expect(tvist.canScrollPrev).toBe(false) // На первом слайде
  })

  it('должен корректно обновлять isLocked при смене breakpoint через checkLock', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement

    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // Проверяем начальное состояние (perPage: 2, 2 слайда = lock)
    expect(tvist.engine.isLocked).toBe(true)

    // Вручную меняем perPage на 1 и вызываем checkLock
    tvist.options.perPage = 1
    tvist.engine.update()

    // После update должен вызваться checkLock и слайдер должен разблокироваться
    expect(tvist.engine.isLocked).toBe(false)
  })

  it('должен эмитить события lock/unlock при изменении состояния', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement
    const lockSpy = vi.fn()
    const unlockSpy = vi.fn()

    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      breakpointsBase: 'container',
      on: {
        lock: lockSpy,
        unlock: unlockSpy
      },
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // При создании слайдер заблокирован (perPage: 2, 2 слайда)
    expect(lockSpy).toHaveBeenCalledTimes(1)
    expect(unlockSpy).toHaveBeenCalledTimes(0)

    // Симулируем переход на мобилу
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })
    tvist.update()

    // Должно сработать событие unlock
    expect(unlockSpy).toHaveBeenCalledTimes(1)
  })

  it('должен разблокировать drag при переходе с lock на unlock', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement

    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // На десктопе drag не работает (isLocked = true)
    expect(tvist.engine.isLocked).toBe(true)

    // Симулируем drag на десктопе - не должен работать
    const dragModule = tvist.getModule('drag')
    expect(dragModule).toBeDefined()

    // Переходим на мобилу
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })
    tvist.update()

    // Теперь drag должен работать (isLocked = false)
    expect(tvist.engine.isLocked).toBe(false)
  })

  it('должен корректно обновлять bounds в DragModule после unlock', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement

    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    expect(tvist.engine.isLocked).toBe(true)

    // Переходим на мобилу
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })
    tvist.update()

    expect(tvist.engine.isLocked).toBe(false)

    // DragModule должен обновить свои границы при onResize
    const dragModule = tvist.getModule('drag')
    expect(dragModule).toBeDefined()
    
    // Проверяем что можем листать
    expect(tvist.canScrollNext).toBe(true)
  })

  it('должен корректно работать с 3 слайдами: lock на perPage:3, unlock на perPage:1', () => {
    // Добавляем третий слайд
    const root = container.querySelector('.tvist-v1') as HTMLElement
    const containerEl = root.querySelector('.tvist-v1__container') as HTMLElement
    const slide3 = document.createElement('div')
    slide3.className = 'tvist-v1__slide'
    slide3.textContent = 'Slide 3'
    containerEl.appendChild(slide3)

    tvist = new Tvist(root, {
      perPage: 3,
      gap: 16,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // На десктопе (perPage: 3, 3 слайда) - lock
    expect(tvist.engine.isLocked).toBe(true)
    expect(tvist.canScrollNext).toBe(false)

    // Переходим на мобилу (perPage: 1, 3 слайда) - unlock
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })
    tvist.update()

    expect(tvist.engine.isLocked).toBe(false)
    expect(tvist.canScrollNext).toBe(true)
  })

  it('ГЛАВНЫЙ ТЕСТ: должен позволить листать после resize с desktop на mobile', () => {
    const root = container.querySelector('.tvist-v1') as HTMLElement

    // Создаем слайдер как в примере из ResponsiveExample.vue
    tvist = new Tvist(root, {
      perPage: 2,
      gap: 16,
      speed: 300,
      drag: true,
      arrows: true,
      pagination: true,
      breakpointsBase: 'container',
      breakpoints: {
        768: {
          perPage: 1
        }
      }
    })

    // ДЕСКТОП: perPage: 2, 2 слайда = 1 страница = lock
    console.log('ДЕСКТОП состояние:', {
      isLocked: tvist.engine.isLocked,
      perPage: tvist.options.perPage,
      canScrollNext: tvist.canScrollNext,
      canScrollPrev: tvist.canScrollPrev,
      activeIndex: tvist.activeIndex
    })

    expect(tvist.engine.isLocked).toBe(true)
    expect(tvist.canScrollNext).toBe(false)
    expect(tvist.canScrollPrev).toBe(false)

    // СИМУЛИРУЕМ СУЖЕНИЕ ЭКРАНА до 768px (мобила)
    Object.defineProperty(root, 'clientWidth', { value: 768, configurable: true })
    Object.defineProperty(root, 'offsetWidth', { value: 768, configurable: true })
    
    // Вызываем update (как это происходит в браузере через ResizeObserver)
    tvist.update()

    // МОБИЛА: perPage: 1, 2 слайда = 2 страницы = unlock
    console.log('МОБИЛА состояние после resize:', {
      isLocked: tvist.engine.isLocked,
      perPage: tvist.options.perPage,
      canScrollNext: tvist.canScrollNext,
      canScrollPrev: tvist.canScrollPrev,
      activeIndex: tvist.activeIndex
    })

    // ПРОВЕРЯЕМ ЧТО СЛАЙДЕР РАЗБЛОКИРОВАН
    expect(tvist.engine.isLocked).toBe(false)
    expect(tvist.canScrollNext).toBe(true)

    // ПРОВЕРЯЕМ ЧТО МОЖЕМ ЛИСТАТЬ СТРЕЛКАМИ
    console.log('Перед next():', {
      activeIndex: tvist.activeIndex,
      canScrollNext: tvist.canScrollNext,
      isLocked: tvist.engine.isLocked,
      location: tvist.engine.location.get(),
      target: tvist.engine.target.get(),
      slideSize: tvist.engine.slideSizeValue,
      containerSize: tvist.engine.containerSizeValue,
      perPage: tvist.options.perPage
    })
    
    // Проверяем позицию слайда 1
    const slide1Position = tvist.engine.getScrollPositionForIndex(1)
    console.log('Позиция слайда 1:', slide1Position)
    
    // Подписываемся на события
    let slideChangeStartFired = false
    let slideChangeEndFired = false
    tvist.on('slideChangeStart', (idx: number) => { 
      console.log('slideChangeStart fired, index:', idx)
      slideChangeStartFired = true 
    })
    tvist.on('slideChangeEnd', (idx: number) => { 
      console.log('slideChangeEnd fired, index:', idx)
      slideChangeEndFired = true 
    })
    
    console.log('Вызываем next(), текущий activeIndex:', tvist.activeIndex)
    console.log('canScrollNext:', tvist.canScrollNext)
    console.log('engine.canScrollNext():', tvist.engine.canScrollNext())
    
    tvist.next()
    
    console.log('События:', { slideChangeStartFired, slideChangeEndFired })
    
    console.log('После next():', {
      activeIndex: tvist.activeIndex,
      canScrollNext: tvist.canScrollNext,
      location: tvist.engine.location.get(),
      target: tvist.engine.target.get(),
      expectedPosition: slide1Position
    })
    
    expect(tvist.activeIndex).toBe(1)

    // ПРОВЕРЯЕМ ЧТО МОЖЕМ ЛИСТАТЬ НАЗАД
    tvist.prev()
    expect(tvist.activeIndex).toBe(0)
  })
})
