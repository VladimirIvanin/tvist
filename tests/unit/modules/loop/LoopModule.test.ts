/**
 * Тесты для LoopModule с клонированием
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, type SliderFixture } from '../../../fixtures'
import { Tvist } from '../../../../src/core/Tvist'
import { LoopModule } from '../../../../src/modules/loop/LoopModule'

// Регистрируем модуль Loop для тестов
Tvist.MODULES.set('loop', LoopModule)

describe('LoopModule (с клонами)', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 4, width: 1000 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
  })

  describe('Создание клонов', () => {
    it('должен создавать клоны в начале и конце', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      // perPage=1 → cloneCount = 1
      // Ожидаем: 1 prepend + 4 оригинала + 1 append = 6 слайдов
      const allSlides = slider.container.querySelectorAll('.tvist__slide')
      expect(allSlides.length).toBe(6)
    })

    it('клоны должны иметь data-tvist-clone атрибут', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      const clones = slider.container.querySelectorAll('[data-tvist-clone="true"]')
      expect(clones.length).toBe(2) // 1 prepend + 1 append
    })

    it('оригинальные слайды должны иметь data-tvist-original', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      const originals = slider.container.querySelectorAll('[data-tvist-original="true"]')
      expect(originals.length).toBe(4)
    })

    it('prepend клон должен быть последним слайдом', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      const allSlides = slider.container.querySelectorAll('.tvist__slide')
      // Первый - prepend клон (слайд 3, последний)
      expect(allSlides[0].getAttribute('data-tvist-slide-index')).toBe('3')
      expect(allSlides[0].getAttribute('data-tvist-clone')).toBe('true')
    })

    it('append клон должен быть первым слайдом', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      const allSlides = slider.container.querySelectorAll('.tvist__slide')
      // Последний - append клон (слайд 0, первый)
      expect(allSlides[5].getAttribute('data-tvist-slide-index')).toBe('0')
      expect(allSlides[5].getAttribute('data-tvist-clone')).toBe('true')
    })
  })

  describe('Начальная позиция', () => {
    it('должен стартовать с первого оригинального слайда', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      // cloneCount = 1, так что физический индекс = 1
      expect(slider.activeIndex).toBe(1)
      expect(slider.realIndex).toBe(0)
    })
  })

  describe('Навигация', () => {
    it('next должен увеличивать физический индекс', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1, speed: 0 })

      const initialPhysical = slider.activeIndex
      expect(initialPhysical).toBe(1) // cloneCount = 1
      
      slider.next()
      expect(slider.activeIndex).toBe(2) // физический увеличился
      expect(slider.realIndex).toBe(1) // логический тоже
    })

    it('prev от начала должен уменьшать физический индекс', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1, speed: 0 })

      // realIndex: 0, физический: 1 (cloneCount)
      slider.prev()
      
      // После prev физический индекс = 0 (prepend клон)
      expect(slider.activeIndex).toBe(0)
      // realIndex = слайд 3 (последний)
      expect(slider.realIndex).toBe(3)
    })
  })

  describe('realIndex', () => {
    it('должен возвращать логический индекс', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      expect(slider.realIndex).toBe(0)
    })

    it('realIndex должен быть в диапазоне [0, N-1]', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1, speed: 0 })

      // Проходим по всем слайдам
      for (let i = 0; i < 10; i++) {
        expect(slider.realIndex).toBeGreaterThanOrEqual(0)
        expect(slider.realIndex).toBeLessThan(4)
        slider.next()
      }
    })
  })

  describe('scrollTo с физическим индексом', () => {
    it('scrollTo(3) должен перейти к слайду 2 (физический)', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1, speed: 0 })

      // физический 3 = cloneCount(1) + realIndex(2)
      slider.scrollTo(3, true)
      expect(slider.realIndex).toBe(2)
    })

    it('scrollTo работает с физическими индексами', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1, speed: 0 })

      // Переход к слайду 3 (физический = 1 + 3 = 4)
      slider.scrollTo(4, true)
      expect(slider.realIndex).toBe(3)
    })
  })

  describe('destroy', () => {
    it('должен удалять клоны при destroy', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })

      const clonesBeforeDestroy = fixture.root.querySelectorAll('[data-tvist-clone="true"]')
      expect(clonesBeforeDestroy.length).toBe(2) // 1 prepend + 1 append

      slider.destroy()

      const clonesAfterDestroy = fixture.root.querySelectorAll('[data-tvist-clone="true"]')
      expect(clonesAfterDestroy.length).toBe(0)
    })

    it('должен оставлять только оригинальные слайды', () => {
      slider = new Tvist(fixture.root, { loop: true, perPage: 1 })
      slider.destroy()

      const slides = fixture.root.querySelectorAll('.tvist__slide')
      expect(slides.length).toBe(4)
    })
  })

  describe('Без loop', () => {
    it('не должен создавать клоны без loop: true', () => {
      slider = new Tvist(fixture.root, { loop: false, perPage: 1 })

      const clones = fixture.root.querySelectorAll('[data-tvist-clone="true"]')
      expect(clones.length).toBe(0)
    })
  })

  describe('Граничные случаи', () => {
    it('должен работать с 2 слайдами', () => {
      const smallFixture = createSliderFixture({ slidesCount: 2 })
      slider = new Tvist(smallFixture.root, { loop: true, perPage: 1 })

      expect(slider.realIndex).toBe(0)
      
      slider.next()
      expect(slider.realIndex).toBe(1)

      smallFixture.cleanup()
    })

    it('не должен создавать loop для 1 слайда', () => {
      const singleFixture = createSliderFixture({ slidesCount: 1 })
      slider = new Tvist(singleFixture.root, { loop: true, perPage: 1 })

      const clones = singleFixture.root.querySelectorAll('[data-tvist-clone="true"]')
      expect(clones.length).toBe(0)

      singleFixture.cleanup()
    })
  })
})
