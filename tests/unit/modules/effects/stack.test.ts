import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '@core/Tvist'
import { TVIST_CLASSES, TVIST_CSS_PREFIX } from '@core/constants'
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

  it('stackLayout: pile — класс --stack-pile и контейнер на весь track', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      stackEffect: { stackLayout: 'pile' },
    })
    expect(fixture.root.classList.contains(TVIST_CLASSES.stackPile)).toBe(true)
    expect(slider.container.style.width).toBe('100%')
    expect(slider.container.style.height).toBe('100%')
  })

  it('stack без pile — нет класса --stack-pile', () => {
    slider = new Tvist(fixture.root, { effect: 'stack' })
    expect(fixture.root.classList.contains(TVIST_CLASSES.stackPile)).toBe(false)
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

  it('stackLayout: pile — ожидающие на том же translate, что активный (колода в одном слоте)', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { stackLayout: 'pile' },
    })
    expect(slider.slides[1].style.transform).toContain('translate3d(0px, 0px, 0px)')
    expect(slider.slides[2].style.transform).toContain('translate3d(0px, 0px, 0px)')
    expect(slider.slides[3].style.transform).toContain('translate3d(0px, 0px, 0px)')
  })

  it('stackLayout: pile + rotate — ожидающие слайды с поворотом (веер колоды)', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { stackLayout: 'pile', rotate: true, perSlideRotate: 2 },
    })
    // slide[2]: progress = 2 → 2° * 2 = 4°
    expect(slider.slides[2].style.transform).toContain('rotateZ(4')
  })

  it('stackLayout: pile — после next() ось прокрутки локально 0 (без глобального translate)', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { stackLayout: 'pile' },
    })
    slider.next()
    expect(slider.slides[slider.activeIndex].style.transform).toContain('translate3d(0px, 0px, 0px)')
    expect(slider.slides[2].style.transform).toContain('translate3d(0px, 0px, 0px)')
    expect(slider.slides[3].style.transform).toContain('translate3d(0px, 0px, 0px)')
  })

  it('pile + perSlideOffset (горизонталь): активный и ожидающие на одном X; просмотренные на −slideSize', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      loop: true,
      stackEffect: { stackLayout: 'pile', perSlideOffset: 8, rotate: false },
    })
    slider.next()
    const ss = slider.engine.slideSizeValue
    const parseTX = (tf: string) => {
      const m = tf.match(/translate3d\((-?[\d.]+)px/)
      return m ? parseFloat(m[1]) : NaN
    }
    const refX = parseTX(slider.slides[slider.activeIndex].style.transform)
    slider.slides.forEach((slide, i) => {
      const x = parseTX(slide.style.transform)
      expect(Math.abs(x - refX)).toBeLessThan(0.5)
    })
  })

  it('viewportPadding задаёт padding и box-sizing на track', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { viewportPadding: 16 },
    })
    expect(fixture.track.style.paddingTop).toBe('16px')
    expect(fixture.track.style.paddingLeft).toBe('16px')
    expect(fixture.track.style.boxSizing).toBe('border-box')
  })

  it('destroy() снимает padding track при viewportPadding', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { viewportPadding: 12 },
    })
    slider.destroy()
    expect(fixture.track.style.padding).toBe('')
    slider = null as unknown as Tvist
  })

  it('slideTravelRatio < 1 — смещение переходящего слайда короче полного хода', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { slideTravelRatio: 0.5 },
    })
    const engine = slider.engine as { location: { set: (v: number) => void } }
    engine.location.set(-500)
    slider.emit('setTranslate', slider, -500)
    expect(slider.slides[0].style.transform).toContain('translate3d(-250px, 0px, 0px)')
  })

  it('zIndexProgressScale < 1 — z-index уходит вниз раньше, чем при scale 1', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { zIndexProgressScale: 0.2 },
    })
    const engine = slider.engine as { location: { set: (v: number) => void } }
    engine.location.set(-200)
    slider.emit('setTranslate', slider, -200)
    expect(slider.slides[0].style.zIndex).toBe('0')
  })

  it('по умолчанию при слабом translate активный слайд сохраняет верхний z-index', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const engine = slider.engine as { location: { set: (v: number) => void } }
    engine.location.set(-200)
    slider.emit('setTranslate', slider, -200)
    expect(parseInt(slider.slides[0].style.zIndex, 10)).toBeGreaterThan(0)
  })

  it('активный слайд имеет наибольший z-index', () => {
    slider = new Tvist(fixture.root, { effect: 'stack', speed: 0 })
    const zActive = parseInt(slider.slides[0].style.zIndex)
    for (let i = 1; i < slider.slides.length; i++) {
      expect(zActive).toBeGreaterThan(parseInt(slider.slides[i].style.zIndex))
    }
  })

  it('perSlideOffset сдвигает просмотренные слайды вправо и вниз', () => {
    const off = 12
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { perSlideOffset: off },
    })
    const ss = slider.engine.slideSizeValue
    slider.next()
    // slide[0]: progress = -1 → базовый translateX(-ss), плюс off по X и Y
    expect(slider.slides[0].style.transform).toContain(
      `translate3d(-${ss - off}px, ${off}px, 0px)`
    )
  })

  it('slideShadows: в слайде создаётся элемент тени', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { slideShadows: true },
    })
    const shadowClass = `${TVIST_CSS_PREFIX}-slide-shadow`
    const el = slider.slides[0].querySelector(`.${shadowClass}`)
    expect(el).toBeInstanceOf(HTMLElement)
    expect((el as HTMLElement).style.opacity).toBeDefined()
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

  it('destroy() снимает --stack-pile и размеры контейнера', () => {
    slider = new Tvist(fixture.root, {
      effect: 'stack',
      speed: 0,
      stackEffect: { stackLayout: 'pile' },
    })
    slider.destroy()
    expect(fixture.root.classList.contains(TVIST_CLASSES.stackPile)).toBe(false)
    expect(fixture.container.style.width).toBe('')
    expect(fixture.container.style.height).toBe('')
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

    /** Регрессия: pile + absolute — не тащить глобальный scroll в transform (было translateY(-slideSize)). */
    it('pile + vertical: после next активный без смещения по оси (0, 0 в локали вьюпорта)', () => {
      vSlider = new Tvist(vFixture.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: { stackLayout: 'pile', mode: 'uncover' },
      })
      vSlider.next()
      expect(vSlider.slides[vSlider.activeIndex].style.transform).toContain('translate3d(0px, 0px, 0px)')
    })

    /**
     * Регрессия: первый кадр next (translate=0, active уже 1) — offsetNorm давал progress=1 и полный rotate;
     * веер на активном наращиваем по доле анимации (pileDecorAnimT), иначе «падение» в начале.
     */
    it('pile + uncover + rotate: кадр translate=0 при анимации на слайд 1 — активный rotateZ(0)', () => {
      const local = createSliderFixture({ slidesCount: 4, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          rotate: true,
          perSlideRotate: 2,
        },
      })
      const ss = s.engine.slideSizeValue
      const eng = s.engine as unknown as {
        index: { set: (v: number) => void }
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.index.set(1)
      eng.target.set(-ss)
      eng.location.set(0)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, 0)
      expect(s.slides[1].style.transform).toContain('rotateZ(2deg)')
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    /**
     * Регрессия: perSlideOffset только по X; по Y активный и стопка совпадают, просмотренные −slideSize.
     */
    it('pile + perSlideOffset + next: один translateY у активного и ожидающих; просмотренные −slideSize', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
          rotate: true,
          perSlideRotate: 2,
        },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      const refY = parseTY(s.slides[s.activeIndex].style.transform)
      s.slides.forEach((slide, i) => {
        const y = parseTY(slide.style.transform)
        expect(Math.abs(y - refY)).toBeLessThan(0.5)
      })
      s.destroy()
      local.cleanup()
    })

    /** Регрессия: rebase(rest) + progress<=-1 давали +slideSize по Y («все уезжают вниз»). */
    it('pile + uncover: после двух next ни у одного слайда translateY > 0', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
          rotate: true,
          perSlideRotate: 2,
        },
      })
      s.next()
      s.next()
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      s.slides.forEach((slide) => {
        expect(parseTY(slide.style.transform)).toBeLessThanOrEqual(0)
      })
      s.destroy()
      local.cleanup()
    })

    /**
     * Позиции: при pile раньше все progress≤−1 давали один rawAlong — после rebase два просмотренных
     * сливались в translateY −slideSize (как в vertical-uncover в доке). Нужен каскад по глубине.
     */
    it('pile + uncover: после двух next просмотренные разведены по Y (каскад −2ss и −ss)', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
          rotate: true,
          perSlideRotate: 2,
        },
      })
      s.next()
      s.next()
      const ss = s.engine.slideSizeValue
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      const y0 = parseTY(s.slides[0].style.transform)
      const y1 = parseTY(s.slides[1].style.transform)
      expect(Math.abs(y0)).toBeLessThan(1)
      expect(Math.abs(y1)).toBeLessThan(1)
      s.destroy()
      local.cleanup()
    })

    /**
     * Анимация: второй next (active уже 2, translate между −ss и −2ss) — rotate на активном
     * должен идти по pileDecorAnimT, а не от полного progress=1 (иначе «рывок» в начале шага).
     */
    it('pile + uncover + rotate: середина анимации 1→2 — активный rotateZ ≈ perSlideRotate * доля пути', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          rotate: true,
          perSlideRotate: 2,
        },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      expect(s.activeIndex).toBe(1)
      const eng = s.engine as unknown as {
        index: { set: (v: number) => void }
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.index.set(2)
      eng.target.set(-ss * 2)
      const translateMid = -ss * 1.375
      eng.location.set(translateMid)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, translateMid)
      const parseRZ = (tf: string) => {
        const m = tf.match(/rotateZ\(([-\d.eE]+)deg\)/)
        return m ? parseFloat(m[1]) : NaN
      }
      const t = (translateMid - (-ss * 2 + ss)) / (-ss)
      expect(t).toBeCloseTo(0.375, 5)
      const expectDeg = 2 * (t + 0.25)
      expect(parseRZ(s.slides[2].style.transform)).toBeCloseTo(expectDeg, 1)
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    /**
     * Локализация бага из доки: у слайда 0 getScrollPosition=0 — «сырой translate» совпадал с формулой
     * translate−rest; у слайда 1 rest=−ss — нужен tY = translate−rest(1), иначе шаг 1→2 «улетает».
     */
    it('pile + uncover: середина 1→2 — уходящий слайд[1].tY = translate − rest(1)', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
        },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      const eng = s.engine as unknown as {
        index: { set: (v: number) => void }
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.index.set(2)
      eng.target.set(-ss * 2)
      const tr = -Math.round(ss * 1.35)
      eng.location.set(tr)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, tr)
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      expect(Math.abs(parseTY(s.slides[1].style.transform))).toBeLessThan(1)
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    /**
     * Та же ветка, что в логах: после handoff active=2 при translate=−ss слайд 1 ещё в стопке (tY≈0),
     * затем по мере translate→−2ss tY монотонно уходит в минус (не залипание на 0).
     */
    it('pile + uncover: анимация 1→2 — tY слайда[1] монотонно не растёт', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: { mode: 'uncover', stackLayout: 'pile' },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      const eng = s.engine as unknown as {
        index: { set: (v: number) => void }
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.index.set(2)
      eng.target.set(-ss * 2)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      const trs = [-ss, -ss - ss * 0.25, -ss - ss * 0.5, -ss * 2]
      const ys = trs.map((tr) => {
        eng.location.set(tr)
        s.emit('setTranslate', s, tr)
        return parseTY(s.slides[1].style.transform)
      })
      for (let k = 1; k < ys.length; k++) {
        expect(ys[k]).toBeLessThanOrEqual(ys[k - 1] + 1e-6)
      }
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    it('pile + uncover: mid-next (анимация) — translateY не уходит в плюс', () => {
      const local = createSliderFixture({ slidesCount: 4, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
        },
      })
      const ss = s.engine.slideSizeValue
      const eng = s.engine as unknown as {
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.target.set(-ss)
      eng.location.set(-ss * 0.45)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, -ss * 0.45)
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      s.slides.forEach((slide) => {
        expect(parseTY(slide.style.transform)).toBeLessThanOrEqual(0)
      })
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    /**
     * Регрессия: movingNext использовал translate > target + ε — за ~0.5px до конца
     * uncover гас и давал скачок (артефакт). При ratio<1 ветки расходятся на последнем участке.
     */
    /**
     * Регрессия: второй next() поднимает activeIndex до 2, пока translate ещё −slideSize —
     * без нормализации progress слайд 1 получал pin −slidePosition и прыгал в pile.
     */
    it('pile + uncover: кадр «active уже 2, translate ещё −ss» — предыдущий без скачка по Y', () => {
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          slideTravelRatio: 0.4,
        },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      expect(s.activeIndex).toBe(1)
      const eng = s.engine as unknown as {
        index: { set: (v: number) => void }
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.index.set(2)
      eng.target.set(-ss * 2)
      eng.location.set(-ss)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, -ss)
      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }
      expect(Math.abs(parseTY(s.slides[1].style.transform))).toBeLessThan(2)
      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    it('pile + uncover + slideTravelRatio<1: у цели анимации при isAnimating ещё uncover (нет скачка tY)', () => {
      const local = createSliderFixture({ slidesCount: 4, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: false,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          slideTravelRatio: 0.4,
        },
      })
      s.next()
      const ss = s.engine.slideSizeValue
      expect(s.activeIndex).toBe(1)

      const parseTY = (tf: string) => {
        const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
        return m ? parseFloat(m[1]) : NaN
      }

      const eng = s.engine as unknown as {
        target: { set: (v: number) => void }
        location: { set: (v: number) => void }
      }
      eng.target.set(-ss)
      const nearEnd = -ss + 0.35
      eng.location.set(nearEnd)
      vi.spyOn(s.engine.animator, 'isAnimating').mockReturnValue(true)
      s.emit('setTranslate', s, nearEnd)
      const tyNear = parseTY(s.slides[1].style.transform)

      s.emit('setTranslate', s, -ss)
      const tyEnd = parseTY(s.slides[1].style.transform)

      expect(Math.abs(tyNear - tyEnd)).toBeLessThan(2)
      expect(Math.abs(tyNear)).toBeLessThan(1)

      vi.restoreAllMocks()
      s.destroy()
      local.cleanup()
    })

    /**
     * Почему остальные тесты не ловят «прыжок» в начале анимации: при speed: 0 Animator сразу
     * ставит location в target — нет кадров, где activeIndex уже новый, а translate ещё старый.
     * Здесь первый тик RAF после next() со слайда 1 → 2: просмотренный слайд[0] остаётся у −slideSize по Y.
     */
    it('pile + uncover + speed>0: первый кадр next(1→2) — просмотренный слайд не отрывается от −slideSize по Y', async () => {
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'setInterval',
          'Date',
          'requestAnimationFrame',
          'cancelAnimationFrame',
        ],
      })
      const local = createSliderFixture({ slidesCount: 5, width: 320, height: 400 })
      const s = new Tvist(local.root, {
        direction: 'vertical',
        effect: 'stack',
        speed: 0,
        loop: true,
        stackEffect: {
          mode: 'uncover',
          stackLayout: 'pile',
          perSlideOffset: 8,
          rotate: true,
          perSlideRotate: 2,
        },
      })
      try {
        s.next()
        const ss = s.engine.slideSizeValue
        expect(s.activeIndex).toBe(1)
        const parseTY = (tf: string) => {
          const m = tf.match(/translate3d\([^,]+,\s*(-?[\d.]+)px/)
          return m ? parseFloat(m[1]) : NaN
        }
        const tyPrevAtRest = parseTY(s.slides[0].style.transform)
        expect(Math.abs(tyPrevAtRest)).toBeLessThan(2)

        s.updateOptions({ speed: 400 })
        s.next()
        await vi.advanceTimersByTimeAsync(32)

        const locAfterTick = s.engine.location.get()
        expect(locAfterTick).toBeLessThan(-ss - 0.01)

        const tyPrevFirstFrame = parseTY(s.slides[0].style.transform)
        expect(Math.abs(tyPrevFirstFrame)).toBeLessThan(ss * 0.2)
      } finally {
        s.destroy()
        local.cleanup()
        vi.useRealTimers()
      }
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

    /**
     * Регрессия (pile/track): на последнем кадре анимации translate === target, isAnimating ещё true —
     * раньше uncover гас, z-index следующего слайда как у cover («3»), нужен режим карт («7» для 4 слайдов).
     */
    it('translate===target и isAnimating — z-index следующего как в uncover-переходе, не как в cover', () => {
      slider = new Tvist(fixture.root, { effect: 'stack', speed: 0, stackEffect: { mode: 'uncover' } })
      const ss = slider.engine.slideSizeValue
      slider.next()
      expect(slider.activeIndex).toBe(1)

      const engine = slider.engine as any
      engine.target.set(-ss)
      engine.location.set(-ss)
      vi.spyOn(slider.engine.animator, 'isAnimating').mockReturnValue(true)
      slider.emit('setTranslate', slider, -ss)

      expect(slider.slides[2].style.zIndex).toBe('3')

      vi.restoreAllMocks()
      slider.emit('setTranslate', slider, -ss)
      expect(slider.slides[2].style.zIndex).toBe('3')
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
