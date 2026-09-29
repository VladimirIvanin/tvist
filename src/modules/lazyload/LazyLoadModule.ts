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
import { createComponent, type Component } from '../Component';
import { addClass, removeClass, children } from '../../utils/dom';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
/**
 * Селектор для поиска изображений с lazy loading
 * Ищет img с data-src или data-srcset
 */
const IMAGE_SELECTOR = 'img[data-src], img[data-srcset]';
/**
 * Data-атрибуты для изображений
 */
const SRC_DATA_ATTRIBUTE = 'data-src';
const SRCSET_DATA_ATTRIBUTE = 'data-srcset';
/**
 * CSS класс для индикатора загрузки
 */
const SPINNER_CLASS = `${TVIST_CLASSES.block}__spinner`;
/**
 * CSS класс для слайда в процессе загрузки
 */
const LOADING_CLASS = `${TVIST_CLASSES.block}__slide--loading`;
/**
 * Запись о ленивом изображении
 * [изображение, индекс слайда, spinner элемент]
 */
type LazyLoadEntry = [HTMLImageElement, number, HTMLSpanElement];

/** Internal component; state lives in this factory's closure. */
export interface LazyLoadModule extends Component {
  readonly name: 'lazyload';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;

  onUpdate(): void;

  onSlideChange(): void;

  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  /**
   * Публичное API для ручной загрузки изображений
   */
  loadAll(): void;
  /**
   * Публичное API для загрузки изображений конкретного слайда
   */
  loadSlide(index: number): void;
}

export function createLazyLoadModule(tvist: Tvist, options: TvistOptions): LazyLoadModule {
  const base = createComponent(tvist, options);

  const local_name = 'lazyload' as const;
  /**
   * Очередь изображений для загрузки
   */
  let local_entries: LazyLoadEntry[] = [];
  /**
   * Количество слайдов для предзагрузки
   */
  let local_preloadPrevNext: number;

  function local_init(): void {
    if (!local_shouldBeActive()) {
      return;
    }
    local_register();
    local_setupEvents();
    local_check();
  }

  function local_destroy(): void {
    local_entries = [];
    local_removeSpinners();
  }

  function local_shouldBeActive(): boolean {
    // Модуль активен только если lazy явно включен (true или объект с настройками)
    return options.lazy !== false && options.lazy !== undefined && options.lazy !== null;
  }

  function local_onUpdate(): void {
    if (!local_shouldBeActive()) return;
    // При обновлении слайдера регистрируем новые изображения
    local_register();
    local_check();
  }

  function local_onSlideChange(): void {
    if (!local_shouldBeActive()) return;
    // При смене слайда проверяем, что нужно загрузить
    local_check();
  }

  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    // Если изменились настройки lazy
    if (newOptions.lazy !== undefined) {
      const lazy = newOptions.lazy;
      local_preloadPrevNext =
        typeof lazy === 'object' && lazy.preloadPrevNext !== undefined ? lazy.preloadPrevNext : 1;
      const wasActive = local_shouldBeActive();
      // Если lazy был выключен, а теперь включен
      if (!wasActive && newOptions.lazy !== false && newOptions.lazy !== undefined) {
        local_register();
        local_setupEvents();
        local_check();
      }
      // Если lazy был включен, а теперь выключен
      else if (wasActive && (newOptions.lazy === false || newOptions.lazy === undefined)) {
        local_destroy();
      }
    }
  }
  /**
   * Регистрация изображений для ленивой загрузки
   */
  function local_register(): void {
    const slides = tvist.slides;
    slides.forEach((slide, index) => {
      const images = children(slide).filter((el): el is HTMLImageElement =>
        el.matches(IMAGE_SELECTOR)
      );
      images.forEach((img) => {
        const dataSrc = img.getAttribute(SRC_DATA_ATTRIBUTE);
        const dataSrcset = img.getAttribute(SRCSET_DATA_ATTRIBUTE);
        // Проверяем, нужно ли грузить это изображение
        // Изображение нужно загрузить, если есть data-src или data-srcset
        if (dataSrc || dataSrcset) {
          // Проверяем, не зарегистрировано ли уже
          const alreadyRegistered = local_entries.some(([registeredImg]) => registeredImg === img);
          if (alreadyRegistered) return;
          // Создаём или находим spinner
          const parent = img.parentElement;
          if (!parent) return;
          let spinner = parent.querySelector<HTMLSpanElement>(`.${SPINNER_CLASS}`);
          if (!spinner) {
            spinner = document.createElement('span');
            spinner.className = SPINNER_CLASS;
            parent.appendChild(spinner);
          }
          // Добавляем в очередь
          local_entries.push([img, index, spinner]);
          // Скрываем изображение, если у него нет src
          if (!img.src) {
            img.style.display = 'none';
          }
        }
      });
    });
  }
  /**
   * Настройка событий
   */
  function local_setupEvents(): void {
    const scrollHandler = () => local_check();
    base.on('scroll', scrollHandler);
    base.on('slideChangeStart', () => local_check());
    base.on('slideChangeEnd', () => local_check());
  }
  /**
   * Проверка и загрузка изображений в зоне видимости.
   * Ранний выход, если очередь пуста — не нагружает RAF-цикл.
   */
  function local_check(): void {
    if (local_entries.length === 0) return;
    const activeIndex = tvist.activeIndex;
    const perPage = options.perPage ?? 1;
    // Вычисляем диапазон слайдов для загрузки
    const distance = perPage * (local_preloadPrevNext + 1) - 1;
    // Фильтруем entries и загружаем нужные
    local_entries = local_entries.filter((entry) => {
      const [, slideIndex] = entry;
      if (local_isWithinRange(slideIndex, activeIndex, distance)) {
        local_load(entry);
        return false; // Удаляем из очереди
      }
      return true; // Оставляем в очереди
    });
  }
  /**
   * Проверка, находится ли индекс в зоне загрузки
   */
  function local_isWithinRange(index: number, activeIndex: number, distance: number): boolean {
    const slides = tvist.slides;
    const totalSlides = slides.length;
    // Для loop режима нужно учитывать циклический диапазон
    if (
      options.loop === true ||
      (typeof options.loop === 'object' && options.loop.enabled !== false)
    ) {
      // Простая проверка для loop: загружаем всё в пределах distance
      const diff = Math.abs(index - activeIndex);
      return diff <= distance || diff >= totalSlides - distance;
    }
    // Для обычного режима
    return Math.abs(index - activeIndex) <= distance;
  }
  /**
   * Загрузка изображения
   */
  function local_load(entry: LazyLoadEntry): void {
    const [img, slideIndex, spinner] = entry;
    const slide = tvist.slides[slideIndex];
    if (!slide) return;
    // Добавляем класс загрузки
    addClass(slide, LOADING_CLASS);
    // Создаём обработчики для конкретного изображения
    const onLoad = () => {
      removeClass(slide, LOADING_CLASS);
      spinner.remove();
      img.style.display = '';
      // Emit события
      base.emit('lazyLoaded', img, slideIndex);
      // Убираем обработчики
      base.resources.unlisten(img, 'load', onLoad);
      base.resources.unlisten(img, 'error', onError);
    };
    const onError = () => {
      removeClass(slide, LOADING_CLASS);
      spinner.remove();
      // Emit события об ошибке
      base.emit('lazyLoadError', img, slideIndex);
      // Убираем обработчики
      base.resources.unlisten(img, 'load', onLoad);
      base.resources.unlisten(img, 'error', onError);
    };
    // Подписываемся на события
    base.resources.listen(img, 'load', onLoad);
    base.resources.listen(img, 'error', onError);
    // Устанавливаем src и srcset
    const src = img.getAttribute(SRC_DATA_ATTRIBUTE);
    const srcset = img.getAttribute(SRCSET_DATA_ATTRIBUTE);
    if (src) {
      img.src = src;
      img.removeAttribute(SRC_DATA_ATTRIBUTE);
    }
    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute(SRCSET_DATA_ATTRIBUTE);
    }
  }
  /**
   * Удаление всех спиннеров
   */
  function local_removeSpinners(): void {
    local_entries.forEach(([, , spinner]) => {
      spinner.remove();
    });
  }
  /**
   * Публичное API для ручной загрузки изображений
   */
  function local_loadAll(): void {
    // Загружаем все оставшиеся изображения
    const entriesToLoad = [...local_entries];
    local_entries = [];
    entriesToLoad.forEach((entry) => local_load(entry));
  }
  /**
   * Публичное API для загрузки изображений конкретного слайда
   */
  function local_loadSlide(index: number): void {
    const entriesToLoad = local_entries.filter(([, slideIndex]) => slideIndex === index);
    local_entries = local_entries.filter(([, slideIndex]) => slideIndex !== index);
    entriesToLoad.forEach((entry) => local_load(entry));
  }
  const component: LazyLoadModule = {
    get name() {
      return local_name;
    },
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.dispose();
      }
    },
    shouldBeActive: local_shouldBeActive,
    onUpdate: local_onUpdate,
    onSlideChange: local_onSlideChange,
    onOptionsUpdate: local_onOptionsUpdate,
    loadAll: local_loadAll,
    loadSlide: local_loadSlide,
  };
  // Определяем количество слайдов для предзагрузки
  const lazy = options.lazy;
  local_preloadPrevNext =
    typeof lazy === 'object' && lazy.preloadPrevNext !== undefined ? lazy.preloadPrevNext : 1;
  return component;
}
