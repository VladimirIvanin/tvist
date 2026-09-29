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
    // Если включен режим навигации (thumbnail mode)
    if (options.isNavigation) {
      local_initNavigation();
    }
  }

  function local_initNavigation(): void {
    // Добавляем класс модификатор на корневой элемент
    tvist.root.classList.add(TVIST_CLASSES.nav);
    const slides = tvist.slides;
    const listeners: (() => void)[] = [];
    const activeClass = TVIST_CLASSES.slideNavActive;
    // 1. Обработка кликов
    slides.forEach((slide, index) => {
      const handler = () => {
        if (tvist.options.isNavigation) {
          // Вызываем событие
          tvist.emit('navigation:click', index);
          if (index === tvist.activeIndex) {
            // Если индекс совпадает с текущим, но классы не обновлены (например, после drag с syncOnDrag: false),
            // принудительно обновляем классы и эмитим slideChangeStart для синхронизации с главным слайдером.
            updateClasses(index);
            tvist.emit('slideChangeStart', index);
          } else {
            // Переходим к слайду
            tvist.scrollTo(index);
          }
        }
      };
      base.resources.listen(slide, 'click', handler);
      listeners.push(() => base.resources.unlisten(slide, 'click', handler));
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
      slides.forEach((slide, i) => {
        if (i === index) {
          slide.classList.add(activeClass);
        } else {
          slide.classList.remove(activeClass);
        }
      });
    };
    // Подписываемся на изменение слайда
    base.on('slideChangeStart', updateClasses);
    base.on('slideChangeEnd', updateClasses); // На всякий случай дублируем для надежности
    // Начальное состояние
    base.on('created', () => {
      updateClasses(tvist.activeIndex);
    });
    // Если слайдер уже создан (например, модуль инициализирован позже)
    updateClasses(tvist.activeIndex);
  }

  function local_destroy(): void {
    local_removeClickListeners?.();
  }
  const component: ThumbsModule = {
    shouldBeActive: base.shouldBeActive,
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
  };

  return component;
}
