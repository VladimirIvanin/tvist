import { expect, test } from '@playwright/test';

test('единый справочник показывает API, типы и примеры без раскрытия', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('api/index.html');
  await expect(page.getByRole('heading', { name: 'Справочник API', exact: true })).toBeVisible();
  const options = page.locator('#options > .api-table-scroll > table > tbody > tr');
  await expect(options).toHaveCount(53);
  const names = await options.locator(':scope > th > a > code').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  await expect(page.locator('#option-arrows .api-type')).toContainText('boolean | {');
  await expect(page.locator('#option-breakpoints .api-type')).toContainText(
    'Partial<TvistOptions>'
  );
  await expect(page.locator('#option-autoplay-delay .api-default')).toHaveText('3000');
  await expect(page.locator('#method-scrollTo th')).toContainText('instant?: boolean');
  await expect(page.locator('#method-scrollTo pre')).toBeVisible();
  await expect(page.locator('#property-activeIndex .api-readonly')).toHaveText('Только чтение');
  await expect(page.locator('#event-lazyLoaded .api-type')).toContainText('HTMLImageElement');
  await expect(page.locator('#module-autoplay')).toContainText('autoplay.pause()');
  await expect(page.locator('#module-marquee')).toContainText('marquee.resume()');
  await expect(page.locator('#static-CSS_PREFIX .api-deprecated')).toBeVisible();
  expect(
    await page.locator('[id]').evaluateAll((elements) => {
      const ids = elements.map((element) => element.id);
      return new Set(ids).size === ids.length;
    })
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('прямые якоря и старые API-ссылки ведут к нужной записи', async ({ page }) => {
  for (const [oldRoute, id] of [
    ['api/options.html#native-lazy-adjacent', 'option-nativeLazyAdjacent'],
    ['api/options.html#autoplay.delay', 'option-autoplay-delay'],
    ['api/methods.html#scrollto', 'method-scrollTo'],
    ['api/properties.html#tvistinstance', 'property-root-tvistInstance'],
    ['api/events.html#slideChangeEnd', 'event-slideChangeEnd'],
    ['api/events.html#navigationmounted', 'event-navigation-mounted'],
    ['api/static.html#registermodule', 'static-registerModule'],
  ]) {
    await page.goto(oldRoute!);
    await expect(page).toHaveURL(new RegExp(`api/index\\.html#${id}$`));
    await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
  }
  await page.goto('api/index.html#option-grid-gap-row');
  await expect(page.locator('#option-grid-gap-row')).toBeInViewport();
});

test('оглавление, тема и мобильные таблицы работают на ширине 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('api/index.html');
  const menu = page.getByRole('button', { name: 'Оглавление' });
  await expect(page.locator('#api-nav')).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#api-nav').getByRole('link', { name: 'Автопрокрутка', exact: true }).click();
  await expect(page).toHaveURL(/#module-autoplay$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#module-autoplay')).toBeInViewport();
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
  expect(
    await page
      .locator('#options > .api-table-scroll')
      .evaluate((element) => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  await page.goto('api/index.html');
  await menu.click();
  await page.locator('#api-nav a').first().focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});

test('конструктор сохраняет режимы стрелок и пагинации с новыми метаданными', async ({ page }) => {
  await page.goto('builder.html');
  await page.locator('.builder-group > summary', { hasText: 'Навигация' }).click();
  const arrows = page.locator('[data-path="arrows"]');
  const pagination = page.locator('[data-path="pagination"]');
  await expect(arrows).toBeVisible();
  await expect(pagination).toBeVisible();
  await arrows.selectOption('true');
  await pagination.selectOption('object');
  await page.locator('[data-path="pagination.type"]').selectOption('fraction');
  await expect(page.locator('#builder-code-output')).toContainText('"type": "fraction"');
  await expect(page.locator('#builder-status')).toHaveText('Работает в браузере');
});
