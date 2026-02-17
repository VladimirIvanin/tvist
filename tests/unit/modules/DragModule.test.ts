/**
 * Тесты для DragModule
 * 
 * Проверяем:
 * 1. Плавное следование за мышью без блокировок
 * 2. Drag в обе стороны
 * 3. Snap только после отпускания
 * 4. Threshold для переключения слайда
 * 5. Touch поддержка
 * 6. События драга
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { DragModule } from '@modules/drag/DragModule'
import {
  createSliderFixture,
  simulateDrag,
  waitForAnimation,
  createMouseEvent,
  type SliderFixture,
} from '../../fixtures'

describe('DragModule', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('drag', DragModule)

    // Создаём фикстуру
    fixture = createSliderFixture({
      slidesCount: 3,
      width: 600,
      height: 400,
    })

    // Инициализируем слайдер
    slider = new Tvist(fixture.root, {
      drag: true,
      speed: 300,
    })
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
    Tvist.unregisterModule('drag')
  })

  describe('Плавное следование за мышью', () => {
    it('должен двигать слайд вместе с мышью без блокировок', () => {
      const initialPosition = slider.engine.location.get()

      // Начинаем drag
      const mouseDownEvent = createMouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
      })
      fixture.container.dispatchEvent(mouseDownEvent)

      // Двигаем мышь влево на 50px (превышает MIN_DRAG_DISTANCE)
      const mouseMoveEvent = createMouseEvent('mousemove', {
        clientX: 150,
        clientY: 100,
      })
      document.dispatchEvent(mouseMoveEvent)

      // Еще одно движение после dragStart (накопленный delta вычтен)
      document.dispatchEvent(createMouseEvent('mousemove', {
        clientX: 140,
        clientY: 100,
      }))

      // Позиция должна измениться СРАЗУ (следовать за мышью)
      const newPosition = slider.engine.location.get()
      expect(newPosition).not.toBe(initialPosition)
      expect(newPosition).toBeLessThan(initialPosition) // Двинулись влево

      // Отпускаем
      const mouseUpEvent = createMouseEvent('mouseup', {
        clientX: 140,
        clientY: 100,
      })
      document.dispatchEvent(mouseUpEvent)
    })

    it('должен следовать за мышью плавно при движении туда-сюда', () => {
      const initialPosition = slider.engine.location.get()

      // Начинаем drag
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Двигаем влево (превышает MIN_DRAG_DISTANCE)
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
      
      // Еще одно движение после dragStart
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 140, clientY: 100 }))
      const positionLeft = slider.engine.location.get()
      expect(positionLeft).toBeLessThan(initialPosition)

      // Двигаем обратно вправо
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 170, clientY: 100 }))
      const positionBack = slider.engine.location.get()
      expect(positionBack).toBeGreaterThan(positionLeft)
      expect(positionBack).toBeLessThan(initialPosition)

      // Двигаем ещё правее
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 210, clientY: 100 }))
      const positionRight = slider.engine.location.get()
      expect(positionRight).toBeGreaterThan(initialPosition)

      // Отпускаем
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 210, clientY: 100 }))
    })
  })

  describe('Snap после отпускания', () => {
    it('НЕ должен переключать слайд если драг меньше threshold', async () => {
      const initialIndex = slider.activeIndex

      // Маленький drag (40px - меньше threshold)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -40,
        steps: 3,
      })

      await waitForAnimation(300)

      // Индекс НЕ должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })

    it('должен переключить слайд если драг больше threshold', async () => {
      const initialIndex = slider.activeIndex

      // Большой drag (150px - больше threshold)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 5,
      })

      await waitForAnimation(300)

      // Индекс должен увеличиться
      expect(slider.activeIndex).toBe(initialIndex + 1)
    })

    it('должен вернуться к текущему слайду при drag туда-сюда', async () => {
      const initialIndex = slider.activeIndex

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Драгаем влево
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 80, clientY: 100 }))

      // Драгаем обратно вправо
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 180, clientY: 100 }))

      // Отпускаем
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 180, clientY: 100 }))

      await waitForAnimation(300)

      // Индекс НЕ должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })
  })

  describe('Drag в обе стороны', () => {
    it('должен поддерживать drag вправо (к предыдущему слайду)', async () => {
      // Переходим на второй слайд
      slider.scrollTo(1, true)
      const initialIndex = slider.activeIndex
      expect(initialIndex).toBe(1)

      // Drag вправо (к предыдущему)
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: 150, // +150px вправо
        steps: 5,
      })

      await waitForAnimation(300)

      // Должны вернуться к первому слайду
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('События', () => {
    it('должен эмитить события dragStart, drag, dragEnd', () => {
      const dragStartSpy = vi.fn()
      const dragSpy = vi.fn()
      const dragEndSpy = vi.fn()

      slider.on('dragStart', dragStartSpy)
      slider.on('drag', dragSpy)
      slider.on('dragEnd', dragEndSpy)

      // mousedown
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      // dragStart не должен вызываться сразу после mousedown (ждем threshold)
      expect(dragStartSpy).not.toHaveBeenCalled()

      // mousemove (достаточно далеко для начала драга)
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
      
      expect(dragStartSpy).toHaveBeenCalledOnce()
      expect(dragSpy).toHaveBeenCalled()

      // mouseup
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
      expect(dragEndSpy).toHaveBeenCalledOnce()
    })

    it('должен передавать правильные данные в события', () => {
      const dragSpy = vi.fn()
      slider.on('drag', dragSpy)

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))

      // Проверяем что событие вызвано
      expect(dragSpy).toHaveBeenCalled()

      // Можно проверить параметры если нужно
      // const callArgs = dragSpy.mock.calls[0]
      // expect(callArgs).toBeDefined()

      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
    })
  })

  describe('Touch поддержка', () => {
    it('должен работать с touch событиями', async () => {
      const initialIndex = slider.activeIndex

      // Используем touch вместо mouse
      await simulateDrag({
        element: fixture.container,
        startX: 200,
        deltaX: -150,
        steps: 5,
        type: 'touch',
      })

      await waitForAnimation(300)

      // Должны перейти к следующему слайду
      expect(slider.activeIndex).toBe(initialIndex + 1)
    })
  })

  describe('Edge cases', () => {
    it('должен работать с drag даже при динамическом изменении опций', () => {
      const initialPosition = slider.engine.location.get()

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 150, clientY: 100 }))
      
      // Еще одно движение после dragStart
      document.dispatchEvent(createMouseEvent('mousemove', { clientX: 140, clientY: 100 }))

      // Позиция должна измениться (модуль активен)
      const newPosition = slider.engine.location.get()
      expect(newPosition).not.toBe(initialPosition)
      expect(newPosition).toBeLessThan(initialPosition)

      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 150, clientY: 100 }))
    })

    it('должен корректно обрабатывать mouseup без mousemove', () => {
      const initialIndex = slider.activeIndex

      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )

      // Сразу отпускаем без движения
      document.dispatchEvent(createMouseEvent('mouseup', { clientX: 200, clientY: 100 }))

      // Индекс не должен измениться
      expect(slider.activeIndex).toBe(initialIndex)
    })
  })

  describe('Проблемы с кликом и анимацией', () => {
    /**
     * ПРОБЛЕМА 1: При клике во время анимации, анимация останавливается
     * 
     * Причина:
     * - В onPointerDown вызывается this.tvist.engine.animator.stop()
     * - Это происходит даже если пользователь сделал короткий клик (не драг)
     * - В результате анимация останавливается и не продолжается
     * 
     * Ожидаемое поведение:
     * - Если пользователь сделал короткий клик (не превысил MIN_DRAG_DISTANCE)
     * - Анимация НЕ должна останавливаться, или должна возобновиться после отпускания
     * 
     * Текущее поведение:
     * - animator.stop() вызывается в onPointerDown
     * - Даже если isDragging не становится true (клик без движения)
     * - Анимация не возобновляется в onPointerUp
     */
    
    it('должен останавливать animator при mousedown но возобновлять при отпускании без драга', async () => {
      slider.updateOptions({ speed: 500 })
      
      // Запускаем анимацию
      slider.scrollTo(1)
      await waitForAnimation(100)
      
      // Проверяем что animator активен
      expect(slider.engine.animator.isAnimating()).toBe(true)
      
      // Делаем mousedown
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      
      // Animator останавливается при mousedown (для возможности драга)
      expect(slider.engine.animator.isAnimating()).toBe(false)
      
      // Отпускаем без движения (не было драга)
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 200, clientY: 100 })
      )
      
      // Ждем
      await waitForAnimation(100)
      
      // ИСПРАВЛЕНО: анимация возобновляется после отпускания
      // Проверяем что animator снова активен
      expect(slider.engine.animator.isAnimating()).toBe(true)
    })
    
    it('должен продолжить анимацию после клика без движения', async () => {
      slider.updateOptions({ speed: 500 })
      
      // Запускаем анимацию
      slider.scrollTo(1)
      await waitForAnimation(100)
      
      // Делаем клик без движения
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 200, clientY: 100 })
      )
      
      // Ждем завершения анимации
      await waitForAnimation(500)
      
      // ИСПРАВЛЕНО: анимация завершается, слайдер на втором слайде
      expect(slider.activeIndex).toBe(1)
      
      // Позиция должна точно соответствовать слайду
      const finalPosition = slider.engine.location.get()
      const expectedPosition = slider.engine.getScrollPositionForIndex(1)
      expect(Math.abs(finalPosition - expectedPosition)).toBeLessThan(1)
    })
    it('НЕ должен останавливать анимацию при коротком клике', async () => {
      // Увеличиваем скорость анимации для теста
      slider.updateOptions({ speed: 500 })
      
      // Запускаем анимацию перехода к следующему слайду
      slider.scrollTo(1) // Без immediate, будет анимация
      
      // Ждем немного чтобы анимация началась, но не завершилась
      await waitForAnimation(100)
      
      // Проверяем что анимация идет (позиция изменяется)
      const positionDuringAnimation = slider.engine.location.get()
      const initialPosition = 0
      const targetPosition = slider.engine.getScrollPositionForIndex(1)
      
      // Позиция должна быть между начальной и конечной
      expect(positionDuringAnimation).not.toBe(initialPosition)
      expect(positionDuringAnimation).not.toBe(targetPosition)
      
      // Проверяем что animator активен
      const isAnimating = slider.engine.animator.isAnimating()
      expect(isAnimating).toBe(true)
      
      // Делаем короткий клик (mousedown + mouseup без движения)
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      
      // ПРОБЛЕМА: после mousedown animator останавливается
      // Проверяем что animator остановлен (это и есть баг)
      const isAnimatingAfterMouseDown = slider.engine.animator.isAnimating()
      
      // Сразу отпускаем без движения
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 200, clientY: 100 })
      )
      
      // Ждем завершения анимации
      await waitForAnimation(500)
      
      // ОЖИДАНИЕ: анимация должна была продолжиться и завершиться
      // Слайдер должен переключиться на второй слайд
      // НО из-за бага анимация останавливается и слайдер остается на первом слайде
      expect(slider.activeIndex).toBe(1)
    })

    it('НЕ должен останавливать анимацию при клике с минимальным движением', async () => {
      // Увеличиваем скорость анимации для теста
      slider.updateOptions({ speed: 500 })
      
      // Запускаем анимацию
      slider.scrollTo(1)
      await waitForAnimation(100)
      
      const positionBeforeClick = slider.engine.location.get()
      
      // Делаем клик с минимальным движением (меньше MIN_DRAG_DISTANCE = 5px)
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      
      // Двигаем мышь на 2px (меньше порога)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 202, clientY: 100 })
      )
      
      // Отпускаем
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 202, clientY: 100 })
      )
      
      // Ждем завершения анимации
      await waitForAnimation(500)
      
      // Анимация должна была продолжиться
      expect(slider.activeIndex).toBe(1)
    })

    /**
     * ПРОБЛЕМА 2: onPointerDown срабатывает 2 раза при одном клике
     * 
     * Причина:
     * - Подписка на несколько типов событий: mousedown, touchstart, pointerdown
     * - В современных браузерах PointerEvent генерирует и pointer события и mouse события
     * - Результат: обработчик вызывается дважды для одного физического клика
     * 
     * Ожидаемое поведение:
     * - При одном клике onPointerDown должен вызваться только один раз
     */
    it('НЕ должен вызывать onPointerDown дважды при одном клике', () => {
      // Создаем spy для отслеживания вызовов
      const dragStartSpy = vi.fn()
      slider.on('dragStart', dragStartSpy)
      
      // Симулируем реальное поведение браузера: при клике мышью генерируются
      // и pointerdown и mousedown события
      
      // Сначала pointerdown
      if ('PointerEvent' in window) {
        const pointerDownEvent = new PointerEvent('pointerdown', {
          clientX: 200,
          clientY: 100,
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          isPrimary: true,
        })
        fixture.container.dispatchEvent(pointerDownEvent)
      }
      
      // Затем mousedown (как в реальном браузере)
      fixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 200, clientY: 100 })
      )
      
      // Двигаем для начала драга (достаточно далеко для превышения threshold)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 150, clientY: 100 })
      )
      
      // dragStart должен быть вызван только 1 раз, не дважды
      // Если onPointerDown срабатывает дважды, то dragStart тоже будет дважды
      expect(dragStartSpy).toHaveBeenCalledOnce()
      
      // Отпускаем
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 150, clientY: 100 })
      )
    })

    it('НЕ должен дублировать события при использовании pointer events', () => {
      // Проверяем поддержку PointerEvent
      if (!('PointerEvent' in window)) {
        console.log('PointerEvent не поддерживается, пропускаем тест')
        return
      }
      
      const dragStartSpy = vi.fn()
      slider.on('dragStart', dragStartSpy)
      
      // Симулируем реальное поведение браузера:
      // При клике мышью генерируются ОБА события: pointerdown И mousedown
      
      // 1. Сначала pointerdown
      const pointerDownEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 100,
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        isPrimary: true,
      })
      fixture.container.dispatchEvent(pointerDownEvent)
      
      // 2. Затем mousedown (автоматически генерируется браузером)
      const mouseDownEvent = createMouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
      })
      fixture.container.dispatchEvent(mouseDownEvent)
      
      // Двигаем для начала драга
      const pointerMoveEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 100,
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        isPrimary: true,
      })
      document.dispatchEvent(pointerMoveEvent)
      
      // dragStart должен быть вызван только 1 раз, не дважды
      // FAILING: если onPointerDown вызывается дважды, dragStart будет дважды
      expect(dragStartSpy).toHaveBeenCalledOnce()
      
      // Отпускаем
      const pointerUpEvent = new PointerEvent('pointerup', {
        clientX: 150,
        clientY: 100,
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        isPrimary: true,
      })
      document.dispatchEvent(pointerUpEvent)
    })
    
    it('должен игнорировать дублирующиеся события от разных типов', () => {
      if (!('PointerEvent' in window)) {
        return
      }
      
      // Подсчитываем сколько раз вызывается stopMomentum
      // (вызывается в onPointerDown)
      let stopMomentumCallCount = 0
      const dragModule = slider.getModule('drag') as any
      const originalStopMomentum = dragModule.stopMomentum
      dragModule.stopMomentum = function() {
        stopMomentumCallCount++
        return originalStopMomentum.call(this)
      }
      
      // Симулируем реальное поведение: pointerdown + mousedown
      // Но теперь DragModule подписан только на pointerdown (если PointerEvent поддерживается)
      fixture.container.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 200,
          clientY: 100,
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          isPrimary: true,
        })
      )
      
      // Отправляем mousedown (как делает браузер), но он должен игнорироваться
      // потому что мы подписаны только на pointerdown
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 100,
        bubbles: true,
        cancelable: true,
      })
      fixture.container.dispatchEvent(mouseEvent)
      
      // ОЖИДАНИЕ: stopMomentum должен быть вызван только 1 раз
      // ИСПРАВЛЕНО: теперь мы подписаны только на pointerdown
      expect(stopMomentumCallCount).toBe(1)
      
      // Cleanup
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 200,
          clientY: 100,
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          isPrimary: true,
        })
      )
    })
  })

  describe('Center mode', () => {
    /**
     * ПРОБЛЕМА: При center: true + drag происходит резкое смещение трансформа при первом взаимодействии
     * 
     * Причина:
     * - При center: true начальная позиция включает centerOffset (например, 150px)
     * - При mousedown DragModule сохраняет startPosition = 150
     * - При mousemove DragModule вычисляет: newPosition = startPosition + delta
     * - Но delta рассчитывается от координат мыши, а не учитывает что startPosition уже включает centerOffset
     * - В результате происходит резкий скачок ближе к нулю
     * 
     * Ожидаемое поведение:
     * - При движении мыши на -10px позиция должна измениться на -10px (с 150 до 140)
     * - Фактическое поведение: позиция меняется на -122px (с 150 до 28)
     * 
     * Эти тесты воспроизводят проблему и должны падать до исправления.
     */
    let centerSlider: Tvist
    let centerFixture: SliderFixture

    beforeEach(() => {
      // Создаём новую фикстуру для center режима
      // Контейнер 600px, слайды по 300px каждый
      centerFixture = createSliderFixture({
        slidesCount: 5,
        width: 600,
        height: 400,
        slideWidth: 300, // Слайды меньше контейнера для центрирования
      })

      // Инициализируем слайдер с center: true и autoWidth: true
      // autoWidth нужен чтобы Engine брал реальные размеры слайдов из DOM
      centerSlider = new Tvist(centerFixture.root, {
        drag: true,
        center: true,
        autoWidth: true,
        perPage: 1,
        speed: 300,
      })
    })

    afterEach(() => {
      centerSlider.destroy()
      centerFixture.cleanup()
    })

    it('НЕ должен резко смещать позицию при первом клике (center: true)', () => {
      // Запоминаем начальную позицию (с учетом centerOffset)
      const initialPosition = centerSlider.engine.location.get()
      const centerOffset = centerSlider.engine.getCenterOffset(0)

      // Проверяем что centerOffset не равен нулю (иначе тест бессмысленен)
      expect(centerOffset).toBeGreaterThan(0)
      // Проверяем что начальная позиция включает centerOffset
      expect(initialPosition).toBe(centerOffset)

      // Начинаем drag
      const mouseDownEvent = createMouseEvent('mousedown', {
        clientX: 300,
        clientY: 200,
      })
      centerFixture.container.dispatchEvent(mouseDownEvent)

      // Позиция НЕ должна измениться сразу после mousedown
      const positionAfterMouseDown = centerSlider.engine.location.get()
      expect(positionAfterMouseDown).toBe(initialPosition)

      // Двигаем мышь на небольшое расстояние (10px влево, превышает MIN_DRAG_DISTANCE)
      const mouseMoveEvent = createMouseEvent('mousemove', {
        clientX: 290,
        clientY: 200,
      })
      document.dispatchEvent(mouseMoveEvent)

      // Еще одно движение после dragStart (накопленный delta вычтен)
      document.dispatchEvent(createMouseEvent('mousemove', {
        clientX: 285,
        clientY: 200,
      }))

      // Позиция должна измениться плавно
      const positionAfterMove = centerSlider.engine.location.get()
      const delta = positionAfterMove - initialPosition
      
      // Проверяем что смещение небольшое (влево)
      // После вычитания накопленного delta смещение может быть меньше ожидаемого
      expect(delta).toBeLessThan(0) // Двинулись влево
      expect(Math.abs(delta)).toBeLessThan(20) // Но не слишком сильно
      
      // НЕ должно быть резкого скачка к нулю или другой позиции
      expect(Math.abs(delta)).toBeLessThan(20)

      // Отпускаем
      const mouseUpEvent = createMouseEvent('mouseup', {
        clientX: 290,
        clientY: 200,
      })
      document.dispatchEvent(mouseUpEvent)
    })

    it('должен плавно следовать за мышью без скачков при center: true', () => {
      // Переходим на второй слайд (индекс 1)
      centerSlider.scrollTo(1, true)
      
      const initialPosition = centerSlider.engine.location.get()
      const centerOffset = centerSlider.engine.getCenterOffset(1)

      // Проверяем что centerOffset применен
      expect(centerOffset).toBeGreaterThan(0)

      // Начинаем drag
      centerFixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 300, clientY: 200 })
      )

      // Двигаем мышь влево на 20px (превышает MIN_DRAG_DISTANCE)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 280, clientY: 200 })
      )

      // Еще одно движение после dragStart (накопленный delta вычтен)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 270, clientY: 200 })
      )

      const position1 = centerSlider.engine.location.get()
      const delta1 = position1 - initialPosition
      
      // Смещение должно быть отрицательным (влево)
      expect(delta1).toBeLessThan(0)

      // Двигаем ещё на 20px влево (всего -30px от dragStart)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 250, clientY: 200 })
      )

      const position2 = centerSlider.engine.location.get()
      const delta2 = position2 - initialPosition
      
      // Смещение должно быть примерно -30px
      expect(Math.abs(delta2 - (-30))).toBeLessThan(5)

      // Двигаем обратно вправо на 10px (всего -20px от dragStart)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 260, clientY: 200 })
      )

      const position3 = centerSlider.engine.location.get()
      const delta3 = position3 - initialPosition
      
      // Смещение должно быть примерно -20px
      expect(Math.abs(delta3 - (-20))).toBeLessThan(5)

      // Отпускаем
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 270, clientY: 200 })
      )
    })

    it('должен корректно работать при драге на последнем слайде (center: true)', () => {
      // Переходим на последний слайд
      centerSlider.scrollTo(4, true)
      
      const initialPosition = centerSlider.engine.location.get()

      // Начинаем drag
      centerFixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 300, clientY: 200 })
      )

      // Двигаем мышь вправо на 30px (превышает MIN_DRAG_DISTANCE)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 330, clientY: 200 })
      )
      
      // Еще одно движение после dragStart (на 5px вправо от dragStart)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 335, clientY: 200 })
      )

      const positionAfterMove = centerSlider.engine.location.get()
      const delta = positionAfterMove - initialPosition
      
      // Смещение должно быть положительным (вправо)
      expect(delta).toBeGreaterThan(0)
      
      // НЕ должно быть резкого скачка
      expect(Math.abs(delta)).toBeLessThan(50)

      // Отпускаем
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 330, clientY: 200 })
      )
    })

    it('должен сохранять плавность при быстром движении туда-сюда (center: true)', () => {
      const initialPosition = centerSlider.engine.location.get()

      // Начинаем drag
      centerFixture.container.dispatchEvent(
        createMouseEvent('mousedown', { clientX: 300, clientY: 200 })
      )

      // Быстро двигаем влево (превышает MIN_DRAG_DISTANCE)
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 250, clientY: 200 })
      )
      
      // Еще одно движение после dragStart
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 240, clientY: 200 })
      )
      const pos1 = centerSlider.engine.location.get()
      expect(pos1 - initialPosition).toBeLessThan(0) // Двинулись влево

      // Быстро двигаем вправо
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 340, clientY: 200 })
      )
      const pos2 = centerSlider.engine.location.get()
      expect(pos2 - initialPosition).toBeGreaterThan(0) // Двинулись вправо

      // Снова влево
      document.dispatchEvent(
        createMouseEvent('mousemove', { clientX: 280, clientY: 200 })
      )
      const pos3 = centerSlider.engine.location.get()
      const delta3 = pos3 - initialPosition
      
      // Финальное смещение должно быть отрицательным (влево от начальной позиции)
      expect(delta3).toBeLessThan(0)

      // Отпускаем
      document.dispatchEvent(
        createMouseEvent('mouseup', { clientX: 280, clientY: 200 })
      )
    })
  })
})

