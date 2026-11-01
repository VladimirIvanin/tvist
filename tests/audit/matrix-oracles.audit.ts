import { describe, expect, it } from 'vitest';
import { matrixGeometryObservations, type MatrixMeasurements } from './matrix-oracles';

const box = (left: number, right: number) => ({ left, right, top: 0, bottom: 100 });
function sample(
  cards: ReturnType<typeof box>[],
  extra: Partial<MatrixMeasurements> = {}
): MatrixMeasurements {
  return {
    vertical: false,
    track: box(0, 300),
    cards,
    originals: cards,
    active: cards[0] ?? null,
    gap: 10,
    paddingBefore: 30,
    paddingAfter: 40,
    perPage: 1,
    autoSize: false,
    peekTrim: true,
    centered: false,
    loopRequested: true,
    bothDirections: true,
    ...extra,
  };
}

describe('matrix geometry applicability controls', () => {
  it('accepts authored peek padding and still rejects missing required loop content', () => {
    const valid = sample([box(30, 130), box(140, 260), box(270, 380)]);
    expect(matrixGeometryObservations(valid)).toMatchObject({
      operationalLoop: true,
      internalHoles: [],
      loopHoles: [],
      leadingError: 0,
    });
    const broken = sample([box(30, 130), box(140, 210), box(350, 480)]);
    expect(matrixGeometryObservations(broken).loopHoles).toEqual([
      { start: 210, end: 260, edge: 'end' },
    ]);
    const vertical = (r: ReturnType<typeof box>) => ({
      left: r.top,
      right: r.bottom,
      top: r.left,
      bottom: r.right,
    });
    expect(
      matrixGeometryObservations({
        ...valid,
        vertical: true,
        track: vertical(valid.track),
        cards: valid.cards.map(vertical),
        originals: valid.originals.map(vertical),
        active: vertical(valid.active!),
      }).loopHoles
    ).toEqual([]);
  });
  it('counts author span and navigability independently of inflated physical clone storage', () => {
    const physical = [box(50, 130), box(140, 220), box(230, 310), box(320, 400)];
    expect(
      matrixGeometryObservations(sample(physical, { originals: [physical[1]!] })).operationalLoop
    ).toBe(false);
    expect(matrixGeometryObservations(sample(physical, { perPage: 4 })).operationalLoop).toBe(
      false
    );
    expect(
      matrixGeometryObservations(sample(physical, { bothDirections: false })).operationalLoop
    ).toBe(false);
    expect(
      matrixGeometryObservations(sample(physical, { perPage: 4, autoSize: true })).operationalLoop
    ).toBe(true);
  });
  it('accepts a finite auto-size clamp and still detects interior leading-edge displacement', () => {
    const clamped = sample([box(-250, -60), box(-50, 140), box(150, 260), box(270, 400)], {
      track: box(0, 400),
      active: box(150, 260),
      autoSize: true,
      loopRequested: false,
      paddingBefore: 0,
      paddingAfter: 0,
    });
    expect(matrixGeometryObservations(clamped).leadingError).toBeUndefined();
    const displaced = sample([box(-80, 32), box(42, 122), box(132, 240), box(250, 470)], {
      active: box(42, 122),
      autoSize: true,
      loopRequested: false,
      paddingBefore: 0,
      paddingAfter: 0,
    });
    expect(matrixGeometryObservations(displaced).leadingError).toBe(42);
  });
});
