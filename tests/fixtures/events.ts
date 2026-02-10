/**
 * Хелперы для эмуляции событий в тестах
 */

/**
 * Конфигурация для создания mouse события
 */
export interface MouseEventConfig {
  clientX: number
  clientY: number
  button?: number
  bubbles?: boolean
  cancelable?: boolean
}

/**
 * Конфигурация для создания touch события
 */
export interface TouchEventConfig {
  clientX: number
  clientY: number
  bubbles?: boolean
  cancelable?: boolean
}

/**
 * Создаёт MouseEvent или PointerEvent с заданными координатами
 * Если PointerEvent поддерживается, создаёт PointerEvent (для совместимости с DragModule)
 */
export function createMouseEvent(
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'click',
  config: MouseEventConfig
): MouseEvent | PointerEvent {
  const { clientX, clientY, button = 0, bubbles = true, cancelable = true } = config

  // Если PointerEvent поддерживается, используем его
  // (DragModule подписывается на pointerdown если PointerEvent доступен)
  if ('PointerEvent' in window && type !== 'click') {
    const pointerType = type.replace('mouse', 'pointer') as 'pointerdown' | 'pointermove' | 'pointerup'
    return new PointerEvent(pointerType, {
      clientX,
      clientY,
      button,
      bubbles,
      cancelable,
      view: window,
      pointerType: 'mouse',
      isPrimary: true,
    })
  }

  return new MouseEvent(type, {
    clientX,
    clientY,
    button,
    bubbles,
    cancelable,
    view: window,
  })
}

/**
 * Создаёт TouchEvent с заданными координатами
 */
export function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  config: TouchEventConfig
): TouchEvent {
  const { clientX, clientY, bubbles = true, cancelable = true } = config

  const touch = {
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    identifier: 0,
    target: document.body,
  } as Touch

  const touches = type === 'touchend' || type === 'touchcancel' ? [] : [touch]
  const changedTouches = [touch]

  return new TouchEvent(type, {
    touches,
    changedTouches,
    targetTouches: touches,
    bubbles,
    cancelable,
    view: window,
  })
}

/**
 * Симулирует последовательность drag событий
 */
export interface DragSequenceConfig {
  element: HTMLElement
  startX: number
  startY?: number
  deltaX: number
  deltaY?: number
  steps?: number
  type?: 'mouse' | 'touch' | 'pointer'
}

/**
 * Эмулирует drag (с несколькими промежуточными move событиями)
 * 
 * @example
 * ```ts
 * await simulateDrag({
 *   element: slider,
 *   startX: 200,
 *   deltaX: -150, // драг влево на 150px
 *   steps: 5, // 5 промежуточных move событий
 * })
 * ```
 */
export async function simulateDrag(config: DragSequenceConfig): Promise<void> {
  const {
    element,
    startX,
    startY = 100,
    deltaX,
    deltaY = 0,
    steps = 5,
    type = 'mouse',
  } = config

  // Start
  let startEvent: Event
  if (type === 'touch') {
    // Для touch используем PointerEvent с pointerType: 'touch' если поддерживается
    if ('PointerEvent' in window) {
      startEvent = new PointerEvent('pointerdown', {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
        isPrimary: true,
      })
    } else {
      startEvent = createTouchEvent('touchstart', { clientX: startX, clientY: startY })
    }
  } else {
    startEvent = createMouseEvent('mousedown', { clientX: startX, clientY: startY })
  }

  element.dispatchEvent(startEvent)

  // Move events
  const stepX = deltaX / steps
  const stepY = deltaY / steps

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, 10))

    const currentX = startX + stepX * i
    const currentY = startY + stepY * i

    let moveEvent: Event
    if (type === 'touch') {
      if ('PointerEvent' in window) {
        moveEvent = new PointerEvent('pointermove', {
          clientX: currentX,
          clientY: currentY,
          bubbles: true,
          cancelable: true,
          pointerType: 'touch',
          isPrimary: true,
        })
      } else {
        moveEvent = createTouchEvent('touchmove', { clientX: currentX, clientY: currentY })
      }
    } else {
      moveEvent = createMouseEvent('mousemove', { clientX: currentX, clientY: currentY })
    }

    document.dispatchEvent(moveEvent)
  }

  // End
  const endX = startX + deltaX
  const endY = startY + deltaY

  let endEvent: Event
  if (type === 'touch') {
    if ('PointerEvent' in window) {
      endEvent = new PointerEvent('pointerup', {
        clientX: endX,
        clientY: endY,
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
        isPrimary: true,
      })
    } else {
      endEvent = createTouchEvent('touchend', { clientX: endX, clientY: endY })
    }
  } else {
    endEvent = createMouseEvent('mouseup', { clientX: endX, clientY: endY })
  }

  document.dispatchEvent(endEvent)
}

/**
 * Эмулирует клик на элементе
 */
export function simulateClick(element: HTMLElement, config?: Partial<MouseEventConfig>): void {
  const clickEvent = createMouseEvent('click', {
    clientX: config?.clientX ?? 0,
    clientY: config?.clientY ?? 0,
    bubbles: config?.bubbles ?? true,
  })

  element.dispatchEvent(clickEvent)
}

/**
 * Создает правильное событие для drag (PointerEvent если поддерживается, иначе MouseEvent)
 * Используйте эту функцию вместо прямого создания MouseEvent в тестах
 */
export function createPointerOrMouseEvent(
  type: 'down' | 'move' | 'up',
  config: MouseEventConfig
): Event {
  const { clientX, clientY, button = 0, bubbles = true, cancelable = true } = config

  if ('PointerEvent' in window) {
    const eventType = `pointer${type}` as 'pointerdown' | 'pointermove' | 'pointerup'
    return new PointerEvent(eventType, {
      clientX,
      clientY,
      button,
      bubbles,
      cancelable,
      view: window,
      pointerType: 'mouse',
      isPrimary: true,
    })
  }

  const eventType = `mouse${type}` as 'mousedown' | 'mousemove' | 'mouseup'
  return new MouseEvent(eventType, {
    clientX,
    clientY,
    button,
    bubbles,
    cancelable,
    view: window,
  })
}

/**
 * Эмулирует resize окна
 */
export async function simulateResize(width: number = 1024, height: number = 768): Promise<void> {
  // Обновляем window.innerWidth и window.innerHeight
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  window.dispatchEvent(new Event('resize'))

  // Ждём throttle/debounce
  await new Promise(resolve => setTimeout(resolve, 200))
}

/**
 * Ждёт завершения анимации
 */
export function waitForAnimation(duration: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, duration + 100))
}

/**
 * Ждёт следующий кадр анимации (RAF)
 */
export function waitForFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

/**
 * Ждёт несколько кадров
 */
export async function waitForFrames(count: number = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForFrame()
  }
}

