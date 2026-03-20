import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'
import type { SliderFixture } from '../fixtures'
import '../../src/modules/breakpoints'

describe('Disabled slider + updateOptions width debug', () => {
  let fixture: SliderFixture
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    window.innerWidth = 618
    fixture = createSliderFixture({ slidesCount: 6, width: 618 })
    
    // Перехватываем установку стилей, чтобы увидеть stack trace
    const slide = fixture.slides[0]
    const container = fixture.container
    
    let w = ''
    Object.defineProperty(slide.style, 'width', {
      get() { return w },
      set(val) {
        w = val
        if (val !== '') {
          console.log('SET WIDTH TO:', val)
          console.log(new Error().stack)
        }
      }
    })
    
    let t = ''
    Object.defineProperty(container.style, 'transform', {
      get() { return t },
      set(val) {
        t = val
        if (val !== '') {
          console.log('SET TRANSFORM TO:', val)
          console.log(new Error().stack)
        }
      }
    })
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
    fixture.cleanup()
  })

  it('должен показать, кто ставит ширину', () => {
    window.innerWidth = 618 // 1. Эмитируем начальный размер
    
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

    console.log('AFTER INIT: isEnabled =', slider.isEnabled)
    
    // В пользовательском коде происходит $(window).on("resize") -> updateOptions
    // Пользователь сначала делает resize окна. В тестах мы эмулируем это
    // НО, так как мы используем matchMedia, оно слушает resize
    window.innerWidth = 760 // Изменяем ширину так, чтобы слайдер ОСТАВАЛСЯ disabled
    
    // Эмулируем вызов updateOptions как делает пользователь в обработчике on("resize")
    // ВАЖНО: При resize сначала может сработать matchMedia, потом $(window).on("resize")
    // или наоборот, порядок не гарантирован.
    // Если слайдер выключен (enabled: false), мы вообще не должны применять к нему стили.
    slider.updateOptions({
      slideMinSize: 140,
      gap: 12,
      peek: {
        before: 0,
        after: 92.6
      }
    })
    // BreakpointsModule.handleMediaChange (/home/ivaninvladimir/work/tvist/src/modules/breakpoints/BreakpointsModule.ts:113:18)
    
    // В тесте не нужны spy, мы видим stacktrace
    // expect(fixture.slides[0].style.width).toBe('')
    // expect(fixture.container.style.transform).toBe('')
  })
})