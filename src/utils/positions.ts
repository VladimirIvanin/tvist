import type { TvistOptions } from '../core/types';

/** Boolean and object loop configurations share the same activation rule. */
export function loopEnabled(loop: TvistOptions['loop']): boolean {
  return loop === true || (typeof loop === 'object' && loop !== null && loop.enabled !== false);
}

/** Last navigation position; callers explicitly choose whether every slide is reachable. */
export function lastScrollIndex(count: number, perPage: number, unbounded = false): number {
  return unbounded ? count - 1 : Math.max(0, count - perPage);
}

/** Navigation and pagination use the same number of grouped positions. */
export function pageCount(count: number, perPage: number, group: number, loop: boolean): number {
  return count === 0 ? 0 : Math.ceil((lastScrollIndex(count, perPage, loop) + 1) / group);
}
