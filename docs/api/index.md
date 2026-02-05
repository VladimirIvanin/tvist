# API Документация

## Опции слайдера

Tvist предоставляет обширный набор опций для настройки слайдера под ваши нужды.

<OptionsTable />

## Методы

### `goTo(index: number, speed?: number): void`

Переход к указанному слайду.

```javascript
slider.goTo(2) // Переход к третьему слайду
slider.goTo(0, 0) // Моментальный переход к первому слайду
```

### `next(): void`

Переход к следующему слайду.

```javascript
slider.next()
```

### `prev(): void`

Переход к предыдущему слайду.

```javascript
slider.prev()
```

### `destroy(): void`

Уничтожение экземпляра слайдера и удаление всех слушателей событий.

```javascript
slider.destroy()
```

### `update(): void`

Принудительное обновление слайдера (пересчёт размеров и позиций).

```javascript
slider.update()
```

## Свойства

### `currentIndex: number`

Текущий индекс активного слайда.

```javascript
console.log(slider.currentIndex) // 0, 1, 2, ...
```

### `realIndex: number | undefined`

Реальный индекс слайда (для loop режима). В обычном режиме совпадает с `currentIndex`.

```javascript
console.log(slider.realIndex) // Логический индекс без учёта клонов
```

### `slides: HTMLElement[]`

Массив всех слайдов.

```javascript
console.log(slider.slides.length) // Количество слайдов
```

### `root: HTMLElement`

Корневой элемент слайдера.

```javascript
slider.root.classList.add('custom-class')
```

### `container: HTMLElement`

Контейнер слайдов (элемент с классом `.tvist__container`).

```javascript
console.log(slider.container.offsetWidth)
```

## События

События можно подписывать двумя способами:

### Через опцию `on`

```javascript
const slider = new Tvist('.slider', {
  on: {
    slideChange: (index) => {
      console.log('Слайд изменился:', index)
    }
  }
})
```

### Через метод `on()`

```javascript
slider.on('slideChange', (index) => {
  console.log('Слайд изменился:', index)
})
```

### Доступные события

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `created` | `tvist: Tvist` | Вызывается после создания слайдера |
| `destroyed` | `tvist: Tvist` | Вызывается перед уничтожением слайдера |
| `beforeSlideChange` | `index: number` | Вызывается перед началом смены слайда |
| `slideChange` | `index: number` | Вызывается при начале смены слайда |
| `slideChanged` | `index: number` | Вызывается после завершения смены слайда |
| `dragStart` | - | Вызывается при начале перетаскивания |
| `drag` | - | Вызывается во время перетаскивания |
| `dragEnd` | - | Вызывается при завершении перетаскивания |
| `scroll` | - | Вызывается при прокрутке |
| `resize` | - | Вызывается при изменении размера |
| `breakpoint` | `breakpoint: number \| null` | Вызывается при смене breakpoint |

## Статические свойства

### `Tvist.VERSION: string`

Версия библиотеки.

```javascript
console.log(Tvist.VERSION) // '1.0.0'
```

### `Tvist.use(...modules: ModuleConstructor[]): void`

Регистрация модулей для использования во всех экземплярах слайдера.

```javascript
import Tvist from 'tvist'
import { Autoplay, Pagination } from 'tvist/modules'

Tvist.use(Autoplay, Pagination)

const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true
})
```

## Модули

Tvist использует модульную архитектуру. Базовая функциональность включена по умолчанию, а дополнительные возможности подключаются через модули.

### Встроенные модули

- **Arrows** - навигационные стрелки
- **Pagination** - пагинация (буллеты, дроби, прогресс-бар)
- **Autoplay** - автоматическая прокрутка
- **Loop** - бесконечная прокрутка
- **Lazy** - ленивая загрузка изображений
- **Effects** - эффекты перехода (fade, cube, card)
- **Thumbs** - связь с thumbnail-слайдером
- **Virtual** - виртуальные слайды для больших списков
- **Keyboard** - управление с клавиатуры
- **Wheel** - управление колёсиком мыши
- **Breakpoints** - адаптивные настройки

### Подключение модулей

```javascript
import Tvist from 'tvist'
import { Autoplay, Pagination, Loop } from 'tvist/modules'

// Глобальная регистрация
Tvist.use(Autoplay, Pagination, Loop)

// Использование
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true
})
```

## TypeScript

Tvist полностью типизирован и предоставляет все необходимые типы:

```typescript
import Tvist, { type TvistOptions } from 'tvist'

const options: TvistOptions = {
  perPage: 3,
  gap: 20,
  autoplay: 5000,
  on: {
    slideChange: (index: number) => {
      console.log(index)
    }
  }
}

const slider = new Tvist('.slider', options)
```
