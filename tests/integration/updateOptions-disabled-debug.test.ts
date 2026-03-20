import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'
import type { SliderFixture } from '../fixtures'
import '../../src/modules/breakpoints'

describe('Disabled slider + updateOptions Debug', () => {
  let fixture: SliderFixture
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    window.innerWidth = 618 // Сразу задаем ширину окна
    fixture = createSliderFixture({ slidesCount: 6, width: 618 })
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
    fixture.cleanup()
  })

  it('должен отследить цепочку вызовов при updateOptions на disabled', () => {
    // 1. Инициализируем как у пользователя (mobile_point = 767)
    // 618px <= 768, значит сработает breakpoint 768
    const slider = new Tvist(fixture.root, {
      slideMinSize: 130,
      gap: 15,
      slidesPerGroup: 1,
      breakpoints: {
        768: {
          peek: {
            before: 5,
            after: 50
          },
          enabled: false
        }
      }
    })

    // Ожидаем, что он отключен
    expect(slider.isEnabled).toBe(false)
    expect(fixture.slides[0].style.width).toBe('')

    // Спайка на engine.update
    const engineUpdateSpy = vi.spyOn(slider.engine, 'update')
    // Спайка на calculateSizes
    const calculateSizesSpy = vi.spyOn(slider.engine as any, 'calculateSizes')
    // Спайка на syncModules
    const syncModulesSpy = vi.spyOn(slider, 'syncModules')

    // 2. Симулируем вызов updateOptions как в пользовательском $(window).on("resize")
    slider.updateOptions({
      slideMinSize: 140,
      gap: 12,
      peek: {
        before: 0,
        after: 92.6
      }
    })

    console.log('--- DEBUG INFO ---')
    console.log('engineUpdateSpy called:', engineUpdateSpy.mock.calls.length)
    console.log('calculateSizesSpy called:', calculateSizesSpy.mock.calls.length)
    console.log('syncModulesSpy called:', syncModulesSpy.mock.calls.length, 'with args:', syncModulesSpy.mock.calls[0])
    console.log('Slide 0 width:', fixture.slides[0].style.width)
    console.log('Container transform:', fixture.container.style.transform)

    // Проверяем, что ширина не установилась
    expect(fixture.slides[0].style.width).toBe('')
    expect(fixture.container.style.transform).toBe('')
  })
})
