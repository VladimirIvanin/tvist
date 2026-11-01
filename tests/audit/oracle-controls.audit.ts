import { describe, expect, it } from 'vitest';
import {
  activeIdentityErrors,
  coverageHoles,
  resourceLeakErrors,
  restoredOriginalErrors,
  settledTransitionErrors,
  type MeasuredSlide,
} from './dom-oracles';
import { serializeCommands, type CampaignCommand } from '../../scripts/audit-campaigns';

const viewport = { left: 0, right: 300, top: 0, bottom: 100 };
const rect = (left: number, right: number) => ({ left, right, top: 0, bottom: 100 });
const card = (id: string, realIndex: number, active: boolean): MeasuredSlide => ({
  originalId: id,
  realIndex,
  active,
  rect: rect(0, 300),
});

describe('audit oracle positive and deliberately broken controls', () => {
  const mixedBooleanControls = (commands: CampaignCommand[]) =>
    new Set(commands.map((command) => command.direction)).size === 2 &&
    new Set(commands.map((command) => command.value % 2)).size === 2;
  it('generates repeatable mixed settings within each sequence, not merely between seeds', () => {
    for (let family = 0; family < 6; family++) {
      const commands = serializeCommands(family, 20261031 + family * 1000, 256);
      expect(commands).toEqual(serializeCommands(family, 20261031 + family * 1000, 256));
      expect(
        mixedBooleanControls(commands),
        `family ${family} mixes directions and boolean options`
      ).toBe(true);
      for (const action of new Set(commands.map((command) => command.action))) {
        expect(
          new Set(
            commands
              .filter((command) => command.action === action)
              .map((command) => command.value % 2)
          ).size,
          `family ${family} action ${action} explores both option states`
        ).toBe(2);
      }
    }
  });
  it('rejects the legacy low-bit LCG cadence even though it generates many distinct numbers', () => {
    let state = 20261031;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    const broken = Array.from({ length: 256 }, () => {
      random();
      const value = random();
      return {
        action: 'axis',
        value,
        direction: value % 2 ? ('next' as const) : ('prev' as const),
      };
    });
    expect(new Set(broken.map((command) => command.value)).size).toBe(256);
    expect(mixedBooleanControls(broken)).toBe(false);
  });
  it('accepts complete coverage, overlaps and an explicitly allowed CSS gap', () => {
    expect(coverageHoles(viewport, [rect(-10, 160), rect(150, 320)])).toEqual([]);
    expect(coverageHoles(viewport, [rect(0, 140), rect(150, 300)], 'horizontal', 10)).toEqual([]);
  });
  it('detects an internal hole even when min(left) and max(right) cover the viewport', () => {
    expect(coverageHoles(viewport, [rect(0, 100), rect(200, 300)])).toEqual([
      { start: 100, end: 200, edge: 'inside' },
    ]);
  });
  it('detects both edge holes and does not forgive them as CSS gaps', () => {
    expect(coverageHoles(viewport, [rect(20, 280)], 'horizontal', 30)).toEqual([
      { start: 0, end: 20, edge: 'start' },
      { start: 280, end: 300, edge: 'end' },
    ]);
  });
  it('accepts an end boundary inside a measured neighbouring gap, but rejects an oversized full gap', () => {
    expect(coverageHoles(viewport, [rect(-10, 288), rect(312, 450)], 'horizontal', 24)).toEqual([]);
    expect(coverageHoles(viewport, [rect(-10, 288), rect(330, 450)], 'horizontal', 24)).toEqual([
      { start: 288, end: 300, edge: 'end' },
    ]);
  });
  it('accepts a start boundary only when an offscreen preceding slide straddles the declared gap', () => {
    expect(coverageHoles(viewport, [rect(-100, -12), rect(12, 310)], 'horizontal', 24)).toEqual([]);
    expect(coverageHoles(viewport, [rect(-100, -30), rect(12, 310)], 'horizontal', 24)).toEqual([
      { start: 0, end: 12, edge: 'start' },
    ]);
    const vertical = (top: number, bottom: number) => ({ left: 0, right: 300, top, bottom });
    expect(
      coverageHoles(viewport, [vertical(-80, -12), vertical(12, 110)], 'vertical', 24)
    ).toEqual([]);
  });
  it('never forgives a finite empty head or tail merely because it is smaller than allowedGap', () => {
    expect(coverageHoles(viewport, [rect(12, 288)], 'horizontal', 24)).toEqual([
      { start: 0, end: 12, edge: 'start' },
      { start: 288, end: 300, edge: 'end' },
    ]);
    expect(
      coverageHoles(
        viewport,
        [rect(0, 288), { left: 312, right: 450, top: 200, bottom: 300 }],
        'horizontal',
        24
      )
    ).toEqual([{ start: 288, end: 300, edge: 'end' }]);
  });
  it('ignores cards entirely outside the cross-axis and handles vertical intervals', () => {
    expect(coverageHoles(viewport, [{ left: 0, right: 300, top: 200, bottom: 300 }])).toHaveLength(
      1
    );
    expect(
      coverageHoles(
        viewport,
        [
          { left: 0, right: 300, top: 0, bottom: 40 },
          { left: 0, right: 300, top: 60, bottom: 100 },
        ],
        'vertical'
      )
    ).toEqual([{ start: 40, end: 60, edge: 'inside' }]);
  });
  it('rejects invalid geometric measurements instead of silently passing', () => {
    expect(() => coverageHoles(viewport, [rect(Number.NaN, 300)])).toThrow(
      'ORACLE_INVALID_MEASUREMENT'
    );
  });
  it('accepts a unique active card with independently known identity', () => {
    expect(activeIdentityErrors([card('A', 0, false), card('B', 1, true)], 1, 'B')).toEqual([]);
  });
  it('detects missing, duplicate, wrong-index and wrong-original active cards separately', () => {
    expect(activeIdentityErrors([card('A', 0, false)], 0, 'A')).toContain('ACTIVE_CARDINALITY');
    expect(activeIdentityErrors([card('A', 0, true), card('A', 0, true)], 0, 'A')).toContain(
      'ACTIVE_CARDINALITY'
    );
    expect(activeIdentityErrors([card('A', 1, true)], 0, 'A')).toContain('ACTIVE_REAL_INDEX');
    expect(activeIdentityErrors([card('B', 0, true)], 0, 'A')).toContain(
      'ACTIVE_ORIGINAL_IDENTITY'
    );
  });
  it('detects lost originals, extra clones and restored order corruption', () => {
    expect(restoredOriginalErrors(['A', 'B'], ['A', 'B'])).toEqual([]);
    expect(restoredOriginalErrors(['A', 'B'], ['A', 'A'])).toContain('ORIGINAL_MEMBERSHIP');
    expect(restoredOriginalErrors(['A', 'B'], ['A', 'B', 'A'])).toContain('ORIGINAL_CARDINALITY');
    expect(restoredOriginalErrors(['A', 'B'], ['B', 'A'])).toContain('ORIGINAL_ORDER');
  });
  it('detects leaked DOM listeners without requiring a completely empty browser baseline', () => {
    const baseline = { listeners: 8, timers: 1, frames: 0, observers: 2 };
    expect(resourceLeakErrors(baseline, { ...baseline })).toEqual([]);
    expect(resourceLeakErrors(baseline, { ...baseline, listeners: 9 })).toEqual([
      'RESOURCE_LISTENERS',
    ]);
  });
  it('also detects leaked timers, RAF and observers independently', () => {
    const baseline = { listeners: 0, timers: 0, frames: 0, observers: 0 };
    expect(
      resourceLeakErrors(baseline, { listeners: 0, timers: 1, frames: 1, observers: 1 })
    ).toEqual(['RESOURCE_TIMERS', 'RESOURCE_FRAMES', 'RESOURCE_OBSERVERS']);
  });
  it('accepts a settled transition only with stable samples at the expected target', () => {
    expect(
      settledTransitionErrors(
        [
          { time: 0, position: -200, running: true },
          { time: 16, position: -300, running: false },
          { time: 32, position: -300, running: false },
          { time: 48, position: -300, running: false },
        ],
        -300
      )
    ).toEqual([]);
  });
  it('detects unfinished transitions even when the last frame is at the target', () => {
    expect(
      settledTransitionErrors(
        [
          { time: 0, position: -100, running: true },
          { time: 16, position: -200, running: true },
          { time: 32, position: -300, running: true },
        ],
        -300
      )
    ).toEqual(['TRANSITION_STILL_RUNNING', 'TRANSITION_NOT_STABLE']);
  });
  it('detects a stable but incorrect snap target and insufficient observations', () => {
    expect(
      settledTransitionErrors(
        [
          { time: 0, position: -200, running: false },
          { time: 16, position: -200, running: false },
          { time: 32, position: -200, running: false },
        ],
        -300
      )
    ).toContain('TRANSITION_WRONG_TARGET');
    expect(settledTransitionErrors([{ time: 0, position: -300, running: false }], -300)).toEqual([
      'INSUFFICIENT_MOTION_SAMPLES',
    ]);
  });
});
