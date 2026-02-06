/**
 * DOM фикстуры для тестов
 * Создание типичных HTML структур для тестирования слайдера
 */

import { TVIST_CLASSES } from '@core/constants'

/**
 * Конфигурация для создания слайдера
 */
export interface SliderFixtureConfig {
  /** Количество слайдов */
  slidesCount?: number
  /** Ширина root элемента */
  width?: number
  /** Высота root элемента */
  height?: number
  /** ID элемента */
  id?: string
  /** Дополнительные классы для root */
  rootClasses?: string[]
  /** Контент слайдов (если не указан, будет "Slide N") */
  slideContents?: string[]
  /** Дополнительные классы для слайдов */
  slideClasses?: string[]
}

/**
 * Результат создания фикстуры
 */
export interface SliderFixture {
  root: HTMLElement
  container: HTMLElement
  slides: HTMLElement[]
  cleanup: () => void
}

/**
 * Создаёт базовую структуру слайдера для тестов
 * 
 * @example
 * ```ts
 * const { root, cleanup } = createSliderFixture({ slidesCount: 5 })
 * const slider = new Tvist(root)
 * // ... тесты
 * cleanup()
 * ```
 */
export function createSliderFixture(config: SliderFixtureConfig = {}): SliderFixture {
  const {
    slidesCount = 5,
    width = 1000,
    height = 400,
    id,
    rootClasses = [],
    slideContents,
    slideClasses = [],
  } = config

  // Создаём root
  const root = document.createElement('div')
  root.className = [TVIST_CLASSES.block, ...rootClasses].join(' ')
  root.style.width = `${width}px`
  root.style.height = `${height}px`
  if (id) root.id = id

  // Создаём container
  const container = document.createElement('div')
  container.className = TVIST_CLASSES.container

  // Создаём слайды
  const slides: HTMLElement[] = []
  for (let i = 0; i < slidesCount; i++) {
    const slide = document.createElement('div')
    slide.className = [TVIST_CLASSES.slide, ...slideClasses].join(' ')
    slide.textContent = slideContents?.[i] ?? `Slide ${i + 1}`
    slide.style.width = `${width}px`
    slide.style.height = `${height}px`
    container.appendChild(slide)
    slides.push(slide)
  }

  root.appendChild(container)
  document.body.appendChild(root)

  // Мокируем offsetWidth и clientWidth для тестового окружения (happy-dom)
  Object.defineProperty(root, 'offsetWidth', {
    configurable: true,
    value: width,
  })

  Object.defineProperty(root, 'offsetHeight', {
    configurable: true,
    value: height,
  })

  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: width,
  })

  Object.defineProperty(root, 'clientHeight', {
    configurable: true,
    value: height,
  })

  Object.defineProperty(container, 'offsetWidth', {
    configurable: true,
    value: width,
  })

  Object.defineProperty(container, 'clientWidth', {
    configurable: true,
    value: width,
  })

  slides.forEach(slide => {
    Object.defineProperty(slide, 'offsetWidth', {
      configurable: true,
      value: width,
    })
    Object.defineProperty(slide, 'offsetHeight', {
      configurable: true,
      value: height,
    })
  })

  // Cleanup функция
  const cleanup = () => {
    if (root.parentNode) {
      document.body.removeChild(root)
    }
  }

  return { root, container, slides, cleanup }
}

/**
 * Создаёт минимальную структуру слайдера (без container)
 * Для тестирования обработки ошибок
 */
export function createInvalidSliderFixture(): { root: HTMLElement; cleanup: () => void } {
  const root = document.createElement('div')
  root.className = 'tvist'
  document.body.appendChild(root)

  const cleanup = () => {
    if (root.parentNode) {
      document.body.removeChild(root)
    }
  }

  return { root, cleanup }
}

/**
 * Создаёт пустой слайдер (с container но без слайдов)
 */
export function createEmptySliderFixture(): SliderFixture {
  const root = document.createElement('div')
  root.className = TVIST_CLASSES.block
  root.style.width = '1000px'

  const container = document.createElement('div')
  container.className = TVIST_CLASSES.container
  root.appendChild(container)
  document.body.appendChild(root)

  Object.defineProperty(root, 'offsetWidth', {
    configurable: true,
    value: 1000,
  })

  const cleanup = () => {
    if (root.parentNode) {
      document.body.removeChild(root)
    }
  }

  return { root, container, slides: [], cleanup }
}

/**
 * Создаёт навигационные кнопки для тестов
 */
export function createNavigationFixture(): {
  prevBtn: HTMLElement
  nextBtn: HTMLElement
  cleanup: () => void
} {
  const prevBtn = document.createElement('button')
  prevBtn.className = 'tvist-prev'
  prevBtn.textContent = 'Prev'

  const nextBtn = document.createElement('button')
  nextBtn.className = 'tvist-next'
  nextBtn.textContent = 'Next'

  document.body.appendChild(prevBtn)
  document.body.appendChild(nextBtn)

  const cleanup = () => {
    if (prevBtn.parentNode) document.body.removeChild(prevBtn)
    if (nextBtn.parentNode) document.body.removeChild(nextBtn)
  }

  return { prevBtn, nextBtn, cleanup }
}

/**
 * Создаёт пагинацию для тестов
 */
export function createPaginationFixture(bulletsCount: number = 5): {
  paginationEl: HTMLElement
  bullets: HTMLElement[]
  cleanup: () => void
} {
  const paginationEl = document.createElement('div')
  paginationEl.className = 'tvist-pagination'

  const bullets: HTMLElement[] = []
  for (let i = 0; i < bulletsCount; i++) {
    const bullet = document.createElement('button')
    bullet.className = 'tvist-pagination__bullet'
    bullet.dataset.index = String(i)
    paginationEl.appendChild(bullet)
    bullets.push(bullet)
  }

  document.body.appendChild(paginationEl)

  const cleanup = () => {
    if (paginationEl.parentNode) {
      document.body.removeChild(paginationEl)
    }
  }

  return { paginationEl, bullets, cleanup }
}

/**
 * Изменяет размеры слайдера (для тестирования resize)
 */
export function resizeSlider(root: HTMLElement, width: number, height?: number): void {
  root.style.width = `${width}px`
  if (height) {
    root.style.height = `${height}px`
  }

  Object.defineProperty(root, 'offsetWidth', {
    configurable: true,
    value: width,
  })

  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    value: width,
  })

  if (height) {
    Object.defineProperty(root, 'offsetHeight', {
      configurable: true,
      value: height,
    })

    Object.defineProperty(root, 'clientHeight', {
      configurable: true,
      value: height,
    })
  }
}

