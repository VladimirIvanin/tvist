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

  it('should not create right gap on initial layout or after scrolling', async () => {
    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 32,
      loop: true,
      peek: 120,
      speed: 0
    })

    const checkGaps = () => {
      const location = slider!.engine.location.get()
      const viewportSize = slider!.engine.containerSizeValue

      const vpLeft = -location
      const vpRight = vpLeft + viewportSize

      let contentLeft = Infinity
      let contentRight = -Infinity

      for (let i = 0; i < slider!.slides.length; i++) {
        const pos = slider!.engine.getSlidePosition(i)
        const size = slider!.engine.getSlideSize(i)
        if (pos < contentLeft) contentLeft = pos
        if (pos + size > contentRight) contentRight = pos + size
      }

      const leftGap = Math.max(0, contentLeft - vpLeft)
      const rightGap = Math.max(0, vpRight - contentRight)

      return { leftGap, rightGap }
    }

    // Проверяем начальное состояние
    let gaps = checkGaps()
    expect(gaps.rightGap).toBeLessThan(5)
    expect(gaps.leftGap + gaps.rightGap).toBeLessThan(5)

    // Листаем вперед 10 раз и проверяем дыры на каждом шаге
    for (let i = 0; i < 10; i++) {
      slider.next()
      await new Promise(r => setTimeout(r, 50)) // ждем завершения (speed: 0, так что быстро)
      gaps = checkGaps()
      expect(gaps.rightGap).toBeLessThan(5)
      expect(gaps.leftGap + gaps.rightGap).toBeLessThan(5)
    }
  })
})

