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
    /** Направление прокрутки (внутреннее, для beforeTransitionStart) */
    _scrollDirection?: 'next' | 'prev'
  }
}

/** API модуля loop для вызова fix из Tvist */
export interface LoopModuleAPI {
  fix(params: { direction?: 'next' | 'prev' }): number
}

/** API модуля autoplay для публичного геттера */
export interface AutoplayModuleAPI {
  getAutoplay(): {
    start(): void
    stop(): void
    pause(): void
    resume(): void
    isRunning(): boolean
    isPaused(): boolean
    isStopped(): boolean
  }
}

/**
 * Основные опции слайдера
 */
export interface TvistOptions {
  // Базовые настройки
  
  /**
   * Количество слайдов на странице (видимых одновременно).
   * @default 1
   */
  perPage?: number

  /**
   * Количество слайдов, пролистываемых за один раз.
   * @default 1
   */
  slidesPerGroup?: number
  
  /**
   * Если true, ширина слайдов определяется их содержимым (не задаётся слайдером).
   * Рекомендуется perPage: 1.
   * @default false
   */
  autoWidth?: boolean
  
  /**
   * Если true, высота слайдов определяется их содержимым (для вертикального направления).
   * Рекомендуется perPage: 1. 
   * @default false
   */
  autoHeight?: boolean
  
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
   * @default false
   */
  center?: boolean
  
  /**
   * Режим отладки: вывод предупреждений в консоль (arrows not found, container not found и т.д.)
   * @default false
   */
  debug?: boolean
  
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
   * Привязка к слайдам в free режиме. Если true, после momentum scroll будет snap к ближайшему слайду
   * @default false
   */
  freeSnap?: boolean
  
  /**
   * Сила инерции (flick power). Множитель для скорости при расчёте дистанции momentum scroll
   * @default 600
   */
  flickPower?: number
  
  /**
   * Максимальное количество страниц для flick в обычном режиме
   * @default 1
   */
  flickMaxPages?: number
  
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
    /** Автоматически добавлять SVG иконки в кнопки навигации. @default true */
    addIcons?: boolean
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
    
    // Лимит точек
    /** 
     * Максимальное количество видимых точек (только для type: 'bullets')
     * Если не указано - показываются все точки
     * @default undefined
     */
    limit?: number
    /** 
     * Стратегия распределения слайдов по точкам при использовании limit
     * - 'even': равномерное распределение - каждая точка представляет равное количество слайдов
     * - 'center': центральное распределение - крайние точки по 1 слайду, остальные группируются в центре
     * @default 'even'
     */
    strategy?: 'even' | 'center'
    /**
     * Стратегия распределения остатка при равномерном делении (только для strategy: 'even')
     * - 'left': остаток добавляется к левым точкам
     * - 'center': остаток добавляется к центральным точкам
     * - 'right': остаток добавляется к правым точкам
     * @default 'center'
     */
    remainderStrategy?: 'left' | 'center' | 'right'
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
  
  /**
   * Автоматически возвращаться к первому слайду после достижения последнего (работает без loop)
   * Применяется к навигации, autoplay и другим способам перехода между слайдами
   * @default false
   */
  rewind?: boolean
  
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
  
  /**
   * Режим бегущей строки (непрерывная прокрутка)
   * @default false
   */
  marquee?: boolean | {
    /** Скорость прокрутки в пикселях в секунду */
    speed?: number
    /** Направление прокрутки: 'left' | 'right' для horizontal, 'up' | 'down' для vertical */
    direction?: 'left' | 'right' | 'up' | 'down'
    /** Пауза при наведении курсора */
    pauseOnHover?: boolean
  }
  
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
  breakpoints?: Record<number, Partial<TvistOptions> & { enabled?: boolean }>
  
  /**
   * База для расчёта breakpoints
   * @default 'window'
   */
  breakpointsBase?: 'window' | 'container'
  
  /**
   * Включить/выключить слайдер. При false слайдер не инициализируется (статичный контент)
   * @default true
   */
  enabled?: boolean
  
  // Обработчики событий
  
  /**
   * Обработчики событий слайдера
   */
  on?: {
    /** После создания слайдера */
    created?: (tvist: Tvist) => void
    /** Перед уничтожением */
    beforeDestroy?: (tvist: Tvist) => void
    /** При уничтожении */
    destroyed?: (tvist: Tvist) => void
    /** Клик по слайду */
    click?: (index: number, slide: HTMLElement, event: MouseEvent) => void
    /** Вызван update() — пересчитаны размеры/позиции */
    refresh?: () => void
    /** Завершилось изменение размера контейнера */
    resized?: () => void
    /** Перед сменой слайда */
    beforeSlideChange?: (index: number) => void
    /** Начало смены слайда (старт анимации) */
    slideChange?: (index: number) => void
    /** Смена слайда завершена */
    slideChanged?: (index: number) => void
    /** Перед началом анимации перехода (для loop fix) */
    beforeTransitionStart?: (data: { index: number; direction: 'next' | 'prev' }) => void
    /** Начало анимации перехода */
    transitionStart?: (index: number) => void
    /** Конец анимации перехода */
    transitionEnd?: (index: number) => void
    /** Слайд вошёл в видимую область */
    visible?: (slide: HTMLElement, index: number) => void
    /** Слайд вышел из видимой области */
    hidden?: (slide: HTMLElement, index: number) => void
    /** Во время прокрутки (тики анимации / драг) */
    scroll?: () => void
    /** Прогресс прокрутки 0..1, только при !loop */
    progress?: (progress: number) => void
    /** Достигнут первый слайд */
    reachBeginning?: () => void
    /** Достигнут последний слайд */
    reachEnd?: () => void
    /** Начало перетаскивания */
    dragStart?: () => void
    /** Во время перетаскивания */
    drag?: () => void
    /** Конец перетаскивания */
    dragEnd?: () => void
    /** Смена breakpoint */
    breakpoint?: (breakpoint: number | null) => void
    /** Слайдер заблокирован (контент помещается в область) */
    lock?: () => void
    /** Слайдер разблокирован */
    unlock?: () => void
    /** Обновлены опции через updateOptions() */
    optionsUpdated?: (tvist: Tvist, newOptions: Partial<TvistOptions>) => void
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
    [key: string]: ((...args: any[]) => void) | undefined
  }
}

