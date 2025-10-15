# 🧪 Тестовые фикстуры и моки

Готовые утилиты для упрощения написания тестов Tvist.

## 📦 Структура

```
fixtures/
├── dom.ts       # DOM фикстуры (создание слайдеров, кнопок, пагинации)
├── events.ts    # Хелперы для событий (drag, click, resize)
├── mocks.ts     # Глобальные моки (RAF, performance, console)
└── index.ts     # Общий экспорт
```

## 🎯 DOM Фикстуры

### `createSliderFixture()`

Создаёт полную структуру слайдера для тестов.

```ts
import { createSliderFixture } from '../fixtures'

describe('MyTest', () => {
  it('should work', () => {
    const { root, container, slides, cleanup } = createSliderFixture({
      slidesCount: 5,
      width: 1000,
      height: 400,
      id: 'test-slider'
    })

    const slider = new Tvist(root)
    
    // ... тесты
    
    cleanup() // Не забываем очистить!
  })
})
```

**Параметры:**
- `slidesCount` - количество слайдов (по умолчанию 5)
- `width` - ширина слайдера (по умолчанию 1000)
- `height` - высота слайдера (по умолчанию 400)
- `id` - ID элемента (опционально)
- `rootClasses` - дополнительные классы для root
- `slideContents` - кастомный контент слайдов
- `slideClasses` - дополнительные классы для слайдов

### `createNavigationFixture()`

Создаёт навигационные кнопки.

```ts
const { prevBtn, nextBtn, cleanup } = createNavigationFixture()

const slider = new Tvist(root, {
  navigation: {
    prevEl: prevBtn,
    nextEl: nextBtn,
  }
})
```

### `createPaginationFixture()`

Создаёт пагинацию.

```ts
const { paginationEl, bullets, cleanup } = createPaginationFixture(5)

const slider = new Tvist(root, {
  pagination: {
    el: paginationEl,
  }
})
```

### `resizeSlider()`

Изменяет размеры слайдера (для тестирования resize).

```ts
const { root, cleanup } = createSliderFixture({ width: 1000 })
const slider = new Tvist(root)

resizeSlider(root, 1200) // Изменяем ширину на 1200px
slider.update()
```

## 🎮 Хелперы событий

### `simulateDrag()`

Эмулирует полную последовательность drag событий.

```ts
import { simulateDrag, waitForAnimation } from '../fixtures'

await simulateDrag({
  element: slider.container,
  startX: 200,
  deltaX: -150, // драг влево на 150px
  steps: 5,     // 5 промежуточных move событий
  type: 'mouse' // или 'touch'
})

await waitForAnimation(300) // Ждём завершения анимации
```

### `createMouseEvent()` / `createTouchEvent()`

Создают отдельные события.

```ts
import { createMouseEvent } from '../fixtures'

const event = createMouseEvent('mousedown', {
  clientX: 100,
  clientY: 200
})

element.dispatchEvent(event)
```

### `simulateResize()`

Эмулирует изменение размера окна.

```ts
await simulateResize(1200, 800) // width: 1200, height: 800
```

### `waitForAnimation()`

Ждёт завершения анимации.

```ts
slider.next()
await waitForAnimation(300) // duration + 100ms буфер
expect(slider.activeIndex).toBe(1)
```

### `waitForFrame()` / `waitForFrames()`

Ждёт RAF кадры.

```ts
await waitForFrame() // Ждём 1 кадр
await waitForFrames(3) // Ждём 3 кадра
```

## 🎭 Глобальные моки

### `mockRAF()`

Мокирует requestAnimationFrame для синхронного выполнения.

```ts
import { mockRAF, restoreRAF } from '../fixtures'

beforeEach(() => {
  mockRAF()
})

afterEach(() => {
  restoreRAF()
})
```

### `mockConsole()`

Мокирует console методы.

```ts
import { mockConsole } from '../fixtures'

it('should warn', () => {
  const { warn } = mockConsole()
  
  // код, который должен вызвать warning
  
  expect(warn).toHaveBeenCalledWith('Expected warning')
})
```

### `mockIntersectionObserver()` / `mockResizeObserver()`

Мокируют современные браузерные API.

```ts
import { mockIntersectionObserver } from '../fixtures'

beforeEach(() => {
  mockIntersectionObserver()
})
```

## 📝 Примеры использования

### Базовый тест

```ts
import { describe, it, expect } from 'vitest'
import { createSliderFixture } from '../fixtures'
import { Tvist } from '@/core/Tvist'

describe('Basic test', () => {
  it('should initialize', () => {
    const { root, cleanup } = createSliderFixture()
    const slider = new Tvist(root)
    
    expect(slider.slides).toHaveLength(5)
    
    cleanup()
  })
})
```

### Тест с drag

```ts
import { describe, it, expect } from 'vitest'
import { createSliderFixture, simulateDrag, waitForAnimation } from '../fixtures'
import { Tvist } from '@/core/Tvist'

describe('Drag test', () => {
  it('should handle drag', async () => {
    const { root, container, cleanup } = createSliderFixture()
    const slider = new Tvist(root, { drag: true })
    
    await simulateDrag({
      element: container,
      startX: 200,
      deltaX: -150,
    })
    
    await waitForAnimation()
    
    expect(slider.activeIndex).toBe(1)
    
    cleanup()
  })
})
```

### Тест с навигацией

```ts
import { describe, it, expect } from 'vitest'
import { 
  createSliderFixture, 
  createNavigationFixture,
  simulateClick 
} from '../fixtures'
import { Tvist } from '@/core/Tvist'

describe('Navigation test', () => {
  it('should navigate on button click', () => {
    const sliderFixture = createSliderFixture()
    const navFixture = createNavigationFixture()
    
    const slider = new Tvist(sliderFixture.root, {
      navigation: {
        prevEl: navFixture.prevBtn,
        nextEl: navFixture.nextBtn,
      }
    })
    
    simulateClick(navFixture.nextBtn)
    expect(slider.activeIndex).toBe(1)
    
    sliderFixture.cleanup()
    navFixture.cleanup()
  })
})
```

### Тест с событиями

```ts
import { describe, it, expect, vi } from 'vitest'
import { createSliderFixture } from '../fixtures'
import { Tvist } from '@/core/Tvist'

describe('Events test', () => {
  it('should emit events', () => {
    const { root, cleanup } = createSliderFixture()
    const onMove = vi.fn()
    
    const slider = new Tvist(root, {
      on: {
        move: onMove
      }
    })
    
    slider.next()
    
    expect(onMove).toHaveBeenCalled()
    
    cleanup()
  })
})
```

## 🎪 Глобальные моки в setup.ts

Следующие моки доступны автоматически во всех тестах:

- ✅ `IntersectionObserver` - для Autoplay
- ✅ `ResizeObserver` - для responsive
- ✅ `matchMedia` - для Breakpoints
- ✅ `window.innerWidth/innerHeight` - размеры окна
- ✅ `getComputedStyle` - базовые стили

Не нужно мокировать их вручную!

## 💡 Best Practices

### 1. Всегда вызывайте cleanup()

```ts
it('should work', () => {
  const { root, cleanup } = createSliderFixture()
  
  // ... тесты
  
  cleanup() // ❗ Обязательно!
})
```

### 2. Используйте beforeEach/afterEach

```ts
describe('Tests', () => {
  let fixture: ReturnType<typeof createSliderFixture>
  
  beforeEach(() => {
    fixture = createSliderFixture()
  })
  
  afterEach(() => {
    fixture.cleanup()
  })
  
  it('test 1', () => { /* ... */ })
  it('test 2', () => { /* ... */ })
})
```

### 3. Ждите завершения анимаций

```ts
slider.next()
await waitForAnimation(slider.options.speed)
// Теперь можно проверять результат
```

### 4. Проверяйте асинхронные операции

```ts
await simulateDrag({ /* ... */ })
await waitForAnimation()
// Только после этого проверяем состояние
```

## 🔧 Расширение фикстур

Вы можете легко добавить свои фикстуры:

```ts
// tests/fixtures/custom.ts
export function createCustomFixture() {
  // Ваша логика
  return {
    // ...
    cleanup: () => { /* ... */ }
  }
}

// tests/fixtures/index.ts
export * from './custom'
```

