/**
 * Регрессия: center: { justify: true } не должен приводить к бесконечному
 * росту ширины слайдов и/или огромному translate3d.
 *
 * Баг воспроизводится, когда контейнер слайдера находится в родителе, который
 * допускает intrinsic sizing (grid/flex без min-width: 0): размер track растёт
 * из-за содержимого контейнера → ResizeObserver тянет update → slideSize
 * пересчитывается от нового, большего track → содержимое ещё больше → и т.д.
 *
 * В реальном браузере наблюдались значения вроде width: 5965220px,
 * translate3d(2982620px, 0, 0).
 *
 * В тестах эмулируем этот сценарий, переопределяя getter offsetWidth у track
 * так, что он возвращает max(initial, <реальный размер содержимого контейнера>),
 * имитируя intrinsic sizing grid-родителя.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures'

/**
 * Подменяет offsetWidth у track так, чтобы он вычислялся из текущих
 * style.width слайдов + margin-right (gap). Эмулирует поведение
 * grid/flex parent без `min-width: 0`, когда трек «тянется» за содержимым.
 *
 * Возвращает геттер, читающий актуальные style слайдов на каждое обращение.
 */
function emulateIntrinsicSizingParent(
  track: HTMLElement,
  container: HTMLElement,
  initialWidth: number
): void {
  const measure = (): number => {
    let sum = 0
    const slides = Array.from(container.children) as HTMLElement[]
    for (const slide of slides) {
      const w = parseFloat(slide.style.width || '0')
      if (Number.isFinite(w)) sum += w
      const mr = parseFloat(slide.style.marginRight || '0')
      if (Number.isFinite(mr)) sum += mr
    }
    return Math.max(initialWidth, sum)
  }

  Object.defineProperty(track, 'offsetWidth', {
    configurable: true,
    get: measure,
  })
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    get: measure,
  })
  Object.defineProperty(container, 'offsetWidth', {
    configurable: true,
    get: measure,
  })
  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    get: measure,
  })
}

describe('center.justify — feedback loop regression', () => {
  let fixture: ReturnType<typeof createSliderFixture>
  let slider: Tvist | null = null

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture?.cleanup()
  })

  it('не должен бесконечно раздувать ширину слайдов при update() (locked + justify)', () => {
    // 2 слайда, perPage: 3 → locked. Родитель трека допускает intrinsic sizing.
    const rootWidth = 600
    fixture = createSliderFixture({
      slidesCount: 2,
      width: rootWidth,
    })

    emulateIntrinsicSizingParent(fixture.track, fixture.container, rootWidth)

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 0,
      loop: false,
      drag: true,
    })

    expect(slider.engine.isLocked).toBe(true)

    const firstSlideWidth = parseFloat(fixture.slides[0].style.width || '0')

    // Имитируем несколько последовательных ResizeObserver trigger-ов
    // (как при реальной работе страницы/ре-лайаутах).
    slider.update()
    slider.update()
    slider.update()

    const slideWidthAfter = parseFloat(fixture.slides[0].style.width || '0')

    // Ширина слайда не должна стать больше исходной ширины root: математически
    // в locked-режиме контент не может выходить за пределы viewport, иначе
    // lock перестаёт иметь смысл.
    expect(slideWidthAfter).toBeLessThanOrEqual(rootWidth)
    // И не должна расти относительно первого расчёта.
    expect(slideWidthAfter).toBeLessThanOrEqual(firstSlideWidth + 1)
  })

  it('translate3d контейнера не должен быть огромным при center.justify + locked', () => {
    const rootWidth = 600
    fixture = createSliderFixture({
      slidesCount: 2,
      width: rootWidth,
    })

    emulateIntrinsicSizingParent(fixture.track, fixture.container, rootWidth)

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 0,
      drag: true,
    })

    slider.update()
    slider.update()

    const transform = fixture.container.style.transform
    const match = transform.match(/translate3d\((-?\d+(?:\.\d+)?)px/)
    const offset = match ? parseFloat(match[1]) : 0

    // Ожидаемый offset — (rootWidth - contentSize) / 2, где contentSize
    // это сумма слайдов + gap. Допуск — ширина root; значение больше
    // говорит о feedback-loop.
    expect(Math.abs(offset)).toBeLessThanOrEqual(rootWidth)
  })

  it('ширина слайда не должна расти при обычном (не locked) режиме с justify', () => {
    // 6 слайдов, perPage: 3 → не locked, но опция center.justify задана.
    // Пользователь воспроизводил рост и в unlocked-режиме тоже.
    const rootWidth = 600
    fixture = createSliderFixture({
      slidesCount: 6,
      width: rootWidth,
    })

    emulateIntrinsicSizingParent(fixture.track, fixture.container, rootWidth)

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 0,
      drag: true,
    })

    expect(slider.engine.isLocked).toBe(false)

    const widthsFirst = fixture.slides.map(s => parseFloat(s.style.width || '0'))

    slider.update()
    slider.update()
    slider.update()

    const widthsAfter = fixture.slides.map(s => parseFloat(s.style.width || '0'))

    for (let i = 0; i < widthsAfter.length; i++) {
      expect(widthsAfter[i]).toBeLessThanOrEqual(rootWidth)
      expect(widthsAfter[i]).toBeLessThanOrEqual(widthsFirst[i] + 1)
    }
  })

  it('contentSize не должен превышать viewport в locked-режиме с justify', () => {
    const rootWidth = 800
    fixture = createSliderFixture({
      slidesCount: 2,
      width: rootWidth,
    })

    emulateIntrinsicSizingParent(fixture.track, fixture.container, rootWidth)

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 0,
    })

    slider.update()
    slider.update()

    expect(slider.engine.isLocked).toBe(true)

    // getTotalSize() считает суммарный размер контента по позициям и размерам.
    // В locked + justify он должен помещаться в viewport.
    const totalSize = slider.engine.getTotalSize()
    expect(totalSize).toBeLessThanOrEqual(rootWidth)
    expect(Number.isFinite(totalSize)).toBe(true)
  })

  it('update() должен быть идемпотентным: повторные вызовы не меняют layout', () => {
    // Ключевой инвариант: если ничего не изменилось снаружи, update() не должен
    // порождать изменений во внутреннем состоянии (и, как следствие,
    // триггерить новые ResizeObserver-срабатывания через style.width).
    const rootWidth = 500
    fixture = createSliderFixture({
      slidesCount: 2,
      width: rootWidth,
    })

    emulateIntrinsicSizingParent(fixture.track, fixture.container, rootWidth)

    slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 0,
    })

    const snapshot = () => ({
      slideWidths: fixture.slides.map(s => s.style.width),
      transform: fixture.container.style.transform,
    })

    slider.update()
    const before = snapshot()

    for (let i = 0; i < 5; i++) {
      slider.update()
    }

    const after = snapshot()

    expect(after).toEqual(before)
  })
})
