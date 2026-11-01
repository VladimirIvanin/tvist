import { expect, type CDPSession, type Page } from '@playwright/test';
import { mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

export const nativeInputCases: AuditCase[] = [
  {
    id: 'NINPUT-001',
    title: 'Chromium browser touch dispatch moves one horizontal slide without scrolling the page',
    family: 'native-input',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'NINPUT-002',
    title:
      'Chromium native vertical page pan releases the slider before a subsequent horizontal touch',
    family: 'native-input',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'NINPUT-003',
    title: 'Browser wheel release at the finite end matches unobstructed document scrolling',
    family: 'native-input',
    priority: 'P0',
    sources: [],
  },
];
type NativeWindow = AuditWindow & {
  nativeInputEvents: { type: string; pointerType: string; trusted: boolean }[];
  auditCampaignMetrics?: unknown;
};
async function fixture(page: Page, scrollControl = false) {
  await mount(
    page,
    { speed: 80, flickMaxPages: 1, wheel: scrollControl ? { releaseOnEdges: true } : false },
    { count: 5, width: 320, height: 240 }
  );
  await page.evaluate(() => {
    document.body.style.cssText = 'height:5000px;margin:0';
    const w = window as unknown as NativeWindow;
    const style = document.createElement('style');
    style.textContent = '#audit-slider .tvist-v1__slide{height:240px;background:#ddd}';
    document.head.append(style);
    w.auditSlider.root.style.cssText = 'width:320px;height:240px;position:fixed;top:60px;left:16px';
    w.nativeInputEvents = [];
    for (const type of ['pointerdown', 'pointerup', 'pointercancel'])
      document.addEventListener(
        type,
        (event) => {
          const pointer = event as PointerEvent;
          w.nativeInputEvents.push({
            type,
            pointerType: pointer.pointerType,
            trusted: pointer.isTrusted,
          });
        },
        { capture: true }
      );
    window.scrollTo(0, 0);
    w.auditSlider.update();
  });
  await settle(page);
  const box = await page.locator('#audit-slider > .tvist-v1__track').boundingBox();
  if (!box || box.width < 300 || box.height < 200)
    throw new Error('AUDIT_FIXTURE_ERROR: native-input track dimensions');
  return box;
}
async function swipe(
  page: Page,
  cdp: CDPSession,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, ...from }],
  });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          id: 1,
          x: from.x + ((to.x - from.x) * step) / 12,
          y: from.y + ((to.y - from.y) * step) / 12,
        },
      ],
    });
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function stoppedScroll(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        let previous = scrollY;
        let stable = 0;
        let frames = 0;
        const tick = () => {
          stable = scrollY === previous ? stable + 1 : 0;
          previous = scrollY;
          if (stable >= 5 || ++frames > 120) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
  return page.evaluate(() => scrollY);
}
export async function runNativeInputCase(page: Page, id: string): Promise<void> {
  if (id === 'NINPUT-003') {
    const observed: number[] = [];
    for (const enabled of [false, true]) {
      const box = await fixture(page, enabled);
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.scrollTo(4, true);
        window.scrollTo(0, 0);
      });
      await settle(page);
      await page.mouse.move(box.x + 180, box.y + 120);
      for (let event = 0; event < 5; event++) await page.mouse.wheel(0, 180);
      observed.push(await stoppedScroll(page));
    }
    await page.evaluate((observed) => {
      (window as unknown as NativeWindow).auditCampaignMetrics = {
        input: 'browser mouse.wheel',
        unobstructed: observed[0],
        releaseOnEdges: observed[1],
      };
    }, observed);
    expect(observed[0], 'NINPUT_WHEEL_POSITIVE_SCROLL_CONTROL').toBeGreaterThan(300);
    expect(
      Math.abs(observed[1]! - observed[0]!),
      'NINPUT_NATIVE_RELEASE_ON_EDGES'
    ).toBeLessThanOrEqual(2);
    return;
  }
  if (page.context().browser()?.browserType().name() !== 'chromium')
    throw new Error(
      'UNSUPPORTED_INPUT: trusted touch swipe dispatch requires Chromium CDP; synthetic touch in other engines is covered separately.'
    );
  const cdp = await page.context().newCDPSession(page);
  try {
    const box = await fixture(page);
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    let panScroll = 0;
    if (id === 'NINPUT-002') {
      await swipe(
        page,
        cdp,
        { ...middle, y: box.y + box.height - 25 },
        { ...middle, y: box.y + 25 }
      );
      panScroll = await stoppedScroll(page);
      expect(panScroll, 'NINPUT_TOUCH_PAN_Y_RELEASES_DOCUMENT').toBeGreaterThan(30);
      expect(
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex),
        'NINPUT_VERTICAL_PAN_PRESERVES_SLIDE'
      ).toBe(0);
    }
    const scrollBefore = await page.evaluate(() => scrollY);
    await swipe(
      page,
      cdp,
      { x: box.x + box.width * 0.85, y: middle.y },
      { x: box.x + box.width * 0.15, y: middle.y }
    );
    await settle(page);
    const scrollAfter = await stoppedScroll(page);
    const events = await page.evaluate(() => (window as unknown as NativeWindow).nativeInputEvents);
    await page.evaluate(
      (metrics) => {
        (window as unknown as NativeWindow).auditCampaignMetrics = metrics;
      },
      {
        input: 'Chromium CDP Input.dispatchTouchEvent',
        panScroll,
        scrollBefore,
        scrollAfter,
        events,
      }
    );
    expect(
      events.some(
        (event) => event.type === 'pointerdown' && event.pointerType === 'touch' && event.trusted
      ),
      'NINPUT_REAL_BROWSER_TOUCH_PRECONDITION'
    ).toBe(true);
    expect(
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex),
      'NINPUT_HORIZONTAL_TOUCH_NEXT'
    ).toBe(1);
    expect(
      Math.abs(scrollAfter - scrollBefore),
      'NINPUT_HORIZONTAL_TOUCH_NO_PAGE_DRIFT'
    ).toBeLessThanOrEqual(1);
  } finally {
    await cdp.detach();
  }
}
