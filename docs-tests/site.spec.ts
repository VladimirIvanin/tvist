import { test, expect } from '@playwright/test'
import demos from '../docs/site/demos.json' with { type: 'json' }

test('старые адреса и все страницы примеров открываются напрямую', async ({ page }) => {
  for (const route of ['examples-list.html', 'guide/getting-started.html', 'api/options.html', ...demos.map((demo) => `examples/${demo.id}.html`)]) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    await expect(page.locator('h1').first()).toBeVisible()
  }
})

test('главный слайдер живой, тема переключается', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('.hero-slider .tvist-v1__slide')).toHaveCount(3)
  await page.locator('[data-hero-next]').click()
  await expect(page.locator('.hero-demo-top span').first()).toHaveText('02 / 03')
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('каталог фильтруется, пример показывает и копирует исполняемый код', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('examples-list.html')
  await page.locator('#example-search').fill('loop')
  await expect(page.locator('.catalog-card:visible')).toHaveCount(1)
  await page.locator('.catalog-card:visible').click()
  await expect(page.frameLocator('.demo-frame').first().locator('.tvist-v1__slide')).toHaveCount(6)
  await page.locator('[data-code-tab="js"]').first().click()
  await expect(page.locator('[data-code-output]').first()).toContainText('new TvistV1')
  await page.locator('[data-copy-code]').first().click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('new TvistV1')
  await page.locator('[data-demo-copy-all]').first().click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('browser-build/tvist.min.js')
})

test('варианты на страницах сохраняют отдельные живые демонстрации', async ({ page }) => {
  await page.goto('examples/peek.html')
  await expect(page.locator('.demo-card')).toHaveCount(8)
  await page.goto('examples/pagination.html')
  await expect(page.locator('.demo-card')).toHaveCount(7)
})

test('автоматическое движение можно остановить в примерах', async ({ page }) => {
  for (const id of ['autoplay', 'marquee']) {
    await page.goto(`preview.html?id=${id}`)
    const pause = page.locator('.demo-motion-toggle')
    await expect(pause).toBeVisible()
    await pause.click()
    await expect(pause).toHaveText('Воспроизвести')
  }
})

test('вложенный слайдер и модуль ленивой загрузки работают в примерах', async ({ page }) => {
  await page.goto('preview.html?id=nested-sliders')
  await expect(page.locator('.parent-slider > .tvist-v1__track .child-slider')).toHaveCount(1)
  await expect(page.locator('.child-slider .tvist-v1__slide')).toHaveCount(3)

  await page.goto('preview.html?id=lazyload')
  await expect(page.locator('.tvist-v1__slide img').first()).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect(page.locator('.tvist-v1__slide img').first()).not.toHaveAttribute('data-src')
})

test('конструктор выдаёт код пресета и полную CDN-страницу', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('builder.html')
  await page.locator('[data-preset="thumbs"]').click()
  await expect(page.locator('#builder-stage .tvist-v1')).toHaveCount(2)
  await page.locator('[data-builder-tab="js"]').click()
  await expect(page.locator('#builder-code-output')).toContainText('slider.sync(thumbs)')
  await page.locator('[data-builder-copy-all]').click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('browser-build/tvist.min.js')
  expect(copied).toContain('slider.sync(thumbs)')
  expect(copied).toContain('class="tvist-v1 main-slider"')
})

test('ручная настройка и брейкпоинт обновляют предпросмотр и код', async ({ page }) => {
  await page.goto('builder.html')
  await page.locator('[data-path="perPage"]').fill('2')
  await page.locator('[data-path="perPage"]').blur()
  await expect(page.locator('#builder-code-output')).toContainText('"perPage": 2')
  const widths = await page.evaluate(() => ({
    stage: document.querySelector('#builder-stage')!.getBoundingClientRect().width,
    slide: document.querySelector('#builder-stage .tvist-v1__slide')!.getBoundingClientRect().width,
  }))
  expect(widths.slide).toBeLessThan(widths.stage * 0.65)
  await page.locator('.builder-group > summary', { hasText: 'Адаптивность и другое' }).click()
  await page.locator('[data-add-breakpoint]').click()
  await expect(page.locator('#builder-code-output')).toContainText('"768"')
  await page.locator('[data-breakpoint-perpage]').fill('3')
  await page.locator('[data-breakpoint-perpage]').blur()
  await expect(page.locator('#builder-code-output')).toContainText('"perPage": 3')
  await page.locator('#builder-template').selectOption('events')
  await expect(page.locator('#builder-code-output')).toContainText('"on"')
  await expect(page.locator('#builder-code-output')).toContainText('slideChangeEnd')
  await page.locator('#builder-template').selectOption('renderBullet')
  await expect(page.locator('#builder-code-output')).toContainText('renderBullet')
})

test('все пресеты создают работающий предпросмотр и свой код', async ({ page }) => {
  await page.goto('builder.html')
  for (const preset of ['basic', 'cards', 'peek', 'loop', 'vertical', 'thumbs', 'stories']) {
    await page.locator(`[data-preset="${preset}"]`).click()
    await expect(page.locator('#builder-status')).toHaveText('Работает в браузере')
    await expect(page.locator('#builder-stage .tvist-v1__slide').first()).toBeVisible()
    await page.locator('[data-builder-tab="js"]').click()
    await expect(page.locator('#builder-code-output')).toContainText('new TvistV1')
  }
  await page.locator('[data-preset="cards"]').click()
  await expect(page.locator('#builder-stage .product-card')).toHaveCount(6)
  await page.locator('[data-preset="stories"]').click()
  await expect(page.locator('#builder-stage .story-card')).toHaveCount(6)
})

test('мобильное меню доступно без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  const menu = page.locator('.menu-toggle')
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('navigation', { name: 'Главное меню' }).getByText('Конструктор')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
