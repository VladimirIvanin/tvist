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
import { resolveTrackGapFromOptions } from '../../utils/gridGap';

const DRAG_DEBUG = false;
const dragLog = (..._args: unknown[]) => {
  if (DRAG_DEBUG) {
    console.warn('[DRAG]', ..._args);
  }
};

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

export class DragModule extends Module {
  readonly name = 'drag';

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startPosition = 0;
  private startIndex = 0; // Индекс слайда при начале драга (для center mode)
  private currentX = 0; // Текущая позиция курсора
  private currentY = 0;

  // Для восстановления анимации при коротком клике
  private wasAnimating = false;
  private animationTarget: number | null = null;

  // RAF для momentum
  private animationId: number | null = null;

  // Границы для rubberband
  private minPosition = 0;
  private maxPosition = 0;

  // Кеш размера viewport (избегаем layout thrashing при drag)
  private cachedViewportSize = 0;

  // Кеш ссылок на модули и вычислений (избегаем повторных lookup на каждом pointermove)
  private loopModuleRef: {
    fix?: (params: {
      direction?: 'next' | 'prev';
      activeSlideIndex?: number;
      slideTo?: boolean;
      setTranslate?: boolean;
    }) => void;
  } | null = null;
  private isMarqueeActive = false;

  // Настройки
  private readonly FRICTION = 0.92; // более плавное затухание
  private readonly MIN_VELOCITY = 0.05; // Снижен порог для более длинной инерции
  private readonly LOG_INTERVAL = 200; // Интервал обновления базового события (мс)
  private readonly TOUCH_ANGLE = 45; // Граница между скроллом и drag

  private readonly MIN_DRAG_DISTANCE = 5;
  private isPotentialDrag = false;

  // Hold-to-pause
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

  // Флаги для loop
  private isFirstMove = true; // Флаг первого движения
  // Frame-based cooldown для coverageFix: после любого loopFix (isFirstMove или
  // coverageFix) пропускаем N pointermove событий. Это предотвращает каскадный
  // ping-pong (PREV→NEXT→PREV...) при быстрых drag-ах в маленьких каруселях.
  private coverageFixCooldown = 0;

  // Накопленный delta до начала drag (для вычитания из первого движения)
  private accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
  // Флаг: нужно ли вычесть накопленный delta на следующем кадре
  private shouldSubtractAccumulatedDelta = false;

  // Для расчёта velocity
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

    // Обновляем границы при resize
    this.on('resized', () => this.updateBounds());

    // Слушаем сдвиг позиций (от LoopModule)
    this.on('positionShifted', this.onPositionShifted);

    // Слушаем loopFix для обновления стартовой позиции
    this.on('loopFix', this.onLoopFix);
  }

  /**
   * Кешируем ссылки на модули и вычисляемые флаги,
   * чтобы не делать lookup на каждом pointermove.
   */
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

      // Обновляем историю для корректного расчета скорости
      // (хотя скорость зависит от относительного смещения, координаты в истории абсолютные?)
      // В history мы храним clientX/clientY (экранные координаты), они не меняются при сдвиге слайдов.
      // calculateVelocity использует (x - prevX). Это не зависит от slide position.
      // Так что history обновлять не нужно.
    }
  };

  public override shouldBeActive(): boolean {
    return this.options.drag !== false;
  }

  /**
   * Обновление границ для rubberband.
   * При loop границ нет. Без loop: peekTrim — min/max без левого/правого peek.
   * При center: true (без loop) используем getScrollPositionForIndex для корректного учета centerOffset.
   * При marquee границ нет (свободная прокрутка).
   */
  private updateBounds(): void {
    const { engine, slides } = this.tvist;
    const perPage = this.options.perPage ?? 1;

    // Кешируем размер viewport (читаем offsetWidth/offsetHeight один раз при resize, не на каждом pointermove)
    const isHorizontal = this.options.direction !== 'vertical';
    this.cachedViewportSize = isHorizontal
      ? this.tvist.root.offsetWidth
      : this.tvist.root.offsetHeight;

    if (this.options.loop || this.isMarqueeActive) {
      // При loop или marquee границ нет (бесконечная прокрутка)
      this.minPosition = Infinity;
      this.maxPosition = -Infinity;
    } else if (this.options.center) {
      // При center: true (без loop) используем getScrollPositionForIndex, который уже учитывает centerOffset
      this.minPosition = engine.getScrollPositionForIndex(0);
      this.maxPosition = engine.getScrollPositionForIndex(slides.length - 1);
    } else {
      const usePeekTrim = this.options.peekTrim !== false;
      this.minPosition = usePeekTrim ? engine.getMinScrollPosition() : 0;
      this.maxPosition = usePeekTrim
        ? engine.getMaxScrollPosition()
        : -engine.getSlidePosition(slides.length - perPage);
    }

    // Отладка границ
    if (this.options.debug) {
      console.warn('[DragModule] Границы обновлены:', {
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        loop: this.options.loop,
        center: this.options.center,
        peekTrim: this.options.peekTrim !== false,
        slidesCount: slides.length,
        perPage,
      });
    }
  }

  /**
   * Подключение event listeners
   */
  private attachEvents(): void {
    const { root } = this.tvist;

    // Используем Pointer Events если поддерживаются (они покрывают mouse и touch)
    // Иначе используем отдельные обработчики для mouse и touch
    if ('PointerEvent' in window) {
      root.addEventListener('pointerdown', this.onPointerDown);
    } else {
      // Fallback для старых браузеров
      root.addEventListener('touchstart', this.onPointerDown, { passive: true });
      root.addEventListener('mousedown', this.onPointerDown);
    }

    // Предотвращаем нативный drag-and-drop (браузер перехватывает pointer events
    // при попытке перетащить изображение или выделенный текст внутри слайдов)
    root.addEventListener('dragstart', this.onDragStart);

    // Класс --draggable: user-select: none, cursor: grab, touch-action
    root.classList.add(TVIST_CLASSES.draggable);
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

  private attachHoldEvents(): void {
    if (!this.holdRoot) return;

    if ('PointerEvent' in window) {
      this.holdRoot.addEventListener('pointerdown', this.onHoldPointerDown);
      this.holdRoot.addEventListener('lostpointercapture', this.onLostPointerCapture);
    } else {
      this.holdRoot.addEventListener('touchstart', this.onHoldPointerDown, { passive: true });
      this.holdRoot.addEventListener('mousedown', this.onHoldPointerDown);
    }
  }

  private detachHoldEvents(): void {
    if (!this.holdRoot) return;

    if ('PointerEvent' in window) {
      this.holdRoot.removeEventListener('pointerdown', this.onHoldPointerDown);
      this.holdRoot.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    } else {
      this.holdRoot.removeEventListener('touchstart', this.onHoldPointerDown);
      this.holdRoot.removeEventListener('mousedown', this.onHoldPointerDown);
    }
    this.holdRoot = null;
  }

  /**
   * Предотвращение нативного drag-and-drop
   */
  private onDragStart = (e: Event): void => {
    e.preventDefault();
  };

  /**
   * Отключение event listeners
   */
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

    // Не отдаём удержание родительскому Tvist (вложенные слайдеры, stories)
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

  private addHoldDocumentEvents(): void {
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', this.onHoldPointerMove);
      document.addEventListener('pointerup', this.onHoldPointerUp);
      document.addEventListener('pointercancel', this.onHoldPointerUp);
    } else {
      document.addEventListener('touchmove', this.onHoldPointerMove, { passive: true });
      document.addEventListener('touchend', this.onHoldPointerUp);
      document.addEventListener('touchcancel', this.onHoldPointerUp);
      document.addEventListener('mousemove', this.onHoldPointerMove);
      document.addEventListener('mouseup', this.onHoldPointerUp);
    }
  }

  private removeHoldDocumentEvents(): void {
    if ('PointerEvent' in window) {
      document.removeEventListener('pointermove', this.onHoldPointerMove);
      document.removeEventListener('pointerup', this.onHoldPointerUp);
      document.removeEventListener('pointercancel', this.onHoldPointerUp);
    } else {
      document.removeEventListener('touchmove', this.onHoldPointerMove);
      document.removeEventListener('touchend', this.onHoldPointerUp);
      document.removeEventListener('touchcancel', this.onHoldPointerUp);
      document.removeEventListener('mousemove', this.onHoldPointerMove);
      document.removeEventListener('mouseup', this.onHoldPointerUp);
    }
  }

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

  /**
   * Начало драга
   */
  private onPointerDown = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    // Игнорируем если уже драгаем
    if (this.isDragging) return;

    // Игнорируем если слайдер заблокирован
    if (this.tvist.engine.isLocked) return;

    // Игнорируем правую кнопку мыши
    if ('button' in e && e.button !== 0) return;

    const target = e.target as HTMLElement;
    // Вложенный Tvist: жест относится ближайшему root, родитель не должен ловить всплытие
    const nearestBlock = target?.closest?.(`.${TVIST_CLASSES.block}`);
    if (nearestBlock && nearestBlock !== this.tvist.root) return;

    // Проверяем focusable элементы
    if (this.isFocusableElement(target)) return;

    const point = this.getPointerPosition(e);
    if (!point) return;

    // Только подготавливаемся, но не начинаем драг сразу (ждем threshold)
    this.isPotentialDrag = true;
    this.startX = point.x;
    this.startY = point.y;
    this.currentX = point.x;
    this.currentY = point.y;
    this.startIndex = this.tvist.engine.index.get();

    // Разрешаем клики (пока не начался реальный драг)
    this.tvist.allowClick = true;

    // Приостанавливаем marquee если активен.
    // MarqueeModule.pause() сам синхронизирует engine.location с визуальной позицией.
    const marqueeModule = this.tvist.getModule('marquee') as { pause?: () => void };
    marqueeModule?.pause?.();

    // startPosition читаем ПОСЛЕ паузы marquee
    // (если marquee активен, engine.location уже синхронизирован в pause())
    this.startPosition = this.tvist.engine.location.get();

    // Сбрасываем события для velocity tracking
    this.baseEvent = null;
    this.prevBaseEvent = null;
    this.lastMoveTime = 0;

    // Сбрасываем флаги для loop
    this.isFirstMove = true;

    // Сбрасываем накопленный delta
    this.accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    this.shouldSubtractAccumulatedDelta = false;

    // Запоминаем состояние анимации для возможного восстановления
    this.wasAnimating = this.tvist.engine.animator.isAnimating();
    if (this.wasAnimating) {
      // Сохраняем целевой индекс анимации (activeIndex уже обновлен)
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
      loop: this.options.loop,
      rewind: this.options.rewind,
      autoplay: this.options.autoplay,
      slidesCount: this.tvist.slides.length,
      slideSize: this.tvist.engine.slideSizeValue,
      expectedLocationForIndex3: this.tvist.engine.getScrollPositionForIndex(3),
    });

    // Останавливаем активную анимацию если была
    this.stopMomentum();
    this.tvist.engine.animator.stop();

    // Добавляем move/up listeners
    this.addDocumentEvents();
  };

  /**
   * Движение при драге
   */
  private onPointerMove = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return;

    const point = this.getPointerPosition(e);
    if (!point) return;

    const now = Date.now();

    // Сохраняем текущую позицию курсора
    this.currentX = point.x;
    this.currentY = point.y;

    // Направление (horizontal/vertical)
    const isHorizontal = this.options.direction !== 'vertical';
    let deltaX = point.x - this.startX;
    let deltaY = point.y - this.startY;
    const moveDistance = Math.hypot(deltaX, deltaY);

    // Если еще не начали драг, решаем: это скролл страницы или drag слайдера
    if (!this.isDragging) {
      if (moveDistance > this.MIN_DRAG_DISTANCE) {
        // Определяем угол жеста относительно оси слайдера
        let isScrolling: boolean | undefined;
        if (moveDistance >= 5) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          const touchAngle = (Math.atan2(absY, absX) * 180) / Math.PI;
          if (isHorizontal) {
            // Горизонтальный слайдер: большие углы = вертикальный скролл
            isScrolling = touchAngle > this.TOUCH_ANGLE;
          } else {
            // Вертикальный слайдер: большие углы относительно вертикали = горизонтальный скролл
            isScrolling = 90 - touchAngle > this.TOUCH_ANGLE;
          }
        }

        // Если распознали скролл, не стартуем drag вообще — отдаём жест странице
        if (isScrolling) {
          this.isPotentialDrag = false;
          this.wasAnimating = false;
          this.animationTarget = null;
          // Не мешаем кликам и не вызываем preventDefault — пусть браузер сам скроллит
          return;
        }

        if (this.holdConfig?.cancelOnDrag !== false) {
          this.finishHold();
        }
        this.isDragging = true;

        // Запрещаем клики при начале реального драга
        this.tvist.allowClick = false;

        // Останавливаем активную анимацию только когда начинается реальный драг
        this.stopMomentum();
        this.tvist.engine.animator.stop();

        // КРИТИЧНО: вызываем loopFix ДО первого применения transform.
        // Но для "маленьких" loop-каруселей (slidesCount <= perPage + 1)
        // первый loopFix при drag только создаёт визуальные дыры, поэтому
        // в таком случае мы его пропускаем.
        if (this.options.loop && this.isFirstMove) {
          if (this.isMarqueeActive) {
            // В режиме marquee НЕ вызываем loopFix при драге.
            // engine.location уже синхронизирован с визуальной позицией в MarqueeModule.pause().
            // Слайды уже расставлены MarqueeModule для непрерывной прокрутки.
            this.isFirstMove = false;
          } else {
            const slidesCount = this.tvist.slides.length
            const perPage = this.options.perPage ?? 1

            // Маленькая карусель: полностью отключаем первый loopFix для drag.
            if (slidesCount <= perPage + 1) {
              this.isFirstMove = false
            } else if (this.loopModuleRef?.fix) {
              // Определяем направление движения:
              // Движение вправо (delta > 0) = движение к началу = 'prev'
              // Движение влево (delta < 0) = движение к концу = 'next'
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

              // Для обычного режима: обновляем startPosition
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
          }
        }

        this.baseEvent = { x: point.x, y: point.y, time: now };
        this.lastMoveTime = now;

        // Запоминаем накопленный delta до начала drag
        // Это delta накопился пока мы ждали превышения MIN_DRAG_DISTANCE
        // Мы вычтем его на СЛЕДУЮЩЕМ кадре
        this.accumulatedDeltaBeforeDragStart = {
          x: deltaX,
          y: deltaY,
        };
        this.shouldSubtractAccumulatedDelta = true;

        dragLog('dragStart', {
          activeIndex: this.tvist.engine.index.get(),
          realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
          startIndex: this.startIndex,
          startPosition: this.startPosition,
          accumulatedDelta: this.accumulatedDeltaBeforeDragStart,
        });
        this.emit('dragStart', e);
        // Добавляем класс dragging (отключает transition)
        this.tvist.root.classList.add(TVIST_CLASSES.dragging);
      } else {
        return; // Ждем превышения порога
      }
    }

    // КРИТИЧНО: вычитаем накопленный delta на СЛЕДУЮЩЕМ кадре после dragStart
    // Это предотвращает "перекидывание" слайда из-за delta, накопленного до превышения MIN_DRAG_DISTANCE
    if (this.shouldSubtractAccumulatedDelta) {
      deltaX -= this.accumulatedDeltaBeforeDragStart.x;
      deltaY -= this.accumulatedDeltaBeforeDragStart.y;
      // Сбрасываем флаг после первого применения
      this.shouldSubtractAccumulatedDelta = false;
      this.accumulatedDeltaBeforeDragStart = { x: 0, y: 0 };
    }

    const delta = isHorizontal ? deltaX : deltaY;

    // direction change loopFix УДАЛЁН:
    // Ранее при смене направления drag вызывался loopFix, но это создавало
    // каскадные сбросы startX/startPosition. Каждый сброс давал dragDelta ≈ 0
    // на следующем кадре, что провоцировало ложные coverageFix и новые direction change.
    // Теперь покрытие viewport обеспечивается только через checkContentCoverageAndFix,
    // который срабатывает по реальным пустотам (с проверкой направления и порога).

    // Применяем dragSpeed
    const dragSpeed = this.options.dragSpeed ?? 1;
    let distance = delta * dragSpeed;

    // Устанавливаем позицию
    let newPosition: number;

    if (this.isMarqueeActive) {
      // startPosition уже синхронизирован с визуальной позицией marquee (через pause() в onPointerDown)
      // и корректируется в onLoopFix после перестановки слайдов
      newPosition = this.startPosition + distance;

      // В marquee с loop режимом не применяем rubberband
      if (this.options.rubberband !== false && !this.options.loop) {
        newPosition = this.applyRubberbandToPosition(newPosition);
      }
    } else if (this.options.center && !this.options.loop) {
      // При center: true (без loop) нужно учитывать centerOffset для корректного расчета
      // Получаем базовую позицию слайда без centerOffset
      const basePosition = -this.tvist.engine.getSlidePosition(this.startIndex);
      // Получаем centerOffset для текущего слайда
      const centerOffset = this.tvist.engine.getCenterOffset(this.startIndex);
      // Рассчитываем новую позицию: базовая позиция + центрирование + смещение от драга
      newPosition = basePosition + centerOffset + distance;

      // Применяем rubberband на границах (только если включен)
      if (this.options.rubberband !== false) {
        newPosition = this.applyRubberbandToPosition(newPosition);
      }
    } else {
      // Применяем rubberband на границах (только если включен)
      if (this.options.rubberband !== false) {
        distance = this.applyRubberband(distance);
      }
      newPosition = this.startPosition + distance;
    }
    this.tvist.engine.location.set(newPosition);

    // Применяем transform напрямую (без пересчёта размеров)
    dragLog('applying transform', {
      newPosition,
      locationBefore: this.tvist.engine.location.get(),
    });
    this.tvist.engine.applyTransform();
    dragLog('transform applied', {
      locationAfter: this.tvist.engine.location.get(),
    });

    // Проверяем покрытие viewport контентом и подставляем слайды при необходимости
    // Работает для всех loop-режимов (обычный loop и marquee + loop)
    if (this.options.loop) {
      this.checkContentCoverageAndFix(newPosition, point);
    }

    // Обновляем базовое событие если прошло достаточно времени
    const elapsed = now - this.lastMoveTime;
    if (elapsed > this.LOG_INTERVAL) {
      this.prevBaseEvent = this.baseEvent;
      this.baseEvent = { x: point.x, y: point.y, time: now };
      this.lastMoveTime = now;
    }

    // Emit события
    this.emit('drag', e);

    // Prevent default для touch-жестов, чтобы браузер не перехватывал скролл.
    // В окружениях с PointerEvent реальные тач-события приходят как pointermove
    // c pointerType: 'touch', а не как touchmove, поэтому проверяем pointerType.
    const pointerType = this.getPointerType(e);
    if (pointerType === 'touch') {
      e.preventDefault();
    }
  };

  /**
   * Окончание драга
   */
  private onPointerUp = (e: TouchEvent | MouseEvent | PointerEvent): void => {
    if (!this.isPotentialDrag && !this.isDragging) return;

    const wasDragging = this.isDragging;
    this.isPotentialDrag = false;

    // Если был драг
    if (this.isDragging) {
      this.isDragging = false;

      // Восстанавливаем transition (удаляем класс)
      this.tvist.root.classList.remove(TVIST_CLASSES.dragging);

      // Восстанавливаем возможность кликов после завершения текущего event loop
      // Это предотвращает срабатывание клика сразу после окончания драга
      setTimeout(() => {
        this.tvist.allowClick = true;
      }, 0);

      // Проверяем и ограничиваем позицию после drag (rubberband мог вывести за границы)
      if (!this.options.loop) {
        const currentPosition = this.tvist.engine.location.get();
        let clampedPosition = currentPosition;

        if (currentPosition > this.minPosition) {
          clampedPosition = this.minPosition;
        } else if (currentPosition < this.maxPosition) {
          clampedPosition = this.maxPosition;
        }

        // Если позиция была скорректирована, устанавливаем её
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
        loop: this.options.loop,
        rewind: this.options.rewind,
      });
      this.emit('dragEnd', e);

      if (this.isMarqueeActive) {
        // MarqueeModule сам подхватит позицию из engine.location через resume()
        // при получении события dragEnd (уже emitted выше).
        // Не делаем snap — marquee продолжит прокрутку.
      } else {
        // Применяем инерцию или snap для обычного режима
        if (this.options.drag === 'free') {
          this.startMomentum(velocity);
        } else {
          this.snapToNearest(velocity);
        }
      }
    } else if (!wasDragging && this.wasAnimating && this.animationTarget !== null) {
      // Если не было драга, но была анимация - возобновляем её
      // Используем scrollTo без immediate чтобы продолжить анимацию
      this.tvist.scrollTo(this.animationTarget, false);
    }

    // Если не было реального drag (tap) — возобновляем marquee если был на паузе.
    // MarqueeModule.resume() безопасен для вызова если не на паузе (проверка внутри).
    if (!wasDragging) {
      const mq = this.tvist.getModule('marquee') as { resume?: () => void };
      mq?.resume?.();
    }

    // Сбрасываем флаги
    this.wasAnimating = false;
    this.animationTarget = null;

    // Удаляем listeners в любом случае
    this.removeDocumentEvents();
  };

  /**
   * Добавление document listeners (для move/up вне container)
   */
  private addDocumentEvents(): void {
    if ('PointerEvent' in window) {
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp);
      document.addEventListener('pointercancel', this.onPointerUp);
    } else {
      // Fallback: touch + mouse для браузеров без Pointer Events
      // Non-passive для touchmove (нужен preventDefault)
      document.addEventListener('touchmove', this.onPointerMove, { passive: false });
      document.addEventListener('touchend', this.onPointerUp);
      document.addEventListener('touchcancel', this.onPointerUp);
      document.addEventListener('mousemove', this.onPointerMove);
      document.addEventListener('mouseup', this.onPointerUp);
    }
  }

  /**
   * Удаление document listeners
   */
  private removeDocumentEvents(): void {
    if ('PointerEvent' in window) {
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
      document.removeEventListener('pointercancel', this.onPointerUp);
    } else {
      document.removeEventListener('touchmove', this.onPointerMove);
      document.removeEventListener('touchend', this.onPointerUp);
      document.removeEventListener('touchcancel', this.onPointerUp);
      document.removeEventListener('mousemove', this.onPointerMove);
      document.removeEventListener('mouseup', this.onPointerUp);
    }
  }

  /**
   * Получение позиции pointer (универсально для touch/mouse)
   */
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

  /**
   * Проверка на focusable элемент
   */
  private isFocusableElement(element: HTMLElement): boolean {
    const focusableSelectors =
      this.options.focusableElements ?? 'input, textarea, select, button, a[href], [tabindex]';

    return element.matches(focusableSelectors);
  }

  /**
   * Проверяет покрытие viewport контентом и вызывает loopFix при необходимости.
   * Работает для всех loop-режимов (обычный loop и marquee + loop).
   * Заменяет старую проверку по индексу — использует реальные позиции слайдов.
   */
  private checkContentCoverageAndFix(
    currentPosition: number,
    point: { x: number; y: number }
  ): void {
    const loopModule = this.loopModuleRef;
    if (!loopModule?.fix) return;
    const loopFix = loopModule.fix.bind(loopModule);

    const viewportSize = this.tvist.engine.containerSizeValue;

    // Для "маленьких" loop-каруселей (мало слайдов относительно perPage)
    // не имеет смысла coverageFix: контент и так почти всегда полностью
    // покрывает viewport, а перестановки дают только визуальные прыжки.
    // Для marquee-режима coverageFix всегда должен работать (даже на маленьких
    // каруселях) — именно он подставляет слайды и устраняет дыры.
    // Ограничение по "маленьким" каруселям применяем только для обычного loop.
    if (!this.isMarqueeActive) {
      const slidesCount = this.tvist.slides.length;
      const perPage = this.options.perPage ?? 1;
      if (slidesCount <= perPage + 1) {
        return;
      }
    }

    // Координаты viewport в пространстве контента
    const vpStart = -currentPosition;
    const vpEnd = vpStart + viewportSize;

    // Границы контента
    const slides = this.tvist.slides;
    if (slides.length === 0) return;

    const contentStart = this.tvist.engine.getSlidePosition(0);
    const lastIdx = slides.length - 1;
    const contentEnd =
      this.tvist.engine.getSlidePosition(lastIdx) + this.tvist.engine.getSlideSize(lastIdx);

    // Проверяем только ту сторону, в которую тянет пользователь.
    // Это предотвращает пинг-понг: coverageFix PREV → viewport сдвигается →
    // coverageFix NEXT → viewport сдвигается обратно → бесконечный цикл.
    const isHoriz = this.options.direction !== 'vertical';
    const dragDelta = isHoriz ? point.x - this.startX : point.y - this.startY;

    // Пропускаем проверку если |dragDelta| слишком мал — направление ненадёжно.
    // После каждого loopFix startX сбрасывается к point.x, и на следующем кадре
    // dragDelta ≈ 0.4px с произвольным знаком, что вызывает ложные срабатывания.
    const MIN_COVERAGE_DRAG_DELTA = 10;
    if (Math.abs(dragDelta) < MIN_COVERAGE_DRAG_DELTA) {
      return;
    }

    // Frame-based cooldown: после любого loopFix (isFirstMove или coverageFix)
    // пропускаем N pointermove событий. При быстрых drag-ах в маленьких каруселях
    // coverageFix вызывает ping-pong (PREV→NEXT→PREV...) потому что каждый fix
    // сдвигает viewport к противоположному краю контента. Пауза в N кадров
    // даёт позиции стабилизироваться.
    if (this.coverageFixCooldown > 0) {
      this.coverageFixCooldown--;
      return;
    }

    // Буфер = -5px: игнорируем субпиксельные зазоры от floating point,
    // реагируем только на реальные видимые пустоты (> 5px).
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
      // После loopFix обновляем стартовые точки drag для корректного расчёта delta
      this.startPosition = this.tvist.engine.location.get();
      this.startX = point.x;
      this.startY = point.y;
      this.startIndex = this.tvist.engine.index.get();

      // Cooldown: пропускаем следующие N pointermove для стабилизации
              this.coverageFixCooldown = 5;
    }
  }

  /**
   * Находит индекс слайда, ближайшего к левому краю viewport.
   * Используется для определения корректного activeSlideIndex при coverageFix NEXT,
   * чтобы loopFix переместил правильное количество слайдов и сделал верную коррекцию позиции.
   *
   * Проблема: если передать lastIdx, loopFix перемещает слишком много слайдов
   * (например, 3 из 4) и коррекция создаёт пустоту на противоположном краю.
   * Используя слайд у левого края viewport, мы перемещаем только слайды,
   * которые уже за пределами видимости (слева от viewport).
   */
  private findSlideNearViewportEdge(viewportLeft: number, slides: HTMLElement[]): number {
    // Находим последний слайд, чья позиция <= viewport left.
    // Позиции слайдов отсортированы по возрастанию, поэтому выходим
    // из цикла как только позиция превысила viewportLeft.
    let nearestIdx = 0;
    for (let i = 0; i < slides.length; i++) {
      const pos = this.tvist.engine.getSlidePosition(i);
      if (pos > viewportLeft) break;
      nearestIdx = i;
    }

    // Гарантируем минимум 1, чтобы порог append-проверки в loopFix
    // (activeIdx + slidesPerView > slidesCount - loopedSlides) всегда срабатывал.
    // При index=0 проверка может не пройти для маленьких каруселей.
    return Math.max(nearestIdx, 1);
  }

  /**
   * Rubberband эффект
   * Простое деление на константу для сопротивления за границами
   */
  private applyRubberband(distance: number): number {
    const position = this.startPosition + distance;

    // Внутри границ - полное движение БЕЗ сопротивления
    if (position >= this.maxPosition && position <= this.minPosition) {
      return distance;
    }

    const FRICTION = 5;

    // Вычисляем, какая часть distance выходит за границу
    let inBounds = distance;
    let outOfBounds = 0;

    if (position > this.minPosition) {
      // Вышли за правую границу
      const overflow = position - this.minPosition;
      inBounds = distance - overflow;
      outOfBounds = overflow;
    } else if (position < this.maxPosition) {
      // Вышли за левую границу
      const overflow = this.maxPosition - position;
      inBounds = distance + overflow;
      outOfBounds = -overflow;
    }

    // Часть внутри границ движется нормально, часть за границей - с трением
    return inBounds + outOfBounds / FRICTION;
  }

  /**
   * Rubberband эффект для абсолютной позиции (используется в center режиме)
   */
  private applyRubberbandToPosition(position: number): number {
    // Внутри границ - возвращаем позицию как есть
    if (position >= this.maxPosition && position <= this.minPosition) {
      return position;
    }

    const FRICTION = 5;

    if (position > this.minPosition) {
      // Вышли за правую границу
      const overflow = position - this.minPosition;
      return this.minPosition + overflow / FRICTION;
    } else if (position < this.maxPosition) {
      // Вышли за левую границу
      const overflow = this.maxPosition - position;
      return this.maxPosition - overflow / FRICTION;
    }

    return position;
  }

  /**
   * Вычисление velocity по последнему событию
   */
  private calculateVelocity(): number {
    // В loop режиме или если не превышены границы - считаем velocity
    const isLoop = this.options.loop;
    const currentPosition = this.tvist.engine.location.get();
    const exceeded = currentPosition > this.minPosition || currentPosition < this.maxPosition;

    if (!isLoop && exceeded) {
      return 0; // Не применяем momentum если за границами
    }

    const now = Date.now();
    const currentPoint = { x: this.currentX, y: this.currentY, time: now };

    // Используем prevBaseEvent если baseEvent совпадает с текущим
    const basePoint =
      this.baseEvent?.time === now && this.prevBaseEvent ? this.prevBaseEvent : this.baseEvent;

    if (!basePoint) return 0;

    const timeDiff = now - basePoint.time;

    // Если времени прошло слишком много или слишком мало - нет velocity
    if (timeDiff === 0 || timeDiff >= this.LOG_INTERVAL) {
      return 0;
    }

    const isHorizontal = this.options.direction !== 'vertical';
    const distance = isHorizontal ? currentPoint.x - basePoint.x : currentPoint.y - basePoint.y;

    return distance / timeDiff;
  }

  /**
   * Momentum scroll (free mode)
   * Простая инерционная анимация с затуханием
   */
  private startMomentum(initialVelocity: number): void {
    // Проверяем, не за границами ли мы уже (для не-loop режима)
    const currentPosition = this.tvist.engine.location.get();
    const isLoop = this.options.loop;

    if (this.options.debug) {
      console.warn('[DragModule] startMomentum:', {
        currentPosition,
        initialVelocity,
        minPosition: this.minPosition,
        maxPosition: this.maxPosition,
        isLoop,
      });
    }

    if (!isLoop) {
      const isOutOfBounds =
        currentPosition > this.minPosition || currentPosition < this.maxPosition;

      // Если за границами - не применяем momentum, сразу snap
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

    // Если velocity слишком маленькая - пропускаем momentum
    if (Math.abs(initialVelocity) < 0.1) {
      if (this.options.drag !== 'free' || this.options.freeSnap) {
        this.snapToNearest(initialVelocity);
      }
      return;
    }

    const flickPower = this.options.flickPower ?? 600;

    // Преобразуем velocity (px/ms) в начальную скорость для анимации
    // Умножаем на flickPower для более выраженного эффекта
    let velocity = (initialVelocity * flickPower) / 60; // Делим на 60 для нормализации к FPS

    const animate = (): void => {
      // Применяем friction для плавного затухания
      velocity *= this.FRICTION;

      // Обновляем позицию
      const currentPos = this.tvist.engine.location.get();
      let newPosition = currentPos + velocity;

      // Проверяем границы (если не loop)
      let hitBoundary = false;
      if (!isLoop) {
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

      // Применяем transform напрямую (без пересчёта размеров)
      this.tvist.engine.applyTransform();

      // Сообщаем о скролле для LoopModule
      this.emit('scroll');

      // Продолжаем если velocity достаточная
      if (Math.abs(velocity) > this.MIN_VELOCITY && !hitBoundary) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.stopMomentum();
        // Финальный snap если не free mode ИЛИ если включён freeSnap
        if (this.options.drag !== 'free' || this.options.freeSnap) {
          this.snapToNearest(initialVelocity);
        }
      }
    };

    animate();
  }

  /**
   * Snap к ближайшему слайду
   * Две стратегии: threshold для обычного режима, nearest для free+snap
   */
  private snapToNearest(_velocity: number): void {
    const isFreeSnap = this.options.drag === 'free' && this.options.freeSnap;

    if (isFreeSnap) {
      // Free+Snap: находим БЛИЖАЙШИЙ слайд к текущей позиции
      this.snapToNearestSlide();
    } else {
      // Обычный режим: используем threshold от стартовой позиции
      this.snapWithThreshold();
    }
  }

  /**
   * Free+Snap: находим ближайший слайд к текущей позиции
   */
  private snapToNearestSlide(): void {
    const { engine, slides } = this.tvist;
    const currentPosition = engine.location.get();

    let nearestIndex = 0;
    let minDistance = Infinity;

    // Ищем слайд, чья позиция ближе всего к текущей
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
      activeIndex: engine.index.get(),
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
    });

    engine.scrollTo(nearestIndex);
  }

  /**
   * Обычный snap: используем threshold от начальной позиции drag
   */
  private snapWithThreshold(): void {
    const { engine } = this.tvist;
    const startIndex = engine.activeIndex;

    const slideSize = engine.slideSizeValue;
    const gap = resolveTrackGapFromOptions(this.options);
    const slideWithGap = slideSize + gap;

    if (slideWithGap === 0) {
      dragLog('snapWithThreshold (no size)', { targetIndex: startIndex });
      engine.scrollTo(startIndex);
      return;
    }

    const isHorizontal = this.options.direction !== 'vertical';
    const dragDistance = isHorizontal ? this.currentX - this.startX : this.currentY - this.startY;

    const threshold = Math.max(slideSize * 0.2, 80);

    // Вычисляем количество слайдов для перемещения
    const exactSlidesMoved = -dragDistance / slideWithGap;
    let slidesMoved = Math.round(exactSlidesMoved);

    // Применяем порог (threshold)
    if (Math.abs(dragDistance) < threshold) {
      // Если драг меньше порога, остаемся на месте
      slidesMoved = 0;
    } else {
      // Если превысили порог, но round дал 0 (маленький драг),
      // форсируем перемещение на 1 слайд
      if (slidesMoved === 0) {
        slidesMoved = dragDistance > 0 ? -1 : 1;
      }
    }

    const targetIndex = startIndex + slidesMoved;

    dragLog('snapWithThreshold', {
      startIndex,
      startIndexFromEngine: this.startIndex,
      targetIndex,
      slidesMoved,
      dragDistance,
      currentLocation: engine.location.get(),
      startPosition: this.startPosition,
      threshold,
      realIndex: 'realIndex' in this.tvist ? this.tvist.realIndex : undefined,
      loop: this.options.loop,
      rewind: this.options.rewind,
    });

    dragLog('>>> CALLING engine.scrollTo', targetIndex);
    engine.scrollTo(targetIndex);
  }

  /**
   * Остановка momentum анимации
   */
  private stopMomentum(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Хук при resize
   */
  override onResize(): void {
    this.updateCachedRefs();
    this.updateBounds();
  }

  /**
   * Хук при динамическом обновлении опций (updateOptions)
   */
  override onOptionsUpdate(): void {
    // Как при обычном окончании hold: иначе autoplay/video остаются на паузе, holdActive — true
    this.finishHold();
    this.detachHoldEvents();
    this.setupHoldToPause();
    this.updateCachedRefs();
    this.updateBounds();
  }
}
