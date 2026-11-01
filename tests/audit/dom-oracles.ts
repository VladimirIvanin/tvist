/** Pure checks over browser measurements. No Tvist state or layout helpers are imported. */
export interface MeasuredRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface MeasuredSlide {
  rect: MeasuredRect;
  originalId: string;
  realIndex: number;
  active: boolean;
}
export interface CoverageHole {
  start: number;
  end: number;
  edge: 'start' | 'inside' | 'end';
}

/** Report uncovered portions of the required viewport, allowing only the declared inter-slide gap. */
export function coverageHoles(
  viewport: MeasuredRect,
  slides: MeasuredRect[],
  axis: 'horizontal' | 'vertical' = 'horizontal',
  allowedGap = 0,
  tolerance = 1
): CoverageHole[] {
  const horizontal = axis === 'horizontal';
  const start = horizontal ? viewport.left : viewport.top;
  const end = horizontal ? viewport.right : viewport.bottom;
  if (
    ![viewport.left, viewport.right, viewport.top, viewport.bottom, allowedGap, tolerance].every(
      Number.isFinite
    )
  ) {
    throw new Error('ORACLE_INVALID_MEASUREMENT');
  }
  if (end <= start) return [];
  // Retain offscreen neighbours: clipping first loses the evidence that a
  // viewport edge cuts through a legitimate gap between two actual slides.
  const measuredIntervals = slides
    .filter((rect) => {
      if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite))
        throw new Error('ORACLE_INVALID_MEASUREMENT');
      return horizontal
        ? rect.bottom > viewport.top && rect.top < viewport.bottom
        : rect.right > viewport.left && rect.left < viewport.right;
    })
    .map((rect) => ({
      start: horizontal ? rect.left : rect.top,
      end: horizontal ? rect.right : rect.bottom,
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of measuredIntervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  const straddledByAllowedGap = (boundary: number) =>
    merged.some((left, index) => {
      const right = merged[index + 1];
      return (
        right !== undefined &&
        left.end <= boundary &&
        right.start >= boundary &&
        right.start - left.end <= allowedGap + tolerance
      );
    });
  const intervals = merged
    .map((interval) => ({
      start: Math.max(start, interval.start),
      end: Math.min(end, interval.end),
    }))
    .filter((interval) => interval.end > interval.start);
  if (!intervals.length)
    return straddledByAllowedGap(start) && straddledByAllowedGap(end)
      ? []
      : [{ start, end, edge: 'start' }];
  const holes: CoverageHole[] = [];
  let coveredUntil = start;
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i]!;
    const threshold = i === 0 ? tolerance : allowedGap + tolerance;
    if (interval.start - coveredUntil > threshold && !(i === 0 && straddledByAllowedGap(start))) {
      holes.push({ start: coveredUntil, end: interval.start, edge: i === 0 ? 'start' : 'inside' });
    }
    coveredUntil = Math.max(coveredUntil, interval.end);
  }
  if (end - coveredUntil > tolerance && !straddledByAllowedGap(end))
    holes.push({ start: coveredUntil, end, edge: 'end' });
  return holes;
}

/** expectedOriginalId comes from fixture identity, never from the runtime's real-index calculation. */
export function activeIdentityErrors(
  slides: MeasuredSlide[],
  expectedIndex: number,
  expectedOriginalId: string
): string[] {
  const active = slides.filter((slide) => slide.active);
  const errors: string[] = [];
  if (active.length !== 1) errors.push('ACTIVE_CARDINALITY');
  if (active.some((slide) => slide.realIndex !== expectedIndex)) errors.push('ACTIVE_REAL_INDEX');
  if (active.some((slide) => slide.originalId !== expectedOriginalId))
    errors.push('ACTIVE_ORIGINAL_IDENTITY');
  return errors;
}

/** Verify author nodes after destroy/disable; clones must have been removed by the caller's lifecycle. */
export function restoredOriginalErrors(originalIds: string[], restoredIds: string[]): string[] {
  const errors: string[] = [];
  if (originalIds.length !== restoredIds.length) errors.push('ORIGINAL_CARDINALITY');
  const counts = (ids: string[]) => {
    const result = new Map<string, number>();
    ids.forEach((id) => result.set(id, (result.get(id) ?? 0) + 1));
    return result;
  };
  const before = counts(originalIds);
  const after = counts(restoredIds);
  if (before.size !== after.size || [...before].some(([id, count]) => after.get(id) !== count))
    errors.push('ORIGINAL_MEMBERSHIP');
  if (
    originalIds.length === restoredIds.length &&
    originalIds.some((id, index) => restoredIds[index] !== id)
  )
    errors.push('ORIGINAL_ORDER');
  return errors;
}

export interface ResourceCounts {
  listeners: number;
  timers: number;
  frames: number;
  observers: number;
}
/** Counts must be measured around an isolated fixture; this deliberately does not inspect Tvist internals. */
export function resourceLeakErrors(before: ResourceCounts, after: ResourceCounts): string[] {
  return (Object.keys(before) as (keyof ResourceCounts)[])
    .filter((key) => after[key] > before[key])
    .map((key) => `RESOURCE_${key.toUpperCase()}`);
}

export interface MotionSample {
  time: number;
  position: number;
  running: boolean;
}
export function settledTransitionErrors(
  samples: MotionSample[],
  expectedPosition: number,
  tolerance = 1
): string[] {
  if (samples.length < 3) return ['INSUFFICIENT_MOTION_SAMPLES'];
  if (
    !Number.isFinite(expectedPosition) ||
    samples.some((sample) => !Number.isFinite(sample.position) || !Number.isFinite(sample.time))
  )
    return ['NONFINITE_MOTION'];
  const tail = samples.slice(-3);
  const errors: string[] = [];
  if (tail.some((sample) => sample.running)) errors.push('TRANSITION_STILL_RUNNING');
  if (
    Math.max(...tail.map((sample) => sample.position)) -
      Math.min(...tail.map((sample) => sample.position)) >
    tolerance
  )
    errors.push('TRANSITION_NOT_STABLE');
  if (Math.abs(tail[tail.length - 1]!.position - expectedPosition) > tolerance)
    errors.push('TRANSITION_WRONG_TARGET');
  if (samples.some((sample, index) => index > 0 && sample.time <= samples[index - 1]!.time))
    errors.push('MOTION_TIME_ORDER');
  return errors;
}
