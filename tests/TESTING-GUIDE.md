# 🧪 Руководство по тестированию Tvist

Полное руководство по написанию и запуску тестов для библиотеки Tvist.

## 📋 Содержание

- [Структура тестов](#структура-тестов)
- [Инфраструктура тестирования](#инфраструктура-тестирования)
- [Фикстуры и моки](#фикстуры-и-моки)
- [Примеры тестов](#примеры-тестов)
- [Best Practices](#best-practices)
- [Запуск тестов](#запуск-тестов)

## 📁 Структура тестов

```
tests/
├── setup.ts                    # Глобальные настройки и моки
├── fixtures/                   # Готовые фикстуры и хелперы
│   ├── dom.ts                 # DOM фикстуры (слайдеры, кнопки)
│   ├── events.ts              # Хелперы событий (drag, click, resize)
│   ├── mocks.ts               # Глобальные моки (RAF, performance)
│   └── README.md              # Подробная документация по фикстурам
├── unit/                       # Unit тесты
│   ├── core/                  # Тесты core модулей
│   │   ├── Tvist.test.ts
│   │   ├── Engine.test.ts
│   │   ├── Animator.test.ts
│   │   └── ...
│   ├── modules/               # Тесты модулей
│   │   ├── DragModule.test.ts
│   │   └── ...
│   └── utils/                 # Тесты утилит
│       ├── dom.test.ts
│       └── math.test.ts
└── integration/                # Интеграционные тесты (будущее)
```

## 🛠 Инфраструктура тестирования

### Стек технологий

- **Vitest** - test runner (совместимый с Jest)
- **happy-dom** - браузерное окружение
- **TypeScript** - строгая типизация тестов

### Глобальные настройки (setup.ts)

В `tests/setup.ts` автоматически настроены:

✅ **IntersectionObserver** - для Autoplay модуля  
✅ **ResizeObserver** - для responsive возможностей  
✅ **matchMedia** - для Breakpoints модуля  
✅ **window.innerWidth/innerHeight** - размеры окна (1024x768)  
✅ **getComputedStyle** - возвращает базовые стили  
✅ **Автоматическая очистка DOM** после каждого теста

**Вам не нужно мокировать их вручную!**

## 🎯 Фикстуры и моки

### DOM Фикстуры

#### `createSliderFixture()`

Создаёт полную структуру слайдера с автоматическими моками размеров.

```ts
import { createSliderFixture } from '../fixtures'

const { root, container, slides, cleanup } = createSliderFixture({
  slidesCount: 5,
  width: 1000,
  height: 400
})

const slider = new Tvist(root)
// ... тесты
cleanup()
```

#### `createNavigationFixture()`

```ts
const { prevBtn, nextBtn, cleanup } = createNavigationFixture()
```

#### `createPaginationFixture()`

```ts
const { paginationEl, bullets, cleanup } = createPaginationFixture(5)
```

#### `resizeSlider()`

```ts
resizeSlider(root, 1200, 800) // width, height
```

### Хелперы событий

#### `simulateDrag()`

Эмулирует полную последовательность drag событий.

```ts
import { simulateDrag, waitForAnimation } from '../fixtures'

await simulateDrag({
  element: slider.container,
  startX: 200,
  deltaX: -150,  // драг влево на 150px
  steps: 5,      // 5 промежуточных событий
  type: 'mouse'  // или 'touch'
})

await waitForAnimation(300)
```

#### `createMouseEvent()` / `createTouchEvent()`

```ts
const event = createMouseEvent('mousedown', {
  clientX: 100,
  clientY: 200
})
element.dispatchEvent(event)
```

#### `simulateResize()`

```ts
await simulateResize(1200, 800)
```

#### `waitForAnimation()` / `waitForFrame()`

```ts
slider.next()
await waitForAnimation(300)  // ждём завершения анимации
await waitForFrame()          // ждём 1 RAF кадр
await waitForFrames(3)        // ждём 3 кадра
```

### Глобальные моки

#### `mockRAF()` / `mockConsole()` / `mockIntersectionObserver()`

```ts
import { mockRAF, restoreRAF, mockConsole } from '../fixtures'

beforeEach(() => {
  mockRAF()
})

afterEach(() => {
  restoreRAF()
})
```

**Подробности:** См. `tests/fixtures/README.md`

## 📝 Примеры тестов

### Базовый unit тест

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSliderFixture, type SliderFixture } from '../../fixtures'
import { Tvist } from '@/core/Tvist'

describe('MyFeature', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5 })
    slider = new Tvist(fixture.root)
  })

  afterEach(() => {
    slider.destroy()
    fixture.cleanup()
  })

  it('should do something', () => {
    expect(slider.slides).toHaveLength(5)
  })
})
```

### Тест с drag

```ts
it('should handle drag', async () => {
  const initialIndex = slider.activeIndex

  await simulateDrag({
    element: fixture.container,
    startX: 200,
    deltaX: -150,
    steps: 5
  })

  await waitForAnimation(slider.options.speed)

  expect(slider.activeIndex).toBe(initialIndex + 1)
})
```

### Тест с событиями

```ts
it('should emit events', () => {
  const onMove = vi.fn()
  slider.on('move', onMove)
  
  slider.next()
  
  expect(onMove).toHaveBeenCalled()
})
```

### Тест с навигацией

```ts
it('should navigate with buttons', () => {
  const navFixture = createNavigationFixture()
  
  const slider = new Tvist(fixture.root, {
    navigation: {
      prevEl: navFixture.prevBtn,
      nextEl: navFixture.nextBtn
    }
  })
  
  simulateClick(navFixture.nextBtn)
  expect(slider.activeIndex).toBe(1)
  
  navFixture.cleanup()
})
```

### Тест с resize

```ts
it('should update on resize', async () => {
  const slider = new Tvist(fixture.root)
  const initialWidth = slider.engine.slideWidthValue
  
  resizeSlider(fixture.root, 1200)
  slider.update()
  
  const newWidth = slider.engine.slideWidthValue
  expect(newWidth).not.toBe(initialWidth)
})
```

## ✅ Best Practices

### 1. Всегда используйте фикстуры

❌ **Плохо:**
```ts
const root = document.createElement('div')
// ... создание структуры вручную
```

✅ **Хорошо:**
```ts
const { root, cleanup } = createSliderFixture()
// ... cleanup() в конце
```

### 2. Очищайте ресурсы

```ts
afterEach(() => {
  slider.destroy()     // Очистка слайдера
  fixture.cleanup()    // Очистка DOM
})
```

### 3. Используйте beforeEach/afterEach

```ts
let fixture: SliderFixture
let slider: Tvist

beforeEach(() => {
  fixture = createSliderFixture()
  slider = new Tvist(fixture.root)
})

afterEach(() => {
  slider.destroy()
  fixture.cleanup()
})
```

### 4. Ждите завершения анимаций

```ts
slider.next()
await waitForAnimation(slider.options.speed)
// Теперь можно проверять результат
```

### 5. Проверяйте асинхронные операции

```ts
await simulateDrag({ /* ... */ })
await waitForAnimation()
// Только после этого проверяем состояние
```

### 6. Изолируйте тесты

```ts
// Каждый тест должен быть независимым
it('test 1', () => {
  slider.scrollTo(2)
  expect(slider.activeIndex).toBe(2)
})

it('test 2', () => {
  // Не зависит от test 1
  expect(slider.activeIndex).toBe(0)
})
```

### 7. Мокируйте внешние зависимости

```ts
const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
// ... код который должен вызвать warning
expect(consoleWarn).toHaveBeenCalled()
consoleWarn.mockRestore()
```

### 8. Используйте описательные имена

```ts
// ❌ Плохо
it('test 1', () => { /* ... */ })

// ✅ Хорошо
it('должен переключить слайд при drag больше threshold', () => { /* ... */ })
```

### 9. Группируйте связанные тесты

```ts
describe('MyFeature', () => {
  describe('navigation', () => {
    it('should go next', () => { /* ... */ })
    it('should go prev', () => { /* ... */ })
  })
  
  describe('events', () => {
    it('should emit move event', () => { /* ... */ })
  })
})
```

### 10. Проверяйте edge cases

```ts
describe('Edge cases', () => {
  it('должен корректно обрабатывать пустой слайдер', () => { /* ... */ })
  it('должен работать с 1 слайдом', () => { /* ... */ })
  it('должен игнорировать invalid индексы', () => { /* ... */ })
})
```

## 🚀 Запуск тестов

### Все тесты

```bash
npm test
```

### Конкретный файл

```bash
npm test -- tests/unit/core/Tvist.test.ts
```

### Watch mode

```bash
npm test -- --watch
```

### Coverage

```bash
npm test -- --coverage
```

### UI mode

```bash
npm test -- --ui
```

### Только failed тесты

```bash
npm test -- --reporter=verbose --bail
```

## 📊 Coverage

Минимальные требования к покрытию:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

Проверить coverage:

```bash
npm run test -- --coverage
```

Отчёт будет в `./coverage/index.html`

## 🐛 Отладка тестов

### 1. Используйте console.log

```ts
it('debug test', () => {
  console.log('Current index:', slider.activeIndex)
  console.log('Engine location:', slider.engine.location.get())
})
```

### 2. Используйте debugger

```ts
it('debug test', () => {
  debugger  // Остановка в DevTools
  slider.next()
})
```

### 3. Запускайте конкретный тест

```ts
it.only('this test only', () => {
  // Запустится только этот тест
})
```

### 4. Пропускайте тесты

```ts
it.skip('skip this', () => {
  // Этот тест будет пропущен
})
```

### 5. Увеличьте timeout

```ts
it('slow test', async () => {
  await longOperation()
}, 10000) // 10 секунд вместо 5
```

## 📚 Полезные ссылки

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Фикстуры - подробная документация](./fixtures/README.md)

## 🎓 Примеры кода

Смотрите примеры в:

- `tests/unit/core/Tvist.test.ts` - базовые примеры с фикстурами
- `tests/unit/modules/DragModule.improved.test.ts` - продвинутые примеры
- `tests/fixtures/README.md` - все возможности фикстур

---

**Счастливого тестирования! 🎉**

