/**
 * Управление индексами слайдов с учётом границ и loop
 * Используется для безопасной работы с индексами в массиве слайдов
 */
export class Counter {
  private value: number
  public max: number
  private loop: boolean

  /**
   * @param max - максимальный индекс (длина массива)
   * @param start - начальный индекс
   * @param loop - включить циклические индексы
   */
  constructor(max: number, start = 0, loop = false) {
    this.max = max
    this.loop = loop
    this.value = this.constrain(start)
  }

  /**
   * Устанавливает индекс с валидацией границ
   * @param index - новый индекс
   * @returns нормализованный индекс
   */
  set(index: number): number {
    this.value = this.constrain(index)
    return this.value
  }

  /**
   * Получает текущий индекс
   */
  get(): number {
    return this.value
  }

  /**
   * Добавляет к текущему индексу
   * @param value - значение для добавления
   */
  add(value: number): this {
    this.set(this.value + value)
    return this
  }

  /**
   * Создаёт копию счётчика
   */
  clone(): Counter {
    return new Counter(this.max, this.value, this.loop)
  }

  /**
   * Ограничивает индекс в пределах границ
   * С учётом loop режима
   */
  private constrain(index: number): number {
    if (this.max === 0) return 0

    if (this.loop) {
      // Циклический режим: -1 -> max-1, max -> 0
      while (index < 0) {
        index += this.max
      }
      return index % this.max
    } else {
      // Обычный режим: ограничиваем [0, max-1]
      return Math.max(0, Math.min(index, this.max - 1))
    }
  }
}

