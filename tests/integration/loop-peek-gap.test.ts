import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '../../src'
import { createSliderFixture, type SliderFixture } from '../fixtures'

/**
 * Локализация бага:
 *
 * loop: true
 * perPage: 3
 * gap: 32
 * peek: 120
 * slidesCount: 4
 *
 * При такой конфигурации в реальном проекте появлялась "дыра" справа:
 * во viewport попадали только слайды с realIndex 2 и 3, при этом
 * правая часть viewport оставалась пустой.
 *
 * Цель теста — зафиксировать, что при инициализации слайдера
 * viewport полностью покрыт слайдами без правого зазора.
 */

describe('Loop + peek + perPage:3 — no right gap with 4 slides', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  beforeEach(() => {
    // Воспроизводим реальный кейс: ширина окна ~1103px
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1103
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture.cleanup()
  })

  it('should not create right gap on initial layout', () => {
    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 32,
      loop: true,
      peek: 120,
      speed: 0
    })

    // viewport в координатах контента: [vpLeft, vpRight]
    const location = slider.engine.location.get()
    const viewportSize = slider.engine.containerSizeValue

    const vpLeft = -location
    const vpRight = vpLeft + viewportSize

    // Крайние позиции контента по всем слайдам
    let contentLeft = Infinity
    let contentRight = -Infinity

    for (let i = 0; i < slider.slides.length; i++) {
      const pos = slider.engine.getSlidePosition(i)
      const size = slider.engine.getSlideSize(i)
      if (pos < contentLeft) contentLeft = pos
      if (pos + size > contentRight) contentRight = pos + size
    }

    const leftGap = Math.max(0, contentLeft - vpLeft)
    const rightGap = Math.max(0, vpRight - contentRight)

    // Важная проверка: справа не должно быть заметного зазора
    expect(rightGap).toBeLessThan(5)
    // И в целом viewport должен быть покрыт слайдами
    expect(leftGap + rightGap).toBeLessThan(5)
  })
})

