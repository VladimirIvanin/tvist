import { expect, type Page } from '@playwright/test';
import { mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

/** Browser confirmation of independently minimized happy-dom model failures. */
export const unitRegressionCases: AuditCase[] = [
  {
    id: 'UREG-001',
    title: 'Enabling loop on a finite slider wraps prev from the first original',
    family: 'unit-regression',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'UREG-002',
    title: 'Updating an existing fade retains the documented perPage normalization',
    family: 'unit-regression',
    priority: 'P0',
    sources: [],
  },
];
export async function runUnitRegressionCase(page: Page, id: string): Promise<void> {
  if (id === 'UREG-001') {
    await mount(page, { loop: false }, { count: 4 });
    expect(
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex),
      'UREG_INITIAL_FINITE_INDEX'
    ).toBe(0);
    await page.evaluate(() => {
      const s = (window as unknown as AuditWindow).auditSlider;
      s.updateOptions({ loop: true });
      s.prev();
    });
    await settle(page);
    expect(
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex),
      'UREG_ENABLED_LOOP_PREV_WRAPS'
    ).toBe(3);
  } else if (id === 'UREG-002') {
    await mount(page, { effect: 'fade', perPage: 3 }, { count: 5 });
    expect(
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.options.perPage),
      'UREG_FADE_INIT_NORMALIZATION_POSITIVE'
    ).toBe(1);
    await page.evaluate(() =>
      (window as unknown as AuditWindow).auditSlider.updateOptions({ effect: 'fade', perPage: 3 })
    );
    await settle(page);
    expect(
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.options.perPage),
      'UREG_FADE_UPDATE_NORMALIZATION'
    ).toBe(1);
  } else throw new Error('Unknown unit regression ' + id);
}
