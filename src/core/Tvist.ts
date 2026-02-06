/**
 * Tvist - главный класс слайдера
 * Точка входа для пользователя
 */

import { Engine } from './Engine'
import { EventEmitter } from './EventEmitter'
import { getElement, children } from '../utils/dom'
import { TVIST_CLASSES } from './constants'
import type { TvistOptions } from './types'
import type { Module, ModuleConstructor } from '../modules/Module'
import { throttle } from './Animator'

export class Tvist {
  static readonly VERSION = '1.0.0'

  /** Карта BEM-классов (tvist-v0, tvist-v0__container, …). Для использования нескольких версий на одной странице */
  static readonly CLASSES = TVIST_CLASSES
  /** Префикс BEM-блока для CSS (tvist-v0). @deprecated Используйте Tvist.CLASSES.block */
  static readonly CSS_PREFIX = TVIST_CLASSES.block

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

  // Состояние включения/выключения слайдера
  private _isEnabled = true

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
    const containerSelector = `.${TVIST_CLASSES.container}`
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
    this._slides = children(this.container, `.${TVIST_CLASSES.slide}`)

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
      enabled: true,
      ...options,
    }

    // Проверяем начальное состояние enabled
    this._isEnabled = this.options.enabled !== false

    // Инициализация системы событий
    this.events = new EventEmitter()

    // Применяем классы состояния
    if (this.options.direction === 'vertical') {
      this.root.classList.add(TVIST_CLASSES.vertical)
    }

    if (!this._isEnabled) {
      this.root.classList.add(TVIST_CLASSES.disabled)
    }

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

    // Инициализируем модули (breakpoints должен работать всегда)
    this.initModules()

    // Слушаем resize
    this.setupResizeListener()

    // Первый рендер только если слайдер включен
    if (this._isEnabled) {
      this.update()
    } else {
      // Если отключен, очищаем стили, которые мог установить Engine
      this.clearSliderStyles()
    }

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
    if (!this._isEnabled) return this
    if (this.engine.canScrollNext()) {
      this.engine.scrollBy(1)
    }
    return this
  }

  /**
   * Предыдущий слайд
   */
  prev(): this {
    if (!this._isEnabled) return this
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
    if (!this._isEnabled) return this
    const targetIndex = this.indexResolver ? this.indexResolver(index) : index
    this.engine.scrollTo(targetIndex, instant)
    return this
  }

  /**
   * Обновить размеры и пересчитать позиции
   */
  update(): this {
    // Не обновляем, если слайдер отключен
    if (!this._isEnabled) return this

    // Обновляем класс направления
    if (this.options.direction === 'vertical') {
      this.root.classList.add(TVIST_CLASSES.vertical)
    } else {
      this.root.classList.remove(TVIST_CLASSES.vertical)
    }

    this.engine.update()

    // Вызываем onUpdate на модулях
    this.modules.forEach((module) => {
      module.onUpdate?.()
    })

    return this
  }

  /**
   * Обновить опции слайдера динамически (без пересоздания)
   * Аналог swiper.updateParams()
   * @param newOptions - новые опции для применения
   */
  updateOptions(newOptions: Partial<TvistOptions>): this {
    // Мёрджим новые опции с текущими
    const oldOptions = { ...this.options }
    Object.assign(this.options, newOptions)

    // Обработка изменения direction
    if (newOptions.direction !== undefined && newOptions.direction !== oldOptions.direction) {
      if (this.options.direction === 'vertical') {
        this.root.classList.add(TVIST_CLASSES.vertical)
      } else {
        this.root.classList.remove(TVIST_CLASSES.vertical)
      }
    }

    // Обработка изменения on (обработчики событий)
    if (newOptions.on) {
      // Удаляем старые обработчики если они были
      if (oldOptions.on) {
        Object.entries(oldOptions.on).forEach(([event, handler]) => {
          if (handler) {
            this.events.off(event, handler)
          }
        })
      }
      // Добавляем новые обработчики
      Object.entries(newOptions.on).forEach(([event, handler]) => {
        if (handler) {
          this.events.on(event, handler)
        }
      })
    }

    // Обработка изменения peek
    if (newOptions.peek !== undefined || newOptions.peekTrim !== undefined) {
      // Применяем новые значения peek к контейнеру
      this.engine.applyPeekPublic()
    }

    // Пересчитываем размеры и позиции при изменении ключевых опций
    const needsRecalculation = 
      newOptions.perPage !== undefined ||
      newOptions.slideMinSize !== undefined ||
      newOptions.gap !== undefined ||
      newOptions.peek !== undefined ||
      newOptions.peekTrim !== undefined ||
      newOptions.direction !== undefined ||
      newOptions.center !== undefined

    if (needsRecalculation) {
      this.update()
    }

    // Уведомляем модули об изменении опций
    this.modules.forEach((module) => {
      module.onOptionsUpdate?.(newOptions)
    })

    // Событие обновления опций
    this.emit('optionsUpdated', this, newOptions)

    return this
  }

  /**
   * Очистить стили слайдера (transform и размеры слайдов)
   */
  private clearSliderStyles(): void {
    // Убираем transform с контейнера
    this.container.style.transform = ''

    // Убираем инлайн-стили со слайдов
    this.slides.forEach(slide => {
      slide.style.width = ''
      slide.style.height = ''
      slide.style.marginRight = ''
      slide.style.marginBottom = ''
    })
  }

  /**
   * Отключить слайдер (превратить в статичный контент)
   * Убирает transform, отключает модули, но сохраняет экземпляр
   */
  disable(): this {
    if (!this._isEnabled) return this

    this._isEnabled = false
    this.root.classList.add(TVIST_CLASSES.disabled)

    // Очищаем стили
    this.clearSliderStyles()

    // Отключаем модули (кроме breakpoints - он должен работать всегда)
    const modulesToDestroy: string[] = []
    this.modules.forEach((_module, name) => {
      if (name === 'breakpoints') return // Не трогаем breakpoints
      modulesToDestroy.push(name)
    })

    modulesToDestroy.forEach(name => {
      try {
        this.modules.get(name)?.destroy()
        this.modules.delete(name)
      } catch (error) {
        console.error(`Tvist: Error disabling module "${name}":`, error)
      }
    })

    this.emit('disabled', this)
    return this
  }

  /**
   * Включить слайдер (восстановить функциональность)
   */
  enable(): this {
    if (this._isEnabled) return this

    this._isEnabled = true
    this.root.classList.remove(TVIST_CLASSES.disabled)

    // Переинициализируем модули (кроме breakpoints - он уже работает)
    Tvist.MODULES.forEach((ModuleClass, name) => {
      if (name === 'breakpoints') return // Не переинициализируем breakpoints
      if (this.modules.has(name)) return // Уже есть
      
      try {
        const module = new ModuleClass(this, this.options)
        this.modules.set(name, module)
        module.init()
      } catch (error) {
        console.error(`Tvist: Failed to initialize module "${name}":`, error)
      }
    })

    // Пересчитываем размеры и позиции
    this.update()

    this.emit('enabled', this)
    return this
  }

  /**
   * Проверить, включен ли слайдер
   */
  get isEnabled(): boolean {
    return this._isEnabled
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
    this._slides = children(this.container, `.${TVIST_CLASSES.slide}`)
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

  /**
   * Синхронизация с другим экземпляром Tvist
   * @param target - целевой экземпляр для синхронизации
   */
  sync(target: Tvist): this {
    // 1. Когда скроллится этот слайдер -> скроллим целевой
    this.on('slideChange', (index: number) => {
      if (target.activeIndex !== index) {
        target.scrollTo(index)
      }
    })

    // 2. Когда скроллится целевой -> скроллим этот
    target.on('slideChange', (index: number) => {
      if (this.activeIndex !== index) {
        this.scrollTo(index)
      }
    })

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
