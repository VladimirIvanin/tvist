import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { EventEmitter } from '../../src/core/EventEmitter';
import { generateMatrix, verifyMatrix } from './matrix';
describe('audit infrastructure and uninstrumented public contracts', () => {
  it('independently verifies the entire declared pair/triple denominator', () => {
    const m = generateMatrix();
    expect(verifyMatrix(m.rows, m.required)).toEqual([]);
    expect(verifyMatrix([], m.required).length).toBe(m.required.length);
  });
  it('once remains once during recursive dispatch', () => {
    const e = new EventEmitter();
    let n = 0;
    e.once('event', () => {
      if (++n < 3) e.emit('event');
    });
    e.emit('event');
    expect(n, 'once-reentrant').toBe(1);
  });
  it('subscriptions follow an independent set model for generated sequences', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 7 }), fc.boolean()), { maxLength: 200 }),
        (actions) => {
          const e = new EventEmitter();
          const model = new Set<number>();
          let got: number[] = [];
          const callbacks = Array.from({ length: 8 }, (_, i) => () => got.push(i));
          for (const [i, on] of actions) {
            if (on) {
              e.on('event', callbacks[i]!);
              model.add(i);
            } else {
              e.off('event', callbacks[i]!);
              model.delete(i);
            }
            got = [];
            e.emit('event');
            expect(got).toEqual([...model]);
          }
        }
      ),
      { numRuns: 500, seed: 20261031 }
    );
  });
});
