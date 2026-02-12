/**
 * Тесты классов состояний на root: created, destroyed, locked
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import { createSliderFixture } from '../../fixtures'

describe('Tvist root state classes', () => {
  let fixture: ReturnType<typeof createSliderFixture>

  afterEach(() => {
    fixture?.cleanup()
  })

  describe('created', () => {
    it('добавляет класс --created на root после инициализации', () => {
      fixture = createSliderFixture({ slidesCount: 3, width: 600 })
      const slider = new Tvist(fixture.root, { perPage: 1 })

      expect(fixture.root.classList.contains(TVIST_CLASSES.created)).toBe(true)

      slider.destroy()
    })

    it('класс --created присутствует до вызова destroy', () => {
      fixture = createSliderFixture({ slidesCount: 2, width: 400 })
      const slider = new Tvist(fixture.root, { perPage: 2 })
      expect(fixture.root.classList.contains(TVIST_CLASSES.created)).toBe(true)
      slider.destroy()
    })
  })

  describe('destroyed', () => {
    it('добавляет класс --destroyed на root при вызове destroy()', () => {
      fixture = createSliderFixture({ slidesCount: 3, width: 600 })
      const slider = new Tvist(fixture.root, { perPage: 1 })

      expect(fixture.root.classList.contains(TVIST_CLASSES.destroyed)).toBe(false)

      slider.destroy()

      expect(fixture.root.classList.contains(TVIST_CLASSES.destroyed)).toBe(true)
    })

    it('класс --destroyed остаётся на root после полного уничтожения', () => {
      fixture = createSliderFixture({ slidesCount: 2, width: 400 })
      const slider = new Tvist(fixture.root)
      slider.destroy()

      expect(fixture.root.classList.contains(TVIST_CLASSES.destroyed)).toBe(true)
    })
  })

  describe('locked', () => {
    it('добавляет класс --locked на root когда контент помещается в контейнер', () => {
      // 3 слайда, ширина 900, perPage: 3 → по 300px на слайд, всё влезает → locked
      fixture = createSliderFixture({ slidesCount: 3, width: 900 })
      const slider = new Tvist(fixture.root, { perPage: 3, gap: 0 })

      expect(slider.engine.isLocked).toBe(true)
      expect(fixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(true)

      slider.destroy()
    })

    it('не добавляет класс --locked на root когда контент не помещается', () => {
      fixture = createSliderFixture({ slidesCount: 5, width: 1000 })
      const slider = new Tvist(fixture.root, { perPage: 2, gap: 0 })

      expect(slider.engine.isLocked).toBe(false)
      expect(fixture.root.classList.contains(TVIST_CLASSES.locked)).toBe(false)

      slider.destroy()
    })
  })

  describe('сочетание состояний', () => {
    it('после create root имеет --created, после destroy — --created и --destroyed', () => {
      fixture = createSliderFixture({ slidesCount: 2, width: 400 })
      const slider = new Tvist(fixture.root, { perPage: 1 })

      expect(fixture.root.classList.contains(TVIST_CLASSES.created)).toBe(true)
      expect(fixture.root.classList.contains(TVIST_CLASSES.destroyed)).toBe(false)

      slider.destroy()

      expect(fixture.root.classList.contains(TVIST_CLASSES.created)).toBe(true)
      expect(fixture.root.classList.contains(TVIST_CLASSES.destroyed)).toBe(true)
    })
  })
})
