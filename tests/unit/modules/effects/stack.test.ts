import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES } from '@core/constants'
import { EffectModule } from '@modules/effects/EffectModule'
import { createSliderFixture } from '../../../fixtures'
import type { SliderFixture } from '../../../fixtures'

Tvist.registerModule('effect', EffectModule)

describe('Stack Effect', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 4, width: 1000 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
  })

  // --- Инициализация ---

  it('должен активироваться при effect: stack', () => {
    slider = new Tvist(fixture.root, { effect: 'stack' })
    expect(slider.getModule('effect')).toBeInstanceOf(EffectModule)
  })

  it('должен добавлять CSS-класс --stack на root', () => {
    slider = new Tvist(fixture.root, { effect: 'stack' })
    expect(slider.root.classList.contains(TVIST_CLASSES.stack)).toBe(true)
  })

  it('должен принудительно устанавливать perPage: 1', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', perPage: 3 })
    expect(slider.options.perPage).toBe(1)
  })

  // --- Позиции при инициализации ---

  it('контейнер заморожен: transform = translate3d(0, 0, 0)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    expect(slider.container.style.transform).toBe('translate3d(0, 0, 0)')
  })

  it('активный слайд[0] на экране: translateX(0)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    expect(slider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
  })

  it('следующие слайды стоят на месте: translateX(-slidePosition)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const ss = slider.engine.slideSizeValue
    // slide[1]: slidePosition=1000 → translateX(-1000px)
    expect(slider.slides[1].style.transform).toContain(`translate3d(-${ss}px`)
    // slide[2]: slidePosition=2000 → translateX(-2000px)
    expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px`)
  })

  it('активный слайд имеет наибольший z-index', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const zActive = parseInt(slider.slides[0].style.zIndex)
    for (let i = 1; i < slider.slides.length; i++) {
      expect(zActive).toBeGreaterThan(parseInt(slider.slides[i].style.zIndex))
    }
  })

  // --- Переход на следующий слайд ---

  it('после next(): activeIndex = 1', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.next()
    expect(slider.activeIndex).toBe(1)
  })

  it('после next(): новый активный slide[1] на экране: translateX(-slidePosition)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const ss = slider.engine.slideSizeValue
    slider.next()
    // slide[1] стал активным, slidePosition=1000 → translateX(-1000px) = на экране
    expect(slider.slides[1].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
  })

  it('после next(): просмотренный slide[0] спрятан за левый край (не на экране)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const ss = slider.engine.slideSizeValue
    slider.next()
    // slide[0] просмотрен (prog=-1) → уходит за экран влево: translateX(-slideSize)
    expect(slider.slides[0].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
  })

  it('после next(): следующий slide[2] стоит на месте: translateX(-2*slideSize)', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const ss = slider.engine.slideSizeValue
    slider.next()
    expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px`)
  })

  it('после двух next(): activeIndex = 2', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.next()
    slider.next()
    expect(slider.activeIndex).toBe(2)
  })

  it('после двух next(): slide[2] на экране, просмотренные спрятаны за левый край', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const ss = slider.engine.slideSizeValue
    slider.next()
    slider.next()
    // Активный slide[2]: slidePosition=2000 → translateX(-2000px)
    expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px, 0px, 0px)`)
    // Просмотренные: оба спрятаны за левый край (translateX(-slideSize))
    expect(slider.slides[0].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
    expect(slider.slides[1].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
  })

  it('во время перехода 1→2: просмотренный slide[0] спрятан, не мелькает', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.next() // → slide 1
    const ss = slider.engine.slideSizeValue

    // Симулируем середину drag: translate=-1500 (между slide1 и slide2)
    const engine = slider.engine as any
    engine.location.set(-1500)
    slider.emit('setTranslate', slider, -1500)

    // slide[0] prog=-1.5 → должен быть спрятан (z=0, не на экране)
    expect(slider.slides[0].style.zIndex).toBe('0')
    expect(slider.slides[0].style.transform).not.toContain('translate3d(0px, 0px, 0px)')
    // slide[1] prog=-0.5 → переходящий, движется с translate
    expect(slider.slides[1].style.transform).toContain(`translate3d(-1500px`)
    // slide[2] prog=0.5 → следующий, стоит на месте
    expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px`)
  })

  it('next() перематывает ровно на 1 слайд, не на 2', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.next()
    // Если бы перематывало на 2, activeIndex был бы 2
    expect(slider.activeIndex).toBe(1)
    expect(slider.activeIndex).not.toBe(2)
  })

  // --- prev() ---

  it('prev() без loop не уходит ниже 0', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.prev()
    expect(slider.activeIndex).toBe(0)
  })

  it('next() затем prev() возвращает на исходный слайд', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.next()
    slider.prev()
    expect(slider.activeIndex).toBe(0)
  })

  // --- Loop ---

  it('с loop: true — next() корректно перематывает', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, loop: true })
    slider.next()
    expect(slider.activeIndex).toBe(1)
    slider.next()
    expect(slider.activeIndex).toBe(2)
  })

  // --- Cleanup ---

  it('destroy() очищает transform и z-index слайдов', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.destroy()
    fixture.slides.forEach(slide => {
      expect(slide.style.transform).toBe('')
      expect(slide.style.zIndex).toBe('')
    })
    slider = null as unknown as Tvist
  })

  it('destroy() очищает container.style.transform', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.destroy()
    expect(fixture.container.style.transform).toBe('')
    slider = null as unknown as Tvist
  })

  it('destroy() убирает класс --stack с root', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    slider.destroy()
    expect(fixture.root.classList.contains(TVIST_CLASSES.stack)).toBe(false)
    slider = null as unknown as Tvist
  })

  // --- Вертикальный режим ---

  describe('вертикальный режим', () => {
    let vFixture: SliderFixture
    let vSlider: Tvist

    beforeEach(() => {
      vFixture = createSliderFixture({ slidesCount: 3, width: 1000, height: 400 })
    })

    afterEach(() => {
      vSlider?.destroy()
      vFixture.cleanup()
    })

    it('активный слайд: translateY(0)', () => {
      vSlider = new Tvist(vFixture.root, { effect: 'stack', direction: 'vertical', speed: 0 })
      expect(vSlider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
    })

    it('следующий слайд: tX=0, tY=-slidePosition', () => {
      vSlider = new Tvist(vFixture.root, { effect: 'stack', direction: 'vertical', speed: 0 })
      const ss = vSlider.engine.slideSizeValue
      const t = vSlider.slides[1].style.transform
      expect(t).toMatch(/translate3d\(0px,/)
      expect(t).toContain(`-${ss}px`)
    })

    it('после next(): новый активный slide[1] на экране', () => {
      vSlider = new Tvist(vFixture.root, { effect: 'stack', direction: 'vertical', speed: 0 })
      const ss = vSlider.engine.slideSizeValue
      vSlider.next()
      expect(vSlider.activeIndex).toBe(1)
      expect(vSlider.slides[1].style.transform).toContain(`translate3d(0px, -${ss}px, 0px)`)
    })
  })

  // --- Опции stackEffect ---

  describe('опции stackEffect', () => {
    it('perSlideScale: 0 — все слайды scale(1)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { perSlideScale: 0 } })
      slider.next()
      slider.slides.forEach(slide => {
        expect(slide.style.transform).toContain('scale(1)')
      })
    })

    it('perSlideScale > 0 — переходящий слайд уменьшается (cover, mid-drag)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { perSlideScale: 0.1 } })
      // Симулируем mid-drag: slide[0] prog=-0.5
      const engine = slider.engine as any
      engine.location.set(-500)
      slider.emit('setTranslate', slider, -500)
      // slide[0]: progress=-0.5, scale = 1 - 0.1*0.5 = 0.95
      expect(slider.slides[0].style.transform).toContain('scale(0.95)')
    })

    it('perSlideDepth > 0 — переходящий слайд уходит по Z (cover, mid-drag)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { perSlideDepth: 50 } })
      // Симулируем mid-drag: slide[0] prog=-0.5 (переходящий)
      const engine = slider.engine as any
      engine.location.set(-500)
      slider.emit('setTranslate', slider, -500)
      // slide[0]: progress=-0.5, tZ = -50*0.5 = -25
      expect(slider.slides[0].style.transform).toContain('-25px)')
    })

    it('perSlideDepth: 0 — tZ = 0 для всех слайдов', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { perSlideDepth: 0 } })
      slider.next()
      slider.slides.forEach(slide => {
        expect(slide.style.transform).toContain(', 0px)')
      })
    })
  })

  // --- mode: 'uncover' ---
  // Покой — как cover; переход next/prev — одна схема веток (накрыть / снять карту).

  describe('mode: uncover', () => {
    it('при инициализации: как cover — slide[0] на экране, следующие −slidePosition', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const ss = slider.engine.slideSizeValue
      expect(slider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
      expect(slider.slides[1].style.transform).toContain(`translate3d(-${ss}px`)
      expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px`)
    })

    it('при инициализации: z-index как у cover (переходящий выше стопки)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const zActive = parseInt(slider.slides[0].style.zIndex)
      for (let i = 1; i < slider.slides.length; i++) {
        expect(zActive).toBeGreaterThan(parseInt(slider.slides[i].style.zIndex))
      }
    })

    it('после next(): activeIndex = 1', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      slider.next()
      expect(slider.activeIndex).toBe(1)
    })

    it('после next(): позиции как у cover', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const ss = slider.engine.slideSizeValue
      slider.next()
      expect(slider.slides[1].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
      expect(slider.slides[0].style.transform).toContain(`translate3d(-${ss}px, 0px, 0px)`)
      expect(slider.slides[2].style.transform).toContain(`translate3d(-${ss * 2}px`)
    })

    it('во время next: уходящий закреплён, следующий с translate (target задан)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const ss = slider.engine.slideSizeValue
      const engine = slider.engine as any
      engine.target.set(-ss)
      engine.location.set(-500)
      slider.emit('setTranslate', slider, -500)

      expect(slider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
      expect(slider.slides[1].style.transform).toContain('translate3d(-500px, 0px, 0px)')
    })

    it('драг влево: target ещё 0, аниматор выключен — всё равно режим next (как при программном)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const engine = slider.engine as any
      engine.target.set(0)
      engine.location.set(-300)
      slider.emit('setTranslate', slider, -300)
      expect(slider.engine.animator.isAnimating()).toBe(false)
      expect(slider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
      expect(slider.slides[1].style.transform).toContain('translate3d(-300px, 0px, 0px)')
    })

    it('prev в переходе: предыдущий закреплён, активный уезжает (isAnimating + target вправо)', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const ss = slider.engine.slideSizeValue
      slider.next()
      expect(slider.activeIndex).toBe(1)

      const spy = vi.spyOn(slider.engine.animator, 'isAnimating').mockReturnValue(true)
      const engine = slider.engine as any
      engine.target.set(0)
      engine.location.set(-ss + 500)
      slider.emit('setTranslate', slider, -ss + 500)

      // slide[0] progress≈-0.5 → pin; slide[1] progress≈0.5 → translate
      expect(slider.slides[0].style.transform).toContain('translate3d(0px, 0px, 0px)')
      expect(slider.slides[1].style.transform).toContain(`translate3d(${-ss + 500}px, 0px, 0px)`)

      spy.mockRestore()
    })

    it('next() перематывает ровно на 1 слайд', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      slider.next()
      expect(slider.activeIndex).toBe(1)
      expect(slider.activeIndex).not.toBe(2)
    })

    it('perSlideScale > 0 — как cover: уходящий при progress<0 (uncover next, mid)', () => {
      slider = new Tvist(fixture.root, {
        effect: 'stack', speed: 0,
        stackEffect: { mode: 'uncover', perSlideScale: 0.1 }
      })
      const engine = slider.engine as any
      const ss = slider.engine.slideSizeValue
      engine.target.set(-ss)
      engine.location.set(-500)
      slider.emit('setTranslate', slider, -500)
      expect(slider.slides[0].style.transform).toContain('scale(0.95)')
    })

    it('perSlideDepth > 0 — как cover: уходящий по Z (uncover next, mid)', () => {
      slider = new Tvist(fixture.root, {
        effect: 'stack', speed: 0,
        stackEffect: { mode: 'uncover', perSlideDepth: 50 }
      })
      const engine = slider.engine as any
      const ss = slider.engine.slideSizeValue
      engine.target.set(-ss)
      engine.location.set(-500)
      slider.emit('setTranslate', slider, -500)
      expect(slider.slides[0].style.transform).toContain('-25px)')
    })
  })
})
