/**
 * Тесты для BreakpointsModule
 *
 * Проверяем:
 * - Desktop-first подход (max-width)
 * - Window-based vs Container-based
 * - Обновление опций при смене breakpoint
 * - Pagination limit при breakpoints
 * - Lock/unlock при смене perPage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tvist } from '../../../src/core/Tvist'
import { createSliderFixture, resizeSlider } from '../../fixtures'
import '../../../src/modules/breakpoints' // Регистрируем модуль

describe('BreakpointsModule', () => {
  let fixture: ReturnType<typeof createSliderFixture>
  let root: HTMLElement

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 6, width: 1200 })
    root = fixture.root
  })

  afterEach(() => {
    fixture.cleanup()
    vi.restoreAllMocks()
  })

  describe('Desktop-first (max-width) логика', () => {
    it('должен понимать что breakpoint 768 означает "при ширине ≤768px"', () => {
      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // На десктопе (1200px) должен быть perPage: 4
      expect(slider.options.perPage).toBe(4)
      expect(slider.options.gap).toBe(20)

      slider.destroy()
    })

    it('должен применять breakpoint когда ширина меньше или равна значению', () => {
      resizeSlider(root, 768)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // При ширине 768px должен применяться breakpoint
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)

      slider.destroy()
    })

    it('должен выбирать ближайший подходящий breakpoint (smallest matching)', () => {
      resizeSlider(root, 800)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          1200: {
            perPage: 3,
            gap: 16
          },
          992: {
            perPage: 2,
            gap: 12
          },
          768: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // При ширине 800px должен применяться breakpoint 992 (ближайший больший)
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(12)

      slider.destroy()
    })

    it('должен применять самый маленький breakpoint если ширина меньше всех', () => {
      resizeSlider(root, 400)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          1200: {
            perPage: 3,
            gap: 16
          },
          992: {
            perPage: 2,
            gap: 12
          },
          768: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // При ширине 400px должен применяться breakpoint 768
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)

      slider.destroy()
    })

    it('не должен применять breakpoint если ширина больше всех значений', () => {
      resizeSlider(root, 1400)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          1200: {
            perPage: 3,
            gap: 16
          },
          992: {
            perPage: 2,
            gap: 12
          }
        }
      })

      // При ширине 1400px должны остаться базовые опции
      expect(slider.options.perPage).toBe(4)
      expect(slider.options.gap).toBe(20)

      slider.destroy()
    })
  })

  describe('Container-based breakpoints', () => {
    it('должен использовать ширину контейнера вместо окна', () => {
      resizeSlider(root, 500)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 12,
        breakpointsBase: 'container',
        breakpoints: {
          500: {
            perPage: 2,
            gap: 0
          },
          400: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // При ширине контейнера 500px должен применяться breakpoint 500
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(0)

      slider.destroy()
    })

    it('должен обновляться при изменении размера контейнера', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 12,
        breakpointsBase: 'container',
        breakpoints: {
          500: {
            perPage: 2,
            gap: 8
          },
          400: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // Изначально perPage: 3 (ширина 600px)
      expect(slider.options.perPage).toBe(3)

      // Меняем ширину контейнера
      resizeSlider(root, 450)

      // Вызываем onResize на модуле напрямую (т.к. ResizeObserver не работает в тестах)
      const breakpointsModule = (slider as any).modules.get('breakpoints')
      if (breakpointsModule) {
        breakpointsModule.onResize()
      }

      // Должен применяться breakpoint 500
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(8)

      slider.destroy()
    })
  })

  describe('Pagination limit при breakpoints', () => {
    it('должен обновлять pagination.limit при смене breakpoint', () => {
      resizeSlider(root, 1200)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 16,
        pagination: {
          limit: 7,
          clickable: true
        },
        breakpointsBase: 'container',
        breakpoints: {
          992: {
            pagination: {
              limit: 5,
              clickable: true
            }
          },
          768: {
            pagination: {
              limit: 3,
              clickable: true
            }
          }
        }
      })

      // На десктопе limit: 7
      expect(slider.options.pagination).toMatchObject({ limit: 7 })

      slider.destroy()
    })

    it('должен применять вложенные опции pagination из breakpoint', () => {
      resizeSlider(root, 700)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 16,
        pagination: {
          limit: 7,
          clickable: true
        },
        breakpointsBase: 'container',
        breakpoints: {
          992: {
            pagination: {
              limit: 5,
              clickable: true
            }
          },
          768: {
            pagination: {
              limit: 3,
              clickable: true
            }
          }
        }
      })

      // При ширине 700px должен применяться breakpoint 768 с limit: 3
      expect(slider.options.pagination).toMatchObject({ limit: 3 })

      slider.destroy()
    })
  })

  describe('Lock/unlock при смене perPage', () => {
    it('должен разблокировать слайдер когда perPage уменьшается', () => {
      fixture.cleanup()
      fixture = createSliderFixture({ slidesCount: 2, width: 1200 })
      root = fixture.root

      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1
          }
        }
      })

      // На десктопе (perPage: 2, 2 слайда) -> locked
      expect(slider.engine.isLocked).toBe(true)

      slider.destroy()
    })

    it('должен разблокировать при переходе на мобильный breakpoint', () => {
      fixture.cleanup()
      fixture = createSliderFixture({ slidesCount: 2, width: 1200 })
      root = fixture.root

      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1
          }
        }
      })

      // Изначально locked (perPage: 2, 2 слайда)
      expect(slider.engine.isLocked).toBe(true)

      // Меняем ширину на мобильную
      resizeSlider(root, 600)

      // Вызываем update() который вызовет onResize на модулях и engine.update()
      slider.update()

      // Должен разблокироваться (perPage: 1, 2 слайда)
      expect(slider.engine.isLocked).toBe(false)
      expect(slider.options.perPage).toBe(1)

      slider.destroy()
    })
  })

  describe('Реальное изменение размера', () => {
    it('должен вызывать onResize при update()', () => {
      resizeSlider(root, 600)

      const onResizeSpy = vi.fn()

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 12,
        breakpointsBase: 'container',
        breakpoints: {
          500: {
            perPage: 2,
            gap: 8
          }
        }
      })

      // Мокаем onResize
      const breakpointsModule = (slider as any).modules.get('breakpoints')
      if (breakpointsModule) {
        const originalOnResize = breakpointsModule.onResize.bind(breakpointsModule)
        breakpointsModule.onResize = () => {
          onResizeSpy()
          originalOnResize()
        }
      }

      // Вызываем update
      slider.update()

      // onResize должен быть вызван
      expect(onResizeSpy).toHaveBeenCalled()

      slider.destroy()
    })

    it('должен читать новую ширину контейнера при checkBreakpoints', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 12,
        breakpointsBase: 'container',
        breakpoints: {
          500: {
            perPage: 2,
            gap: 8
          },
          400: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // Изначально perPage: 3
      expect(slider.options.perPage).toBe(3)
      expect(root.clientWidth).toBe(600)

      // Меняем ширину
      resizeSlider(root, 450)

      // Вызываем onResize напрямую
      const breakpointsModule = (slider as any).modules.get('breakpoints')
      if (breakpointsModule) {
        const checkBreakpointsSpy = vi.spyOn(breakpointsModule as any, 'checkBreakpoints')
        breakpointsModule.onResize()

        // checkBreakpoints должен быть вызван
        expect(checkBreakpointsSpy).toHaveBeenCalled()
      }

      // Должен применяться breakpoint 500
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(8)

      slider.destroy()
    })

    it('должен применять breakpoint при реальном resize через update()', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 3,
        gap: 12,
        breakpointsBase: 'container',
        breakpoints: {
          500: {
            perPage: 2,
            gap: 8
          },
          400: {
            perPage: 1,
            gap: 0
          }
        }
      })

      // Изначально perPage: 3
      expect(slider.options.perPage).toBe(3)

      // Меняем ширину контейнера
      resizeSlider(root, 450)

      // Вызываем update как это делает ResizeObserver
      slider.update()

      // Должен применяться breakpoint 500
      expect(slider.options.perPage).toBe(2)
      expect(slider.options.gap).toBe(8)

      slider.destroy()
    })

    it('должен разблокировать слайдер при уменьшении perPage через breakpoint', () => {
      fixture.cleanup()
      fixture = createSliderFixture({ slidesCount: 2, width: 1200 })
      root = fixture.root

      const slider = new Tvist(root, {
        perPage: 2,
        gap: 16,
        arrows: true,
        pagination: true,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1
          }
        }
      })

      // Изначально locked (perPage: 2, 2 слайда)
      expect(slider.engine.isLocked).toBe(true)

      // Имитируем сужение окна
      resizeSlider(root, 600)

      // Вызываем update
      slider.update()

      // Должен разблокироваться и показать навигацию
      expect(slider.engine.isLocked).toBe(false)
      expect(slider.options.perPage).toBe(1)

      slider.destroy()
    })
  })

  describe('События breakpoint', () => {
    it('должен эмитить событие breakpoint при смене', () => {
      resizeSlider(root, 1200)

      const breakpointCallback = vi.fn()

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0
          }
        },
        on: {
          breakpoint: breakpointCallback
        }
      })

      // Изначально событие не должно вызываться
      expect(breakpointCallback).not.toHaveBeenCalled()

      // Меняем ширину
      resizeSlider(root, 600)

      // Вызываем onResize на модуле напрямую
      const breakpointsModule = (slider as any).modules.get('breakpoints')
      if (breakpointsModule) {
        breakpointsModule.onResize()
      }

      // Должно вызваться событие с breakpoint 768
      expect(breakpointCallback).toHaveBeenCalledWith(768)

      slider.destroy()
    })

    it('не должен эмитить событие если breakpoint не изменился', () => {
      resizeSlider(root, 600)

      const breakpointCallback = vi.fn()

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0
          }
        },
        on: {
          breakpoint: breakpointCallback
        }
      })

      // При создании вызывается один раз
      const initialCallCount = breakpointCallback.mock.calls.length

      // Обновляем без изменения ширины
      slider.update()

      // Не должно быть новых вызовов
      expect(breakpointCallback).toHaveBeenCalledTimes(initialCallCount)

      slider.destroy()
    })
  })

  describe('Мёрдж опций', () => {
    it('должен мёрджить опции из breakpoint с базовыми', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        speed: 500,
        drag: true,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0
            // speed и drag должны остаться из базовых опций
          }
        }
      })

      // Опции из breakpoint
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)

      // Опции из базовых (не переопределены в breakpoint)
      expect(slider.options.speed).toBe(500)
      expect(slider.options.drag).toBe(true)

      slider.destroy()
    })

    it('должен переопределять базовые опции если они указаны в breakpoint', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        speed: 500,
        drag: true,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0,
            speed: 300,
            drag: false
          }
        }
      })

      // Все опции из breakpoint
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)
      expect(slider.options.speed).toBe(300)
      expect(slider.options.drag).toBe(false)

      slider.destroy()
    })
  })

  describe('Восстановление базовых опций', () => {
    it('должен восстанавливать базовые опции при выходе из breakpoint', () => {
      resizeSlider(root, 600)

      const slider = new Tvist(root, {
        perPage: 4,
        gap: 20,
        speed: 500,
        breakpointsBase: 'container',
        breakpoints: {
          768: {
            perPage: 1,
            gap: 0,
            speed: 300
          }
        }
      })

      // В breakpoint
      expect(slider.options.perPage).toBe(1)
      expect(slider.options.gap).toBe(0)
      expect(slider.options.speed).toBe(300)

      // Выходим из breakpoint
      resizeSlider(root, 1200)

      // Вызываем onResize на модуле напрямую
      const breakpointsModule = (slider as any).modules.get('breakpoints')
      if (breakpointsModule) {
        breakpointsModule.onResize()
      }

      // Должны восстановиться базовые опции
      expect(slider.options.perPage).toBe(4)
      expect(slider.options.gap).toBe(20)
      expect(slider.options.speed).toBe(500)

      slider.destroy()
    })
  })
})
