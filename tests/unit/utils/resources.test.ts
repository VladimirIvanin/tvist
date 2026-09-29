import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResources } from '../../../src/utils/resources';

describe('activation resources', () => {
  afterEach(() => vi.useRealTimers());

  it('deduplicates a listener and removes it on disposal', () => {
    const resources = createResources();
    const target = document.createElement('button');
    const handler = vi.fn();
    resources.listen(target, 'click', handler);
    resources.listen(target, 'click', handler);
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
    resources.clear();
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('distinguishes capture registrations and supports reuse after clear', () => {
    const resources = createResources();
    const target = document.createElement('button');
    const handler = vi.fn();
    resources.listen(target, 'click', handler, true);
    resources.listen(target, 'click', handler, false);
    resources.unlisten(target, 'click', handler, true);
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
    resources.clear();
    resources.listen(target, 'click', handler);
    target.click();
    expect(handler).toHaveBeenCalledTimes(2);
    resources.clear();
  });

  it('cancels pending timers and frames, including explicit early cancellation', () => {
    vi.useFakeTimers();
    const resources = createResources();
    const callback = vi.fn();
    resources.cancelTimeout(resources.timeout(callback, 10));
    resources.timeout(callback, 20);
    const frame = resources.frame(callback);
    resources.cancelFrame(frame);
    resources.clear();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases completed work without preventing a later activation', () => {
    vi.useFakeTimers();
    const resources = createResources();
    const callback = vi.fn();
    resources.timeout(callback, 10);
    vi.advanceTimersByTime(10);
    resources.clear();
    resources.timeout(callback, 10);
    vi.advanceTimersByTime(10);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
