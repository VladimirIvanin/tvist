/**
 * Тесты для DragModule
 * 
 * Проверяем:
 * 1. Плавное следование за мышью без блокировок
 * 2. Drag в обе стороны
 * 3. Snap только после отпускания
 * 4. Threshold для переключения слайда
 */

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { DragModule } from '../../../src/modules/drag/DragModule'

describe('DragModule', () => {
  let container: HTMLElement
  let tvist: Tvist

  beforeEach(() => {
    // Регистрируем модуль
    Tvist.registerModule('drag', DragModule)
    // Создаём тестовый контейнер
    container = document.createElement('div')
    container.innerHTML = `
      <div class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">Slide 1</div>
          <div class="tvist__slide">Slide 2</div>
          <div class="tvist__slide">Slide 3</div>
        </div>
      </div>
    `
    document.body.appendChild(container)

    // Инициализируем слайдер
    const root = container.querySelector('.tvist') as HTMLElement
    const containerEl = root.querySelector('.tvist__container') as HTMLElement
    const slides = containerEl.querySelectorAll('.tvist__slide') as NodeListOf<HTMLElement>

    // Мокаем размеры (в тестах нет CSS)
    // offsetWidth используется в getOuterWidth
    Object.defineProperty(root, 'offsetWidth', {
      configurable: true,
      value: 600
    })
    Object.defineProperty(containerEl, 'offsetWidth', {
      configurable: true,
      value: 600
    })
    Object.defineProperty(containerEl, 'clientWidth', {
      configurable: true,
      value: 600
    })
    slides.forEach(slide => {
      Object.defineProperty(slide, 'offsetWidth', {
        configurable: true,
        value: 600
      })
    })

    tvist = new Tvist(root, {
      drag: true,
      speed: 300,
    })
  })

  afterEach(() => {
    tvist.destroy()
    document.body.removeChild(container)
    // Очищаем модули после тестов
    Tvist.unregisterModule('drag')
  })

  describe('Плавное следование за мышью', () => {
    it('должен двигать слайд вместе с мышью без блокировок', () => {
      const slider = tvist.container
      const startX = 200
      
      // Начинаем drag
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      })
      slider.dispatchEvent(mouseDownEvent)

      // Проверяем начальную позицию
      const initialTransform = slider.style.transform
      const initialPosition = tvist.engine.location.get()

      // Двигаем мышь на 50px влево
      const mouseMoveEvent1 = new MouseEvent('mousemove', {
        clientX: startX - 50,
        clientY: 100,
        bubbles: true,
      })
      document.dispatchEvent(mouseMoveEvent1)

      // Позиция должна измениться СРАЗУ (следовать за мышью)
      const position1 = tvist.engine.location.get()
      expect(position1).not.toBe(initialPosition)
      expect(position1).toBeLessThan(initialPosition) // Двинулись влево (отрицательное направление)

      // Двигаем мышь ещё на 30px влево (всего -80px)
      const mouseMoveEvent2 = new MouseEvent('mousemove', {
        clientX: startX - 80,
        clientY: 100,
        bubbles: true,
      })
      document.dispatchEvent(mouseMoveEvent2)

      // Позиция должна продолжить следовать
      const position2 = tvist.engine.location.get()
      expect(position2).toBeLessThan(position1) // Продолжаем двигаться влево
      
      // Transform должен применяться напрямую
      expect(slider.style.transform).not.toBe(initialTransform)
      expect(slider.style.transform).toContain('translate3d')

      // Отпускаем мышь
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: startX - 80,
        clientY: 100,
        bubbles: true,
      })
      document.dispatchEvent(mouseUpEvent)
    })

    it('должен следовать за мышью плавно при движении туда-сюда', () => {
      const slider = tvist.container
      const startX = 200
      
      // Начинаем drag
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      const initialPosition = tvist.engine.location.get()

      // Двигаем влево на 50px
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 50,
        clientY: 100,
        bubbles: true,
      }))

      const positionLeft = tvist.engine.location.get()
      expect(positionLeft).toBeLessThan(initialPosition)

      // Двигаем обратно вправо на 30px (теперь -20px от старта)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 20,
        clientY: 100,
        bubbles: true,
      }))

      const positionBack = tvist.engine.location.get()
      expect(positionBack).toBeGreaterThan(positionLeft) // Вернулись вправо
      expect(positionBack).toBeLessThan(initialPosition) // Но всё ещё левее старта

      // Двигаем ещё правее (теперь +10px от старта)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX + 10,
        clientY: 100,
        bubbles: true,
      }))

      const positionRight = tvist.engine.location.get()
      expect(positionRight).toBeGreaterThan(initialPosition) // Теперь правее старта

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX + 10,
        clientY: 100,
        bubbles: true,
      }))
    })
  })

  describe('Snap после отпускания', () => {
    it('НЕ должен переключать слайд если драг меньше threshold', async () => {
      const slider = tvist.container
      const startX = 200
      const initialIndex = tvist.activeIndex

      // Начинаем drag
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      // Маленький drag (40px - меньше threshold ~80px)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 40,
        clientY: 100,
        bubbles: true,
      }))

      // Отпускаем
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX - 40,
        clientY: 100,
        bubbles: true,
      }))

      // Ждём завершения анимации
      await new Promise(resolve => setTimeout(resolve, 400))

      // Индекс НЕ должен измениться
      expect(tvist.activeIndex).toBe(initialIndex)
    })

    it('должен переключить слайд если драг больше threshold', async () => {
      const slider = tvist.container
      const startX = 200
      const initialIndex = tvist.activeIndex

      // Начинаем drag
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      // Большой drag (150px - точно больше threshold 120px)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 150,
        clientY: 100,
        bubbles: true,
      }))

      // Отпускаем
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX - 150,
        clientY: 100,
        bubbles: true,
      }))

      // Ждём завершения анимации
      await new Promise(resolve => setTimeout(resolve, 400))

      // Индекс должен увеличиться (свайп влево = следующий слайд)
      expect(tvist.activeIndex).toBe(initialIndex + 1)
    })

    it('должен вернуться к текущему слайду при drag туда-сюда', async () => {
      const slider = tvist.container
      const startX = 200
      const initialIndex = tvist.activeIndex

      // Начинаем drag
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      // Драгаем влево на 120px
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 120,
        clientY: 100,
        bubbles: true,
      }))

      // Драгаем обратно вправо (только -20px от старта)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 20,
        clientY: 100,
        bubbles: true,
      }))

      // Отпускаем
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX - 20,
        clientY: 100,
        bubbles: true,
      }))

      // Ждём завершения анимации
      await new Promise(resolve => setTimeout(resolve, 400))

      // Индекс НЕ должен измениться (недостаточно сдвинули)
      expect(tvist.activeIndex).toBe(initialIndex)
    })
  })

  describe('Drag в обе стороны', () => {
    it('должен поддерживать drag вправо (к предыдущему слайду)', async () => {
      // Переходим на второй слайд (индекс 1)
      tvist.scrollTo(1, true) // instant = true
      
      const slider = tvist.container
      const startX = 200
      const initialIndex = tvist.activeIndex

      expect(initialIndex).toBe(1)

      // Drag вправо (к предыдущему)
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX + 150, // +150px вправо (больше threshold 120px)
        clientY: 100,
        bubbles: true,
      }))

      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX + 150,
        clientY: 100,
        bubbles: true,
      }))

      await new Promise(resolve => setTimeout(resolve, 400))

      // Должны вернуться к первому слайду
      expect(tvist.activeIndex).toBe(0)
    })
  })

  describe('События', () => {
    it('должен эмитить события dragStart, drag, dragEnd', () => {
      const dragStartSpy = vi.fn()
      const dragSpy = vi.fn()
      const dragEndSpy = vi.fn()

      tvist.on('dragStart', dragStartSpy)
      tvist.on('drag', dragSpy)
      tvist.on('dragEnd', dragEndSpy)

      const slider = tvist.container
      const startX = 200

      // mousedown
      slider.dispatchEvent(new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true,
      }))

      expect(dragStartSpy).toHaveBeenCalledOnce()

      // mousemove
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: startX - 50,
        clientY: 100,
        bubbles: true,
      }))

      expect(dragSpy).toHaveBeenCalled()

      // mouseup
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: startX - 50,
        clientY: 100,
        bubbles: true,
      }))

      expect(dragEndSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Touch поддержка', () => {
    it('должен работать с touch событиями', () => {
      const slider = tvist.container
      const startX = 200

      // touchstart
      slider.dispatchEvent(new TouchEvent('touchstart', {
        touches: [{ clientX: startX, clientY: 100 } as Touch],
        bubbles: true,
      }))

      const initialPosition = tvist.engine.location.get()

      // touchmove
      document.dispatchEvent(new TouchEvent('touchmove', {
        touches: [{ clientX: startX - 50, clientY: 100 } as Touch],
        bubbles: true,
        cancelable: true,
      }))

      const newPosition = tvist.engine.location.get()
      expect(newPosition).not.toBe(initialPosition)

      // touchend
      document.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [{ clientX: startX - 50, clientY: 100 } as Touch],
        bubbles: true,
      }))
    })
  })
})

