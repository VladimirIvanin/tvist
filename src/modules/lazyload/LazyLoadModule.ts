/**
 * LazyLoad Module
 * 
 * Возможности:
 * - Ленивая загрузка изображений в слайдах
 * - Предзагрузка соседних слайдов
 * - Поддержка srcset
 * - Spinner/loader во время загрузки
 * - События загрузки изображений
 */

import { Module } from '../Module'
import { addClass, removeClass, children } from '../../utils/dom'
import { TVIST_CLASSES } from '../../core/constants'
import type { Tvist } from '../../core/Tvist'
import type { TvistOptions } from '../../core/types'

/**
 * Селектор для поиска изображений с lazy loading
 * Ищет img с data-src или data-srcset
 */
const IMAGE_SELECTOR = 'img[data-src], img[data-srcset]'

/**
 * Data-атрибуты для изображений
 */
const SRC_DATA_ATTRIBUTE = 'data-src'
const SRCSET_DATA_ATTRIBUTE = 'data-srcset'

/**
 * CSS класс для индикатора загрузки
 */
const SPINNER_CLASS = `${TVIST_CLASSES.block}__spinner`

/**
 * CSS класс для слайда в процессе загрузки
 */
const LOADING_CLASS = `${TVIST_CLASSES.block}__slide--loading`

/**
 * Запись о ленивом изображении
 * [изображение, индекс слайда, spinner элемент]
 */
type LazyLoadEntry = [HTMLImageElement, number, HTMLSpanElement]

export class LazyLoadModule extends Module {
  readonly name = 'lazyload'

  /**
   * Очередь изображений для загрузки
   */
  private entries: LazyLoadEntry[] = []

  /**
   * Количество слайдов для предзагрузки
   */
  private preloadPrevNext: number

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)

    // Определяем количество слайдов для предзагрузки
    const lazy = this.options.lazy
    this.preloadPrevNext = 
      typeof lazy === 'object' && lazy.preloadPrevNext !== undefined
        ? lazy.preloadPrevNext
        : 1
  }

  override init(): void {
    if (!this.shouldBeActive()) {
      return
    }

    this.register()
    this.setupEvents()
    this.check()
  }

  override destroy(): void {
    this.entries = []
    this.removeSpinners()
  }

  public override shouldBeActive(): boolean {
    // Модуль активен только если lazy явно включен (true или объект с настройками)
    return this.options.lazy !== false && this.options.lazy !== undefined && this.options.lazy !== null
  }

  override onUpdate(): void {
    if (!this.shouldBeActive()) return
    
    // При обновлении слайдера регистрируем новые изображения
    this.register()
    this.check()
  }

  override onSlideChange(): void {
    if (!this.shouldBeActive()) return
    
    // При смене слайда проверяем, что нужно загрузить
    this.check()
  }

  override onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если изменились настройки lazy
    if (newOptions.lazy !== undefined) {
      const lazy = newOptions.lazy
      this.preloadPrevNext = 
        typeof lazy === 'object' && lazy.preloadPrevNext !== undefined
          ? lazy.preloadPrevNext
          : 1

      const wasActive = this.shouldBeActive()
      
      // Если lazy был выключен, а теперь включен
      if (!wasActive && newOptions.lazy !== false && newOptions.lazy !== undefined) {
        this.register()
        this.setupEvents()
        this.check()
      }
      // Если lazy был включен, а теперь выключен
      else if (wasActive && (newOptions.lazy === false || newOptions.lazy === undefined)) {
        this.destroy()
      }
    }
  }

  /**
   * Регистрация изображений для ленивой загрузки
   */
  private register(): void {
    const slides = this.tvist.slides

    slides.forEach((slide, index) => {
      const images = children(slide).filter(
        (el): el is HTMLImageElement => 
          el.matches(IMAGE_SELECTOR)
      )

      images.forEach(img => {
        const dataSrc = img.getAttribute(SRC_DATA_ATTRIBUTE)
        const dataSrcset = img.getAttribute(SRCSET_DATA_ATTRIBUTE)

        // Проверяем, нужно ли грузить это изображение
        // Изображение нужно загрузить, если есть data-src или data-srcset
        if (dataSrc || dataSrcset) {
          // Проверяем, не зарегистрировано ли уже
          const alreadyRegistered = this.entries.some(([registeredImg]) => registeredImg === img)
          if (alreadyRegistered) return

          // Создаём или находим spinner
          const parent = img.parentElement
          if (!parent) return

          let spinner = parent.querySelector<HTMLSpanElement>(`.${SPINNER_CLASS}`)
          if (!spinner) {
            spinner = document.createElement('span')
            spinner.className = SPINNER_CLASS
            parent.appendChild(spinner)
          }

          // Добавляем в очередь
          this.entries.push([img, index, spinner])

          // Скрываем изображение, если у него нет src
          if (!img.src) {
            img.style.display = 'none'
          }
        }
      })
    })
  }

  /**
   * Настройка событий
   */
  private setupEvents(): void {
    // Проверяем изображения при прокрутке, смене слайда
    this.on('scroll', () => this.check())
    this.on('slideChangeStart', () => this.check())
    this.on('slideChangeEnd', () => this.check())
  }

  /**
   * Проверка и загрузка изображений в зоне видимости
   */
  private check(): void {
    const activeIndex = this.tvist.activeIndex
    const perPage = this.options.perPage ?? 1

    // Вычисляем диапазон слайдов для загрузки
    const distance = perPage * (this.preloadPrevNext + 1) - 1

    // Фильтруем entries и загружаем нужные
    this.entries = this.entries.filter(entry => {
      const [, slideIndex] = entry
      
      // Проверяем, находится ли слайд в зоне загрузки
      const inRange = this.isWithinRange(slideIndex, activeIndex, distance)
      
      if (inRange) {
        this.load(entry)
        return false // Удаляем из очереди
      }
      
      return true // Оставляем в очереди
    })
  }

  /**
   * Проверка, находится ли индекс в зоне загрузки
   */
  private isWithinRange(index: number, activeIndex: number, distance: number): boolean {
    const slides = this.tvist.slides
    const totalSlides = slides.length

    // Для loop режима нужно учитывать циклический диапазон
    if (this.options.loop) {
      // Простая проверка для loop: загружаем всё в пределах distance
      const diff = Math.abs(index - activeIndex)
      return diff <= distance || diff >= totalSlides - distance
    }

    // Для обычного режима
    return Math.abs(index - activeIndex) <= distance
  }

  /**
   * Загрузка изображения
   */
  private load(entry: LazyLoadEntry): void {
    const [img, slideIndex, spinner] = entry
    const slide = this.tvist.slides[slideIndex]

    if (!slide) return

    // Добавляем класс загрузки
    addClass(slide, LOADING_CLASS)

    // Создаём обработчики для конкретного изображения
    const onLoad = () => {
      removeClass(slide, LOADING_CLASS)
      spinner.remove()
      img.style.display = ''
      
      // Emit события
      this.emit('lazyLoaded', img, slideIndex)
      
      // Убираем обработчики
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }

    const onError = () => {
      removeClass(slide, LOADING_CLASS)
      spinner.remove()
      
      // Emit события об ошибке
      this.emit('lazyLoadError', img, slideIndex)
      
      // Убираем обработчики
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }

    // Подписываемся на события
    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)

    // Устанавливаем src и srcset
    const src = img.getAttribute(SRC_DATA_ATTRIBUTE)
    const srcset = img.getAttribute(SRCSET_DATA_ATTRIBUTE)

    if (src) {
      img.src = src
      img.removeAttribute(SRC_DATA_ATTRIBUTE)
    }

    if (srcset) {
      img.srcset = srcset
      img.removeAttribute(SRCSET_DATA_ATTRIBUTE)
    }
  }

  /**
   * Удаление всех спиннеров
   */
  private removeSpinners(): void {
    this.entries.forEach(([, , spinner]) => {
      spinner.remove()
    })
  }

  /**
   * Публичное API для ручной загрузки изображений
   */
  loadAll(): void {
    // Загружаем все оставшиеся изображения
    const entriesToLoad = [...this.entries]
    this.entries = []
    entriesToLoad.forEach(entry => this.load(entry))
  }

  /**
   * Публичное API для загрузки изображений конкретного слайда
   */
  loadSlide(index: number): void {
    const entriesToLoad = this.entries.filter(([, slideIndex]) => slideIndex === index)
    this.entries = this.entries.filter(([, slideIndex]) => slideIndex !== index)
    entriesToLoad.forEach(entry => this.load(entry))
  }
}
