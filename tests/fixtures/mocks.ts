/**
 * Глобальные моки для тестов
 */

import { vi } from 'vitest'

/**
 * Мокирует requestAnimationFrame для синхронного выполнения
 * Полезно для тестов анимаций без реальных задержек
 */
export function mockRAF(): void {
  let rafId = 0
  const rafCallbacks = new Map<number, FrameRequestCallback>()

  // Mock requestAnimationFrame
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = ++rafId
      rafCallbacks.set(id, callback)
      // Выполняем немедленно
      Promise.resolve().then(() => {
        const cb = rafCallbacks.get(id)
        if (cb) {
          cb(performance.now())
          rafCallbacks.delete(id)
        }
      })
      return id
    })
  )

  // Mock cancelAnimationFrame
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      rafCallbacks.delete(id)
    })
  )
}

/**
 * Восстанавливает оригинальный requestAnimationFrame
 */
export function restoreRAF(): void {
  vi.unstubAllGlobals()
}

/**
 * Мокирует performance.now() для предсказуемого времени в тестах
 */
export function mockPerformanceNow(): void {
  let currentTime = 0

  vi.spyOn(performance, 'now').mockImplementation(() => currentTime)

  // Хелпер для продвижения времени
  ;(global as any).__advanceTime = (ms: number) => {
    currentTime += ms
  }
}

/**
 * Восстанавливает performance.now()
 */
export function restorePerformanceNow(): void {
  vi.restoreAllMocks()
  delete (global as any).__advanceTime
}

/**
 * Мокирует console методы чтобы не засорять вывод тестов
 */
export function mockConsole(): {
  log: ReturnType<typeof vi.spyOn>
  warn: ReturnType<typeof vi.spyOn>
  error: ReturnType<typeof vi.spyOn>
} {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})

  return { log, warn, error }
}

/**
 * Восстанавливает console методы
 */
export function restoreConsole(): void {
  vi.restoreAllMocks()
}

/**
 * Создаёт мок для IntersectionObserver
 * Нужен для тестирования Autoplay модуля
 */
export function mockIntersectionObserver(): void {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockImplementation((callback: IntersectionObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    root: null,
    rootMargin: '',
    thresholds: [],
  }))

  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
}

/**
 * Создаёт мок для ResizeObserver
 */
export function mockResizeObserver(): void {
  const mockResizeObserver = vi.fn()
  mockResizeObserver.mockImplementation((callback: ResizeObserverCallback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  vi.stubGlobal('ResizeObserver', mockResizeObserver)
}

/**
 * Мокирует getBoundingClientRect для элемента
 */
export function mockGetBoundingClientRect(
  element: HTMLElement,
  rect: Partial<DOMRect>
): void {
  const defaultRect: DOMRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect

  element.getBoundingClientRect = vi.fn(() => defaultRect)
}

/**
 * Хелпер для тестирования throttle/debounce функций
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Продвигает таймеры на указанное время
 * Работает с vi.useFakeTimers()
 */
export function advanceTimers(ms: number): void {
  vi.advanceTimersByTime(ms)
}

/**
 * Очищает все таймеры
 */
export function clearAllTimers(): void {
  vi.clearAllTimers()
}

