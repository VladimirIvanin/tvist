/**
 * Простая система событий для внутренней коммуникации
 * Основана на паттернах из Splide EventInterface
 */

type EventHandler = (...args: any[]) => void

export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>()
  private anyListeners = new Set<(event: string, ...args: any[]) => void>()

  /**
   * Подписаться на событие
   * @param event - имя события
   * @param handler - обработчик
   */
  on(event: string, handler: EventHandler): this {
    let handlers = this.listeners.get(event)
    if (!handlers) {
      handlers = new Set()
      this.listeners.set(event, handlers)
    }
    handlers.add(handler)
    return this
  }

  /**
   * Отписаться от события
   * @param event - имя события
   * @param handler - обработчик (если не указан, удаляются все обработчики)
   */
  off(event: string, handler?: EventHandler): this {
    if (!handler) {
      // Удаляем все обработчики для события
      this.listeners.delete(event)
    } else {
      // Удаляем конкретный обработчик
      const handlers = this.listeners.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.listeners.delete(event)
        }
      }
    }
    return this
  }

  /**
   * Вызвать событие
   * @param event - имя события
   * @param args - аргументы для обработчиков
   */
  emit(event: string, ...args: any[]): this {
    // Вызываем обработчики конкретного события
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }

    // Вызываем обработчики "любого" события
    this.anyListeners.forEach(handler => {
      try {
        handler(event, ...args)
      } catch (error) {
        console.error(`Error in "any" event handler for "${event}":`, error)
      }
    })

    return this
  }

  /**
   * Подписаться на событие один раз
   * После первого вызова обработчик автоматически удаляется
   */
  once(event: string, handler: EventHandler): this {
    const wrappedHandler = (...args: any[]) => {
      handler(...args)
      this.off(event, wrappedHandler)
    }
    return this.on(event, wrappedHandler)
  }

  /**
   * Подписаться на все события
   * Обработчик будет вызван для любого события
   */
  onAny(handler: (event: string, ...args: any[]) => void): this {
    this.anyListeners.add(handler)
    return this
  }

  /**
   * Отписаться от всех событий
   */
  offAny(handler?: (event: string, ...args: any[]) => void): this {
    if (handler) {
      this.anyListeners.delete(handler)
    } else {
      this.anyListeners.clear()
    }
    return this
  }

  /**
   * Очистить все подписки
   */
  clear(): void {
    this.listeners.clear()
    this.anyListeners.clear()
  }

  /**
   * Получить список всех событий, на которые есть подписки
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Получить количество обработчиков для события
   */
  listenerCount(event: string): number {
    const handlers = this.listeners.get(event)
    return handlers ? handlers.size : 0
  }
}

