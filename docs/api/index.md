# API Документация

## Опции слайдера

Tvist предоставляет обширный набор опций для настройки слайдера под ваши нужды.

<OptionsTable />

## Методы

### Навигация

#### `scrollTo(index: number, instant?: boolean): this`

Переход к указанному слайду.

**Параметры:**
- `index` - индекс целевого слайда (начиная с 0)
- `instant` - если `true`, переход будет мгновенным без анимации (по умолчанию `false`)

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.scrollTo(2) // Переход к третьему слайду с анимацией
slider.scrollTo(0, true) // Моментальный переход к первому слайду
```

#### `next(): this`

Переход к следующему слайду.

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.next()
```

#### `prev(): this`

Переход к предыдущему слайду.

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.prev()
```

### Управление состоянием

#### `update(): this`

Принудительное обновление слайдера. Пересчитывает размеры, позиции слайдов и обновляет все модули. Используйте этот метод если изменилась DOM-структура или размеры контейнера.

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
// После изменения размера контейнера
document.querySelector('.slider').style.width = '800px'
slider.update()

// После добавления/удаления слайдов
slider.container.appendChild(newSlide)
slider.update()
```

#### `updateOptions(newOptions: Partial<TvistOptions>): this`

Динамическое обновление опций слайдера без пересоздания экземпляра. Аналог `swiper.updateParams()`.

**Параметры:**
- `newOptions` - объект с новыми опциями (можно передать только те опции, которые нужно изменить)

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Поддерживаемые опции для динамического изменения:**
- `perPage` - количество слайдов на странице
- `slideMinSize` - минимальный размер слайда
- `gap` - расстояние между слайдами
- `peek` - отступы слайдера
- `peekTrim` - обрезка peek на краях
- `speed` - скорость анимации
- `direction` - направление прокрутки
- `center` - центрирование активного слайда
- `drag`, `dragSpeed`, `rubberband` - настройки drag
- `autoplay`, `pauseOnHover`, `pauseOnInteraction` - настройки автопрокрутки
- `on` - обработчики событий (заменяют предыдущие)
- и другие опции модулей

```javascript
// Изменить количество слайдов
slider.updateOptions({ perPage: 3 })

// Изменить несколько опций сразу
slider.updateOptions({
  perPage: 2,
  gap: 30,
  speed: 500
})

// Изменить направление
slider.updateOptions({ direction: 'vertical' })

// Обновить обработчики событий
slider.updateOptions({
  on: {
    slideChange: (index) => {
      console.log('Новый обработчик:', index)
    }
  }
})

// Цепочка вызовов
slider
  .updateOptions({ perPage: 3 })
  .scrollTo(0)
```

:::tip Динамическое изменение
Метод `updateOptions()` позволяет изменять большинство опций без пересоздания слайдера. Это значительно удобнее и производительнее, чем вызов `destroy()` и создание нового экземпляра.
:::

:::warning Ограничения
Некоторые опции, связанные с инициализацией DOM-структуры (например, создание модулей), могут потребовать полного пересоздания слайдера.
:::

#### `destroy(): this`

Уничтожение экземпляра слайдера. Удаляет все обработчики событий, останавливает анимации, очищает модули и освобождает ресурсы.

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.destroy()
```

### Работа с модулями

#### `getModule<T>(name: string): T | undefined`

Получить экземпляр модуля по имени.

**Параметры:**
- `name` - имя модуля

**Возвращает:** экземпляр модуля или `undefined`

```javascript
const autoplay = slider.getModule('autoplay')
autoplay?.pause()
```

### Синхронизация

#### `sync(target: Tvist): this`

Синхронизация с другим экземпляром Tvist. Используется для создания связанных слайдеров (например, основной слайдер + миниатюры).

**Параметры:**
- `target` - целевой экземпляр слайдера для синхронизации

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
const main = new Tvist('.main-slider')
const thumbs = new Tvist('.thumbs-slider')

// Синхронизируем слайдеры
main.sync(thumbs)
```

### События

#### `on(event: string, handler: Function): this`

Подписаться на событие.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.on('slideChange', (index) => {
  console.log('Активный слайд:', index)
})
```

#### `off(event: string, handler?: Function): this`

Отписаться от события.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик (если не указана, удаляются все обработчики события)

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
const handler = (index) => console.log(index)
slider.on('slideChange', handler)
slider.off('slideChange', handler)
```

#### `once(event: string, handler: Function): this`

Подписаться на событие один раз.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.once('slideChange', (index) => {
  console.log('Выполнится только один раз')
})
```

#### `emit(event: string, ...args: any[]): this`

Вызвать событие программно.

**Параметры:**
- `event` - имя события
- `args` - аргументы для передачи обработчикам

**Возвращает:** экземпляр слайдера для цепочки вызовов

```javascript
slider.emit('customEvent', { data: 'value' })
```

## Свойства

### Доступ к элементам

#### `root: HTMLElement`

Корневой элемент слайдера (элемент, переданный в конструктор).

```javascript
slider.root.classList.add('custom-class')
console.log(slider.root.offsetWidth)
```

#### `container: HTMLElement`

Контейнер слайдов (элемент с классом `.tvist__container`).

```javascript
console.log(slider.container.offsetWidth)
```

#### `slides: HTMLElement[]`

Массив всех слайдов (только для чтения).

```javascript
console.log(slider.slides.length) // Количество слайдов
slider.slides.forEach(slide => {
  slide.classList.add('custom-slide-class')
})
```

### Состояние

#### `activeIndex: number`

Текущий индекс активного слайда (начиная с 0).

```javascript
console.log(slider.activeIndex) // 0, 1, 2, ...

// Использование в условиях
if (slider.activeIndex === 0) {
  console.log('Первый слайд активен')
}
```

#### `realIndex: number | undefined`

Реальный (логический) индекс слайда. Используется в режиме `loop` для получения истинного индекса без учёта клонированных слайдов. В обычном режиме совпадает с `activeIndex`.

```javascript
// В loop режиме
console.log(slider.activeIndex) // Может быть -1, 0, 1, ..., length, length+1
console.log(slider.realIndex) // Всегда в диапазоне 0..length-1
```

#### `canScrollNext: boolean`

Проверяет, можно ли листать вперёд.

```javascript
if (slider.canScrollNext) {
  slider.next()
}
```

#### `canScrollPrev: boolean`

Проверяет, можно ли листать назад.

```javascript
if (slider.canScrollPrev) {
  slider.prev()
}
```

### Ядро

#### `engine: Engine`

Экземпляр Engine - ядро расчёта позиций и анимаций (только для чтения). Используется для продвинутой работы с внутренними механизмами.

```javascript
console.log(slider.engine.slideSizeValue)
console.log(slider.engine.containerSizeValue)
```

#### `options: TvistOptions`

Текущие опции слайдера (только для чтения). Для изменения опций используйте метод `updateOptions()`.

```javascript
console.log(slider.options.perPage)
console.log(slider.options.gap)

// ❌ Не делайте так
slider.options.perPage = 3

// ✅ Используйте updateOptions
slider.updateOptions({ perPage: 3 })
```

## События

События можно подписывать двумя способами:

### Через опцию `on`

```javascript
const slider = new Tvist('.slider', {
  on: {
    slideChange: (index) => {
      console.log('Слайд изменился:', index)
    },
    resize: () => {
      console.log('Размер изменился')
    }
  }
})
```

### Через метод `on()`

```javascript
slider.on('slideChange', (index) => {
  console.log('Слайд изменился:', index)
})

slider.on('resize', () => {
  console.log('Размер изменился')
})
```

### Отписка от событий

```javascript
const handler = (index) => console.log(index)

// Подписка
slider.on('slideChange', handler)

// Отписка от конкретного обработчика
slider.off('slideChange', handler)

// Отписка от всех обработчиков события
slider.off('slideChange')
```

### Доступные события

#### Lifecycle события

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `created` | `tvist: Tvist` | Вызывается после создания слайдера |
| `destroyed` | `tvist: Tvist` | Вызывается перед уничтожением слайдера |
| `optionsUpdated` | `tvist: Tvist, newOptions: Partial<TvistOptions>` | Вызывается после динамического обновления опций |

#### События навигации

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `beforeSlideChange` | `index: number` | Вызывается перед началом смены слайда |
| `slideChange` | `index: number` | Вызывается при начале смены слайда (начало анимации) |
| `slideChanged` | `index: number` | Вызывается после завершения смены слайда (конец анимации) |

#### События взаимодействия

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `dragStart` | - | Вызывается при начале перетаскивания |
| `drag` | - | Вызывается во время перетаскивания |
| `dragEnd` | - | Вызывается при завершении перетаскивания |

#### События обновления

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `scroll` | - | Вызывается при прокрутке (во время анимации) |
| `resize` | - | Вызывается при изменении размера контейнера |
| `breakpoint` | `breakpoint: number \| null` | Вызывается при смене breakpoint |
| `lock` | - | Вызывается при блокировке слайдера (когда контент помещается в контейнер) |
| `unlock` | - | Вызывается при разблокировке слайдера |

### Примеры использования событий

#### Отслеживание активного слайда

```javascript
slider.on('slideChange', (index) => {
  console.log(`Переход к слайду ${index + 1}`)
  
  // Обновление UI
  document.querySelector('.current-slide').textContent = index + 1
})
```

#### Ленивая загрузка изображений

```javascript
slider.on('slideChange', (index) => {
  const slide = slider.slides[index]
  const img = slide.querySelector('img[data-src]')
  
  if (img && img.dataset.src) {
    img.src = img.dataset.src
    delete img.dataset.src
  }
})
```

#### Отслеживание жизненного цикла

```javascript
const slider = new Tvist('.slider', {
  on: {
    created: (tvist) => {
      console.log('Слайдер создан', tvist)
    },
    optionsUpdated: (tvist, newOptions) => {
      console.log('Опции обновлены', newOptions)
    },
    destroyed: (tvist) => {
      console.log('Слайдер уничтожен', tvist)
    }
  }
})
```

#### Работа с breakpoints

```javascript
slider.on('breakpoint', (breakpoint) => {
  if (breakpoint === null) {
    console.log('Базовые настройки')
  } else {
    console.log(`Активен breakpoint: ${breakpoint}px`)
  }
})
```

## Статические свойства и методы

### `Tvist.VERSION: string`

Версия библиотеки (только для чтения).

```javascript
console.log(Tvist.VERSION) // '1.0.0'
```

### `Tvist.registerModule(name: string, ModuleClass: ModuleConstructor): void`

Регистрация модуля в глобальном реестре. После регистрации модуль будет доступен во всех новых экземплярах слайдера.

**Параметры:**
- `name` - уникальное имя модуля
- `ModuleClass` - класс модуля

```javascript
import Tvist from 'tvist'
import { AutoplayModule, PaginationModule, LoopModule } from 'tvist/modules'

// Регистрируем модули
Tvist.registerModule('autoplay', AutoplayModule)
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('loop', LoopModule)

// Создаём слайдер с зарегистрированными модулями
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true
})
```

### `Tvist.unregisterModule(name: string): void`

Удаление модуля из глобального реестра.

**Параметры:**
- `name` - имя модуля

```javascript
Tvist.unregisterModule('autoplay')
```

### `Tvist.getRegisteredModules(): string[]`

Получить список имён всех зарегистрированных модулей.

**Возвращает:** массив имён модулей

```javascript
const modules = Tvist.getRegisteredModules()
console.log(modules) // ['autoplay', 'pagination', 'drag', ...]
```

### `Tvist.MODULES: Map<string, ModuleConstructor>`

Глобальный реестр модулей (только для чтения). Map с именами и конструкторами модулей.

```javascript
console.log(Tvist.MODULES.size) // Количество зарегистрированных модулей
console.log(Tvist.MODULES.has('autoplay')) // Проверка наличия модуля
```

## Модули

Tvist использует модульную архитектуру. Базовая функциональность (drag, навигация) включена по умолчанию, а дополнительные возможности подключаются через модули.

### Архитектура модулей

Каждый модуль:
- Независим от других модулей
- Подключается опционально
- Имеет свои опции в `TvistOptions`
- Использует EventEmitter для связи с ядром
- Может реагировать на события lifecycle

### Встроенные модули

#### Навигация и управление
- **NavigationModule** (`arrows`) - навигационные стрелки
- **PaginationModule** (`pagination`) - пагинация (буллеты, дроби, прогресс-бар)
- **DragModule** (`drag`) - перетаскивание мышью/тачем
- **SlideStatesModule** - управление классами состояния слайдов

#### Автоматизация
- **AutoplayModule** (`autoplay`) - автоматическая прокрутка
- **LoopModule** (`loop`) - бесконечная прокрутка

#### Визуальные эффекты
- **EffectModule** (`effect`) - эффекты переходов (fade, cube)
- **GridModule** (`grid`) - сеточная раскладка слайдов

#### Адаптивность
- **BreakpointsModule** (`breakpoints`) - адаптивные настройки

#### Связанные слайдеры
- **ThumbsModule** (`thumbs`) - связь с миниатюрами

### Регистрация модулей

```javascript
import Tvist from 'tvist'
import { AutoplayModule, PaginationModule, LoopModule } from 'tvist/modules'

// Регистрация модулей глобально
Tvist.registerModule('autoplay', AutoplayModule)
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('loop', LoopModule)

// Создание слайдера с зарегистрированными модулями
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true
})
```

### Получение экземпляра модуля

```javascript
// Получить модуль для управления
const autoplayModule = slider.getModule('autoplay')

// Пример: пауза автопрокрутки
if (autoplayModule) {
  autoplayModule.pause()
}
```

### Создание собственных модулей

Вы можете создать собственный модуль, расширив базовый класс `Module`:

```typescript
import { Module } from 'tvist/modules'
import type { Tvist } from 'tvist'
import type { TvistOptions } from 'tvist'

export class MyCustomModule extends Module {
  readonly name = 'myCustom'

  init(): void {
    // Инициализация модуля
    this.on('slideChange', this.handleSlideChange)
  }

  destroy(): void {
    // Очистка ресурсов
    this.off('slideChange', this.handleSlideChange)
  }

  private handleSlideChange = (index: number) => {
    console.log('Слайд изменился:', index)
  }

  // Опционально: реакция на обновление опций
  onOptionsUpdate?(newOptions: Partial<TvistOptions>): void {
    if (newOptions.speed) {
      console.log('Скорость изменена на:', newOptions.speed)
    }
  }
}

// Регистрация
Tvist.registerModule('myCustom', MyCustomModule)
```

## TypeScript

Tvist полностью типизирован с включенным strict mode. Все публичные API имеют типы, а опции строго проверяются на этапе компиляции.

### Основные типы

#### TvistOptions

Интерфейс опций слайдера:

```typescript
import Tvist, { type TvistOptions } from 'tvist'

const options: TvistOptions = {
  perPage: 3,
  gap: 20,
  speed: 300,
  direction: 'horizontal',
  autoplay: 5000,
  on: {
    slideChange: (index: number) => {
      console.log(`Активный слайд: ${index}`)
    },
    optionsUpdated: (tvist: Tvist, newOptions: Partial<TvistOptions>) => {
      console.log('Обновлены опции:', newOptions)
    }
  }
}

const slider = new Tvist('.slider', options)
```

#### Частичные опции (Partial)

Для метода `updateOptions()` используется `Partial<TvistOptions>`:

```typescript
// Можно передать только нужные опции
slider.updateOptions({
  perPage: 4,
  gap: 30
})

// TypeScript проверит типы
slider.updateOptions({
  perPage: '4' // ❌ Ошибка: Type 'string' is not assignable to type 'number'
})
```

### Типизация событий

```typescript
import type { Tvist } from 'tvist'

// Обработчики с типизированными параметрами
slider.on('slideChange', (index: number) => {
  console.log(index)
})

slider.on('created', (tvist: Tvist) => {
  console.log(tvist.slides.length)
})

slider.on('optionsUpdated', (tvist: Tvist, newOptions: Partial<TvistOptions>) => {
  console.log(newOptions)
})
```

### Типизация модулей

```typescript
import type { Module } from 'tvist/modules'
import type { AutoplayModule } from 'tvist/modules'

// Получение модуля с типом
const autoplay = slider.getModule<AutoplayModule>('autoplay')

if (autoplay) {
  autoplay.pause() // TypeScript знает все методы AutoplayModule
}
```

### Создание типизированного модуля

```typescript
import { Module } from 'tvist/modules'
import type { Tvist, TvistOptions } from 'tvist'

export class MyModule extends Module {
  readonly name = 'myModule'

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  init(): void {
    // Инициализация
  }

  destroy(): void {
    // Очистка
  }

  // Опциональные hooks с правильными типами
  onUpdate?(): void {
    console.log('Update')
  }

  onOptionsUpdate?(newOptions: Partial<TvistOptions>): void {
    console.log('Options updated', newOptions)
  }

  onSlideChange?(index: number): void {
    console.log('Slide changed', index)
  }
}
```

### Расширение типов опций

Если вы создаёте кастомный модуль с собственными опциями:

```typescript
// custom-module.ts
declare module 'tvist' {
  interface TvistOptions {
    myCustomOption?: {
      enabled?: boolean
      speed?: number
    }
  }
}

export class CustomModule extends Module {
  readonly name = 'custom'

  init(): void {
    const options = this.options.myCustomOption
    if (options?.enabled) {
      console.log('Custom module enabled with speed:', options.speed)
    }
  }

  destroy(): void {
    // Cleanup
  }
}
```

### Generic типы

```typescript
// Типизация для generic операций
function createSlider<T extends HTMLElement>(
  element: T,
  options: TvistOptions
): Tvist {
  return new Tvist(element, options)
}

const container = document.querySelector<HTMLDivElement>('.slider')!
const slider = createSlider(container, { perPage: 3 })
```

### Утилитарные типы

Tvist экспортирует вспомогательные типы:

```typescript
import type {
  TvistOptions,
  Module,
  ModuleConstructor
} from 'tvist'

// Используйте их для создания типизированных функций
function configureSlider(options: Partial<TvistOptions>): TvistOptions {
  return {
    perPage: 1,
    gap: 0,
    speed: 300,
    ...options
  }
}
```
