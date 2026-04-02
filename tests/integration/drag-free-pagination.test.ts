/**
 * @vitest-environment happy-dom
 *
 * Интеграционные тесты: Drag Free Mode + Pagination
 *
 * Проблема: в drag: 'free' режиме engine.scrollTo() не вызывается при прокрутке,
 * поэтому slideChangeStart/slideChangeEnd не эмитятся и пагинация не обновляется.
 *
 * Исправление: PaginationModule подписывается на 'scroll' и обновляет активный
 * bullet по ближайшему слайду к текущей позиции трека.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/drag'
import '../../src/modules/pagination'

const SLIDE_WIDTH = 600

function buildSliderHTML(slidesCount: number): string {
  const slides = Array.from(
    { length: slidesCount },
    (_, i) => `<div class="${TVIST_CLASSES.slide}">Slide ${i + 1}</div>`
  ).join('')

  return `
    <div class="${TVIST_CLASSES.block}">
      <div class="${TVIST_CLASSES.track}">
        <div class="${TVIST_CLASSES.container}">${slides}</div>
      </div>
      <div class="${TVIST_CLASSES.pagination}"></div>
    </div>
  `
}

function getActiveBulletIndex(root: HTMLElement): number {
  const bullets = root.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
  for (let i = 0; i < bullets.length; i++) {
    if (bullets[i].classList.contains(TVIST_CLASSES.bulletActive)) {
      return i
    }
  }
  return -1
}

function getActiveBulletCount(root: HTMLElement): number {
  return root.querySelectorAll(`.${TVIST_CLASSES.bulletActive}`).length
}

describe('Drag Free Mode + Pagination', () => {
  let wrapper: HTMLElement
  let root: HTMLElement
  let slider: Tvist

  beforeEach(() => {
    wrapper = document.createElement('div')
    document.body.appendChild(wrapper)

    Object.defineProperties(HTMLElement.prototype, {
      offsetWidth: { configurable: true, get: () => SLIDE_WIDTH },
      clientWidth: { configurable: true, get: () => SLIDE_WIDTH },
    })
  })

  afterEach(() => {
    slider?.destroy()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('bullets', () => {
    beforeEach(() => {
      wrapper.innerHTML = buildSliderHTML(5)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: 'free',
        perPage: 1,
        speed: 0,
        pagination: { type: 'bullets', clickable: false },
      })
    })

    it('инициализируется с активным первым bullet', () => {
      expect(getActiveBulletIndex(root)).toBe(0)
      expect(getActiveBulletCount(root)).toBe(1)
    })

    it('обновляет активный bullet при эмите scroll с позицией второго слайда', () => {
      // Устанавливаем позицию трека на второй слайд вручную
      const pos2 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos2)
      slider.engine.applyTransform()
      // applyTransform эмитит 'setTranslate', но не 'scroll'
      // Эмитируем scroll напрямую как это делает DragModule в momentum
      slider.emit('scroll')

      expect(getActiveBulletIndex(root)).toBe(1)
    })

    it('обновляет активный bullet при эмите scroll с позицией третьего слайда', () => {
      const pos3 = slider.engine.getScrollPositionForIndex(2)
      slider.engine.location.set(pos3)
      slider.engine.applyTransform()
      slider.emit('scroll')

      expect(getActiveBulletIndex(root)).toBe(2)
    })

    it('обновляет активный bullet при промежуточной позиции (ближе к следующему)', () => {
      // Позиция между слайдом 0 и 1, чуть ближе к слайду 1
      const pos0 = slider.engine.getScrollPositionForIndex(0)
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      const midPos = pos0 + (pos1 - pos0) * 0.6 // 60% пути к слайду 1

      slider.engine.location.set(midPos)
      slider.engine.applyTransform()
      slider.emit('scroll')

      expect(getActiveBulletIndex(root)).toBe(1)
    })

    it('не меняет активный bullet при промежуточной позиции ближе к текущему', () => {
      const pos0 = slider.engine.getScrollPositionForIndex(0)
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      const midPos = pos0 + (pos1 - pos0) * 0.3 // 30% пути к слайду 1

      slider.engine.location.set(midPos)
      slider.engine.applyTransform()
      slider.emit('scroll')

      expect(getActiveBulletIndex(root)).toBe(0)
    })

    it('возвращается к первому bullet при возврате к начальной позиции', () => {
      // Сначала переходим ко второму
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos1)
      slider.engine.applyTransform()
      slider.emit('scroll')
      expect(getActiveBulletIndex(root)).toBe(1)

      // Возвращаемся к первому
      const pos0 = slider.engine.getScrollPositionForIndex(0)
      slider.engine.location.set(pos0)
      slider.engine.applyTransform()
      slider.emit('scroll')
      expect(getActiveBulletIndex(root)).toBe(0)
    })

    it('в обычном режиме (drag: true) НЕ подписывается на scroll для пагинации', () => {
      slider.destroy()

      wrapper.innerHTML = buildSliderHTML(5)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: true,
        perPage: 1,
        speed: 0,
        pagination: { type: 'bullets', clickable: false },
      })

      // Эмитируем scroll — пагинация не должна реагировать
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos1)
      slider.engine.applyTransform()
      slider.emit('scroll')

      // Активный bullet остаётся на 0 (нет slideChangeStart/End)
      expect(getActiveBulletIndex(root)).toBe(0)
    })
  })

  describe('fraction', () => {
    beforeEach(() => {
      wrapper.innerHTML = buildSliderHTML(4)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: 'free',
        perPage: 1,
        speed: 0,
        pagination: { type: 'fraction' },
      })
    })

    it('инициализируется с "1 / 4"', () => {
      const current = root.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationCurrent}`)
      expect(current?.textContent?.trim()).toBe('1')
    })

    it('обновляет fraction при scroll на второй слайд', () => {
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos1)
      slider.engine.applyTransform()
      slider.emit('scroll')

      const current = root.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationCurrent}`)
      expect(current?.textContent?.trim()).toBe('2')
    })
  })

  describe('progress', () => {
    beforeEach(() => {
      wrapper.innerHTML = buildSliderHTML(4)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: 'free',
        perPage: 1,
        speed: 0,
        pagination: { type: 'progress' },
      })
    })

    it('обновляет ширину progress bar при scroll', () => {
      const pos1 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos1)
      slider.engine.applyTransform()
      slider.emit('scroll')

      const bar = root.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`)
      // Слайд 1 из 4 → 50% (индекс 1+1=2, totalPages=4, 2/4=50%)
      expect(bar?.style.width).toBe('50%')
    })
  })

  describe('freeSnap: true', () => {
    it('пагинация обновляется через slideChangeStart при freeSnap', async () => {
      wrapper.innerHTML = buildSliderHTML(4)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: 'free',
        freeSnap: true,
        perPage: 1,
        speed: 0,
        pagination: { type: 'bullets', clickable: false },
      })

      // При freeSnap scrollTo вызывается → slideChangeStart → updateActive
      slider.scrollTo(2, true)

      expect(getActiveBulletIndex(root)).toBe(2)
    })
  })

  describe('несколько scroll событий подряд (дедупликация)', () => {
    it('не меняет активный bullet если ближайший слайд не изменился', () => {
      wrapper.innerHTML = buildSliderHTML(5)
      root = wrapper.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}`)!

      slider = new Tvist(root, {
        drag: 'free',
        perPage: 1,
        speed: 0,
        pagination: { type: 'bullets', clickable: false },
      })

      const pos1 = slider.engine.getScrollPositionForIndex(1)
      slider.engine.location.set(pos1)
      slider.engine.applyTransform()
      slider.emit('scroll')
      expect(getActiveBulletIndex(root)).toBe(1)

      // Небольшое смещение — ближайший слайд остаётся 1
      slider.engine.location.set(pos1 - 5)
      slider.engine.applyTransform()
      slider.emit('scroll')
      expect(getActiveBulletIndex(root)).toBe(1)
    })
  })
})
