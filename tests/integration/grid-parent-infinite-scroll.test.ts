/**
 * Тест для бага: бесконечная прокрутка при display: grid у родителя
 *
 * Суть бага:
 * Когда родительский элемент имеет display: grid, слайдер (root) является
 * grid-item. ResizeObserver наблюдал за root. При вызове update() метод
 * applyFixedSize() устанавливал width на слайды, что могло изменить размер
 * root (через grid layout). Это снова триггерило ResizeObserver → update() →
 * бесконечный цикл.
 *
 * Исправление:
 * ResizeObserver теперь наблюдает за track, а не за root.
 * track имеет overflow: hidden и его размер определяется внешним layout,
 * а не содержимым — изменение слайдов не меняет размер track.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, type SliderFixture } from '../fixtures'
import { Tvist } from '@core/Tvist'
import '../../src/modules/scrollbar'
import '../../src/modules/navigation'

describe('BUG: бесконечная прокрутка при display: grid у родителя', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 800,
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture?.cleanup()
  })

  it('ResizeObserver должен наблюдать за track, а не за root', () => {
    // Отслеживаем какие элементы передаются в observe()
    const observedElements: Element[] = []
    const OriginalResizeObserver = global.ResizeObserver

    global.ResizeObserver = class MockResizeObserver {
      constructor(public callback: ResizeObserverCallback) {}
      observe(target: Element) {
        observedElements.push(target)
      }
      unobserve() {}
      disconnect() {}
    } as any

    slider = new Tvist(fixture.root, {
      perPage: 1,
      gap: 20,
      scrollbar: true,
    })

    // Восстанавливаем ResizeObserver
    global.ResizeObserver = OriginalResizeObserver

    // ResizeObserver должен наблюдать за track, а не за root
    expect(observedElements).toContain(fixture.track)
    expect(observedElements).not.toContain(fixture.root)
  })

  it('при изменении размера track update() вызывается через throttle (не бесконечно)', () => {
    vi.useFakeTimers()

    // Мокируем ResizeObserver с возможностью ручного триггера
    let resizeCallback: ResizeObserverCallback | null = null
    let observedTarget: Element | null = null

    const OriginalResizeObserver = global.ResizeObserver
    global.ResizeObserver = class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }
      observe(target: Element) {
        observedTarget = target
      }
      unobserve() {}
      disconnect() {}
    } as any

    slider = new Tvist(fixture.root, {
      perPage: 1,
      gap: 20,
      scrollbar: true,
    })

    global.ResizeObserver = OriginalResizeObserver

    // Проверяем что наблюдаем за track
    expect(observedTarget).toBe(fixture.track)

    // Отслеживаем вызовы update()
    const updateSpy = vi.spyOn(slider, 'update')

    // Первый вызов ResizeObserver — throttle пропускает сразу (lastCall=0)
    resizeCallback?.([], {} as ResizeObserver)
    expect(updateSpy).toHaveBeenCalledTimes(1)
    updateSpy.mockClear()

    // Второй вызов сразу после первого — throttle откладывает
    resizeCallback?.([], {} as ResizeObserver)
    expect(updateSpy).not.toHaveBeenCalled()

    // После throttle задержки — вызывается ровно 1 раз
    vi.advanceTimersByTime(150)
    expect(updateSpy).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('при 10 срабатываниях ResizeObserver подряд update() вызывается максимум 2 раза (throttle)', () => {
    vi.useFakeTimers()

    // Мокируем ResizeObserver с возможностью ручного триггера
    let resizeCallback: ResizeObserverCallback | null = null

    const OriginalResizeObserver = global.ResizeObserver
    global.ResizeObserver = class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any

    slider = new Tvist(fixture.root, {
      perPage: 1,
      gap: 20,
      scrollbar: true,
    })

    global.ResizeObserver = OriginalResizeObserver

    const updateSpy = vi.spyOn(slider, 'update')

    // Симулируем 10 срабатываний ResizeObserver подряд
    // (как при бесконечном цикле в display: grid)
    for (let i = 0; i < 10; i++) {
      resizeCallback?.([], {} as ResizeObserver)
    }

    // Первый вызов немедленный (throttle пропускает при lastCall=0)
    // Остальные 9 откладываются и схлопываются в 1 отложенный вызов
    expect(updateSpy).toHaveBeenCalledTimes(1)

    // После throttle задержки — ещё 1 вызов (отложенный)
    vi.advanceTimersByTime(150)
    expect(updateSpy).toHaveBeenCalledTimes(2)

    // Итого: максимум 2 вызова вместо 10 — throttle работает
    vi.useRealTimers()
  })

  it('слайдер корректно инициализируется с scrollbar и arrows при display: grid у родителя', () => {
    // Создаём кнопки навигации
    const prevBtn = document.createElement('button')
    prevBtn.className = 'tvist-button-prev'
    const nextBtn = document.createElement('button')
    nextBtn.className = 'tvist-button-next'
    document.body.appendChild(prevBtn)
    document.body.appendChild(nextBtn)

    // Создаём отдельную фикстуру внутри grid-контейнера
    const gridFixture = createSliderFixture({ slidesCount: 5, width: 800 })

    // Оборачиваем root в grid-контейнер (перемещаем из body в gridParent)
    const gridParent = document.createElement('div')
    gridParent.style.display = 'grid'
    gridParent.style.gridTemplateColumns = 'repeat(2, 1fr)'
    document.body.appendChild(gridParent)
    // Перемещаем root из body в gridParent
    gridParent.appendChild(gridFixture.root)

    slider = new Tvist(gridFixture.root, {
      perPage: 1,
      gap: 20,
      arrows: {
        next: '.tvist-button-next',
        prev: '.tvist-button-prev',
      },
      scrollbar: true,
    })

    // Слайдер должен корректно инициализироваться
    expect(slider).toBeDefined()
    expect(slider.slides.length).toBe(5)

    // Индекс должен быть 0 (начальная позиция)
    expect(slider.engine.index.get()).toBe(0)
  })

  it('ResizeObserver наблюдает за track при вертикальном направлении', () => {
    const observedElements: Element[] = []
    const OriginalResizeObserver = global.ResizeObserver

    global.ResizeObserver = class MockResizeObserver {
      constructor(public callback: ResizeObserverCallback) {}
      observe(target: Element) {
        observedElements.push(target)
      }
      unobserve() {}
      disconnect() {}
    } as any

    slider = new Tvist(fixture.root, {
      perPage: 1,
      gap: 20,
      direction: 'vertical',
      scrollbar: true,
    })

    global.ResizeObserver = OriginalResizeObserver

    // Для вертикального направления тоже должен наблюдать за track
    expect(observedElements).toContain(fixture.track)
    expect(observedElements).not.toContain(fixture.root)
  })
})
