import { loopEnabled, pageCount } from '../../utils/positions';
/**
 * Navigation Module
 *
 * Возможности:
 * - Стрелки prev/next
 * - Disabled состояния на границах
 * - Hidden когда слайдов мало
 * - Accessibility (aria-label)
 * - Кастомные элементы, поиск и автоматическое создание
 */
import { createComponent, type Component } from '../Component';
import {
  TVIST_CLASSES,
  NAVIGATION_ARROW_NEXT_SVG,
  NAVIGATION_ARROW_PREV_SVG,
} from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';

/** Internal component; state lives in this factory's closure. */
export interface NavigationModule extends Component {
  readonly name: 'navigation';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Хук при обновлении
   */
  onUpdate(): void;
}

export function createNavigationModule(tvist: Tvist, options: TvistOptions): NavigationModule {
  const base = createComponent(tvist, options);

  const local_name = 'navigation' as const;

  let local_prevButton: HTMLElement | null = null;

  let local_nextButton: HTMLElement | null = null;

  const local_createdButtons: HTMLButtonElement[] = [];

  const local_stateChangeHandler: () => void = () => local_updateArrowsState();

  let local_prevClickHandler: (() => void) | undefined;

  let local_nextClickHandler: (() => void) | undefined;

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_findOrCreateArrows();
    if (!local_prevButton || !local_nextButton) {
      if (options.debug) {
        console.warn('Tvist Navigation: arrows not found');
      }
      return;
    }
    local_injectArrowIcons();
    local_attachEvents();
    local_updateArrowsState();
    base.emit('navigation:mounted');
    // Обновляем состояние при изменении слайда
    base.on('slideChangeEnd', local_stateChangeHandler);
    // После анимации (в т.ч. когда индекс не менялся, но translate дошёл до упора)
    base.on('transitionEnd', local_stateChangeHandler);
    // Обновляем состояние при lock/unlock (для breakpoints)
    base.on('lock', local_stateChangeHandler);
    base.on('unlock', local_stateChangeHandler);
  }

  function local_destroy(): void {
    local_detachEvents();
    base.off('slideChangeEnd', local_stateChangeHandler);
    base.off('transitionEnd', local_stateChangeHandler);
    base.off('lock', local_stateChangeHandler);
    base.off('unlock', local_stateChangeHandler);
    local_createdButtons.forEach((button) => button.remove());
    local_createdButtons.length = 0;
    local_prevButton = null;
    local_nextButton = null;
    local_prevClickHandler = undefined;
    local_nextClickHandler = undefined;
  }

  function local_shouldBeActive(): boolean {
    const { arrows } = options;
    return !!arrows;
  }
  /**
   * Поиск или создание стрелок
   */
  function local_findOrCreateArrows(): void {
    const arrows = options.arrows;
    if (typeof arrows === 'object' && arrows !== null) {
      // Кастомные элементы из опций
      if (arrows.prev) {
        if (typeof arrows.prev === 'string') {
          local_prevButton = document.querySelector(arrows.prev);
        } else if (arrows.prev instanceof HTMLElement) {
          local_prevButton = arrows.prev;
        }
      }
      if (arrows.next) {
        if (typeof arrows.next === 'string') {
          local_nextButton = document.querySelector(arrows.next);
        } else if (arrows.next instanceof HTMLElement) {
          local_nextButton = arrows.next;
        }
      }
    }
    // Ищем по стандартным классам только элементы этого слайдера.
    local_prevButton ??= base.findOwnElement(`.${TVIST_CLASSES.arrowPrev}`);
    local_nextButton ??= base.findOwnElement(`.${TVIST_CLASSES.arrowNext}`);
    local_prevButton ??= local_createArrow('prev');
    local_nextButton ??= local_createArrow('next');
  }
  /** Создаёт недостающую стрелку вне трека и запоминает её для удаления. */
  function local_createArrow(direction: 'prev' | 'next'): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${TVIST_CLASSES.block}__arrow ${direction === 'prev' ? TVIST_CLASSES.arrowPrev : TVIST_CLASSES.arrowNext}`;
    button.setAttribute(
      'aria-label',
      direction === 'prev' ? 'Предыдущий слайд' : 'Следующий слайд'
    );
    tvist.root.appendChild(button);
    local_createdButtons.push(button);
    return button;
  }
  /**
   * Вставка SVG иконок в кнопки навигации
   * 1. Проверяем опцию addIcons (по умолчанию true)
   * 2. Проверяем, что кнопка имеет класс стрелки (prev/next)
   * 3. Проверяем, что в кнопке нет дочерних элементов (пользователь не добавил свой контент)
   */
  function local_injectArrowIcons(): void {
    const arrows = options.arrows;
    const addIcons =
      typeof arrows === 'object' && arrows !== null ? (arrows.addIcons ?? true) : true;
    if (!addIcons) return;
    local_injectIconIntoButton(local_prevButton, 'prev');
    local_injectIconIntoButton(local_nextButton, 'next');
  }
  /**
   * Вставка иконки в конкретную кнопку
   */
  function local_injectIconIntoButton(
    button: HTMLElement | null,
    direction: 'prev' | 'next'
  ): void {
    if (!button) return;
    const arrowClass = direction === 'prev' ? TVIST_CLASSES.arrowPrev : TVIST_CLASSES.arrowNext;
    // Проверяем что кнопка имеет класс стрелки
    if (!button.classList.contains(arrowClass)) return;
    // Проверяем что в кнопке нет дочерних элементов (пользователь не добавил свой контент)
    if (button.children.length > 0) return;
    // Проверяем что в кнопке нет текстового контента
    const textContent = button.textContent?.trim();
    if (textContent && textContent.length > 0) return;
    // Вставляем SVG
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML =
      direction === 'prev' ? NAVIGATION_ARROW_PREV_SVG : NAVIGATION_ARROW_NEXT_SVG;
    const svgElement = tempDiv.querySelector('svg');
    if (svgElement) {
      button.appendChild(svgElement);
    }
  }
  /**
   * Подключение обработчиков
   */
  function local_attachEvents(): void {
    if (!local_prevButton || !local_nextButton) return;
    local_prevClickHandler = () => local_onPrevClick();
    local_nextClickHandler = () => local_onNextClick();
    base.resources.listen(local_prevButton, 'click', local_prevClickHandler);
    base.resources.listen(local_nextButton, 'click', local_nextClickHandler);
  }
  /**
   * Отключение обработчиков
   */
  function local_detachEvents(): void {
    if (local_prevButton && local_prevClickHandler) {
      base.resources.unlisten(local_prevButton, 'click', local_prevClickHandler);
    }
    if (local_nextButton && local_nextClickHandler) {
      base.resources.unlisten(local_nextButton, 'click', local_nextClickHandler);
    }
  }
  /**
   * Атрибут `disabled` в HTML допустим для button/input/select/textarea и др.
   * Для ссылок и div с классом стрелки он невалиден — опираемся на aria-disabled и класс.
   */
  function local_supportsNativeDisabled(el: HTMLElement): boolean {
    const t = el.tagName.toLowerCase();
    return (
      t === 'button' ||
      t === 'input' ||
      t === 'select' ||
      t === 'textarea' ||
      t === 'optgroup' ||
      t === 'option' ||
      t === 'fieldset'
    );
  }

  function local_isArrowDisabled(arrow: HTMLElement | null): boolean {
    return arrow?.getAttribute('aria-disabled') === 'true';
  }
  /**
   * Клик на prev
   */
  function local_onPrevClick(): void {
    if (local_isArrowDisabled(local_prevButton)) return;
    tvist.prev();
  }
  /**
   * Клик на next
   */
  function local_onNextClick(): void {
    if (local_isArrowDisabled(local_nextButton)) return;
    tvist.next();
  }
  /**
   * Вычисляет количество страниц с учетом perPage и slidesPerGroup
   */
  function local_calculatePageCount(): number {
    return pageCount(
      tvist.slides.length,
      options.perPage ?? 1,
      options.slidesPerGroup ?? 1,
      loopEnabled(options.loop)
    );
  }
  /**
   * Обновление состояния стрелок
   */
  function local_updateArrowsState(): void {
    if (!local_prevButton || !local_nextButton) return;
    const { canScrollPrev, canScrollNext } = tvist;
    const arrows = options.arrows;
    const disabledClass =
      typeof arrows === 'object' && arrows !== null
        ? (arrows.disabledClass ?? TVIST_CLASSES.arrowDisabled)
        : TVIST_CLASSES.arrowDisabled;
    const hiddenClass =
      typeof arrows === 'object' && arrows !== null
        ? (arrows.hiddenClass ?? TVIST_CLASSES.arrowHidden)
        : TVIST_CLASSES.arrowHidden;
    const hideWhenSinglePage =
      typeof arrows === 'object' && arrows !== null ? (arrows.hideWhenSinglePage ?? true) : true;
    // Если слайдер заблокирован (контент влезает), отключаем стрелки
    if (tvist.__tvistInternal_engine.__tvistInternal_isLocked) {
      local_disableArrow(local_prevButton, disabledClass);
      local_disableArrow(local_nextButton, disabledClass);
      // Скрываем только если hideWhenSinglePage включен
      if (hideWhenSinglePage) {
        local_hideArrow(local_prevButton, hiddenClass);
        local_hideArrow(local_nextButton, hiddenClass);
        local_updateRootClass(true);
      } else {
        local_showArrow(local_prevButton, hiddenClass);
        local_showArrow(local_nextButton, hiddenClass);
        local_updateRootClass(false);
      }
      return;
    }
    // Проверяем количество страниц для hideWhenSinglePage
    const pageCount = local_calculatePageCount();
    if (hideWhenSinglePage && pageCount <= 1) {
      local_hideArrow(local_prevButton, hiddenClass);
      local_hideArrow(local_nextButton, hiddenClass);
      local_updateRootClass(true);
      return;
    }
    // Показываем стрелки (убираем класс single-page)
    local_updateRootClass(false);
    const loopEnabled =
      options.loop === true || (typeof options.loop === 'object' && options.loop.enabled !== false);
    // С loop или rewind всегда можно листать (если не заблокирован)
    if (loopEnabled || options.rewind) {
      local_enableArrow(local_prevButton, disabledClass);
      local_enableArrow(local_nextButton, disabledClass);
      local_showArrow(local_prevButton, hiddenClass);
      local_showArrow(local_nextButton, hiddenClass);
      return;
    }
    // Показываем обе стрелки (они не single-page и не locked)
    local_showArrow(local_prevButton, hiddenClass);
    local_showArrow(local_nextButton, hiddenClass);
    // Без loop и rewind проверяем границы для disabled состояния
    if (canScrollPrev) {
      local_enableArrow(local_prevButton, disabledClass);
    } else {
      local_disableArrow(local_prevButton, disabledClass);
    }
    if (canScrollNext) {
      local_enableArrow(local_nextButton, disabledClass);
    } else {
      local_disableArrow(local_nextButton, disabledClass);
    }
  }
  /**
   * Обновление класса single-page на root элементе
   */
  function local_updateRootClass(isSinglePage: boolean): void {
    if (isSinglePage) {
      tvist.root.classList.add(TVIST_CLASSES.singlePage);
    } else {
      tvist.root.classList.remove(TVIST_CLASSES.singlePage);
    }
  }
  /**
   * Включить стрелку
   */
  function local_enableArrow(arrow: HTMLElement, disabledClass: string): void {
    arrow.removeAttribute('disabled');
    arrow.classList.remove(disabledClass);
    arrow.setAttribute('aria-disabled', 'false');
  }
  /**
   * Выключить стрелку
   */
  function local_disableArrow(arrow: HTMLElement, disabledClass: string): void {
    if (local_supportsNativeDisabled(arrow)) {
      arrow.setAttribute('disabled', '');
    } else {
      arrow.removeAttribute('disabled');
    }
    arrow.classList.add(disabledClass);
    arrow.setAttribute('aria-disabled', 'true');
  }
  /**
   * Показать стрелку
   */
  function local_showArrow(arrow: HTMLElement, hiddenClass: string): void {
    arrow.classList.remove(hiddenClass);
    arrow.setAttribute('aria-hidden', 'false');
  }
  /**
   * Скрыть стрелку
   */
  function local_hideArrow(arrow: HTMLElement, hiddenClass: string): void {
    arrow.classList.add(hiddenClass);
    arrow.setAttribute('aria-hidden', 'true');
  }
  /**
   * Хук при обновлении
   */
  function local_onUpdate(): void {
    local_updateArrowsState();
  }
  const component: NavigationModule = {
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
  };

  return component;
}
