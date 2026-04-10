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

import { Module } from '../Module';
import {
  HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS,
  TVIST_CLASSES,
  TVIST_DOM_EVENTS,
} from '../../core/constants';
import type { Tvist } from '../../core/Tvist';
import type { TvistOptions, TvistLongPressDomEventDetail } from '../../core/types';
import { getOptionsPerPage } from '../../utils/perPage';
const DRAG_DEBUG = false;
const dragLog = (..._args: unknown[]) => {
  if (DRAG_DEBUG) {
    console.warn('[DRAG]', ..._args);
  }
};

const RUBBERBAND_FRICTION = 5;

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

export class DragModule extends Module {
  readonly name = 'drag';

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startPosition = 0;
  private startIndex = 0;
  private currentX = 0;
  private currentY = 0;

  private wasAnimating = false;
  private animationTarget: number | null = null;

  private animationId: number | null = null;

  private minPosition = 0;
  private maxPosition = 0;

  private loopModuleRef: {
    fix?: (params: {
      direction?: 'next' | 'prev';
      activeSlideIndex?: number;
      slideTo?: boolean;
      setTranslate?: boolean;
    }) => void;
  } | null = null;
  private isMarqueeActive = false;

  private readonly FRICTION = 0.92;
  private readonly MIN_VELOCITY = 0.05;
  private readonly LOG_INTERVAL = 200;
  private readonly TOUCH_ANGLE = 45;
  private readonly MIN_DRAG_DISTANCE = 5;

  private isPotentialDrag = false;

  private holdConfig: HoldToPauseConfig | null = null;
  private holdRoot: HTMLElement | null = null;
  private holdTimer: number | null = null;
  private holdPending = false;
  private holdActive = false;
  private holdPointerType = 'mouse';
  private holdStartX = 0;
  private holdStartY = 0;
  private holdPointerId: number | null = null;
  private holdCaptureTarget: HTMLElement | null = null;

  private isFirstMove = true;
  // Frame-based cooldown: после любого loopFix пропускаем N pointermove событий,
  // предотвращая каскадный ping-pong при быстрых drag-ах в маленьких каруселях.
  private coverageFixCooldown = 0;

  private accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
  private shouldSubtractAccumulatedDelta = false;

  private lastMoveTime = 0;
  private baseEvent: DragPoint | null = null;
  private prevBaseEvent: DragPoint | null = null;

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options);
  }

  override init(): void {
    if (!this.shouldBeActive()) return;

    this.attachEvents();
    this.setupHoldToPause();
    this.updateCachedRefs();
    this.updateBounds();

    this.on('resized', () => this.updateBounds());
    this.on('positionShifted', this.onPositionShifted);
    this.on('loopFix', this.onLoopFix);
  }

  private get isLoopEnabled(): boolean {
    return (
      this.options.loop === true ||
      (typeof this.options.loop === 'object' && this.options.loop.enabled !== false)
    );
  }

  private get isLoopWithClonesEnabled(): boolean {
    return typeof this.options.loop === 'object' && this.options.loop.withClones === true;
  }

  /**
   * Нет отдельной «страницы» прокрутки (все слайды помещаются в perPage) —
   * loopFix на драге не вызываем (и избегаем лишних прыжков).
   * При 2 слайдах и perPage 1 здесь false — перестановка нужна уже во время драга.
   */
  private shouldSkipLoopDomReorderDuringDrag(): boolean {
    const slidesCount = this.tvist.slides.length;
    const perPage = getOptionsPerPage(this.options);
    return slidesCount <= perPage;
  }

  private updateCachedRefs(): void {
    this.loopModuleRef = this.tvist.getModule('loop') as typeof this.loopModuleRef;
    this.isMarqueeActive = this.options.marquee !== false && this.options.marquee !== undefined;
  }

  private onLoopFix = (): void => {
    if (this.isDragging) {
      const before = this.startPosition;
      this.startPosition = this.tvist.engine.location.get();
      dragLog('onLoopFix (during drag)', {
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
        startPositionBefore: before,
        startPositionAfter: this.startPosition,
      });
    }
  };

  override destroy(): void {
    this.cancelHoldTracking();
    this.detachHoldEvents();
    this.detachEvents();
    this.stopMomentum();
    this.off('positionShifted', this.onPositionShifted);
    this.off('loopFix', this.onLoopFix);
  }

  private onPositionShifted = (delta: number): void => {
    if (this.isDragging) {
      this.startPosition += delta;
    }
  };

  public override shouldBeActive(): boolean {
    return this.options.drag !== false;
  }

  /**
   * При loop или marquee границ нет (бесконечная прокрутка).
   * При center (без loop) используем getScrollPositionForIndex для учёта centerOffset.
   */
  private updateBounds(): void {
    const { engine, slides } = this.tvist;
    const perPage = getOptionsPerPage(this.options);

    if (this.isLoopEnabled || this.isMarqueeActive) {
      this.minPosition = Infinity;
      this.maxPosition = -Infinity;
    } else if (this.options.center) {
      this.minPosition = engine.getScrollPositionForIndex(0);
      this.maxPosition = engine.getScrollPositionForIndex(slides.length - 1);
    } else {
      const usePeekTrim = this.options.peekTrim !== false;
      this.minPosition = usePeekTrim ? engine.getMinScrollPosition() : 0;
      this.maxPosition = usePeekTrim
        ? engine.getMaxScrollPosition()
        : -engine.getSlidePosition(slides.length - perPage);
    }

    if (this.options.debug) {
      console.warn('[DragModule] Границы обновлены:', {
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        loop: this.isLoopEnabled,
        center: this.options.center,
        peekTrim: this.options.peekTrim !== false,
        slidesCount: slides.length,
        perPage,
      });
    }
  }

  private manageEvents(
    action: 'add' | 'remove',
    target: EventTarget,
    handlers: ManagedHandler[]
  ): void {
    for (const { event, handler, options } of handlers) {
      const listener = handler as EventListener;
      if (action === 'add') {
        target.addEventListener(event, listener, options);
      } else {
        target.removeEventListener(event, listener);
      }
    }
  }

  private attachEvents(): void {
    const { root } = this.tvist;

    if ('PointerEvent' in window) {
      root.addEventListener('pointerdown', this.onPointerDown);
    } else {
      root.addEventListener('touchstart', this.onPointerDown, { passive: true });
      root.addEventListener('mousedown', this.onPointerDown);
    }

    root.addEventListener('dragstart', this.onDragStart);
    root.classList.add(TVIST_CLASSES.draggable);
  }

  private detachEvents(): void {
    const { root } = this.tvist;

    if ('PointerEvent' in window) {
      root.removeEventListener('pointerdown', this.onPointerDown);
    } else {
      root.removeEventListener('touchstart', this.onPointerDown);
      root.removeEventListener('mousedown', this.onPointerDown);
    }

    root.removeEventListener('dragstart', this.onDragStart);
    root.classList.remove(TVIST_CLASSES.draggable);
    this.removeDocumentEvents();
  }

  private addDocumentEvents(): void {
    if ('PointerEvent' in window) {
      this.manageEvents('add', document, [
        { event: 'pointermove', handler: this.onPointerMove },
        { event: 'pointerup', handler: this.onPointerUp },
        { event: 'pointercancel', handler: this.onPointerUp },
      ]);
    } else {
      this.manageEvents('add', document, [
        { event: 'touchmove', handler: this.onPointerMove, options: { passive: false } },
        { event: 'touchend', handler: this.onPointerUp },
        { event: 'touchcancel', handler: this.onPointerUp },
        { event: 'mousemove', handler: this.onPointerMove },
        { event: 'mouseup', handler: this.onPointerUp },
      ]);
    }
  }

  private removeDocumentEvents(): void {
    if ('PointerEvent' in window) {
      this.manageEvents('remove', document, [
        { event: 'pointermove', handler: this.onPointerMove },
        { event: 'pointerup', handler: this.onPointerUp },
        { event: 'pointercancel', handler: this.onPointerUp },
      ]);
    } else {
      this.manageEvents('remove', document, [
        { event: 'touchmove', handler: this.onPointerMove },
        { event: 'touchend', handler: this.onPointerUp },
        { event: 'touchcancel', handler: this.onPointerUp },
        { event: 'mousemove', handler: this.onPointerMove },
        { event: 'mouseup', handler: this.onPointerUp },
      ]);
    }
  }

  private normalizeHoldToPause(raw: TvistOptions['holdToPause']): HoldToPauseConfig | null {
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

  private resolveHoldRoot(config: HoldToPauseConfig): HTMLElement {
    if (config.root === 'container') return this.tvist.container;
    if (config.root === 'slider') return this.tvist.root;
    return config.root;
  }

  private setupHoldToPause(): void {
    this.holdConfig = this.normalizeHoldToPause(this.options.holdToPause);
    if (!this.holdConfig) return;
    this.holdRoot = this.resolveHoldRoot(this.holdConfig);
    this.attachHoldEvents();
  }

  private manageHoldEvents(action: 'add' | 'remove'): void {
    if (!this.holdRoot) return;

    if ('PointerEvent' in window) {
      this.manageEvents(action, this.holdRoot, [
        { event: 'pointerdown', handler: this.onHoldPointerDown },
        { event: 'lostpointercapture', handler: this.onLostPointerCapture },
      ]);
    } else {
      this.manageEvents(action, this.holdRoot, [
        { event: 'touchstart', handler: this.onHoldPointerDown, options: { passive: true } },
        { event: 'mousedown', handler: this.onHoldPointerDown },
      ]);
    }
  }

  private attachHoldEvents(): void {
    this.manageHoldEvents('add');
  }

  private detachHoldEvents(): void {
    this.manageHoldEvents('remove');
    this.holdRoot = null;
  }

  private manageHoldDocumentEvents(action: 'add' | 'remove'): void {
    if ('PointerEvent' in window) {
      this.manageEvents(action, document, [
        { event: 'pointermove', handler: this.onHoldPointerMove },
        { event: 'pointerup', handler: this.onHoldPointerUp },
        { event: 'pointercancel', handler: this.onHoldPointerUp },
      ]);
    } else {
      this.manageEvents(action, document, [
        { event: 'touchmove', handler: this.onHoldPointerMove, options: { passive: true } },
        { event: 'touchend', handler: this.onHoldPointerUp },
        { event: 'touchcancel', handler: this.onHoldPointerUp },
        { event: 'mousemove', handler: this.onHoldPointerMove },
        { event: 'mouseup', handler: this.onHoldPointerUp },
      ]);
    }
  }

  private addHoldDocumentEvents(): void {
    this.manageHoldDocumentEvents('add');
  }

  private removeHoldDocumentEvents(): void {
    this.manageHoldDocumentEvents('remove');
  }

  private onDragStart = (e: Event): void => {
    e.preventDefault();
  };

  private onHoldPointerDown = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.holdConfig || !this.holdRoot) return;
    if ('button' in e && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const nearestBlock = target.closest?.(`.${TVIST_CLASSES.block}`);
    if (nearestBlock && nearestBlock !== this.tvist.root) return;
    if (this.isFocusableElement(target)) return;
    if (this.holdConfig.exclude && target.closest(this.holdConfig.exclude)) return;

    const point = this.getPointerPosition(e);
    if (!point) return;

    e.stopPropagation();

    this.cancelHoldTracking();
    this.holdPending = true;
    this.holdActive = false;
    this.holdStartX = point.x;
    this.holdStartY = point.y;
    this.holdPointerType = this.getPointerType(e);
    this.holdPointerId = 'pointerId' in e ? e.pointerId : null;
    this.holdCaptureTarget =
      e.currentTarget instanceof HTMLElement ? e.currentTarget : this.holdRoot;

    if (
      this.holdPointerId !== null &&
      this.holdCaptureTarget &&
      'setPointerCapture' in this.holdCaptureTarget
    ) {
      try {
        this.holdCaptureTarget.setPointerCapture(this.holdPointerId);
      } catch {
        // noop
      }
    }

    this.holdTimer = window.setTimeout(() => {
      if (!this.holdPending || this.holdActive) return;
      this.holdPending = false;
      this.holdActive = true;
      const pressIndex = this.tvist.realIndex ?? this.tvist.activeIndex;
      this.emit('longPressStart', {
        index: pressIndex,
        pointerType: this.holdPointerType,
      });
      this.dispatchLongPressSlideDomEvent(
        TVIST_DOM_EVENTS.longPressStart,
        pressIndex,
        this.holdPointerType
      );
      const autoplay = this.tvist.getModule('autoplay') as { pause?: () => void } | undefined;
      autoplay?.pause?.();
      const video = this.tvist.getModule('video') as
        | { pauseActiveForHold?: () => void }
        | undefined;
      video?.pauseActiveForHold?.();
    }, this.holdConfig.threshold);

    this.addHoldDocumentEvents();
  };

  private onLostPointerCapture = (e: Event): void => {
    if (!this.holdActive && !this.holdPending) return;
    if (!(e instanceof PointerEvent)) return;
    if (this.holdPointerId !== null && e.pointerId !== this.holdPointerId) return;
    this.finishHold();
  };

  private onHoldPointerMove = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.holdPending || !this.holdConfig) return;
    const point = this.getPointerPosition(e);
    if (!point) return;
    const dx = point.x - this.holdStartX;
    const dy = point.y - this.holdStartY;
    const distance = Math.hypot(dx, dy);
    const threshold = this.holdConfig.moveThreshold ?? this.MIN_DRAG_DISTANCE;
    if (distance > threshold) {
      this.cancelHoldTracking();
    }
  };

  private onHoldPointerUp = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.holdPending && !this.holdActive) return;
    if ('pointerId' in e && this.holdPointerId !== null && e.pointerId !== this.holdPointerId)
      return;
    this.finishHold();
  };

  private getPointerType(e: TouchEvent | MouseEvent | PointerEvent): string {
    if ('pointerType' in e) return e.pointerType || 'mouse';
    if ('touches' in e) return 'touch';
    return 'mouse';
  }

  private cancelHoldTracking(): void {
    if (this.holdTimer !== null) {
      window.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    this.holdPending = false;
    this.removeHoldDocumentEvents();
    this.releaseHoldPointerCapture();
    this.holdPointerId = null;
  }

  private finishHold(): void {
    const wasActive = this.holdActive;
    this.cancelHoldTracking();
    this.holdActive = false;
    if (!wasActive) return;

    const autoplay = this.tvist.getModule('autoplay') as { resume?: () => void } | undefined;
    autoplay?.resume?.();
    const video = this.tvist.getModule('video') as
      | { resumeActiveAfterHold?: () => void }
      | undefined;
    video?.resumeActiveAfterHold?.();
    const endIndex = this.tvist.realIndex ?? this.tvist.activeIndex;
    this.emit('longPressEnd', {
      index: endIndex,
      pointerType: this.holdPointerType,
    });
    this.dispatchLongPressSlideDomEvent(
      TVIST_DOM_EVENTS.longPressEnd,
      endIndex,
      this.holdPointerType
    );
  }

  private resolveHoldSlideEl(index: number): HTMLElement | null {
    const byAttr = this.tvist.root.querySelector<HTMLElement>(
      `[data-tvist-slide-index="${index}"]`
    );
    if (byAttr) return byAttr;
    return this.tvist.slides[index] ?? null;
  }

  private dispatchLongPressSlideDomEvent(
    eventName: (typeof TVIST_DOM_EVENTS)[keyof typeof TVIST_DOM_EVENTS],
    index: number,
    pointerType: string
  ): void {
    const el = this.resolveHoldSlideEl(index);
    if (!el) return;
    el.dispatchEvent(
      new CustomEvent<TvistLongPressDomEventDetail>(eventName, {
        bubbles: false,
        composed: false,
        detail: { index, pointerType },
      })
    );
  }

  private releaseHoldPointerCapture(): void {
    if (
      this.holdPointerId !== null &&
      this.holdCaptureTarget &&
      'hasPointerCapture' in this.holdCaptureTarget &&
      this.holdCaptureTarget.hasPointerCapture(this.holdPointerId)
    ) {
      try {
        this.holdCaptureTarget.releasePointerCapture(this.holdPointerId);
      } catch {
        // noop
      }
    }
    this.holdCaptureTarget = null;
  }

  private onPointerDown = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (this.isDragging) return;
    if (this.tvist.engine.isLocked) return;
    if ('button' in e && e.button !== 0) return;

    const target = e.target as HTMLElement;
    const nearestBlock = target?.closest?.(`.${TVIST_CLASSES.block}`);
    if (nearestBlock && nearestBlock !== this.tvist.root) return;
    if (this.isFocusableElement(target)) return;

    const point = this.getPointerPosition(e);
    if (!point) return;

    this.isPotentialDrag = true;
    this.startX = point.x;
    this.startY = point.y;
    this.currentX = point.x;
    this.currentY = point.y;
    this.startIndex = this.tvist.engine.index.get();
    this.tvist.allowClick = true;

    const marqueeModule = this.tvist.getModule('marquee') as { pause?: () => void };
    marqueeModule?.pause?.();

    this.startPosition = this.tvist.engine.location.get();

    this.baseEvent = null;
    this.prevBaseEvent = null;
    this.lastMoveTime = 0;
    this.isFirstMove = true;
    this.accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    this.shouldSubtractAccumulatedDelta = false;

    this.wasAnimating = this.tvist.engine.animator.isAnimating();
    if (this.wasAnimating) {
      this.animationTarget = this.tvist.engine.activeIndex;
    }

    dragLog('pointerDown', {
      activeIndex: this.tvist.engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      location: this.tvist.engine.location.get(),
      startPosition: this.startPosition,
      startIndex: this.startIndex,
      wasAnimating: this.wasAnimating,
      animationTarget: this.animationTarget,
      loop: this.isLoopEnabled,
      rewind: this.options.rewind,
      autoplay: this.options.autoplay,
      slidesCount: this.tvist.slides.length,
      slideSize: this.tvist.engine.slideSizeValue,
      expectedLocationForIndex3: this.tvist.engine.getScrollPositionForIndex(3),
    });

    this.stopMomentum();
    this.tvist.engine.animator.stop();
    this.addDocumentEvents();
  };

  private onPointerMove = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return;

    const point = this.getPointerPosition(e);
    if (!point) return;

    const now = Date.now();
    this.currentX = point.x;
    this.currentY = point.y;

    const isHorizontal = this.options.direction !== 'vertical';
    let deltaX = point.x - this.startX;
    let deltaY = point.y - this.startY;
    const moveDistance = Math.hypot(deltaX, deltaY);

    if (!this.isDragging) {
      const canStartWithoutThresholdWhenInterruptingAnimation =
        this.wasAnimating && (!this.isLoopEnabled || this.isLoopWithClonesEnabled);

      // Если пользователь прервал текущий snap-аним, перехватываем drag сразу
      // (без стандартного порога), чтобы не было "тупняка" при быстром re-drag.
      // Но для loop без клонов сохраняем порог: ранний loopFix может сдвинуть
      // порядок DOM слишком рано и визуально "прятать" слайд.
      if (
        !canStartWithoutThresholdWhenInterruptingAnimation &&
        moveDistance <= this.MIN_DRAG_DISTANCE
      )
        return;

      const started = this.tryStartDrag(e, point, deltaX, deltaY, isHorizontal, now);
      if (!started) return;
    }

    if (this.shouldSubtractAccumulatedDelta) {
      deltaX -= this.accumulatedDeltaBeforeDragStart.x;
      deltaY -= this.accumulatedDeltaBeforeDragStart.y;
      this.shouldSubtractAccumulatedDelta = false;
      this.accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    }

    const newPosition = this.computeDragPosition(deltaX, deltaY, isHorizontal);
    this.tvist.engine.location.set(newPosition);

    dragLog('applying transform', { newPosition, locationBefore: this.tvist.engine.location.get() });
    this.tvist.engine.applyTransform();
    dragLog('transform applied', { locationAfter: this.tvist.engine.location.get() });

    if (this.isLoopEnabled) {
      this.checkContentCoverageAndFix(newPosition, point);
    }

    const elapsed = now - this.lastMoveTime;
    if (elapsed > this.LOG_INTERVAL) {
      this.prevBaseEvent = this.baseEvent;
      this.baseEvent = { x: point.x, y: point.y, time: now };
      this.lastMoveTime = now;
    }

    this.emit('drag', e);

    if (this.getPointerType(e) === 'touch') {
      e.preventDefault();
    }
  };

  /**
   * Определяет, является ли жест скроллом страницы или drag-ом слайдера.
   * Возвращает true если drag начался, false если жест отдан браузеру.
   */
  private tryStartDrag(
    e: TouchEvent | MouseEvent | PointerEvent,
    point: { x: number; y: number },
    deltaX: number,
    deltaY: number,
    isHorizontal: boolean,
    now: number
  ): boolean {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const touchAngle = (Math.atan2(absY, absX) * 180) / Math.PI;
    const isScrolling = isHorizontal
      ? touchAngle > this.TOUCH_ANGLE
      : 90 - touchAngle > this.TOUCH_ANGLE;

    if (isScrolling) {
      this.isPotentialDrag = false;
      this.wasAnimating = false;
      this.animationTarget = null;
      return false;
    }

    if (this.holdConfig?.cancelOnDrag !== false) {
      this.finishHold();
    }

    this.isDragging = true;
    this.tvist.allowClick = false;
    this.stopMomentum();
    this.tvist.engine.animator.stop();

    this.applyFirstMoveLoopFix(deltaX, deltaY, isHorizontal, point);

    this.baseEvent = { x: point.x, y: point.y, time: now };
    this.lastMoveTime = now;
    this.accumulatedDeltaBeforeDragStart = { x: deltaX, y: deltaY };
    this.shouldSubtractAccumulatedDelta = true;

    dragLog('dragStart', {
      activeIndex: this.tvist.engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      startIndex: this.startIndex,
      startPosition: this.startPosition,
      accumulatedDelta: this.accumulatedDeltaBeforeDragStart,
    });

    this.emit('dragStart', e);
    this.tvist.root.classList.add(TVIST_CLASSES.dragging);
    return true;
  }

  /**
   * Вызывает loopFix перед первым применением transform.
   * Пропускается для маленьких каруселей и marquee-режима.
   */
  private applyFirstMoveLoopFix(
    deltaX: number,
    deltaY: number,
    isHorizontal: boolean,
    point: { x: number; y: number }
  ): void {
    if (!this.isLoopEnabled || !this.isFirstMove) return;

    // При прерывании активной snap-анимации ранний first-move loopFix в режиме
    // loop без клонов может переставить DOM раньше нужного момента, из-за чего
    // визуально "исчезает" крайний слайд. В этом сценарии даём coverage-fix
    // сработать позже, только при реальной необходимости.
    if (this.wasAnimating && !this.isLoopWithClonesEnabled) {
      this.isFirstMove = false;
      return;
    }

    if (this.isMarqueeActive) {
      this.isFirstMove = false;
      return;
    }

    if (this.shouldSkipLoopDomReorderDuringDrag()) {
      this.isFirstMove = false;
      return;
    }

    if (!this.loopModuleRef?.fix) return;

    const delta = isHorizontal ? deltaX : deltaY;
    const direction = delta > 0 ? 'prev' : 'next';

    dragLog('firstMove loopFix (before)', {
      direction,
      activeIndex: this.tvist.engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      location: this.tvist.engine.location.get(),
    });

    this.loopModuleRef.fix({ direction });
    this.isFirstMove = false;

    this.startPosition = this.tvist.engine.location.get();
    this.startX = point.x;
    this.startY = point.y;
    this.startIndex = this.tvist.engine.index.get();
    this.coverageFixCooldown = 5;

    dragLog('firstMove loopFix (after)', {
      activeIndex: this.tvist.engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      startPosition: this.startPosition,
      startIndex: this.startIndex,
    });
  }

  /**
   * Вычисляет новую позицию track с учётом режима (marquee, center, обычный).
   */
  private computeDragPosition(deltaX: number, deltaY: number, isHorizontal: boolean): number {
    const dragSpeed = this.options.dragSpeed ?? 1;
    const delta = isHorizontal ? deltaX : deltaY;
    const distance = delta * dragSpeed;

    if (this.isMarqueeActive) {
      const newPosition = this.startPosition + distance;
      if (this.options.rubberband !== false && !this.isLoopEnabled) {
        return this.applyRubberbandToPosition(newPosition);
      }
      return newPosition;
    }

    if (this.options.center && !this.isLoopEnabled) {
      const basePosition = -this.tvist.engine.getSlidePosition(this.startIndex);
      const centerOffset = this.tvist.engine.getCenterOffset(this.startIndex);
      const newPosition = basePosition + centerOffset + distance;
      if (this.options.rubberband !== false) {
        return this.applyRubberbandToPosition(newPosition);
      }
      return newPosition;
    }

    const effectiveDistance =
      this.options.rubberband !== false ? this.applyRubberband(distance) : distance;
    return this.startPosition + effectiveDistance;
  }

  private onPointerUp = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return;

    const wasDragging = this.isDragging;
    this.isPotentialDrag = false;

    if (this.isDragging) {
      this.isDragging = false;
      this.tvist.root.classList.remove(TVIST_CLASSES.dragging);

      setTimeout(() => {
        this.tvist.allowClick = true;
      }, 0);

      if (!this.isLoopEnabled) {
        const currentPosition = this.tvist.engine.location.get();
        const clampedPosition = Math.min(
          this.minPosition,
          Math.max(this.maxPosition, currentPosition)
        );

        if (clampedPosition !== currentPosition) {
          this.tvist.engine.location.set(clampedPosition);
          this.tvist.engine.applyTransform();
        }
      }

      const velocity = this.calculateVelocity();

      dragLog('dragEnd', {
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
        location: this.tvist.engine.location.get(),
        startPosition: this.startPosition,
        startIndex: this.startIndex,
        currentX: this.currentX,
        startX: this.startX,
        dragDistance: this.currentX - this.startX,
        willSnap: !this.isMarqueeActive,
        dragMode: this.options.drag,
        loop: this.isLoopEnabled,
        rewind: this.options.rewind,
      });

      this.emit('dragEnd', e);

      if (!this.isMarqueeActive) {
        if (this.options.drag === 'free') {
          this.startMomentum(velocity);
        } else {
          this.snapToNearest(velocity);
        }
      }
    } else if (!wasDragging && this.wasAnimating && this.animationTarget !== null) {
      this.tvist.scrollTo(this.animationTarget, false);
    }

    if (!wasDragging) {
      const mq = this.tvist.getModule('marquee') as { resume?: () => void };
      mq?.resume?.();
    }

    this.wasAnimating = false;
    this.animationTarget = null;
    this.removeDocumentEvents();
  };

  private getPointerPosition(
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

  private isFocusableElement(element: HTMLElement): boolean {
    const focusableSelectors =
      this.options.focusableElements ?? 'input, textarea, select, button, a[href], [tabindex]';

    return element.matches(focusableSelectors);
  }

  /**
   * Проверяет покрытие viewport контентом и вызывает loopFix при необходимости.
   * Работает для всех loop-режимов (обычный loop и marquee + loop).
   */
  private checkContentCoverageAndFix(
    currentPosition: number,
    point: { x: number; y: number }
  ): void {
    const loopModule = this.loopModuleRef;
    if (!loopModule?.fix) return;
    const loopFix = loopModule.fix.bind(loopModule);

    const viewportSize = this.tvist.engine.containerSizeValue;

    // Нет «страниц» для прокрутки (все слайды в одном perPage) — перестановки не нужны.
    // Раньше отсекали slidesCount <= perPage + 1, из‑за чего при 2 слайдах и perPage 1
    // loopFix вызывался только после mouseup.
    if (!this.isMarqueeActive && this.shouldSkipLoopDomReorderDuringDrag()) return;

    const vpStart = -currentPosition;
    const vpEnd = vpStart + viewportSize;

    const slides = this.tvist.slides;
    if (slides.length === 0) return;

    const contentStart = this.tvist.engine.getSlidePosition(0);
    const lastIdx = slides.length - 1;
    const contentEnd =
      this.tvist.engine.getSlidePosition(lastIdx) + this.tvist.engine.getSlideSize(lastIdx);

    const isHoriz = this.options.direction !== 'vertical';
    const dragDelta = isHoriz ? point.x - this.startX : point.y - this.startY;

    // Пропускаем если |dragDelta| слишком мал — направление ненадёжно.
    // После каждого loopFix startX сбрасывается к point.x, и на следующем кадре
    // dragDelta ≈ 0.4px с произвольным знаком, что вызывает ложные срабатывания.
    const MIN_COVERAGE_DRAG_DELTA = 10;
    if (Math.abs(dragDelta) < MIN_COVERAGE_DRAG_DELTA) return;

    if (this.coverageFixCooldown > 0) {
      this.coverageFixCooldown--;
      return;
    }

    // Буфер -5px: игнорируем субпиксельные зазоры, реагируем только на реальные пустоты.
    const buffer = -5;

    let fixed = false;

    if (dragDelta > 0 && vpStart < contentStart + buffer) {
      dragLog('checkContentCoverageAndFix PREV', {
        dragDelta,
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      });
      loopFix({ direction: 'prev', activeSlideIndex: 0 });
      fixed = true;
    } else if (dragDelta < 0 && vpEnd > contentEnd - buffer) {
      const coverageActiveIdx = this.findSlideNearViewportEdge(vpStart, slides);
      dragLog('checkContentCoverageAndFix NEXT', {
        dragDelta,
        coverageActiveIdx,
        activeIndex: this.tvist.engine.index.get(),
        realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      });
      loopFix({ direction: 'next', activeSlideIndex: coverageActiveIdx });
      fixed = true;
    }

    if (fixed) {
      this.startPosition = this.tvist.engine.location.get();
      this.startX = point.x;
      this.startY = point.y;
      this.startIndex = this.tvist.engine.index.get();
      this.coverageFixCooldown = 5;
    }
  }

  /**
   * Находит индекс слайда, ближайшего к левому краю viewport.
   * Используется для корректного activeSlideIndex при coverageFix NEXT.
   */
  private findSlideNearViewportEdge(viewportLeft: number, slides: HTMLElement[]): number {
    let nearestIdx = 0;
    for (let i = 0; i < slides.length; i++) {
      const pos = this.tvist.engine.getSlidePosition(i);
      if (pos > viewportLeft) break;
      nearestIdx = i;
    }
    // Гарантируем минимум 1, чтобы порог append-проверки в loopFix всегда срабатывал.
    return Math.max(nearestIdx, 1);
  }

  private applyRubberband(distance: number): number {
    const position = this.startPosition + distance;

    if (position >= this.maxPosition && position <= this.minPosition) {
      return distance;
    }

    let inBounds = distance;
    let outOfBounds = 0;

    if (position > this.minPosition) {
      const overflow = position - this.minPosition;
      inBounds = distance - overflow;
      outOfBounds = overflow;
    } else if (position < this.maxPosition) {
      const overflow = this.maxPosition - position;
      inBounds = distance + overflow;
      outOfBounds = -overflow;
    }

    return inBounds + outOfBounds / RUBBERBAND_FRICTION;
  }

  private applyRubberbandToPosition(position: number): number {
    if (position >= this.maxPosition && position <= this.minPosition) {
      return position;
    }

    if (position > this.minPosition) {
      const overflow = position - this.minPosition;
      return this.minPosition + overflow / RUBBERBAND_FRICTION;
    } else if (position < this.maxPosition) {
      const overflow = this.maxPosition - position;
      return this.maxPosition - overflow / RUBBERBAND_FRICTION;
    }

    return position;
  }

  private calculateVelocity(): number {
    const currentPosition = this.tvist.engine.location.get();
    const exceeded = currentPosition > this.minPosition || currentPosition < this.maxPosition;

    if (!this.isLoopEnabled && exceeded) return 0;

    const now = Date.now();
    const currentPoint = { x: this.currentX, y: this.currentY, time: now };

    const basePoint =
      this.baseEvent?.time === now && this.prevBaseEvent ? this.prevBaseEvent : this.baseEvent;

    if (!basePoint) return 0;

    const timeDiff = now - basePoint.time;
    if (timeDiff === 0 || timeDiff >= this.LOG_INTERVAL) return 0;

    const isHorizontal = this.options.direction !== 'vertical';
    const distance = isHorizontal ? currentPoint.x - basePoint.x : currentPoint.y - basePoint.y;

    return distance / timeDiff;
  }

  private startMomentum(initialVelocity: number): void {
    const currentPosition = this.tvist.engine.location.get();

    if (this.options.debug) {
      console.warn('[DragModule] startMomentum:', {
        currentPosition,
        initialVelocity,
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        isLoop: this.isLoopEnabled,
      });
    }

    if (!this.isLoopEnabled) {
      const isOutOfBounds =
        currentPosition > this.minPosition || currentPosition < this.maxPosition;

      if (isOutOfBounds) {
        if (this.options.debug) {
          console.warn('[DragModule] Out of bounds, skipping momentum');
        }
        if (this.options.drag !== 'free' || this.options.freeSnap) {
          this.snapToNearest(initialVelocity);
        }
        return;
      }
    }

    if (Math.abs(initialVelocity) < 0.1) {
      if (this.options.drag !== 'free' || this.options.freeSnap) {
        this.snapToNearest(initialVelocity);
      }
      return;
    }

    const flickPower = this.options.flickPower ?? 600;
    let velocity = (initialVelocity * flickPower) / 60;

    const animate = (): void => {
      velocity *= this.FRICTION;

      const currentPos = this.tvist.engine.location.get();
      let newPosition = currentPos + velocity;

      let hitBoundary = false;
      if (!this.isLoopEnabled) {
        if (newPosition > this.minPosition) {
          newPosition = this.minPosition;
          velocity = 0;
          hitBoundary = true;
        } else if (newPosition < this.maxPosition) {
          newPosition = this.maxPosition;
          velocity = 0;
          hitBoundary = true;
        }
      }

      this.tvist.engine.location.set(newPosition);
      this.tvist.engine.applyTransform();
      this.emit('scroll');

      if (Math.abs(velocity) > this.MIN_VELOCITY && !hitBoundary) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.stopMomentum();
        if (this.options.drag !== 'free' || this.options.freeSnap) {
          this.snapToNearest(initialVelocity);
        }
      }
    };

    animate();
  }

  private snapToNearest(_velocity: number): void {
    const isFreeSnap = this.options.drag === 'free' && this.options.freeSnap;

    if (isFreeSnap) {
      this.snapToNearestSlide(_velocity);
    } else {
      this.snapWithThreshold();
    }
  }

  private snapToNearestSlide(endVelocity: number): void {
    const { engine, slides } = this.tvist;
    const currentPosition = engine.location.get();
    const currentIndex = engine.index.get();

    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < slides.length; i++) {
      const slidePosition = engine.getScrollPositionForIndex(i);
      const distance = Math.abs(currentPosition - slidePosition);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    dragLog('snapToNearestSlide', {
      currentPosition,
      nearestIndex,
      minDistance,
      activeIndex: currentIndex,
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
    });

    this.applyLoopScrollDirectionHintForFreeSnap(currentIndex, nearestIndex, endVelocity);
    engine.scrollTo(nearestIndex, false, true);
  }

  private snapWithThreshold(): void {
    const { engine } = this.tvist;
    const startIndex = engine.activeIndex;

    const slideSize = engine.slideSizeValue;
    const gap = engine.gapPxValue;
    const slideWithGap = slideSize + gap;

    if (slideWithGap === 0) {
      dragLog('snapWithThreshold (no size)', { targetIndex: startIndex });
      engine.scrollTo(startIndex, false, true);
      return;
    }

    const isHorizontal = this.options.direction !== 'vertical';
    const dragDistance = isHorizontal ? this.currentX - this.startX : this.currentY - this.startY;

    const threshold = Math.max(slideSize * 0.2, 80);
    const exactSlidesMoved = -dragDistance / slideWithGap;
    let slidesMoved = Math.round(exactSlidesMoved);

    if (Math.abs(dragDistance) < threshold) {
      slidesMoved = 0;
    } else if (slidesMoved === 0) {
      slidesMoved = dragDistance > 0 ? -1 : 1;
    }

    dragLog('snapWithThreshold', {
      startIndex,
      startIndexFromEngine: this.startIndex,
      slidesMoved,
      dragDistance,
      currentLocation: engine.location.get(),
      startPosition: this.startPosition,
      threshold,
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      loop: this.isLoopEnabled,
      rewind: this.options.rewind,
    });

    if (this.isLoopEnabled) {
      // В loop-режиме DOM переставляется во время драга, поэтому абсолютный
      // targetIndex = startIndex + slidesMoved ненадёжен (приводил к rewind-поведению).
      // scrollBy сам выставляет _scrollDirection по знаку delta.
      dragLog('>>> CALLING engine.scrollBy', slidesMoved);
      engine.scrollBy(slidesMoved, true);
    } else {
      const targetIndex = startIndex + slidesMoved;
      dragLog('>>> CALLING engine.scrollTo', targetIndex);
      engine.scrollTo(targetIndex, false, true);
    }
  }

  /**
   * freeSnap + loop: направление по скорости жеста; при почти нулевой — по кратчайшему шагу по кругу.
   * Используется только в режиме freeSnap (drag: 'free' + freeSnap: true).
   */
  private applyLoopScrollDirectionHintForFreeSnap(
    currentIndex: number,
    nearestIndex: number,
    velocity: number
  ): void {
    if (!this.isLoopEnabled || currentIndex === nearestIndex) return;

    if (Math.abs(velocity) >= 0.05) {
      this.tvist._scrollDirection = velocity > 0 ? 'prev' : 'next';
      return;
    }

    const len = this.tvist.slides.length;
    if (len <= 1) return;

    const forward = (nearestIndex - currentIndex + len) % len;
    const backward = (currentIndex - nearestIndex + len) % len;
    if (forward < backward) this.tvist._scrollDirection = 'next';
    else if (backward < forward) this.tvist._scrollDirection = 'prev';
  }

  private stopMomentum(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  override onResize(): void {
    this.updateCachedRefs();
    this.updateBounds();
  }

  override onOptionsUpdate(): void {
    this.finishHold();
    this.detachHoldEvents();
    this.setupHoldToPause();
    this.updateCachedRefs();
    this.updateBounds();
  }
}
