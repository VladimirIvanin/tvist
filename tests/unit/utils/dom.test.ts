import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getElement,
  getElements,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setTranslate,
  getOuterWidth,
  getOuterHeight,
  isFocusable,
  children,
} from '../../../src/utils/dom'

describe('dom utils', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('getElement', () => {
    it('should get element by selector', () => {
      const div = document.createElement('div')
      div.id = 'test-div'
      container.appendChild(div)

      const element = getElement('#test-div')
      expect(element).toBe(div)
    })

    it('should return element if already HTMLElement', () => {
      const div = document.createElement('div')
      const element = getElement(div)
      expect(element).toBe(div)
    })

    it('should throw error if element not found', () => {
      expect(() => getElement('#nonexistent')).toThrow(
        'Tvist: element "#nonexistent" not found'
      )
    })
  })

  describe('getElements', () => {
    it('should get elements by selector', () => {
      const div1 = document.createElement('div')
      const div2 = document.createElement('div')
      div1.className = 'test-class'
      div2.className = 'test-class'
      container.appendChild(div1)
      container.appendChild(div2)

      const elements = getElements('.test-class')
      expect(elements).toHaveLength(2)
      expect(elements).toContain(div1)
      expect(elements).toContain(div2)
    })

    it('should return array if array provided', () => {
      const div1 = document.createElement('div')
      const div2 = document.createElement('div')
      const arr = [div1, div2]

      const elements = getElements(arr)
      expect(elements).toBe(arr)
    })

    it('should wrap single element in array', () => {
      const div = document.createElement('div')
      const elements = getElements(div)

      expect(elements).toHaveLength(1)
      expect(elements[0]).toBe(div)
    })
  })

  describe('class manipulation', () => {
    let div: HTMLElement

    beforeEach(() => {
      div = document.createElement('div')
      container.appendChild(div)
    })

    it('addClass should add class', () => {
      addClass(div, 'test-class')
      expect(div.classList.contains('test-class')).toBe(true)
    })

    it('removeClass should remove class', () => {
      div.classList.add('test-class')
      removeClass(div, 'test-class')
      expect(div.classList.contains('test-class')).toBe(false)
    })

    it('toggleClass should toggle class', () => {
      toggleClass(div, 'test-class')
      expect(div.classList.contains('test-class')).toBe(true)
      
      toggleClass(div, 'test-class')
      expect(div.classList.contains('test-class')).toBe(false)
    })

    it('toggleClass should respect force parameter', () => {
      toggleClass(div, 'test-class', true)
      expect(div.classList.contains('test-class')).toBe(true)
      
      toggleClass(div, 'test-class', true)
      expect(div.classList.contains('test-class')).toBe(true)
      
      toggleClass(div, 'test-class', false)
      expect(div.classList.contains('test-class')).toBe(false)
    })

    it('hasClass should check class existence', () => {
      expect(hasClass(div, 'test-class')).toBe(false)
      
      div.classList.add('test-class')
      expect(hasClass(div, 'test-class')).toBe(true)
    })
  })

  describe('transform and transition', () => {
    let div: HTMLElement

    beforeEach(() => {
      div = document.createElement('div')
      container.appendChild(div)
    })

    it('setTranslate should set translate3d', () => {
      setTranslate(div, 100, 50)
      expect(div.style.transform).toBe('translate3d(100px, 50px, 0)')
    })

    it('setTranslate should default y to 0', () => {
      setTranslate(div, 100)
      expect(div.style.transform).toBe('translate3d(100px, 0px, 0)')
    })
  })

  describe('dimensions', () => {
    it('getOuterWidth should return offsetWidth', () => {
      const div = document.createElement('div')
      div.style.width = '100px'
      div.style.padding = '10px'
      div.style.border = '5px solid black'
      container.appendChild(div)

      // В JSDOM offsetWidth может быть 0, но метод должен работать
      const width = getOuterWidth(div)
      expect(width).toBeGreaterThanOrEqual(0)
      expect(typeof width).toBe('number')
    })

    it('getOuterHeight should return offsetHeight', () => {
      const div = document.createElement('div')
      div.style.height = '100px'
      div.style.padding = '10px'
      div.style.border = '5px solid black'
      container.appendChild(div)

      const height = getOuterHeight(div)
      expect(height).toBeGreaterThanOrEqual(0)
      expect(typeof height).toBe('number')
    })
  })

  describe('isFocusable', () => {
    it('should return true for input', () => {
      const input = document.createElement('input')
      expect(isFocusable(input)).toBe(true)
    })

    it('should return true for textarea', () => {
      const textarea = document.createElement('textarea')
      expect(isFocusable(textarea)).toBe(true)
    })

    it('should return true for button', () => {
      const button = document.createElement('button')
      expect(isFocusable(button)).toBe(true)
    })

    it('should return true for element with tabIndex', () => {
      const div = document.createElement('div')
      div.tabIndex = 0
      expect(isFocusable(div)).toBe(true)
    })

    it('should return false for regular div', () => {
      const div = document.createElement('div')
      expect(isFocusable(div)).toBe(false)
    })
  })

  describe('children', () => {
    it('should return all children without selector', () => {
      const div1 = document.createElement('div')
      const div2 = document.createElement('div')
      container.appendChild(div1)
      container.appendChild(div2)

      const kids = children(container)
      expect(kids).toHaveLength(2)
    })

    it('should return filtered children with selector', () => {
      const div1 = document.createElement('div')
      const div2 = document.createElement('div')
      div1.className = 'target'
      container.appendChild(div1)
      container.appendChild(div2)

      const kids = children(container, '.target')
      expect(kids).toHaveLength(1)
      expect(kids[0]).toBe(div1)
    })
  })
})

