/**
 * Tvist - главный класс слайдера
 * Точка входа для пользователя
 */

import pkg from '../../package.json' with { type: 'json' }
import { Engine } from './Engine'
import { EventEmitter } from './EventEmitter'
import { getElement, children, cloneOptions } from '../utils/dom'
import { TVIST_CLASSES } from './constants'
import type { TvistOptions, AutoplayModuleAPI, VideoModuleAPI } from './types'
import type { Module, ModuleConstructor } from '../modules/Module'
import { BreakpointsModule } from '../modules/breakpoints/BreakpointsModule'
import { throttle } from './Animator'
import { applyInitialBreakpoint } from '../utils/breakpoints'

/** Root-элемент слайдера с опциональной ссылкой на инстанс (для переиспользования одного root) */
export interface TvistRootElement extends HTMLElement {
  tvistInstance?: Tvist | null
}

export class Tvist {
  static readonly VERSION = pkg.version ?? '0.0.0'

  /** Карта BEM-классов (префикс из package.json: tvist-v1, tvist-v1__container, …). Для использования нескольких версий на одной странице */
  static readonly CLASSES = TVIST_CLASSES
  /** Префикс BEM-блока для CSS. @deprecated Используйте Tvist.CLASSES.block */
  static readonly CSS_PREFIX = TVIST_CLASSES.block

  // Реестр модулей (статический)
  static readonly MODULES = new Map<string, ModuleConstructor>()

  // Генератор уникальных ID с поддержкой crypto.randomUUID() и fallback
  private static generateId(): string {
    // Современные браузеры: используем crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `tvist-${crypto.randomUUID()}`
    }
    
    // Fallback: генерируем UUID v4 вручную
    // Формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    
    return `tvist-${uuid}`
  }

  // Уникальный ID инстанса
  readonly id: string

  // DOM элементы
  readonly root: HTMLElement
  readonly container: HTMLElement
  private _slides: HTMLElement[]

  // Опции
  readonly options: TvistOptions
  
  // Оригинальные опции (до применения breakpoints) - для BreakpointsModule
  readonly _originalOptions?: TvistOptions

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

  // Флаг для отслеживания ручного изменения enabled (для breakpoints)
  private _manualEnabledChange = false

  // Флаг для предотвращения применения брейкпоинтов во время enable/disable
  private _isTogglingEnabled = false

  // Флаг видимости слайдера (управляется VisibilityModule)
  public _isVisible = true

  // Флаг для контроля кликов (устанавливается в false при драге)
  public allowClick = true

  /**
   * Создать экземпляр Tvist
   * @param target - селектор или HTMLElement
   * @param options - опции слайдера
   */
  constructor(
    target: string | HTMLElement,
    options: TvistOptions = {}
  ) {
    // Генерируем уникальный ID для инстанса
    this.id = Tvist.generateId()

    // Парсинг DOM
    this.root = getElement(target)

    // Если на этом root уже есть инстанс — уничтожаем его
    const rootEl = this.root as TvistRootElement
    if (rootEl.tvistInstance && typeof rootEl.tvistInstance.destroy === 'function') {
      rootEl.tvistInstance.destroy()
    }
    rootEl.tvistInstance = this

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
    const defaultBrowserFixes = {
      firefoxImageDecoding: true,
    }
    
    this.options = {
      perPage: 1,
      slidesPerGroup: 1,
      gap: 0,
      speed: 300,
      direction: 'horizontal',
      drag: true,
      start: 0,
      loop: false,
      enabled: true,
      preventClicks: true,
      preventClicksPropagation: true,
      visibility: true,
      ...options,
      // Мерджим browserFixes отдельно для правильного объединения
      browserFixes: {
        ...defaultBrowserFixes,
        ...options.browserFixes,
      },
    }

    // Сохраняем оригинальные опции ДО применения breakpoints
    // Это нужно для BreakpointsModule чтобы восстанавливать базовые опции
    if (this.options.breakpoints && Object.keys(this.options.breakpoints).length > 0) {
      const cloned = cloneOptions(this.options as Record<string, unknown>) as TvistOptions
      if (this.options.breakpointsBase) {
        cloned.breakpointsBase = this.options.breakpointsBase
      }
      ;(this as { _originalOptions?: TvistOptions })._originalOptions = cloned
    }

    // Применяем breakpoints ДО создания Engine (если есть)
    applyInitialBreakpoint(this.root, this.options)

    // Индексы слайдов для стилизации и идентификации (в т.ч. для loop)
    this.updateSlideIndices()

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

    // Вычитываем модули, зарегистрированные до загрузки core-бандла
    Tvist.flushModuleQueue()

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

    this.root.classList.add(TVIST_CLASSES.created)
    this.emit('created', this)
    this.setupSlideClick()
  }

  /** Делегирование клика по слайду */
  private setupSlideClick(): void {
    this.container.addEventListener('click', this.slideClickHandler)
  }

  private slideClickHandler = (e: MouseEvent): void => {
    // Проверяем флаг allowClick (устанавливается в false при драге)
    if (!this.allowClick) {
      if (this.options.preventClicks) {
        e.preventDefault()
      }
      if (this.options.preventClicksPropagation && this.engine.animator.isAnimating()) {
        e.stopPropagation()
        e.stopImmediatePropagation()
      }
      return
    }

    const slide = (e.target as HTMLElement).closest(
      `.${TVIST_CLASSES.slide}`
    )
    if (!slide) return
    const index = this.slides.indexOf(slide as HTMLElement)
    if (index === -1) return
    this.emit('click', index, slide as HTMLElement, e)
  }

  /**
   * Инициализация всех зарегистрированных модулей
   */
  private initModules(): void {
    Tvist.MODULES.forEach((ModuleClass, name) => {
      try {
        const module = new ModuleClass(this, this.options)
        // Проверяем, должен ли модуль быть активным
        if (module.shouldBeActive?.() !== false) {
          this.modules.set(name, module)
          module.init()
        }
      } catch (error) {
        console.error(`Tvist: Failed to initialize module "${name}":`, error)
      }
    })
  }

  /**
   * Синхронизирует активные модули с текущими опциями:
   * - инициализирует модули, которые стали активными (shouldBeActive() = true)
   * - уничтожает модули, которые стали неактивными (shouldBeActive() = false)
   * Вызывается при смене брейкпоинта и из updateOptions().
   * @internal
   */
  syncModules(destroyOnly = false): void {
    // Уничтожаем модули, которые больше не должны быть активными
    this.modules.forEach((module, name) => {
      if (name === 'breakpoints') return
      try {
        if (module.shouldBeActive?.() === false) {
          module.destroy()
          this.modules.delete(name)
        }
      } catch (error) {
        console.error(`Tvist: Error destroying module "${name}":`, error)
      }
    })

    // Инициализируем модули, которые стали активными
    // При destroyOnly=true пропускаем — слайдер отключён, новые модули не нужны
    if (destroyOnly) return

    Tvist.MODULES.forEach((ModuleClass, name) => {
      if (this.modules.has(name)) return
      try {
        const module = new ModuleClass(this, this.options)
        if (module.shouldBeActive?.() !== false) {
          this.modules.set(name, module)
          module.init()
        }
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
      this.emit('resized')
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
   * Следующий слайд (или страница при perPage > 1)
   */
  next(): this {
    if (!this._isEnabled || !this._isVisible) return this
    
    if (this.engine.canScrollNext()) {
      // При perPage > 1 листаем на slidesPerGroup слайдов, иначе на perPage
      const step = this.options.slidesPerGroup ?? 1
      
      // Просто вызываем scrollBy - LoopModule сам обработает через beforeTransitionStart
      this.engine.scrollBy(step)
    }
    return this
  }

  /**
   * Предыдущий слайд (или страница при perPage > 1)
   */
  prev(): this {
    if (!this._isEnabled || !this._isVisible) return this
    if (this.engine.canScrollPrev()) {
      // При perPage > 1 листаем на slidesPerGroup слайдов, иначе на perPage
      const step = this.options.slidesPerGroup ?? 1
      
      // Просто вызываем scrollBy - LoopModule сам обработает через beforeTransitionStart
      this.engine.scrollBy(-step)
    }
    return this
  }

  /**
   * Переход к слайду по индексу
   * @param index - индекс слайда (0-based)
   * @param instant - мгновенный переход без анимации
   */
  scrollTo(index: number, instant = false): this {
    if (!this._isEnabled || !this._isVisible) return this
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

    // Вызываем onResize на модулях ДО engine.update (для breakpoints)
    this.modules.forEach((module) => {
      module.onResize?.()
    })

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

    this.emit('refresh')
    return this
  }

  /**
   * Обновить опции слайдера динамически (без пересоздания)
   * @param newOptions - новые опции для применения
   */
  updateOptions(newOptions: Partial<TvistOptions>): this {
    const oldOptions = { ...this.options }
    
    // Обработка изменения breakpoints
    if (newOptions.breakpoints !== undefined || newOptions.breakpointsBase !== undefined) {
      // Если есть _originalOptions, восстанавливаем базовые опции
      if (this._originalOptions) {
        // Восстанавливаем базовые опции (без breakpoints)
        const baseOptions = cloneOptions(this._originalOptions as Record<string, unknown>) as TvistOptions
        delete baseOptions.breakpoints
        delete baseOptions.on
        
        // Применяем базовые опции
        Object.keys(this.options).forEach(key => {
          if (key !== 'breakpoints' && key !== 'on') {
            delete (this.options as Record<string, unknown>)[key]
          }
        })
        Object.assign(this.options, baseOptions)
      }
      
      // Применяем новые опции
      Object.assign(this.options, newOptions)
      
      // Обновляем _originalOptions
      const cloned = cloneOptions(this.options as Record<string, unknown>) as TvistOptions
      if (this.options.breakpointsBase) {
        cloned.breakpointsBase = this.options.breakpointsBase
      }
      ;(this as { _originalOptions?: TvistOptions })._originalOptions = cloned

      // Сбрасываем текущий breakpoint в BreakpointsModule чтобы он пересчитался
      const breakpointsModule = this.modules.get('breakpoints')
      if (breakpointsModule instanceof BreakpointsModule) {
        breakpointsModule.resetCurrentBreakpoint()
      }
    } else {
      // Обычный merge для остальных опций
      // Специальная обработка для browserFixes - мерджим вложенный объект
      if (newOptions.browserFixes) {
        this.options.browserFixes = {
          ...this.options.browserFixes,
          ...newOptions.browserFixes,
        }
        // Удаляем из newOptions чтобы не перезаписать при Object.assign
        const { browserFixes: _unused, ...restOptions } = newOptions
        Object.assign(this.options, restOptions)
      } else {
        Object.assign(this.options, newOptions)
      }
    }

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
      newOptions.center !== undefined ||
      newOptions.breakpoints !== undefined ||
      newOptions.breakpointsBase !== undefined

    if (needsRecalculation) {
      this.update()
    }

    // Уведомляем модули об изменении опций
    this.modules.forEach((module) => {
      module.onOptionsUpdate?.(newOptions)
    })

    // Синхронизируем модули с новыми опциями
    this.syncModules()

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
    this._manualEnabledChange = true // Отмечаем ручное изменение
    this._isTogglingEnabled = true // Предотвращаем применение брейкпоинтов
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

    this._isTogglingEnabled = false // Разрешаем применение брейкпоинтов
    this.emit('disabled', this)
    return this
  }

  /**
   * Включить слайдер (восстановить функциональность)
   */
  enable(): this {
    if (this._isEnabled) return this

    this._isEnabled = true
    this._manualEnabledChange = true // Отмечаем ручное изменение
    this._isTogglingEnabled = true // Предотвращаем применение брейкпоинтов
    this.root.classList.remove(TVIST_CLASSES.disabled)

    // Переинициализируем модули (кроме breakpoints - он уже работает)
    Tvist.MODULES.forEach((ModuleClass, name) => {
      if (name === 'breakpoints') return
      if (this.modules.has(name)) return
      
      try {
        const module = new ModuleClass(this, this.options)
        if (module.shouldBeActive?.() === false) return
        this.modules.set(name, module)
        module.init()
      } catch (error) {
        console.error(`Tvist: Failed to initialize module "${name}":`, error)
      }
    })

    // Пересчитываем размеры и позиции
    this.update()

    this._isTogglingEnabled = false // Разрешаем применение брейкпоинтов
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
   * Проверить и сбросить флаг ручного изменения enabled
   * Используется в BreakpointsModule для принудительного применения брейкпоинта
   */
  checkAndResetManualEnabledChange(): boolean {
    const hasChanged = this._manualEnabledChange
    this._manualEnabledChange = false
    return hasChanged
  }

  /**
   * Проверить, происходит ли сейчас переключение enabled
   * Используется в BreakpointsModule для предотвращения применения брейкпоинтов
   */
  get isTogglingEnabled(): boolean {
    return this._isTogglingEnabled
  }

  /**
   * Уничтожить экземпляр и очистить ресурсы
   */
  destroy(): this {
    this.emit('beforeDestroy', this)
    this.root.classList.add(TVIST_CLASSES.destroyed)
    this.container.removeEventListener('click', this.slideClickHandler)
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

    // Сбрасываем ссылку на инстанс в root (только если это ещё наш инстанс)
    const rootEl = this.root as TvistRootElement
    if (rootEl.tvistInstance === this) {
      rootEl.tvistInstance = null
    }

    return this
  }

  /**
   * Получить модуль по имени
   */
  getModule<T extends Module>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined
  }

  /**
   * Удалить модуль из реестра (для модулей, которые отключаются через updateOptions).
   * @internal
   */
  removeModule(name: string): void {
    this.modules.delete(name)
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
   * Проставляет data-tvist-slide-index слайдам по порядку в DOM.
   */
  private updateSlideIndices(): void {
    this._slides.forEach((el, index) => {
      el.setAttribute('data-tvist-slide-index', String(index))
    })
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

  /**
   * Получить публичное API autoplay модуля
   */
  get autoplay() {
    const module = this.modules.get('autoplay') as AutoplayModuleAPI | undefined
    if (module && typeof module.getAutoplay === 'function') {
      return module.getAutoplay()
    }
    return undefined
  }

  /**
   * Получить публичное API video модуля
   */
  get video() {
    const module = this.modules.get('video') as VideoModuleAPI | undefined
    if (module && typeof module.getVideo === 'function') {
      return module.getVideo()
    }
    return undefined
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
    this.on('slideChangeStart', (index: number) => {
      if (target.activeIndex !== index) {
        target.scrollTo(index)
      }
    })

    // 2. Когда скроллится целевой -> скроллим этот
    target.on('slideChangeStart', (index: number) => {
      if (this.activeIndex !== index) {
        this.scrollTo(index)
      }
    })

    return this
  }

  // ==================== СТАТИЧЕСКИЕ МЕТОДЫ ====================

  /**
   * Зарегистрировать модуль.
   * Безопасно вызывать до загрузки core — модули попадут в глобальную очередь
   * и будут зарегистрированы автоматически при инициализации Tvist.
   */
  static registerModule(name: string, ModuleClass: ModuleConstructor): void {
    if (Tvist.MODULES.has(name)) {
      console.warn(`Tvist: Module "${name}" is already registered`)
      return
    }
    Tvist.MODULES.set(name, ModuleClass)
  }

  /**
   * Вычитывает глобальную очередь модулей (window.__tvistV{N}Queue),
   * которые были зарегистрированы до загрузки core-бандла.
   * @internal
   */
  private static flushModuleQueue(): void {
    if (typeof window === 'undefined') return
    const major = parseInt(pkg.version.split('.')[0] ?? '0', 10) || 0
    const queueKey = `__tvistV${major}Queue`
    const win = window as unknown as Record<string, unknown>
    const queue = win[queueKey] as [string, ModuleConstructor][] | undefined
    if (!Array.isArray(queue) || queue.length === 0) return
    queue.forEach(([name, ModuleClass]) => {
      Tvist.registerModule(name, ModuleClass)
    })
    // Очищаем очередь, чтобы повторный вызов не задвоил регистрацию
    win[queueKey] = []
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
