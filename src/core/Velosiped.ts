import type { VelosipedOptions } from './types';

/**
 * Главный класс Velosiped
 */
export class Velosiped {
  static readonly VERSION = '0.0.1';
  
  private root: HTMLElement;
  private options: Required<VelosipedOptions>;
  
  constructor(target: string | HTMLElement, options: VelosipedOptions = {}) {
    // Находим root элемент
    this.root = typeof target === 'string' 
      ? document.querySelector(target) as HTMLElement
      : target;
      
    if (!this.root) {
      throw new Error(`[Velosiped] Element not found: ${target}`);
    }
    
    // Опции по умолчанию
    this.options = {
      perPage: 1,
      gap: 0,
      drag: true,
      dragSpeed: 1,
      arrows: false,
      pagination: false,
      autoplay: false,
      loop: false,
      breakpoints: {},
      startIndex: 0,
      speed: 300,
      ...options,
    };
    
    this.init();
  }
  
  private init(): void {
    console.log('[Velosiped] Initialized', this.options);
  }
  
  public destroy(): void {
    console.log('[Velosiped] Destroyed');
  }
  
  public next(): this {
    console.log('[Velosiped] Next');
    return this;
  }
  
  public prev(): this {
    console.log('[Velosiped] Prev');
    return this;
  }
  
  public scrollTo(index: number): this {
    console.log('[Velosiped] ScrollTo', index);
    return this;
  }
}

