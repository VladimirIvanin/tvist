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
  // Создаём динамический мок, который реагирует на изменения window.innerWidth
  const mediaQueryListeners = new Map<string, Set<(event: any) => void>>()
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      // Парсим max-width из query
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/)
      const maxWidth = maxWidthMatch ? parseInt(maxWidthMatch[1], 10) : Infinity
      
      // Проверяем текущую ширину
      const matches = window.innerWidth <= maxWidth
      
      const listeners = mediaQueryListeners.get(query) || new Set()
      mediaQueryListeners.set(query, listeners)
      
      const mql = {
        matches,
        media: query,
        onchange: null,
        addListener: (callback: (event: any) => void) => {
          listeners.add(callback)
        },
        removeListener: (callback: (event: any) => void) => {
          listeners.delete(callback)
        },
        addEventListener: (event: string, callback: (event: any) => void) => {
          if (event === 'change') {
            listeners.add(callback)
          }
        },
        removeEventListener: (event: string, callback: (event: any) => void) => {
          if (event === 'change') {
            listeners.delete(callback)
          }
        },
        dispatchEvent: () => true,
      }
      
      return mql as MediaQueryList
    },
  })
  
  // Хелпер для триггера matchMedia событий при изменении innerWidth
  const originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
  Object.defineProperty(window, 'innerWidth', {
    get() {
      return originalInnerWidthDescriptor?.value ?? 1024
    },
    set(value: number) {
      const oldValue = originalInnerWidthDescriptor?.value ?? 1024
      if (originalInnerWidthDescriptor) {
        originalInnerWidthDescriptor.value = value
      }
      
      // Триггерим все matchMedia listeners
      if (oldValue !== value) {
        mediaQueryListeners.forEach((listeners, query) => {
          const maxWidthMatch = query.match(/max-width:\s*(\d+)px/)
          const maxWidth = maxWidthMatch ? parseInt(maxWidthMatch[1], 10) : Infinity
          const newMatches = value <= maxWidth
          const oldMatches = oldValue <= maxWidth
          
          if (newMatches !== oldMatches) {
            listeners.forEach(callback => {
              callback({ matches: newMatches, media: query })
            })
          }
        })
      }
    },
    configurable: true,
  })

  // Устанавливаем дефолтный размер высоты окна
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })
  
  // innerWidth уже определён выше в matchMedia моке с начальным значением 1024

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

