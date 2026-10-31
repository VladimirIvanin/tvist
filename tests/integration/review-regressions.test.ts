import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tvist from '../../src/index';
import { getRuntime } from '../../src/core/runtime';
import { TVIST_CLASSES } from '../../src/core/constants';
import { createSliderFixture, resizeSlider } from '../fixtures';

describe('review regressions', () => {
  let fixture: ReturnType<typeof createSliderFixture>;
  let slider: Tvist | undefined;

  beforeEach(() => {
    window.innerWidth = 1100;
    fixture = createSliderFixture({ slidesCount: 12, width: 720, height: 360 });
  });

  afterEach(() => {
    slider?.destroy();
    slider = undefined;
    fixture.cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([true, { withClones: true }] as const)(
    'preserves logical indices and the selected slide across loop disable/enable: %j',
    (loop) => {
      slider = new Tvist(fixture.root, { loop, speed: 0, pagination: true });
      slider.scrollTo(5, true);
      const count = slider.slideCount;
      for (let cycle = 0; cycle < 3; cycle++) {
        slider.disable();
        expect(slider.slideCount).toBe(12);
        slider.enable();
        expect(slider.slideCount).toBe(count);
        expect(slider.realIndex).toBe(5);
        expect(slider.slides.every((slide) => slide.hasAttribute('data-tvist-slide-index'))).toBe(
          true
        );
        slider.scrollTo(1, true);
        expect(slider.realIndex).toBe(1);
        expect(slider.slides[slider.activeIndex]).toBe(fixture.slides[1]);
        slider.scrollTo(5, true);
      }
    }
  );

  it('cleans up implicit clones after an options hook at a breakpoint', () => {
    fixture.slides.slice(3).forEach((slide) => slide.remove());
    slider = new Tvist(fixture.root, {
      loop: true,
      perPage: 2,
      speed: 0,
      breakpoints: { 900: { pagination: true } },
    });
    const count = slider.slideCount;
    expect(count).toBeGreaterThan(3);
    window.innerWidth = 800;
    slider.disable();
    expect(slider.slideCount).toBe(3);
    slider.enable();
    expect(slider.slideCount).toBe(count);
    slider.scrollTo(1, true);
    expect(slider.realIndex).toBe(1);
  });

  it.each([true, false])('applies updateOptions enabled from initial state %s', (enabled) => {
    slider = new Tvist(fixture.root, { enabled, arrows: true, pagination: true, speed: 0 });
    const disabled = vi.fn();
    const activated = vi.fn();
    slider.on('disabled', disabled).on('enabled', activated);
    slider.updateOptions({ enabled: !enabled });
    expect(slider.isEnabled).toBe(!enabled);
    slider.updateOptions({ enabled: false });
    expect(slider.root.classList.contains(TVIST_CLASSES.disabled)).toBe(true);
    expect(slider.container.style.transform).toBe('');
    expect(getRuntime(slider).__tvistInternal_getModule('drag')).toBeUndefined();
    slider.next();
    expect(slider.realIndex).toBe(0);
    slider.updateOptions({ enabled: true });
    expect(slider.isEnabled).toBe(true);
    expect(getRuntime(slider).__tvistInternal_getModule('drag')).toBeDefined();
    slider.next();
    expect(slider.realIndex).toBe(1);
    expect(disabled).toHaveBeenCalledTimes(1);
    expect(activated).toHaveBeenCalledTimes(enabled ? 1 : 2);
  });

  it('keeps enabled updated when a breakpoint recalculates', () => {
    slider = new Tvist(fixture.root, { breakpoints: { 900: { perPage: 2 } } });
    slider.updateOptions({ enabled: false });
    window.innerWidth = 800;
    expect(slider.isEnabled).toBe(false);
    slider.updateOptions({ enabled: true });
    expect(slider.isEnabled).toBe(true);
  });

  it('replaces media query listeners without resizing the fixed-width track', () => {
    slider = new Tvist(fixture.root, { perPage: 3, breakpoints: { 600: { perPage: 1 } } });
    slider.updateOptions({ breakpoints: { 900: { perPage: 2 } } });
    window.innerWidth = 800;
    expect(slider.options.perPage).toBe(2);
    window.innerWidth = 1100;
    expect(slider.options.perPage).toBe(3);
  });

  it.each([true, false])('immediately applies first breakpoints, enabled=%s', (enabled) => {
    slider = new Tvist(fixture.root, { enabled, perPage: 3 });
    slider.updateOptions({ breakpoints: { 1200: { perPage: 2, enabled: true } } });
    expect(slider.options.perPage).toBe(2);
    expect(slider.isEnabled).toBe(true);
  });

  it('restores base options when all breakpoints are removed', () => {
    slider = new Tvist(fixture.root, { perPage: 3, breakpoints: { 1200: { perPage: 2 } } });
    slider.updateOptions({ breakpoints: {} });
    expect(slider.options.perPage).toBe(3);
    window.innerWidth = 800;
    expect(slider.options.perPage).toBe(3);
  });

  it('switches listeners when breakpointsBase changes', () => {
    slider = new Tvist(fixture.root, {
      perPage: 3,
      breakpointsBase: 'container',
      breakpoints: { 900: { perPage: 2 } },
    });
    expect(slider.options.perPage).toBe(2);
    slider.updateOptions({ breakpointsBase: 'window' });
    expect(slider.options.perPage).toBe(3);
    window.innerWidth = 800;
    expect(slider.options.perPage).toBe(2);
    slider.updateOptions({ breakpointsBase: 'container' });
    resizeSlider(fixture.root, 1000);
    slider.update();
    expect(slider.options.perPage).toBe(3);
    window.innerWidth = 700;
    expect(slider.options.perPage).toBe(3);
  });

  it('updates an existing autoplay timer on entering and leaving a breakpoint', () => {
    vi.useFakeTimers();
    slider = new Tvist(fixture.root, {
      speed: 0,
      autoplay: { delay: 1200, pauseOnHover: false },
      breakpoints: { 900: { autoplay: { delay: 100, pauseOnHover: false } } },
    });
    window.innerWidth = 800;
    vi.advanceTimersByTime(205);
    expect(slider.realIndex).toBe(2);
    window.innerWidth = 1100;
    vi.advanceTimersByTime(1199);
    expect(slider.realIndex).toBe(2);
    vi.advanceTimersByTime(1);
    expect(slider.realIndex).toBe(3);
  });

  it('removes autoplay when leaving a breakpoint that enabled it', () => {
    vi.useFakeTimers();
    slider = new Tvist(fixture.root, {
      speed: 0,
      breakpoints: { 900: { autoplay: { delay: 100, pauseOnHover: false } } },
    });
    window.innerWidth = 800;
    vi.advanceTimersByTime(100);
    expect(slider.realIndex).toBe(1);
    window.innerWidth = 1100;
    expect(slider.autoplay).toBeUndefined();
    vi.advanceTimersByTime(1000);
    expect(slider.realIndex).toBe(1);
  });

  it('uses vertical grid page offsets and height for navigation', () => {
    slider = new Tvist(fixture.root, {
      direction: 'vertical',
      grid: { rows: 2, cols: 2 },
      gap: 12,
    });
    slider.slides.forEach((slide, index) => {
      Object.defineProperties(slide, {
        offsetLeft: { configurable: true, value: 0 },
        offsetTop: { configurable: true, value: index * 372 },
        offsetWidth: { configurable: true, value: 720 },
        offsetHeight: { configurable: true, value: 360 },
      });
    });
    slider.update();
    slider.scrollTo(1, true);
    expect(slider.container.style.transform).toBe('translate3d(0, -372px, 0)');
    expect(getRuntime(slider).__tvistInternal_engine.__tvistInternal_slideSizeValue).toBe(360);
  });

  it.each(['horizontal', 'vertical'] as const)(
    'overlaps fade slides mid-transition on %s',
    (direction) => {
      slider = new Tvist(fixture.root, { direction, effect: 'fade' });
      const engine = getRuntime(slider).__tvistInternal_engine;
      const size = engine.__tvistInternal_slideSizeValue;
      engine.__tvistInternal_location.set(-size / 2);
      engine.__tvistInternal_applyTransform();
      expect(slider.slides[0].style.opacity).toBe('0.5');
      expect(slider.slides[1].style.opacity).toBe('0.5');
      expect(slider.slides[0].style.transform).toBe(
        direction === 'vertical' ? 'translate3d(0, 50%, 0)' : 'translate3d(50%, 0, 0)'
      );
      expect(slider.slides[1].style.transform).toBe(
        direction === 'vertical' ? 'translate3d(0, -50%, 0)' : 'translate3d(-50%, 0, 0)'
      );
    }
  );

  it('emits clamped progress from beginning to end and back', () => {
    slider = new Tvist(fixture.root, { perPage: 3 });
    const progress = vi.fn();
    slider.on('progress', progress);
    expect(progress).toHaveBeenLastCalledWith(0);
    slider.scrollTo(3, true);
    expect(progress).toHaveBeenLastCalledWith(1 / 3);
    slider.scrollTo(11, true);
    expect(progress).toHaveBeenLastCalledWith(1);
    slider.scrollTo(0, true);
    expect(progress).toHaveBeenLastCalledWith(0);
  });

  it.each([true, false])('emits reach events once per arrival, instant=%s', (instant) => {
    slider = new Tvist(fixture.root, { speed: 0, perPage: 3 });
    const beginning = vi.fn();
    const end = vi.fn();
    slider.on('reachBeginning', beginning).on('reachEnd', end);
    slider.scrollTo(11, instant);
    slider.next();
    slider.scrollTo(11, instant);
    expect(end).toHaveBeenCalledTimes(1);
    slider.scrollTo(0, instant);
    slider.prev();
    expect(beginning).toHaveBeenCalledTimes(1);
    slider.scrollTo(3, instant);
    slider.scrollTo(9, instant);
    expect(end).toHaveBeenCalledTimes(2);
  });

  it('rebuilds pagination type, renderer, container and clickable bullets immediately', () => {
    slider = new Tvist(fixture.root, { pagination: true, speed: 0 });
    const oldBullet = fixture.root.querySelector<HTMLElement>(`.${TVIST_CLASSES.bullet}`)!;
    slider.updateOptions({ pagination: { type: 'fraction' } });
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.bullet}`)).toBeNull();
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)?.textContent).toBe(
      '1'
    );
    oldBullet.click();
    expect(slider.realIndex).toBe(0);
    const external = document.createElement('div');
    fixture.root.append(external);
    slider.updateOptions({
      pagination: {
        container: external,
        type: 'custom',
        renderCustom: (current, total) => `<b>${current}:${total}</b>`,
      },
    });
    expect(external.innerHTML).toBe('<b>1:12</b>');
    slider.updateOptions({
      pagination: { container: external, renderBullet: (index) => `<button>${index}</button>` },
    });
    external.querySelectorAll('button')[2].click();
    expect(slider.realIndex).toBe(2);
    slider.updateOptions({ pagination: { container: external, clickable: false } });
    external.children[3].dispatchEvent(new MouseEvent('click'));
    expect(slider.realIndex).toBe(2);
  });

  it('changes pagination immediately at a breakpoint and restores bullets on exit', () => {
    slider = new Tvist(fixture.root, {
      pagination: true,
      breakpoints: { 900: { pagination: { type: 'fraction' } } },
    });
    window.innerWidth = 800;
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)?.textContent).toBe(
      '1'
    );
    window.innerWidth = 1100;
    expect(fixture.root.querySelectorAll(`.${TVIST_CLASSES.bullet}`)).toHaveLength(12);
    expect(fixture.root.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)).toBeNull();
  });
});
