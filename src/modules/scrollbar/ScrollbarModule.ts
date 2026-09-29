/**
 * Scrollbar - модуль кастомного скроллбара для навигации слайдера
 * Поддерживает горизонтальное и вертикальное направление
 */
import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
interface ScrollbarOptions {
  /** Селектор или элемент для контейнера скроллбара */
  container?: string | HTMLElement;
  /** Автоматически скрывать скроллбар при бездействии */
  hide?: boolean;
  /** Задержка перед скрытием (мс) */
  hideDelay?: number;
  /** CSS класс для скроллбара */
  scrollbarClass?: string;
  /** CSS класс для трека скроллбара */
  trackClass?: string;
  /** CSS класс для ползунка */
  thumbClass?: string;
  /** Возможность перетаскивания ползунка */
  draggable?: boolean;
}

/** Internal component; state lives in this factory's closure. */
export interface ScrollbarModule extends Component {
  readonly name: 'Scrollbar';
  /**
   * Проверить, должен ли модуль быть активен
   */
  shouldBeActive(): boolean;

  init(): void;
  /**
   * Хук обновления
   */
  onUpdate(): void;
  /**
   * Хук обновления опций
   */
  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;

  destroy(): void;
}

export function createScrollbarModule(tvist: Tvist, options: TvistOptions): ScrollbarModule {
  const base = createComponent(tvist, options);

  const local_name = 'Scrollbar' as const;
  // DOM элементы
  let local_scrollbarEl: HTMLElement | undefined;

  let local_trackEl: HTMLElement | undefined;

  let local_thumbEl: HTMLElement | undefined;

  let local_isCustomContainer = false;
  // Настройки
  let local_hide: boolean;

  let local_hideDelay: number;

  let local_draggable: boolean;
  // Состояние
  let local_isDragging = false;

  let local_dragStartX = 0;

  let local_dragStartY = 0;

  let local_dragStartScroll = 0;

  let local_hideTimer: number | undefined;
  // Мемоизация: последние применённые значения для пропуска лишних DOM-записей
  let local__lastPositionPercent = -1;

  let local__lastThumbSizePercent = -1;
  /**
   * Получить опции scrollbar из конфигурации
   */
  function local_getScrollbarOptions(): ScrollbarOptions {
    const scrollbar = options.scrollbar;
    if (typeof scrollbar === 'boolean') {
      return {};
    }
    return scrollbar ?? {};
  }
  /**
   * Проверить, должен ли модуль быть активен
   */
  function local_shouldBeActive(): boolean {
    return options.scrollbar !== false && options.scrollbar !== undefined;
  }

  function local_init(): void {
    if (!local_shouldBeActive()) {
      return;
    }
    local_createScrollbar();
    local_attachEventListeners();
    local_updateScrollbar();
  }
  /**
   * Создать элементы скроллбара
   */
  function local_createScrollbar(): void {
    const scrollbarOptions = local_getScrollbarOptions();
    const isVertical = options.direction === 'vertical';
    // Проверяем, указан ли кастомный контейнер
    if (scrollbarOptions.container) {
      const container =
        typeof scrollbarOptions.container === 'string'
          ? document.querySelector<HTMLElement>(scrollbarOptions.container)
          : scrollbarOptions.container;
      if (container) {
        local_scrollbarEl = container;
        local_isCustomContainer = true;
      }
    }
    // Если кастомный контейнер не указан, создаём свой
    if (!local_scrollbarEl) {
      local_scrollbarEl = document.createElement('div');
      local_scrollbarEl.className = scrollbarOptions.scrollbarClass ?? TVIST_CLASSES.scrollbar;
      // Добавляем класс направления
      if (isVertical) {
        local_scrollbarEl.classList.add(TVIST_CLASSES.scrollbarVertical);
      } else {
        local_scrollbarEl.classList.add(TVIST_CLASSES.scrollbarHorizontal);
      }
      tvist.root.appendChild(local_scrollbarEl);
    }
    // Создаём трек и ползунок
    local_trackEl = document.createElement('div');
    local_trackEl.className = scrollbarOptions.trackClass ?? TVIST_CLASSES.scrollbarTrack;
    local_thumbEl = document.createElement('div');
    local_thumbEl.className = scrollbarOptions.thumbClass ?? TVIST_CLASSES.scrollbarThumb;
    local_trackEl.appendChild(local_thumbEl);
    local_scrollbarEl.appendChild(local_trackEl);
    // Применяем класс hide если нужно
    if (local_hide) {
      local_scrollbarEl.classList.add(TVIST_CLASSES.scrollbarHidden);
    }
  }
  /**
   * Прикрепить обработчики событий
   */
  function local_attachEventListeners(): void {
    if (!local_scrollbarEl || !local_thumbEl || !local_trackEl) return;
    // Клик по треку (переход к позиции)
    base.resources.listen(local_trackEl, 'click', local_handleTrackClick);
    // Перетаскивание ползунка
    if (local_draggable) {
      if ('PointerEvent' in window) {
        base.resources.listen(local_thumbEl, 'pointerdown', local_handleThumbPointerDown);
      } else {
        base.resources.listen(local_thumbEl, 'mousedown', local_handleThumbMouseDown);
        base.resources.listen(local_thumbEl, 'touchstart', local_handleThumbTouchStart, {
          passive: false,
        });
      }
    }
    // События слайдера
    base.on('scroll', local_handleScroll);
    base.on('slideChangeEnd', local_handleSlideChanged);
    // Автоскрытие (показать при наведении, скрыть по таймеру)
    local_updateAutoHideListeners();
  }
  /**
   * Обработчик клика по треку
   */
  const local_handleTrackClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
    if (!local_trackEl || !local_thumbEl) return;
    if (event.target === local_thumbEl) return; // Игнорируем клик по ползунку
    const isVertical = options.direction === 'vertical';
    const rect = local_trackEl.getBoundingClientRect();
    let clickPosition: number;
    let trackSize: number;
    if (isVertical) {
      clickPosition = event.clientY - rect.top;
      trackSize = rect.height;
    } else {
      clickPosition = event.clientX - rect.left;
      trackSize = rect.width;
    }
    // Вычисляем процент клика
    const percent = clickPosition / trackSize;
    // Вычисляем целевой индекс
    const slideCount = tvist.slides.length;
    const targetIndex = Math.round(percent * (slideCount - 1));
    // Переходим к слайду
    tvist.__tvistInternal_engine.__tvistInternal_scrollTo(targetIndex);
  };
  /**
   * Обработчик начала перетаскивания (Pointer API — мышь + тач)
   */
  const local_handleThumbPointerDown: (event: PointerEvent) => void = (
    event: PointerEvent
  ): void => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Останавливаем всплытие чтобы DragModule не перехватил событие
    event.stopPropagation();
    event.preventDefault();
    local_startDrag(event.clientX, event.clientY);
    base.resources.listen(document, 'pointermove', local_handleThumbPointerMove);
    base.resources.listen(document, 'pointerup', local_handleThumbPointerUp);
  };
  /**
   * Обработчик движения (Pointer API)
   */
  const local_handleThumbPointerMove: (event: PointerEvent) => void = (
    event: PointerEvent
  ): void => {
    if (!local_isDragging) return;
    event.preventDefault();
    local_updateDrag(event.clientX, event.clientY);
  };
  /**
   * Завершить перетаскивание (Pointer API)
   */
  const local_handleThumbPointerUp: () => void = (): void => {
    local_endDrag();
    base.resources.unlisten(document, 'pointermove', local_handleThumbPointerMove);
    base.resources.unlisten(document, 'pointerup', local_handleThumbPointerUp);
  };
  /**
   * Обработчик начала перетаскивания (мышь)
   */
  const local_handleThumbMouseDown: (event: MouseEvent) => void = (event: MouseEvent): void => {
    // Останавливаем всплытие чтобы DragModule не перехватил событие
    event.stopPropagation();
    event.preventDefault();
    local_startDrag(event.clientX, event.clientY);
    base.resources.listen(document, 'mousemove', local_handleThumbMouseMove);
    base.resources.listen(document, 'mouseup', local_handleThumbMouseUp);
  };
  /**
   * Обработчик начала перетаскивания (тач)
   */
  const local_handleThumbTouchStart: (event: TouchEvent) => void = (event: TouchEvent): void => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    // Останавливаем всплытие чтобы DragModule не перехватил событие
    event.stopPropagation();
    local_startDrag(touch.clientX, touch.clientY);
    base.resources.listen(document, 'touchmove', local_handleThumbTouchMove, { passive: false });
    base.resources.listen(document, 'touchend', local_handleThumbTouchEnd);
  };
  /**
   * Начать перетаскивание
   */
  function local_startDrag(clientX: number, clientY: number): void {
    tvist.__tvistInternal_engine.__tvistInternal_animator.stop();
    local_isDragging = true;
    local_dragStartX = clientX;
    local_dragStartY = clientY;
    local_dragStartScroll = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    local_scrollbarEl?.classList.add(TVIST_CLASSES.scrollbarDragging);
  }
  /**
   * Обработчик движения мыши при перетаскивании
   */
  const local_handleThumbMouseMove: (event: MouseEvent) => void = (event: MouseEvent): void => {
    if (!local_isDragging) return;
    event.preventDefault();
    local_updateDrag(event.clientX, event.clientY);
  };
  /**
   * Обработчик движения тача при перетаскивании
   */
  const local_handleThumbTouchMove: (event: TouchEvent) => void = (event: TouchEvent): void => {
    if (!local_isDragging || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    local_updateDrag(touch.clientX, touch.clientY);
  };
  /**
   * Обновить позицию при перетаскивании
   */
  function local_updateDrag(clientX: number, clientY: number): void {
    if (!local_trackEl) return;
    const isVertical = options.direction === 'vertical';
    const rect = local_trackEl.getBoundingClientRect();
    let delta: number;
    let trackSize: number;
    if (isVertical) {
      delta = clientY - local_dragStartY;
      trackSize = rect.height;
    } else {
      delta = clientX - local_dragStartX;
      trackSize = rect.width;
    }
    // Вычисляем процент перемещения
    const percent = delta / trackSize;
    // Вычисляем общий диапазон прокрутки
    const slideCount = tvist.slides.length;
    // Получаем позицию первого и последнего слайда
    const firstSlideScroll =
      tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(0);
    const lastSlideScroll = tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(
      slideCount - 1
    );
    // Общий диапазон прокрутки (разница между первым и последним слайдом)
    const scrollRange = lastSlideScroll - firstSlideScroll;
    // Вычисляем новую позицию скролла
    const newScroll = local_dragStartScroll + percent * scrollRange;
    // Ограничиваем позицию в пределах допустимого диапазона
    const minScroll = tvist.__tvistInternal_engine.__tvistInternal_getMinScrollPosition();
    const maxScroll = tvist.__tvistInternal_engine.__tvistInternal_getMaxScrollPosition();
    const clampedScroll = Math.max(maxScroll, Math.min(minScroll, newScroll));
    // Применяем позицию напрямую через engine (плавное следование)
    tvist.__tvistInternal_engine.__tvistInternal_location.set(clampedScroll);
    tvist.__tvistInternal_engine.__tvistInternal_target.set(clampedScroll);
    tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
    // Обновляем визуальное положение ползунка
    local_updateScrollbar();
    // Вычисляем ближайший индекс для обновления состояния
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < slideCount; i++) {
      const slidePos = tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(i);
      const distance = Math.abs(slidePos - clampedScroll);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    // Обновляем индекс без анимации
    tvist.__tvistInternal_engine.__tvistInternal_index.set(closestIndex);
    // Генерируем события прокрутки
    tvist.emit('scroll');
  }
  /**
   * Завершить перетаскивание (мышь)
   */
  const local_handleThumbMouseUp: () => void = (): void => {
    local_endDrag();
    base.resources.unlisten(document, 'mousemove', local_handleThumbMouseMove);
    base.resources.unlisten(document, 'mouseup', local_handleThumbMouseUp);
  };
  /**
   * Завершить перетаскивание (тач)
   */
  const local_handleThumbTouchEnd: () => void = (): void => {
    local_endDrag();
    base.resources.unlisten(document, 'touchmove', local_handleThumbTouchMove);
    base.resources.unlisten(document, 'touchend', local_handleThumbTouchEnd);
  };
  /**
   * Завершить перетаскивание
   */
  function local_endDrag(): void {
    local_isDragging = false;
    local_scrollbarEl?.classList.remove(TVIST_CLASSES.scrollbarDragging);
    // После завершения drag делаем snap к ближайшему слайду
    const currentPos = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    const slideCount = tvist.slides.length;
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < slideCount; i++) {
      const slidePos = tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(i);
      const distance = Math.abs(slidePos - currentPos);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    // Плавный переход к ближайшему слайду
    tvist.__tvistInternal_engine.__tvistInternal_scrollTo(closestIndex);
  }
  /**
   * Обработчик скролла
   */
  const local_handleScroll: () => void = (): void => {
    local_updateScrollbar();
  };
  /**
   * Обработчик изменения слайда
   */
  const local_handleSlideChanged: () => void = (): void => {
    local_updateScrollbar();
  };
  /**
   * Обновить позицию и размер скроллбара.
   * Разделяет обновление размера (редко меняется) и позиции (каждый кадр).
   * Мемоизирует оба значения: DOM не трогается, если ничего не изменилось.
   */
  function local_updateScrollbar(): void {
    if (!local_thumbEl || !local_trackEl) return;
    const isVertical = options.direction === 'vertical';
    const slideCount = tvist.slides.length;
    if (slideCount <= 1) return;
    // Размер ползунка — меняется только при resize / смене perPage
    const perPage = options.perPage ?? 1;
    const thumbSizePercent = (perPage / slideCount) * 100;
    // Текущая позиция
    const currentPosition = Math.abs(tvist.__tvistInternal_engine.__tvistInternal_location.get());
    const lastSlidePosition = Math.abs(
      tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(slideCount - 1)
    );
    const progress = lastSlidePosition > 0 ? currentPosition / lastSlidePosition : 0;
    const availableRange = 100 - thumbSizePercent;
    // Округляем до 0.1% — на кадрах с субпиксельным движением это nochange
    const positionPercent =
      Math.round(Math.max(0, Math.min(availableRange, progress * availableRange)) * 10) / 10;
    const sizeChanged = thumbSizePercent !== local__lastThumbSizePercent;
    const posChanged = positionPercent !== local__lastPositionPercent;
    if (!sizeChanged && !posChanged) return;
    if (isVertical) {
      if (sizeChanged) {
        local_thumbEl.style.height = `${thumbSizePercent}%`;
        local_thumbEl.style.width = '100%';
        local_thumbEl.style.left = '0';
      }
      if (posChanged) {
        local_thumbEl.style.top = `${positionPercent}%`;
      }
    } else {
      if (sizeChanged) {
        local_thumbEl.style.width = `${thumbSizePercent}%`;
        local_thumbEl.style.height = '100%';
        local_thumbEl.style.top = '0';
      }
      if (posChanged) {
        local_thumbEl.style.left = `${positionPercent}%`;
      }
    }
    if (sizeChanged) local__lastThumbSizePercent = thumbSizePercent;
    if (posChanged) local__lastPositionPercent = positionPercent;
  }
  /**
   * Инвалидирует кеш скроллбара — вызывать при resize или смене опций.
   */
  function local_invalidateScrollbarCache(): void {
    local__lastPositionPercent = -1;
    local__lastThumbSizePercent = -1;
  }
  /**
   * Показать скроллбар
   */
  const local_showScrollbar: () => void = (): void => {
    if (!local_hide) return;
    local_scrollbarEl?.classList.remove(TVIST_CLASSES.scrollbarHidden);
    // Сбрасываем таймер скрытия
    if (local_hideTimer) {
      base.resources.cancelTimeout(local_hideTimer);
      local_hideTimer = undefined;
    }
  };
  /**
   * Запустить таймер скрытия
   */
  const local_startHideTimer: () => void = (): void => {
    if (!local_hide || local_isDragging) return;
    local_hideTimer = base.resources.timeout(() => {
      local_scrollbarEl?.classList.add(TVIST_CLASSES.scrollbarHidden);
    }, local_hideDelay);
  };
  /**
   * Хук обновления
   */
  function local_onUpdate(): void {
    local_invalidateScrollbarCache();
    local_updateScrollbar();
  }
  /**
   * Прикрепить/открепить обработчики автоскрытия в зависимости от this.hide
   */
  function local_updateAutoHideListeners(): void {
    // Сначала всегда снимаем, чтобы не дублировать при повторном включении
    base.resources.unlisten(tvist.root, 'mouseenter', local_showScrollbar);
    base.resources.unlisten(tvist.root, 'mouseleave', local_startHideTimer);
    if (local_hideTimer) {
      base.resources.cancelTimeout(local_hideTimer);
      local_hideTimer = undefined;
    }
    if (local_hide) {
      base.resources.listen(tvist.root, 'mouseenter', local_showScrollbar);
      base.resources.listen(tvist.root, 'mouseleave', local_startHideTimer);
    } else {
      local_scrollbarEl?.classList.remove(TVIST_CLASSES.scrollbarHidden);
    }
  }
  /**
   * Хук обновления опций
   */
  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    if (newOptions.scrollbar !== undefined) {
      const scrollbarOptions =
        typeof newOptions.scrollbar === 'boolean' ? {} : (newOptions.scrollbar ?? {});
      local_hide = scrollbarOptions.hide ?? false;
      local_hideDelay = scrollbarOptions.hideDelay ?? 1000;
      local_draggable = scrollbarOptions.draggable ?? true;
      // Обновляем слушатели автоскрытия (добавить при hide: true, убрать при hide: false)
      local_updateAutoHideListeners();
      // Если автоскрытие включено — скроллбар изначально скрыт
      if (local_hide) {
        local_scrollbarEl?.classList.add(TVIST_CLASSES.scrollbarHidden);
      }
      local_invalidateScrollbarCache();
      local_updateScrollbar();
    }
  }

  function local_destroy(): void {
    // Очищаем таймеры
    if (local_hideTimer) {
      base.resources.cancelTimeout(local_hideTimer);
    }
    // Удаляем обработчики событий
    if (local_trackEl) {
      base.resources.unlisten(local_trackEl, 'click', local_handleTrackClick);
    }
    if (local_thumbEl) {
      base.resources.unlisten(local_thumbEl, 'pointerdown', local_handleThumbPointerDown);
      base.resources.unlisten(local_thumbEl, 'mousedown', local_handleThumbMouseDown);
      base.resources.unlisten(local_thumbEl, 'touchstart', local_handleThumbTouchStart);
    }
    base.resources.unlisten(document, 'pointermove', local_handleThumbPointerMove);
    base.resources.unlisten(document, 'pointerup', local_handleThumbPointerUp);
    base.resources.unlisten(document, 'mousemove', local_handleThumbMouseMove);
    base.resources.unlisten(document, 'mouseup', local_handleThumbMouseUp);
    base.resources.unlisten(document, 'touchmove', local_handleThumbTouchMove);
    base.resources.unlisten(document, 'touchend', local_handleThumbTouchEnd);
    base.resources.unlisten(tvist.root, 'mouseenter', local_showScrollbar);
    base.resources.unlisten(tvist.root, 'mouseleave', local_startHideTimer);
    // Удаляем DOM элементы (если не кастомный контейнер)
    if (!local_isCustomContainer && local_scrollbarEl) {
      local_scrollbarEl.remove();
    }
  }
  const component: ScrollbarModule = {
    get name() {
      return local_name;
    },
    shouldBeActive: local_shouldBeActive,
    init: local_init,
    onUpdate: local_onUpdate,
    onOptionsUpdate: local_onOptionsUpdate,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.dispose();
      }
    },
  };
  const scrollbarOptions = local_getScrollbarOptions();
  local_hide = scrollbarOptions.hide ?? false;
  local_hideDelay = scrollbarOptions.hideDelay ?? 1000;
  local_draggable = scrollbarOptions.draggable ?? true;
  return component;
}
