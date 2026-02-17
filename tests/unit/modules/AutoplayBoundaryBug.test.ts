/**
 * @vitest-environment happy-dom
 * 
 * Тест для проверки бага с transitionByAutoplay флагом на границе слайдера без loop
 * 
 * Баг: Когда autoplay пытается перейти на границе (без loop), индекс не меняется,
 * но флаг transitionByAutoplay остаётся true. Если пользователь вручную переключает
 * слайд в течение 1500ms fallback окна, slideChangeEnd неправильно считает это
 * autoplay-переходом, не вызывает cancelTimer(), и оригинальный таймер продолжает работать.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { createSliderFixture, type SliderFixture } from '../../fixtures'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/autoplay'

describe('AutoplayModule - Boundary Bug Fix', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    vi.useFakeTimers()
    fixture = createSliderFixture({ slidesCount: 3 }) // 3 слайда, без loop
  })

  afterEach(() => {
    slider?.destroy()
    fixture.cleanup()
    vi.restoreAllMocks()
  })

  it('should clear transitionByAutoplay flag when autoplay hits boundary without loop', async () => {
    slider = new Tvist(fixture.root, {
      autoplay: {
        enabled: true,
        delay: 1000,
      },
      loop: false, // Важно: без loop
      speed: 300,
    })

    // Переходим к последнему слайду
    slider.scrollTo(2)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(2))

    // Получаем модуль autoplay
    const autoplayModule = slider['modules'].get('autoplay') as any
    expect(autoplayModule).toBeDefined()

    // Ждём, пока autoplay попытается перейти дальше (на границе)
    vi.advanceTimersByTime(1000)

    // Проверяем, что индекс не изменился (остались на последнем слайде)
    expect(slider.activeIndex).toBe(2)

    // КРИТИЧЕСКАЯ ПРОВЕРКА: флаг transitionByAutoplay должен быть сброшен
    // т.к. переход не произошёл (граница без loop)
    expect(autoplayModule.transitionByAutoplay).toBe(false)

    // Теперь пользователь вручную переходит к первому слайду
    const timerBeforeManualNav = autoplayModule.timer
    slider.scrollTo(0)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(0))

    // Проверяем, что таймер был сброшен (cancelTimer был вызван)
    // т.к. это ручная навигация, а не autoplay
    expect(autoplayModule.timer).not.toBe(timerBeforeManualNav)
  })

  it('should reset autoplay timer correctly after manual navigation from boundary', async () => {
    slider = new Tvist(fixture.root, {
      autoplay: {
        enabled: true,
        delay: 1000,
      },
      loop: false,
      speed: 300,
    })

    // Переходим к последнему слайду
    slider.scrollTo(2)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(2))

    // Ждём, пока autoplay попытается перейти дальше (на границе)
    // После boundary attempt, run() вызывается рекурсивно, запуская новый таймер
    vi.advanceTimersByTime(1000)
    expect(slider.activeIndex).toBe(2)

    // Сразу после boundary attempt (в пределах 100ms) пользователь вручную переходит
    vi.advanceTimersByTime(100)
    
    slider.scrollTo(0)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(0))

    // Проверяем, что таймер был сброшен и запущен заново с полным delay
    // Ждём почти полный delay (900ms из 1000ms)
    vi.advanceTimersByTime(900)
    expect(slider.activeIndex).toBe(0) // Ещё на первом слайде

    // После полного delay должен произойти переход
    vi.advanceTimersByTime(100)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(1))
  })

  it('should handle multiple boundary attempts correctly', async () => {
    slider = new Tvist(fixture.root, {
      autoplay: {
        enabled: true,
        delay: 500,
      },
      loop: false,
      speed: 300,
    })

    // Переходим к последнему слайду
    slider.scrollTo(2)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(2))

    const autoplayModule = slider['modules'].get('autoplay') as any

    // Первая попытка autoplay на границе
    vi.advanceTimersByTime(500)
    expect(slider.activeIndex).toBe(2)
    expect(autoplayModule.transitionByAutoplay).toBe(false)

    // Вторая попытка autoplay на границе
    vi.advanceTimersByTime(500)
    expect(slider.activeIndex).toBe(2)
    expect(autoplayModule.transitionByAutoplay).toBe(false)

    // Третья попытка autoplay на границе
    vi.advanceTimersByTime(500)
    expect(slider.activeIndex).toBe(2)
    expect(autoplayModule.transitionByAutoplay).toBe(false)

    // Ручная навигация должна работать корректно
    slider.scrollTo(0)
    vi.advanceTimersByTime(300)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(0))

    // Autoplay должен продолжить работу с правильным интервалом
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => expect(slider.activeIndex).toBe(1))
  })
})
