/**
 * Visibility Module
 * 
 * Возможности:
 * - Отслеживание видимости слайдера (display: none, visibility: hidden, родители)
 * - Автоматическая приостановка autoplay/marquee при скрытии
 * - Автоматическое возобновление при появлении
 * - Использует IntersectionObserver для эффективного отслеживания
 * - Проверка CSS свойств display и visibility у элемента и всех родителей
 * 
 * Опция visibility принимает:
 * - false / undefined — выключен
 * - true — включен с дефолтными настройками
 * - VisibilityOptions — полный контроль
 */

import { Module } from '../Module'
import type { Tvist } from '../../core/Tvist'
import type {
  TvistOptions,
  VisibilityOptions,
  AutoplayModuleAPI,
  MarqueeModuleAPI
} from '../../core/types'

/** Дефолтные значения для VisibilityOptions */
const VISIBILITY_DEFAULTS: Required<VisibilityOptions> = {
  pauseAutoplay: true,
  pauseMarquee: true,
  threshold: 0, // Считаем видимым если хоть что-то видно
}

/**
 * Нормализация visibility опций в объект VisibilityOptions.
 * Возвращает null если visibility выключен.
 */
function normalizeVisibility(raw: TvistOptions['visibility']): Required<VisibilityOptions> | null {
  if (raw === false || raw === undefined) return null

  if (raw === true) {
    return { ...VISIBILITY_DEFAULTS }
  }

  // Object form
  return {
    pauseAutoplay: raw.pauseAutoplay ?? VISIBILITY_DEFAULTS.pauseAutoplay,
    pauseMarquee: raw.pauseMarquee ?? VISIBILITY_DEFAULTS.pauseMarquee,
    threshold: raw.threshold ?? VISIBILITY_DEFAULTS.threshold,
  }
}

/** Элемент с опциональным checkVisibility (браузерный API, не везде есть) */
type ElementWithCheckVisibility = Element & {
  checkVisibility?(options?: { visibilityProperty?: boolean }): boolean
}

/**
 * Проверяет, виден ли элемент через CSS (display, visibility, content-visibility).
 * Использует Element.checkVisibility() при наличии (см. https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility),
 * иначе — рекурсивный обход от элемента до document.body.
 */
function isElementVisibleCSS(element: HTMLElement): boolean {
  const el = element as ElementWithCheckVisibility
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ visibilityProperty: true })
  }

  // Fallback: обход элемента и всех родителей до document.body
  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    if (style.display === 'none') return false
    if (style.visibility === 'hidden') return false
    current = current.parentElement
  }
  return true
}

/** Учитывает видимость вкладки (скрытая вкладка = не видим). */
function isPageVisible(): boolean {
  return typeof document.visibilityState !== 'undefined'
    ? document.visibilityState === 'visible'
    : !(document as Document & { hidden?: boolean }).hidden
}

export class VisibilityModule extends Module {
  readonly name = 'visibility'

  /** Нормализованные опции visibility */
  private config: Required<VisibilityOptions> | null = null

  /** IntersectionObserver для отслеживания видимости */
  private intersectionObserver: IntersectionObserver | null = null

  /** Текущее состояние видимости */
  private isVisible = true

  /** Флаг: был ли autoplay запущен до паузы */
  private autoplayWasRunning = false

  /** Флаг: был ли marquee запущен до паузы */
  private marqueeWasRunning = false

  /** MutationObserver для отслеживания изменений style атрибута */
  private mutationObserver: MutationObserver | null = null

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
    this.config = normalizeVisibility(this.options.visibility)
  }

  override init(): void {
    if (!this.shouldBeActive()) return

    this.setupObserver()
    this.setupMutationObserver()
  }

  override destroy(): void {
    this.stopObserver()
    this.stopMutationObserver()
    // Восстанавливаем видимость при уничтожении модуля
    this.tvist._isVisible = true
  }

  public override shouldBeActive(): boolean {
    return this.config !== null
  }

  /**
   * Обработка обновления опций
   */
  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.visibility !== undefined) {
      const wasActive = this.config !== null

      // Перенормализуем
      this.config = normalizeVisibility(newOptions.visibility)

      const isNowActive = this.config !== null

      // Если visibility был выключен, а теперь включен
      if (!wasActive && isNowActive) {
        this.setupObserver()
        this.setupMutationObserver()
      }
      // Если visibility был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stopObserver()
        this.stopMutationObserver()
        // Восстанавливаем видимость
        this.tvist._isVisible = true
        // Возобновляем модули если они были приостановлены
        if (!this.isVisible) {
          this.resumeModules()
        }
        // Удаляем модуль из списка активных модулей
        this.tvist.removeModule(this.name)
      }
    }
  }

  /**
   * Настройка IntersectionObserver
   */
  private setupObserver(): void {
    if (!this.config) return

    // Создаем observer с порогом из конфига
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Проверяем видимость через IntersectionObserver
          const isIntersecting = entry.isIntersecting
          // Дополнительно проверяем CSS видимость и видимость вкладки
          const isCSSVisible = isElementVisibleCSS(this.tvist.root)
          const newVisibility = isIntersecting && isCSSVisible && isPageVisible()
          
          if (newVisibility !== this.isVisible) {
            this.isVisible = newVisibility
            this.handleVisibilityChange(newVisibility)
          }
        })
      },
      {
        threshold: this.config.threshold,
      }
    )

    this.intersectionObserver.observe(this.tvist.root)
  }

  /**
   * Остановка IntersectionObserver
   */
  private stopObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
  }

  /**
   * Настройка MutationObserver для отслеживания изменений style
   */
  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.checkVisibility()
    })

    // Отслеживаем изменения атрибута style у root элемента и его родителей
    let element: HTMLElement | null = this.tvist.root
    while (element && element !== document.body) {
      this.mutationObserver.observe(element, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      })
      element = element.parentElement
    }
  }

  /**
   * Остановка MutationObserver
   */
  private stopMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }
  }

  /**
   * Проверка видимости (CSS + видимость вкладки).
   * Вызывается из MutationObserver при изменении style/class у root и родителей.
   */
  private checkVisibility(): void {
    const isCSSVisible = isElementVisibleCSS(this.tvist.root)
    const visible = isCSSVisible && isPageVisible()
    if (visible !== this.isVisible) {
      this.isVisible = visible
      this.handleVisibilityChange(visible)
    }
  }

  /**
   * Обработка изменения видимости
   */
  private handleVisibilityChange(isVisible: boolean): void {
    if (isVisible) {
      // Разрешаем переключение слайдов
      this.tvist._isVisible = true
      this.emit('sliderVisible')
      this.resumeModules()
    } else {
      // Блокируем переключение слайдов
      this.tvist._isVisible = false
      this.emit('sliderHidden')
      this.pauseModules()
    }
  }

  /**
   * Приостановка модулей (autoplay, marquee)
   */
  private pauseModules(): void {
    if (!this.config) return

    // Приостанавливаем autoplay
    if (this.config.pauseAutoplay) {
      const autoplayModule = this.tvist.getModule('autoplay') as AutoplayModuleAPI | undefined
      const autoplay = autoplayModule?.getAutoplay()
      if (autoplay?.isRunning()) {
        this.autoplayWasRunning = true
        autoplay.pause()
      }
    }

    // Останавливаем marquee (stop вместо pause для полной остановки RAF)
    if (this.config.pauseMarquee) {
      const marqueeModule = this.tvist.getModule('marquee') as MarqueeModuleAPI | undefined
      const marquee = marqueeModule?.getMarquee()
      if (marquee?.isRunning()) {
        this.marqueeWasRunning = true
        marquee.stop()
      }
    }
  }

  /**
   * Возобновление модулей (autoplay, marquee)
   */
  private resumeModules(): void {
    if (!this.config) return

    // Возобновляем autoplay если он был запущен
    if (this.config.pauseAutoplay && this.autoplayWasRunning) {
      const autoplayModule = this.tvist.getModule('autoplay') as AutoplayModuleAPI | undefined
      const autoplay = autoplayModule?.getAutoplay()
      if (autoplay) {
        autoplay.resume()
      }
      this.autoplayWasRunning = false
    }

    // Запускаем marquee заново если он был запущен
    if (this.config.pauseMarquee && this.marqueeWasRunning) {
      const marqueeModule = this.tvist.getModule('marquee') as MarqueeModuleAPI | undefined
      const marquee = marqueeModule?.getMarquee()
      if (marquee) {
        marquee.start()
      }
      this.marqueeWasRunning = false
    }
  }

  /**
   * Публичное API
   */
  getVisibility() {
    return {
      isVisible: () => this.isVisible,
      check: () => {
        const isCSSVisible = isElementVisibleCSS(this.tvist.root)
        const visible = isCSSVisible && isPageVisible()
        if (visible !== this.isVisible) {
          this.isVisible = visible
          this.handleVisibilityChange(visible)
        }
        return this.isVisible
      }
    }
  }
}
