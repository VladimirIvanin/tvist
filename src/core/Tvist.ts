/**
 * Tvist - главный класс слайдера
 * Точка входа для пользователя
 */

import { Engine } from './Engine'
import { EventEmitter } from './EventEmitter'
import { getElement, children } from '../utils/dom'
import type { TvistOptions } from './types'
import type { Module, ModuleConstructor } from '../modules/Module'
import { throttle } from './Animator'

export class Tvist {
  static readonly VERSION = '1.0.0'

  // Реестр модулей (статический)
  static readonly MODULES = new Map<string, ModuleConstructor>()

  // DOM элементы
  readonly root: HTMLElement
  readonly container: HTMLElement
  private _slides: HTMLElement[]

  // Опции
  readonly options: TvistOptions

  // Ядро
  readonly engine: Engine

  // События
  private events: EventEmitter

  // Активные модули
  private modules = new Map<string, Module>()

  // Обработчик resize (для отписки)
  private resizeHandler?: () => void
  private resizeObserver?: ResizeObserver

  // Опциональный резолвер индекса (для модулей типа Loop)
  public indexResolver?: (index: number) => number

  /**
   * Создать экземпляр Tvist
   * @param target - селектор или HTMLElement
   * @param options - опции слайдера
   */
  constructor(
    target: string | HTMLElement,
    options: TvistOptions = {}
  ) {
    // Парсинг DOM
    this.root = getElement(target)

    // Находим контейнер
    const containerSelector = '.tvist__container'
    const containerElement = this.root.querySelector<HTMLElement>(
      containerSelector
    )

    if (!containerElement) {
      throw new Error(
        `Tvist: container "${containerSelector}" not found inside root element`
      )
    }

    this.container = containerElement

    // Получаем слайды
    this._slides = children(this.container, '.tvist__slide')

    if (this.slides.length === 0) {
      console.warn('Tvist: no slides found')
    }

    // Мёрджим опции с дефолтными
    this.options = {
      perPage: 1,
      gap: 0,
      speed: 300,
      direction: 'horizontal',
      drag: true,
      start: 0,
      loop: false,
      ...options,
    }

    // Инициализация системы событий
    this.events = new EventEmitter()

    // Регистрируем обработчики из опций
    if (this.options.on) {
      Object.entries(this.options.on).forEach(([event, handler]) => {
        if (handler) {
          this.events.on(event, handler)
        }
      })
    }

    // Создаём Engine
    this.engine = new Engine(this, this.options)

    // Инициализируем модули
    this.initModules()

    // Слушаем resize
    this.setupResizeListener()

    // Первый рендер
    this.update()

    // События created
    this.emit('created', this)
  }

  /**
   * Инициализация всех зарегистрированных модулей
   */
  private initModules(): void {
    Tvist.MODULES.forEach((ModuleClass, name) => {
      try {
        const module = new ModuleClass(this, this.options)
        this.modules.set(name, module)
        module.init()
      } catch (error) {
        console.error(`Tvist: Failed to initialize module "${name}":`, error)
      }
    })
  }

  /**
   * Настройка обработчика resize
   */
  private setupResizeListener(): void {
    this.resizeHandler = throttle(() => {
      this.update()
      this.emit('resize')
    }, 100)

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // Используем throttle handler
        this.resizeHandler?.()
      })
      this.resizeObserver.observe(this.root)
    } else {
      // Fallback для старых браузеров
      window.addEventListener('resize', this.resizeHandler)
    }
  }

  // ==================== ПУБЛИЧНОЕ API ====================

  /**
   * Следующий слайд
   */
  next(): this {
    if (this.engine.canScrollNext()) {
      this.engine.scrollBy(1)
    }
    return this
  }

  /**
   * Предыдущий слайд
   */
  prev(): this {
    if (this.engine.canScrollPrev()) {
      this.engine.scrollBy(-1)
    }
    return this
  }

  /**
   * Переход к слайду по индексу
   * @param index - индекс слайда (0-based)
   * @param instant - мгновенный переход без анимации
   */
  scrollTo(index: number, instant = false): this {
    const targetIndex = this.indexResolver ? this.indexResolver(index) : index
    this.engine.scrollTo(targetIndex, instant)
    return this
  }

  /**
   * Обновить размеры и пересчитать позиции
   */
  update(): this {
    this.engine.update()

    // Вызываем onUpdate на модулях
    this.modules.forEach((module) => {
      module.onUpdate?.()
    })

    return this
  }

  /**
   * Уничтожить экземпляр и очистить ресурсы
   */
  destroy(): this {
    // События destroyed (ДО очистки событий!)
    this.emit('destroyed', this)

    // Уничтожаем модули
    this.modules.forEach((module) => {
      try {
        module.destroy()
      } catch (error) {
        console.error(`Tvist: Error destroying module:`, error)
      }
    })
    this.modules.clear()

    // Останавливаем анимации
    this.engine.destroy()

    // Удаляем обработчик resize
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    } else if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }

    // Очищаем события
    this.events.clear()

    return this
  }

  /**
   * Получить модуль по имени
   */
  getModule<T extends Module>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined
  }

  /**
   * Получить список слайдов
   */
  get slides(): HTMLElement[] {
    return this._slides
  }

  /**
   * Обновить внутренний список слайдов из DOM
   * Используется LoopModule после перемещения слайдов
   */
  updateSlidesList(): void {
    this._slides = children(this.container, '.tvist__slide')
  }

  /**
   * Получить текущий индекс активного слайда
   */
  get activeIndex(): number {
    return this.engine.activeIndex
  }

  /**
   * Проверить, можно ли листать вперёд
   */
  get canScrollNext(): boolean {
    return this.engine.canScrollNext()
  }

  /**
   * Проверить, можно ли листать назад
   */
  get canScrollPrev(): boolean {
    return this.engine.canScrollPrev()
  }

  // ==================== СОБЫТИЯ ====================

  /**
   * Подписаться на событие
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  on(event: string, handler: (...args: any[]) => void): this {
    this.events.on(event, handler)
    return this
  }

  /**
   * Отписаться от события
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  off(event: string, handler?: (...args: any[]) => void): this {
    this.events.off(event, handler)
    return this
  }

  /**
   * Вызвать событие
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event args are untyped */
  emit(event: string, ...args: any[]): this {
    this.events.emit(event, ...args)
    return this
  }

  /**
   * Подписаться на событие один раз
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  once(event: string, handler: (...args: any[]) => void): this {
    this.events.once(event, handler)
    return this
  }

  // ==================== СТАТИЧЕСКИЕ МЕТОДЫ ====================

  /**
   * Зарегистрировать модуль
   */
  static registerModule(name: string, ModuleClass: ModuleConstructor): void {
    if (Tvist.MODULES.has(name)) {
      console.warn(`Tvist: Module "${name}" is already registered`)
      return
    }
    Tvist.MODULES.set(name, ModuleClass)
  }

  /**
   * Удалить модуль из реестра
   */
  static unregisterModule(name: string): void {
    Tvist.MODULES.delete(name)
  }

  /**
   * Получить список зарегистрированных модулей
   */
  static getRegisteredModules(): string[] {
    return Array.from(Tvist.MODULES.keys())
  }
}

// Экспорт по умолчанию
export default Tvist
