import { vi } from 'vitest';

/** Explicit happy-dom layout fixture. It is not a browser layout/paint oracle. */
export function installSliderUnitEnvironment() {
  const prototype = HTMLElement.prototype;
  const saved = new Map<PropertyKey, PropertyDescriptor | undefined>();
  const define = (key: PropertyKey, descriptor: PropertyDescriptor) => {
    saved.set(key, Object.getOwnPropertyDescriptor(prototype, key));
    Object.defineProperty(prototype, key, { configurable: true, ...descriptor });
  };
  const dimension = (element: HTMLElement | null, axis: 'width' | 'height'): number => {
    if (!element || element === document.body || element === document.documentElement)
      return axis === 'width' ? 720 : 240;
    if (element.style.display === 'none') return 0;
    const value = element.style[axis];
    if (value.endsWith('%'))
      return (dimension(element.parentElement, axis) * Number.parseFloat(value)) / 100;
    if (Number.isFinite(Number.parseFloat(value))) return Number.parseFloat(value);
    return dimension(element.parentElement, axis);
  };
  const previousSize = (element: HTMLElement): number => {
    let result = 0;
    let sibling = element.previousElementSibling as HTMLElement | null;
    while (sibling) {
      result += dimension(sibling, 'width') + (Number.parseFloat(sibling.style.marginRight) || 0);
      sibling = sibling.previousElementSibling as HTMLElement | null;
    }
    return result;
  };
  for (const [key, axis] of [
    ['clientWidth', 'width'],
    ['offsetWidth', 'width'],
    ['clientHeight', 'height'],
    ['offsetHeight', 'height'],
  ] as const) {
    define(key, {
      get(this: HTMLElement) {
        return dimension(this, axis);
      },
    });
  }
  define('offsetLeft', {
    get(this: HTMLElement) {
      return this.classList.contains('tvist-v1__slide') ? previousSize(this) : 0;
    },
  });
  define('getBoundingClientRect', {
    value(this: HTMLElement) {
      const parent = this.parentElement;
      const parentRect =
        parent && parent !== document.body && parent !== document.documentElement
          ? parent.getBoundingClientRect()
          : { x: 0, y: 0 };
      let x = parentRect.x;
      let y = parentRect.y;
      if (this.classList.contains('tvist-v1__slide')) x += previousSize(this);
      const translation = /translate3d\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(
        this.style.transform
      );
      if (translation) {
        x += Number(translation[1]);
        y += Number(translation[2]);
      }
      return DOMRect.fromRect({
        x,
        y,
        width: dimension(this, 'width'),
        height: dimension(this, 'height'),
      });
    },
  });

  const previousMatchMedia = window.matchMedia;
  const previousWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  let viewport = 1300;
  const queries = new Set<MediaQueryList>();
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => viewport });
  window.matchMedia = (query: string): MediaQueryList => {
    const maximum = /max-width:\s*(\d+)px/.exec(query);
    if (!maximum) throw new Error(`UNIT_FIXTURE_UNSUPPORTED_MEDIA_QUERY: ${query}`);
    const target = new EventTarget();
    Object.defineProperties(target, {
      media: { value: query },
      matches: { get: () => viewport <= Number(maximum[1]) },
      onchange: { writable: true, value: null },
      addListener: {
        value: (callback: EventListener) => target.addEventListener('change', callback),
      },
      removeListener: {
        value: (callback: EventListener) => target.removeEventListener('change', callback),
      },
    });
    const result = target as MediaQueryList;
    queries.add(result);
    return result;
  };
  const previousResize = globalThis.ResizeObserver;
  const previousIntersection = globalThis.IntersectionObserver;
  // No spontaneous observer callbacks: size changes are explicit model inputs.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class {
    root = null;
    rootMargin = '0px';
    thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  return {
    setViewport(width: number) {
      const before = new Map([...queries].map((query) => [query, query.matches]));
      viewport = width;
      for (const query of [...queries])
        if (query.matches !== before.get(query)) {
          const event = new Event('change');
          Object.defineProperties(event, {
            matches: { value: query.matches },
            media: { value: query.media },
          });
          query.dispatchEvent(event);
          query.onchange?.call(query, event as MediaQueryListEvent);
        }
    },
    reset() {
      queries.clear();
      viewport = 1300;
      document.body.innerHTML = '';
    },
    restore() {
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(prototype, key, descriptor);
        else Reflect.deleteProperty(prototype, key);
      }
      window.matchMedia = previousMatchMedia;
      if (previousWidth) Object.defineProperty(window, 'innerWidth', previousWidth);
      else Reflect.deleteProperty(window, 'innerWidth');
      globalThis.ResizeObserver = previousResize;
      globalThis.IntersectionObserver = previousIntersection;
      queries.clear();
      document.body.innerHTML = '';
    },
  };
}

export function makeSliderUnitRoot(
  count: number,
  id = 'unit-slider',
  parent: HTMLElement = document.body
): HTMLElement {
  const root = document.createElement('div');
  root.id = id;
  root.className = 'tvist-v1';
  root.style.cssText = 'width:720px;height:240px';
  root.innerHTML = `<div class="tvist-v1__track" style="width:100%;height:240px"><div class="tvist-v1__container" style="display:flex;height:240px">${Array.from({ length: count }, (_, index) => `<div class="tvist-v1__slide" data-unit-card="${index}" style="height:240px">Card ${index}</div>`).join('')}</div></div>`;
  parent.append(root);
  return root;
}

export function startUnitClock(): void {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
}

export function stopUnitClock(): void {
  vi.clearAllTimers();
  vi.useRealTimers();
}
