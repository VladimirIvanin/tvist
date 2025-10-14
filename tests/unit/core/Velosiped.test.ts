import { describe, it, expect, beforeEach } from 'vitest';
import { Velosiped } from '@core/Velosiped';

describe('Velosiped', () => {
  let container: HTMLElement;
  
  beforeEach(() => {
    // Создаём DOM структуру для тестов
    container = document.createElement('div');
    container.className = 'velosiped';
    container.innerHTML = `
      <div class="velosiped__container">
        <div class="velosiped__slide">Slide 1</div>
        <div class="velosiped__slide">Slide 2</div>
        <div class="velosiped__slide">Slide 3</div>
      </div>
    `;
    document.body.appendChild(container);
  });
  
  it('should initialize with HTMLElement', () => {
    const slider = new Velosiped(container);
    expect(slider).toBeInstanceOf(Velosiped);
  });
  
  it('should initialize with selector', () => {
    const slider = new Velosiped('.velosiped');
    expect(slider).toBeInstanceOf(Velosiped);
  });
  
  it('should throw error if element not found', () => {
    expect(() => {
      new Velosiped('.not-exists');
    }).toThrow('[Velosiped] Element not found');
  });
  
  it('should have VERSION property', () => {
    expect(Velosiped.VERSION).toBe('0.0.1');
  });
  
  it('should have next() method', () => {
    const slider = new Velosiped(container);
    expect(slider.next()).toBe(slider); // chainable
  });
  
  it('should have prev() method', () => {
    const slider = new Velosiped(container);
    expect(slider.prev()).toBe(slider); // chainable
  });
  
  it('should have scrollTo() method', () => {
    const slider = new Velosiped(container);
    expect(slider.scrollTo(1)).toBe(slider); // chainable
  });
  
  it('should have destroy() method', () => {
    const slider = new Velosiped(container);
    expect(() => slider.destroy()).not.toThrow();
  });
});

