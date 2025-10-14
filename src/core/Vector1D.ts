/**
 * Класс для работы с одномерными векторами и математикой
 * Используется для хранения и манипуляции позициями в одномерном пространстве
 */
export class Vector1D {
  private value: number

  constructor(initialValue: number) {
    this.value = initialValue
  }

  /**
   * Устанавливает новое значение
   */
  set(value: number): this {
    this.value = value
    return this
  }

  /**
   * Получает текущее значение
   */
  get(): number {
    return this.value
  }

  /**
   * Добавляет значение к текущему
   */
  add(value: number): this {
    this.value += value
    return this
  }

  /**
   * Вычитает значение из текущего
   */
  subtract(value: number): this {
    this.value -= value
    return this
  }

  /**
   * Умножает текущее значение на множитель
   */
  multiply(factor: number): this {
    this.value *= factor
    return this
  }

  /**
   * Линейная интерполяция между текущим и целевым значением
   * @param target - целевое значение
   * @param factor - коэффициент интерполяции (0-1)
   */
  lerp(target: number, factor: number): this {
    this.value += (target - this.value) * factor
    return this
  }

  /**
   * Нормализует значение в диапазон [0, 1]
   * @param min - минимальное значение диапазона
   * @param max - максимальное значение диапазона
   */
  normalize(min: number, max: number): number {
    if (max === min) return 0
    return (this.value - min) / (max - min)
  }

  /**
   * Создаёт копию вектора
   */
  clone(): Vector1D {
    return new Vector1D(this.value)
  }
}

