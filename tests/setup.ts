/**
 * Vitest setup file
 * Глобальные настройки и моки для всех тестов
 */

import { afterEach, beforeAll, afterAll, vi } from 'vitest'

/**
 * Глобальные настройки перед всеми тестами
 */
beforeAll(() => {
  // Мокируем IntersectionObserver (для Autoplay модуля)
  global.IntersectionObserver = class IntersectionObserver {
    constructor(public callback: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as any

  // Мокируем ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor(public callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any

  // Мокируем matchMedia (для Breakpoints модуля)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Устанавливаем дефолтные размеры окна
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })

  // Мокируем getComputedStyle для возврата базовых стилей
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = (element: Element) => {
    const styles = originalGetComputedStyle(element)
    return new Proxy(styles, {
      get(target, prop) {
        if (prop === 'marginLeft' || prop === 'marginRight') {
          return '0px'
        }
        return target[prop as any]
      },
    })
  }
})

/**
 * Cleanup после каждого теста
 */
afterEach(() => {
  // Очищаем DOM
  document.body.innerHTML = ''

  // Очищаем все таймеры
  vi.clearAllTimers()

  // Восстанавливаем все моки
  vi.restoreAllMocks()
})

/**
 * Cleanup после всех тестов
 */
afterAll(() => {
  vi.unstubAllGlobals()
})

