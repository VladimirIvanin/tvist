/**
 * Основные типы для Velosiped
 */

/**
 * Опции для инициализации слайдера
 */
export interface VelosipedOptions {
  /** Количество слайдов на странице */
  perPage?: number;
  
  /** Отступ между слайдами в пикселях */
  gap?: number;
  
  /** Включить drag */
  drag?: boolean | 'free';
  
  /** Скорость драга */
  dragSpeed?: number;
  
  /** Включить стрелки навигации */
  arrows?: boolean;
  
  /** Включить пагинацию */
  pagination?: boolean;
  
  /** Автопрокрутка (задержка в ms) */
  autoplay?: number | boolean;
  
  /** Бесконечная прокрутка */
  loop?: boolean;
  
  /** Брейкпоинты для адаптивности */
  breakpoints?: Record<number, Partial<VelosipedOptions>>;
  
  /** Начальный индекс */
  startIndex?: number;
  
  /** Скорость анимации в ms */
  speed?: number;
}

/**
 * События слайдера
 */
export interface VelosipedEvents {
  init: [];
  destroy: [];
  slideChanged: [index: number];
  slideClick: [index: number];
  dragStart: [];
  drag: [];
  dragEnd: [];
  autoplayStart: [];
  autoplayStop: [];
}

/**
 * Тип для обработчика событий
 */
export type EventHandler<T extends any[] = any[]> = (...args: T) => void;

