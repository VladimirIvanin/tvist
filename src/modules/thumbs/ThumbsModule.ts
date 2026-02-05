/**
 * ThumbsModule
 * Реализует функционал навигации через миниатюры
 * 
 * Опции:
 * - navigationMode: boolean - если true, делает слайды кликабельными и добавляет active класс
 */

import { Module } from '../Module'

export class ThumbsModule extends Module {
  readonly name = 'thumbs'

  private removeClickListeners?: () => void

  init(): void {
    // Если включен режим навигации (thumbnail mode)
    if (this.options.isNavigation) {
      this.initNavigation()
    }
  }

  private initNavigation(): void {
    // Добавляем класс модификатор на корневой элемент
    this.tvist.root.classList.add('tvist--nav')

    const slides = this.tvist.slides
    const listeners: (() => void)[] = []
    const activeClass = 'tvist__slide--nav-active'
    const legacyActiveClass = 'is-active' // Как в Splide

    // 1. Обработка кликов
    slides.forEach((slide, index) => {
      const handler = () => {
        if (this.tvist.options.isNavigation) {
          // Вызываем событие
          this.tvist.emit('navigation:click', index)
          
          // Переходим к слайду
          this.tvist.scrollTo(index)
        }
      }
      
      slide.addEventListener('click', handler)
      listeners.push(() => slide.removeEventListener('click', handler))
    })

    this.removeClickListeners = () => {
      listeners.forEach(remove => remove())
    }
    
    // 2. Обновление классов при изменении слайда
    const updateClasses = (index: number) => {
      slides.forEach((slide, i) => {
        if (i === index) {
          slide.classList.add(activeClass)
          slide.classList.add(legacyActiveClass)
        } else {
          slide.classList.remove(activeClass)
          slide.classList.remove(legacyActiveClass)
        }
      })
    }

    // Подписываемся на изменение слайда
    this.on('slideChange', updateClasses)
    this.on('slideChanged', updateClasses) // На всякий случай дублируем для надежности
    
    // Начальное состояние
    this.on('created', () => {
        updateClasses(this.tvist.activeIndex)
    })
    
    // Если слайдер уже создан (например, модуль инициализирован позже)
    updateClasses(this.tvist.activeIndex)
  }

  destroy(): void {
    this.removeClickListeners?.()
  }
}
