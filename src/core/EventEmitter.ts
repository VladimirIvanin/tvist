/**
 * Простая система событий для внутренней коммуникации
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- event args are intentionally untyped */
type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private __tvistInternal_listeners = new Map<string, Set<EventHandler>>();
  private __tvistInternal_anyListeners = new Set<(event: string, ...args: any[]) => void>();

  /**
   * Подписаться на событие
   * @param event - имя события
   * @param handler - обработчик
   */
  on(event: string, handler: EventHandler): this {
    let handlers = this.__tvistInternal_listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.__tvistInternal_listeners.set(event, handlers);
    }
    handlers.add(handler);
    return this;
  }

  /**
   * Отписаться от события
   * @param event - имя события
   * @param handler - обработчик (если не указан, удаляются все обработчики)
   */
  off(event: string, handler?: EventHandler): this {
    if (!handler) {
      // Удаляем все обработчики для события
      this.__tvistInternal_listeners.delete(event);
    } else {
      // Удаляем конкретный обработчик
      const handlers = this.__tvistInternal_listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.__tvistInternal_listeners.delete(event);
        }
      }
    }
    return this;
  }

  /**
   * Вызвать событие
   * @param event - имя события
   * @param args - аргументы для обработчиков
   */
  emit(event: string, ...args: any[]): this {
    // Вызываем обработчики конкретного события
    const handlers = this.__tvistInternal_listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }

    // Вызываем обработчики "любого" события
    this.__tvistInternal_anyListeners.forEach((handler) => {
      try {
        handler(event, ...args);
      } catch (error) {
        console.error(`Error in "any" event handler for "${event}":`, error);
      }
    });

    return this;
  }

  /**
   * Подписаться на событие один раз
   * После первого вызова обработчик автоматически удаляется
   */
  once(event: string, handler: EventHandler): this {
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Подписаться на все события
   * Обработчик будет вызван для любого события
   */
  onAny(handler: (event: string, ...args: any[]) => void): this {
    this.__tvistInternal_anyListeners.add(handler);
    return this;
  }

  /**
   * Отписаться от всех событий
   */
  offAny(handler?: (event: string, ...args: any[]) => void): this {
    if (handler) {
      this.__tvistInternal_anyListeners.delete(handler);
    } else {
      this.__tvistInternal_anyListeners.clear();
    }
    return this;
  }

  /**
   * Очистить все подписки
   */
  clear(): void {
    this.__tvistInternal_listeners.clear();
    this.__tvistInternal_anyListeners.clear();
  }

  /**
   * Получить список всех событий, на которые есть подписки
   */
  eventNames(): string[] {
    return Array.from(this.__tvistInternal_listeners.keys());
  }

  /**
   * Получить количество обработчиков для события
   */
  listenerCount(event: string): number {
    const handlers = this.__tvistInternal_listeners.get(event);
    return handlers ? handlers.size : 0;
  }

  /** Есть ли получатели промежуточной позиции перехода. */
  hasPositionListeners(): boolean {
    return (
      this.__tvistInternal_anyListeners.size > 0 ||
      this.listenerCount('scroll') > 0 ||
      this.listenerCount('setTranslate') > 0 ||
      this.listenerCount('progress') > 0
    );
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
