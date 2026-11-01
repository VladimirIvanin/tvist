import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tvist } from '../../src/core/Tvist';
import { EventEmitter } from '../../src/core/EventEmitter';
import { TVIST_CLASSES as C } from '../../src/core/constants';
import { auditMarkup } from '../fixtures/audit-regressions';
import { createSliderFixture, resizeSlider } from '../fixtures';
import type { TvistOptions } from '../../src/core/types';

const instances: Tvist[] = [];
function mount(options: TvistOptions = {}, count = 7) {
  const fixture = createSliderFixture({ slidesCount: count, width: 600, height: 300 });
  const slider = new Tvist(fixture.root, { speed: 0, visibility: false, ...options });
  instances.push(slider);
  return { ...fixture, slider };
}
afterEach(() => {
  instances
    .splice(0)
    .reverse()
    .forEach((slider) => slider.destroy());
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('audit event regressions', () => {
  it('001: consumes once before recursive emit and after a thrown callback', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn(() => {
      if (handler.mock.calls.length < 3) emitter.emit('event');
    });
    emitter.once('event', handler).emit('event').emit('event');
    expect(handler).toHaveBeenCalledTimes(1);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = vi.fn(() => {
      throw new Error('test');
    });
    emitter.once('event', throwing).emit('event').emit('event');
    expect(throwing).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('032: a listener removed and re-added during dispatch runs once per emit', () => {
    const emitter = new EventEmitter();
    const reader = vi.fn();
    const handler = vi.fn(() => {
      emitter.off('event', handler).on('event', handler);
    });
    emitter.on('event', reader).on('event', handler).emit('event');
    expect(handler).toHaveBeenCalledTimes(1);
    emitter.emit('event');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenCalledTimes(2);
  });
});

describe('audit layout and lifecycle regressions', () => {
  it('002: update discovers appended slides, removes detached slides and updates controls', () => {
    const { slider, slides, container } = mount({ pagination: true });
    const appended = slides[0]!.cloneNode(true) as HTMLElement;
    container.append(appended);
    slider.update();
    expect(slider.slides).toContain(appended);
    expect(slider.slideCount).toBe(8);
    expect(slider.root.querySelectorAll(`.${C.bullet}`)).toHaveLength(8);
    slider.scrollTo(7, true);
    appended.remove();
    slider.update();
    expect(slider.slides).not.toContain(appended);
    expect(slider.activeIndex).toBe(6);
    expect(slider.root.querySelectorAll(`.${C.bullet}`)).toHaveLength(7);
  });

  it('019: enables loop and switches clone storage repeatedly without stale limits', () => {
    const { slider } = mount();
    slider.updateOptions({ loop: true });
    slider.prev();
    expect(slider.realIndex).toBe(6);
    slider.updateOptions({ loop: { withClones: true } });
    expect(slider.slides.some((slide) => slide.classList.contains(C.slideClone))).toBe(true);
    slider.scrollTo(0, true);
    expect(slider.realIndex).toBe(0);
    expect(slider.slides[slider.activeIndex]!.classList.contains(C.slideClone)).toBe(false);
    slider.updateOptions({ loop: false });
    expect(slider.slideCount).toBe(7);
    slider.scrollTo(0, true);
    slider.prev();
    expect(slider.realIndex).toBe(0);
  });

  it('018/024: fallback clones have exactly one physical active slide after instant navigation', () => {
    const { slider } = mount({ loop: true, perPage: 3 }, 4);
    expect(slider.slideCount).toBeGreaterThan(4);
    for (const index of [3, 0, 2]) {
      slider.scrollTo(index, true);
      expect(slider.realIndex).toBe(index);
      expect(slider.slides.filter((slide) => slide.classList.contains(C.slideActive))).toEqual([
        slider.slides[slider.activeIndex],
      ]);
      expect(slider.slides[slider.activeIndex]!.classList.contains(C.slideClone)).toBe(false);
    }
  });

  it('020: fractional perPage ends at an integer, live selected slide', () => {
    const { slider } = mount({ perPage: 2.5 });
    slider.scrollTo(99, true);
    expect(slider.activeIndex).toBe(5);
    expect(slider.realIndex).toBe(5);
    expect(slider.slides[5]!.classList.contains(C.slideActive)).toBe(true);
    expect(slider.canScrollNext).toBe(false);
  });

  it('023: changing direction clears peek padding from the previous axis', () => {
    const { slider, track } = mount({ peek: { left: 24, right: 48 } });
    slider.updateOptions({ direction: 'vertical', peek: { top: 12, bottom: 20 } });
    expect(track.style.paddingLeft).toBe('');
    expect(track.style.paddingRight).toBe('');
    expect(track.style.paddingTop).toBe('12px');
  });

  it('004/026/037: grid pages own active state and destroy restores original node order', () => {
    const { slider, slides, container } = mount({
      grid: { rows: 2, cols: 2 },
      loop: { withClones: true },
    });
    expect(slider.slides.filter((slide) => slide.classList.contains(C.slideActive))).toEqual([
      slider.slides[slider.activeIndex],
    ]);
    slider.scrollTo(1, true);
    slider.destroy();
    expect(Array.from(container.children)).toEqual(slides);
  });

  it('031: normalizes perPage on every repeated effect update', () => {
    const { slider } = mount({ effect: 'fade', perPage: 3 });
    for (let i = 0; i < 3; i++) {
      slider.updateOptions({ effect: 'fade', perPage: 3 });
      expect(slider.options.perPage).toBe(1);
    }
  });

  it('034: container breakpoints re-enable after multiple disabled resizes', () => {
    const { slider, root } = mount({
      breakpointsBase: 'container',
      breakpoints: { 500: { enabled: false } },
    });
    for (const width of [400, 380, 600, 400, 600]) {
      resizeSlider(root, width);
      slider.update();
      expect(slider.isEnabled).toBe(width > 500);
    }
  });
});

describe('audit controls and media regressions', () => {
  it('003/029: binds thumbs through options and keeps logical selection after DOM reorder', () => {
    const thumbs = mount({ isNavigation: true, loop: true });
    const { slider } = mount({ thumbs: { slider: thumbs.slider } });
    for (const index of [6, 0, 4]) {
      thumbs.slider.scrollTo(index, true);
      thumbs.slider.slides[thumbs.slider.activeIndex]!.click();
      expect(slider.realIndex).toBe(index);
    }
    slider.scrollTo(2, true);
    expect(thumbs.slider.realIndex).toBe(2);
  });

  it('006: rapid edge wheel events remain available to page scrolling', () => {
    const { root } = mount({ wheel: { releaseOnEdges: true } });
    for (let i = 0; i < 3; i++) {
      const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
      root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('003: dynamic thumbs binding survives the main slider breakpoint round trip', () => {
    const thumbs = mount({ isNavigation: true });
    const { slider, root } = mount({
      breakpointsBase: 'container',
      breakpoints: { 500: { perPage: 2 } },
    });
    slider.updateOptions({ thumbs: { slider: thumbs.slider } });
    thumbs.slides[1]!.click();
    expect(slider.realIndex).toBe(1);
    resizeSlider(root, 400);
    slider.update();
    expect(slider.options.thumbs?.slider).toBe(thumbs.slider);
    thumbs.slides[2]!.click();
    expect(slider.realIndex).toBe(2);
    resizeSlider(root, 600);
    slider.update();
    thumbs.slides[3]!.click();
    expect(slider.realIndex).toBe(3);
  });

  it('010: loop playback belongs to the selected physical copy', () => {
    const fixture = createSliderFixture({ slidesCount: 3 });
    fixture.slides.forEach((slide) => {
      slide.innerHTML = auditMarkup.video;
    });
    const slider = new Tvist(fixture.root, {
      speed: 0,
      visibility: false,
      loop: { withClones: true },
      video: { autoplay: false },
    });
    instances.push(slider);
    const videos = [...fixture.root.querySelectorAll('video')];
    const play = videos.map((video) => {
      Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
      return vi.spyOn(video, 'play').mockResolvedValue();
    });
    slider.updateOptions({ video: { autoplay: true } });
    slider.scrollTo(1, true);
    const active = slider.slides[slider.activeIndex]!.querySelector('video');
    expect(play.filter((spy) => spy.mock.calls.length > 0)).toHaveLength(1);
    expect(play[videos.indexOf(active!)]).toHaveBeenCalledTimes(1);
  });

  it('011: late readiness cannot restart a video after its slide loses activation', () => {
    vi.useFakeTimers();
    const fixture = createSliderFixture({ slidesCount: 3 });
    fixture.slides.forEach((slide) => {
      slide.innerHTML = auditMarkup.video;
    });
    const videos = [...fixture.root.querySelectorAll('video')];
    const play = videos.map((video) => vi.spyOn(video, 'play').mockResolvedValue());
    const slider = new Tvist(fixture.root, {
      speed: 0,
      visibility: false,
      video: { autoplay: true },
    });
    instances.push(slider);
    slider.scrollTo(1, true);
    videos[0]!.dispatchEvent(new Event('canplay'));
    videos[1]!.dispatchEvent(new Event('canplay'));
    vi.advanceTimersByTime(30);
    expect(play[0]).not.toHaveBeenCalled();
    expect(play[1]).toHaveBeenCalledTimes(1);
  });

  it('008: replaces a custom scrollbar container and removes its owned DOM on destroy', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    const { slider } = mount({ scrollbar: { container: first } });
    slider.updateOptions({ scrollbar: { container: second } });
    expect(first.children).toHaveLength(0);
    expect(second.querySelector(`.${C.scrollbarThumb}`)).not.toBeNull();
    slider.destroy();
    expect(second.children).toHaveLength(0);
  });

  it('007: pointercancel ends scrollbar drag and ignores subsequent pointer moves', () => {
    const { slider, root } = mount({ scrollbar: true });
    const thumb = root.querySelector<HTMLElement>(`.${C.scrollbarThumb}`)!;
    thumb.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 4, clientX: 20, button: 0, bubbles: true })
    );
    expect(root.querySelector(`.${C.scrollbarDragging}`)).not.toBeNull();
    document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 4 }));
    expect(root.querySelector(`.${C.scrollbarDragging}`)).toBeNull();
    const position = slider.container.style.transform;
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 4, clientX: 200 }));
    expect(slider.container.style.transform).toBe(position);
  });

  it('028: foreign pointer cannot move or terminate the current deck gesture', () => {
    const { slider, root } = mount();
    const event = (type: string, id: number, x: number) =>
      new PointerEvent(type, { pointerId: id, clientX: x, clientY: 100, bubbles: true, button: 0 });
    root.dispatchEvent(event('pointerdown', 1, 500));
    document.dispatchEvent(event('pointermove', 1, 470));
    document.dispatchEvent(event('pointermove', 1, 300));
    expect(root.classList.contains(C.dragging)).toBe(true);
    const position = slider.container.style.transform;
    document.dispatchEvent(event('pointermove', 2, 100));
    document.dispatchEvent(event('pointerup', 2, 100));
    expect(slider.container.style.transform).toBe(position);
    expect(root.classList.contains(C.dragging)).toBe(true);
    document.dispatchEvent(event('pointercancel', 1, 300));
    expect(root.classList.contains(C.dragging)).toBe(false);
  });

  it('014: manual autoplay stop survives passive pause reasons until explicit start', () => {
    vi.useFakeTimers();
    const { slider, root } = mount({
      autoplay: { delay: 100, pauseOnHover: true, pauseOnFocus: true },
    });
    slider.autoplay!.stop();
    root.dispatchEvent(new MouseEvent('mouseenter'));
    root.dispatchEvent(new FocusEvent('focusin'));
    root.dispatchEvent(new MouseEvent('mouseleave'));
    root.dispatchEvent(new FocusEvent('focusout'));
    vi.advanceTimersByTime(500);
    expect(slider.autoplay!.isStopped()).toBe(true);
    expect(slider.realIndex).toBe(0);
    slider.autoplay!.start();
    vi.advanceTimersByTime(120);
    expect(slider.realIndex).toBe(1);
  });

  it('015/016: loads nested lazy images and removes pending spinners on destroy', () => {
    const fixture = createSliderFixture({ slidesCount: 7 });
    fixture.slides.forEach((slide) => {
      slide.innerHTML = auditMarkup.nestedLazy;
    });
    const slider = new Tvist(fixture.root, { visibility: false, lazy: true });
    instances.push(slider);
    slider.lazyload!.loadAll();
    expect(fixture.root.querySelectorAll('img[data-src]')).toHaveLength(0);
    expect(fixture.root.querySelectorAll(`.${C.block}__spinner`).length).toBeGreaterThan(0);
    slider.destroy();
    expect(fixture.root.querySelectorAll(`.${C.block}__spinner`)).toHaveLength(0);
  });

  it('017: cloned form IDs remain unique and local labels reference the cloned input', () => {
    const fixture = createSliderFixture({ slidesCount: 3 });
    fixture.slides.forEach((slide, index) => {
      slide.innerHTML = auditMarkup.form(index);
    });
    const slider = new Tvist(fixture.root, { visibility: false, loop: { withClones: true } });
    instances.push(slider);
    const inputs = [...fixture.root.querySelectorAll('input')];
    expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length);
    slider.slides.forEach((slide) =>
      expect(slide.querySelector('label')!.htmlFor).toBe(slide.querySelector('input')!.id)
    );
  });

  it('033: inactive video ended cannot satisfy the active owner wait', () => {
    vi.useFakeTimers();
    const fixture = createSliderFixture({ slidesCount: 3 });
    fixture.slides.forEach((slide) => {
      slide.innerHTML = auditMarkup.video;
    });
    const slider = new Tvist(fixture.root, {
      speed: 0,
      visibility: false,
      video: { autoplay: false },
      autoplay: { waitForVideo: true, pauseOnHover: true },
    });
    instances.push(slider);
    const videos = fixture.root.querySelectorAll('video');
    fixture.root.dispatchEvent(new MouseEvent('mouseenter'));
    videos[1]!.dispatchEvent(new Event('ended'));
    fixture.root.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(100);
    expect(slider.realIndex).toBe(0);
    const read = vi.fn();
    slider.on('videoEnded', read);
    videos[0]!.dispatchEvent(new Event('ended'));
    expect(slider.realIndex).toBe(1);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
