/**
 * LoopModule — бесконечная прокрутка.
 *
 * Режим без клонов: перестановка оригинальных DOM-узлов (prepend/append) + коррекция translate.
 * Режим withClones: клоны по краям, без перестановки оригиналов; старт на первом не-клоне с нужным realIndex.
 */
import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistOptions } from '../../core/types';
import { findDomIndexByRealIndex } from '../../utils/slideRealIndex';
interface LoopFixParams {
  slideRealIndex?: number;
  slideTo?: boolean;
  direction?: 'next' | 'prev';
  setTranslate?: boolean;
  activeSlideIndex?: number;
  /** Первый вызов при инициализации */
  initial?: boolean;
}
import type { TvistRuntime as Tvist } from '../../core/runtime';

/** Internal component; state lives in this factory's closure. */
export interface LoopModule extends Component {
  readonly name: 'loop';
  loopedSlides: number;

  init(): void;

  onOptionsUpdate(newOptions: Partial<TvistOptions>): void;
  /**
   * Публичный вызов loopFix из других модулей.
   * Возвращает скорректированный активный индекс.
   */
  fix(params?: LoopFixParams): number;
  /**
   * Состояние transform для отладки и тестирования.
   */
  getTransformState(): {
    location: number;
    target: number;
    activeIndex: number;
    realIndex: number;
    transform: string;
    slidesOrder: string[];
    slidesText: string[];
    loopedSlides: number;
  };

  destroy(): void;
}

export function createLoopModule(tvist: Tvist, options: TvistOptions): LoopModule {
  const base = createComponent(tvist, options);

  const local_name = 'loop' as const;
  /** Количество слайдов в буфере для loop (вычисляется динамически) */
  let local_loopedSlides = 0;

  let local_isInitialized = false;

  let local__withClones = false;

  let local__clonesPerSide = 0;

  function local_init(): void {
    const config = local_getLoopConfig();
    const loopEnabled = config.enabled;
    local__withClones = config.withClones;
    if (!loopEnabled || local_isInitialized) return;
    if (local__withClones) {
      local_createClones();
      tvist.__tvistInternal_engine.__tvistInternal_update();
    }
    const slidesCount = tvist.slides.length;
    if (slidesCount < 1) return;
    local_isInitialized = true;
    const initialRealIndex = options.start ?? 0;
    const bothDirections =
      tvist.__tvistInternal_engine.__tvistInternal_isCenterMode() || options.peek !== undefined;
    const hasPeek = options.peek !== undefined;
    local_loopFix({
      slideRealIndex: initialRealIndex,
      direction: bothDirections || hasPeek ? undefined : 'next',
      initial: true,
    });
    base.on('beforeTransitionStart', (data: { index: number; direction: 'next' | 'prev' }) => {
      local_loopFix({ direction: data.direction });
    });
  }

  function local_onOptionsUpdate(newOptions: Partial<TvistOptions>): void {
    const loopOpt = newOptions.loop;
    const loopEnabled =
      loopOpt === true || (typeof loopOpt === 'object' && loopOpt.enabled !== false);
    if (loopEnabled) {
      local_init();
    } else if (newOptions.loop === false) {
      local_destroy();
    }
  }
  /**
   * Публичный вызов loopFix из других модулей.
   * Возвращает скорректированный активный индекс.
   */
  function local_fix(params: LoopFixParams = {}): number {
    return local_loopFix(params);
  }
  /**
   * Состояние transform для отладки и тестирования.
   */
  function local_getTransformState(): {
    location: number;
    target: number;
    activeIndex: number;
    realIndex: number;
    transform: string;
    slidesOrder: string[];
    slidesText: string[];
    loopedSlides: number;
  } {
    const slides = tvist.slides;
    return {
      location: tvist.__tvistInternal_engine.__tvistInternal_location.get(),
      target: tvist.__tvistInternal_engine.__tvistInternal_target.get(),
      activeIndex: tvist.__tvistInternal_engine.__tvistInternal_index.get(),
      realIndex: tvist.realIndex,
      transform: tvist.container.style.transform,
      slidesOrder: slides.map((s) => s.getAttribute('data-tvist-slide-index') ?? '?'),
      slidesText: slides.map((s) => s.textContent?.trim() || '?'),
      loopedSlides: local_loopedSlides,
    };
  }

  function local_loopFix(params: LoopFixParams = {}): number {
    if (tvist.__tvistInternal_engine.__tvistInternal_animator.isAnimating()) {
      tvist.__tvistInternal_engine.__tvistInternal_animator.stop();
    }
    const {
      slideRealIndex,
      slideTo = true,
      direction,
      setTranslate,
      activeSlideIndex,
      initial = false,
    } = params;
    const loopEnabled = local_getLoopConfig().enabled;
    const withClones = local__withClones;
    if (!loopEnabled) return tvist.__tvistInternal_engine.__tvistInternal_index.get();
    base.emit('beforeLoopFix');
    const slides = tvist.slides;
    const container = tvist.container;
    const slidesCount = slides.length;
    const bothDirections =
      tvist.__tvistInternal_engine.__tvistInternal_isCenterMode() || options.peek !== undefined;
    const loopedSlides = local_computeLoopedSlides(bothDirections);
    local_loopedSlides = loopedSlides;
    const slidesPerView = local_getSlidesPerView(bothDirections);
    let requiredSlides = slidesPerView + loopedSlides;
    if (bothDirections) {
      requiredSlides += Math.floor(slidesPerView / 2);
    }
    if (slidesCount < requiredSlides) {
      console.warn(
        '[Tvist Loop] Warning: Not enough slides for loop mode. Need at least',
        requiredSlides,
        'slides, but have',
        slidesCount
      );
    }
    const activeIndex =
      activeSlideIndex ?? tvist.__tvistInternal_engine.__tvistInternal_index.get();
    if (withClones && !initial) {
      local_teleportIfNeeded(activeIndex, slidesPerView, slidesCount);
    }
    const isNext = direction === 'next' || !direction;
    const isPrev = direction === 'prev' || !direction;
    const activeColIndexWithShift =
      activeIndex +
      (bothDirections && typeof setTranslate === 'undefined' ? -slidesPerView / 2 + 0.5 : 0);
    const hasPeek = options.peek !== undefined;
    const needsPrepend = isPrev || hasPeek;
    const needsAppend = isNext || hasPeek;
    const prependIndexes =
      !withClones && needsPrepend
        ? local_preparePrependIndexes(activeColIndexWithShift, loopedSlides, slidesCount)
        : [];
    const appendIndexes =
      !withClones && needsAppend && prependIndexes.length === 0
        ? local_prepareAppendIndexes(
            activeColIndexWithShift,
            slidesPerView,
            loopedSlides,
            slidesCount
          )
        : [];
    const oldSlidePositions: number[] = [];
    if (slideTo) {
      for (let i = 0; i < slides.length; i++) {
        oldSlidePositions[i] = tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(i);
      }
    }
    local_applyDomRearrangement(container, slides, isPrev, isNext, prependIndexes, appendIndexes);
    tvist.__tvistInternal_updateSlidesList();
    if (slideTo) {
      if (prependIndexes.length > 0) {
        tvist.__tvistInternal_engine.__tvistInternal_index.set(
          activeIndex + Math.ceil(prependIndexes.length)
        );
      } else if (appendIndexes.length > 0) {
        tvist.__tvistInternal_engine.__tvistInternal_index.set(activeIndex - appendIndexes.length);
      }
    }
    if (prependIndexes.length > 0 || appendIndexes.length > 0) {
      if (options.grid) {
        // GridModule задаёт позиции по offsetLeft и требует своего onUpdate.
        const locationBeforeUpdate = tvist.__tvistInternal_engine.__tvistInternal_location.get();
        const targetBeforeUpdate = tvist.__tvistInternal_engine.__tvistInternal_target.get();
        tvist.update();
        tvist.__tvistInternal_engine.__tvistInternal_location.set(locationBeforeUpdate);
        tvist.__tvistInternal_engine.__tvistInternal_target.set(targetBeforeUpdate);
      } else {
        tvist.__tvistInternal_engine.__tvistInternal_updateAfterReorder(slides);
      }
    }
    const actualNewIndex = tvist.__tvistInternal_engine.__tvistInternal_index.get();
    if (prependIndexes.length > 0) {
      local_correctPositionAfterRearrange(activeIndex, actualNewIndex, oldSlidePositions);
    } else if (appendIndexes.length > 0) {
      local_correctPositionAfterRearrange(activeIndex, actualNewIndex, oldSlidePositions);
    }
    if (
      (initial || prependIndexes.length > 0 || appendIndexes.length > 0) &&
      typeof slideRealIndex !== 'undefined'
    ) {
      const found = findDomIndexByRealIndex(tvist.slides, slideRealIndex, {
        preferNonClone: withClones,
      });
      if (found !== -1) {
        tvist.__tvistInternal_engine.__tvistInternal_index.set(found);
        const targetPosition =
          tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(found);
        tvist.__tvistInternal_engine.__tvistInternal_location.set(targetPosition);
        tvist.__tvistInternal_engine.__tvistInternal_target.set(targetPosition);
        tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
      }
    }
    base.emit('loopFix');
    return tvist.__tvistInternal_engine.__tvistInternal_index.get();
  }

  function local_getSlidesPerView(bothDirections: boolean): number {
    const perPage = options.perPage ?? 1;
    let slidesPerView = typeof perPage === 'number' ? perPage : 1;
    if (bothDirections && slidesPerView % 2 === 0) {
      slidesPerView += 1;
    }
    return slidesPerView;
  }

  function local_computeLoopedSlides(bothDirections: boolean): number {
    const slidesPerView = local_getSlidesPerView(bothDirections);
    const slidesPerGroup = options.slidesPerGroup ?? 1;
    const hasPeek = options.peek !== undefined;
    let loopedSlides =
      bothDirections || hasPeek
        ? Math.max(slidesPerGroup, Math.ceil(slidesPerView / 2) + (hasPeek ? 1 : 0))
        : Math.max(slidesPerGroup, slidesPerView + (hasPeek ? 1 : 0));
    if (loopedSlides % slidesPerGroup !== 0) {
      loopedSlides += slidesPerGroup - (loopedSlides % slidesPerGroup);
    }
    return Math.max(loopedSlides, hasPeek ? 2 : 1);
  }

  function local_preparePrependIndexes(
    activeColIndexWithShift: number,
    loopedSlides: number,
    slidesCount: number
  ): number[] {
    if (activeColIndexWithShift >= loopedSlides) return [];
    const slidesPerGroup = options.slidesPerGroup ?? 1;
    const calculatedPrepended = Math.max(loopedSlides - activeColIndexWithShift, slidesPerGroup);
    const slidesPrepended = Math.min(calculatedPrepended, slidesCount - 1);
    const indexes: number[] = [];
    for (let i = 0; i < slidesPrepended; i++) {
      indexes.push(slidesCount - (i % slidesCount) - 1);
    }
    return indexes;
  }

  function local_prepareAppendIndexes(
    activeColIndexWithShift: number,
    slidesPerView: number,
    loopedSlides: number,
    slidesCount: number
  ): number[] {
    if (activeColIndexWithShift + slidesPerView <= slidesCount - loopedSlides) return [];
    const slidesPerGroup = options.slidesPerGroup ?? 1;
    const calculatedAppended = Math.max(
      activeColIndexWithShift - (slidesCount - loopedSlides * 2),
      slidesPerGroup
    );
    const slidesAppended = Math.min(calculatedAppended, slidesCount - 1);
    const indexes: number[] = [];
    for (let i = 0; i < slidesAppended; i++) {
      indexes.push(i % slidesCount);
    }
    return indexes;
  }

  function local_applyDomRearrangement(
    container: HTMLElement,
    slides: readonly HTMLElement[],
    isPrev: boolean,
    isNext: boolean,
    prependIndexes: number[],
    appendIndexes: number[]
  ): void {
    if (isPrev && prependIndexes.length > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = prependIndexes.length - 1; i >= 0; i--) {
        const idx = prependIndexes[i];
        const slide = idx !== undefined ? slides[idx] : undefined;
        if (slide) fragment.appendChild(slide);
      }
      container.prepend(fragment);
    }
    if (isNext && appendIndexes.length > 0) {
      const fragment = document.createDocumentFragment();
      appendIndexes.forEach((index) => {
        const slide = slides[index];
        if (slide) fragment.appendChild(slide);
      });
      container.append(fragment);
    }
  }

  function local_teleportIfNeeded(
    activeIndex: number,
    slidesPerView: number,
    slidesCount: number
  ): void {
    const safeZone = local__clonesPerSide > 0 ? local__clonesPerSide : slidesPerView;
    if (activeIndex >= safeZone && activeIndex < slidesCount - safeZone) return;
    const currentRealIndex = tvist.realIndex;
    const targetDomIndex = findDomIndexByRealIndex(tvist.slides, currentRealIndex, {
      preferNonClone: true,
    });
    if (targetDomIndex !== -1 && targetDomIndex !== activeIndex) {
      const newPosition =
        tvist.__tvistInternal_engine.__tvistInternal_getScrollPositionForIndex(targetDomIndex);
      tvist.__tvistInternal_engine.__tvistInternal_index.set(targetDomIndex);
      tvist.__tvistInternal_engine.__tvistInternal_location.set(newPosition);
      tvist.__tvistInternal_engine.__tvistInternal_target.set(newPosition);
      tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
    }
  }

  function local_correctPositionAfterRearrange(
    oldActiveIndex: number,
    newActiveIndex: number,
    oldSlidePositions: number[]
  ): void {
    const currentTranslate = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    const oldSlidePosition = oldSlidePositions[oldActiveIndex] ?? 0;
    const newSlidePosition =
      tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(newActiveIndex);
    const diff = newSlidePosition - oldSlidePosition;
    const newTranslate = currentTranslate - diff;
    tvist.__tvistInternal_engine.__tvistInternal_location.set(newTranslate);
    tvist.__tvistInternal_engine.__tvistInternal_target.set(newTranslate);
    tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
  }

  function local_destroy(): void {
    if (!local_isInitialized) return;
    const slides = tvist.slides;
    const container = tvist.container;
    const realIndex = tvist.realIndex;
    if (local__withClones) {
      // Удаляем все клоны
      slides.forEach((slideEl) => {
        if (slideEl.classList.contains(TVIST_CLASSES.slideClone)) {
          slideEl.remove();
        }
      });
      // Обновляем список слайдов, чтобы дальше работать только с оригиналами
      tvist.__tvistInternal_updateSlidesList();
    }
    const currentSlides = tvist.slides;
    const newSlidesOrder: (HTMLElement | undefined)[] = [];
    currentSlides.forEach((slideEl) => {
      const indexAttr = slideEl.getAttribute('data-tvist-slide-index');
      if (indexAttr) {
        newSlidesOrder[parseInt(indexAttr, 10)] = slideEl;
      }
    });
    currentSlides.forEach((slideEl) => slideEl.removeAttribute('data-tvist-slide-index'));
    const fragment = document.createDocumentFragment();
    newSlidesOrder.forEach((slideEl) => {
      if (slideEl) fragment.appendChild(slideEl);
    });
    container.appendChild(fragment);
    tvist.__tvistInternal_updateSlidesList();
    tvist.update();
    tvist.scrollTo(realIndex, true);
    local_isInitialized = false;
  }

  function local_getLoopConfig(): { enabled: boolean; withClones: boolean } {
    const raw = options.loop;
    let enabled = false;
    let withClones = false;
    if (raw === true) {
      enabled = true;
      withClones = false;
    } else if (typeof raw === 'object' && raw !== null) {
      enabled = raw.enabled !== false;
      withClones = raw.withClones === true;
    }
    if (enabled && !withClones) {
      const slidesCount = tvist.slides.length;
      const bothDirections =
        tvist.__tvistInternal_engine.__tvistInternal_isCenterMode() || options.peek !== undefined;
      const slidesPerView = local_getSlidesPerView(bothDirections);
      const loopedSlides = local_computeLoopedSlides(bothDirections);
      let requiredSlides = slidesPerView + loopedSlides;
      if (bothDirections) {
        requiredSlides += Math.floor(slidesPerView / 2);
      }
      if (slidesCount > slidesPerView && slidesCount < requiredSlides) {
        withClones = true;
      }
    }
    return { enabled, withClones };
  }
  /**
   * Создаёт DOM-клоны по краям для режима withClones.
   */
  function local_createClones(): void {
    const slides = tvist.slides;
    const container = tvist.container;
    const originalCount = slides.length;
    if (originalCount === 0) return;
    const perPage = options.perPage ?? 1;
    const slidesPerGroup = options.slidesPerGroup ?? 1;
    const base = typeof perPage === 'number' ? perPage : 1;
    // Добавляем +1 к base, так как peek может показывать часть следующего слайда,
    // и нам нужен запасной клон, чтобы не было "дыры" во время анимации.
    const needed = Math.max(base + 1, slidesPerGroup);
    const clonesPerSide = Math.ceil(needed / originalCount) * originalCount;
    local__clonesPerSide = clonesPerSide;
    for (let i = 0; i < clonesPerSide; i++) {
      const original = slides[i % originalCount];
      if (!original) continue;
      const clone = original.cloneNode(true) as HTMLElement;
      clone.classList.add(TVIST_CLASSES.slideClone);
      const realIndexAttr = original.getAttribute('data-tvist-slide-index');
      if (realIndexAttr != null) clone.setAttribute('data-tvist-slide-index', realIndexAttr);
      container.appendChild(clone);
    }
    const headFragment = document.createDocumentFragment();
    for (let i = 0; i < clonesPerSide; i++) {
      const original =
        slides[(originalCount - 1 - (i % originalCount) + originalCount) % originalCount];
      if (!original) continue;
      const clone = original.cloneNode(true) as HTMLElement;
      clone.classList.add(TVIST_CLASSES.slideClone);
      const realIndexAttr = original.getAttribute('data-tvist-slide-index');
      if (realIndexAttr != null) clone.setAttribute('data-tvist-slide-index', realIndexAttr);
      headFragment.prepend(clone);
    }
    container.prepend(headFragment);
    tvist.__tvistInternal_updateSlidesList();
  }
  const component: LoopModule = {
    shouldBeActive: base.shouldBeActive,
    get name() {
      return local_name;
    },
    get loopedSlides() {
      return local_loopedSlides;
    },
    set loopedSlides(value) {
      local_loopedSlides = value;
    },
    init: local_init,
    onOptionsUpdate: local_onOptionsUpdate,
    fix: local_fix,
    getTransformState: local_getTransformState,
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
