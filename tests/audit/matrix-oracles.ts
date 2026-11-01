import { expect, type Page } from '@playwright/test';
import { coverageHoles, type MeasuredRect } from './dom-oracles';
import type { AuditWindow } from './browser-fixture';

export interface MatrixMeasurements {
  vertical: boolean;
  track: MeasuredRect;
  cards: MeasuredRect[];
  originals: MeasuredRect[];
  active: MeasuredRect | null;
  gap: number;
  paddingBefore: number;
  paddingAfter: number;
  perPage: number;
  autoSize: boolean;
  peekTrim: boolean;
  centered: boolean;
  loopRequested: boolean;
  bothDirections: boolean;
}

/** Determine the applicable DOM obligations from authored content and the measured viewport. */
export function matrixGeometryObservations(state: MatrixMeasurements) {
  const start = (rect: MeasuredRect) => (state.vertical ? rect.top : rect.left);
  const end = (rect: MeasuredRect) => (state.vertical ? rect.bottom : rect.right);
  const required = { ...state.track };
  if (state.vertical) {
    required.top += state.paddingBefore;
    required.bottom -= state.paddingAfter;
  } else {
    required.left += state.paddingBefore;
    required.right -= state.paddingAfter;
  }
  const span = end(required) - start(required);
  const originalSpan =
    state.originals.reduce((sum, card) => sum + Math.max(0, end(card) - start(card)), 0) +
    state.gap * Math.max(0, state.originals.length - 1);
  // Physical copies may fill several viewports even when all originals fit on one page.
  // Auto-sized cards use their measured widths/heights, independent of numeric perPage.
  const enoughOriginals =
    state.originals.length > 1 && (state.autoSize || state.originals.length > state.perPage);
  const operationalLoop =
    state.loopRequested && state.bothDirections && enoughOriginals && originalSpan > span + 1;
  const holes =
    span > 0
      ? coverageHoles(
          required,
          state.cards,
          state.vertical ? 'vertical' : 'horizontal',
          state.gap,
          1
        )
      : [];

  let leadingError: number | undefined;
  if (
    span > 0 &&
    state.active &&
    !state.centered &&
    state.bothDirections &&
    (!state.loopRequested || operationalLoop)
  ) {
    // Several finite auto-size indices can share the same trimmed end position while
    // canScrollNext/Prev are both true. A leading snap would put empty space after the last card.
    const last = state.originals[state.originals.length - 1];
    const wouldExposeFiniteTail =
      !state.loopRequested &&
      state.autoSize &&
      state.peekTrim &&
      last !== undefined &&
      end(last) - start(state.active) <= end(state.track) - start(required) + 1;
    if (!wouldExposeFiniteTail) leadingError = Math.abs(start(state.active) - start(required));
  }
  return {
    internalHoles: holes.filter((hole) => hole.edge === 'inside'),
    loopHoles: operationalLoop ? holes : [],
    leadingError,
    operationalLoop,
  };
}

/** Finite centering, grid wrappers and transformed effect faces have their own scenario oracles. */
export async function checkMatrixGeometry(page: Page): Promise<void> {
  const state = await page.evaluate(() => {
    const w = window as unknown as AuditWindow;
    const slider = w.auditSlider;
    if (
      slider.options.grid ||
      (slider.options.effect && slider.options.effect !== 'slide') ||
      !slider.slides.length
    )
      return null;
    const rect = (node: Element) => {
      const { left, right, top, bottom } = node.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const vertical = slider.options.direction === 'vertical';
    const style = getComputedStyle(slider.track);
    const originals =
      w.auditOriginals ??
      slider.slides.filter((card) => !card.classList.contains(w.TvistV1.CLASSES.slideClone));
    const active = slider.slides.find((card) =>
      card.classList.contains(w.TvistV1.CLASSES.slideActive)
    );
    const loop = slider.options.loop;
    return {
      vertical,
      track: rect(slider.track),
      cards: slider.slides.map(rect),
      originals: originals
        .filter((card) => slider.root.contains(card) && getComputedStyle(card).display !== 'none')
        .map(rect),
      active: active ? rect(active) : null,
      gap: Math.max(
        0,
        ...slider.slides.map(
          (card) =>
            parseFloat(
              vertical ? getComputedStyle(card).marginBottom : getComputedStyle(card).marginRight
            ) || 0
        )
      ),
      paddingBefore: parseFloat(vertical ? style.paddingTop : style.paddingLeft) || 0,
      paddingAfter: parseFloat(vertical ? style.paddingBottom : style.paddingRight) || 0,
      perPage: slider.options.perPage ?? 1,
      autoSize: vertical
        ? !!slider.options.autoHeight && !slider.options.fixedHeight
        : !!slider.options.autoWidth && !slider.options.fixedWidth,
      peekTrim: slider.options.peekTrim !== false,
      centered: Boolean(slider.options.center),
      loopRequested:
        loop === true || (typeof loop === 'object' && loop !== null && loop.enabled !== false),
      bothDirections: slider.canScrollNext && slider.canScrollPrev,
    };
  });
  if (!state) return;
  const observations = matrixGeometryObservations(state);
  expect(observations.internalHoles, 'MATRIX_INTERNAL_CONTENT_HOLE').toEqual([]);
  expect(observations.loopHoles, 'MATRIX_LOOP_VIEWPORT_HOLE').toEqual([]);
  if (observations.leadingError !== undefined)
    expect(observations.leadingError, 'MATRIX_SELECTED_LEADING_ALIGNMENT').toBeLessThanOrEqual(1);
}
