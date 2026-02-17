/**
 * Утилиты определения окружения/браузера
 */

/**
 * Признак браузера Firefox (для workaround'ов отрисовки изображений и т.п.)
 */
export const isFirefox =
  typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent)
