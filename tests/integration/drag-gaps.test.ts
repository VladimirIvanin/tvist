/**
 * Тесты для локализации багов с пустотами (gaps) при drag
 *
 * Баг 1: Loop + Drag — при длинном непрерывном drag слайды не перестраиваются,
 *         появляются пустоты. Причина: флаг loopFixed=true блокирует повторный
 *         вызов loopFix при пересечении границ.
 *
 * Баг 2: Marquee + Drag — при drag слайды вообще не перестраиваются.
 *         Причина: loopFix пропускается для marquee режима, а собственная
 *         логика перестановки слайдов MarqueeModule стоит на паузе.
 *
 * Баг 3: Несколько drag подряд — на втором drag позиция скачет.
 *         Причина: предположительно некорректный startPosition из-за
 *         рассинхронизации engine.location после loopFix + snap.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSliderFixture, type SliderFixture } from '../fixtures'
import { Tvist } from '@core/Tvist'
import '../../src/modules/loop'
import '../../src/modules/drag'
import '../../src/modules/marquee'

// =============================================================================
// Хелперы
// =============================================================================

/**
 * Проверяет покрытие viewport слайдами.
 *
 * Viewport в координатах контента: [vpLeft, vpRight].
 * vpLeft = -location (location отрицательный = сдвиг влево).
 * Слайды расположены последовательно: [0, slideWithGap, 2*slideWithGap, ...].
 *
 * Пустота (gap) — область viewport, где нет ни одного слайда:
 * - leftGap: viewport начинается до первого слайда
 * - rightGap: viewport заканчивается после последнего слайда
 */
function checkViewportCoverage(slider: Tvist, viewportWidth: number) {
  const location = slider.engine.location.get()
  const slides = slider.slides

  const vpLeft = -location
  const vpRight = vpLeft + viewportWidth

  // Крайние позиции контента
  let contentLeft = Infinity
  let contentRight = -Infinity

  for (let i = 0; i < slides.length; i++) {
    const pos = slider.engine.getSlidePosition(i)
    const size = slider.engine.getSlideSize(i)
    if (pos < contentLeft) contentLeft = pos
    if (pos + size > contentRight) contentRight = pos + size
  }

  const leftGap = Math.max(0, contentLeft - vpLeft)
  const rightGap = Math.max(0, vpRight - contentRight)

  return {
    location,
    vpLeft,
    vpRight,
    contentLeft,
    contentRight,
    leftGap,
    rightGap,
    hasGaps: leftGap > 5 || rightGap > 5, // 5px tolerance
    totalGap: leftGap + rightGap,
    slidesCount: slides.length,
  }
}

/**
 * Получить translateX из стиля transform контейнера
 */
function getTranslateX(element: HTMLElement): number {
  const transform = element.style.transform
  if (!transform) return 0
  const match = transform.match(/translate3d\(([^,]+)/)
  if (!match) return 0
  return parseFloat(match[1])
}

/**
 * Начало непрерывного drag (pointerdown + серия pointermove).
 * Мышь НЕ отпускается — можно проверить состояние во время drag.
 * Возвращает функцию для завершения drag (pointerup).
 */
async function startContinuousDrag(
  root: HTMLElement,
  startX: number,
  totalDeltaX: number,
  steps: number
): Promise<() => Promise<void>> {
  root.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX: startX,
      clientY: 100,
      bubbles: true,
      cancelable: true,
      button: 0,
    })
  )
  await new Promise((r) => setTimeout(r, 10))

  const stepSize = totalDeltaX / steps
  for (let i = 1; i <= steps; i++) {
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: startX + stepSize * i,
        clientY: 100,
        bubbles: true,
        cancelable: true,
      })
    )
    await new Promise((r) => setTimeout(r, 5))
  }

  const finalX = startX + totalDeltaX
  return async () => {
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: finalX,
        clientY: 100,
        bubbles: true,
        cancelable: true,
      })
    )
    await new Promise((r) => setTimeout(r, 20))
  }
}

/**
 * Полный цикл drag (pointerdown → pointermove → pointerup)
 */
async function completeDrag(
  root: HTMLElement,
  startX: number,
  totalDeltaX: number,
  steps: number = 10
): Promise<void> {
  const endDrag = await startContinuousDrag(root, startX, totalDeltaX, steps)
  await endDrag()
  await new Promise((r) => setTimeout(r, 50))
}

// =============================================================================
// Тесты
// =============================================================================

describe('BUG: Пустоты (gaps) при drag в loop/marquee режиме', () => {
  let fixture: SliderFixture
  let slider: Tvist | null = null

  const VIEWPORT = 800
  const SLIDE_W = 200
  const GAP = 20
  const SLIDE_WITH_GAP = SLIDE_W + GAP // 220px

  beforeEach(() => {
    fixture = createSliderFixture({
      slidesCount: 8,
      width: VIEWPORT,
      slideWidth: SLIDE_W,
    })
  })

  afterEach(() => {
    slider?.destroy()
    slider = null
    fixture?.cleanup()
  })

  // ===========================================================================
  // Bug 1: Loop + Drag — пустоты при длинном непрерывном drag
  //
  // Суть: DragModule вызывает loopFix один раз при начале drag и выставляет
  // флаг loopFixed=true. Этот флаг блокирует повторные вызовы loopFix при
  // пересечении границ (строки 430-467 DragModule). Если drag-расстояние
  // превышает буфер подготовленных слайдов (loopedSlides * slideWithGap),
  // viewport выходит за пределы контента и появляются пустоты.
  //
  // При perPage=1: loopedSlides=1, буфер=220px. Drag 400px → пустота 180px.
  // ===========================================================================

  describe('Bug 1: Loop + Drag — пустоты при длинном непрерывном drag', () => {
    it('при непрерывном drag вправо на 1000px — viewport должен быть заполнен', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 1,
        gap: GAP,
      })

      // Engine рассчитывает slideSize = viewport/perPage = 800px
      // loopedSlides=1 → буфер = 1 × (800+20) = 820px
      // Drag 1000px вправо: превышает буфер на ~180px → пустота слева!
      // Ожидание: loopFix вызывается повторно для подстановки слайдов
      // Баг: loopFixed=true после первого loopFix блокирует повторные вызовы

      const endDrag = await startContinuousDrag(fixture.root, 400, 1000, 50)

      // Проверяем ВО ВРЕМЯ drag (мышь ещё не отпущена)
      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 1] drag 1000px вправо:', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      // Слева не должно быть пустот
      expect(coverage.leftGap).toBeLessThan(5)
      expect(coverage.hasGaps).toBe(false)

      await endDrag()
    })

    it('при непрерывном drag влево на 1000px — viewport должен быть заполнен', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 1,
        gap: GAP,
      })

      // Аналогично: буфер ≈ 820px, drag 1000px → пустота справа
      const endDrag = await startContinuousDrag(fixture.root, 800, -1000, 50)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 1] drag 1000px влево:', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      // Справа не должно быть пустот
      expect(coverage.rightGap).toBeLessThan(5)
      expect(coverage.hasGaps).toBe(false)

      await endDrag()
    })

    it('зигзаг drag (вправо-влево-вправо 1200px) без отпускания — viewport заполнен', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 1,
        gap: GAP,
      })

      // При каждой смене направления вызывается loopFix, обновляется startPosition.
      // Но при длинном финальном движении вправо (>буфера) пустоты появляются,
      // потому что loopFixed=true блокирует повторные вызовы.
      // Финальное движение 1200px значительно превышает буфер ~820px.

      // Начинаем drag
      fixture.root.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 400,
          clientY: 100,
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      )
      await new Promise((r) => setTimeout(r, 10))

      // Фаза 1: вправо 200px (курсор: 400 → 600)
      for (let i = 1; i <= 20; i++) {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 400 + i * 10,
            clientY: 100,
            bubbles: true,
            cancelable: true,
          })
        )
        await new Promise((r) => setTimeout(r, 3))
      }
      // Фаза 2: влево 400px (курсор: 600 → 200)
      for (let i = 1; i <= 40; i++) {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 600 - i * 10,
            clientY: 100,
            bubbles: true,
            cancelable: true,
          })
        )
        await new Promise((r) => setTimeout(r, 3))
      }
      // Фаза 3: вправо 1200px (курсор: 200 → 1400) — превышает буфер!
      for (let i = 1; i <= 60; i++) {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 200 + i * 20,
            clientY: 100,
            bubbles: true,
            cancelable: true,
          })
        )
        await new Promise((r) => setTimeout(r, 3))
      }

      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 1] зигзаг drag (финал 1200px вправо):', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      expect(coverage.hasGaps).toBe(false)

      // Завершаем drag
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 1400,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        })
      )
    })

    it('loopFix должен вызываться повторно при длинном drag', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 1,
        gap: GAP,
      })

      // Отслеживаем вызовы loopFix
      const loopModule = slider.getModule('loop') as {
        fix: (params: Record<string, unknown>) => number
      }
      const loopFixCalls: Array<{ params: Record<string, unknown>; locationBefore: number; locationAfter: number }> = []
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: Record<string, unknown>) => {
        const before = slider!.engine.location.get()
        const result = originalFix(params)
        const after = slider!.engine.location.get()
        loopFixCalls.push({ params, locationBefore: before, locationAfter: after })
        return result
      }

      // Drag 1000px вправо — после начального loopFix буфер ≈ 820px (slideSize+gap),
      // поэтому при drag > 820px нужен повторный вызов loopFix
      const endDrag = await startContinuousDrag(fixture.root, 400, 1000, 50)

      console.log('[Bug 1] вызовы loopFix:', loopFixCalls.length)
      loopFixCalls.forEach((call, i) => {
        console.log(`  #${i + 1}: direction=${call.params.direction}, loc: ${call.locationBefore} → ${call.locationAfter}`)
      })

      // loopFix должен вызываться больше одного раза при длинном drag:
      // первый раз при начале drag, затем при пересечении границ.
      // Баг: вызывается только 1 раз, loopFixed=true блокирует повторные.
      expect(loopFixCalls.length).toBeGreaterThan(1)

      await endDrag()
    })
  })

  // ===========================================================================
  // Bug 2: Marquee + Drag — слайды не перестраиваются при drag
  //
  // Суть: В marquee режиме DragModule намеренно пропускает loopFix при drag
  // (DragModule строки 303-309, 357-373, 430). При этом собственная логика
  // перестановки слайдов MarqueeModule (updatePosition) стоит на паузе,
  // потому что при drag marquee приостанавливается. В итоге никто не
  // переставляет слайды, и при drag появляются пустоты.
  // ===========================================================================

  describe('Bug 2: Marquee + Drag — слайды не заполняют пустоты при drag', () => {
    it('drag вправо 300px в marquee+loop — viewport должен быть заполнен', async () => {
      slider = new Tvist(fixture.root, {
        marquee: { speed: 60, direction: 'left' },
        drag: true,
        loop: true,
        gap: GAP,
      })

      // В marquee режиме loopFix полностью пропускается при drag.
      // MarqueeModule приостановлен → updatePosition не вызывается.
      // Drag вправо 300px: transform сдвигается, слайды не подставляются.

      const endDrag = await startContinuousDrag(fixture.root, 400, 300, 30)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 2] marquee + drag 300px вправо:', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      expect(coverage.leftGap).toBeLessThan(5)
      expect(coverage.hasGaps).toBe(false)

      await endDrag()
    })

    it('drag влево 300px в marquee+loop — viewport должен быть заполнен', async () => {
      slider = new Tvist(fixture.root, {
        marquee: { speed: 60, direction: 'left' },
        drag: true,
        loop: true,
        gap: GAP,
      })

      const endDrag = await startContinuousDrag(fixture.root, 400, -300, 30)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 2] marquee + drag 300px влево:', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      expect(coverage.rightGap).toBeLessThan(5)
      expect(coverage.hasGaps).toBe(false)

      await endDrag()
    })

    it('drag вправо из прокрученной позиции marquee — viewport заполнен', async () => {
      slider = new Tvist(fixture.root, {
        marquee: { speed: 60, direction: 'left' },
        drag: true,
        loop: true,
        gap: GAP,
      })

      // Симулируем что marquee уже прокрутился на 300px
      const marqueeModule = slider.getModule('marquee') as {
        setCurrentPosition?: (pos: number) => void
      }
      if (marqueeModule?.setCurrentPosition) {
        marqueeModule.setCurrentPosition(300)
        fixture.container.style.transform = 'translate3d(-300px, 0, 0)'
      }

      // Drag 400px вправо от текущей позиции marquee
      const endDrag = await startContinuousDrag(fixture.root, 400, 400, 40)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)

      console.log('[Bug 2] marquee(300px) + drag 400px вправо:', {
        location: coverage.location,
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })

      expect(coverage.hasGaps).toBe(false)

      await endDrag()
    })

    it('при drag в marquee режиме слайды должны переставляться', async () => {
      slider = new Tvist(fixture.root, {
        marquee: { speed: 60, direction: 'left' },
        drag: true,
        loop: true,
        gap: GAP,
      })

      const initialOrder = slider.slides.map((s) =>
        s.getAttribute('data-tvist-slide-index')
      )

      // Drag 400px вправо — достаточно чтобы первые слайды ушли за viewport
      const endDrag = await startContinuousDrag(fixture.root, 400, 400, 40)

      const orderAfterDrag = slider.slides.map((s) =>
        s.getAttribute('data-tvist-slide-index')
      )

      console.log('[Bug 2] порядок слайдов:', {
        before: initialOrder.join(','),
        after: orderAfterDrag.join(','),
        changed: initialOrder.join(',') !== orderAfterDrag.join(','),
      })

      // При drag вправо на 400px последние слайды должны быть перемещены в начало
      // (аналогично тому как MarqueeModule.updatePosition делает при direction='right')
      // Баг: порядок не меняется, потому что ни loopFix, ни marquee не работают
      expect(initialOrder.join(',')).not.toBe(orderAfterDrag.join(','))

      await endDrag()
    })
  })

  // ===========================================================================
  // Bug 3: Несколько drag подряд — скачок позиции
  //
  // Суть: После первого drag + snap анимации, loopFix изменил порядок слайдов
  // и скорректировал location. При начале второго drag startPosition
  // читается из engine.location, а затем вызывается loopFix, который может
  // вызвать update() и изменить состояние. Это приводит к скачку transform.
  // ===========================================================================

  describe('Bug 3: Несколько drag подряд — скачок позиции', () => {
    it('второй drag НЕ должен вызывать скачок transform', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      // Первый drag: 150px вправо (превышает snap threshold → snap к prev)
      await completeDrag(fixture.root, 400, 150, 15)
      // Ждём snap анимацию
      await new Promise((r) => setTimeout(r, 500))

      const locationAfterFirst = slider.engine.location.get()

      console.log('[Bug 3] после первого drag:', {
        location: locationAfterFirst,
        index: slider.engine.index.get(),
        activeIndex: slider.engine.activeIndex,
        slidesOrder: slider.slides
          .map((s) => s.getAttribute('data-tvist-slide-index'))
          .join(','),
      })

      // Второй drag: начинаем, двигаем 12px
      fixture.root.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 400,
          clientY: 100,
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      )
      await new Promise((r) => setTimeout(r, 10))

      // Первое движение (превышает threshold 5px)
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 412,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        })
      )
      await new Promise((r) => setTimeout(r, 10))

      // В loop-режиме при начале drag isFirstMove loopFix может переставить слайды.
      // Это меняет и location, и transform (raw-значения), но визуально слайды
      // остаются на месте — loopFix компенсирует перестановку через коррекцию transform.
      // Проверяем: drag-delta корректно применяется ПОСЛЕ loopFix.
      // После isFirstMove startPosition = engine.location (post-loopFix).
      // newPosition = startPosition + dragDelta (12px).
      // Разница между newPosition и startPosition должна быть ≈ 12px.
      const locationDuringSecond = slider.engine.location.get()
      const transformDuringSecond = getTranslateX(fixture.container)

      console.log('[Bug 3] начало второго drag (+12px):', {
        location: locationDuringSecond,
        transform: transformDuringSecond,
        index: slider.engine.index.get(),
        slidesOrder: slider.slides
          .map((s) => s.getAttribute('data-tvist-slide-index'))
          .join(','),
      })

      // Transform и location должны быть консистентны (equal)
      expect(Math.abs(locationDuringSecond - transformDuringSecond)).toBeLessThan(1)

      // Viewport должен быть заполнен
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      console.log('[Bug 3] coverage:', {
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })
      expect(coverage.hasGaps).toBe(false)

      // Завершаем drag
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 412,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        })
      )
    })

    it('три drag вправо подряд (с snap) — пустот быть не должно', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const snapData: Array<{
        dragNum: number
        before: number
        after: number
        hasGaps: boolean
      }> = []

      for (let dragNum = 1; dragNum <= 3; dragNum++) {
        const locationBefore = slider.engine.location.get()

        // Drag 150px вправо → snap к prev слайду
        await completeDrag(fixture.root, 400, 150, 15)
        await new Promise((r) => setTimeout(r, 500))

        const locationAfter = slider.engine.location.get()
        const coverage = checkViewportCoverage(slider!, VIEWPORT)

        snapData.push({
          dragNum,
          before: locationBefore,
          after: locationAfter,
          hasGaps: coverage.hasGaps,
        })

        console.log(`[Bug 3] drag #${dragNum}: loc ${locationBefore} → ${locationAfter}, gaps: ${coverage.hasGaps}`)

        // Viewport заполнен после каждого drag
        expect(coverage.hasGaps).toBe(false)
      }

      // Каждый drag перемещает к предыдущему слайду.
      // Позиции должны монотонно расти (смещение вправо = location растёт).
      for (let i = 1; i < snapData.length; i++) {
        const prev = snapData[i - 1]!
        const curr = snapData[i]!
        // После каждого drag вправо location должен вырасти на ~1 slideWithGap
        // или остаться тем же (если snap вернул назад)
        expect(curr.after).toBeGreaterThanOrEqual(prev.after - 5)
      }
    })

    it('позиция после drag вправо-отпускание-drag вправо должна быть корректной', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialLocation = slider.engine.location.get()

      // Первый drag: 150px вправо (превышает threshold → snap к prev слайду)
      await completeDrag(fixture.root, 400, 150, 15)
      await new Promise((r) => setTimeout(r, 500))

      const locationAfterFirst = slider.engine.location.get()

      console.log('[Bug 3] после первого drag (150px вправо):', {
        initial: initialLocation,
        afterFirst: locationAfterFirst,
      })

      // Второй drag: 150px вправо
      await completeDrag(fixture.root, 400, 150, 15)
      await new Promise((r) => setTimeout(r, 500))

      const locationAfterSecond = slider.engine.location.get()
      const transformAfterSecond = getTranslateX(fixture.container)

      console.log('[Bug 3] после второго drag (150px вправо):', {
        afterSecond: locationAfterSecond,
        transform: transformAfterSecond,
      })

      // Transform и location должны быть синхронизированы
      expect(Math.abs(transformAfterSecond - locationAfterSecond)).toBeLessThan(2)

      // Viewport должен быть заполнен
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('второй drag НЕ должен вызывать пустоты — сценарий с perPage: 2 из скриншота', async () => {
      // Воспроизведение бага из скриншота: Loop Mode с 2 слайдами на странице
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      // Первый drag вправо — достаточный для snap к prev слайду
      await completeDrag(fixture.root, 400, 200, 20)
      await new Promise((r) => setTimeout(r, 500))

      const stateAfterFirst = {
        location: slider.engine.location.get(),
        transform: getTranslateX(fixture.container),
        index: slider.engine.index.get(),
        activeIndex: slider.engine.activeIndex,
        slidesOrder: slider.slides
          .map((s) => s.getAttribute('data-tvist-slide-index'))
          .join(','),
      }
      console.log('[Bug 3 screenshot] после первого drag:', stateAfterFirst)

      // Второй drag вправо — должен работать корректно
      await completeDrag(fixture.root, 400, 200, 20)
      await new Promise((r) => setTimeout(r, 500))

      const stateAfterSecond = {
        location: slider.engine.location.get(),
        transform: getTranslateX(fixture.container),
        index: slider.engine.index.get(),
        activeIndex: slider.engine.activeIndex,
        slidesOrder: slider.slides
          .map((s) => s.getAttribute('data-tvist-slide-index'))
          .join(','),
      }
      console.log('[Bug 3 screenshot] после второго drag:', stateAfterSecond)

      // location и transform синхронизированы
      expect(
        Math.abs(stateAfterSecond.transform - stateAfterSecond.location)
      ).toBeLessThan(2)

      // Viewport полностью заполнен
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      console.log('[Bug 3 screenshot] coverage:', {
        leftGap: coverage.leftGap,
        rightGap: coverage.rightGap,
        hasGaps: coverage.hasGaps,
      })
      expect(coverage.hasGaps).toBe(false)

      // Второй drag должен сместить позицию дальше (не вернуть к началу)
      // Оба drag вправо → location должен расти
      expect(stateAfterSecond.location).toBeGreaterThanOrEqual(
        stateAfterFirst.location - 5
      )
    })
  })

  // ===========================================================================
  // Два коротких drag подряд — активный слайд не меняется
  //
  // Суть: Если оба drag'а меньше snap threshold, слайдер должен
  // возвращаться к тому же активному слайду. Не должно быть скачков
  // позиции, пустот или смены индекса.
  // ===========================================================================

  describe('Два коротких drag подряд — активный слайд не меняется', () => {
    // В loop mode activeIndex меняется при перестановке слайдов (loopFix),
    // но визуально это тот же слайд. Используем realIndex для проверки.

    it('два drag вправо по 50px не должны менять реальный слайд', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      // slideSize = (800 - 20) / 2 = 390px, threshold = max(390*0.2, 80) = 80px
      // drag 50px < 80px → snap обратно к текущему слайду

      const initialRealIndex = slider.realIndex

      console.log('[Short drag] начальное состояние:', {
        realIndex: initialRealIndex,
        activeIndex: slider.engine.activeIndex,
        location: slider.engine.location.get(),
      })

      // Первый короткий drag вправо (50px < threshold 80px)
      await completeDrag(fixture.root, 400, 50, 10)
      await new Promise((r) => setTimeout(r, 500))

      const realIndexAfterFirst = slider.realIndex

      console.log('[Short drag] после первого drag 50px:', {
        realIndex: realIndexAfterFirst,
        activeIndex: slider.engine.activeIndex,
        location: slider.engine.location.get(),
      })

      // Реальный слайд не изменился (loopFix может менять activeIndex, но не realIndex)
      expect(realIndexAfterFirst).toBe(initialRealIndex)

      // Второй короткий drag вправо (50px < threshold 80px)
      await completeDrag(fixture.root, 400, 50, 10)
      await new Promise((r) => setTimeout(r, 500))

      const realIndexAfterSecond = slider.realIndex
      const locationAfterSecond = slider.engine.location.get()
      const transformAfterSecond = getTranslateX(fixture.container)

      console.log('[Short drag] после второго drag 50px:', {
        realIndex: realIndexAfterSecond,
        activeIndex: slider.engine.activeIndex,
        location: locationAfterSecond,
        transform: transformAfterSecond,
      })

      // Реальный слайд не изменился
      expect(realIndexAfterSecond).toBe(initialRealIndex)

      // Transform синхронизирован с location
      expect(Math.abs(transformAfterSecond - locationAfterSecond)).toBeLessThan(2)

      // Viewport заполнен
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('drag вправо 50px затем влево 50px — реальный слайд не меняется', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      // Первый: drag вправо 50px (< threshold)
      await completeDrag(fixture.root, 400, 50, 10)
      await new Promise((r) => setTimeout(r, 500))

      expect(slider.realIndex).toBe(initialRealIndex)

      // Второй: drag влево 50px (< threshold)
      await completeDrag(fixture.root, 400, -50, 10)
      await new Promise((r) => setTimeout(r, 500))

      const finalRealIndex = slider.realIndex
      const finalLocation = slider.engine.location.get()
      const finalTransform = getTranslateX(fixture.container)

      console.log('[Short drag R+L] финальное состояние:', {
        realIndex: finalRealIndex,
        activeIndex: slider.engine.activeIndex,
        location: finalLocation,
        transform: finalTransform,
      })

      // Реальный слайд не изменился
      expect(finalRealIndex).toBe(initialRealIndex)

      // Transform синхронизирован
      expect(Math.abs(finalTransform - finalLocation)).toBeLessThan(2)

      // Без пустот
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('три коротких drag подряд — реальный слайд стабилен, пустот нет', async () => {
      slider = new Tvist(fixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      for (let i = 1; i <= 3; i++) {
        // Короткий drag 40px вправо (< threshold 80px)
        await completeDrag(fixture.root, 400, 40, 8)
        await new Promise((r) => setTimeout(r, 500))

        const realIdx = slider.realIndex
        const coverage = checkViewportCoverage(slider!, VIEWPORT)

        console.log(`[Short drag x3] #${i}: realIndex=${realIdx}, activeIndex=${slider.engine.activeIndex}, gaps=${coverage.hasGaps}`)

        // Реальный слайд не меняется
        expect(realIdx).toBe(initialRealIndex)

        // Без пустот
        expect(coverage.hasGaps).toBe(false)
      }
    })
  })

  // ===========================================================================
  // 4 слайда + perPage 2 — сценарий из LoopExample
  //
  // При малом количестве слайдов нормальные позиции viewport находятся
  // вблизи границ контента. Это может приводить к ложным срабатываниям
  // checkContentCoverageAndFix (пинг-понг перестановок), дрейфу realIndex
  // и потере слайдов из DOM при многократных drag.
  // ===========================================================================

  describe('4 слайда + perPage 2 (LoopExample сценарий)', () => {
    let smallFixture: SliderFixture

    beforeEach(() => {
      smallFixture = createSliderFixture({
        slidesCount: 4,
        width: VIEWPORT,
        slideWidth: SLIDE_W,
      })
    })

    afterEach(() => {
      smallFixture?.cleanup()
    })

    it('короткий drag вправо не меняет realIndex', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex
      const initialSlidesCount = slider.slides.length

      // Короткий drag вправо 40px (< threshold)
      await completeDrag(smallFixture.root, 400, 40, 8)
      await new Promise((r) => setTimeout(r, 500))

      expect(slider.realIndex).toBe(initialRealIndex)
      expect(slider.slides.length).toBe(initialSlidesCount)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('короткий drag влево не меняет realIndex', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      // Короткий drag влево 40px (< threshold)
      await completeDrag(smallFixture.root, 400, -40, 8)
      await new Promise((r) => setTimeout(r, 500))

      expect(slider.realIndex).toBe(initialRealIndex)
    })

    it('slidesOrder стабилен после snap (нет пинг-понга перестановок)', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      // Записываем порядок после snap (когда анимация завершена)
      const orderAfterInit = slider.slides
        .map(s => s.getAttribute('data-tvist-slide-index'))
        .join(',')

      // Короткий drag вправо (< threshold) → snap обратно
      await completeDrag(smallFixture.root, 400, 40, 8)
      await new Promise((r) => setTimeout(r, 500))

      const orderAfterDrag1 = slider.slides
        .map(s => s.getAttribute('data-tvist-slide-index'))
        .join(',')

      // Второй короткий drag вправо → snap обратно
      await completeDrag(smallFixture.root, 400, 40, 8)
      await new Promise((r) => setTimeout(r, 500))

      const orderAfterDrag2 = slider.slides
        .map(s => s.getAttribute('data-tvist-slide-index'))
        .join(',')

      console.log('[4slides] slidesOrder:', {
        init: orderAfterInit,
        afterDrag1: orderAfterDrag1,
        afterDrag2: orderAfterDrag2,
      })

      // После snap порядок должен быть одинаковым — нет дрейфа
      expect(orderAfterDrag1).toBe(orderAfterDrag2)
    })

    it('5 коротких drag вправо — realIndex не дрейфует', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      for (let i = 1; i <= 5; i++) {
        await completeDrag(smallFixture.root, 400, 40, 8)
        await new Promise((r) => setTimeout(r, 500))

        const realIdx = slider.realIndex
        const coverage = checkViewportCoverage(slider!, VIEWPORT)

        console.log(`[4slides] drag #${i}: realIndex=${realIdx}, activeIndex=${slider.engine.activeIndex}, gaps=${coverage.hasGaps}, order=${slider.slides.map(s => s.getAttribute('data-tvist-slide-index')).join(',')}`)

        // realIndex не дрейфует (0→1→2→3→0 — это баг!)
        expect(realIdx).toBe(initialRealIndex)

        // Слайды не теряются
        expect(slider.slides.length).toBe(4)

        // Нет пустот
        expect(coverage.hasGaps).toBe(false)
      }
    })

    it('чередование drag вправо/влево — realIndex стабилен', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      // Вправо
      await completeDrag(smallFixture.root, 400, 40, 8)
      await new Promise((r) => setTimeout(r, 500))
      expect(slider.realIndex).toBe(initialRealIndex)

      // Влево
      await completeDrag(smallFixture.root, 400, -40, 8)
      await new Promise((r) => setTimeout(r, 500))
      expect(slider.realIndex).toBe(initialRealIndex)

      // Вправо
      await completeDrag(smallFixture.root, 400, 40, 8)
      await new Promise((r) => setTimeout(r, 500))
      expect(slider.realIndex).toBe(initialRealIndex)

      // Влево
      await completeDrag(smallFixture.root, 400, -40, 8)
      await new Promise((r) => setTimeout(r, 500))
      expect(slider.realIndex).toBe(initialRealIndex)

      expect(slider.slides.length).toBe(4)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('длинный drag вправо (> threshold) — перелистывание корректно', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      // Длинный drag вправо 150px (> threshold 80px) → prev slide
      await completeDrag(smallFixture.root, 400, 150, 15)
      await new Promise((r) => setTimeout(r, 500))

      // Слайд должен перелистнуться назад (realIndex уменьшается или wraps)
      const newRealIndex = slider.realIndex
      expect(newRealIndex).not.toBe(initialRealIndex)

      // Слайды не теряются
      expect(slider.slides.length).toBe(4)

      // Нет пустот
      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })

    it('длинный drag вправо затем длинный влево — возврат к исходному слайду', async () => {
      slider = new Tvist(smallFixture.root, {
        loop: true,
        drag: true,
        perPage: 2,
        gap: GAP,
      })

      const initialRealIndex = slider.realIndex

      // Вправо (> threshold) → prev
      await completeDrag(smallFixture.root, 400, 150, 15)
      await new Promise((r) => setTimeout(r, 500))

      // Влево (> threshold) → next (вернуться назад)
      await completeDrag(smallFixture.root, 400, -150, 15)
      await new Promise((r) => setTimeout(r, 500))

      // Должны вернуться к исходному слайду
      expect(slider.realIndex).toBe(initialRealIndex)

      expect(slider.slides.length).toBe(4)

      const coverage = checkViewportCoverage(slider!, VIEWPORT)
      expect(coverage.hasGaps).toBe(false)
    })
  })
})
