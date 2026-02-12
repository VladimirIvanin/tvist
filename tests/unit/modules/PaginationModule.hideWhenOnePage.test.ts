/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
// Импортируем модуль через index для автоматической регистрации
import '../../../src/modules/pagination'

describe('PaginationModule - hideWhenOnePage', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // Мокаем размеры
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
  })

  describe('Basic functionality', () => {
    it('should hide pagination when hideWhenOnePage is true and there is only one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть скрыта
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
      expect(pagination?.getAttribute('aria-hidden')).toBe('true')
    })

    it('should hide pagination when perPage equals slide count', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        },
        perPage: 2
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть скрыта (все слайды помещаются на одной странице)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should show pagination when hideWhenOnePage is false even if locked', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: false // Явно отключаем автоскрытие
        },
        perPage: 3 // Все слайды на одной странице
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      const root = container.querySelector(`.${TVIST_CLASSES.block}`)

      // Слайдер заблокирован, но hideWhenOnePage: false
      expect(root?.classList.contains(TVIST_CLASSES.locked)).toBe(true)
      
      // Пагинация должна быть ВИДНА
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
      expect(pagination?.getAttribute('aria-hidden')).toBe('false')
    })

    it('should show pagination when there are multiple pages', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть видна (есть несколько страниц)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
      expect(pagination?.getAttribute('aria-hidden')).toBe('false')
    })
  })

  describe('With slidesPerGroup', () => {
    it('should hide pagination when slidesPerGroup makes it one page', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        },
        perPage: 1,
        slidesPerGroup: 3 // Листаем по 3 слайда за раз = 1 страница
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть скрыта
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should show pagination when slidesPerGroup creates multiple pages', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        },
        perPage: 1,
        slidesPerGroup: 2 // 4 слайда / 2 = 2 страницы
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть видна
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
    })
  })

  describe('With loop mode', () => {
    it('should hide pagination in loop mode when hideWhenOnePage is true and one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        },
        loop: true
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть скрыта даже в loop режиме
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should show pagination in loop mode when there are multiple pages', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: true
        },
        loop: true
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть видна
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
    })
  })

  describe('With different pagination types', () => {
    it('should hide bullets pagination when one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          type: 'bullets',
          hideWhenOnePage: true
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should hide fraction pagination when one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          type: 'fraction',
          hideWhenOnePage: true
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should hide progress pagination when one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          type: 'progress',
          hideWhenOnePage: true
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })
  })

  describe('With breakpoints', () => {
    it('should update visibility when perPage changes via breakpoints', async () => {
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
        pagination: {
          hideWhenOnePage: true
        },
        perPage: 1,
        breakpoints: {
          768: {
            perPage: 3 // На больших экранах все слайды на одной странице
          }
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Изначально пагинация видна (perPage: 1, 3 слайда = 3 страницы)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)

      // Симулируем изменение опций через breakpoint
      slider.updateOptions({ perPage: 3 })
      await Promise.resolve()

      // Теперь пагинация должна быть скрыта (perPage: 3, 3 слайда = 1 страница)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })
  })

  describe('Locked state', () => {
    it('should hide pagination when slider is locked with hideWhenOnePage: true (default)', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: true // hideWhenOnePage: true по умолчанию
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть скрыта (слайдер заблокирован + hideWhenOnePage: true)
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should show pagination when slider is locked with hideWhenOnePage: false', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          hideWhenOnePage: false
        }
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)

      // Пагинация должна быть ВИДНА
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
      expect(pagination?.getAttribute('aria-hidden')).toBe('false')
    })
  })

  describe('Integration with bullets', () => {
    it('should render correct number of bullets and hide when one page', () => {
      container.innerHTML = `
        <div class="${TVIST_CLASSES.block}">
          <div class="${TVIST_CLASSES.container}">
            <div class="${TVIST_CLASSES.slide}">1</div>
            <div class="${TVIST_CLASSES.slide}">2</div>
          </div>
          <div class="${TVIST_CLASSES.pagination}"></div>
        </div>
      `

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          type: 'bullets',
          hideWhenOnePage: true
        },
        perPage: 2
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      const bullets = pagination?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)

      // Должна быть создана 1 точка (1 страница)
      expect(bullets?.length).toBe(1)
      
      // Но пагинация скрыта
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(true)
    })

    it('should render multiple bullets and show when multiple pages', () => {
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

      new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
        pagination: {
          type: 'bullets',
          hideWhenOnePage: true
        },
        perPage: 1
      })

      const pagination = container.querySelector(`.${TVIST_CLASSES.pagination}`)
      const bullets = pagination?.querySelectorAll(`.${TVIST_CLASSES.bullet}`)

      // Должно быть создано 3 точки (3 страницы)
      expect(bullets?.length).toBe(3)
      
      // Пагинация видна
      expect(pagination?.classList.contains(TVIST_CLASSES.paginationHidden)).toBe(false)
    })
  })
})
