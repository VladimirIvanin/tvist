/**
 * Тесты для SlideStatesModule
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CSS_PREFIX } from '@core/constants'
import { Tvist } from '@core/Tvist'
import { SlideStatesModule } from '@modules/slide-states'
import { createSliderFixture } from '../../fixtures'

// Регистрируем модуль вручную для тестов
Tvist.registerModule('slide-states', SlideStatesModule)

describe('SlideStatesModule', () => {
  let root: HTMLElement
  let tvist: Tvist
  let cleanup: () => void

  beforeEach(() => {
    const fixture = createSliderFixture({
      slidesCount: 5,
    })
    root = fixture.root
    cleanup = fixture.cleanup
  })

  afterEach(() => {
    tvist?.destroy()
    cleanup()
  })

  describe('Active class', () => {
    it(`должен применять класс ${TVIST_CSS_PREFIX}__slide--active к активному слайду`, async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
      })

      // Даём время для инициализации модуля
      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
    })

    it('должен обновлять класс active при смене слайда', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
        speed: 0,
      })

      const slides = tvist.slides
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)

      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
    })
  })

  describe('Prev/Next classes', () => {
    it('должен применять классы prev и next к соседним слайдам', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 2, // Активный слайд - 2
      })

      // Даём время для инициализации
      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })

    it('не должен применять prev класс к первому слайду без loop', () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
        loop: false,
      })

      const slides = tvist.slides
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(false)
    })

    it('не должен применять next класс к последнему слайду без loop', () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 4,
        loop: false,
      })

      const slides = tvist.slides
      expect(slides[4].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(false)
    })

    it('должен применять prev/next циклически с loop', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
        loop: true,
      })

      // Даём время для инициализации
      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      expect(slides[4].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })
  })

  describe('Center mode', () => {
    it('должен корректно применять классы в центрированном режиме', async () => {
      tvist = new Tvist(root, {
        perPage: 3,
        center: true,
        start: 2,
      })

      // Даём время для инициализации
      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })
  })

  describe('Visible class', () => {
    it('класс visible не проставляется в happy-dom (нулевые размеры)', async () => {
      // В happy-dom getBoundingClientRect возвращает нули, поэтому
      // canCheckVisibility = false и класс visible не проставляется
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      
      // В happy-dom класс visible не проставляется из-за нулевых размеров
      // Это ограничение тестового окружения, в реальном браузере будет работать
      const hasVisible = slides.some(s => s.classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`))
      expect(hasVisible).toBe(false)
    })
  })

  describe('PerPage = 1 mode', () => {
    it('должен проставлять active/prev/next независимо от видимости в viewport', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 2,
        loop: false,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      
      // Даже если prev/next слайды не видны в viewport (за пределами),
      // классы состояний должны быть проставлены
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
    })

    it('должен проставлять prev/next при perPage=1 и loop=true', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 0,
        loop: true,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      
      // В режиме loop первый слайд активен, последний - prev, второй - next
      // Эти классы должны быть независимо от видимости
      const activeSlides = slides.filter(s => s.classList.contains(`${TVIST_CSS_PREFIX}__slide--active`))
      const prevSlides = slides.filter(s => s.classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`))
      const nextSlides = slides.filter(s => s.classList.contains(`${TVIST_CSS_PREFIX}__slide--next`))
      
      expect(activeSlides.length).toBeGreaterThan(0)
      expect(prevSlides.length).toBeGreaterThan(0)
      expect(nextSlides.length).toBeGreaterThan(0)
    })

    it('должен обновлять prev/next при навигации с perPage=1', async () => {
      tvist = new Tvist(root, {
        perPage: 1,
        start: 1,
        speed: 0,
        loop: false,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      
      // Начальное состояние: slide 1 активен
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)

      // Переходим на следующий слайд
      tvist.next()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Новое состояние: slide 2 активен
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(true)
      expect(slides[2].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(true)
      expect(slides[3].classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)).toBe(true)
      
      // Старые классы должны быть удалены
      expect(slides[0].classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`)).toBe(false)
      expect(slides[1].classList.contains(`${TVIST_CSS_PREFIX}__slide--active`)).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('должен удалять все классы при destroy', async () => {
      tvist = new Tvist(root, {
        perPage: 2,
        start: 1,
      })

      // Даём время для инициализации
      await new Promise(resolve => setTimeout(resolve, 10))

      const slides = tvist.slides
      
      // Проверяем, что классы применены (без visible, т.к. он требует getBoundingClientRect)
      const hasAnyClass = slides.some(slide =>
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--active`) ||
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`) ||
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--next`)
      )
      expect(hasAnyClass).toBe(true)

      // Уничтожаем
      tvist.destroy()

      // Проверяем, что все классы удалены
      const hasAnyClassAfter = slides.some(slide =>
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--active`) ||
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--prev`) ||
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--next`) ||
        slide.classList.contains(`${TVIST_CSS_PREFIX}__slide--visible`)
      )
      expect(hasAnyClassAfter).toBe(false)
    })
  })
})
