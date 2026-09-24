import { expect, test, type Frame, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import type { Tvist } from '../src/core/Tvist'
import type { TvistOptions } from '../src/core/types'

const bundlePath = (file: string): string => resolve(process.cwd(), 'browser-build', file)

async function isolatedFrame(page: Page): Promise<Frame> {
  // Изолируем глобаль UMD внутри существующей страницы E2E.
  await page.goto('/')
  await page.evaluate(() => {
    const iframe = document.createElement('iframe')
    iframe.name = 'browser-bundle-test'
    document.body.appendChild(iframe)
  })
  const frame = page.frame({ name: 'browser-bundle-test' })
  if (!frame) throw new Error('Browser bundle test frame was not created')
  await frame.addStyleTag({ path: bundlePath('tvist.css') })
  return frame
}

async function createSlider(frame: Frame, options: TvistOptions = {}) {
  return frame.evaluate((sliderOptions) => {
    document.body.innerHTML = `
      <div id="browser-slider" class="tvist-v1" style="width:600px">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide">1</div>
            <div class="tvist-v1__slide">2</div>
            <div class="tvist-v1__slide">3</div>
          </div>
        </div>
        <button class="tvist-v1__arrow--prev" type="button"></button>
        <button class="tvist-v1__arrow--next" type="button"></button>
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
      slides: slider.slides.length,
      bullets: document.querySelectorAll('.tvist-v1__bullet').length,
      activeSlides: document.querySelectorAll('.tvist-v1__slide--active').length,
    }
  }, options)
}

test('full browser bundle includes every built-in module', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') })

  const result = await createSlider(frame, { pagination: true, effect: 'fade' })
  expect(result.registered).toEqual([
    'autoplay', 'breakpoints', 'drag', 'effect', 'grid', 'lazyload', 'loop',
    'marquee', 'navigation', 'pagination', 'scroll-control', 'scrollbar',
    'slide-states', 'thumbs', 'video', 'visibility',
  ])
  expect(result).toMatchObject({ drag: true, pagination: true, effect: true, slides: 3, bullets: 3 })
})

test('core contains only drag and breakpoints', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })

  const result = await createSlider(frame, { breakpoints: { 999: { perPage: 1 } } })
  expect(result.registered).toEqual(['breakpoints', 'drag'])
  expect(result).toMatchObject({ drag: true, breakpoints: true, pagination: false, slides: 3 })
})

test('standard bundle covers a typical carousel in one script', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.standard.min.js') })

  const result = await createSlider(frame, { arrows: true, pagination: true })
  expect(result.registered).toEqual([
    'breakpoints', 'drag', 'navigation', 'pagination', 'slide-states',
  ])
  expect(result).toMatchObject({ navigation: true, pagination: true, bullets: 3, activeSlides: 1 })
})

test('individual scripts can load before core and register once', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('modules/pagination.min.js') })
  await frame.addScriptTag({ path: bundlePath('modules/effect.min.js') })
  expect(await frame.evaluate(() => (window as unknown as { __tvistV1Queue: unknown[] }).__tvistV1Queue.length)).toBe(2)

  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
  await frame.addScriptTag({ path: bundlePath('modules/pagination.min.js') })
  const result = await createSlider(frame, { pagination: true, effect: 'fade' })
  expect(result.registered).toEqual(['breakpoints', 'drag', 'effect', 'pagination'])
  expect(result).toMatchObject({ drag: true, pagination: true, effect: true, bullets: 3 })
})

test('every individual module file registers its public name', async ({ page }) => {
  const frame = await isolatedFrame(page)
  const names = [
    'navigation', 'pagination', 'autoplay', 'loop', 'slide-states', 'thumbs',
    'effect', 'grid', 'scroll-control', 'scrollbar', 'marquee', 'lazyload',
    'video', 'visibility',
  ]
  for (const name of names) {
    await frame.addScriptTag({ path: bundlePath(`modules/${name}.min.js`) })
  }
  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })

  const result = await createSlider(frame)
  expect(result.registered).toEqual([...names, 'drag', 'breakpoints'].sort())
})

test('module pack loaded after core restores the full feature set', async ({ page }) => {
  const frame = await isolatedFrame(page)
  await frame.addScriptTag({ path: bundlePath('tvist.core.min.js') })
  await frame.addScriptTag({ path: bundlePath('tvist.modules.min.js') })

  const result = await createSlider(frame, { pagination: true, effect: 'fade' })
  expect(result.registered).toHaveLength(16)
  expect(result).toMatchObject({ drag: true, pagination: true, effect: true, bullets: 3 })
})
