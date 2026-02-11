/**
 * @vitest-environment happy-dom
 *
 * Тесты интеграции Autoplay + Pagination:
 * - В loop режиме пагинация использует realIndex
 * - При драге автоплей ставится на паузу (пагинация не расходится с кадром)
 * - scrollTo с индексом за границами (например -1) не ломает пагинацию
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../src/modules/autoplay'
import '../../src/modules/pagination'
import '../../src/modules/loop'
import '../../src/modules/drag'

describe('Autoplay + Pagination + Loop integration', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
    // Мокаем размеры, чтобы переходы и slideChangeEnd срабатывали
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { get: () => 800 },
      offsetWidth: { get: () => 800 }
    })
    // @ts-expect-error мок для расчёта позиций
    HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 } as DOMRect)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
    delete (HTMLElement.prototype as any).getBoundingClientRect
  })

  /**
   * Вспомогательная функция для получения индекса активной точки пагинации
   */
  function getActiveBulletIndex(container: HTMLElement): number {
    const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    for (let i = 0; i < bullets.length; i++) {
      if (bullets[i].classList.contains(TVIST_CLASSES.bulletActive)) {
        return i
      }
    }
    return -1
  }

  it('should update pagination when autoplay transitions from last to first slide in loop mode', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      loop: true,
      speed: 0, // Отключаем анимацию для тестов
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })

    const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    
    // Должно быть 3 точки (в loop режиме все слайды доступны)
    expect(bullets.length).toBe(3)
    
    // Изначально активен первый слайд (индекс 0)
    expect(slider.activeIndex).toBe(0)
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Первый тик автоплея - переход на слайд 1
    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    // Второй тик - переход на слайд 2 (последний)
    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    // Третий тик - переход от последнего к первому (loop)
    // ЭТО МЕСТО ГДЕ ОЖИДАЕТСЯ БАГ
    vi.advanceTimersByTime(1000)
    
    // realIndex должен быть 0 (первый слайд)
    expect(slider.realIndex).toBe(0)
    
    // ДИАГНОСТИКА БАГА:
    // activeIndex в loop режиме может отличаться от realIndex из-за перестановки слайдов
    // Пагинация использует activeIndex, но должна использовать realIndex
    // 
    // Пример: activeIndex = 2, realIndex = 0
    // Это происходит потому что LoopModule переставляет слайды в DOM,
    // но PaginationModule использует activeIndex вместо realIndex
    
    // Пагинация должна показывать первый слайд как активный
    // БАГ: пагинация не обновляется и показывает неправильный индекс
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.destroy()
  })

  it('should correctly update pagination through multiple loop cycles', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      loop: true,
      speed: 0,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })

    // Первый цикл: 0 -> 1 -> 2 -> 0
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Второй цикл: 0 -> 1 -> 2 -> 0
    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.destroy()
  })

  it('should update fraction pagination when transitioning from last to first in loop mode', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      loop: true,
      speed: 0,
      pagination: {
        type: 'fraction'
      }
    })

    const getCurrentFraction = () => {
      const current = container.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)
      return current?.textContent
    }

    // Изначально 1 / 3
    expect(getCurrentFraction()).toBe('1')

    // Переход на слайд 2
    vi.advanceTimersByTime(1000)
    expect(getCurrentFraction()).toBe('2')

    // Переход на слайд 3
    vi.advanceTimersByTime(1000)
    expect(getCurrentFraction()).toBe('3')

    // Переход обратно на слайд 1 (loop)
    vi.advanceTimersByTime(1000)
    expect(getCurrentFraction()).toBe('1')

    slider.destroy()
  })

  it('should emit slideChangeEnd event with correct index when looping', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slideChangedSpy = vi.fn()

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      loop: true,
      speed: 0,
      pagination: {
        type: 'bullets'
      },
      on: {
        slideChangeEnd: slideChangedSpy
      }
    })

    // Переход 0 -> 1
    vi.advanceTimersByTime(1000)
    expect(slideChangedSpy).toHaveBeenLastCalledWith(1)

    // Переход 1 -> 2
    vi.advanceTimersByTime(1000)
    expect(slideChangedSpy).toHaveBeenLastCalledWith(2)

    // Переход 2 -> 0 (loop)
    // Здесь может быть баг - событие может приходить с неправильным индексом
    vi.advanceTimersByTime(1000)
    
    // В loop режиме realIndex должен быть 0
    expect(slider.realIndex).toBe(0)
    
    // Проверяем что пагинация синхронизирована с realIndex
    expect(getActiveBulletIndex(container)).toBe(slider.realIndex)

    slider.destroy()
  })

  it('should handle pagination with perPage > 1 in loop mode', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
          <div class="${TVIST_CLASSES.slide}">5</div>
          <div class="${TVIST_CLASSES.slide}">6</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      loop: true,
      perPage: 2,
      speed: 0,
      pagination: {
        type: 'bullets'
      }
    })

    // В loop режиме с 6 слайдами должно быть 6 точек
    const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    expect(bullets.length).toBe(6)

    // Проверяем что пагинация корректно обновляется при автоплее
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Несколько переходов
    for (let i = 1; i < 6; i++) {
      vi.advanceTimersByTime(1000)
      expect(slider.realIndex).toBe(i)
      expect(getActiveBulletIndex(container)).toBe(i)
    }

    // Переход с последнего на первый
    vi.advanceTimersByTime(1000)
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.destroy()
  })

  it('should handle rapid navigation in loop mode', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
          <div class="${TVIST_CLASSES.slide}">5</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
      pagination: {
        type: 'bullets'
      }
    })

    // Начинаем с индекса 0
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Быстрая последовательность: next -> next -> next -> prev -> next
    slider.next() // 0 -> 1
    expect(slider.realIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    slider.next() // 1 -> 2
    expect(slider.realIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    slider.next() // 2 -> 3
    expect(slider.realIndex).toBe(3)
    expect(getActiveBulletIndex(container)).toBe(3)

    slider.prev() // 3 -> 2
    expect(slider.realIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    slider.next() // 2 -> 3
    expect(slider.realIndex).toBe(3)
    expect(getActiveBulletIndex(container)).toBe(3)

    slider.next() // 3 -> 4
    expect(slider.realIndex).toBe(4)
    expect(getActiveBulletIndex(container)).toBe(4)

    slider.next() // 4 -> 0 (loop)
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.next() // 0 -> 1
    expect(slider.realIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    slider.prev() // 1 -> 0
    expect(slider.realIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.prev() // 0 -> 4 (loop)
    expect(slider.realIndex).toBe(4)
    expect(getActiveBulletIndex(container)).toBe(4)

    slider.destroy()
  })

  it('should keep pagination in sync after rapid scrollTo in loop mode (instant)', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
      pagination: { type: 'bullets' }
    })

    slider.scrollTo(1)
    expect(getActiveBulletIndex(container)).toBe(slider.realIndex)
    slider.scrollTo(3)
    expect(getActiveBulletIndex(container)).toBe(slider.realIndex)
    slider.scrollTo(0)
    expect(getActiveBulletIndex(container)).toBe(slider.realIndex)

    slider.destroy()
  })
})

describe('Autoplay + Pagination + Drag (no loop, rewind)', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  function getActiveBulletIndex(cont: HTMLElement): number {
    const bullets = cont.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    for (let i = 0; i < bullets.length; i++) {
      if (bullets[i].classList.contains(TVIST_CLASSES.bulletActive)) return i
    }
    return -1
  }

  it('should pause autoplay on dragStart so slide does not change during drag', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      rewind: true,
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' },
      drag: true
    })

    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Имитируем начало драга — автоплей должен встать на паузу
    slider.emit('dragStart', {} as PointerEvent)

    // Проходит больше одного интервала автоплея — без паузы слайд бы уже сменился
    vi.advanceTimersByTime(2000)
    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.emit('dragEnd', {} as PointerEvent)
    // После dragEnd snap к текущему слайду не меняет индекс,
    // поэтому transitionEnd не эмитится. Эмулируем transitionEnd для resume автоплея.
    slider.emit('transitionEnd', 0)
    // После resume автоплея ждём один интервал (1000ms) + запас
    vi.advanceTimersByTime(1500)
    expect(slider.activeIndex).toBe(1)
    expect(getActiveBulletIndex(container)).toBe(1)

    slider.destroy()
  })

  it('should keep pagination in sync after dragEnd and snap to a slide', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 2000,
      rewind: true,
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' },
      drag: true
    })

    expect(slider.activeIndex).toBe(0)

    slider.emit('dragStart', {} as PointerEvent)
    vi.advanceTimersByTime(500)
    slider.emit('dragEnd', {} as PointerEvent)
    // Имитируем snap к слайду 2
    slider.scrollTo(2)
    vi.advanceTimersByTime(50)

    expect(slider.activeIndex).toBe(2)
    expect(getActiveBulletIndex(container)).toBe(2)

    slider.destroy()
  })

  it('should clamp scrollTo(-1) to index 0 when loop is false and update pagination', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' }
    })

    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Вызов scrollTo с индексом за левой границей — Engine должен ограничить до 0
    slider.scrollTo(-1)
    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.destroy()
  })

  it('should clamp scrollTo(beyond endIndex) when loop is false and update pagination', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' }
    })

    slider.scrollTo(100)
    const endIndex = 3
    expect(slider.activeIndex).toBe(endIndex)
    expect(getActiveBulletIndex(container)).toBe(endIndex)

    slider.destroy()
  })

  /**
   * Локализация бага: на слайде 0 при драге вправо с autoplay
   * после dragEnd вызывается resume(), и таймер autoplay сразу срабатывает,
   * вызывая next() → scrollTo(1) → slideChangeEnd(1).
   * Ожидание: pause() должен очищать таймер, чтобы callback не сработал сразу после resume().
   */
  it('should stay on slide 0 after drag right when autoplay is enabled (pause must clear timer)', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 3000,
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' },
      drag: true
    })

    const slideChangedLog: number[] = []
    slider.on('slideChangeEnd', (index: number) => {
      slideChangedLog.push(index)
    })

    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Имитируем драг: dragStart → pause(), dragEnd → scrollTo(-1) + resume()
    slider.emit('dragStart')
    
    // Продвигаем время почти до срабатывания таймера (но таймер должен быть очищен в pause)
    vi.advanceTimersByTime(2900)
    
    slider.emit('dragEnd')
    slider.scrollTo(-1) // snap к -1 → clamp до 0

    // Продвигаем время на 200ms — если таймер не был очищен, он бы сработал
    vi.advanceTimersByTime(200)

    // Баг: без фикса приходит slideChangeEnd(1) от autoplay
    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    // Не должно быть slideChangeEnd(1) сразу после драга
    expect(slideChangedLog).not.toContain(1)

    slider.destroy()
  })

  /**
   * При rewind: drag на последнем слайде и snap вперёд (targetIndex > endIndex)
   * должен перемотать на первый слайд, а пагинация — обновиться.
   */
  it('should rewind to 0 when dragging forward past the last slide with rewind enabled', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">1</div>
          <div class="${TVIST_CLASSES.slide}">2</div>
          <div class="${TVIST_CLASSES.slide}">3</div>
          <div class="${TVIST_CLASSES.slide}">4</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      autoplay: 1000,
      rewind: true,
      loop: false,
      speed: 0,
      pagination: { type: 'bullets' },
      drag: true
    })

    // Переходим на последний слайд (индекс 3)
    slider.scrollTo(3)
    expect(slider.activeIndex).toBe(3)
    expect(getActiveBulletIndex(container)).toBe(3)

    // Имитируем drag и snap вперёд за последний слайд
    slider.emit('dragStart')
    slider.emit('dragEnd')
    // Snap вызывает engine.scrollTo(4); при rewind Engine перематывает на 0
    slider.scrollTo(4)

    // При rewind слайдер должен перейти на 0
    expect(slider.activeIndex).toBe(0)
    expect(getActiveBulletIndex(container)).toBe(0)

    slider.destroy()
  })
})
