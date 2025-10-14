/**
 * Математические утилиты
 */

/**
 * Ограничивает значение в диапазоне [min, max]
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * Линейная интерполяция между двумя значениями
 * @param start - начальное значение
 * @param end - конечное значение
 * @param t - коэффициент интерполяции (0-1)
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Отображает значение из одного диапазона в другой
 * @param value - входное значение
 * @param inMin - минимум входного диапазона
 * @param inMax - максимум входного диапазона
 * @param outMin - минимум выходного диапазона
 * @param outMax - максимум выходного диапазона
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const normalized = (value - inMin) / (inMax - inMin)
  return lerp(outMin, outMax, normalized)
}

/**
 * Вычисляет модуль числа с поддержкой отрицательных значений
 * В отличие от %, всегда возвращает положительное число
 */
export function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

/**
 * Проверяет, находится ли значение в диапазоне
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * Округляет до определенного количества знаков после запятой
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

