/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/pagination'

describe('PaginationModule', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Bullets pagination', () => {
    it('should create correct number of bullets when perPage > 1', () => {
      // 6 слайдов, perPage: 4 → должно быть 3 точки (6 - 4 + 1 = 3)
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
        perPage: 4,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bullets.length).toBe(3)
    })

    it('should create correct number of bullets when perPage = 1', () => {
      // 5 слайдов, perPage: 1 → должно быть 5 точек
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
        perPage: 1,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      expect(bullets.length).toBe(5)
    })

    it('should create correct number of bullets for various perPage values', () => {
      const testCases = [
        { slides: 10, perPage: 3, expected: 8 }, // 10 - 3 + 1 = 8
        { slides: 6, perPage: 2, expected: 5 },  // 6 - 2 + 1 = 5
        { slides: 7, perPage: 3, expected: 5 },  // 7 - 3 + 1 = 5
        { slides: 8, perPage: 4, expected: 5 },  // 8 - 4 + 1 = 5
      ]

      testCases.forEach(({ slides, perPage, expected }) => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: slides }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage,
          pagination: {
            type: 'bullets',
            clickable: true
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(expected)
      })
    })

    it('should activate correct bullet based on current page', async () => {
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
        perPage: 3,
        speed: 0, // Отключаем анимацию для тестов
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      
      // Изначально активна первая точка (index 0)
      expect(bullets[0].classList.contains('active')).toBe(true)
      expect(bullets[1].classList.contains('active')).toBe(false)

      // Переходим к слайду 1 (вторая позиция). Ждём slideChange (эмитится сразу при scrollTo)
      await new Promise<void>(resolve => {
        slider.on('slideChange', () => resolve())
        slider.scrollTo(1)
      })
      
      expect(bullets[0].classList.contains('active')).toBe(false)
      expect(bullets[1].classList.contains('active')).toBe(true)
    })

    it('should navigate to correct slide when clicking bullet', () => {
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
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)
      
      // Клик по последней точке должен перейти к endIndex (2)
      // endIndex = 6 - 4 = 2
      bullets[2].click()
      expect(slider.activeIndex).toBe(2)

      // Клик по первой точке должен вернуть к слайду 0
      bullets[0].click()
      expect(slider.activeIndex).toBe(0)
    })
  })

  describe('Fraction pagination', () => {
    it('should show correct page numbers with perPage > 1', () => {
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
        perPage: 4,
        pagination: {
          type: 'fraction'
        }
      })

      const current = container.querySelector(`.${TVIST_CLASSES.paginationCurrent}`)
      const total = container.querySelector(`.${TVIST_CLASSES.paginationTotal}`)

      expect(current?.textContent).toBe('1')
      expect(total?.textContent).toBe('3') // 6 - 4 + 1 = 3 позиции
    })
  })

  describe('Progress pagination', () => {
    it('should calculate progress based on valid positions', async () => {
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
        perPage: 3,
        speed: 0, // Отключаем анимацию
        pagination: {
          type: 'progress'
        }
      })

      let progressBar = container.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`)

      // Первая позиция (1/4) = 25% (6-3+1=4 позиции: 0,1,2,3)
      expect(progressBar?.style.width).toBe('25%')

      // Переходим к слайду 3 (последняя позиция, 4/4) = 100%. Ждём slideChange (эмитится сразу при scrollTo)
      await new Promise<void>(resolve => {
        slider.on('slideChange', () => resolve())
        slider.scrollTo(3)
      })
      
      progressBar = container.querySelector<HTMLElement>(`.${TVIST_CLASSES.paginationProgressBar}`)
      expect(progressBar?.style.width).toBe('100%')
    })
  })

  describe('Bullets limit', () => {
    describe('Even strategy', () => {
      it('should create limited bullets with even distribution (10 slides, limit 5)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 5,
            strategy: 'even'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(5)
        
        // Каждая точка должна представлять 2 слайда (10/5=2)
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('1')
        expect(bullets[4].getAttribute('data-group-start')).toBe('8')
        expect(bullets[4].getAttribute('data-group-end')).toBe('9')
      })

      it('should handle remainder with center strategy (7 slides, limit 2)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 7 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 2,
            strategy: 'even',
            remainderStrategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(2)
        
        // 7/2=3 с остатком 1, центр получает остаток: [3, 4]
        // При 2 точках с ceil остаток идет во вторую точку (startOffset = ceil((2-1)/2) = 1)
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('2')
        expect(bullets[1].getAttribute('data-group-start')).toBe('3')
        expect(bullets[1].getAttribute('data-group-end')).toBe('6')
      })

      it('should handle remainder with left strategy (7 slides, limit 2)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 7 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 2,
            strategy: 'even',
            remainderStrategy: 'left'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(2)
        
        // 7/2=3 с остатком 1, левая получает остаток: [4, 3]
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('3')
        expect(bullets[1].getAttribute('data-group-start')).toBe('4')
        expect(bullets[1].getAttribute('data-group-end')).toBe('6')
      })

      it('should handle remainder with center strategy (10 slides, limit 3)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 3,
            strategy: 'even',
            remainderStrategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(3)
        
        // 10/3=3 с остатком 1, центр получает остаток: [3, 4, 3]
        // startOffset = floor((3-1)/2) = 1, центральная точка (индекс 1) получает остаток
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('2')
        expect(bullets[1].getAttribute('data-group-start')).toBe('3')
        expect(bullets[1].getAttribute('data-group-end')).toBe('6')
        expect(bullets[2].getAttribute('data-group-start')).toBe('7')
        expect(bullets[2].getAttribute('data-group-end')).toBe('9')
      })

      it('should handle remainder with right strategy (7 slides, limit 2)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 7 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 2,
            strategy: 'even',
            remainderStrategy: 'right'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(2)
        
        // 7/2=3 с остатком 1, правая получает остаток: [3, 4]
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('2')
        expect(bullets[1].getAttribute('data-group-start')).toBe('3')
        expect(bullets[1].getAttribute('data-group-end')).toBe('6')
      })

      it('should activate correct bullet based on slide index', async () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          speed: 0,
          pagination: {
            type: 'bullets',
            limit: 5,
            strategy: 'even'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        
        // Изначально активна первая точка (slides 0-1)
        expect(bullets[0].classList.contains('active')).toBe(true)
        
        // Переходим к слайду 2 - должна активироваться вторая точка (slides 2-3)
        await new Promise<void>(resolve => {
          slider.on('slideChange', () => resolve())
          slider.scrollTo(2)
        })
        expect(bullets[0].classList.contains('active')).toBe(false)
        expect(bullets[1].classList.contains('active')).toBe(true)

        // Переходим к слайду 3 - все еще вторая точка
        await new Promise<void>(resolve => {
          slider.on('slideChange', () => resolve())
          slider.scrollTo(3)
        })
        expect(bullets[1].classList.contains('active')).toBe(true)

        // Переходим к слайду 4 - третья точка (slides 4-5)
        await new Promise<void>(resolve => {
          slider.on('slideChange', () => resolve())
          slider.scrollTo(4)
        })
        expect(bullets[1].classList.contains('active')).toBe(false)
        expect(bullets[2].classList.contains('active')).toBe(true)
      })

      it('should work with perPage > 1', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 12 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 2,
          pagination: {
            type: 'bullets',
            limit: 5,
            strategy: 'even'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        // 12 слайдов, perPage=2 → 11 позиций (12-2+1=11)
        // limit=5 → 5 точек
        expect(bullets.length).toBe(5)
      })
    })

    describe('Center strategy', () => {
      it('should create limited bullets with center distribution (10 slides, limit 5)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 5,
            strategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(5)
        
        // Первая точка - первый слайд
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('0')
        
        // Последняя точка - последний слайд
        expect(bullets[4].getAttribute('data-group-start')).toBe('9')
        expect(bullets[4].getAttribute('data-group-end')).toBe('9')
      })

      it('should handle center distribution (7 slides, limit 3)', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 7 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 3,
            strategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(3)
        
        // Первая точка - слайд 0
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('0')
        
        // Центральная точка - слайды 1-5 (5 слайдов)
        expect(bullets[1].getAttribute('data-group-start')).toBe('1')
        expect(bullets[1].getAttribute('data-group-end')).toBe('5')
        
        // Последняя точка - слайд 6
        expect(bullets[2].getAttribute('data-group-start')).toBe('6')
        expect(bullets[2].getAttribute('data-group-end')).toBe('6')
      })

      it('should activate correct bullet in center strategy', async () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          speed: 0,
          pagination: {
            type: 'bullets',
            limit: 5,
            strategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        
        // Слайд 0 - первая точка
        expect(bullets[0].classList.contains('active')).toBe(true)
        
        // Переходим к слайду 1 - должна активироваться вторая точка (центральная группа)
        await new Promise<void>(resolve => {
          slider.on('slideChange', () => resolve())
          slider.scrollTo(1)
        })
        expect(bullets[0].classList.contains('active')).toBe(false)
        expect(bullets[1].classList.contains('active')).toBe(true)

        // Переходим к слайду 9 (последний) - последняя точка
        await new Promise<void>(resolve => {
          slider.on('slideChange', () => resolve())
          slider.scrollTo(9)
        })
        expect(bullets[1].classList.contains('active')).toBe(false)
        expect(bullets[4].classList.contains('active')).toBe(true)
      })

      it('should handle limit=2 with center strategy', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 2,
            strategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(2)
        
        // Первая точка - слайды 0-4
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('4')
        
        // Вторая точка - слайды 5-9
        expect(bullets[1].getAttribute('data-group-start')).toBe('5')
        expect(bullets[1].getAttribute('data-group-end')).toBe('9')
      })

      it('should handle limit=1 with center strategy', () => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage: 1,
          pagination: {
            type: 'bullets',
            limit: 1,
            strategy: 'center'
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(1)
        
        // Одна точка - все слайды
        expect(bullets[0].getAttribute('data-group-start')).toBe('0')
        expect(bullets[0].getAttribute('data-group-end')).toBe('9')
      })
    })

    it('should not use limit when limit >= total slides', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            ${Array.from({ length: 5 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 1,
        pagination: {
          type: 'bullets',
          limit: 10 // больше чем слайдов
        }
      })

      const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
      // Должно быть 5 точек, не используя limit
      expect(bullets.length).toBe(5)
    })

    it('should click bullet and navigate to group start', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            ${Array.from({ length: 10 }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        perPage: 1,
        speed: 0,
        pagination: {
          type: 'bullets',
          limit: 5,
          strategy: 'even'
        }
      })

      const bullets = container.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)
      
      // Клик по третьей точке (slides 4-5) должен перейти к слайду 4
      bullets[2].click()
      expect(slider.activeIndex).toBe(4)

      // Клик по последней точке (slides 8-9) должен перейти к слайду 8
      bullets[4].click()
      expect(slider.activeIndex).toBe(8)
    })
  })

  describe('EndIndex logic', () => {
    it('should not allow scrolling beyond endIndex when perPage > 1', async () => {
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
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      // endIndex должен быть 2 (6 - 4 = 2)
      // Попытка перейти к индексу 5 должна ограничиться до 2. Ждём slideChange (эмитится сразу при scrollTo)
      await new Promise<void>(resolve => {
        slider.on('slideChange', () => resolve())
        slider.scrollTo(5)
      })

      expect(slider.activeIndex).toBe(2)
    })

    it('should navigate to endIndex when clicking last pagination bullet', () => {
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
        perPage: 4,
        speed: 0,
        pagination: {
          type: 'bullets',
          clickable: true
        }
      })

      const bullets = container.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.bullet}`)
      
      // Должно быть 3 точки (6 - 4 + 1 = 3)
      expect(bullets.length).toBe(3)

      // Клик по последней точке должен перейти к endIndex (2)
      bullets[bullets.length - 1].click()
      expect(slider.activeIndex).toBe(2) // endIndex = 6 - 4 = 2
    })

    it('should show correct number of bullets for edge cases', () => {
      const testCases = [
        { slides: 5, perPage: 3, expectedBullets: 3, endIndex: 2 }, // 5-3+1=3
        { slides: 7, perPage: 4, expectedBullets: 4, endIndex: 3 }, // 7-4+1=4
        { slides: 10, perPage: 3, expectedBullets: 8, endIndex: 7 }, // 10-3+1=8
      ]

      testCases.forEach(({ slides, perPage, expectedBullets, endIndex }) => {
        container.innerHTML = `
          <div class="${TVIST_CLASSES.block}">
            <div class="${TVIST_CLASSES.container}">
              ${Array.from({ length: slides }, (_, i) => `<div class="${TVIST_CLASSES.slide}">${i + 1}</div>`).join('')}
            </div>
            <div class="${TVIST_CLASSES.pagination}"></div>
          </div>
        `

        const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
          perPage,
          speed: 0,
          pagination: {
            type: 'bullets',
            clickable: true
          }
        })

        const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
        expect(bullets.length).toBe(expectedBullets)

        // Проверяем что нельзя перейти дальше endIndex
        slider.scrollTo(slides - 1)
        expect(slider.activeIndex).toBe(endIndex)
      })
    })
  })
})
