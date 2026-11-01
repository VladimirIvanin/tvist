import { test, expect } from '@playwright/test'

for (const width of [1000, 375]) {
  test(`свайп истории плавно доводится после отпускания при ширине ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('preview.html?id=stories')
    await expect(page.locator('.stories-status')).toHaveText('Маша · история 1 из 3')
    await page.locator('.demo-motion-toggle').click()

    const card = page.locator('.stories-inner').first()
    const container = card.locator('.tvist-v1__container')
    const box = (await card.boundingBox())!
    const x = box.x + box.width * .8
    const y = box.y + box.height / 2
    const position = () => container.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)

    // Короткий drag возвращается к текущей истории, длинный — завершает переход.
    for (const [distance, target] of [[.15, 0], [.55, -box.width]]) {
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x - 10, y)
      await page.mouse.move(x - box.width * distance, y, { steps: 8 })
      // Обнуляем скорость: выбор истории зависит только от расстояния жеста.
      await page.waitForTimeout(250)
      const before = await position()
      expect(Math.abs(before - target)).toBeGreaterThan(box.width * .1)
      await page.mouse.up()
      const after = await position()
      expect(Math.abs(after - before)).toBeLessThan(box.width * .1)
      await expect.poll(position).toBeCloseTo(target, 0)
    }

    await expect(page.locator('.stories-status')).toHaveText('Маша · история 2 из 3')
    await expect(page.locator('[data-story-group="0"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.demo-motion-toggle')).toHaveText('Воспроизвести')
  })
}

test('истории переключаются тапом, а удержание по краю ставит прогресс на паузу', async ({ page }) => {
  await page.clock.install()
  await page.goto('preview.html?id=stories')
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 1 из 3')
  await expect(page.locator('.stories-inner-slide')).toHaveCount(8)

  const card = page.locator('.stories-inner').first()
  const box = (await card.boundingBox())!
  const x = box.x + box.width * .8
  const y = box.y + box.height / 2
  await page.mouse.click(x, y)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 2 из 3')
  await expect(card.locator('.stories-progress__fill').first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')

  await page.mouse.down()
  await page.clock.runFor(150)
  await expect(page.locator('.stories-shell')).toHaveClass(/hold-paused/)
  const activeFill = card.locator('.stories-progress__fill').nth(1)
  const heldProgress = await activeFill.getAttribute('style')
  await page.clock.runFor(1000)
  expect(await activeFill.getAttribute('style')).toBe(heldProgress)
  await page.mouse.up()
  await expect(page.locator('.stories-shell')).not.toHaveClass(/hold-paused/)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 2 из 3')
  await page.clock.runFor(300)
  expect(await activeFill.getAttribute('style')).not.toBe(heldProgress)

  // Постоянная пауза сохраняется после удержания и ручного перехода к другому автору.
  await page.locator('.demo-motion-toggle').click()
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.clock.runFor(150)
  await page.mouse.up()
  await expect(page.locator('.demo-motion-toggle')).toHaveText('Воспроизвести')
  await page.locator('[data-story-group="1"]').click()
  await expect(page.locator('.stories-status')).toHaveText('Саша · история 1 из 2')
  await page.clock.runFor(4000)
  await expect(page.locator('.stories-status')).toHaveText('Саша · история 1 из 2')
})

test('автопрокрутка ведёт через группы до конца, скрытые истории ждут, повтор начинается с первой', async ({ page }) => {
  await page.clock.install()
  await page.goto('preview.html?id=stories')
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 1 из 3')
  await page.clock.runFor(6000)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 3 из 3')
  for (const index of [1, 2]) {
    await expect(page.locator('.stories-inner').nth(index).locator('.tvist-v1__slide--active')).toHaveAttribute('data-tvist-slide-index', '0')
  }
  await page.clock.runFor(3000)
  await expect(page.locator('.stories-status')).toHaveText('Саша · история 1 из 2')
  await page.clock.runFor(18000)
  await expect(page.locator('.stories-status')).toHaveText('Все истории просмотрены. Можно начать сначала.')
  await expect(page.locator('[data-story-next]')).toBeDisabled()
  const lastGroupFills = page.locator('.stories-inner').last().locator('.stories-progress__fill')
  for (const fill of await lastGroupFills.all()) await expect(fill).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await page.clock.runFor(6000)
  await expect(page.locator('[data-story-group="2"]')).toHaveAttribute('aria-pressed', 'true')

  await page.locator('[data-stories-replay]').click()
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 1 из 3')
  await expect(page.locator('.demo-motion-toggle')).toBeEnabled()
  await page.clock.runFor(3000)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 2 из 3')
  await page.clock.runFor(6000)
  await expect(page.locator('.stories-status')).toHaveText('Саша · история 1 из 2')
})

test('мобильный вид включает куб и копирует полную реализацию историй', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('examples/stories.html')
  await expect(page.locator('.demo-count')).toHaveText('3 группы · 8 историй')
  const frame = page.frameLocator('.demo-frame')
  await frame.locator('.demo-motion-toggle').click()
  await expect(frame.locator('.stories-groups')).not.toHaveClass(/--cube/)
  await page.locator('[data-demo-mobile]').click()
  await expect(page.locator('.demo-frame')).toHaveCSS('width', '375px')
  await expect(frame.locator('.stories-groups')).toHaveClass(/--cube/)
  await frame.locator('[data-story-group="1"]').click()
  await expect(frame.locator('.stories-status')).toHaveText('Саша · история 1 из 2')
  // Поворот может быть распределён между контейнером и гранями куба.
  // Активная группа смотрит вперёд, соседние повернуты на четверть оборота.
  await expect.poll(() => frame.locator('.stories-group-slide').evaluateAll(slides => slides.map(slide => {
    const faceAngle = Number((slide as HTMLElement).style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1])
    const containerAngle = Number(slide.parentElement?.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1])
    return Math.round(((((faceAngle + containerAngle + 180) % 360) + 360) % 360) - 180)
  }))).toEqual([-90, 0, 90])
  const overflow = await frame.locator('html').evaluate(root => root.scrollWidth - root.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const clipped = await frame.locator('.stories-demo').evaluate(root => root.getBoundingClientRect().bottom > window.innerHeight)
  expect(clipped).toBe(false)
  await page.locator('[data-demo-mobile]').click()
  await expect(frame.locator('.stories-groups')).not.toHaveClass(/--cube/)
  await expect(frame.locator('.stories-status')).toHaveText('Саша · история 1 из 2')

  await page.locator('[data-code-tab="js"]').click()
  await expect(page.locator('[data-code-output]')).toContainText('holdToPause')
  await expect(page.locator('[data-code-output]')).toContainText('activateGroup')
  await page.locator('[data-demo-copy-all]').click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('stories-progress__fill')
  expect(copied).toContain("effect: 'cube'")
  expect(copied).toContain('function finishGroup')
})

test('при уменьшении движения истории ждут запуска пользователя', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install()
  await page.goto('preview.html?id=stories')
  await expect(page.locator('.demo-motion-toggle')).toHaveText('Воспроизвести')
  await page.clock.runFor(6000)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 1 из 3')
  await page.locator('.demo-motion-toggle').click()
  await page.clock.runFor(3000)
  await expect(page.locator('.stories-status')).toHaveText('Маша · история 2 из 3')
})
