import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '../../src/core/Tvist'
import { createSliderFixture } from '../fixtures/dom'
import '../../src/modules/drag'
import '../../src/modules/grid'
import '../../src/modules/loop'
import '../../src/modules/effects'

describe('Lock functionality', () => {
  let fixture: ReturnType<typeof createSliderFixture>

  beforeEach(() => {
    //
  })

  afterEach(() => {
    if (fixture) {
      fixture.cleanup()
    }
  })

  it('should lock slider when all slides fit in container', () => {
    // 5 слайдов. Ширина контейнера 1000px.
    // Если perPage = 5, то ширина слайда = 200px.
    // 5 * 200 = 1000px. Контент равен контейнеру -> Lock.
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    const onLock = vi.fn()
    const onUnlock = vi.fn()

    const slider = new Tvist(fixture.root, {
      perPage: 5,
      gap: 0,
      on: {
        lock: onLock,
        unlock: onUnlock
      }
    })

    expect(slider.engine.isLocked).toBe(true)
    expect(fixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(true)
    expect(onLock).toHaveBeenCalled()
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('should not lock slider when slides do not fit', () => {
    // 5 слайдов. Ширина 1000px.
    // perPage = 2. Ширина слайда = 500px.
    // Контент = 5 * 500 = 2500px > 1000px. -> Unlock.
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    const slider = new Tvist(fixture.root, {
      perPage: 2,
      gap: 0
    })

    expect(slider.engine.isLocked).toBe(false)
    expect(fixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(false)
  })

  it('should prevent drag when locked', () => {
    fixture = createSliderFixture({
      slidesCount: 3,
      width: 1000
    })

    const slider = new Tvist(fixture.root, {
      perPage: 3 // Все влезают
    })

    expect(slider.engine.isLocked).toBe(true)

    // Пытаемся симулировать драг
    const dragModule = slider.getModule('drag') as any
    // Мокаем метод onPointerDown
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100
    })

    // Вручную вызываем приватный метод onPointerDown через dispatchEvent
    // Но проще проверить через состояние isDragging после события
    fixture.root.dispatchEvent(event)
    
    // Перемещаем мышь
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200, // сдвиг на 100px
      clientY: 100
    })
    document.dispatchEvent(moveEvent)

    // Проверяем что драг не начался (isDragging должно быть false)
    expect(dragModule.isDragging).toBe(false)
  })

  it('should restore drag when unlocked', () => {
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    // Locked initially
    const slider = new Tvist(fixture.root, {
      slideMinSize: 200, // Important for resize behavior
      perPage: 5,
      drag: true,
      gap: 0
    })
    
    expect(slider.engine.isLocked).toBe(true)
    
    // Unlock by resize
    fixture.root.style.width = '400px'
    Object.defineProperty(fixture.root, 'offsetWidth', { configurable: true, value: 400 })
    
    // update() вызывает calculateSizes() -> perPage = 2 (400/200). Content > Container.
    // checkLock() должен вызываться внутри update.
    slider.update()
    
    expect(slider.engine.isLocked).toBe(false)
    
    const dragModule = slider.getModule('drag') as any
    
    // Simulate drag start
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100
    })
    
    fixture.root.dispatchEvent(event)
    
    // Move > threshold (5px)
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 100
    })
    document.dispatchEvent(moveEvent)
    
    expect(dragModule.isDragging).toBe(true)
  })

  it('should unlock when resized to smaller view', () => {
    // Сначала все влезает
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    // Изначально slideMinSize = 200. При ширине 1000 => perPage = 5. Все влезает.
    const slider = new Tvist(fixture.root, {
      slideMinSize: 200,
      gap: 0,
      perPage: 5 // Явно задаем или даем slideMinSize сработать. 
                 // Если задать slideMinSize, perPage пересчитается.
                 // При width 1000 и slideMinSize 200 -> perPage = 5.
    })

    expect(slider.engine.isLocked).toBe(true)

    // Ресайзим до 400px.
    // perPage станет 2 (400 / 200).
    // Слайдов 5. 2 на экране. 3 за кадром. -> Unlock.
    
    // Мокаем resize
    fixture.root.style.width = '400px'
    Object.defineProperty(fixture.root, 'offsetWidth', {
      configurable: true,
      value: 400
    })

    slider.update()

    expect(slider.engine.isLocked).toBe(false)
    expect(fixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(false)
  })

  it('should handle Grid lock correctly', () => {
    // Grid 2x2. 4 слайда.
    // Если они влезают в экран - lock.
    // ВАЖНО: При fixed grid (rows + cols) создается 1 wrapper-слайд (страница)
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1000,
      height: 500
    })

    const slider = new Tvist(fixture.root, {
      grid: {
        rows: 2,
        cols: 2
      }
    })

    // Проверяем, что Grid модуль отработал (для fixed grid используется flexbox)
    expect(fixture.container.style.display).toBe('flex')
    
    // При fixed grid создается 1 wrapper-слайд для 4 оригинальных слайдов
    // Теперь нужно мокать wrapper-слайд
    const wrapperSlides = slider.slides
    expect(wrapperSlides.length).toBe(1) // 1 страница для 4 слайдов (2x2)
    
    // Мокаем wrapper-слайд
    Object.defineProperty(wrapperSlides[0], 'offsetWidth', {
      configurable: true,
      value: 1000
    })
    
    Object.defineProperty(wrapperSlides[0], 'offsetLeft', {
      configurable: true,
      value: 0
    })

    // Обновляем слайдер чтобы он перечитал позиции (после наших моков)
    slider.update()

    // Проверяем блокировку
    // 1 страница, которая занимает всю ширину контейнера -> Locked
    expect(slider.engine.isLocked).toBe(true)
  })

  it('should unlock Grid when content exceeds container', () => {
    // Grid 2x2, но слайдов 8.
    // 4 страницы по 2 слайда (в высоту) или как?
    // Нет, Tvist Grid это просто CSS Grid. Слайды идут по порядку.
    // [0] [1]
    // [2] [3]
    // [4] [5]
    // [6] [7]
    // Если horizontal scroll, то Grid работает иначе?
    // Tvist Grid обычно делает grid-auto-flow: column или row.
    // Текущая реализация GridModule просто ставит gridTemplateColumns/Rows.
    // И контейнер скроллится.
    
    // Если у нас 8 слайдов в сетке 2x2 (фиксированной), то они будут вылезать вниз или вправо?
    // Реализация GridModule:
    // styles.gridTemplateRows = `repeat(${rows}, 1fr)`
    // styles.gridTemplateColumns = `repeat(${cols}, 1fr)`
    // Это жесткая сетка. Остальные слайды будут в implicit tracks.
    // Если direction horizontal (default), implicit columns добавляются справа.
    
    fixture = createSliderFixture({
      slidesCount: 8,
      width: 1000
    })

    // Mock sizes for 8 slides.
    // Col 1: 0, 2, 4, 6
    // Col 2: 1, 3, 5, 7 
    // Col 3: ... (implicit)
    
    // GridModule logic for positions: 
    // newPositions = slides.map(slide => slide.offsetLeft)
    
    // Допустим у нас переполнение.
    // Слайд 0, 1 -> page 1 (visible)
    // Слайд 2, 3 -> page 1 (visible) if rows=2
    // Слайд 4, 5 -> page 2 (hidden)
    
    // Mock offsets
    // Page 1 (0-1000px): Slides 0,1,2,3
    fixture.slides.slice(0, 4).forEach((slide, i) => {
        const col = i % 2
        Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: col * 500 })
        Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 500 })
    })
    
    // Page 2 (1000-2000px): Slides 4,5,6,7
    // Они будут смещены на width контейнера (или как CSS Grid их расположит)
    // Допустим они справа.
    fixture.slides.slice(4, 8).forEach((slide, i) => {
        const col = i % 2
        Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: 1000 + col * 500 })
        Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 500 })
    })

    const slider = new Tvist(fixture.root, {
      grid: {
        rows: 2,
        cols: 2
      }
    })
    
    // Force update to read mocks
    slider.update()

    // Last slide (7) position = 1500. Width = 500. Right = 2000.
    // Root = 1000.
    // MaxScroll = 1000 - 2000 = -1000.
    // MinScroll = 0.
    // -1000 < 0 -> Not locked.
    
    expect(slider.engine.isLocked).toBe(false)
  })

  it('should not lock loop slider IF content exceeds container', () => {
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    // 5 slides, width 1000.
    // perPage 5 -> slideSize 200. Total 1000. Fits perfectly -> Locked?
    // With loop: clones are added (2 * perPage = 10 clones).
    // Total 15 slides. Total size 3000.
    // 3000 > 1000 -> Not Locked.
    const slider1 = new Tvist(fixture.root, {
      perPage: 5,
      loop: true,
      gap: 0
    })

    // Debug output
    // console.log('Content Size:', (slider1.engine as any).getContentSize())
    // console.log('Container Size:', (slider1.engine as any).containerSize)
    
    expect(slider1.engine.isLocked).toBe(false)
    
    slider1.destroy()

    // Now make content larger
    // perPage 2 -> slideSize 500. Total 2500 (originals).
    // With loop: +4 clones. Total 9 + 4 = 13 slides. 13 * 500 = 6500.
    // 6500 > 1000 -> Not Locked.
    const slider2 = new Tvist(fixture.root, {
      perPage: 2,
      loop: true,
      gap: 0
    })
    
    expect(slider2.engine.isLocked).toBe(false)
    slider2.destroy()
  })

  it('should never lock when loop is enabled, regardless of content size', () => {
    // Test 1: loop with 4 slides, container 1336px, slideSize 314px
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1336
    })

    const slider1 = new Tvist(fixture.root, {
      loop: true,
      gap: 20,
      slideMinSize: 314
    })

    expect(slider1.engine.isLocked).toBe(false)
    expect(slider1.canScrollNext).toBe(true)
    expect(slider1.canScrollPrev).toBe(true)
    
    slider1.destroy()

    // Test 2: loop with few slides that would fit without loop
    fixture = createSliderFixture({
      slidesCount: 3,
      width: 1000
    })

    const slider2 = new Tvist(fixture.root, {
      loop: true,
      perPage: 3,
      gap: 0
    })

    // Even though 3 slides fit exactly in container, loop should prevent lock
    expect(slider2.engine.isLocked).toBe(false)
    expect(slider2.canScrollNext).toBe(true)
    expect(slider2.canScrollPrev).toBe(true)
    
    slider2.destroy()
  })

  it('should lock when slides fit without scrollability (no loop)', () => {
    // Слайдов 4, perPage 4, влезают идеально
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1000
    })

    const slider = new Tvist(fixture.root, {
      perPage: 4,
      gap: 0
    })

    // Все влезает, никуда скроллить не нужно
    expect(slider.engine.isLocked).toBe(true)
    expect(slider.canScrollNext).toBe(false)
    expect(slider.canScrollPrev).toBe(false)
  })

  it('should not lock when content exceeds but perPage allows scrolling', () => {
    // Слайдов 5, perPage 3, есть куда листать
    fixture = createSliderFixture({
      slidesCount: 5,
      width: 1000
    })

    const slider = new Tvist(fixture.root, {
      perPage: 3,
      gap: 0
    })

    // Не все слайды видны, есть куда скроллить
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.canScrollNext).toBe(true)
  })

  it('should not lock cube effect with loop (real use case)', () => {
    // Cube эффект с loop - все слайды на одном месте, но loop позволяет бесконечный скролл
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 300
    })

    // Mock offsetWidth для слайдов (в happy-dom они 0)
    fixture.slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', {
        configurable: true,
        value: 300
      })
    })

    const slider = new Tvist(fixture.root, {
      effect: 'cube',
      loop: true,
      speed: 300
    })

    // Loop режим никогда не должен блокироваться
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.canScrollNext).toBe(true)
    expect(slider.canScrollPrev).toBe(true)
  })

  it('should not lock fade effect with loop', () => {
    // Fade эффект с loop
    fixture = createSliderFixture({
      slidesCount: 3,
      width: 400
    })

    fixture.slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', {
        configurable: true,
        value: 400
      })
    })

    const slider = new Tvist(fixture.root, {
      effect: 'fade',
      loop: true
    })

    // Loop режим никогда не должен блокироваться
    expect(slider.engine.isLocked).toBe(false)
    expect(slider.canScrollNext).toBe(true)
    expect(slider.canScrollPrev).toBe(true)
  })

  it('should lock Grid 2x2 when all 4 slides visible and prevent drag', () => {
    // Grid 2x2 с 4 слайдами - все должны быть видны и драг заблокирован
    fixture = createSliderFixture({
      slidesCount: 4,
      width: 1000,
      height: 500
    })

    // Mock offsetWidth для всех слайдов (500px каждый)
    fixture.slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', {
        configurable: true,
        value: 500
      })
    })

    // Mock offsetLeft:
    // [0] [1]  <- row 1
    // [2] [3]  <- row 2
    // Col 1: offsetLeft = 0
    // Col 2: offsetLeft = 500
    Object.defineProperty(fixture.slides[0], 'offsetLeft', { configurable: true, value: 0 })
    Object.defineProperty(fixture.slides[1], 'offsetLeft', { configurable: true, value: 500 })
    Object.defineProperty(fixture.slides[2], 'offsetLeft', { configurable: true, value: 0 })
    Object.defineProperty(fixture.slides[3], 'offsetLeft', { configurable: true, value: 500 })

    const slider = new Tvist(fixture.root, {
      grid: {
        rows: 2,
        cols: 2
      },
      gap: 10
    })

    slider.update()

    // Все слайды влезают - должен быть locked
    expect(slider.engine.isLocked).toBe(true)

    // Пытаемся драгнуть
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100
    })
    fixture.root.dispatchEvent(mouseDown)

    // Двигаем мышь на 100px
    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 100
    })
    document.dispatchEvent(mouseMove)

    // Отпускаем
    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 100
    })
    document.dispatchEvent(mouseUp)

    // Позиция не должна измениться (может быть -0 или 0)
    expect(Math.abs(slider.engine.location.get())).toBe(0)
  })

  it('should NOT lock Grid 2x2 when 8 slides (2 pages) and allow drag', () => {
    // Grid 2x2 с 8 слайдами - 2 страницы, драг должен работать
    fixture = createSliderFixture({
      slidesCount: 8,
      width: 1000,
      height: 500
    })

    // Mock offsetWidth для всех слайдов (500px каждый)
    fixture.slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', {
        configurable: true,
        value: 500
      })
    })

    // Page 1 (slides 0-3): offsetLeft 0, 500, 0, 500
    Object.defineProperty(fixture.slides[0], 'offsetLeft', { configurable: true, value: 0 })
    Object.defineProperty(fixture.slides[1], 'offsetLeft', { configurable: true, value: 500 })
    Object.defineProperty(fixture.slides[2], 'offsetLeft', { configurable: true, value: 0 })
    Object.defineProperty(fixture.slides[3], 'offsetLeft', { configurable: true, value: 500 })

    // Page 2 (slides 4-7): offsetLeft 1000, 1500, 1000, 1500
    Object.defineProperty(fixture.slides[4], 'offsetLeft', { configurable: true, value: 1000 })
    Object.defineProperty(fixture.slides[5], 'offsetLeft', { configurable: true, value: 1500 })
    Object.defineProperty(fixture.slides[6], 'offsetLeft', { configurable: true, value: 1000 })
    Object.defineProperty(fixture.slides[7], 'offsetLeft', { configurable: true, value: 1500 })

    const slider = new Tvist(fixture.root, {
      grid: {
        rows: 2,
        cols: 2
      },
      gap: 10
    })

    slider.update()

    // Не все слайды влезают - НЕ должен быть locked
    expect(slider.engine.isLocked).toBe(false)

    // Запоминаем начальную позицию
    const initialPosition = slider.engine.location.get()

    // Пытаемся драгнуть
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 500,
      clientY: 100
    })
    fixture.root.dispatchEvent(mouseDown)

    // Двигаем мышь влево на 200px (должны сдвинуть контент вправо)
    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 100
    })
    document.dispatchEvent(mouseMove)

    // Во время драга позиция должна измениться
    const duringDragPosition = slider.engine.location.get()
    expect(duringDragPosition).not.toBe(initialPosition)

    // Отпускаем
    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 100
    })
    document.dispatchEvent(mouseUp)

    // После snap позиция должна быть другой (перешли к следующему слайду)
    // Даем время на анимацию
    setTimeout(() => {
      expect(slider.engine.location.get()).not.toBe(initialPosition)
    }, 400)
  })
})
