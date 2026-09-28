import { expect, test, type Frame, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { standalonePage } from '../docs/site/standalone'
import type { Tvist } from '../src/core/Tvist'
import type { TvistOptions } from '../src/core/types'

const bundlePath = (file: string): string => resolve(process.cwd(), 'browser-build', file)

async function isolatedFrame(page: Page, stylesheet = 'tvist.core.css'): Promise<Frame> {
  // Изолируем глобаль UMD внутри существующей страницы E2E.
  await page.goto('/')
  await page.evaluate(() => {
    const iframe = document.createElement('iframe')
    iframe.name = 'browser-bundle-test'
    iframe.style.width = '720px'
    iframe.style.height = '360px'
    document.body.appendChild(iframe)
  })
  const frame = page.frame({ name: 'browser-bundle-test' })
  if (!frame) throw new Error('Browser bundle test frame was not created')
  await frame.addStyleTag({ path: bundlePath(stylesheet) })
  return frame
}

async function createSlider(frame: Frame, options: TvistOptions = {}) {
  return frame.evaluate((sliderOptions) => {
    document.body.innerHTML = `
      <div id="browser-slider" class="tvist-v1" style="width:600px">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide" style="height:200px">1</div>
            <div class="tvist-v1__slide" style="height:200px">2</div>
            <div class="tvist-v1__slide" style="height:200px">3</div>
          </div>
        </div>
        <button class="tvist-v1__arrow tvist-v1__arrow--prev" type="button"></button>
        <button class="tvist-v1__arrow tvist-v1__arrow--next" type="button"></button>
        <div class="tvist-v1__pagination"></div>
      </div>`
    const BrowserTvist = (window as typeof window & { TvistV1: typeof Tvist }).TvistV1
    const slider = new BrowserTvist('#browser-slider', sliderOptions)
    return {
      registered: BrowserTvist.getRegisteredModules().sort(),
      drag: Boolean(slider.getModule('drag')),
      breakpoints: Boolean(slider.getModule('breakpoints')),
      pagination: Boolean(slider.getModule('pagination')),
      navigation: Boolean(slider.getModule('navigation')),
      effect: Boolean(slider.getModule('effect')),
      autoplay: Boolean(slider.autoplay),
      loop: Boolean(slider.getModule('loop')),
      visibility: Boolean(slider.getModule('visibility')),
      slides: slider.slides.length,
      bullets: document.querySelectorAll('.tvist-v1__bullet').length,
      activeSlides: document.querySelectorAll('.tvist-v1__slide--active').length,
    }
  }, options)
}

const coreModules = [
  'autoplay', 'breakpoints', 'drag', 'loop', 'navigation', 'pagination',
  'slide-states', 'visibility',
]
const extraModules = [
  'effect', 'grid', 'lazyload', 'marquee', 'scroll-control', 'scrollbar', 'thumbs', 'video',
]
const allModules = [...coreModules, ...extraModules].sort()
const splitFiles = ['tvist.core.css', 'tvist.core.min.js', 'tvist.modules.css', 'tvist.modules.min.js']
const buildFiles = [...splitFiles, 'tvist.min.js', 'tvist.css'].sort()

test('browser build contains split and full JS/CSS pairs with separate module styles', () => {
  expect(readdirSync(bundlePath('')).sort()).toEqual(buildFiles)
  const coreCss = readFileSync(bundlePath('tvist.core.css'), 'utf8')
  const modulesCss = readFileSync(bundlePath('tvist.modules.css'), 'utf8')
  const fullCss = readFileSync(bundlePath('tvist.css'), 'utf8')
  expect(coreCss).toContain(':root{')
  expect(coreCss).toContain('.tvist-v1__arrow{')
  expect(coreCss).toContain('.tvist-v1__pagination{')
  expect(coreCss).not.toContain('.tvist-v1--cube')
  expect(coreCss).not.toContain('.tvist-v1__scrollbar')
  expect(fullCss).toContain(':root{')
  expect(fullCss.match(/:root\{/g)).toHaveLength(1)
  expect(fullCss).toContain('.tvist-v1{')
  expect(fullCss).toContain('.tvist-v1__arrow{')
  expect(fullCss).toContain('.tvist-v1__pagination{')
  expect(modulesCss).not.toContain(':root')
  expect(modulesCss).not.toContain('*{')
  expect(modulesCss).not.toContain('.tvist-v1{')
  expect(modulesCss).not.toContain('.tvist-v1__arrow{')
  expect(modulesCss).not.toContain('.tvist-v1__pagination{')
  for (const selector of ['.tvist-v1--cube', '.tvist-v1--nav', '.tvist-v1__grid-col', '.tvist-v1__scrollbar', '.tvist-v1__spinner']) {
    expect(modulesCss).toContain(selector)
    expect(fullCss).toContain(selector)
  }
  for (const file of ['tvist.core.min.js', 'tvist.modules.min.js', 'tvist.min.js']) {
    expect(readFileSync(bundlePath(file), 'utf8')).toMatch(/^\/\*! Tvist v/)
  }
})

test('full browser pair includes all modules, navigation and Cube/Scrollbar styles', async ({ page }) => {
  const frame = await isolatedFrame(page, 'tvist.css')
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') })
  const result = await createSlider(frame, {
    effect: 'cube', arrows: true, pagination: true, scrollbar: true, speed: 0,
  })
  expect(result.registered).toEqual(allModules)
  expect(result).toMatchObject({ navigation: true, pagination: true, effect: true, visibility: true, bullets: 3 })
  await expect(frame.locator('#browser-slider')).toHaveClass(/tvist-v1--cube/)
  await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute')
  await expect(frame.locator('.tvist-v1__scrollbar')).toHaveCSS('position', 'absolute')
  await expect(frame.locator('.tvist-v1__scrollbar-thumb')).toHaveCSS('cursor', 'grab')
  await frame.locator('.tvist-v1__arrow--next').click()
  await expect(frame.locator('.tvist-v1__bullet--active')).toHaveAttribute('data-index', '1')
})

test('core covers navigation, pagination, loop, autoplay and visibility', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
  const result = await createSlider(frame, {
    arrows: true, pagination: true, loop: true, speed: 0,
    autoplay: { delay: 100, pauseOnHover: false },
  })
  expect(result.registered).toEqual(coreModules)
  expect(result).toMatchObject({ navigation: true, pagination: true, autoplay: true, loop: true, visibility: true, bullets: 3, activeSlides: 1, effect: false })
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    return slider.realIndex !== 0
  })
  await frame.locator('#browser-slider').evaluate(root => { root.style.display = 'none' })
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    return !slider._isVisible && slider.autoplay!.isPaused()
  })
  await frame.locator('#browser-slider').evaluate(root => { root.style.display = '' })
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    return slider._isVisible && !slider.autoplay!.isPaused()
  })
  expect(await frame.evaluate(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    slider.updateOptions({ autoplay: false })
    return Boolean(slider.autoplay)
  })).toBe(false)
  expect(await frame.evaluate(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    slider.updateOptions({ autoplay: { delay: 5000 } })
    return Boolean(slider.autoplay)
  })).toBe(true)
})

test('core updates options when the browser crosses a breakpoint', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
  await createSlider(frame, { perPage: 2, pagination: false, breakpoints: { 400: { perPage: 1, pagination: true } } })
  await page.locator('iframe[name="browser-bundle-test"]').evaluate(iframe => { iframe.style.width = '350px' })
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    return slider.options.perPage === 1 && Boolean(slider.getModule('pagination'))
  })
  await page.locator('iframe[name="browser-bundle-test"]').evaluate(iframe => { iframe.style.width = '720px' })
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!.tvistInstance!
    return slider.options.perPage === 2 && !slider.getModule('pagination')
  })
})

for (const modulesFirst of [false, true]) {
  test(`module pack registers once ${modulesFirst ? 'before' : 'after'} core without replacing its constructor`, async ({ page }) => {
    const frame = await isolatedFrame(page)
    await frame.addStyleTag({ path: bundlePath('tvist.modules.css') })
    if (modulesFirst) {
      await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })
      await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })
      expect(await frame.evaluate(() => {
        const browser = window as unknown as { TvistV1?: unknown; __tvistV1Queue: unknown[] }
        return { constructor: typeof browser.TvistV1, queued: browser.__tvistV1Queue.length }
      })).toEqual({ constructor: 'undefined', queued: 8 })
    }
    await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
    await frame.evaluate(() => {
      const browser = window as unknown as Record<string, unknown>
      browser.originalTvist = browser.TvistV1
    })
    await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })
    await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })
    const result = await createSlider(frame, { pagination: true, effect: 'fade' })
    expect(result.registered).toEqual(allModules)
    expect(result).toMatchObject({ drag: true, pagination: true, effect: true, bullets: 3, activeSlides: 1 })
    expect(await frame.evaluate(() => {
      const browser = window as unknown as Record<string, unknown>
      return browser.TvistV1 === browser.originalTvist
    })).toBe(true)
  })
}

for (const scenario of ['cube', 'grid', 'scrollbar'] as const) {
  test(`module pack provides ${scenario} behavior and its separate CSS`, async ({ page }) => {
    const frame = await isolatedFrame(page)
    await frame.addStyleTag({ path: bundlePath('tvist.modules.css') })
    await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
    await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })
    await createSlider(frame, scenario === 'cube' ? { effect: 'cube' } : scenario === 'grid' ? { grid: { rows: 2, cols: 1 } } : { scrollbar: true })
    if (scenario === 'cube') {
      await expect(frame.locator('#browser-slider')).toHaveClass(/tvist-v1--cube/)
      await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute')
      await expect(frame.locator('.tvist-v1__track')).toHaveCSS('overflow', 'visible')
    } else if (scenario === 'grid') {
      await expect(frame.locator('.tvist-v1__slide--grid-page')).toHaveCount(2)
      await expect(frame.locator('.tvist-v1__grid-col').first()).toHaveCSS('overflow', 'hidden')
    } else {
      await expect(frame.locator('.tvist-v1__scrollbar')).toHaveCSS('position', 'absolute')
      await expect(frame.locator('.tvist-v1__scrollbar-thumb')).toHaveCSS('cursor', 'grab')
    }
  })
}

for (const failedFile of [null, 'tvist.core.css', 'tvist.core.min.js', 'tvist.modules.min.js']) {
  test(`standalone export loads all assets and starts once (${failedFile ?? 'tagged version'})`, async ({ page }) => {
    const requests: string[] = []
    await page.route('https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@**/browser-build/*', async route => {
      const url = route.request().url()
      requests.push(url)
      const file = url.slice(url.lastIndexOf('/') + 1)
      if (failedFile && !url.includes('@main/') && file === failedFile) {
        await route.abort()
      } else {
        await route.fulfill({ body: readFileSync(bundlePath(file)), contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' })
      }
    })
    const frame = await isolatedFrame(page)
    await frame.setContent(standalonePage({
      html: '<div class="tvist-v1" id="export-slider"><div class="tvist-v1__track"><div class="tvist-v1__container"><div class="tvist-v1__slide">1</div><div class="tvist-v1__slide">2</div></div></div></div>',
      css: '.tvist-v1 { width: 600px; } .tvist-v1__slide { height: 200px; }',
      js: "window.exampleStarts = (window.exampleStarts || 0) + 1; new TvistV1('#export-slider', { effect: 'cube' });",
    }))
    await expect(frame.locator('#export-slider')).toHaveClass(/tvist-v1--created/)
    const result = await frame.evaluate(() => {
      const browser = window as unknown as { exampleStarts: number; TvistV1: typeof Tvist }
      return {
        starts: browser.exampleStarts,
        modules: browser.TvistV1.getRegisteredModules().sort(),
        assets: Array.from(document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>('link, script[src]')).map(el => el instanceof HTMLLinkElement ? el.href : el.src),
      }
    })
    expect(result.starts).toBe(1)
    expect(result.modules).toEqual(allModules)
    expect(result.assets.map(url => url.slice(url.lastIndexOf('/') + 1)).sort()).toEqual(splitFiles)
    expect(result.assets.every(url => failedFile ? url.includes('@main/') : !url.includes('@main/'))).toBe(true)
    await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute')
    if (failedFile) expect(requests.filter(url => url.includes('@main/'))).toHaveLength(4)
  })
}

for (const direction of ['prev', 'next'] as const) {
  test(`core browser bundle keeps loop moving during rapid ${direction} clicks`, async ({ page }) => {
    const frame = await isolatedFrame(page)
    await page.locator('iframe[name="browser-bundle-test"]').evaluate(iframe => {
      iframe.style.width = '720px'
      iframe.style.height = '320px'
    })
    await page.locator('iframe[name="browser-bundle-test"]').scrollIntoViewIfNeeded()
    await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
    await createSlider(frame, {
      perPage: 1,
      loop: true,
      speed: 1200,
      autoplay: { delay: 2600, pauseOnHover: true },
      arrows: true,
      pagination: true,
    })
    await frame.locator('#browser-slider').scrollIntoViewIfNeeded()
    await frame.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    }))
    await frame.waitForFunction(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')
      return root?.tvistInstance?._isVisible
    })

    const arrow = frame.locator(`.tvist-v1__arrow--${direction}`)
    await arrow.click()
    await page.waitForTimeout(60)
    await arrow.locator('svg').hover()
    await page.mouse.down()
    const pressed = await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!
      const slider = root.tvistInstance!
      return {
        animating: slider.engine.animator.isAnimating(),
        position: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
      }
    })
    await page.waitForTimeout(200)
    const held = await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!
      const slider = root.tvistInstance!
      return {
        animating: slider.engine.animator.isAnimating(),
        position: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
      }
    })
    await page.mouse.up()
    expect(pressed.animating).toBe(true)
    expect(held.animating).toBe(true)
    expect(Math.abs(held.position - pressed.position)).toBeGreaterThan(1)
    await frame.waitForFunction(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!
      return !root.tvistInstance!.engine.animator.isAnimating()
    })
    await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!
      root.tvistInstance!.updateOptions({ speed: 300 })
    })

    const result = await frame.evaluate(async (direction) => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>('#browser-slider')!
      const slider = root.tvistInstance!
      root.dispatchEvent(new MouseEvent('mouseenter'))
      const button = root.querySelector<HTMLButtonElement>(`.tvist-v1__arrow--${direction}`)!
      let completed = 0
      let uncovered = 0
      slider.on('transitionEnd', () => { completed += 1 })

      for (let i = 0; i < 60; i += 1) {
        button.click()
        const track = slider.track.getBoundingClientRect()
        const bounds = slider.slides.map(slide => slide.getBoundingClientRect())
        if (
          Math.min(...bounds.map(rect => rect.left)) > track.left + 1 ||
          Math.max(...bounds.map(rect => rect.right)) < track.right - 1
        ) uncovered += 1
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      const completedDuringClicks = completed
      await new Promise(resolve => setTimeout(resolve, 400))
      return {
        completedDuringClicks,
        uncovered,
        settled: !slider.engine.animator.isAnimating(),
        rendered: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
        target: slider.engine.target.get(),
      }
    }, direction)

    expect(result.completedDuringClicks, JSON.stringify(result)).toBeGreaterThan(0)
    expect(result.uncovered).toBe(0)
    expect(result.settled).toBe(true)
    expect(result.rendered).toBeCloseTo(result.target, 0)
  })
}
