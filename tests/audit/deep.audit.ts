import { afterAll, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Counter } from '../../src/core/Counter';
import { EventEmitter } from '../../src/core/EventEmitter';
import { Vector1D } from '../../src/core/Vector1D';
import { createResources } from '../../src/utils/resources';
import { cloneOptions } from '../../src/utils/dom';

const enabled = process.env.AUDIT_DEEP === '1';
const baseSeed = 20261031;
const numRuns = 500;
const reports: Record<string, unknown>[] = [];
const sequence = <T>(command: fc.Arbitrary<T>) =>
  fc.array(command, { minLength: 50, maxLength: 200 });

/** Keep findings visible without stopping the remaining independent families. */
function campaign<T>(
  name: string,
  offset: number,
  arbitrary: fc.Arbitrary<T>,
  run: (value: T, step: () => void) => void
): void {
  const invocations: number[] = [];
  const started = Date.now();
  const result = fc.check(
    fc.property(arbitrary, (value) => {
      let commands = 0;
      try {
        run(value, () => commands++);
      } finally {
        invocations.push(commands);
      }
    }),
    { seed: baseSeed + offset, numRuns }
  );
  reports.push({
    family: name,
    requestedRuns: numRuns,
    numRuns: result.numRuns,
    seed: result.seed,
    path: result.counterexamplePath,
    numShrinks: result.numShrinks,
    numSkips: result.numSkips,
    failed: result.failed,
    actualCommands: invocations.slice(0, result.numRuns).reduce((a, b) => a + b, 0),
    shrinkCommands: invocations.slice(result.numRuns).reduce((a, b) => a + b, 0),
    propertyInvocations: invocations.length,
    elapsedMs: Date.now() - started,
    counterexample: result.counterexample,
    error: result.failed ? String(result.errorInstance) : undefined,
  });
  expect(
    result.failed,
    `${name}: seed=${result.seed} path=${result.counterexamplePath}; ${String(result.errorInstance ?? '')}`
  ).toBe(false);
}

afterAll(() => {
  if (!enabled) return;
  mkdirSync(resolve('.tmp/audit'), { recursive: true });
  writeFileSync(
    resolve('.tmp/audit/unit-deep.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseSeed,
        requestedRunsPerFamily: numRuns,
        commandLengthRange: [50, 200],
        factoryProbes: false,
        note: 'Command counts are executed commands, with shrinking counted separately. A failed family can stop before 500 successful runs.',
        families: reports,
      },
      null,
      2
    )
  );
});

describe.runIf(enabled)('deep independent unit models (AUDIT_DEEP=1)', () => {
  it('EventEmitter subscriptions follow an independent registration model', () => {
    campaign(
      'event-subscriptions',
      0,
      sequence(
        fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 7 }), fc.boolean())
      ),
      (actions, step) => {
        const emitter = new EventEmitter();
        const model = new Map<string, Set<number>>();
        const anyModel = new Set<number>();
        let received: string[] = [];
        const callbacks = Array.from(
          { length: 8 },
          (_, id) => () => received.push(`specific:${id}`)
        );
        const anyCallbacks = Array.from({ length: 8 }, (_, id) => () => received.push(`any:${id}`));
        for (const [operation, id, secondEvent] of actions) {
          step();
          const event = secondEvent ? 'other' : 'scroll';
          const listeners = model.get(event) ?? new Set<number>();
          if (operation === 0) {
            emitter.on(event, callbacks[id]);
            listeners.add(id);
            model.set(event, listeners);
          }
          if (operation === 1) {
            emitter.off(event, callbacks[id]);
            listeners.delete(id);
            if (!listeners.size) model.delete(event);
          }
          if (operation === 2) {
            emitter.off(event);
            model.delete(event);
          }
          if (operation === 3) {
            emitter.onAny(anyCallbacks[id]);
            anyModel.add(id);
          }
          if (operation === 4) {
            emitter.offAny(anyCallbacks[id]);
            anyModel.delete(id);
          }
          if (operation === 5) {
            emitter.clear();
            model.clear();
            anyModel.clear();
          }
          received = [];
          emitter.emit(event, 42);
          expect(received).toEqual([
            ...[...(model.get(event) ?? [])].map((value) => `specific:${value}`),
            ...[...anyModel].map((value) => `any:${value}`),
          ]);
          expect(emitter.listenerCount(event)).toBe(model.get(event)?.size ?? 0);
          expect(emitter.hasPositionListeners()).toBe(
            anyModel.size > 0 || (model.get('scroll')?.size ?? 0) > 0
          );
        }
      }
    );
  });

  it('nonrecursive once subscriptions deliver each registration only once', () => {
    campaign(
      'event-once',
      1,
      sequence(fc.tuple(fc.integer({ min: 0, max: 3 }), fc.boolean())),
      (actions, step) => {
        const emitter = new EventEmitter();
        let pending: { event: string; token: number }[] = [];
        let nextToken = 0;
        const actual: number[] = [];
        const expected: number[] = [];
        for (const [operation, secondEvent] of actions) {
          step();
          const event = secondEvent ? 'a' : 'b';
          if (operation === 0) {
            const token = nextToken++;
            emitter.once(event, () => actual.push(token));
            pending.push({ event, token });
          } else if (operation === 1) {
            expected.push(
              ...pending.filter((entry) => entry.event === event).map((entry) => entry.token)
            );
            pending = pending.filter((entry) => entry.event !== event);
            emitter.emit(event);
            emitter.emit(event);
          } else if (operation === 2) {
            emitter.off(event);
            pending = pending.filter((entry) => entry.event !== event);
          } else {
            emitter.clear();
            pending = [];
          }
          expect(actual).toEqual(expected);
          expect(emitter.listenerCount(event)).toBe(
            pending.filter((entry) => entry.event === event).length
          );
        }
      }
    );
  });

  it('Counter agrees with modular arithmetic or finite bounds', () => {
    campaign(
      'counter-wrap-clamp',
      2,
      fc.record({
        count: fc.integer({ min: 0, max: 40 }),
        loop: fc.boolean(),
        end: fc.integer({ min: 0, max: 40 }),
        actions: sequence(
          fc.tuple(fc.integer({ min: 0, max: 2 }), fc.integer({ min: -10000, max: 10000 }))
        ),
      }),
      ({ count, loop, end, actions }, step) => {
        const maximum = Math.max(0, Math.min(end, count - 1));
        const constrain = (value: number) =>
          count === 0
            ? 0
            : loop
              ? ((value % count) + count) % count
              : Math.min(maximum, Math.max(0, value));
        const counter = new Counter(count, 0, loop, maximum);
        let expected = 0;
        for (const [operation, value] of actions) {
          step();
          if (operation === 0) {
            expected = constrain(value);
            expect(counter.set(value)).toBe(expected);
          } else if (operation === 1) {
            expected = constrain(expected + value);
            expect(counter.add(value)).toBe(counter);
          } else {
            const clone = counter.clone();
            expect(clone.get()).toBe(expected);
            clone.set(value);
            expect(counter.get()).toBe(expected);
          }
          expect(counter.get()).toBe(expected);
        }
      }
    );
  });

  it('Vector operations preserve scalar value, clone isolation and reader lifecycle', () => {
    campaign(
      'vector-algebra',
      3,
      sequence(fc.tuple(fc.integer({ min: 0, max: 6 }), fc.integer({ min: -400, max: 400 }))),
      (actions, step) => {
        const vector = new Vector1D(0);
        let expected = 0;
        for (const [operation, input] of actions) {
          step();
          const value = input / 4;
          if (operation === 0) {
            vector.set(value);
            expected = value;
          }
          if (operation === 1) {
            vector.add(value);
            expected += value;
          }
          if (operation === 2) {
            vector.subtract(value);
            expected -= value;
          }
          if (operation === 3) {
            vector.multiply(0.5);
            expected /= 2;
          }
          if (operation === 4) {
            vector.lerp(value, 0.5);
            expected = (expected + value) / 2;
          }
          if (operation === 5) {
            const clone = vector.clone();
            clone.add(value + 1);
            expect(vector.get()).toBeCloseTo(expected, 8);
          }
          if (operation === 6) {
            vector.setReader(() => value);
            expect(vector.get()).toBe(value);
            vector.setReader();
          }
          expect(vector.get()).toBeCloseTo(expected, 8);
          expect(vector.normalize(-100, 100)).toBeCloseTo((expected + 100) / 200, 8);
          expect(vector.normalize(5, 5)).toBe(0);
        }
      }
    );
  });

  it('Resources cancel owned timers and frames across repeated activations', () => {
    campaign(
      'resource-ownership',
      4,
      sequence(fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 199 }))),
      (actions, step) => {
        vi.useFakeTimers();
        const resources = createResources();
        const jobs = new Map<number, { id: number; frame: boolean }>();
        const actual: number[] = [];
        const expected: number[] = [];
        let token = 0;
        try {
          for (const [operation, selector] of actions) {
            step();
            if (operation <= 1) {
              const key = token++;
              const callback = () => actual.push(key);
              const frame = operation === 1;
              const id = frame
                ? resources.__tvistInternal_frame(callback)
                : resources.__tvistInternal_timeout(callback, 10);
              jobs.set(key, { id, frame });
            } else if (operation === 2 && jobs.size) {
              const [key, job] = [...jobs][selector % jobs.size];
              if (job.frame) resources.__tvistInternal_cancelFrame(job.id);
              else resources.__tvistInternal_cancelTimeout(job.id);
              jobs.delete(key);
            } else if (operation === 3) {
              expected.push(...jobs.keys());
              jobs.clear();
              vi.runAllTimers();
            } else if (operation >= 4) {
              resources.__tvistInternal_clear();
              jobs.clear();
            }
            expect([...actual].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
          }
          resources.__tvistInternal_clear();
          resources.__tvistInternal_clear();
          vi.runAllTimers();
          expect([...actual].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
          expect(vi.getTimerCount()).toBe(0);
        } finally {
          resources.__tvistInternal_clear();
          vi.clearAllTimers();
          vi.useRealTimers();
        }
      }
    );
  });

  it('cloneOptions isolates nested data while preserving supported DOM references', () => {
    campaign(
      'option-clone-isolation',
      5,
      fc.record({
        values: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 12 }),
        actions: sequence(
          fc.tuple(fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 100 }))
        ),
      }),
      ({ values, actions }, step) => {
        const previous = document.createElement('button');
        const next = document.createElement('button');
        const pagination = document.createElement('div');
        const options = {
          perPage: 3,
          grid: { rows: 2, dimensions: values.map((value) => [value, 1]) },
          breakpoints: { 767: { perPage: 1, gap: 8 } },
          arrows: { prev: previous, next },
          pagination: { container: pagination },
        };
        const before = JSON.stringify(options);
        for (const [operation, value] of actions) {
          step();
          const clone = cloneOptions(options);
          expect(clone).not.toBe(options);
          expect(clone.arrows.prev).toBe(previous);
          expect(clone.arrows.next).toBe(next);
          expect(clone.pagination.container).toBe(pagination);
          if (operation === 0) clone.perPage = value;
          else if (operation === 1) clone.grid.dimensions[0][0] = value;
          else if (operation === 2) clone.breakpoints[767].gap = value;
          else clone.grid.dimensions.push([value, 2]);
          expect(JSON.stringify(options)).toBe(before);
        }
      }
    );
  });
});
