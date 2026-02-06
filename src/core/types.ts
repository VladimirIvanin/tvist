/**
 * Базовые типы для Tvist
 */

import type { Tvist } from './Tvist'

/**
 * Расширение типа Tvist для модулей
 */
declare module './Tvist' {
  interface Tvist {
    /** Логический индекс текущего слайда (для loop режима) */
    realIndex?: number
  }
}

/**
 * Основные опции слайдера
 */
export interface TvistOptions {
  // Базовые настройки
  
  /**
   * Количество слайдов на странице
   * @default 1
   */
  perPage?: number
  
  /**
   * Минимальный размер слайда (ширина или высота) для автоматического расчета perPage
   * @default undefined
   */
  slideMinSize?: number
  
  /**
   * Расстояние между слайдами в пикселях
   * @default 0
   */
  gap?: number
  
  /**
   * Peek — отступы, показывающие часть соседних слайдов (чтобы было видно, что есть ещё слайды).
   * Для горизонтального слайдера: left/right, для вертикального: top/bottom.
   * @default undefined
   * @example
   * peek: 10
   * peek: '1rem'
   * peek: { left: 10, right: 20 }
   * peek: { top: 10, bottom: 20 }
   */
  peek?: number | string | { 
    left?: number | string
    right?: number | string 
  } | { 
    top?: number | string
    bottom?: number | string 
  }

  /**
   * Peek trim: при true (по умолчанию) концовка прижимается к краю — последний слайд без дыры справа/снизу.
   * При включённом loop не применяется.
   * @default true
   */
  peekTrim?: boolean

  /**
   * Скорость анимации перехода в миллисекундах
   * @default 300
   */
  speed?: number
  
  /**
   * Направление прокрутки слайдера
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical'

  /**
   * Центрирование активного слайда. При true активный слайд будет находиться по центру контейнера.
   * Работает как опция focus: 'center' в Splide или centeredSlides в Swiper.
   * @default false
   */
  center?: boolean
  
  // Начальные значения
  
  /**
   * Индекс начального слайда
   * @default 0
   */
  start?: number
  
  // Drag
  
  /**
   * Включить перетаскивание слайдов. 'free' - свободная прокрутка без привязки к слайдам
   * @default true
   */
  drag?: boolean | 'free'
  
  /**
   * Множитель скорости перетаскивания
   * @default 1
   */
  dragSpeed?: number
  
  /**
   * Эффект "резинки" при перетаскивании за границы
   * @default true
   */
  rubberband?: boolean
  
  /**
   * CSS селектор для элементов, которые должны сохранять фокус при перетаскивании
   * @default 'button, a, input, select, textarea'
   */
  focusableElements?: string
  
  // Navigation
  
  /**
   * Навигационные стрелки. true - автоматическое создание, объект - кастомная настройка
   * @default false
   */
  arrows?: boolean | {
    /** Селектор или элемент для кнопки "назад" */
    prev?: string | HTMLElement
    /** Селектор или элемент для кнопки "вперёд" */
    next?: string | HTMLElement
    /** CSS класс для неактивных стрелок */
    disabledClass?: string
    /** CSS класс для скрытых стрелок */
    hiddenClass?: string
  }
  
  // Pagination
  
  /**
   * Пагинация. true - автоматическое создание буллетов, объект - кастомная настройка
   * @default false
   */
  pagination?: boolean | {
    /** Селектор или элемент контейнера для пагинации */
    container?: string | HTMLElement
    /** Тип пагинации */
    type?: 'bullets' | 'fraction' | 'progress' | 'custom'
    /** Включить клики по буллетам для навигации */
    clickable?: boolean
    /** CSS класс для буллета */
    bulletClass?: string
    /** CSS класс для активного буллета */
    bulletActiveClass?: string
    /** Функция рендеринга буллета */
    renderBullet?: (index: number, className: string) => string
    /** Функция рендеринга дробной пагинации */
    renderFraction?: (current: number, total: number) => string
    /** Функция рендеринга кастомной пагинации */
    renderCustom?: (current: number, total: number) => string
  }
  
  // Autoplay
  
  /**
   * Автопрокрутка. Число - задержка в миллисекундах между переходами, true - использовать дефолтную задержку 3000мс
   * @default false
   */
  autoplay?: number | boolean
  
  /**
   * Ставить автопрокрутку на паузу при наведении курсора
   * @default true
   */
  pauseOnHover?: boolean
  
  /**
   * Ставить автопрокрутку на паузу при любом взаимодействии (drag, click)
   * @default true
   */
  pauseOnInteraction?: boolean
  
  /**
   * Отключить автопрокрутку после первого взаимодействия пользователя
   * @default false
   */
  disableOnInteraction?: boolean
  
  // Loop
  
  /**
   * Бесконечная прокрутка. 'auto' - определяется автоматически на основе количества слайдов
   * @default false
   */
  loop?: boolean | 'auto'
  
  // Lazy loading
  
  /**
   * Ленивая загрузка изображений
   * @default false
   */
  lazy?: boolean | {
    /** Количество соседних слайдов для предзагрузки с каждой стороны */
    preloadPrevNext?: number
  }
  
  // Effects
  
  /**
   * Эффект перехода между слайдами
   * @default 'slide'
   */
  effect?: 'slide' | 'fade' | 'cube' | 'card'
  
  /**
   * Настройки fade эффекта
   */
  fadeEffect?: {
    /** Включить кросс-фейд (плавное наложение слайдов) */
    crossFade?: boolean
  }
  
  /**
   * Настройки cube эффекта
   */
  cubeEffect?: {
    /** Тени на гранях куба */
    slideShadows?: boolean
    /** Общая тень куба */
    shadow?: boolean
    /** Смещение тени */
    shadowOffset?: number
    /** Масштаб тени */
    shadowScale?: number
    /** Расстояние перспективы (px). Меньше = сильнее эффект глубины. @default 800 */
    perspective?: number
    /** Точка перспективы по Y (%). @default 60 */
    perspectiveOriginY?: number
    /** Внутренний отступ для предотвращения обрезки вращающихся граней (px). @default 10 */
    viewportPadding?: number
  }
  
  // Thumbs & Navigation
  
  /**
   * Связь с thumbnail-слайдером
   */
  thumbs?: {
    /** Экземпляр слайдера-миниатюр */
    slider: Tvist
  }
  
  /**
   * Если true, слайдер будет вести себя как навигация (клики по слайдам делают их активными).
   * Используется для создания thumbnail-слайдеров
   * @default false
   */
  isNavigation?: boolean
  
  // Virtual
  
  /**
   * Виртуальные слайды для работы с большими списками
   * @default false
   */
  virtual?: boolean | {
    /** Количество дополнительных слайдов до видимой области */
    addSlidesBefore?: number
    /** Количество дополнительных слайдов после видимой области */
    addSlidesAfter?: number
    /** Функция рендеринга виртуального слайда */
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- virtual slide data is user-defined */
    renderSlide?: (data: any, index: number) => string
  }
  
  // Grid
  
  /**
   * Сетка слайдов
   * @default undefined
   */
  grid?: {
    /** Количество рядов */
    rows?: number
    /** Количество колонок */
    cols?: number
    /** 
     * Отступы сетки. Можно задать отдельно для строк и колонок.
     * Если не задано, используется глобальный gap.
     */
    gap?: {
      row?: number | string
      col?: number | string
    } | number | string
    /**
     * Размеры ячеек для каждого слайда [colSpan, rowSpan]
     * Массив повторяется, если слайдов больше, чем определений
     * @example [[2, 1], [1, 2]]
     */
    dimensions?: [number, number][]
  }
  
  // Marquee
  
  // TODO: Реализовать модуль Marquee
  /**
   * Режим бегущей строки (непрерывная прокрутка)
   * @default false
   */
  // marquee?: boolean | {
  //   /** Скорость прокрутки в пикселях в секунду */
  //   speed?: number
  //   /** Направление прокрутки */
  //   direction?: 'left' | 'right'
  //   /** Пауза при наведении курсора */
  //   pauseOnHover?: boolean
  // }
  
  // Keyboard
  
  /**
   * Управление с клавиатуры (стрелки)
   * @default false
   */
  keyboard?: boolean | {
    /** Включить управление с клавиатуры */
    enabled?: boolean
    /** Реагировать только когда слайдер в видимой области */
    onlyInViewport?: boolean
  }
  
  // Wheel
  
  /**
   * Управление колёсиком мыши
   * @default false
   */
  wheel?: boolean | {
    /** Чувствительность (количество пикселей на тик колёсика) */
    sensitivity?: number
    /** Разрешить прокрутку страницы на краях слайдера */
    releaseOnEdges?: boolean
  }
  
  // Scrollbar
  
  /**
   * Кастомный скроллбар для навигации
   * @default false
   */
  scrollbar?: boolean | {
    /** Селектор или элемент для контейнера скроллбара */
    container?: string | HTMLElement
    /** Автоматически скрывать скроллбар при бездействии */
    hide?: boolean
    /** Задержка перед скрытием (мс) */
    hideDelay?: number
    /** CSS класс для скроллбара */
    scrollbarClass?: string
    /** CSS класс для трека скроллбара */
    trackClass?: string
    /** CSS класс для ползунка */
    thumbClass?: string
    /** Возможность перетаскивания ползунка */
    draggable?: boolean
  }
  
  // Responsive
  
  /**
   * Адаптивные настройки по breakpoints. Ключ - ширина экрана в пикселях
   * @default undefined
   */
  breakpoints?: Record<number, Partial<TvistOptions>>
  
  /**
   * База для расчёта breakpoints
   * @default 'window'
   */
  breakpointsBase?: 'window' | 'container'
  
  // Обработчики событий
  
  /**
   * Обработчики событий слайдера
   */
  on?: {
    /** Вызывается после создания слайдера */
    created?: (tvist: Tvist) => void
    /** Вызывается перед уничтожением слайдера */
    destroyed?: (tvist: Tvist) => void
    /** Вызывается перед началом смены слайда */
    beforeSlideChange?: (index: number) => void
    /** Вызывается при начале смены слайда */
    slideChange?: (index: number) => void
    /** Вызывается после завершения смены слайда */
    slideChanged?: (index: number) => void
    /** Вызывается при начале перетаскивания */
    dragStart?: () => void
    /** Вызывается во время перетаскивания */
    drag?: () => void
    /** Вызывается при завершении перетаскивания */
    dragEnd?: () => void
    /** Вызывается при прокрутке */
    scroll?: () => void
    /** Вызывается при изменении размера */
    resize?: () => void
    /** Вызывается при смене breakpoint */
    breakpoint?: (breakpoint: number | null) => void
    /** Вызывается при блокировке слайдера (контент помещается в контейнер) */
    lock?: () => void
    /** Вызывается при разблокировке слайдера */
    unlock?: () => void
    /** Вызывается при динамическом обновлении опций */
    optionsUpdated?: (tvist: Tvist, newOptions: Partial<TvistOptions>) => void
    /** Дополнительные кастомные обработчики */
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
    [key: string]: ((...args: any[]) => void) | undefined
  }
}

