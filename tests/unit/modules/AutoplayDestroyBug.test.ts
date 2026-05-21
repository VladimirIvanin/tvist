/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../../src/modules/autoplay'
import '../../../src/modules/loop'

describe('AutoplayModule - Destroy Bug', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should not restart autoplay timer when destroyed with loop enabled', () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.track}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
            <div class="${TVIST_CLASSES.slide}">3</div>
          </div>
        </div>
      </div>
    `

    const root = container.querySelector(`.${TVIST_CLASSES.block}`) as HTMLElement

    // Инициализируем слайдер с loop и autoplay
    const slider = new Tvist(root, {
      loop: true,
      autoplay: { delay: 1000 }
    })

    expect(slider.activeIndex).toBe(0)

    // Вызываем destroy()
    slider.destroy()

    // В старом коде LoopModule.destroy() вызывал scrollTo(..., true),
    // что триггерило slideChangeEnd, который перезапускал таймер автоплея.
    // Если таймер перезапустился, то через 1000мс он вызовет slider.next().
    // Но так как слайдер уничтожен, он не должен ничего делать.
    // Однако, чтобы проверить, что таймер реально не запустился, мы можем
    // замокать window.setTimeout или проверить, что slider.next не вызывается.

    // Для надежности создадим новый слайдер на том же элементе, как это делает пользователь
    const slider2 = new Tvist(root, {
      loop: true,
      autoplay: { delay: 5000 }
    })

    expect(slider2.activeIndex).toBe(0)

    // Проматываем время на 1000мс.
    // Если старый таймер остался, он сработает и вызовет next() на СТАРОМ инстансе,
    // что приведет к смещению DOM-элементов и рассинхрону.
    // В нашем тесте мы просто проверим, что у старого слайдера не вызывается next().
    
    // Но еще проще: мы можем зашпионить за методом next() старого слайдера
    const nextSpy = vi.spyOn(slider, 'next')
    
    vi.advanceTimersByTime(1500)
    
    // Старый слайдер не должен вызывать next() после своего destroy
    expect(nextSpy).not.toHaveBeenCalled()
    
    // Новый слайдер тоже не должен переключиться, так как его задержка 5000мс
    expect(slider2.activeIndex).toBe(0)

    slider2.destroy()
  })
})
