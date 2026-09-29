/** Контекст для передачи между подметодами scrollTo */
interface ScrollContext {
  requestedIndex: number;
  clampedIndex: number;
  normalizedIndex: number;
  eventIndex: number;
  indexChanged: boolean;
}

import { Vector1D } from '../Vector1D';
import { Counter } from '../Counter';
import { Animator, easings, type EasingFunction } from '../Animator';

import type { TvistRuntime as Tvist } from '../runtime';
import type { TvistOptions } from '../types';

import {
  findDomIndexByRealIndex,
  findDomIndexByRealIndexForTransition,
} from '../../utils/slideRealIndex';
interface MotionContext {
  __tvistInternal_animator: Animator;
  __tvistInternal_getEndIndex: () => number;
  __tvistInternal_index: Counter;
  __tvistInternal_getScrollPositionForIndex: (index: number) => number;
  __tvistInternal_tvist: Tvist;
  __tvistInternal_isLoopEnabled: () => boolean;
  __tvistInternal_options: TvistOptions;
  __tvistInternal_isCenterMode: () => boolean;
  __tvistInternal_getEventIndex: (domIndex: number) => number;
  __tvistInternal_isLoopWithClonesEnabled: () => boolean;
  __tvistInternal_getMaxScrollPosition: () => number;
  __tvistInternal_getSlidePosition: (index: number) => number;
  __tvistInternal_getMinScrollPosition: () => number;
  __tvistInternal_target: Vector1D;
  __tvistInternal_location: Vector1D;
  __tvistInternal__isLocked: boolean;
  __tvistInternal_isCenterJustify: () => boolean;
  __tvistInternal_scrollCacheValid: boolean;
  __tvistInternal_updateScrollCache: () => void;
  __tvistInternal_cachedRootSize: number;
  __tvistInternal_getContentSize: () => number;
}
export interface Motion {
  __tvistInternal_applyTransform: () => void;
  __tvistInternal__lastAppliedTransformPos: number | null;
  __tvistInternal_scrollTo: (index: number, instant?: boolean, afterDragSnap?: boolean) => void;
  __tvistInternal_ensureTransitionUpdates: () => void;
  __tvistInternal_scrollBy: (delta: number, afterDragSnap?: boolean) => void;
  __tvistInternal_cssTransitionActive: boolean;
  __tvistInternal_stopCssTransition: (freeze?: boolean) => void;
}
export function createMotion(deps: MotionContext): Motion {
  /** Последняя позиция, записанная в style.transform (после roundLengths). */
  let local__lastAppliedTransformPos: number | null = null;

  let local_cssTransitionActive = false;

  let local_transitionRaf: number | null = null;

  let local_transitionTimer: number | null = null;

  let local_transitionToken = 0;

  /**
   * Переход к слайду
   * @param index - индекс целевого слайда
   * @param instant - мгновенный переход без анимации
   * @param afterDragSnap - snap после отпускания при drag (длительность = speed, easing easeOutCubic)
   */
  function local_scrollTo(index: number, instant = false, afterDragSnap = false): void {
    deps.__tvistInternal_animator.stop();
    const token = ++local_transitionToken;
    const endIndex = deps.__tvistInternal_getEndIndex();
    const previousIndex = deps.__tvistInternal_index.get();
    const ctx = local_resolveTargetIndex(index, endIndex, previousIndex, afterDragSnap);
    if (ctx.indexChanged && !instant) {
      local_handleBeforeTransition(ctx, previousIndex);
    }
    deps.__tvistInternal_index.set(ctx.clampedIndex);
    const targetPosition = local_clampTargetPosition(
      deps.__tvistInternal_getScrollPositionForIndex(ctx.normalizedIndex),
      endIndex
    );
    if (ctx.indexChanged) {
      deps.__tvistInternal_tvist.emit('beforeSlideChange', ctx.eventIndex);
    }
    if (instant) {
      local_performInstantScroll(targetPosition, ctx, endIndex);
    } else {
      local_performAnimatedScroll(targetPosition, ctx, endIndex, afterDragSnap, token);
    }
  }

  function local_resolveTargetIndex(
    index: number,
    endIndex: number,
    previousIndex: number,
    afterDragSnap = false
  ): ScrollContext {
    const loopEnabled = deps.__tvistInternal_isLoopEnabled();
    let clampedIndex =
      loopEnabled ||
      deps.__tvistInternal_options.isNavigation ||
      deps.__tvistInternal_isCenterMode()
        ? index
        : Math.max(0, Math.min(index, endIndex));
    const rewindAllowed =
      deps.__tvistInternal_options.rewind &&
      !loopEnabled &&
      (!afterDragSnap || deps.__tvistInternal_options.rewindByDrag);
    if (rewindAllowed) {
      if (index > endIndex) {
        clampedIndex = 0;
      } else if (index < 0) {
        clampedIndex = endIndex;
      }
    }
    const normalizedIndex = deps.__tvistInternal_index.loop
      ? clampedIndex < 0
        ? clampedIndex + deps.__tvistInternal_index.max
        : clampedIndex % deps.__tvistInternal_index.max
      : Math.max(0, Math.min(clampedIndex, deps.__tvistInternal_index.endIndex));
    // eventIndex — realIndex для событий (slideChangeStart, slideChangeEnd и пр.)
    // В loop-режиме normalizedIndex = DOM-позиция, eventIndex = realIndex из data-tvist-slide-index.
    // В обычном режиме они совпадают.
    return {
      requestedIndex: index,
      clampedIndex,
      normalizedIndex,
      eventIndex: deps.__tvistInternal_getEventIndex(normalizedIndex),
      indexChanged: normalizedIndex !== previousIndex,
    };
  }

  /**
   * Обрабатывает beforeTransitionStart и loop re-indexing.
   * Может мутировать ctx при loop-перестановке слайдов.
   */
  function local_handleBeforeTransition(ctx: ScrollContext, previousIndex: number): void {
    const savedDirection = deps.__tvistInternal_tvist.__tvistInternal__scrollDirection;
    const direction = savedDirection ?? (ctx.normalizedIndex > previousIndex ? 'next' : 'prev');
    deps.__tvistInternal_tvist.__tvistInternal__scrollDirection = undefined;
    const counterBeforeEmit = deps.__tvistInternal_index.get();
    deps.__tvistInternal_tvist.emit('beforeTransitionStart', { index: ctx.eventIndex, direction });
    const counterAfterEmit = deps.__tvistInternal_index.get();
    // LoopModule переставил слайды: DOM-позиция целевого слайда могла измениться.
    // Ищем новую DOM-позицию по eventIndex (= realIndex).
    if (counterBeforeEmit !== counterAfterEmit && deps.__tvistInternal_isLoopEnabled()) {
      const withClones = deps.__tvistInternal_isLoopWithClonesEnabled();
      const targetDomIndex = withClones
        ? findDomIndexByRealIndexForTransition(
            deps.__tvistInternal_tvist.slides,
            ctx.eventIndex,
            counterAfterEmit,
            direction
          )
        : findDomIndexByRealIndex(deps.__tvistInternal_tvist.slides, ctx.eventIndex);
      if (targetDomIndex !== -1) {
        ctx.clampedIndex = targetDomIndex;
        ctx.normalizedIndex = targetDomIndex;
      } else {
        // Fallback: delta-подход
        const delta = ctx.clampedIndex - counterBeforeEmit;
        ctx.clampedIndex = counterAfterEmit + delta;
        ctx.normalizedIndex =
          ((ctx.clampedIndex % deps.__tvistInternal_index.max) + deps.__tvistInternal_index.max) %
          deps.__tvistInternal_index.max;
      }
      // realIndex изменился — события должны эмититься независимо от DOM-позиции
      ctx.indexChanged = true;
    }
  }

  /** При навигации применяем ограничения (но не для center режима) */
  function local_clampTargetPosition(position: number, endIndex: number): number {
    if (
      !deps.__tvistInternal_options.isNavigation ||
      deps.__tvistInternal_isLoopEnabled() ||
      deps.__tvistInternal_isCenterMode()
    ) {
      return position;
    }
    const peekTrim = deps.__tvistInternal_options.peekTrim !== false;
    const maxPos = peekTrim
      ? deps.__tvistInternal_getMaxScrollPosition()
      : -deps.__tvistInternal_getSlidePosition(endIndex);
    const minPos = peekTrim ? deps.__tvistInternal_getMinScrollPosition() : 0;
    return Math.max(maxPos, Math.min(minPos, position));
  }

  function local_performInstantScroll(
    targetPosition: number,
    ctx: ScrollContext,
    endIndex: number
  ): void {
    deps.__tvistInternal_target.set(targetPosition);
    deps.__tvistInternal_location.set(targetPosition);
    local_applyTransform();
    if (ctx.indexChanged) {
      deps.__tvistInternal_tvist.emit('slideChangeEnd', ctx.eventIndex);
      local_emitReachEdge(ctx, endIndex);
    }
  }

  function local_performAnimatedScroll(
    targetPosition: number,
    ctx: ScrollContext,
    endIndex: number,
    afterDragSnap: boolean,
    token: number
  ): void {
    deps.__tvistInternal_target.set(targetPosition);
    const defaultSpeed = deps.__tvistInternal_options.speed ?? 300;
    if (ctx.indexChanged) {
      deps.__tvistInternal_tvist.emit('transitionStart', ctx.eventIndex);
      deps.__tvistInternal_tvist.emit('slideChangeStart', ctx.eventIndex, {
        isDrag: afterDragSnap,
      });
    }
    // Проверяем, нужна ли анимация для корректировки позиции
    const currentLocation = deps.__tvistInternal_location.get();
    const needsAnimation = Math.abs(currentLocation - targetPosition) > 0.5;
    let duration = defaultSpeed;
    let easingFn: EasingFunction = easings.easeOutQuad;
    // Определяем, является ли этот скролл rewind-переходом
    const isRewind =
      deps.__tvistInternal_options.rewind &&
      (!afterDragSnap || deps.__tvistInternal_options.rewindByDrag) &&
      !deps.__tvistInternal_isLoopEnabled() &&
      ctx.indexChanged &&
      ((ctx.requestedIndex > endIndex && ctx.normalizedIndex === 0) ||
        (ctx.requestedIndex < 0 && ctx.normalizedIndex === endIndex));
    if (afterDragSnap && !isRewind) {
      duration = deps.__tvistInternal_options.speed ?? 300;
      easingFn = easings.easeOutCubic;
    } else if (isRewind) {
      duration = deps.__tvistInternal_options.speed ?? 300;
      easingFn = easings.easeOutQuad;
    }
    const complete = () => {
      if (token !== local_transitionToken) return;
      deps.__tvistInternal_tvist.emit('transitionEnd', ctx.eventIndex);
      if (ctx.indexChanged) {
        deps.__tvistInternal_tvist.emit('slideChangeEnd', ctx.eventIndex, {
          isDrag: afterDragSnap,
        });
        local_emitReachEdge(ctx, endIndex);
      }
    };
    if (needsAnimation && duration > 0) {
      if ((deps.__tvistInternal_options.effect ?? 'slide') === 'slide') {
        local_startCssTransition(
          currentLocation,
          targetPosition,
          duration,
          easingFn,
          token,
          complete
        );
      } else {
        deps.__tvistInternal_animator.animate(
          currentLocation,
          targetPosition,
          duration,
          (value) => {
            deps.__tvistInternal_location.set(value);
            local_applyTransform();
            deps.__tvistInternal_tvist.emit('scroll');
          },
          complete,
          easingFn
        );
      }
    } else {
      if (needsAnimation) {
        deps.__tvistInternal_location.set(targetPosition);
        local_applyTransform();
        deps.__tvistInternal_tvist.emit('scroll');
        complete();
        return;
      }
      // Позиция уже корректна (needsAnimation=false); microtask чтобы событие было
      // асинхронным как после анимации. Эмитируем transitionEnd всегда, slideChangeEnd
      // — только если индекс изменился (например, drag довёл до граничной позиции).
      void Promise.resolve().then(complete);
    }
  }

  function local_startCssTransition(
    from: number,
    to: number,
    duration: number,
    easing: EasingFunction,
    token: number,
    complete: () => void
  ): void {
    const container = deps.__tvistInternal_tvist.container;
    // Loop-перестановка и остановка предыдущего перехода меняют transform
    // в том же кадре. Фиксируем начальную позицию в computed style, иначе
    // браузер объединит её с конечной и пропустит CSS-анимацию.
    local_writeTransform(from);
    void getComputedStyle(container).transform;
    const start = performance.now();
    local_cssTransitionActive = true;
    deps.__tvistInternal_location.setReader(
      () => from + (to - from) * easing(Math.min((performance.now() - start) / duration, 1))
    );
    const bezier =
      easing === easings.easeOutCubic
        ? 'cubic-bezier(0.333333, 1, 0.666667, 1)'
        : 'cubic-bezier(0.333333, 0.666667, 0.666667, 1)';
    container.style.transition = `transform ${duration}ms ${bezier}`;
    local_writeTransform(to);
    const finish = () => {
      if (token !== local_transitionToken || !local_cssTransitionActive) return;
      if (!container.isConnected) {
        local_stopCssTransition(false);
        return;
      }
      local_stopCssTransition(false);
      deps.__tvistInternal_location.set(to);
      local_emitPositionUpdates();
      complete();
    };
    local_onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === container && event.propertyName === 'transform') finish();
    };
    container.addEventListener('transitionend', local_onTransitionEnd);
    local_transitionTimer = window.setTimeout(finish, duration);
    local_ensureTransitionUpdates();
  }

  let local_onTransitionEnd: ((event: TransitionEvent) => void) | undefined;

  /** Запускает чтение позиции только пока промежуточные значения кому-то нужны. */
  function local_ensureTransitionUpdates(): void {
    if (
      !local_cssTransitionActive ||
      local_transitionRaf !== null ||
      !deps.__tvistInternal_tvist.__tvistInternal_hasPositionListeners()
    )
      return;
    local_transitionRaf = requestAnimationFrame(() => {
      local_transitionRaf = null;
      if (!local_cssTransitionActive) return;
      local_emitPositionUpdates();
      local_ensureTransitionUpdates();
    });
  }

  function local_emitPositionUpdates(): void {
    const position = deps.__tvistInternal_location.get();
    deps.__tvistInternal_tvist.emit('setTranslate', deps.__tvistInternal_tvist, position);
    local_emitProgress();
    deps.__tvistInternal_tvist.emit('scroll');
  }

  function local_readRenderedPosition(): number {
    try {
      const transform = getComputedStyle(deps.__tvistInternal_tvist.container).transform;
      if (transform.startsWith('matrix')) {
        const matrix = new DOMMatrixReadOnly(transform);
        return deps.__tvistInternal_options.direction === 'vertical' ? matrix.m42 : matrix.m41;
      }
    } catch {
      // happy-dom не вычисляет матрицу CSS-перехода.
    }
    return deps.__tvistInternal_location.get();
  }

  function local_stopCssTransition(freeze = true): void {
    if (!local_cssTransitionActive) return;
    const position = freeze ? local_readRenderedPosition() : deps.__tvistInternal_target.get();
    local_cssTransitionActive = false;
    deps.__tvistInternal_location.setReader();
    if (local_transitionRaf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(local_transitionRaf);
    }
    if (local_transitionTimer !== null) clearTimeout(local_transitionTimer);
    local_transitionRaf = null;
    local_transitionTimer = null;
    if (local_onTransitionEnd)
      deps.__tvistInternal_tvist.container.removeEventListener(
        'transitionend',
        local_onTransitionEnd
      );
    local_onTransitionEnd = undefined;
    deps.__tvistInternal_tvist.container.style.transition = '';
    deps.__tvistInternal_location.set(position);
    if (freeze) local_writeTransform(position);
  }

  function local_writeTransform(position: number): void {
    const pos =
      deps.__tvistInternal_options.roundLengths === false ? position : Math.round(position);
    local_setTransformPosition(pos);
  }

  function local_setTransformPosition(pos: number): void {
    deps.__tvistInternal_tvist.container.style.transform =
      deps.__tvistInternal_options.direction === 'vertical'
        ? `translate3d(0, ${pos}px, 0)`
        : `translate3d(${pos}px, 0, 0)`;
    local__lastAppliedTransformPos = pos;
  }

  /** Прогресс прокрутки 0..1 (только при !loop) */
  function local_emitProgress(): void {
    if (deps.__tvistInternal_isLoopEnabled()) return;
    const minScroll = deps.__tvistInternal_getMinScrollPosition();
    const maxScroll = deps.__tvistInternal_getMaxScrollPosition();
    const range = maxScroll - minScroll;
    if (range <= 0) return;
    const pos = deps.__tvistInternal_location.get();
    const progress = Math.max(0, Math.min(1, (pos - minScroll) / range));
    deps.__tvistInternal_tvist.emit('progress', progress);
  }

  /** События достижения начала/конца (reachBeginning / reachEnd) */
  function local_emitReachEdge(ctx: ScrollContext, endIndex: number): void {
    const index = ctx.eventIndex;
    // reach-edge только когда requestedIndex вышел за пределы доступного диапазона
    const loopEnabled = deps.__tvistInternal_isLoopEnabled();
    const triedBeforeStart = !loopEnabled && ctx.requestedIndex < 0;
    const triedAfterEnd =
      !loopEnabled && !deps.__tvistInternal_options.rewind && ctx.requestedIndex > endIndex;
    if (index <= 0 && triedBeforeStart) {
      deps.__tvistInternal_tvist.emit('reachBeginning');
    }
    if (index >= endIndex && triedAfterEnd) {
      deps.__tvistInternal_tvist.emit('reachEnd');
    }
  }

  function local_scrollBy(delta: number, afterDragSnap = false): void {
    const targetIndex = deps.__tvistInternal_index.get() + delta;
    // В loop-режиме направление определяется по знаку delta, а не по сравнению индексов
    const direction = delta > 0 ? 'next' : delta < 0 ? 'prev' : undefined;
    if (direction) deps.__tvistInternal_tvist.__tvistInternal__scrollDirection = direction;
    local_scrollTo(targetIndex, false, afterDragSnap);
  }

  /**
   * Применяет transform к контейнеру.
   * Мемоизирует последнюю применённую позицию: если округлённое значение не
   * изменилось, пропускает запись style.transform и все события (scroll/setTranslate/progress).
   * Это убирает лишние DOM-записи и обработчики на кадрах без визуального сдвига.
   */
  function local_applyTransform(): void {
    const container = deps.__tvistInternal_tvist.container;
    if (deps.__tvistInternal__isLocked) {
      if (deps.__tvistInternal_isCenterJustify()) {
        if (!deps.__tvistInternal_scrollCacheValid) deps.__tvistInternal_updateScrollCache();
        const offset = Math.max(
          0,
          (deps.__tvistInternal_cachedRootSize - deps.__tvistInternal_getContentSize()) / 2
        );
        if (local__lastAppliedTransformPos !== offset) {
          local_setTransformPosition(offset);
          deps.__tvistInternal_tvist.emit('setTranslate', deps.__tvistInternal_tvist, offset);
          local_emitProgress();
        }
      } else {
        if (local__lastAppliedTransformPos !== 0) {
          container.style.transform = '';
          local__lastAppliedTransformPos = 0;
          deps.__tvistInternal_tvist.emit('setTranslate', deps.__tvistInternal_tvist, 0);
          local_emitProgress();
        }
      }
      return;
    }
    const rawPos = deps.__tvistInternal_location.get();
    const pos = deps.__tvistInternal_options.roundLengths === false ? rawPos : Math.round(rawPos);
    if (pos === local__lastAppliedTransformPos) return;
    local_setTransformPosition(pos);
    deps.__tvistInternal_tvist.emit('setTranslate', deps.__tvistInternal_tvist, pos);
    local_emitProgress();
  }
  const component: Motion = {
    __tvistInternal_applyTransform: local_applyTransform,
    get __tvistInternal__lastAppliedTransformPos() {
      return local__lastAppliedTransformPos;
    },
    set __tvistInternal__lastAppliedTransformPos(value) {
      local__lastAppliedTransformPos = value;
    },
    __tvistInternal_scrollTo: local_scrollTo,
    __tvistInternal_ensureTransitionUpdates: local_ensureTransitionUpdates,
    __tvistInternal_scrollBy: local_scrollBy,
    get __tvistInternal_cssTransitionActive() {
      return local_cssTransitionActive;
    },
    set __tvistInternal_cssTransitionActive(value) {
      local_cssTransitionActive = value;
    },
    __tvistInternal_stopCssTransition: local_stopCssTransition,
  };
  return component;
}
