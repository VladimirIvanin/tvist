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

/**
 * Проверяет, виден ли элемент через CSS (display, visibility)
 * Проверяет элемент и всех его родителей до document.body
 */
function isElementVisibleCSS(element: HTMLElement): boolean {
  let current: HTMLElement | null = element
  
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    
    // Проверяем display: none
    if (style.display === 'none') {
      return false
    }
    
    // Проверяем visibility: hidden
    if (style.visibility === 'hidden') {
      return false
    }
    
    // Проверяем opacity: 0 (опционально, можно считать видимым)
    // if (parseFloat(style.opacity) === 0) {
    //   return false
    // }
    
    current = current.parentElement
  }
  
  return true
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

  /** Интервал для проверки CSS видимости (fallback для display:none) */
  private cssCheckInterval: number | null = null

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
    this.startCSSCheck()
  }

  override destroy(): void {
    this.stopObserver()
    this.stopMutationObserver()
    this.stopCSSCheck()
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
        this.startCSSCheck()
      }
      // Если visibility был включен, а теперь выключен
      else if (wasActive && !isNowActive) {
        this.stopObserver()
        this.stopMutationObserver()
        this.stopCSSCheck()
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
          
          // Дополнительно проверяем CSS видимость
          const isCSSVisible = isElementVisibleCSS(this.tvist.root)
          
          const newVisibility = isIntersecting && isCSSVisible
          
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
   * Проверка видимости (вынесено в отдельный метод)
   */
  private checkVisibility(): void {
    const isCSSVisible = isElementVisibleCSS(this.tvist.root)
    
    // Если CSS видимость изменилась
    if (isCSSVisible !== this.isVisible) {
      this.isVisible = isCSSVisible
      this.handleVisibilityChange(isCSSVisible)
    }
  }

  /**
   * Запуск периодической проверки CSS видимости
   * IntersectionObserver не реагирует на display:none, поэтому нужен fallback
   * MutationObserver может пропустить изменения через JS, поэтому оставляем интервал
   */
  private startCSSCheck(): void {
    this.stopCSSCheck()

    // Проверяем каждые 500ms (fallback если MutationObserver пропустил)
    this.cssCheckInterval = window.setInterval(() => {
      this.checkVisibility()
    }, 500)
  }

  /**
   * Остановка проверки CSS видимости
   */
  private stopCSSCheck(): void {
    if (this.cssCheckInterval !== null) {
      window.clearInterval(this.cssCheckInterval)
      this.cssCheckInterval = null
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
        if (isCSSVisible !== this.isVisible) {
          this.isVisible = isCSSVisible
          this.handleVisibilityChange(isCSSVisible)
        }
        return this.isVisible
      }
    }
  }
}
