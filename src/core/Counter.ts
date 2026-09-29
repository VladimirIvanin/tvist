/**
 * Управление индексами слайдов с учётом границ и loop
 * Используется для безопасной работы с индексами в массиве слайдов
 */
export class Counter {
  private __tvistInternal_value: number;
  public max: number;
  public loop: boolean;
  public endIndex: number;

  /**
   * @param max - максимальный индекс (длина массива)
   * @param start - начальный индекс
   * @param loop - включить циклические индексы
   * @param endIndex - максимальный допустимый индекс (для perPage > 1)
   */
  constructor(max: number, start = 0, loop = false, endIndex?: number) {
    this.max = max;
    this.loop = loop;
    this.endIndex = endIndex ?? max - 1;
    this.__tvistInternal_value = this.__tvistInternal_constrain(start);
  }

  /**
   * Устанавливает индекс с валидацией границ
   * @param index - новый индекс
   * @returns нормализованный индекс
   */
  set(index: number): number {
    this.__tvistInternal_value = this.__tvistInternal_constrain(index);
    return this.__tvistInternal_value;
  }

  /**
   * Получает текущий индекс
   */
  get(): number {
    return this.__tvistInternal_value;
  }

  /**
   * Добавляет к текущему индексу
   * @param value - значение для добавления
   */
  add(value: number): this {
    this.set(this.__tvistInternal_value + value);
    return this;
  }

  /**
   * Создаёт копию счётчика
   */
  clone(): Counter {
    return new Counter(this.max, this.__tvistInternal_value, this.loop, this.endIndex);
  }

  /**
   * Ограничивает индекс в пределах границ
   * С учётом loop режима
   */
  private __tvistInternal_constrain(index: number): number {
    if (this.max === 0) return 0;

    if (this.loop) {
      // Циклический режим: -1 -> max-1, max -> 0
      while (index < 0) {
        index += this.max;
      }
      return index % this.max;
    } else {
      // Обычный режим: ограничиваем [0, endIndex]
      return Math.max(0, Math.min(index, this.endIndex));
    }
  }
}
