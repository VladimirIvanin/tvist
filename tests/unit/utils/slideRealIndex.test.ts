/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import {
  findDomIndexByRealIndex,
  findDomIndexByRealIndexForTransition,
  findSlideByRealIndex,
  TVIST_SLIDE_INDEX_ATTR,
} from '@utils/slideRealIndex'

function slide(attr?: number): HTMLElement {
  const el = document.createElement('div')
  if (attr !== undefined) {
    el.setAttribute(TVIST_SLIDE_INDEX_ATTR, String(attr))
  }
  return el
}

describe('findDomIndexByRealIndex', () => {
  it('возвращает -1 на пустом списке', () => {
    expect(findDomIndexByRealIndex([], 0)).toBe(-1)
  })

  it('находит первый слайд с совпадающим атрибутом', () => {
    const a = slide(1)
    const b = slide(0)
    const c = slide(0)
    expect(findDomIndexByRealIndex([a, b, c], 0)).toBe(1)
  })

  it('возвращает -1 если атрибутов нет', () => {
    const slides = [slide(), slide()]
    expect(findDomIndexByRealIndex(slides, 0)).toBe(-1)
  })

  it('preferNonClone: пропускает .slide--clone и берёт оригинал', () => {
    const clone = slide(0)
    clone.classList.add(TVIST_CLASSES.slideClone)
    const orig = slide(0)
    expect(findDomIndexByRealIndex([clone, orig], 0, { preferNonClone: true })).toBe(1)
  })
})

describe('findDomIndexByRealIndexForTransition', () => {
  it('при prev выбирает совпадение слева от reference', () => {
    const a = slide(3)
    a.classList.add(TVIST_CLASSES.slideClone)
    const b = slide(2)
    const c = slide(3)
    const slides = [a, b, c]
    expect(findDomIndexByRealIndexForTransition(slides, 3, 2, 'prev')).toBe(0)
  })

  it('при next выбирает совпадение справа от reference', () => {
    const a = slide(1)
    const b = slide(0)
    b.classList.add(TVIST_CLASSES.slideClone)
    const slides = [a, b]
    expect(findDomIndexByRealIndexForTransition(slides, 0, 0, 'next')).toBe(1)
  })
})

describe('findSlideByRealIndex', () => {
  it('предпочитает совпадение по атрибуту перед DOM-индексом', () => {
    const dom0 = slide(2)
    const dom1 = slide(1)
    const slides = [dom0, dom1]
    expect(findSlideByRealIndex(slides, 1)).toBe(dom1)
  })

  it('без атрибутов возвращает слайд по позиции', () => {
    const s0 = slide()
    const s1 = slide()
    expect(findSlideByRealIndex([s0, s1], 1)).toBe(s1)
  })

  it('возвращает null при невалидном индексе без атрибута', () => {
    expect(findSlideByRealIndex([slide(), slide()], 5)).toBeNull()
    expect(findSlideByRealIndex([slide(), slide()], -1)).toBeNull()
  })
})
