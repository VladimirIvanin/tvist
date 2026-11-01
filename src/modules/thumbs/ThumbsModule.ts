import type { TvistOptions } from '../../core/types';
/**
 * ThumbsModule
 * Реализует функционал навигации через миниатюры
 *
 * Опции:
 * - navigationMode: boolean - если true, делает слайды кликабельными и добавляет класс --nav-active
 */
import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';

/** Internal component; state lives in this factory's closure. */
export interface ThumbsModule extends Component {
  readonly name: 'thumbs';

  init(): void;

  destroy(): void;
}

export function createThumbsModule(tvist: Tvist, options: TvistOptions): ThumbsModule {
  const base = createComponent(tvist, options);

  const local_name = 'thumbs' as const;

  let local_removeClickListeners: (() => void) | undefined;

  function local_init(): void {
    const target = options.thumbs?.slider;
    if (target) {
      let syncing = false;
      const toThumb = (index: number, data?: { isDrag?: boolean }) => {
        if (syncing || (options.syncOnDrag === false && data?.isDrag)) return;
        syncing = true;
        try {
          target.scrollTo(index);
        } finally {
          syncing = false;
        }
      };
      const toMain = (index: number, data?: { isDrag?: boolean }) => {
        if (syncing || (target.options.syncOnDrag === false && data?.isDrag)) return;
        syncing = true;
        try {
          tvist.__tvistInternal_scrollTo(index);
        } finally {
          syncing = false;
        }
      };
      const onClick = (index: number, slide: HTMLElement) => {
        const logical = Number(slide.getAttribute('data-tvist-slide-index') ?? index);
        toMain(logical);
      };
      base.__tvistInternal_on('slideChangeStart', toThumb);
      target.on('slideChangeStart', toMain);
      target.on('click', onClick);
      base.__tvistInternal_resources.__tvistInternal_add(() => {
        target.off('slideChangeStart', toMain);
        target.off('click', onClick);
      });
    }
    // Если включен режим навигации (thumbnail mode)
    if (options.isNavigation) {
      local_initNavigation();
    }
  }

  function local_initNavigation(): void {
    // Добавляем класс модификатор на корневой элемент
    tvist.__tvistInternal_root.classList.add(TVIST_CLASSES.nav);
    const slides = tvist.__tvistInternal_slides;
    const listeners: (() => void)[] = [];
    const activeClass = TVIST_CLASSES.slideNavActive;
    // 1. Обработка кликов
    slides.forEach((slide) => {
      const handler = () => {
        if (tvist.__tvistInternal_options.isNavigation) {
          if (!tvist.__tvistInternal_allowClick) return;
          const logicalIndex = Number(
            slide.getAttribute('data-tvist-slide-index') ??
              tvist.__tvistInternal_slides.indexOf(slide)
          );
          // Вызываем событие
          tvist.__tvistInternal_emit('navigation:click', logicalIndex);
          if (logicalIndex === tvist.__tvistInternal_realIndex) {
            // Если индекс совпадает с текущим, но классы не обновлены (например, после drag с syncOnDrag: false),
            // принудительно обновляем классы и эмитим slideChangeStart для синхронизации с главным слайдером.
            updateClasses(logicalIndex);
            tvist.__tvistInternal_emit('slideChangeStart', logicalIndex);
          } else {
            // Переходим к слайду
            tvist.__tvistInternal_scrollTo(logicalIndex);
          }
        }
      };
      base.__tvistInternal_resources.__tvistInternal_listen(slide, 'click', handler);
      listeners.push(() =>
        base.__tvistInternal_resources.__tvistInternal_unlisten(slide, 'click', handler)
      );
    });
    local_removeClickListeners = () => {
      listeners.forEach((remove) => remove());
    };
    // 2. Обновление классов при изменении слайда
    const updateClasses = (
      index: number,
      data?: {
        isDrag?: boolean;
      }
    ) => {
      if (options.syncOnDrag === false && data?.isDrag) return;
      tvist.__tvistInternal_slides.forEach((slide, i) => {
        if (Number(slide.getAttribute('data-tvist-slide-index') ?? i) === index) {
          slide.classList.add(activeClass);
        } else {
          slide.classList.remove(activeClass);
        }
      });
    };
    // Подписываемся на изменение слайда
    base.__tvistInternal_on('slideChangeStart', updateClasses);
    base.__tvistInternal_on('slideChangeEnd', updateClasses); // На всякий случай дублируем для надежности
    // Начальное состояние
    base.__tvistInternal_on('created', () => {
      updateClasses(tvist.__tvistInternal_activeIndex);
    });
    // Если слайдер уже создан (например, модуль инициализирован позже)
    updateClasses(tvist.__tvistInternal_activeIndex);
  }

  function local_destroy(): void {
    local_removeClickListeners?.();
  }
  const component: ThumbsModule = {
    shouldBeActive: base.__tvistInternal_shouldBeActive,
    get name() {
      return local_name;
    },
    init: local_init,
    onOptionsUpdate: (updates) => {
      if (updates.thumbs !== undefined || updates.isNavigation !== undefined) {
        local_removeClickListeners?.();
        base.__tvistInternal_resources.__tvistInternal_clear();
        local_init();
      }
    },
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
  };

  return component;
}
