import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResources } from '../../../src/utils/resources';
import { throttle } from '../../../src/core/Animator';

describe('activation resources', () => {
  afterEach(() => vi.useRealTimers());

  it('deduplicates a listener and removes it on disposal', () => {
    const resources = createResources();
    const target = document.createElement('button');
    const handler = vi.fn();
    resources.__tvistInternal_listen(target, 'click', handler);
    resources.__tvistInternal_listen(target, 'click', handler);
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
    resources.__tvistInternal_clear();
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('distinguishes capture registrations and supports reuse after clear', () => {
    const resources = createResources();
    const target = document.createElement('button');
    const handler = vi.fn();
    resources.__tvistInternal_listen(target, 'click', handler, true);
    resources.__tvistInternal_listen(target, 'click', handler, false);
    resources.__tvistInternal_unlisten(target, 'click', handler, true);
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);
    resources.__tvistInternal_clear();
    resources.__tvistInternal_listen(target, 'click', handler);
    target.click();
    expect(handler).toHaveBeenCalledTimes(2);
    resources.__tvistInternal_clear();
  });

  it('cancels pending timers and frames, including explicit early cancellation', () => {
    vi.useFakeTimers();
    const resources = createResources();
    const callback = vi.fn();
    resources.__tvistInternal_cancelTimeout(resources.__tvistInternal_timeout(callback, 10));
    resources.__tvistInternal_timeout(callback, 20);
    const frame = resources.__tvistInternal_frame(callback);
    resources.__tvistInternal_cancelFrame(frame);
    resources.__tvistInternal_clear();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases completed work without preventing a later activation', () => {
    vi.useFakeTimers();
    const resources = createResources();
    const callback = vi.fn();
    resources.__tvistInternal_timeout(callback, 10);
    vi.advanceTimersByTime(10);
    resources.__tvistInternal_clear();
    resources.__tvistInternal_timeout(callback, 10);
    vi.advanceTimersByTime(10);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps subscriptions and timers independent across activations', () => {
    vi.useFakeTimers();
    const first = createResources();
    const second = createResources();
    const target = document.createElement('button');
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    first.__tvistInternal_listen(target, 'click', firstCallback);
    second.__tvistInternal_listen(target, 'click', secondCallback);
    first.__tvistInternal_timeout(firstCallback, 10);
    second.__tvistInternal_timeout(secondCallback, 10);
    first.__tvistInternal_clear();
    target.click();
    vi.advanceTimersByTime(10);
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(2);
    second.__tvistInternal_clear();
    target.click();
    expect(secondCallback).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('owns delayed throttle work and cancels it on disposal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const resources = createResources();
    const callback = vi.fn();
    const throttled = throttle(callback, 50, resources);
    throttled('first');
    throttled('pending');
    expect(callback).toHaveBeenCalledExactlyOnceWith('first');
    resources.__tvistInternal_clear();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
