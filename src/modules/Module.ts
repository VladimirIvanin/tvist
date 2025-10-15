/**
 * Базовый класс для всех модулей
 * Определяет интерфейс и lifecycle методы
 */

import type { Tvist } from '../core/Tvist'
import type { TvistOptions } from '../core/types'

export abstract class Module {
  /**
   * Имя модуля (должно быть уникальным)
   */
  abstract readonly name: string

  /**
   * Конструктор модуля
   * @param tvist - Instance главного класса
   * @param options - Опции слайдера
   */
  constructor(
    protected tvist: Tvist,
    protected options: TvistOptions
  ) {}

  /**
   * Инициализация модуля
   * Вызывается автоматически при создании слайдера
   */
  abstract init(): void

  /**
   * Уничтожение модуля
   * Должно очищать все listeners и таймеры
   */
  abstract destroy(): void

  /**
   * Хук: вызывается при обновлении слайдера (resize, update())
   */
  onUpdate?(): void

  /**
   * Хук: вызывается при прокрутке
   */
  onScroll?(): void

  /**
   * Хук: вызывается при resize
   */
  onResize?(): void

  /**
   * Хук: вызывается при смене слайда
   */
  onSlideChange?(index: number): void

  /**
   * Проверка, должен ли модуль быть активен
   * Используется для условной активации модулей
   */
  protected shouldBeActive(): boolean {
    return true
  }

  /**
   * Emit события через главный event emitter
   */
  protected emit(event: string, ...args: any[]): void {
    this.tvist.emit(event, ...args)
  }

  /**
   * Подписка на события
   */
  protected on(event: string, handler: (...args: any[]) => void): void {
    this.tvist.on(event, handler)
  }

  /**
   * Отписка от событий
   */
  protected off(event: string, handler?: (...args: any[]) => void): void {
    this.tvist.off(event, handler)
  }
}

/**
 * Тип конструктора модуля для регистрации
 */
export type ModuleConstructor = new (
  tvist: Tvist,
  options: TvistOptions
) => Module

