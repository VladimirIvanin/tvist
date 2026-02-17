/**
 * SlideStatesModule - управление классами состояний слайдов
 * Применяет BEM-модификаторы: --active, --prev, --next, --visible (tvist-v1__slide--*)
 */

import { Module } from '../Module'
import { TVIST_CLASSES } from '../../core/constants'
import { isFirefox } from '../../utils/browser'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

export class SlideStatesModule extends Module {
  readonly name = 'slide-states'

  // Классы состояний
  private readonly CLASS_ACTIVE = TVIST_CLASSES.slideActive
  private readonly CLASS_PREV = TVIST_CLASSES.slidePrev
  private readonly CLASS_NEXT = TVIST_CLASSES.slideNext
  private readonly CLASS_VISIBLE = TVIST_CLASSES.slideVisible

  // RAF батчинг для updateVisibleClasses
  private visibilityUpdateScheduled = false
  private visibilityRafId: number | null = null

  // Кеш декодированных изображений (WeakMap для автоматической очистки памяти)
  private decodedImages = new WeakMap<HTMLImageElement, boolean>()
  
  // Флаги полностью предзагруженных слайдов (WeakMap для автоматической очистки памяти)
  private preloadedSlides = new WeakMap<HTMLElement, boolean>()

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  override init(): void {
    // Применяем Firefox фикс ко всем изображениям при инициализации
    this.applyFirefoxImageFix()
    
    // Обновляем классы при создании
    this.updateActiveClasses()
    this.updateVisibleClasses()

    // slideChangeStart: обновляем active/prev/next + visible (синхронно)
    this.tvist.on('slideChangeStart', () => {
      this.updateActiveClasses()
      this.updateVisibleClasses()
    })
    // slideChangeEnd: обновляем только visible (финальная позиция после анимации)
    this.tvist.on('slideChangeEnd', () => this.updateVisibleClasses())
    // scroll (каждый тик анимации): обновляем visible через RAF-батчинг для экономии CPU
    this.tvist.on('scroll', () => this.scheduleVisibilityUpdate())
  }

  override onUpdate(): void {
    this.updateActiveClasses()
    this.updateVisibleClasses()
  }

  /**
   * Запланировать обновление видимости через RAF (батчинг).
   * Математический расчёт не вызывает reflow, но RAF гарантирует
   * максимум один пересчёт классов на кадр при частых scroll-событиях.
   */
  private scheduleVisibilityUpdate(): void {
    if (this.visibilityUpdateScheduled) return

    this.visibilityUpdateScheduled = true
    this.visibilityRafId = requestAnimationFrame(() => {
      this.visibilityUpdateScheduled = false
      this.updateVisibleClasses()
    })
  }

  /**
   * Применить Firefox фикс ко всем изображениям в слайдере.
   * Добавляет атрибут decoding="sync" для предотвращения задержки отрисовки.
   */
  private applyFirefoxImageFix(): void {
    const firefoxFix = this.options.browserFixes?.firefoxImageDecoding ?? true
    
    if (!isFirefox || !firefoxFix) {
      return
    }
    
    // Проходим по всем слайдам и добавляем атрибут ко всем изображениям
    this.tvist.slides.forEach((slide) => {
      const images = slide.querySelectorAll<HTMLImageElement>('img')
      images.forEach((img) => {
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'sync')
        }
      })
    })
  }

  /**
   * Предварительное декодирование изображений в слайде.
   * Предотвращает "белые вспышки" при переходе между слайдами.
   * Поддерживает <img> и <picture> элементы. Использует кеш.
   */
  private async preloadSlideImages(slide: HTMLElement): Promise<void> {
    // Если слайд уже полностью предзагружен, пропускаем
    if (this.preloadedSlides.has(slide)) {
      return
    }
    
    const images = slide.querySelectorAll<HTMLImageElement>('img')
    const decodePromises: Promise<void>[] = []
    
    // Получаем настройку для Firefox фикса (по умолчанию true)
    const firefoxFix = this.options.browserFixes?.firefoxImageDecoding ?? true
    
    images.forEach((img) => {
      // Декодируем только загруженные и ещё не декодированные изображения
      if (img.complete && img.naturalWidth > 0 && !this.decodedImages.has(img)) {
        if ('decode' in img) {
          decodePromises.push(
            img
              .decode()
              .then(() => {
                this.decodedImages.set(img, true)
              })
              .catch(() => undefined) // Игнорируем ошибки
          )
        }
      }
    })

    await Promise.all(decodePromises).catch(() => undefined)
    
    // Помечаем слайд как полностью предзагруженный, если все изображения обработаны
    // (либо декодированы, либо не требуют декодирования)
    this.preloadedSlides.set(slide, true)
  }

  /**
   * Обновление классов активного, предыдущего и следующего слайдов
   */
  private updateActiveClasses(): void {
    const slides = this.tvist.slides
    const activeIndex = this.tvist.activeIndex
    const activeSlide = slides[activeIndex]

    if (!activeSlide) return
    
    // Массив для сбора промисов декодирования
    const preloadPromises: Promise<void>[] = []

    // Режим Loop: по атрибуту на слайде (после инита Loop) или по опции (до проставления атрибутов)
    const activeAttr = activeSlide.getAttribute('data-tvist-slide-index')
    const isLoop = activeAttr !== null || this.options.loop === true

    let activeLogicalIndex = activeIndex
    const originalCount = slides.length

    if (activeAttr !== null) {
      activeLogicalIndex = parseInt(activeAttr, 10)
      
      // В loop режиме все слайды являются оригинальными (клоны не создаются)
      // originalCount = slides.length уже установлен выше
    }

    // Вычисляем целевые логические индексы для prev/next
    let prevTargetIndex = activeLogicalIndex - 1
    let nextTargetIndex = activeLogicalIndex + 1

    if (isLoop) {
      // В loop режиме индексы циклические относительно originalCount
      prevTargetIndex = (activeLogicalIndex - 1 + originalCount) % originalCount
      nextTargetIndex = (activeLogicalIndex + 1) % originalCount
    }

    slides.forEach((slide, index) => {
      let currentLogicalIndex = index

      // В режиме loop используем логический индекс из атрибута
      if (isLoop) {
        const attr = slide.getAttribute('data-tvist-slide-index')
        if (attr !== null) {
          currentLogicalIndex = parseInt(attr, 10)
        }
      }

      // Проверяем совпадение
      const isActive = currentLogicalIndex === activeLogicalIndex
      let isPrev = false
      let isNext = false

      if (isLoop) {
        // В loop режиме сравниваем логические индексы (включая клоны)
        isPrev = currentLogicalIndex === prevTargetIndex
        isNext = currentLogicalIndex === nextTargetIndex
      } else {
        // В обычном режиме сравниваем физические индексы
        isPrev = index === activeIndex - 1
        isNext = index === activeIndex + 1
      }

      // Классы active/prev/next проставляются независимо от видимости
      // (даже если слайд находится вне viewport)
      this.toggleClass(slide, this.CLASS_ACTIVE, isActive)
      this.toggleClass(slide, this.CLASS_PREV, isPrev)
      this.toggleClass(slide, this.CLASS_NEXT, isNext)

      // Собираем промисы декодирования для prev/next слайдов
      if (isPrev || isNext) {
        preloadPromises.push(this.preloadSlideImages(slide))
      }
    })
    
    // Запускаем декодирование в фоне (не блокируем основной поток)
    // Промисы выполнятся асинхронно, но мы не ждём их завершения
    if (preloadPromises.length > 0) {
      Promise.all(preloadPromises).catch(() => undefined)
    }
  }

  /**
   * Обновление классов видимости слайдов.
   * Использует математический расчёт через Engine.getVisibleSlides() вместо
   * getBoundingClientRect(), что исключает forced reflow во время анимации.
   */
  private updateVisibleClasses(): void {
    const slides = this.tvist.slides
    const visibleFlags = this.tvist.engine.getVisibleSlides()

    slides.forEach((slide, index) => {
      const isVisible = visibleFlags[index] ?? false

      const hadVisible = slide.classList.contains(this.CLASS_VISIBLE)
      if (isVisible && !hadVisible) {
        slide.classList.add(this.CLASS_VISIBLE)
        this.tvist.emit('visible', slide, index)
      } else if (!isVisible && hadVisible) {
        slide.classList.remove(this.CLASS_VISIBLE)
        this.tvist.emit('hidden', slide, index)
      }
    })
  }

  /**
   * Переключение класса элемента
   */
  private toggleClass(
    element: HTMLElement,
    className: string,
    condition: boolean
  ): void {
    if (condition && !element.classList.contains(className)) {
      element.classList.add(className)
    } else if (!condition && element.classList.contains(className)) {
      element.classList.remove(className)
    }
  }

  override destroy(): void {
    if (this.visibilityRafId !== null) {
      cancelAnimationFrame(this.visibilityRafId)
      this.visibilityRafId = null
    }

    this.tvist.slides.forEach((slide) => {
      slide.classList.remove(
        this.CLASS_ACTIVE,
        this.CLASS_PREV,
        this.CLASS_NEXT,
        this.CLASS_VISIBLE
      )
    })
    
    // decodedImages и preloadedSlides (WeakMap) очистятся автоматически при удалении элементов
  }
}
