import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import type { TvistOptions } from '../../src/core/types';
import { activeIdentityErrors } from './dom-oracles';
export type AuditWindow = Window & {
  TvistV1: typeof Tvist;
  auditSlider: Tvist;
  auditOriginals?: HTMLElement[];
  auditSettle?: { transform: string; stable: number };
};
export interface Fixture {
  count?: number;
  width?: number;
  height?: number;
  widths?: number[];
  contents?: string[];
}
export async function mount(
  page: Page,
  options: TvistOptions = {},
  fixture: Fixture = {}
): Promise<void> {
  await page.evaluate(
    ({ optionsJson, fixture }) => {
      const w = window as unknown as AuditWindow;
      const options = JSON.parse(optionsJson) as TvistOptions;
      w.auditSlider?.destroy({ destroyNested: true });
      const { count = 7, width = 720, height = 360, widths, contents } = fixture;
      document.body.innerHTML = `<div id="audit-slider" class="tvist-v1" style="width:${width}px;height:${height}px"><div class="tvist-v1__track" style="height:${height}px"><div class="tvist-v1__container">${Array.from({ length: count }, (_, i) => `<div class="tvist-v1__slide" data-case-id="card-${i}" style="height:${height}px;${widths ? `width:${widths[i % widths.length]}px` : ''}">${contents?.[i] ?? `card-${i}`}</div>`).join('')}</div></div></div>`;
      w.auditOriginals = Array.from(
        document.querySelectorAll<HTMLElement>('#audit-slider .tvist-v1__slide')
      );
      w.auditSlider = new w.TvistV1('#audit-slider', { speed: 0, visibility: false, ...options });
    },
    { optionsJson: JSON.stringify(options), fixture }
  );
  await settle(page);
}
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as unknown as AuditWindow).auditSettle;
  });
  await page.waitForFunction(
    () => {
      const w = window as unknown as AuditWindow;
      const s = w.auditSlider;
      if (!s || s.marquee?.isRunning()) return true;
      const transform = getComputedStyle(s.container).transform;
      const stable = w.auditSettle?.transform === transform ? w.auditSettle.stable + 1 : 0;
      w.auditSettle = { transform, stable };
      return (
        stable >= 3 &&
        !s.container.style.transition &&
        s.container.getAnimations().every((a) => a.playState !== 'running')
      );
    },
    undefined,
    { timeout: 7000 }
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}
export async function snapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as unknown as AuditWindow).auditSlider;
    const rect = (e: Element) => {
      const r = e.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const originals = (window as unknown as AuditWindow).auditOriginals
      ?.filter((e) => e.isConnected && getComputedStyle(e).display !== 'none')
      .map((e) => e.dataset.caseId);
    return {
      realIndex: s.realIndex,
      activeIndex: s.activeIndex,
      count: s.originalSlideCount,
      originals,
      track: rect(s.track),
      slides: s.slides.map((e) => ({
        ...rect(e),
        id: e.dataset.caseId,
        index: e.getAttribute('data-tvist-slide-index'),
        active: e.classList.contains('tvist-v1__slide--active'),
      })),
      transform: getComputedStyle(s.container).transform,
    };
  });
}
export async function check(page: Page): Promise<void> {
  const s = await snapshot(page);
  expect(Number.isFinite(s.realIndex), 'finite-index').toBe(true);
  expect(s.transform, 'finite-transform').not.toMatch(/NaN|Infinity/);
  expect(
    s.slides.every((r) => [r.left, r.top, r.width, r.height].every(Number.isFinite)),
    'finite-rects'
  ).toBe(true);
  if (s.count) {
    expect(s.realIndex, 'index-lower-bound').toBeGreaterThanOrEqual(0);
    expect(s.realIndex, 'index-upper-bound').toBeLessThan(s.count);
    expect(
      s.slides.some((r, i) => r.active && (r.index === null ? i : Number(r.index)) === s.realIndex),
      'active-identity'
    ).toBe(true);
    if (s.slides.every((r) => r.id !== undefined)) {
      expect(
        activeIdentityErrors(
          s.slides.map((r) => ({
            rect: r,
            originalId: r.id!,
            realIndex: Number(r.index),
            active: r.active,
          })),
          s.realIndex,
          s.originals?.[s.realIndex] ?? `card-${s.realIndex}`
        ),
        'active-original-identity'
      ).toEqual([]);
    }
  }
}
