import type { Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import type { TvistOptions } from '../../src/core/types';

export type RegressionWindow = Window & {
  TvistV1: typeof Tvist;
  regressionSlider: Tvist;
};

interface RegressionFixture {
  scale?: number;
  layout?: 'flex' | 'grid';
  dialog?: boolean;
  vertical?: boolean;
}

export async function mountRegressionSlider(
  page: Page,
  options: TvistOptions = {},
  fixture: RegressionFixture = {}
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ optionsJson, fixture }) => {
      const options = JSON.parse(optionsJson) as TvistOptions;
      document
        .querySelectorAll<HTMLElement & { tvistInstance?: Tvist }>('.tvist-v1')
        .forEach((root) => root.tvistInstance?.destroy());
      document.body.innerHTML = `<style>
      body { margin:0; padding:0; }
      #host { width:600px; transform:scale(${fixture.scale ?? 1}); transform-origin:top left; }
      #regression-slider { width:600px; }
      #regression-slider .tvist-v1__track { height:${fixture.vertical ? 360 : 120}px; }
      #regression-slider .tvist-v1__slide { height:120px; font-size:16px; }
      #regression-slider .tvist-v1__slide a { white-space:nowrap; }
      ${fixture.layout ? `#host{display:${fixture.layout};${fixture.layout === 'grid' ? 'grid-template-columns:200px 1fr;' : ''}}aside{width:200px;flex-shrink:0}#regression-slider{width:auto;flex:1}` : ''}
      .natural-width .tvist-v1__slide { width:180px; }
    </style>${fixture.dialog ? '<dialog id="modal">' : ''}<div id="host">
      ${fixture.layout ? '<aside>Sidebar</aside>' : ''}<div class="tvist-v1${options.autoWidth ? ' natural-width' : ''}" id="regression-slider">
      <div class="tvist-v1__track"><div class="tvist-v1__container">
      ${Array.from({ length: 7 }, (_, i) => `<div class="tvist-v1__slide" data-card="${i}"><a href="#card-${i}">${fixture.layout ? 'A long product title that must not widen its flex or grid column' : 'Card'} ${i}</a></div>`).join('')}
      </div></div></div></div>${fixture.dialog ? '</dialog>' : ''}`;
      const context = window as unknown as RegressionWindow;
      context.regressionSlider = new context.TvistV1('#regression-slider', {
        perPage: 3,
        speed: 0,
        ...options,
      });
    },
    { optionsJson: JSON.stringify(options), fixture }
  );
  // Deliver the initial ResizeObserver before testing gestures or navigation.
  await page.waitForTimeout(160);
}

export async function trackPosition(page: Page, vertical = false): Promise<number> {
  return page.locator('#regression-slider .tvist-v1__container').evaluate((el, vertical) => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return vertical ? matrix.m42 : matrix.m41;
  }, vertical);
}
