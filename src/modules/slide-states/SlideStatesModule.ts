/**
 * SlideStatesModule - управление классами состояний слайдов
 * Применяет BEM-модификаторы: --active, --prev, --next, --visible (tvist-v1__slide--*)
 */
import { createComponent, type Component } from '../Component';
import { getCubeSlidesInRange } from '../effects/cubeSlideInRange';
import { TVIST_CLASSES } from '../../core/constants';
import { isFirefox } from '../../utils/browser';
import {
  forceEagerLoadingForLazyImages,
  resolveNativeLazyAdjacentConfig,
} from '../../utils/nativeLazyImages';
import { findSlideByRealIndex } from '../../utils/slideRealIndex';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';

/** Internal component; state lives in this factory's closure. */
export interface SlideStatesModule extends Component {
  readonly name: 'slide-states';

  init(): void;

  onUpdate(): void;

  destroy(): void;
}

export function createSlideStatesModule(tvist: Tvist, options: TvistOptions): SlideStatesModule {
  const base = createComponent(tvist, options);

  const local_name = 'slide-states' as const;
  // Классы состояний
  const local_CLASS_ACTIVE: `tvist-v${number}__slide--active` = TVIST_CLASSES.slideActive;

  const local_CLASS_PREV: `tvist-v${number}__slide--prev` = TVIST_CLASSES.slidePrev;

  const local_CLASS_NEXT: `tvist-v${number}__slide--next` = TVIST_CLASSES.slideNext;

  const local_CLASS_VISIBLE: `tvist-v${number}__slide--visible` = TVIST_CLASSES.slideVisible;
  // RAF батчинг для updateVisibleClasses
  let local_visibilityUpdateScheduled = false;

  let local_visibilityRafId: number | null = null;
  // Кеш декодированных изображений (WeakMap для автоматической очистки памяти)
  const local_decodedImages: WeakMap<HTMLImageElement, boolean> = new WeakMap<
    HTMLImageElement,
    boolean
  >();
  // Флаги полностью предзагруженных слайдов (WeakMap для автоматической очистки памяти)
  const local_preloadedSlides: WeakMap<HTMLElement, boolean> = new WeakMap<HTMLElement, boolean>();

  let local_nativeLazyBeforeSlideChange: ((targetRealIndex: number) => void) | null = null;
  /** У клонов одинаковый data-tvist-slide-index — active/prev/next только по DOM. */
  function local_isLoopWithClonesEnabled(): boolean {
    const l = options.loop;
    return typeof l === 'object' && l !== null && l.withClones === true && l.enabled !== false;
  }

  function local_init(): void {
    // Применяем Firefox фикс ко всем изображениям при инициализации
    local_applyFirefoxImageFix();
    // Обновляем классы при создании
    local_updateActiveClasses();
    local_updateVisibleClasses();
    const nativeLazyCfg = resolveNativeLazyAdjacentConfig(options.nativeLazyAdjacent);
    if (nativeLazyCfg?.onInit) {
      local_applyNativeLazyAdjacentOnInit();
    }
    if (nativeLazyCfg?.onTransitionStart) {
      local_nativeLazyBeforeSlideChange = (targetRealIndex: number) => {
        const cfg = resolveNativeLazyAdjacentConfig(options.nativeLazyAdjacent);
        if (!cfg?.onTransitionStart) return;
        const slide = findSlideByRealIndex(tvist.slides, targetRealIndex);
        if (slide) {
          forceEagerLoadingForLazyImages(slide);
        }
      };
      tvist.on('beforeSlideChange', local_nativeLazyBeforeSlideChange);
    }
    // slideChangeStart: обновляем active/prev/next + visible (синхронно)
    tvist.on('slideChangeStart', () => {
      local_updateActiveClasses();
      local_updateVisibleClasses();
    });
    // slideChangeEnd: обновляем только visible (финальная позиция после анимации)
    tvist.on('slideChangeEnd', () => local_updateVisibleClasses());
    // scroll (каждый тик анимации): обновляем visible через RAF-батчинг для экономии CPU
    tvist.on('scroll', () => local_scheduleVisibilityUpdate());
  }

  function local_onUpdate(): void {
    local_updateActiveClasses();
    local_updateVisibleClasses();
  }
  /**
   * Запланировать обновление видимости через RAF (батчинг).
   * Математический расчёт не вызывает reflow, но RAF гарантирует
   * максимум один пересчёт классов на кадр при частых scroll-событиях.
   */
  function local_scheduleVisibilityUpdate(): void {
    if (local_visibilityUpdateScheduled) return;
    local_visibilityUpdateScheduled = true;
    local_visibilityRafId = base.resources.frame(() => {
      local_visibilityUpdateScheduled = false;
      local_updateVisibleClasses();
    });
  }
  /**
   * Применить Firefox фикс ко всем изображениям в слайдере.
   * Добавляет атрибут decoding="sync" для предотвращения задержки отрисовки.
   */
  function local_applyFirefoxImageFix(): void {
    const firefoxFix = options.browserFixes?.firefoxImageDecoding ?? true;
    if (!isFirefox || !firefoxFix) {
      return;
    }
    // Проходим по всем слайдам и добавляем атрибут ко всем изображениям
    tvist.slides.forEach((slide) => {
      const images = slide.querySelectorAll<HTMLImageElement>('img');
      images.forEach((img) => {
        if (!local_hasImageSource(img)) {
          return;
        }
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'sync');
        }
      });
    });
  }
  /**
   * Принудительный eager для img[loading=lazy] у соседних слайдов после init.
   */
  function local_applyNativeLazyAdjacentOnInit(): void {
    const slides = tvist.slides;
    const activeIndex = tvist.activeIndex;
    const activeSlide = slides[activeIndex];
    if (!activeSlide) return;
    const len = slides.length;
    if (len === 0) return;
    if (local_isLoopWithClonesEnabled()) {
      const prevDom = (activeIndex - 1 + len) % len;
      const nextDom = (activeIndex + 1) % len;
      slides.forEach((slide, index) => {
        if (index === prevDom || index === nextDom) {
          forceEagerLoadingForLazyImages(slide);
        }
      });
      return;
    }
    const activeAttr = activeSlide.getAttribute('data-tvist-slide-index');
    const isLoop =
      activeAttr !== null ||
      options.loop === true ||
      (typeof options.loop === 'object' && options.loop.enabled !== false);
    let activeLogicalIndex = activeIndex;
    const originalCount = slides.length;
    if (activeAttr !== null) {
      activeLogicalIndex = parseInt(activeAttr, 10);
    }
    let prevTargetIndex = activeLogicalIndex - 1;
    let nextTargetIndex = activeLogicalIndex + 1;
    if (isLoop) {
      prevTargetIndex = (activeLogicalIndex - 1 + originalCount) % originalCount;
      nextTargetIndex = (activeLogicalIndex + 1) % originalCount;
    }
    slides.forEach((slide, index) => {
      let currentLogicalIndex = index;
      if (isLoop) {
        const attr = slide.getAttribute('data-tvist-slide-index');
        if (attr !== null) {
          currentLogicalIndex = parseInt(attr, 10);
        }
      }
      const isPrev = isLoop ? currentLogicalIndex === prevTargetIndex : index === activeIndex - 1;
      const isNext = isLoop ? currentLogicalIndex === nextTargetIndex : index === activeIndex + 1;
      if (isPrev || isNext) {
        forceEagerLoadingForLazyImages(slide);
      }
    });
  }
  /**
   * Проверяет, что у изображения задан непустой src или srcset.
   */
  function local_hasImageSource(img: HTMLImageElement): boolean {
    const src = img.getAttribute('src')?.trim() ?? '';
    const srcset = img.getAttribute('srcset')?.trim() ?? '';
    return src.length > 0 || srcset.length > 0;
  }
  /**
   * Предварительное декодирование изображений в слайде.
   * Предотвращает "белые вспышки" при переходе между слайдами.
   * Поддерживает <img> и <picture> элементы. Использует кеш.
   */
  async function local_preloadSlideImages(slide: HTMLElement): Promise<void> {
    // Если слайд уже полностью предзагружен, пропускаем
    if (local_preloadedSlides.has(slide)) {
      return;
    }
    const images = slide.querySelectorAll<HTMLImageElement>('img');
    const decodePromises: Promise<void>[] = [];
    images.forEach((img) => {
      if (!local_hasImageSource(img)) {
        return;
      }
      // Декодируем только загруженные и ещё не декодированные изображения
      if (img.complete && img.naturalWidth > 0 && !local_decodedImages.has(img)) {
        if ('decode' in img) {
          decodePromises.push(
            img
              .decode()
              .then(() => {
                local_decodedImages.set(img, true);
              })
              .catch(() => undefined) // Игнорируем ошибки
          );
        }
      }
    });
    await Promise.all(decodePromises).catch(() => undefined);
    // Помечаем слайд как полностью предзагруженный, если все изображения обработаны
    // (либо декодированы, либо не требуют декодирования)
    local_preloadedSlides.set(slide, true);
  }
  /**
   * Обновление классов активного, предыдущего и следующего слайдов
   */
  function local_updateActiveClasses(): void {
    const slides = tvist.slides;
    const activeIndex = tvist.activeIndex;
    const activeSlide = slides[activeIndex];
    if (!activeSlide) return;
    // Массив для сбора промисов декодирования
    const preloadPromises: Promise<void>[] = [];
    const len = slides.length;
    if (local_isLoopWithClonesEnabled() && len > 0) {
      const prevDom = (activeIndex - 1 + len) % len;
      const nextDom = (activeIndex + 1) % len;
      slides.forEach((slide, index) => {
        local_toggleClass(slide, local_CLASS_ACTIVE, index === activeIndex);
        local_toggleClass(slide, local_CLASS_PREV, index === prevDom);
        local_toggleClass(slide, local_CLASS_NEXT, index === nextDom);
        if (index === prevDom || index === nextDom) {
          preloadPromises.push(local_preloadSlideImages(slide));
        }
      });
      if (preloadPromises.length > 0) {
        Promise.all(preloadPromises).catch(() => undefined);
      }
      return;
    }
    // Режим Loop: по атрибуту на слайде (после инита Loop) или по опции (до проставления атрибутов)
    const activeAttr = activeSlide.getAttribute('data-tvist-slide-index');
    const isLoop =
      activeAttr !== null ||
      options.loop === true ||
      (typeof options.loop === 'object' && options.loop.enabled !== false);
    let activeLogicalIndex = activeIndex;
    const originalCount = slides.length;
    if (activeAttr !== null) {
      activeLogicalIndex = parseInt(activeAttr, 10);
    }
    // Вычисляем целевые логические индексы для prev/next
    let prevTargetIndex = activeLogicalIndex - 1;
    let nextTargetIndex = activeLogicalIndex + 1;
    if (isLoop) {
      // В loop режиме индексы циклические относительно originalCount
      prevTargetIndex = (activeLogicalIndex - 1 + originalCount) % originalCount;
      nextTargetIndex = (activeLogicalIndex + 1) % originalCount;
    }
    slides.forEach((slide, index) => {
      let currentLogicalIndex = index;
      // В режиме loop используем логический индекс из атрибута
      if (isLoop) {
        const attr = slide.getAttribute('data-tvist-slide-index');
        if (attr !== null) {
          currentLogicalIndex = parseInt(attr, 10);
        }
      }
      // Проверяем совпадение
      const isActive = currentLogicalIndex === activeLogicalIndex;
      let isPrev = false;
      let isNext = false;
      if (isLoop) {
        // В loop без клонов у каждого DOM-узла свой realIndex — логика корректна
        isPrev = currentLogicalIndex === prevTargetIndex;
        isNext = currentLogicalIndex === nextTargetIndex;
      } else {
        // В обычном режиме сравниваем физические индексы
        isPrev = index === activeIndex - 1;
        isNext = index === activeIndex + 1;
      }
      // Классы active/prev/next проставляются независимо от видимости
      // (даже если слайд находится вне viewport)
      local_toggleClass(slide, local_CLASS_ACTIVE, isActive);
      local_toggleClass(slide, local_CLASS_PREV, isPrev);
      local_toggleClass(slide, local_CLASS_NEXT, isNext);
      // Собираем промисы декодирования для prev/next слайдов
      if (isPrev || isNext) {
        preloadPromises.push(local_preloadSlideImages(slide));
      }
    });
    // Запускаем декодирование в фоне (не блокируем основной поток)
    // Промисы выполнятся асинхронно, но мы не ждём их завершения
    if (preloadPromises.length > 0) {
      Promise.all(preloadPromises).catch(() => undefined);
    }
  }
  /**
   * Обновление классов видимости слайдов.
   * Использует математический расчёт через Engine.getVisibleSlides() вместо
   * getBoundingClientRect(), что исключает forced reflow во время анимации.
   *
   * Несколько слайдов могут стать «видимыми» одновременно (пересечение с viewport; для cube —
   * маска из getCubeSlidesInRange, как в setCubeEffect). emit('visible') — для каждого слайда отдельно.
   */
  function local_updateVisibleClasses(): void {
    const slides = tvist.slides;
    const visibleFlags =
      options.effect === 'cube'
        ? getCubeSlidesInRange(
            tvist.__tvistInternal_engine.__tvistInternal_location.get(),
            tvist.__tvistInternal_engine.__tvistInternal_slideSizeValue,
            slides.length
          )
        : tvist.__tvistInternal_engine.__tvistInternal_getVisibleSlides();
    slides.forEach((slide, index) => {
      const isVisible = visibleFlags[index] ?? false;
      const hadVisible = slide.classList.contains(local_CLASS_VISIBLE);
      if (isVisible && !hadVisible) {
        slide.classList.add(local_CLASS_VISIBLE);
        tvist.emit('visible', slide, index);
      } else if (!isVisible && hadVisible) {
        slide.classList.remove(local_CLASS_VISIBLE);
        tvist.emit('hidden', slide, index);
      }
    });
  }
  /**
   * Переключение класса элемента
   */
  function local_toggleClass(element: HTMLElement, className: string, condition: boolean): void {
    if (condition && !element.classList.contains(className)) {
      element.classList.add(className);
    } else if (!condition && element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }

  function local_destroy(): void {
    if (local_visibilityRafId !== null) {
      base.resources.cancelFrame(local_visibilityRafId);
      local_visibilityRafId = null;
    }
    if (local_nativeLazyBeforeSlideChange) {
      tvist.off('beforeSlideChange', local_nativeLazyBeforeSlideChange);
      local_nativeLazyBeforeSlideChange = null;
    }
    tvist.slides.forEach((slide) => {
      slide.classList.remove(
        local_CLASS_ACTIVE,
        local_CLASS_PREV,
        local_CLASS_NEXT,
        local_CLASS_VISIBLE
      );
    });
    // decodedImages и preloadedSlides (WeakMap) очистятся автоматически при удалении элементов
  }
  const component: SlideStatesModule = {
    shouldBeActive: base.shouldBeActive,
    get name() {
      return local_name;
    },
    init: local_init,
    onUpdate: local_onUpdate,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.dispose();
      }
    },
  };

  return component;
}
