/**
 * Tvist - главный класс слайдера
 * Точка входа для пользователя
 */

import pkg from '../../package.json' with { type: 'json' }
import { Engine } from './Engine'
import { EventEmitter } from './EventEmitter'
import { getElement, cloneOptions } from '../utils/dom'
import { getSlidesInTvistRoot } from './tvistSlides'
import { TVIST_CLASSES } from './constants'
import type {
  TvistOptions,
  TvistDestroyOptions,
  AutoplayModuleAPI,
  VideoModuleAPI,
} from './types'
import type { Module, ModuleConstructor } from '../modules/Module'
import { BreakpointsModule } from '../modules/breakpoints/BreakpointsModule'
import { throttle } from './Animator'
import { applyInitialBreakpoint } from '../utils/breakpoints'

/** Root-элемент слайдера с опциональной ссылкой на инстанс (для переиспользования одного root) */
export interface TvistRootElement extends HTMLElement {
  tvistInstance?: Tvist | null
}

/**
 * События, эмит которых при инициализации происходит до того, как снаружи можно вызвать .on().
 * Для поздней подписки воспроизводится последний emit (аргументы хранятся в replayLastArgs).
 */
const CATCH_UP_EVENTS = new Set<string>([
  'created',
  'refresh',
  'setTranslate',
  'progress',
  'navigation:mounted',
  'pagination:mounted',
  'breakpoint',
])

const DEFAULT_OPTIONS: Partial<TvistOptions> = {
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
  browserFixes: { firefoxImageDecoding: true },
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
  _originalOptions?: TvistOptions

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

  /** Последние аргументы для catch-up подписок (см. CATCH_UP_EVENTS) */
  private replayLastArgs = new Map<string, unknown[]>()

  /** Последний из эмитов lock/unlock — чтобы не отдать устаревший catch-up для lock после unlock */
  private lastLockEdge: 'lock' | 'unlock' | null = null

  private _isDestroyed = false

  /**
   * Создать экземпляр Tvist
   * @param target - селектор или HTMLElement
   * @param options - опции слайдера
   */
  constructor(
    target: string | HTMLElement,
    options: TvistOptions = {}
  ) {
    this.id = Tvist.generateId()
    this.root = this.initRoot(target)
    this.container = this.findContainer()
    this._slides = getSlidesInTvistRoot(this.container, this.root)

    if (this.slides.length === 0) {
      console.warn('Tvist: no slides found')
    }

    this.options = this.mergeOptions(options)
    // Сохраняем оригинальные опции ДО применения breakpoints — нужно для BreakpointsModule
    this.saveOriginalOptions()
    // Применяем breakpoints ДО создания Engine (если есть)
    applyInitialBreakpoint(this.root, this.options)
    // Индексы слайдов для стилизации и идентификации (в т.ч. для loop)
    this.updateSlideIndices()
    this._isEnabled = this.options.enabled !== false
    this.events = new EventEmitter()
    this.applyInitialClasses()
    this.registerOptionHandlers()

    this.engine = new Engine(this, this.options)
    // Вычитываем модули, зарегистрированные до загрузки core-бандла
    Tvist.flushModuleQueue()
    this.initModules()
    this.setupResizeListener()
    this.performFirstRender()
  }

  private initRoot(target: string | HTMLElement): HTMLElement {
    const root = getElement(target)
    const rootEl = root as TvistRootElement
    if (rootEl.tvistInstance && typeof rootEl.tvistInstance.destroy === 'function') {
      rootEl.tvistInstance.destroy({ destroyNested: true })
    }
    rootEl.tvistInstance = this
    return root
  }

  private findContainer(): HTMLElement {
    const selector = `.${TVIST_CLASSES.container}`
    const el = this.root.querySelector<HTMLElement>(selector)
    if (!el) {
      throw new Error(`Tvist: container "${selector}" not found inside root element`)
    }
    return el
  }

  private mergeOptions(options: TvistOptions): TvistOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      browserFixes: {
        ...DEFAULT_OPTIONS.browserFixes,
        ...options.browserFixes,
      },
    }
  }

  /** Сохраняет копию опций до применения breakpoints — нужно для BreakpointsModule чтобы восстанавливать базовые опции */
  private saveOriginalOptions(): void {
    if (this.options.breakpoints && Object.keys(this.options.breakpoints).length > 0) {
      const cloned = cloneOptions(this.options as Record<string, unknown>) as TvistOptions
      if (this.options.breakpointsBase) {
        cloned.breakpointsBase = this.options.breakpointsBase
      }
      this._originalOptions = cloned
    }
  }

  private applyInitialClasses(): void {
    this.updateDirectionClass()
    if (!this._isEnabled) {
      this.root.classList.add(TVIST_CLASSES.disabled)
    }
  }

  /** Регистрирует обработчики событий из options.on */
  private registerOptionHandlers(): void {
    if (this.options.on) {
      Object.entries(this.options.on).forEach(([event, handler]) => {
        if (handler) {
          this.events.on(event, handler)
        }
      })
    }
  }

  /**
   * Первый рендер: если слайдер включён — update(), если отключён — очищаем стили,
   * которые мог установить Engine при конструировании.
   */
  private performFirstRender(): void {
    if (this._isEnabled) {
      this.update()
    } else {
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
   * Один раз вызывает handler с последним известным событием, если подписка позже первичного emit.
   * Обработчики из options.on вешаются на EventEmitter напрямую и сюда не попадают — без двойного вызова.
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private invokeCatchUpForNewListener(event: string, handler: (...args: any[]) => void): void {
    if (this._isDestroyed) return

    if (event === 'lock') {
      if (this.lastLockEdge === 'lock') {
        try {
          handler()
        } catch (error) {
          console.error(`Error in event handler (catch-up) for "lock":`, error)
        }
      }
      return
    }
    if (event === 'unlock') {
      if (this.lastLockEdge === 'unlock') {
        try {
          handler()
        } catch (error) {
          console.error(`Error in event handler (catch-up) for "unlock":`, error)
        }
      }
      return
    }

    if (!CATCH_UP_EVENTS.has(event)) return
    const args = this.replayLastArgs.get(event)
    if (!args) return

    try {
      handler(...args)
    } catch (error) {
      console.error(`Error in event handler (catch-up) for "${event}":`, error)
    }
  }

  private hasCatchUpPayload(event: string): boolean {
    if (this._isDestroyed) return false
    if (event === 'lock') return this.lastLockEdge === 'lock'
    if (event === 'unlock') return this.lastLockEdge === 'unlock'
    return CATCH_UP_EVENTS.has(event) && this.replayLastArgs.has(event)
  }

  /**
   * Создаёт модуль, проверяет shouldBeActive, добавляет в map и инициализирует.
   * @returns true если модуль был создан и инициализирован
   */
  private tryInitModule(name: string, ModuleClass: ModuleConstructor): boolean {
    try {
      const module = new ModuleClass(this, this.options)
      if (module.shouldBeActive?.() === false) return false
      this.modules.set(name, module)
      module.init()
      return true
    } catch (error) {
      console.error(`Tvist: Failed to initialize module "${name}":`, error)
      return false
    }
  }

  /**
   * Инициализация всех зарегистрированных модулей
   */
  private initModules(): void {
    Tvist.MODULES.forEach((ModuleClass, name) => {
      // Breakpoints должен работать всегда, остальные — только при включённом слайдере
      if (!this._isEnabled && name !== 'breakpoints') return
      this.tryInitModule(name, ModuleClass)
    })
  }

  /**
   * Синхронизирует активные модули с текущими опциями:
   * - уничтожает модули, которые стали неактивными (shouldBeActive() = false)
   * - инициализирует модули, которые стали активными (shouldBeActive() = true)
   * Вызывается при смене брейкпоинта и из updateOptions().
   * @internal
   */
  syncModules(destroyOnly = false): void {
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

    if (destroyOnly) return

    Tvist.MODULES.forEach((ModuleClass, name) => {
      if (this.modules.has(name)) return
      this.tryInitModule(name, ModuleClass)
    })
  }

  /** Обновляет CSS-класс направления (vertical/horizontal) на root */
  private updateDirectionClass(): void {
    this.root.classList.toggle(TVIST_CLASSES.vertical, this.options.direction === 'vertical')
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

    this.updateDirectionClass()
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
      this.applyBreakpointsOptionsUpdate(newOptions)
    } else {
      this.applySimpleOptionsUpdate(newOptions)
    }

    // Обработка изменения direction
    if (newOptions.direction !== undefined && newOptions.direction !== oldOptions.direction) {
      this.updateDirectionClass()
    }

    // Обработка изменения on (обработчики событий)
    if (newOptions.on) {
      this.updateEventHandlers(oldOptions.on, newOptions.on)
    }

    // Обработка изменения peek
    if (newOptions.peek !== undefined || newOptions.peekTrim !== undefined) {
      if (this._isEnabled) {
        this.engine.applyPeek()
      }
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

    if (needsRecalculation && this._isEnabled) {
      this.update()
    } else if (needsRecalculation && !this._isEnabled) {
      // Если слайдер выключен — очищаем стили и обновляем внутренний state Engine без DOM
      this.clearSliderStyles()
      this.engine.updateDisabled()
    }

    // Уведомляем модули об изменении опций
    this.modules.forEach((module) => {
      module.onOptionsUpdate?.(newOptions)
    })

    // Синхронизируем модули с новыми опциями
    // Если слайдер выключен, передаём destroyOnly=true, чтобы новые модули не инициализировались
    this.syncModules(!this._isEnabled)
    this.emit('optionsUpdated', this, newOptions)

    return this
  }

  /** Обновление опций с изменением breakpoints: восстанавливает базовые опции, применяет новые, обновляет _originalOptions */
  private applyBreakpointsOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если есть _originalOptions, восстанавливаем базовые опции (без breakpoints)
    if (this._originalOptions) {
      const baseOptions = cloneOptions(this._originalOptions as Record<string, unknown>) as TvistOptions
      delete baseOptions.breakpoints
      delete baseOptions.on
      
      Object.keys(this.options).forEach(key => {
        if (key !== 'breakpoints' && key !== 'on') {
          delete (this.options as Record<string, unknown>)[key]
        }
      })
      Object.assign(this.options, baseOptions)
    }
    
    Object.assign(this.options, newOptions)
    
    // Обновляем _originalOptions
    const cloned = cloneOptions(this.options as Record<string, unknown>) as TvistOptions
    if (this.options.breakpointsBase) {
      cloned.breakpointsBase = this.options.breakpointsBase
    }
    this._originalOptions = cloned

    // Сбрасываем текущий breakpoint в BreakpointsModule чтобы он пересчитался
    const breakpointsModule = this.modules.get('breakpoints')
    if (breakpointsModule instanceof BreakpointsModule) {
      breakpointsModule.resetCurrentBreakpoint()
    }
  }

  /** Обычный merge опций. Специальная обработка для browserFixes — мерджим вложенный объект отдельно */
  private applySimpleOptionsUpdate(newOptions: Partial<TvistOptions>): void {
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

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  private updateEventHandlers(oldOn?: Record<string, ((...args: any[]) => void) | undefined>, newOn?: Record<string, ((...args: any[]) => void) | undefined>): void {
    if (oldOn) {
      Object.entries(oldOn).forEach(([event, handler]) => {
        if (handler) this.events.off(event, handler)
      })
    }
    if (newOn) {
      Object.entries(newOn).forEach(([event, handler]) => {
        if (handler) this.events.on(event, handler)
      })
    }
  }

  /**
   * Очистить стили и классы состояний слайдера при отключении.
   * Вызывается в disable() и при инициализации с enabled: false.
   */
  private clearSliderStyles(): void {
    this.container.style.transform = ''
    this.container.style.paddingTop = ''
    this.container.style.paddingBottom = ''
    this.container.style.paddingLeft = ''
    this.container.style.paddingRight = ''

    // Убираем все классы состояния с рута которые вешают модули
    this.root.classList.remove(
      TVIST_CLASSES.draggable,
      TVIST_CLASSES.dragging,
      TVIST_CLASSES.singlePage,
      TVIST_CLASSES.nav,
      TVIST_CLASSES.cube,
      TVIST_CLASSES.locked,
      TVIST_CLASSES.vertical
    )

    this.slides.forEach(slide => {
      slide.style.width = ''
      slide.style.height = ''
      slide.style.marginRight = ''
      slide.style.marginBottom = ''

      slide.classList.remove(
        TVIST_CLASSES.slideActive,
        TVIST_CLASSES.slidePrev,
        TVIST_CLASSES.slideNext,
        TVIST_CLASSES.slideVisible,
        TVIST_CLASSES.slideNavActive
      )
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

    Tvist.MODULES.forEach((ModuleClass, name) => {
      if (name === 'breakpoints' || this.modules.has(name)) return
      this.tryInitModule(name, ModuleClass)
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
   * Все вложенные root с классом блока внутри этого слайдера, в порядке «сначала глубокие».
   * `querySelectorAll` даёт обход в глубину сверху вниз; `.reverse()` — уничтожаем с листьев к корню поддерева.
   */
  private nestedTvistRootsDeepestFirst(): TvistRootElement[] {
    const roots = this.root.querySelectorAll<HTMLElement>(
      `.${TVIST_CLASSES.block}`
    )
    return [...roots].reverse() as TvistRootElement[]
  }

  /**
   * `destroy({ destroyNested: true })` для каждого вложенного root с `tvistInstance`.
   */
  private destroyNestedTvists(): void {
    const cascade: TvistDestroyOptions = { destroyNested: true }
    for (const el of this.nestedTvistRootsDeepestFirst()) {
      const nested = el.tvistInstance
      if (nested == null || nested === this) continue
      try {
        nested.destroy(cascade)
      } catch (error) {
        console.error('Tvist: Error destroying nested instance:', error)
      }
    }
  }

  /**
   * Уничтожить экземпляр и очистить ресурсы.
   * Вложенные Tvist по умолчанию **не** уничтожаются — задайте `{ destroyNested: true }`, если нужно снести всё поддерево.
   * Повторный вызов безопасен (no-op).
   */
  destroy(options?: TvistDestroyOptions): this {
    if (this._isDestroyed) return this

    if (options?.destroyNested) {
      this.destroyNestedTvists()
    }

    this._isDestroyed = true

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

    this.replayLastArgs.clear()
    this.lastLockEdge = null

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
    this._slides = getSlidesInTvistRoot(this.container, this.root)
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
    if (this._isDestroyed) return this
    this.invokeCatchUpForNewListener(event, handler)
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
    if (event === 'lock') {
      this.lastLockEdge = 'lock'
    } else if (event === 'unlock') {
      this.lastLockEdge = 'unlock'
    }

    if (CATCH_UP_EVENTS.has(event)) {
      this.replayLastArgs.set(event, args)
    }

    this.events.emit(event, ...args)
    return this
  }

  /**
   * Подписаться на событие один раз
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
  once(event: string, handler: (...args: any[]) => void): this {
    if (this._isDestroyed) return this
    if (this.hasCatchUpPayload(event)) {
      this.invokeCatchUpForNewListener(event, handler)
      return this
    }
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
