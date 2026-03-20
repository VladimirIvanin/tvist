import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'
import type { SliderFixture } from '../fixtures'
import '../../src/modules/breakpoints'
import { TVIST_CLASSES } from '../../src/core/constants'

describe('Disabled State Integration', () => {
  let fixture: SliderFixture
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    window.innerWidth = 618
    fixture = createSliderFixture({ slidesCount: 6, width: 618 })
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
    fixture.cleanup()
  })

  it('не должен применять стили (width, transform) при вызове updateOptions на выключенном слайдере', () => {
    // Инициализируем слайдер с брейкпоинтом, который отключит его на мобилке
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

    // Ожидаем, что он отключен и стили не применены
    expect(slider.isEnabled).toBe(false)
    expect(fixture.slides[0].style.width).toBe('')
    expect(fixture.container.style.transform).toBe('')

    // Симулируем вызов updateOptions
    slider.updateOptions({
      slideMinSize: 140,
      gap: 12,
      peek: {
        before: 0,
        after: 92.6
      }
    })

    // Проверяем, что ширина и трансформация не установились
    expect(fixture.slides[0].style.width).toBe('')
    expect(fixture.container.style.transform).toBe('')
  })

  it('не должен применять стили при resize окна, если слайдер остается выключенным', () => {
    const slider = new Tvist(fixture.root, {
      breakpoints: {
        768: { enabled: false }
      }
    })

    expect(slider.isEnabled).toBe(false)
    
    // Эмулируем resize окна в пределах того же брейкпоинта (слайдер должен остаться выключенным)
    window.innerWidth = 700
    // Вызов обработчика брейкпоинтов будет вызван через мок matchMedia в setup.ts
    // Подождем, чтобы сработал resize event если он асинхронный (в наших тестах он синхронный, но на всякий случай)
    
    expect(slider.isEnabled).toBe(false)
    expect(fixture.slides[0].style.width).toBe('')
    expect(fixture.container.style.transform).toBe('')
  })

  it('должен удалять класс locked при выключении слайдера', () => {
    // Делаем так, чтобы слайдер изначально был заблокирован (всего 1 слайд)
    const lockedFixture = createSliderFixture({ slidesCount: 1, width: 1000 })
    
    const slider = new Tvist(lockedFixture.root, {
      perPage: 2
    })

    // Убеждаемся, что класс locked был добавлен
    expect(lockedFixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(true)

    // Выключаем слайдер
    slider.disable()

    // Проверяем, что класс удалился
    expect(lockedFixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(false)
    
    lockedFixture.cleanup()
  })
})
