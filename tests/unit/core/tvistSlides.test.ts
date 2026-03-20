/**
 * getSlidesInTvistRoot — слайды только своего экземпляра (без вложенных Tvist).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { getSlidesInTvistRoot } from '@core/tvistSlides'

describe('getSlidesInTvistRoot', () => {
  let host: HTMLElement

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    host.remove()
  })

  function makeRootWithContainer(): { root: HTMLElement; container: HTMLElement } {
    const root = document.createElement('div')
    root.className = TVIST_CLASSES.block
    const outerContainer = document.createElement('div')
    outerContainer.className = TVIST_CLASSES.container
    root.appendChild(outerContainer)
    host.appendChild(root)
    return { root, container: outerContainer }
  }

  it('без вложенности возвращает все слайды контейнера по порядку', () => {
    const { root, container } = makeRootWithContainer()
    const a = document.createElement('div')
    a.className = TVIST_CLASSES.slide
    const b = document.createElement('div')
    b.className = TVIST_CLASSES.slide
    const c = document.createElement('div')
    c.className = TVIST_CLASSES.slide
    container.append(a, b, c)

    expect(getSlidesInTvistRoot(container, root)).toEqual([a, b, c])
  })

  it('исключает слайды внутри одного вложенного блока', () => {
    const { root, container } = makeRootWithContainer()

    const outerSlide = document.createElement('div')
    outerSlide.className = TVIST_CLASSES.slide
    const innerRoot = document.createElement('div')
    innerRoot.className = TVIST_CLASSES.block
    const innerContainer = document.createElement('div')
    innerContainer.className = TVIST_CLASSES.container
    const innerSlide = document.createElement('div')
    innerSlide.className = TVIST_CLASSES.slide
    innerContainer.appendChild(innerSlide)
    innerRoot.appendChild(innerContainer)
    outerSlide.appendChild(innerRoot)

    const outerSlide2 = document.createElement('div')
    outerSlide2.className = TVIST_CLASSES.slide

    container.append(outerSlide, outerSlide2)

    const slides = getSlidesInTvistRoot(container, root)
    expect(slides).toHaveLength(2)
    expect(slides[0]).toBe(outerSlide)
    expect(slides[1]).toBe(outerSlide2)
  })

  it('исключает слайды при двух уровнях вложенных блоков', () => {
    const { root, container } = makeRootWithContainer()

    const page = document.createElement('div')
    page.className = TVIST_CLASSES.slide

    const inner1 = document.createElement('div')
    inner1.className = TVIST_CLASSES.block
    const inner2 = document.createElement('div')
    inner2.className = TVIST_CLASSES.block

    const deepSlide = document.createElement('div')
    deepSlide.className = TVIST_CLASSES.slide
    inner2.appendChild(deepSlide)
    inner1.appendChild(inner2)
    page.appendChild(inner1)

    const page2 = document.createElement('div')
    page2.className = TVIST_CLASSES.slide
    container.append(page, page2)

    expect(getSlidesInTvistRoot(container, root)).toEqual([page, page2])
  })

  it('пустой контейнер — пустой массив', () => {
    const { root, container } = makeRootWithContainer()
    expect(getSlidesInTvistRoot(container, root)).toEqual([])
  })

  it('вложенный блок без слайдов внутри не добавляет лишних элементов', () => {
    const { root, container } = makeRootWithContainer()
    const s = document.createElement('div')
    s.className = TVIST_CLASSES.slide
    const nested = document.createElement('div')
    nested.className = TVIST_CLASSES.block
    nested.appendChild(document.createElement('span'))
    s.appendChild(nested)
    container.appendChild(s)

    expect(getSlidesInTvistRoot(container, root)).toEqual([s])
  })
})
