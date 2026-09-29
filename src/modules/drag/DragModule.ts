/**
 * Drag Module
 *
 * Возможности:
 * - Touch и Mouse поддержка
 * - Velocity tracking для инерции
 * - Rubberband эффект на границах
 * - Momentum scroll с friction
 * - Snap к ближайшему слайду
 * - Free mode без snap
 * - Free mode с опциональным snap (freeSnap)
 * - Passive listeners для производительности
 */
import { createComponent, type Component } from '../Component';
import {
  HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS,
  TVIST_CLASSES,
  TVIST_DOM_EVENTS,
} from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions, TvistLongPressDomEventDetail } from '../../core/types';

const RUBBERBAND_FRICTION = 5;
const SLIDER_CONTROL_SELECTOR = [
  TVIST_CLASSES.arrowPrev,
  TVIST_CLASSES.arrowNext,
  TVIST_CLASSES.pagination,
  TVIST_CLASSES.bullet,
]
  .map((className) => `.${className}`)
  .join(', ');
interface DragPoint {
  x: number;
  y: number;
  time: number;
}
interface HoldToPauseConfig {
  threshold: number;
  root: 'slider' | 'container' | HTMLElement;
  exclude?: string;
  cancelOnDrag: boolean;
  moveThreshold?: number;
}
type PointerEventHandler = (e: TouchEvent | MouseEvent | PointerEvent) => void;
interface ManagedHandler {
  event: string;
  handler: PointerEventHandler | EventListener;
  options?: AddEventListenerOptions;
}

/** Internal component; state lives in this factory's closure. */
export interface DragModule extends Component {
  readonly name: 'drag';

  init(): void;

  destroy(): void;

  shouldBeActive(): boolean;

  onResize(): void;

  onOptionsUpdate(): void;
}

export function createDragModule(tvist: Tvist, options: TvistOptions): DragModule {
  const base = createComponent(tvist, options);

  const local_name = 'drag' as const;

  let local_isDragging = false;

  let local_startX = 0;

  let local_startY = 0;

  let local_startPosition = 0;

  let local_startIndex = 0;

  let local_currentX = 0;

  let local_currentY = 0;

  let local_wasAnimating = false;

  let local_animationTarget: number | null = null;

  let local_animationId: number | null = null;

  let local_minPosition = 0;

  let local_maxPosition = 0;

  let local_loopModuleRef: {
    fix?: (params: {
      direction?: 'next' | 'prev';
      activeSlideIndex?: number;
      slideTo?: boolean;
      setTranslate?: boolean;
    }) => void;
  } | null = null;

  let local_isMarqueeActive = false;

  const local_FRICTION = 0.92 as const;

  const local_MIN_VELOCITY = 0.05 as const;

  const local_LOG_INTERVAL = 200 as const;

  const local_TOUCH_ANGLE = 45 as const;

  const local_MIN_DRAG_DISTANCE = 5 as const;

  let local_isPotentialDrag = false;

  let local_holdConfig: HoldToPauseConfig | null = null;

  let local_holdRoot: HTMLElement | null = null;

  let local_holdTimer: number | null = null;

  let local_holdPending = false;

  let local_holdActive = false;

  let local_holdPointerType = 'mouse';

  let local_holdStartX = 0;

  let local_holdStartY = 0;

  let local_holdPointerId: number | null = null;

  let local_holdCaptureTarget: HTMLElement | null = null;

  let local_isFirstMove = true;
  // Frame-based cooldown: после любого loopFix пропускаем N pointermove событий,
  // предотвращая каскадный ping-pong при быстрых drag-ах в маленьких каруселях.
  let local_coverageFixCooldown = 0;

  let local_accumulatedDeltaBeforeDragStart: { x: number; y: number } = { x: 0, y: 0 };

  let local_shouldSubtractAccumulatedDelta = false;

  let local_lastMoveTime = 0;

  let local_baseEvent: DragPoint | null = null;

  let local_prevBaseEvent: DragPoint | null = null;

  function local_init(): void {
    if (!local_shouldBeActive()) return;
    local_attachEvents();
    local_setupHoldToPause();
    local_updateCachedRefs();
    local_updateBounds();
    base.on('resized', () => local_updateBounds());
    base.on('positionShifted', local_onPositionShifted);
    base.on('loopFix', local_onLoopFix);
  }

  function read_isLoopEnabled(): boolean {
    return (
      options.loop === true || (typeof options.loop === 'object' && options.loop.enabled !== false)
    );
  }

  function read_isLoopWithClonesEnabled(): boolean {
    return typeof options.loop === 'object' && options.loop.withClones === true;
  }
  /**
   * Нет отдельной «страницы» прокрутки (все слайды помещаются в perPage) —
   * loopFix на драге не вызываем (и избегаем лишних прыжков).
   * При 2 слайдах и perPage 1 здесь false — перестановка нужна уже во время драга.
   */
  function local_shouldSkipLoopDomReorderDuringDrag(): boolean {
    const slidesCount = tvist.slides.length;
    const perPage = options.perPage ?? 1;
    return slidesCount <= perPage;
  }

  function local_updateCachedRefs(): void {
    local_loopModuleRef = tvist.__tvistInternal_getModule('loop') as typeof local_loopModuleRef;
    local_isMarqueeActive = options.marquee !== false && options.marquee !== undefined;
  }

  const local_onLoopFix: () => void = (): void => {
    if (local_isDragging) {
      local_startPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
      local_startIndex = tvist.__tvistInternal_engine.__tvistInternal_index.get();
    }
  };

  function local_destroy(): void {
    local_cancelHoldTracking();
    local_detachHoldEvents();
    local_detachEvents();
    local_stopMomentum();
    base.off('positionShifted', local_onPositionShifted);
    base.off('loopFix', local_onLoopFix);
  }

  const local_onPositionShifted: (delta: number) => void = (delta: number): void => {
    if (local_isDragging) {
      local_startPosition += delta;
    }
  };

  function local_shouldBeActive(): boolean {
    return options.drag !== false;
  }
  /**
   * При loop или marquee границ нет (бесконечная прокрутка).
   * При center (без loop) используем getScrollPositionForIndex для учёта centerOffset.
   */
  function local_updateBounds(): void {
    const { __tvistInternal_engine: engine, slides } = tvist;
    const perPage = options.perPage ?? 1;
    if (read_isLoopEnabled() || local_isMarqueeActive) {
      local_minPosition = Infinity;
      local_maxPosition = -Infinity;
    } else if (tvist.__tvistInternal_engine.__tvistInternal_isCenterMode()) {
      local_minPosition = engine.__tvistInternal_getScrollPositionForIndex(0);
      local_maxPosition = engine.__tvistInternal_getScrollPositionForIndex(slides.length - 1);
    } else {
      const usePeekTrim = options.peekTrim !== false;
      local_minPosition = usePeekTrim ? engine.__tvistInternal_getMinScrollPosition() : 0;
      local_maxPosition = usePeekTrim
        ? engine.__tvistInternal_getMaxScrollPosition()
        : -engine.__tvistInternal_getSlidePosition(slides.length - perPage);
    }
    if (options.debug) {
      console.warn('[DragModule] Границы обновлены:', {
        minPosition: local_minPosition,
        maxPosition: local_maxPosition,
        loop: read_isLoopEnabled(),
        center: tvist.__tvistInternal_engine.__tvistInternal_isCenterMode(),
        peekTrim: options.peekTrim !== false,
        slidesCount: slides.length,
        perPage,
      });
    }
  }

  function local_manageEvents(
    action: 'add' | 'remove',
    target: EventTarget,
    handlers: ManagedHandler[]
  ): void {
    for (const { event, handler, options } of handlers) {
      const listener = handler as EventListener;
      if (action === 'add') {
        base.resources.listen(target, event, listener, options);
      } else {
        base.resources.unlisten(target, event, listener);
      }
    }
  }

  function local_manageRootEvents(action: 'add' | 'remove'): void {
    const { root } = tvist;
    if ('PointerEvent' in window) {
      local_manageEvents(action, root, [{ event: 'pointerdown', handler: local_onPointerDown }]);
    } else {
      local_manageEvents(action, root, [
        { event: 'touchstart', handler: local_onPointerDown, options: { passive: true } },
        { event: 'mousedown', handler: local_onPointerDown },
      ]);
    }
    local_manageEvents(action, root, [{ event: 'dragstart', handler: local_onDragStart }]);
    root.classList.toggle(TVIST_CLASSES.draggable, action === 'add');
  }

  function local_attachEvents(): void {
    local_manageRootEvents('add');
  }

  function local_detachEvents(): void {
    local_manageRootEvents('remove');
    local_manageDocumentEvents('remove');
  }

  function local_manageDocumentEvents(action: 'add' | 'remove'): void {
    if ('PointerEvent' in window) {
      local_manageEvents(action, document, [
        { event: 'pointermove', handler: local_onPointerMove },
        { event: 'pointerup', handler: local_onPointerUp },
        { event: 'pointercancel', handler: local_onPointerUp },
      ]);
    } else {
      local_manageEvents(action, document, [
        { event: 'touchmove', handler: local_onPointerMove, options: { passive: false } },
        { event: 'touchend', handler: local_onPointerUp },
        { event: 'touchcancel', handler: local_onPointerUp },
        { event: 'mousemove', handler: local_onPointerMove },
        { event: 'mouseup', handler: local_onPointerUp },
      ]);
    }
  }

  function local_normalizeHoldToPause(raw: TvistOptions['holdToPause']): HoldToPauseConfig | null {
    if (!raw) return null;
    if (raw === true) {
      return {
        threshold: HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS,
        root: 'slider',
        cancelOnDrag: true,
      };
    }
    if (raw.enabled === false) return null;
    return {
      threshold: raw.threshold ?? HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS,
      root: raw.root ?? 'slider',
      exclude: raw.exclude,
      cancelOnDrag: raw.cancelOnDrag ?? true,
      moveThreshold: raw.moveThreshold,
    };
  }

  function local_resolveHoldRoot(config: HoldToPauseConfig): HTMLElement {
    if (config.root === 'container') return tvist.container;
    if (config.root === 'slider') return tvist.root;
    return config.root;
  }

  function local_setupHoldToPause(): void {
    local_holdConfig = local_normalizeHoldToPause(options.holdToPause);
    if (!local_holdConfig) return;
    local_holdRoot = local_resolveHoldRoot(local_holdConfig);
    local_attachHoldEvents();
  }

  function local_manageHoldEvents(action: 'add' | 'remove'): void {
    if (!local_holdRoot) return;
    if ('PointerEvent' in window) {
      local_manageEvents(action, local_holdRoot, [
        { event: 'pointerdown', handler: local_onHoldPointerDown },
        { event: 'lostpointercapture', handler: local_onLostPointerCapture },
      ]);
    } else {
      local_manageEvents(action, local_holdRoot, [
        { event: 'touchstart', handler: local_onHoldPointerDown, options: { passive: true } },
        { event: 'mousedown', handler: local_onHoldPointerDown },
      ]);
    }
  }

  function local_attachHoldEvents(): void {
    local_manageHoldEvents('add');
  }

  function local_detachHoldEvents(): void {
    local_manageHoldEvents('remove');
    local_holdRoot = null;
  }

  function local_manageHoldDocumentEvents(action: 'add' | 'remove'): void {
    if ('PointerEvent' in window) {
      local_manageEvents(action, document, [
        { event: 'pointermove', handler: local_onHoldPointerMove },
        { event: 'pointerup', handler: local_onHoldPointerUp },
        { event: 'pointercancel', handler: local_onHoldPointerUp },
      ]);
    } else {
      local_manageEvents(action, document, [
        { event: 'touchmove', handler: local_onHoldPointerMove, options: { passive: true } },
        { event: 'touchend', handler: local_onHoldPointerUp },
        { event: 'touchcancel', handler: local_onHoldPointerUp },
        { event: 'mousemove', handler: local_onHoldPointerMove },
        { event: 'mouseup', handler: local_onHoldPointerUp },
      ]);
    }
  }

  function local_addHoldDocumentEvents(): void {
    local_manageHoldDocumentEvents('add');
  }

  function local_removeHoldDocumentEvents(): void {
    local_manageHoldDocumentEvents('remove');
  }

  const local_onDragStart: (e: Event) => void = (e: Event): void => {
    e.preventDefault();
  };

  const local_onHoldPointerDown: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (!local_holdConfig || !local_holdRoot) return;
    if ('button' in e && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const nearestBlock = target.closest?.(`.${TVIST_CLASSES.block}`);
    if (nearestBlock && nearestBlock !== tvist.root) return;
    if (target.closest(SLIDER_CONTROL_SELECTOR) || local_isFocusableElement(target)) return;
    if (local_holdConfig.exclude && target.closest(local_holdConfig.exclude)) return;
    const point = local_getPointerPosition(e);
    if (!point) return;
    e.stopPropagation();
    local_cancelHoldTracking();
    local_holdPending = true;
    local_holdActive = false;
    local_holdStartX = point.x;
    local_holdStartY = point.y;
    local_holdPointerType = local_getPointerType(e);
    local_holdPointerId = 'pointerId' in e ? e.pointerId : null;
    local_holdCaptureTarget =
      e.currentTarget instanceof HTMLElement ? e.currentTarget : local_holdRoot;
    if (
      local_holdPointerId !== null &&
      local_holdCaptureTarget &&
      'setPointerCapture' in local_holdCaptureTarget
    ) {
      try {
        local_holdCaptureTarget.setPointerCapture(local_holdPointerId);
      } catch {
        // noop
      }
    }
    local_holdTimer = base.resources.timeout(() => {
      if (!local_holdPending || local_holdActive) return;
      local_holdPending = false;
      local_holdActive = true;
      const pressIndex = tvist.realIndex ?? tvist.activeIndex;
      base.emit('longPressStart', {
        index: pressIndex,
        pointerType: local_holdPointerType,
      });
      local_dispatchLongPressSlideDomEvent(
        TVIST_DOM_EVENTS.longPressStart,
        pressIndex,
        local_holdPointerType
      );
      const autoplay = tvist.__tvistInternal_getModule('autoplay') as
        | {
            pause?: () => void;
          }
        | undefined;
      autoplay?.pause?.();
      const video = tvist.__tvistInternal_getModule('video') as
        | {
            pauseActiveForHold?: () => void;
          }
        | undefined;
      video?.pauseActiveForHold?.();
    }, local_holdConfig.threshold);
    local_addHoldDocumentEvents();
  };

  const local_onLostPointerCapture: (e: Event) => void = (e: Event): void => {
    if (!local_holdActive && !local_holdPending) return;
    if (!(e instanceof PointerEvent)) return;
    if (local_holdPointerId !== null && e.pointerId !== local_holdPointerId) return;
    local_finishHold();
  };

  const local_onHoldPointerMove: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (!local_holdPending || !local_holdConfig) return;
    const point = local_getPointerPosition(e);
    if (!point) return;
    const dx = point.x - local_holdStartX;
    const dy = point.y - local_holdStartY;
    const distance = Math.hypot(dx, dy);
    const threshold = local_holdConfig.moveThreshold ?? local_MIN_DRAG_DISTANCE;
    if (distance > threshold) {
      local_cancelHoldTracking();
    }
  };

  const local_onHoldPointerUp: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (!local_holdPending && !local_holdActive) return;
    if ('pointerId' in e && local_holdPointerId !== null && e.pointerId !== local_holdPointerId)
      return;
    local_finishHold();
  };

  function local_getPointerType(e: TouchEvent | MouseEvent | PointerEvent): string {
    if ('pointerType' in e) return e.pointerType || 'mouse';
    if ('touches' in e) return 'touch';
    return 'mouse';
  }

  function local_cancelHoldTracking(): void {
    if (local_holdTimer !== null) {
      base.resources.cancelTimeout(local_holdTimer);
      local_holdTimer = null;
    }
    local_holdPending = false;
    local_removeHoldDocumentEvents();
    local_releaseHoldPointerCapture();
    local_holdPointerId = null;
  }

  function local_finishHold(): void {
    const wasActive = local_holdActive;
    local_cancelHoldTracking();
    local_holdActive = false;
    if (!wasActive) return;
    const autoplay = tvist.__tvistInternal_getModule('autoplay') as
      | {
          resume?: () => void;
        }
      | undefined;
    autoplay?.resume?.();
    const video = tvist.__tvistInternal_getModule('video') as
      | {
          resumeActiveAfterHold?: () => void;
        }
      | undefined;
    video?.resumeActiveAfterHold?.();
    const endIndex = tvist.realIndex ?? tvist.activeIndex;
    base.emit('longPressEnd', {
      index: endIndex,
      pointerType: local_holdPointerType,
    });
    local_dispatchLongPressSlideDomEvent(
      TVIST_DOM_EVENTS.longPressEnd,
      endIndex,
      local_holdPointerType
    );
  }

  function local_resolveHoldSlideEl(index: number): HTMLElement | null {
    const byAttr = tvist.root.querySelector<HTMLElement>(`[data-tvist-slide-index="${index}"]`);
    if (byAttr) return byAttr;
    return tvist.slides[index] ?? null;
  }

  function local_dispatchLongPressSlideDomEvent(
    eventName: (typeof TVIST_DOM_EVENTS)[keyof typeof TVIST_DOM_EVENTS],
    index: number,
    pointerType: string
  ): void {
    const el = local_resolveHoldSlideEl(index);
    if (!el) return;
    el.dispatchEvent(
      new CustomEvent<TvistLongPressDomEventDetail>(eventName, {
        bubbles: false,
        composed: false,
        detail: { index, pointerType },
      })
    );
  }

  function local_releaseHoldPointerCapture(): void {
    if (
      local_holdPointerId !== null &&
      local_holdCaptureTarget &&
      'hasPointerCapture' in local_holdCaptureTarget &&
      local_holdCaptureTarget.hasPointerCapture(local_holdPointerId)
    ) {
      try {
        local_holdCaptureTarget.releasePointerCapture(local_holdPointerId);
      } catch {
        // noop
      }
    }
    local_holdCaptureTarget = null;
  }

  const local_onPointerDown: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (local_isDragging) return;
    if (tvist.__tvistInternal_engine.__tvistInternal_isLocked) return;
    if ('button' in e && e.button !== 0) return;
    const target = e.target as HTMLElement;
    const nearestBlock = target?.closest?.(`.${TVIST_CLASSES.block}`);
    if (nearestBlock && nearestBlock !== tvist.root) return;
    // Нажатие на стрелку или её SVG не должно останавливать переход как начало drag.
    if (target.closest(SLIDER_CONTROL_SELECTOR) || local_isFocusableElement(target)) return;
    const point = local_getPointerPosition(e);
    if (!point) return;
    local_isPotentialDrag = true;
    local_startX = point.x;
    local_startY = point.y;
    local_currentX = point.x;
    local_currentY = point.y;
    local_startIndex = tvist.__tvistInternal_engine.__tvistInternal_index.get();
    tvist.__tvistInternal_allowClick = true;
    const marqueeModule = tvist.__tvistInternal_getModule('marquee') as {
      pause?: () => void;
    };
    marqueeModule?.pause?.();
    local_startPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    local_baseEvent = null;
    local_prevBaseEvent = null;
    local_lastMoveTime = 0;
    local_isFirstMove = true;
    local_accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    local_shouldSubtractAccumulatedDelta = false;
    local_wasAnimating = tvist.__tvistInternal_engine.__tvistInternal_animator.isAnimating();
    if (local_wasAnimating) {
      local_animationTarget = tvist.__tvistInternal_engine.__tvistInternal_activeIndex;
    }

    local_stopMomentum();
    tvist.__tvistInternal_engine.__tvistInternal_animator.stop();
    local_manageDocumentEvents('add');
  };

  const local_onPointerMove: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (!local_isPotentialDrag && !local_isDragging) return;
    const point = local_getPointerPosition(e);
    if (!point) return;
    const now = Date.now();
    local_currentX = point.x;
    local_currentY = point.y;
    const isHorizontal = options.direction !== 'vertical';
    let deltaX = point.x - local_startX;
    let deltaY = point.y - local_startY;
    const moveDistance = Math.hypot(deltaX, deltaY);
    if (!local_isDragging) {
      const canStartWithoutThresholdWhenInterruptingAnimation =
        local_wasAnimating && (!read_isLoopEnabled() || read_isLoopWithClonesEnabled());
      // Если пользователь прервал текущий snap-аним, перехватываем drag сразу
      // (без стандартного порога), чтобы не было "тупняка" при быстром re-drag.
      // Но для loop без клонов сохраняем порог: ранний loopFix может сдвинуть
      // порядок DOM слишком рано и визуально "прятать" слайд.
      if (
        !canStartWithoutThresholdWhenInterruptingAnimation &&
        moveDistance <= local_MIN_DRAG_DISTANCE
      )
        return;
      const started = local_tryStartDrag(e, point, deltaX, deltaY, isHorizontal, now);
      if (!started) return;
    }
    if (local_shouldSubtractAccumulatedDelta) {
      deltaX -= local_accumulatedDeltaBeforeDragStart.x;
      deltaY -= local_accumulatedDeltaBeforeDragStart.y;
      local_shouldSubtractAccumulatedDelta = false;
      local_accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    }
    const newPosition = local_computeDragPosition(deltaX, deltaY, isHorizontal);
    tvist.__tvistInternal_engine.__tvistInternal_location.set(newPosition);

    tvist.__tvistInternal_engine.__tvistInternal_applyTransform();

    if (read_isLoopEnabled()) {
      local_checkContentCoverageAndFix(newPosition, point);
    }
    const elapsed = now - local_lastMoveTime;
    if (elapsed > local_LOG_INTERVAL) {
      local_prevBaseEvent = local_baseEvent;
      local_baseEvent = { x: point.x, y: point.y, time: now };
      local_lastMoveTime = now;
    }
    base.emit('drag', e);
    if (local_getPointerType(e) === 'touch') {
      e.preventDefault();
    }
  };
  /**
   * Определяет, является ли жест скроллом страницы или drag-ом слайдера.
   * Возвращает true если drag начался, false если жест отдан браузеру.
   */
  function local_tryStartDrag(
    e: TouchEvent | MouseEvent | PointerEvent,
    point: {
      x: number;
      y: number;
    },
    deltaX: number,
    deltaY: number,
    isHorizontal: boolean,
    now: number
  ): boolean {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const touchAngle = (Math.atan2(absY, absX) * 180) / Math.PI;
    const isScrolling = isHorizontal
      ? touchAngle > local_TOUCH_ANGLE
      : 90 - touchAngle > local_TOUCH_ANGLE;
    if (isScrolling) {
      local_isPotentialDrag = false;
      local_wasAnimating = false;
      local_animationTarget = null;
      return false;
    }
    if (local_holdConfig?.cancelOnDrag !== false) {
      local_finishHold();
    }
    local_isDragging = true;
    tvist.__tvistInternal_allowClick = false;
    local_stopMomentum();
    tvist.__tvistInternal_engine.__tvistInternal_animator.stop();
    local_applyFirstMoveLoopFix(deltaX, deltaY, isHorizontal, point);
    local_baseEvent = { x: point.x, y: point.y, time: now };
    local_lastMoveTime = now;
    local_accumulatedDeltaBeforeDragStart = { x: deltaX, y: deltaY };
    local_shouldSubtractAccumulatedDelta = true;

    base.emit('dragStart', e);
    tvist.root.classList.add(TVIST_CLASSES.dragging);
    return true;
  }
  /**
   * Вызывает loopFix перед первым применением transform.
   * Пропускается для маленьких каруселей и marquee-режима.
   */
  function local_applyFirstMoveLoopFix(
    deltaX: number,
    deltaY: number,
    isHorizontal: boolean,
    point: {
      x: number;
      y: number;
    }
  ): void {
    if (!read_isLoopEnabled() || !local_isFirstMove) return;
    // При прерывании активной snap-анимации ранний first-move loopFix в режиме
    // loop без клонов может переставить DOM раньше нужного момента, из-за чего
    // визуально "исчезает" крайний слайд. В этом сценарии даём coverage-fix
    // сработать позже, только при реальной необходимости.
    if (local_wasAnimating && !read_isLoopWithClonesEnabled()) {
      local_isFirstMove = false;
      return;
    }
    if (local_isMarqueeActive) {
      local_isFirstMove = false;
      return;
    }
    if (local_shouldSkipLoopDomReorderDuringDrag()) {
      local_isFirstMove = false;
      return;
    }
    if (!local_loopModuleRef?.fix) return;
    const delta = isHorizontal ? deltaX : deltaY;
    const direction = delta > 0 ? 'prev' : 'next';

    local_loopModuleRef.fix({ direction });
    local_isFirstMove = false;
    local_startPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    local_startX = point.x;
    local_startY = point.y;
    local_startIndex = tvist.__tvistInternal_engine.__tvistInternal_index.get();
    local_coverageFixCooldown = 5;
  }
  /**
   * Вычисляет новую позицию track с учётом режима (marquee, center, обычный).
   */
  function local_computeDragPosition(
    deltaX: number,
    deltaY: number,
    isHorizontal: boolean
  ): number {
    const dragSpeed = options.dragSpeed ?? 1;
    const delta = isHorizontal ? deltaX : deltaY;
    const distance = delta * dragSpeed;
    if (local_isMarqueeActive) {
      const newPosition = local_startPosition + distance;
      if (options.rubberband !== false && !read_isLoopEnabled()) {
        return local_applyRubberbandToPosition(newPosition);
      }
      return newPosition;
    }
    if (tvist.__tvistInternal_engine.__tvistInternal_isCenterMode() && !read_isLoopEnabled()) {
      const basePosition =
        -tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(local_startIndex);
      const centerOffset =
        tvist.__tvistInternal_engine.__tvistInternal_getCenterOffset(local_startIndex);
      let newPosition = basePosition + centerOffset + distance;
      if (tvist.__tvistInternal_engine.__tvistInternal_isCenterFocus()) {
        newPosition = tvist.__tvistInternal_engine.__tvistInternal_clampCenterPosition(newPosition);
      }
      if (options.rubberband !== false) {
        return local_applyRubberbandToPosition(newPosition);
      }
      return newPosition;
    }
    const effectiveDistance =
      options.rubberband !== false ? local_applyRubberband(distance) : distance;
    return local_startPosition + effectiveDistance;
  }

  const local_onPointerUp: (e: TouchEvent | MouseEvent | PointerEvent) => void = (
    e: TouchEvent | MouseEvent | PointerEvent
  ): void => {
    if (!local_isPotentialDrag && !local_isDragging) return;
    const wasDragging = local_isDragging;
    local_isPotentialDrag = false;
    if (local_isDragging) {
      local_isDragging = false;
      tvist.root.classList.remove(TVIST_CLASSES.dragging);
      base.resources.timeout(() => {
        tvist.__tvistInternal_allowClick = true;
      }, 0);
      if (!read_isLoopEnabled()) {
        const currentPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
        const clampedPosition = Math.min(
          local_minPosition,
          Math.max(local_maxPosition, currentPosition)
        );
        if (clampedPosition !== currentPosition) {
          tvist.__tvistInternal_engine.__tvistInternal_location.set(clampedPosition);
          tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
        }
      }
      const velocity = local_calculateVelocity();

      base.emit('dragEnd', e);
      if (!local_isMarqueeActive) {
        if (options.drag === 'free') {
          local_startMomentum(velocity);
        } else {
          local_snapToNearest(velocity);
        }
      }
    } else if (!wasDragging && local_wasAnimating && local_animationTarget !== null) {
      tvist.scrollTo(local_animationTarget, false);
    }
    if (!wasDragging) {
      const mq = tvist.__tvistInternal_getModule('marquee') as {
        resume?: () => void;
      };
      mq?.resume?.();
    }
    local_wasAnimating = false;
    local_animationTarget = null;
    local_manageDocumentEvents('remove');
  };

  function local_getPointerPosition(
    e: TouchEvent | MouseEvent | PointerEvent
  ): { x: number; y: number } | null {
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : null;
    }
    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY };
    }
    return null;
  }

  function local_isFocusableElement(element: HTMLElement): boolean {
    const focusableSelectors = options.focusableElements ?? 'input, textarea, select, [tabindex]';
    return element.matches(focusableSelectors);
  }
  /**
   * Проверяет покрытие viewport контентом и вызывает loopFix при необходимости.
   * Работает для всех loop-режимов (обычный loop и marquee + loop).
   */
  function local_checkContentCoverageAndFix(
    currentPosition: number,
    point: {
      x: number;
      y: number;
    }
  ): void {
    const loopModule = local_loopModuleRef;
    if (!loopModule?.fix) return;
    const loopFix = loopModule.fix.bind(loopModule);
    const viewportSize = tvist.__tvistInternal_engine.__tvistInternal_containerSizeValue;
    const peek = tvist.__tvistInternal_engine.__tvistInternal_getPeek();
    // Нет «страниц» для прокрутки (все слайды в одном perPage) — перестановки не нужны.
    // Раньше отсекали slidesCount <= perPage + 1, из‑за чего при 2 слайдах и perPage 1
    // loopFix вызывался только после mouseup.
    if (!local_isMarqueeActive && local_shouldSkipLoopDomReorderDuringDrag()) return;
    // Видимая область включает peek
    const vpStart = -currentPosition - peek.start;
    const vpEnd = -currentPosition + viewportSize + peek.end;
    const slides = tvist.slides;
    if (slides.length === 0) return;
    const contentStart = tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(0);
    const lastIdx = slides.length - 1;
    const contentEnd =
      tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(lastIdx) +
      tvist.__tvistInternal_engine.__tvistInternal_getSlideSize(lastIdx);
    const isHoriz = options.direction !== 'vertical';
    const dragDelta = isHoriz ? point.x - local_startX : point.y - local_startY;
    // Пропускаем если |dragDelta| слишком мал — направление ненадёжно.
    // После каждого loopFix startX сбрасывается к point.x, и на следующем кадре
    // dragDelta ≈ 0.4px с произвольным знаком, что вызывает ложные срабатывания.
    const MIN_COVERAGE_DRAG_DELTA = 10;
    if (Math.abs(dragDelta) < MIN_COVERAGE_DRAG_DELTA) return;
    if (local_coverageFixCooldown > 0) {
      local_coverageFixCooldown--;
      return;
    }
    // Буфер -5px: игнорируем субпиксельные зазоры, реагируем только на реальные пустоты.
    const buffer = -5;
    let fixed = false;
    if (dragDelta > 0 && vpStart < contentStart + buffer) {
      loopFix({ direction: 'prev', activeSlideIndex: 0 });
      fixed = true;
    } else if (dragDelta < 0 && vpEnd > contentEnd - buffer) {
      const coverageActiveIdx = local_findSlideNearViewportEdge(vpStart, slides);

      loopFix({ direction: 'next', activeSlideIndex: coverageActiveIdx });
      fixed = true;
    }
    if (fixed) {
      local_startPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
      local_startX = point.x;
      local_startY = point.y;
      local_startIndex = tvist.__tvistInternal_engine.__tvistInternal_index.get();
      local_coverageFixCooldown = 5;
    }
  }
  /**
   * Находит индекс слайда, ближайшего к левому краю viewport.
   * Используется для корректного activeSlideIndex при coverageFix NEXT.
   */
  function local_findSlideNearViewportEdge(viewportLeft: number, slides: HTMLElement[]): number {
    let nearestIdx = 0;
    for (let i = 0; i < slides.length; i++) {
      const pos = tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(i);
      if (pos > viewportLeft) break;
      nearestIdx = i;
    }
    // Гарантируем минимум 1, чтобы порог append-проверки в loopFix всегда срабатывал.
    return Math.max(nearestIdx, 1);
  }

  function local_applyRubberband(distance: number): number {
    const position = local_startPosition + distance;
    if (position >= local_maxPosition && position <= local_minPosition) {
      return distance;
    }
    let inBounds = distance;
    let outOfBounds = 0;
    if (position > local_minPosition) {
      const overflow = position - local_minPosition;
      inBounds = distance - overflow;
      outOfBounds = overflow;
    } else if (position < local_maxPosition) {
      const overflow = local_maxPosition - position;
      inBounds = distance + overflow;
      outOfBounds = -overflow;
    }
    return inBounds + outOfBounds / RUBBERBAND_FRICTION;
  }

  function local_applyRubberbandToPosition(position: number): number {
    if (position >= local_maxPosition && position <= local_minPosition) {
      return position;
    }
    if (position > local_minPosition) {
      const overflow = position - local_minPosition;
      return local_minPosition + overflow / RUBBERBAND_FRICTION;
    } else if (position < local_maxPosition) {
      const overflow = local_maxPosition - position;
      return local_maxPosition - overflow / RUBBERBAND_FRICTION;
    }
    return position;
  }

  function local_calculateVelocity(): number {
    const currentPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    const exceeded = currentPosition > local_minPosition || currentPosition < local_maxPosition;
    if (!read_isLoopEnabled() && exceeded) return 0;
    const now = Date.now();
    const currentPoint = { x: local_currentX, y: local_currentY, time: now };
    const basePoint =
      local_baseEvent?.time === now && local_prevBaseEvent ? local_prevBaseEvent : local_baseEvent;
    if (!basePoint) return 0;
    const timeDiff = now - basePoint.time;
    if (timeDiff === 0 || timeDiff >= local_LOG_INTERVAL) return 0;
    const isHorizontal = options.direction !== 'vertical';
    const distance = isHorizontal ? currentPoint.x - basePoint.x : currentPoint.y - basePoint.y;
    return distance / timeDiff;
  }

  function local_startMomentum(initialVelocity: number): void {
    const currentPosition = tvist.__tvistInternal_engine.__tvistInternal_location.get();
    if (options.debug) {
      console.warn('[DragModule] startMomentum:', {
        currentPosition,
        initialVelocity,
        minPosition: local_minPosition,
        maxPosition: local_maxPosition,
        isLoop: read_isLoopEnabled(),
      });
    }
    if (!read_isLoopEnabled()) {
      const isOutOfBounds =
        currentPosition > local_minPosition || currentPosition < local_maxPosition;
      if (isOutOfBounds) {
        if (options.debug) {
          console.warn('[DragModule] Out of bounds, skipping momentum');
        }
        if (options.drag !== 'free' || options.freeSnap) {
          local_snapToNearest(initialVelocity);
        }
        return;
      }
    }
    if (Math.abs(initialVelocity) < 0.1) {
      if (options.drag !== 'free' || options.freeSnap) {
        local_snapToNearest(initialVelocity);
      }
      return;
    }
    const flickPower = options.flickPower ?? 600;
    let velocity = (initialVelocity * flickPower) / 60;
    const frameMs = 1000 / 60;
    let lastFrameTime = performance.now() - frameMs;
    const animate = (timestamp: number): void => {
      const frames = Math.min(Math.max(timestamp - lastFrameTime, 0), 100) / frameMs;
      lastFrameTime = timestamp;
      const decay = Math.pow(local_FRICTION, frames);
      const distance = (velocity * local_FRICTION * (1 - decay)) / (1 - local_FRICTION);
      velocity *= decay;
      const currentPos = tvist.__tvistInternal_engine.__tvistInternal_location.get();
      let newPosition = currentPos + distance;
      let hitBoundary = false;
      if (!read_isLoopEnabled()) {
        if (newPosition > local_minPosition) {
          newPosition = local_minPosition;
          velocity = 0;
          hitBoundary = true;
        } else if (newPosition < local_maxPosition) {
          newPosition = local_maxPosition;
          velocity = 0;
          hitBoundary = true;
        }
      }
      tvist.__tvistInternal_engine.__tvistInternal_location.set(newPosition);
      tvist.__tvistInternal_engine.__tvistInternal_applyTransform();
      base.emit('scroll');
      if (Math.abs(velocity) > local_MIN_VELOCITY && !hitBoundary) {
        local_animationId = base.resources.frame(animate);
      } else {
        local_stopMomentum();
        if (options.drag !== 'free' || options.freeSnap) {
          local_snapToNearest(initialVelocity);
        }
      }
    };
    animate(performance.now());
  }

  function local_snapToNearest(_velocity: number): void {
    const isFreeSnap = options.drag === 'free' && options.freeSnap;
    if (isFreeSnap) {
      local_snapToNearestSlide(_velocity);
    } else {
      local_snapWithThreshold(_velocity);
    }
  }

  function local_snapToNearestSlide(endVelocity: number): void {
    const { __tvistInternal_engine: engine, slides } = tvist;
    const currentPosition = engine.__tvistInternal_location.get();
    const currentIndex = engine.__tvistInternal_index.get();
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

    local_applyLoopScrollDirectionHintForFreeSnap(currentIndex, nearestIndex, endVelocity);
    engine.__tvistInternal_scrollTo(nearestIndex, false, true);
  }

  function local_snapWithThreshold(velocity: number): void {
    const { __tvistInternal_engine: engine } = tvist;
    const startIndex = engine.__tvistInternal_activeIndex;
    const slideSize = engine.__tvistInternal_slideSizeValue;
    const gap = engine.__tvistInternal_gapPxValue;
    const slideWithGap = slideSize + gap;
    if (slideWithGap === 0) {
      engine.__tvistInternal_scrollTo(startIndex, false, true);
      return;
    }
    // Первый move только запускает drag, а loopFix может перебазировать начало.
    // Для snap важен путь, который действительно прошёл трек с последней базы.
    const dragDistance = engine.__tvistInternal_location.get() - local_startPosition;
    const threshold = Math.max(slideSize * 0.2, 80);
    const flickPower = options.flickPower ?? 600;
    const flickMaxPages = options.flickMaxPages ?? 1;
    const maxFlickDistance = engine.__tvistInternal_containerSizeValue * flickMaxPages;
    const flickDistance =
      Math.sign(velocity) * Math.min(Math.abs(velocity) * flickPower, maxFlickDistance);
    const projectedDistance = dragDistance + flickDistance;
    const exactSlidesMoved = -projectedDistance / slideWithGap;
    let slidesMoved = Math.round(exactSlidesMoved);
    // Один короткий flick должен переключать максимум на один слайд по умолчанию,
    // даже когда в viewport видно несколько слайдов. Длинный drag сохраняет
    // возможность пройти столько слайдов, сколько пользователь протащил сам.
    const maxSlidesMoved = Math.max(
      Math.ceil(Math.abs(dragDistance) / slideWithGap),
      Math.ceil(flickMaxPages)
    );
    slidesMoved = Math.sign(slidesMoved) * Math.min(Math.abs(slidesMoved), maxSlidesMoved);
    if (slidesMoved === 0) {
      if (Math.abs(dragDistance) < threshold) {
        slidesMoved = 0;
      } else {
        slidesMoved = dragDistance > 0 ? -1 : 1;
      }
    }

    if (read_isLoopEnabled()) {
      // В loop-режиме DOM переставляется во время драга, поэтому абсолютный
      // targetIndex = startIndex + slidesMoved ненадёжен (приводил к rewind-поведению).
      // scrollBy сам выставляет _scrollDirection по знаку delta.

      engine.__tvistInternal_scrollBy(slidesMoved, true);
    } else {
      const targetIndex = startIndex + slidesMoved;

      engine.__tvistInternal_scrollTo(targetIndex, false, true);
    }
  }
  /**
   * freeSnap + loop: направление по скорости жеста; при почти нулевой — по кратчайшему шагу по кругу.
   * Используется только в режиме freeSnap (drag: 'free' + freeSnap: true).
   */
  function local_applyLoopScrollDirectionHintForFreeSnap(
    currentIndex: number,
    nearestIndex: number,
    velocity: number
  ): void {
    if (!read_isLoopEnabled() || currentIndex === nearestIndex) return;
    if (Math.abs(velocity) >= 0.05) {
      tvist.__tvistInternal__scrollDirection = velocity > 0 ? 'prev' : 'next';
      return;
    }
    const len = tvist.slides.length;
    if (len <= 1) return;
    const forward = (nearestIndex - currentIndex + len) % len;
    const backward = (currentIndex - nearestIndex + len) % len;
    if (forward < backward) tvist.__tvistInternal__scrollDirection = 'next';
    else if (backward < forward) tvist.__tvistInternal__scrollDirection = 'prev';
  }

  function local_stopMomentum(): void {
    if (local_animationId !== null) {
      base.resources.cancelFrame(local_animationId);
      local_animationId = null;
    }
  }

  function local_onResize(): void {
    local_updateCachedRefs();
    local_updateBounds();
  }

  function local_onOptionsUpdate(): void {
    local_finishHold();
    local_detachHoldEvents();
    local_setupHoldToPause();
    local_updateCachedRefs();
    local_updateBounds();
  }
  const component: DragModule = {
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
    onResize: local_onResize,
    onOptionsUpdate: local_onOptionsUpdate,
  };

  return component;
}
