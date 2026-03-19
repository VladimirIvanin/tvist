/**
 * DOM утилиты для работы с элементами
 */

/**
 * Получает элемент по селектору или возвращает сам элемент
 * @throws {Error} если элемент не найден
 */
export function getElement(target: string | HTMLElement): HTMLElement {
  if (typeof target === 'string') {
    const element = document.querySelector<HTMLElement>(target)
    if (!element) {
      throw new Error(`Tvist: element "${target}" not found`)
    }
    return element
  }
  return target
}

/**
 * Получает коллекцию элементов
 */
export function getElements(
  target: string | HTMLElement | HTMLElement[]
): HTMLElement[] {
  if (Array.isArray(target)) {
    return target
  }
  if (typeof target === 'string') {
    return Array.from(document.querySelectorAll<HTMLElement>(target))
  }
  return [target]
}

/**
 * Добавляет класс к элементу
 */
export function addClass(element: HTMLElement, className: string): void {
  element.classList.add(className)
}

/**
 * Удаляет класс у элемента
 */
export function removeClass(element: HTMLElement, className: string): void {
  element.classList.remove(className)
}

/**
 * Переключает класс у элемента
 */
export function toggleClass(
  element: HTMLElement,
  className: string,
  force?: boolean
): void {
  if (force !== undefined) {
    element.classList.toggle(className, force)
  } else {
    element.classList.toggle(className)
  }
}

/**
 * Проверяет наличие класса у элемента
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className)
}

/**
 * Устанавливает CSS transform
 */
export function setTransform(element: HTMLElement, value: string): void {
  element.style.transform = value
}

/**
 * Устанавливает translate3d для GPU acceleration
 */
export function setTranslate(element: HTMLElement, x: number, y = 0): void {
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

/**
 * Устанавливает transition
 */
export function setTransition(element: HTMLElement, value: string): void {
  element.style.transition = value
}

/**
 * Получает ширину элемента с учетом padding и border
 */
export function getOuterWidth(element: HTMLElement): number {
  return element.offsetWidth
}

/**
 * Получает высоту элемента с учетом padding и border
 */
export function getOuterHeight(element: HTMLElement): number {
  return element.offsetHeight
}

/**
 * Получает computed style значение
 */
export function getStyle(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property)
}

/**
 * Находит ближайший родительский элемент по селектору
 */
export function closest(
  element: HTMLElement,
  selector: string
): HTMLElement | null {
  return element.closest(selector)
}

/**
 * Проверяет, является ли элемент фокусируемым (input, textarea, etc)
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']
  return (
    focusableTags.includes(element.tagName) ||
    element.hasAttribute('contenteditable') ||
    element.tabIndex >= 0
  )
}

/**
 * Получает все дочерние элементы по селектору
 */
export function children(
  element: HTMLElement,
  selector?: string
): HTMLElement[] {
  if (selector) {
    return Array.from(element.querySelectorAll<HTMLElement>(selector))
  }
  return Array.from(element.children) as HTMLElement[]
}

/**
 * Проверяет, является ли значение DOM-элементом.
 * Использует duck-typing вместо instanceof для совместимости с разными окружениями (happy-dom, jsdom).
 */
function isDomElement(value: unknown): value is Element {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).nodeType === 'number' &&
    typeof (value as Record<string, unknown>).classList === 'object'
  )
}

/**
 * Восстанавливает DOM-элементы из вложенного объекта опций после JSON-клонирования.
 */
function restoreDomElements(
  orig: Record<string, unknown>,
  cloned: Record<string, unknown>
): void {
  for (const key of Object.keys(orig)) {
    if (isDomElement(orig[key])) {
      cloned[key] = orig[key]
    }
  }
}

/**
 * Клонирует объект опций слайдера, сохраняя DOM-элементы.
 * JSON.parse/stringify теряет DOM-элементы (arrows.prev/next, pagination.container,
 * scrollbar.container и т.д.), поэтому после клонирования восстанавливаем их из оригинала.
 */
export function cloneOptions<T extends Record<string, unknown>>(options: T): T {
  const cloned = JSON.parse(JSON.stringify(options)) as T

  // Список вложенных объектов опций, которые могут содержать DOM-элементы
  const nestedKeys = ['arrows', 'pagination', 'scrollbar'] as const

  for (const key of nestedKeys) {
    const orig = options[key]
    if (orig && typeof orig === 'object' && !Array.isArray(orig)) {
      const clonedNested = ((cloned[key] ?? {}) as Record<string, unknown>)
      restoreDomElements(orig as Record<string, unknown>, clonedNested)
      ;(cloned as Record<string, unknown>)[key] = clonedNested
    }
  }

  return cloned
}

