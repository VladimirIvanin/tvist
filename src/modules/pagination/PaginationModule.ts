import { loopEnabled, pageCount, lastScrollIndex } from '../../utils/positions';
/**
 * Pagination Module
 *
 * Типы:
 * - bullets: точки
 * - fraction: 1 / 6
 * - progress: прогресс-бар
 * - custom: кастомный рендер
 */
import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';

/**
 * Структура группы слайдов для точки пагинации
 */
interface BulletGroup {
  /** Индекс начального слайда группы */
  startIndex: number;
  /** Индекс конечного слайда группы (включительно) */
  endIndex: number;
  /** Количество слайдов в группе */
  count: number;
}

/** Internal component; state lives in this factory's closure. */
export interface PaginationModule extends Component {
  readonly name: 'pagination';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;
  /**
   * Хук при обновлении
   * Для bullets при loop не пересоздаём DOM при каждом update() (после loopFix и т.д.),
   * а только обновляем активный класс, если количество буллетов не изменилось.
   */
  onUpdate(): void;
}

export function createPaginationModule(tvist: Tvist, options: TvistOptions): PaginationModule {
  const base = createComponent(tvist, options);

  const local_name = 'pagination' as const;

  let local_container: HTMLElement | null = null;

  let local_createdContainer = false;

  let local_bullets: HTMLElement[] = [];

  const local_clickHandlers: Map<HTMLElement, () => void> = new Map<HTMLElement, () => void>();

  let local_updateFrameId: number | null = null;

  const local_activeChangeHandler: () => void = () => local_updateActive();

  const local_settledChangeHandler: () => void = () => {
    local_updateActive();
    if (options.loop) local_scheduleUpdateActive();
  };

  const local_visibilityChangeHandler: () => void = () => local_updateVisibility();

  const local_positionChangeHandler: () => void = () => local_updateActiveByPosition();
  // Счётчик обновлений для отладки
  // Группы слайдов для каждой точки (используется при limit)
  let local_bulletGroups: BulletGroup[] = [];
  // Кэш для progress bar элемента (оптимизация производительности)
  let local_progressBarEl: HTMLElement | null = null;

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_findOrCreateContainer();
    if (!local_container) {
      if (options.debug) {
        console.warn('Tvist Pagination: container not found');
      }
      return;
    }

    // Подписываемся на события ДО первого render/updateVisibility
    // Обновляем при изменении слайда СИНХРОННО (slideChangeStart эмитится ДО анимации),
    // чтобы к моменту slideChangeEnd (после анимации) bullet'ы были уже актуальны.
    // Также слушаем slideChangeEnd для instant-переходов (scrollTo с instant=true).
    base.__tvistInternal_on('slideChangeStart', local_activeChangeHandler);
    base.__tvistInternal_on('slideChangeEnd', local_settledChangeHandler);
    // Обновляем видимость при lock/unlock (для breakpoints)
    base.__tvistInternal_on('lock', local_visibilityChangeHandler);
    base.__tvistInternal_on('unlock', local_visibilityChangeHandler);
    // В free mode (drag: 'free') slideChangeStart/End не эмитятся при прокрутке —
    // обновляем активный bullet по ближайшему слайду на каждом кадре scroll.
    if (options.drag === 'free') {
      base.__tvistInternal_on('scroll', local_positionChangeHandler);
    }
    local_render();
    local_updateActive();
    local_updateVisibility();
    base.__tvistInternal_emit('pagination:mounted');
    // Для loop режима нужны дополнительные события
    if (options.loop) {
      base.__tvistInternal_on('loopFix', local_settledChangeHandler);
      base.__tvistInternal_on('transitionEnd', local_settledChangeHandler);
    }
  }
  /** Дополнительное отложенное обновление (для loop: после применения DOM/индекса) */
  function local_scheduleUpdateActive(): void {
    if (local_updateFrameId !== null) return;
    local_updateFrameId = base.__tvistInternal_resources.__tvistInternal_frame(() => {
      local_updateFrameId = null;
      local_updateActive();
    });
  }

  function local_destroy(): void {
    local_detachClickHandlers();
    base.__tvistInternal_off('slideChangeStart', local_activeChangeHandler);
    base.__tvistInternal_off('slideChangeEnd', local_settledChangeHandler);
    base.__tvistInternal_off('lock', local_visibilityChangeHandler);
    base.__tvistInternal_off('unlock', local_visibilityChangeHandler);
    base.__tvistInternal_off('scroll', local_positionChangeHandler);
    base.__tvistInternal_off('loopFix', local_settledChangeHandler);
    base.__tvistInternal_off('transitionEnd', local_settledChangeHandler);
    if (local_updateFrameId !== null) {
      base.__tvistInternal_resources.__tvistInternal_cancelFrame(local_updateFrameId);
      local_updateFrameId = null;
    }
    if (local_container) {
      if (local_createdContainer) {
        local_container.remove();
      } else {
        local_container.innerHTML = '';
      }
    }
    local_container = null;
    local_createdContainer = false;
    local_bullets = [];
    local_bulletGroups = [];
    local_progressBarEl = null;
    local_lastFreeIndex = -1;
  }

  function local_shouldBeActive(): boolean {
    const { pagination } = options;
    return !!pagination;
  }
  /**
   * Получает лимит буллетов из опций пагинации
   */
  function local_getBulletLimit(pageCount: number): number | undefined {
    const pagination = options.pagination;
    const limit =
      typeof pagination === 'object' && pagination?.limit
        ? Math.min(pagination.limit, pageCount)
        : undefined;
    return limit;
  }
  /**
   * Ожидаемое количество буллетов при текущих опциях (для проверки, нужен ли полный render)
   */
  function local_getExpectedBulletCount(): number {
    const pageCount = local_calculatePositionCount();
    if (pageCount === 0) return 0;
    const limit = local_getBulletLimit(pageCount);
    return limit ?? pageCount;
  }
  /**
   * Вычисляет количество страниц с учетом perPage и slidesPerGroup
   */
  function local_calculatePageCount(): number {
    return pageCount(
      tvist.__tvistInternal_originalSlideCount,
      options.perPage ?? 1,
      options.slidesPerGroup ?? 1,
      loopEnabled(options.loop)
    );
  }
  /** Individual positions retain the original arithmetic for fractional perPage values. */
  function local_calculatePositionCount(): number {
    const count = tvist.__tvistInternal_originalSlideCount;
    return count === 0
      ? 0
      : lastScrollIndex(count, options.perPage ?? 1, loopEnabled(options.loop)) + 1;
  }
  /**
   * Поиск или создание контейнера
   */
  function local_findOrCreateContainer(): void {
    const pagination = options.pagination;
    if (typeof pagination === 'object' && pagination !== null) {
      if (pagination.container) {
        local_container =
          typeof pagination.container === 'string'
            ? document.querySelector(pagination.container)
            : pagination.container;
      }
    }
    // Ищем по стандартному классу только контейнер этого слайдера.
    local_container ??= base.__tvistInternal_findOwnElement(`.${TVIST_CLASSES.pagination}`);
    if (!local_container) {
      local_container = document.createElement('div');
      local_container.className = TVIST_CLASSES.pagination;
      tvist.__tvistInternal_root.appendChild(local_container);
      local_createdContainer = true;
    }
  }
  /**
   * Получить тип пагинации
   */
  function local_getType(): 'bullets' | 'fraction' | 'progress' | 'custom' {
    const pagination = options.pagination;
    if (typeof pagination === 'object' && pagination !== null) {
      return pagination.type ?? 'bullets';
    }
    return 'bullets';
  }
  /**
   * Вычисление групп слайдов при использовании limit
   * @param totalSlides - общее количество слайдов
   * @param limit - максимальное количество точек
   * @returns массив групп слайдов для каждой точки
   */
  function local_calculateBulletGroups(totalSlides: number, limit: number): BulletGroup[] {
    const pagination = options.pagination;
    const strategy =
      typeof pagination === 'object' && pagination !== null
        ? (pagination.strategy ?? 'even')
        : 'even';
    if (strategy === 'even') {
      return local_calculateEvenGroups(totalSlides, limit);
    } else {
      return local_calculateCenterGroups(totalSlides, limit);
    }
  }
  /**
   * Равномерное распределение слайдов по точкам
   * @param totalSlides - общее количество слайдов
   * @param limit - количество точек
   */
  function local_calculateEvenGroups(totalSlides: number, limit: number): BulletGroup[] {
    const pagination = options.pagination;
    const remainderStrategy =
      typeof pagination === 'object' && pagination !== null
        ? (pagination.remainderStrategy ?? 'center')
        : 'center';
    const groups: BulletGroup[] = [];
    const baseSize = Math.floor(totalSlides / limit);
    const remainder = totalSlides % limit;
    let currentIndex = 0;
    for (let i = 0; i < limit; i++) {
      let groupSize = baseSize;
      // Распределяем остаток
      if (remainder > 0) {
        if (remainderStrategy === 'left') {
          // Добавляем к левым точкам
          if (i < remainder) {
            groupSize++;
          }
        } else if (remainderStrategy === 'center') {
          // Добавляем к центральным точкам
          const startOffset = Math.ceil((limit - remainder) / 2);
          if (i >= startOffset && i < startOffset + remainder) {
            groupSize++;
          }
        } else if (remainderStrategy === 'right') {
          // Добавляем к правым точкам
          if (i >= limit - remainder) {
            groupSize++;
          }
        }
      }
      groups.push({
        startIndex: currentIndex,
        endIndex: currentIndex + groupSize - 1,
        count: groupSize,
      });
      currentIndex += groupSize;
    }
    return groups;
  }
  /**
   * Центральное распределение слайдов по точкам (симметричное)
   *
   * Стратегия:
   * - limit = 1: все слайды в одной точке
   * - limit = 2: делим пополам
   * - limit = 3: первый слайд, центр (все остальные), последний слайд
   * - limit >= 4: симметричное распределение с краёв
   *   - Первые (limit-1)/2 точек = по одному слайду с начала
   *   - Центральная точка(и) = все остальные слайды
   *   - Последние (limit-1)/2 точек = по одному слайду с конца
   *
   * Пример (10 слайдов, limit 5):
   * - Точка 0: слайд 0
   * - Точка 1: слайд 1
   * - Точка 2: слайды 2-7 (центр)
   * - Точка 3: слайд 8
   * - Точка 4: слайд 9
   *
   * @param totalSlides - общее количество слайдов
   * @param limit - количество точек
   */
  function local_calculateCenterGroups(totalSlides: number, limit: number): BulletGroup[] {
    const groups: BulletGroup[] = [];
    if (limit === 1) {
      // Одна точка - все слайды
      groups.push({
        startIndex: 0,
        endIndex: totalSlides - 1,
        count: totalSlides,
      });
      return groups;
    }
    if (limit === 2) {
      // Две точки - делим пополам
      const half = Math.ceil(totalSlides / 2);
      groups.push({
        startIndex: 0,
        endIndex: half - 1,
        count: half,
      });
      groups.push({
        startIndex: half,
        endIndex: totalSlides - 1,
        count: totalSlides - half,
      });
      return groups;
    }
    if (limit === 3) {
      // Три точки: первый, центр, последний
      groups.push({
        startIndex: 0,
        endIndex: 0,
        count: 1,
      });
      groups.push({
        startIndex: 1,
        endIndex: totalSlides - 2,
        count: totalSlides - 2,
      });
      groups.push({
        startIndex: totalSlides - 1,
        endIndex: totalSlides - 1,
        count: 1,
      });
      return groups;
    }
    // Для limit >= 4: симметричное распределение
    // Количество точек с каждого края (по одному слайду)
    // При нечётном limit: (limit-1)/2 точек с каждой стороны + 1 центральная
    // При чётном limit: limit/2 - 1 точек с каждой стороны + 2 центральные (или делим центр)
    const edgePointsPerSide =
      limit % 2 === 0
        ? Math.floor(limit / 2) - 1 // Чётное: 4->1, 6->2, 8->3
        : Math.floor((limit - 1) / 2); // Нечётное: 5->2, 7->3, 9->4
    // Создаём точки с начала (по одному слайду)
    for (let i = 0; i < edgePointsPerSide; i++) {
      groups.push({
        startIndex: i,
        endIndex: i,
        count: 1,
      });
    }
    // Центральные точки - все остальные слайды
    const centerStartIndex = edgePointsPerSide;
    const centerEndIndex = totalSlides - 1 - edgePointsPerSide;
    const centerSlidesCount = centerEndIndex - centerStartIndex + 1;
    // При чётном limit создаём 2 центральные точки, при нечётном - 1
    if (limit % 2 === 0) {
      // Делим центральные слайды на 2 точки
      const halfCenter = Math.ceil(centerSlidesCount / 2);
      groups.push({
        startIndex: centerStartIndex,
        endIndex: centerStartIndex + halfCenter - 1,
        count: halfCenter,
      });
      groups.push({
        startIndex: centerStartIndex + halfCenter,
        endIndex: centerEndIndex,
        count: centerSlidesCount - halfCenter,
      });
    } else {
      // Одна центральная точка
      groups.push({
        startIndex: centerStartIndex,
        endIndex: centerEndIndex,
        count: centerSlidesCount,
      });
    }
    // Создаём точки с конца (по одному слайду)
    for (let i = 0; i < edgePointsPerSide; i++) {
      const slideIndex = totalSlides - edgePointsPerSide + i;
      groups.push({
        startIndex: slideIndex,
        endIndex: slideIndex,
        count: 1,
      });
    }
    return groups;
  }
  /**
   * Определить индекс активной точки по текущему индексу слайда
   * @param slideIndex - текущий индекс слайда
   * @returns индекс активной точки
   */
  function local_getActiveBulletIndex(slideIndex: number): number {
    if (local_bulletGroups.length === 0) {
      return slideIndex;
    }
    // Ищем группу, в которую попадает текущий слайд
    for (let i = 0; i < local_bulletGroups.length; i++) {
      const group = local_bulletGroups[i];
      if (group && slideIndex >= group.startIndex && slideIndex <= group.endIndex) {
        return i;
      }
    }
    // Fallback
    return 0;
  }
  /**
   * Получить текущий индекс слайда с учётом loop режима
   * В loop режиме используем realIndex, иначе activeIndex
   */
  function local_getCurrentSlideIndex(): number {
    return loopEnabled(options.loop)
      ? tvist.__tvistInternal_realIndex
      : tvist.__tvistInternal_activeIndex;
  }
  /**
   * Рендер пагинации
   */
  function local_render(): void {
    if (!local_container) return;
    // Сбрасываем кэш при пересоздании разметки
    local_progressBarEl = null;
    const type = local_getType();
    switch (type) {
      case 'bullets':
        local_renderBullets();
        break;
      case 'fraction':
        local_renderFraction();
        break;
      case 'progress':
        local_renderProgress();
        break;
      case 'custom':
        local_renderCustom();
        break;
    }
  }
  /**
   * Рендер bullets
   */
  function local_renderBullets(): void {
    if (!local_container) return;
    const container = local_container;
    const pagination = options.pagination;
    const clickable =
      typeof pagination === 'object' && pagination !== null ? (pagination.clickable ?? true) : true;
    const bulletClass =
      typeof pagination === 'object' && pagination !== null
        ? (pagination.bulletClass ?? TVIST_CLASSES.bullet)
        : TVIST_CLASSES.bullet;
    local_container.innerHTML = '';
    local_bullets = [];
    local_bulletGroups = [];
    local_detachClickHandlers();
    const pageCount = local_calculatePositionCount();
    const limit = local_getBulletLimit(pageCount);
    const limited = limit !== undefined && limit !== 0 && limit < pageCount;
    if (limited) local_bulletGroups = local_calculateBulletGroups(pageCount, limit);
    for (let bulletIndex = 0; bulletIndex < (limited ? limit : pageCount); bulletIndex++) {
      const group = local_bulletGroups[bulletIndex];
      if (limited && !group) continue;
      const groupAttributes = group
        ? ` data-group-start="${group.startIndex}" data-group-end="${group.endIndex}"`
        : '';
      const html =
        typeof pagination === 'object' && pagination?.renderBullet
          ? pagination.renderBullet(bulletIndex, bulletClass)
          : `<span class="${bulletClass}" data-index="${bulletIndex}"${groupAttributes}></span>`;
      const bullet = local_createElementFromHTML(html);
      container.appendChild(bullet);
      local_bullets.push(bullet);
      if (clickable) {
        const slideIndex = group?.startIndex ?? bulletIndex;
        const handler = () => tvist.__tvistInternal_scrollTo(slideIndex);
        local_clickHandlers.set(bullet, handler);
        base.__tvistInternal_resources.__tvistInternal_listen(bullet, 'click', handler);
        bullet.style.cursor = 'pointer';
      }
    }
  }
  /**
   * Рендер fraction
   */
  function local_renderFraction(): void {
    local_renderFractionByIndex(local_getCurrentSlideIndex());
  }
  /**
   * Рендер progress
   */
  function local_renderProgress(): void {
    if (!local_container) return;
    const currentPage = local_getCurrentSlideIndex() + 1;
    const totalPages = local_calculatePositionCount();
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    local_container.innerHTML = `
      <div class="${TVIST_CLASSES.paginationProgress}">
        <div class="${TVIST_CLASSES.paginationProgressBar}" style="width: ${progress}%"></div>
      </div>
    `;
    // Кэшируем элемент progress bar после создания
    local_progressBarEl = local_container.querySelector<HTMLElement>(
      `.${TVIST_CLASSES.paginationProgressBar}`
    );
  }
  /**
   * Рендер custom
   */
  function local_renderCustom(): void {
    if (!local_container) return;
    const pagination = options.pagination;
    if (typeof pagination === 'object' && pagination?.renderCustom) {
      const totalPages = local_calculatePositionCount();
      const html = pagination.renderCustom(local_getCurrentSlideIndex() + 1, totalPages);
      local_container.innerHTML = html;
    }
  }
  /**
   * Обновление видимости пагинации
   */
  function local_updateVisibility(): void {
    if (!local_container) return;
    const pagination = options.pagination;
    const hideWhenSinglePage =
      typeof pagination === 'object' && pagination !== null
        ? (pagination.hideWhenSinglePage ?? true)
        : true;
    // Проверяем условия для скрытия
    const pageCount = local_calculatePageCount();
    // Скрываем если:
    // 1. Слайдер заблокирован И hideWhenSinglePage включен
    // 2. Всего одна страница И hideWhenSinglePage включен
    const shouldHide =
      hideWhenSinglePage &&
      (tvist.__tvistInternal_engine.__tvistInternal_isLocked || pageCount <= 1);
    if (shouldHide) {
      local_container.classList.add(TVIST_CLASSES.paginationHidden);
      local_container.setAttribute('aria-hidden', 'true');
    } else {
      local_container.classList.remove(TVIST_CLASSES.paginationHidden);
      local_container.setAttribute('aria-hidden', 'false');
    }
  }
  /**
   * Обновление активного элемента
   */
  function local_updateActive(): void {
    if (!local_container) return;

    // Обновляем видимость
    local_updateVisibility();
    const type = local_getType();
    switch (type) {
      case 'bullets':
        local_updateBulletsActive();
        break;
      case 'fraction':
        local_renderFraction(); // Перерисовываем fraction
        break;
      case 'progress':
        local_updateProgressActive();
        break;
      case 'custom':
        local_renderCustom(); // Перерисовываем custom
        break;
    }
  }
  /**
   * Обновление активного элемента пагинации по текущей позиции трека.
   * Используется в free mode, когда engine.activeIndex не обновляется при прокрутке.
   */
  function local_updateActiveByPosition(): void {
    if (!local_container) return;
    const nearestIndex = local_getNearestSlideIndex();
    if (nearestIndex === local_lastFreeIndex) return;
    local_lastFreeIndex = nearestIndex;
    const type = local_getType();
    switch (type) {
      case 'bullets':
        local_updateBulletsActiveByIndex(nearestIndex);
        break;
      case 'fraction':
        local_renderFractionByIndex(nearestIndex);
        break;
      case 'progress':
        local_updateProgressActiveByIndex(nearestIndex);
        break;
      case 'custom':
        local_renderCustom();
        break;
    }
  }

  let local_lastFreeIndex = -1;
  /**
   * Возвращает индекс слайда, ближайшего к текущей позиции трека.
   */
  function local_getNearestSlideIndex(): number {
    const { __tvistInternal_engine: engine, __tvistInternal_slides: slides } = tvist;
    const currentPosition = engine.__tvistInternal_location.get();
    let nearestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const slidePosition = engine.__tvistInternal_getScrollPositionForIndex(i);
      const distance = Math.abs(currentPosition - slidePosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }
  /**
   * Обновление активного bullet
   */
  function local_updateBulletsActive(): void {
    local_updateBulletsActiveByIndex(local_getCurrentSlideIndex());
  }
  /**
   * Обновление progress bar
   * Использует кэшированный элемент progressBarEl вместо querySelector
   */
  function local_updateProgressActive(): void {
    local_updateProgressActiveByIndex(local_getCurrentSlideIndex());
  }

  function local_updateBulletsActiveByIndex(slideIndex: number): void {
    const pagination = options.pagination;
    const activeClass =
      typeof pagination === 'object' && pagination !== null
        ? (pagination.bulletActiveClass ?? TVIST_CLASSES.bulletActive)
        : TVIST_CLASSES.bulletActive;
    const activeBulletIndex =
      local_bulletGroups.length > 0 ? local_getActiveBulletIndex(slideIndex) : slideIndex;
    local_bullets.forEach((bullet, bulletIndex) => {
      if (bulletIndex === activeBulletIndex) {
        bullet.classList.add(activeClass);
        bullet.setAttribute('aria-current', 'true');
      } else {
        bullet.classList.remove(activeClass);
        bullet.removeAttribute('aria-current');
      }
    });
  }

  function local_renderFractionByIndex(slideIndex: number): void {
    if (!local_container) return;
    const pagination = options.pagination;
    const currentPage = slideIndex + 1;
    const totalPages = local_calculatePositionCount();
    let html: string;
    if (typeof pagination === 'object' && pagination?.renderFraction) {
      html = pagination.renderFraction(currentPage, totalPages);
    } else {
      html = `
        <span class="${TVIST_CLASSES.paginationCurrent}">${currentPage}</span>
        <span class="${TVIST_CLASSES.paginationSeparator}"> / </span>
        <span class="${TVIST_CLASSES.paginationTotal}">${totalPages}</span>
      `;
    }
    local_container.innerHTML = html;
  }

  function local_updateProgressActiveByIndex(slideIndex: number): void {
    local_progressBarEl ??=
      local_container?.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`) ??
      null;
    if (local_progressBarEl) {
      const currentPage = slideIndex + 1;
      const totalPages = local_calculatePositionCount();
      const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
      local_progressBarEl.style.width = `${progress}%`;
    }
  }
  /**
   * Создание элемента из HTML строки
   */
  function local_createElementFromHTML(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
  }
  /**
   * Отключение click handlers
   */
  function local_detachClickHandlers(): void {
    local_clickHandlers.forEach((handler, bullet) => {
      base.__tvistInternal_resources.__tvistInternal_unlisten(bullet, 'click', handler);
    });
    local_clickHandlers.clear();
  }
  /**
   * Хук при обновлении
   * Для bullets при loop не пересоздаём DOM при каждом update() (после loopFix и т.д.),
   * а только обновляем активный класс, если количество буллетов не изменилось.
   */
  function local_onUpdate(): void {
    const type = local_getType();
    if (type === 'bullets') {
      const expectedCount = local_getExpectedBulletCount();
      if (expectedCount !== local_bullets.length) {
        local_render();
      }
      local_updateActive();
    }
    // Обновляем видимость (для breakpoints и lock/unlock)
    local_updateVisibility();
  }
  const component: PaginationModule = {
    get name() {
      return local_name;
    },
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
    shouldBeActive: local_shouldBeActive,
    onUpdate: local_onUpdate,
  };

  return component;
}
