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

/**
 * Аргументы метода {@link Tvist.destroy}
 */
/** `detail` для DOM CustomEvent long press на слайде (имена в `TVIST_DOM_EVENTS`) */
export interface TvistLongPressDomEventDetail {
  index: number
  pointerType: string
}

export interface TvistDestroyOptions {
  /**
   * Уничтожать вложенные экземпляры Tvist (потомки с классом блока).
   * Рекурсивно: у каждого вложенного вызывается `destroy({ destroyNested: true })`.
   * По умолчанию `false` — вложенные слайдеры (например галереи в карточках) остаются активными.
   */
  destroyNested?: boolean
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

/** API модуля marquee для публичного геттера */
export interface MarqueeModuleAPI {
  getMarquee(): {
    start(): void
    stop(): void
    pause(): void
    resume(): void
    isRunning(): boolean
    isPaused(): boolean
    isStopped(): boolean
  }
}

/** API модуля video для публичного геттера */
export interface VideoModuleAPI {
  getVideo(): {
    play(index?: number): void
    pause(index?: number): void
    mute(): void
    unmute(): void
    isMuted(): boolean
  } | undefined
}

/**
 * Опции автопрокрутки (объект)
 */
export interface AutoplayOptions {
  /**
   * Задержка между переходами в миллисекундах
   * @default 3000
   */
  delay?: number

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

  /**
   * Для видео-слайдов: ждать окончания видео вместо таймера.
   * Для слайдов без видео используется обычный delay.
   * @default false
   */
  waitForVideo?: boolean
}

/**
 * Опции видео модуля
 */
export interface VideoOptions {
  /**
   * Воспроизводить видео при активации слайда
   * @default true
   */
  autoplay?: boolean

  /**
   * Начинать видео с выключенным звуком (обязательно для autoplay в браузерах)
   * @default true
   */
  muted?: boolean

  /**
   * Зациклить воспроизведение видео
   * @default false
   */
  loop?: boolean

  /**
   * Добавить атрибут playsinline для iOS (без этого видео открывается на весь экран)
   * @default true
   */
  playsinline?: boolean

  /**
   * Ставить видео на паузу при уходе со слайда
   * @default true
   */
  pauseOnLeave?: boolean

  /**
   * Сбрасывать видео на начало при уходе со слайда
   * @default false
   */
  resetOnLeave?: boolean

  /**
   * Ставить активное видео на паузу во время long press и продолжать после отпускания
   * @default true (если включен holdToPause), иначе false
   */
  pauseOnHold?: boolean
}

/**
 * Опции удержания для сценариев историй (long press)
 */
export interface HoldToPauseOptions {
  /**
   * Включить long press удержание
   * @default true
   */
  enabled?: boolean

  /**
   * Порог удержания в миллисекундах.
   * Дефолт при отсутствии поля — `HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS` из `core/constants`.
   */
  threshold?: number

  /**
   * Область, в которой отслеживается удержание:
   * - 'slider' — root слайдера
   * - 'container' — внутренний контейнер со слайдами
   * - HTMLElement — кастомный элемент
   * @default 'slider'
   */
  root?: 'slider' | 'container' | HTMLElement

  /**
   * CSS-селектор элементов, которые нужно исключить из удержания
   * @default undefined
   */
  exclude?: string

  /**
   * Отменять удержание при старте drag
   * @default true
   */
  cancelOnDrag?: boolean

  /**
   * Порог движения до отмены удержания (px).
   * Если не задан, используется внутренний порог drag.
   * @default undefined
   */
  moveThreshold?: number
}

/**
 * Опции модуля отслеживания видимости
 */
export interface VisibilityOptions {
  /**
   * Приостанавливать autoplay когда слайдер скрыт
   * @default true
   */
  pauseAutoplay?: boolean

  /**
   * Приостанавливать marquee когда слайдер скрыт
   * @default true
   */
  pauseMarquee?: boolean

  /**
   * Порог видимости для IntersectionObserver (0..1)
   * 0 = считается видимым если хоть что-то видно
   * 1 = считается видимым только если виден полностью
   * @default 0
   */
  threshold?: number
}

/**
 * Опции для специфичных браузерных фиксов
 */
export interface BrowserFixesOptions {
  /**
   * Firefox: добавлять атрибут decoding="sync" к изображениям при предзагрузке.
   * Предотвращает задержку отрисовки декодированных изображений в Firefox.
   * @default true
   */
  firefoxImageDecoding?: boolean
}

/** Payload события videoProgress */
export interface VideoProgressEvent {
  /** DOM-элемент слайда */
  slide: HTMLElement
  /** DOM-элемент видео */
  video: HTMLVideoElement
  /** Индекс слайда */
  index: number
  /** Прогресс воспроизведения (0..1) */
  progress: number
  /** Текущее время воспроизведения в секундах */
  currentTime: number
  /** Полная длительность видео в секундах */
  duration: number
}

/** Payload события autoplayProgress */
export interface AutoplayProgressEvent {
  /** Прогресс активного сегмента (0..1) */
  progress: number
  /** Индекс активного слайда */
  index: number
  /** Индекс активного сегмента (равен index) */
  segmentIndex: number
  /** Прогресс активного сегмента (0..1), алиас progress */
  segmentProgress: number
  /** Общее количество сегментов (слайдов) */
  totalSegments: number
}

/** Payload событий video (play, pause, ended, ready) */
export interface VideoEvent {
  /** DOM-элемент слайда */
  slide: HTMLElement
  /** DOM-элемент видео */
  video: HTMLVideoElement
  /** Индекс слайда */
  index: number
}

/**
 * Принудительная подгрузка img с нативным loading="lazy" для соседних и целевого слайда.
 */
export interface NativeLazyAdjacentOptions {
  /**
   * После инициализации слайдера — для слайдов prev/next относительно активного.
   * Дополнительный трафик при загрузке страницы; по умолчанию выключено.
   * @default false (включите явно `onInit: true`)
   */
  onInit?: boolean

  /**
   * В начале перехода к другому слайду (событие beforeSlideChange), до анимации; то же при speed: 0.
   * @default true при включённой опции (`true` или объект без `onTransitionStart: false`)
   */
  onTransitionStart?: boolean
}

/**
 * Расширенные опции бесконечной прокрутки.
 */
export interface LoopOptions {
  /**
   * Включить/выключить loop.
   * По умолчанию `true`, если указан объект.
   */
  enabled?: boolean

  /**
   * Включить систему DOM-клонов для loop.
   * По умолчанию `false`.
   *
   * В режиме клонов индексы и события должны трактоваться так,
   * как будто пользователь взаимодействует с оригинальными слайдами.
   */
  withClones?: boolean
}

/**
 * Основные опции слайдера
 */
export interface CenterOptions {
  /** Центрирует активный слайд в viewport (аналог center: true) */
  active?: boolean
  /** Центрирует все слайды визуально когда locked (justify-content: center) */
  justify?: boolean
}

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
   * Фиксированная ширина слайда (px или CSS, например `'12rem'`, `'30%'`).
   * Для горизонтального направления: число видимых слайдов считается по ширине контейнера,
   * опция `perPage` перезаписывается при каждом пересчёте и не задаёт ширину слайда.
   * Для вертикального направления задаёт только ширину слайда (высота — как без этой опции).
   */
  fixedWidth?: number | string

  /**
   * Фиксированная высота слайда (px или CSS).
   * Для вертикального направления: число видимых рядов считается по высоте контейнера,
   * `perPage` перезаписывается при пересчёте.
   * Для горизонтального направления задаёт только высоту слайда.
   */
  fixedHeight?: number | string
  
  /**
   * Минимальный размер слайда (ширина или высота) для автоматического расчета perPage
   * @default undefined
   */
  slideMinSize?: number
  
  /**
   * Расстояние между слайдами: число (px) или CSS-строка (например `'1rem'`, `'12px'`).
   * Строковые значения измеряются в DOM относительно трека слайдера.
   * @default 0
   */
  gap?: number | string

  /**
   * Округлять translate и размеры до целых пикселей при применении в DOM.
   * Помогает убрать субпиксельные щели/мыло на некоторых DPR и браузерах.
   * Аналогично `roundLengths` в Swiper.
   * @default true
   */
  roundLengths?: boolean
  
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
   * Минимальный интервал (мс) между вызовами next()/prev() при отсутствии анимации перехода.
   * Пока идёт анимация (animator), повторные вызовы всё равно игнорируются.
   * Полезно при speed: 0 или при серии программных вызовов.
   * @default 0
   */
  navThrottleMs?: number
  
  /**
   * Направление прокрутки слайдера
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical'

  /**
   * Центрирование слайдов.
   * - `true` — центрирует активный слайд в viewport (режим "active").
   * - Объект `{ active?, justify? }` — тонкая настройка:
   *   - `active: true` — центрирует активный слайд (аналог `center: true`)
   *   - `justify: true` — визуально центрирует все слайды когда locked (как `justify-content: center`)
   * @default false
   */
  center?: boolean | CenterOptions
  
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
  
  /**
   * Предотвращать клики по слайдам во время перетаскивания
   * @default true
   */
  preventClicks?: boolean
  
  /**
   * Предотвращать распространение событий клика во время анимации
   * @default true
   */
  preventClicksPropagation?: boolean
  
  // Navigation
  
  /**
   * Навигационные стрелки. true - автоматическое создание, объект - кастомная настройка
   * @default false
   */
  arrows?: boolean | {
    /** Селектор или элемент для кнопки "назад". Может быть вне root — поиск по document */
    prev?: string | HTMLElement
    /** Селектор или элемент для кнопки "вперёд". Может быть вне root */
    next?: string | HTMLElement
    /** CSS класс для неактивных стрелок (по умолчанию БЭМ: tvist-v1__arrow--disabled) */
    disabledClass?: string
    /** CSS класс для скрытых стрелок (по умолчанию БЭМ: tvist-v1__arrow--hidden) */
    hiddenClass?: string
    /** Автоматически добавлять SVG иконки в кнопки навигации. @default true */
    addIcons?: boolean
    /** Автоматически скрывать стрелки когда всего одна страница (нечего листать). @default true */
    hideWhenSinglePage?: boolean
  }
  
  // Pagination
  
  /**
   * Пагинация. true - автоматическое создание буллетов, объект - кастомная настройка
   * @default false
   */
  pagination?: boolean | {
    /** Селектор или элемент контейнера для пагинации. Может быть вне root */
    container?: string | HTMLElement
    /** Тип пагинации */
    type?: 'bullets' | 'fraction' | 'progress' | 'custom'
    /** Включить клики по буллетам для навигации */
    clickable?: boolean
    /** CSS класс для буллета */
    bulletClass?: string
    /** CSS класс для активного буллета (по умолчанию BEM: tvist-v1__bullet--active) */
    bulletActiveClass?: string
    /** Функция рендеринга буллета */
    renderBullet?: (index: number, className: string) => string
    /** Функция рендеринга дробной пагинации */
    renderFraction?: (current: number, total: number) => string
    /** Функция рендеринга кастомной пагинации */
    renderCustom?: (current: number, total: number) => string
    /** Автоматически скрывать пагинацию когда всего одна страница (нечего листать). @default true */
    hideWhenSinglePage?: boolean
    
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
   * Автопрокрутка слайдов.
   * - `false` — выключена (по умолчанию)
   * - `true` — включена с задержкой 3000мс и дефолтными настройками
   * - `number` — включена с указанной задержкой в миллисекундах
   * - `AutoplayOptions` — полный контроль: delay, pauseOnHover, pauseOnInteraction, disableOnInteraction, waitForVideo
   * @default false
   */
  autoplay?: boolean | number | AutoplayOptions
  
  // Video
  
  /**
   * Управление видео внутри слайдов (HTML `<video>` и iframe YouTube/Vimeo).
   * - `false` — выключено (по умолчанию)
   * - `true` — включено с дефолтными настройками
   * - `VideoOptions` — полный контроль
   * @default false
   */
  video?: boolean | VideoOptions

  /**
   * Удержание для сценариев историй:
   * - `false` / `undefined` — выключено (по умолчанию)
   * - `true` — включено с дефолтными настройками
   * - `HoldToPauseOptions` — полный контроль
   * @default undefined
   */
  holdToPause?: boolean | HoldToPauseOptions
  
  // Visibility
  
  /**
   * Отслеживание видимости слайдера для приостановки autoplay/marquee.
   * - `false` — выключено
   * - `true` — включено с дефолтными настройками (по умолчанию)
   * - `VisibilityOptions` — полный контроль
   * @default true
   */
  visibility?: boolean | VisibilityOptions
  
  /**
   * Специфичные фиксы для браузеров
   * @default { firefoxImageDecoding: true }
   */
  browserFixes?: BrowserFixesOptions
  
  // Loop
  
  /**
   * Бесконечная прокрутка. 'auto' - определяется автоматически на основе количества слайдов.
   *
   * Поддерживаются следующие варианты:
   * - `false` — выключено (по умолчанию)
   * - `true`  — включено (эквивалентно `{ enabled: true, withClones: false }`)
   * - `'auto'` — режим автоопределения (как и раньше)
   * - `LoopOptions` — объект с расширенной конфигурацией
   *
   * @default false
   */
  loop?: boolean | 'auto' | LoopOptions
  
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

  /**
   * Предзагрузка изображений с нативным `loading="lazy"` у соседних слайдов и/или целевого при переходе.
   * Полезно для `effect: 'cube'`, когда соседняя грань видна до подгрузки браузером.
   * `true` — по умолчанию только при начале перехода; соседи при init — `onInit: true`.
   * @default false (выключено)
   */
  nativeLazyAdjacent?: boolean | NativeLazyAdjacentOptions
  
  // Effects
  
  /**
   * Эффект перехода между слайдами
   * @default 'slide'
   */
  effect?: 'slide' | 'fade' | 'cube' | 'stack'
  
  /**
   * Настройки fade эффекта
   */
  fadeEffect?: {
    /** Включить кросс-фейд (плавное наложение слайдов) */
    crossFade?: boolean
  }
  
  /**
   * Настройки stack эффекта
   */
  stackEffect?: {
    /**
     * Режим наложения слайдов.
     * - `'cover'` — активный слайд сверху, едет поверх следующего (как страница поверх стопки).
     * - `'uncover'` — в покое как `cover`; в переходе next — накрываем карту, prev — снимаем
     *   (нижний слайд на месте, верхний уезжает с `translate`).
     * @default 'cover'
     */
    mode?: 'cover' | 'uncover'
    /** Тени на слайдах. @default false */
    slideShadows?: boolean
    /** Лёгкий поворот слайдов стопки. @default false */
    rotate?: boolean
    /** Угол поворота на слайд (градусы). @default 2 */
    perSlideRotate?: number
    /**
     * Смещение стопки на слайд (px). При `stackLayout: 'pile'` — только поперёк оси прокрутки
     * (вертикаль: вправо, горизонталь: вниз), чтобы колода не разъезжалась вдоль рельса.
     * @default 0
     */
    perSlideOffset?: number
    /** Уменьшение масштаба на слайд. 0 — без масштабирования. @default 0 */
    perSlideScale?: number
    /** Смещение по Z на слайд (px). 0 — без глубины. @default 0 */
    perSlideDepth?: number
    /**
     * Раскладка «ожидающих» слайдов (`progress > 0`) в покое.
     * - `'track'` — каждый слайд на своей позиции вдоль оси (`-slidePosition`), как рельс.
     * - `'pile'` — ожидающие (`progress > 0`) делят с активным текущий `translate` по оси; на root
     *   вешается модификатор `--stack-pile`: слайды `position: absolute` в контейнере (иначе остаются
     *   в потоке и идут столбиком). Веер: `rotate` / `perSlideOffset` / `perSlideScale` / `perSlideDepth`.
     * @default 'track'
     */
    stackLayout?: 'track' | 'pile'
    /**
     * Внутренние отступы трека (px), как у `cubeEffect.viewportPadding`: запас под `rotate` и тени,
     * без использования `peek`.
     * @default 0 (не задаётся)
     */
    viewportPadding?: number
    /**
     * Масштаб только для расчёта z-index: `progress / zIndexProgressScale`.
     * Значения меньше 1 дают более раннюю перестановку слоёв (как в Swiper Cards).
     * @default 1
     */
    zIndexProgressScale?: number
    /**
     * Доля визуального смещения слайдов, которые следуют за `translate` движка (`cover` в переходе,
     * `uncover` — слой с `progress > 0`). Меньше 1 — короткий «снос» карты без полного хода по оси.
     * @default 1
     */
    slideTravelRatio?: number
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
  
  // Grid
  
  /**
   * Сетка слайдов
   * @default undefined
   */
  grid?: {
    /**
     * Количество рядов.
     * Если задан только `cols`, по умолчанию 1 (как splide-extension-grid: rows 1, cols 1).
     */
    rows?: number
    /**
     * Количество колонок.
     * Если задан только `rows`, по умолчанию 1.
     */
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
    slideChangeStart?: (index: number) => void
    /** Смена слайда завершена (после анимации) */
    slideChangeEnd?: (index: number) => void
    /** Перед началом анимации перехода (для loop fix) */
    beforeTransitionStart?: (data: { index: number; direction: 'next' | 'prev' }) => void
    /** Начало анимации перехода */
    transitionStart?: (index: number) => void
    /** Конец анимации перехода */
    transitionEnd?: (index: number) => void
    /**
     * Слайд вошёл в видимую область (по расчёту движка: пересечение с viewport; для effect cube —
     * та же геометрия граней, что и у эффекта куба).
     * За одну анимацию или кадр событие может прийти для нескольких слайдов (например perPage>1
     * или при кубе — до двух граней, пока идёт переход).
     * Для логики «текущий слайд» используйте slideChangeEnd / activeIndex, а не этот колбэк.
     * В обработчике опирайтесь на аргумент index, а не на activeIndex в момент вызова.
     */
    visible?: (slide: HTMLElement, index: number) => void
    /** Слайд вышел из видимой области (см. замечания к visible) */
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
    /** Видео загрузило метаданные и готово к воспроизведению */
    videoReady?: (data: VideoEvent) => void
    /** Видео начало воспроизведение */
    videoPlay?: (data: VideoEvent) => void
    /** Видео поставлено на паузу */
    videoPause?: (data: VideoEvent) => void
    /** Видео завершило воспроизведение */
    videoEnded?: (data: VideoEvent) => void
    /** Прогресс воспроизведения видео (0..1) */
    videoProgress?: (data: VideoProgressEvent) => void
    /** Прогресс активного сегмента (текущий слайд, 0..1) */
    autoplayProgress?: (data: AutoplayProgressEvent) => void
    /** Начало long press удержания */
    longPressStart?: (data: { index: number; pointerType: string }) => void
    /** Конец long press удержания */
    longPressEnd?: (data: { index: number; pointerType: string }) => void
    /** Слайдер стал видимым */
    sliderVisible?: () => void
    /** Слайдер скрыт */
    sliderHidden?: () => void
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- event handler args are untyped */
    [key: string]: ((...args: any[]) => void) | undefined
  }
}

