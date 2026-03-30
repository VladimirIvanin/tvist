/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import {
  findDomIndexByRealIndex,
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
