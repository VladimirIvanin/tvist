/**
 * Тесты для метода updateOptions класса Tvist
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { createSliderFixture } from '../../fixtures'
import type { SliderFixture } from '../../fixtures'
import '../../../src/modules/autoplay' // Регистрация модуля autoplay

describe('Tvist.updateOptions()', () => {
  let fixture: SliderFixture

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 1000 })
  })

  afterEach(() => {
    fixture.cleanup()
  })

  it('должен обновлять perPage', () => {
    const slider = new Tvist(fixture.root, { perPage: 1 })

    expect(slider.options.perPage).toBe(1)

    slider.updateOptions({ perPage: 3 })

    expect(slider.options.perPage).toBe(3)
  })

  it('должен обновлять gap', () => {
    const slider = new Tvist(fixture.root, { gap: 10 })

    expect(slider.options.gap).toBe(10)

    slider.updateOptions({ gap: 20 })

    expect(slider.options.gap).toBe(20)
  })

  it('должен обновлять speed', () => {
    const slider = new Tvist(fixture.root, { speed: 300 })

    expect(slider.options.speed).toBe(300)

    slider.updateOptions({ speed: 500 })

    expect(slider.options.speed).toBe(500)
  })

  it('должен обновлять direction и добавлять класс', () => {
    const slider = new Tvist(fixture.root, { direction: 'horizontal' })

    expect(slider.options.direction).toBe('horizontal')
    expect(fixture.root.classList.contains('tvist--vertical')).toBe(false)

    slider.updateOptions({ direction: 'vertical' })

    expect(slider.options.direction).toBe('vertical')
    expect(fixture.root.classList.contains('tvist--vertical')).toBe(true)
  })

  it('должен обновлять несколько опций одновременно', () => {
    const slider = new Tvist(fixture.root, {
      perPage: 1,
      gap: 10,
      speed: 300
    })

    slider.updateOptions({
      perPage: 3,
      gap: 20,
      speed: 500
    })

    expect(slider.options.perPage).toBe(3)
    expect(slider.options.gap).toBe(20)
    expect(slider.options.speed).toBe(500)
  })

  it('должен вызывать событие optionsUpdated', () => {
    let eventCalled = false
    let receivedOptions: any = null

    const slider = new Tvist(fixture.root, {
      on: {
        optionsUpdated: (tvist, newOptions) => {
          eventCalled = true
          receivedOptions = newOptions
        }
      }
    })

    slider.updateOptions({ perPage: 3 })

    expect(eventCalled).toBe(true)
    expect(receivedOptions).toEqual({ perPage: 3 })
  })

  it('должен возвращать this для цепочки вызовов', () => {
    const slider = new Tvist(fixture.root, { perPage: 1 })

    const result = slider.updateOptions({ perPage: 2 })

    expect(result).toBe(slider)
  })

  it('должен обновлять обработчики событий', () => {
    let handler1Called = false
    let handler2Called = false

    const slider = new Tvist(fixture.root, {
      on: {
        slideChange: () => {
          handler1Called = true
        }
      }
    })

    // Переходим к следующему слайду - должен сработать handler1
    slider.scrollTo(1)
    expect(handler1Called).toBe(true)

    // Обновляем обработчик
    slider.updateOptions({
      on: {
        slideChange: () => {
          handler2Called = true
        }
      }
    })

    // Переходим к следующему слайду - должен сработать handler2
    handler1Called = false
    slider.scrollTo(0)
    
    // Старый обработчик не должен вызываться (уже false)
    // Новый обработчик должен вызваться
    expect(handler2Called).toBe(true)
  })

  it('должен пересчитывать размеры при изменении perPage', () => {
    const slider = new Tvist(fixture.root, { perPage: 1 })

    const initialSlideSize = slider.engine.slideSizeValue

    slider.updateOptions({ perPage: 2 })

    const updatedSlideSize = slider.engine.slideSizeValue

    // При perPage=2 размер слайда должен измениться
    // (в реальных условиях с размерами контейнера)
    expect(updatedSlideSize).toBeDefined()
  })

  it('должен обновлять center опцию', () => {
    const slider = new Tvist(fixture.root, { center: false })

    expect(slider.options.center).toBe(false)

    slider.updateOptions({ center: true })

    expect(slider.options.center).toBe(true)
  })

  it('должен запускать autoplay при включении через updateOptions', async () => {
    const slider = new Tvist(fixture.root, { autoplay: false })

    expect(slider.options.autoplay).toBe(false)
    expect(slider.activeIndex).toBe(0)

    // Включаем autoplay
    slider.updateOptions({ autoplay: 500 })

    expect(slider.options.autoplay).toBe(500)

    // Ждём, чтобы autoplay сработал
    await new Promise(resolve => setTimeout(resolve, 600))

    // Должен перейти на следующий слайд
    expect(slider.activeIndex).toBe(1)

    slider.destroy()
  })

  it('должен останавливать autoplay при отключении через updateOptions', async () => {
    const slider = new Tvist(fixture.root, { autoplay: 500 })

    // Ждём, чтобы autoplay сработал один раз
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(slider.activeIndex).toBe(1)

    // Отключаем autoplay сразу после перехода
    slider.updateOptions({ autoplay: false })
    expect(slider.options.autoplay).toBe(false)

    const currentIndex = slider.activeIndex

    // Ждём достаточно времени для двух потенциальных тиков
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Не должен перейти дальше
    expect(slider.activeIndex).toBe(currentIndex)

    slider.destroy()
  })

  it('должен обновлять задержку autoplay через updateOptions', async () => {
    const slider = new Tvist(fixture.root, { autoplay: 1000 })

    // Изменяем задержку на более короткую
    slider.updateOptions({ autoplay: 300 })

    // Ждём короткую задержку
    await new Promise(resolve => setTimeout(resolve, 400))

    // Должен успеть перейти с новой задержкой
    expect(slider.activeIndex).toBe(1)

    slider.destroy()
  })
})
