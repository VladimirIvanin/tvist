# Модули

Tvist использует модульную архитектуру. Базовая функциональность (drag, навигация) включена по умолчанию, а дополнительные возможности подключаются через модули.

## Архитектура модулей

Каждый модуль:
- **Независим** от других модулей
- **Подключается опционально** через регистрацию
- **Имеет свои опции** в `TvistOptions`
- **Использует EventEmitter** для связи с ядром
- **Может реагировать** на события lifecycle

## Встроенные модули

### Навигация и управление

#### NavigationModule

```javascript
Tvist.registerModule('navigation', NavigationModule)
```

Навигационные стрелки для переключения слайдов.

**Опции:**
- `arrows` - включение и настройка стрелок

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  arrows: true
  // или с настройками
  arrows: {
    prev: '.custom-prev',
    next: '.custom-next',
    disabledClass: 'disabled'
  }
})
```

#### PaginationModule

```javascript
Tvist.registerModule('pagination', PaginationModule)
```

Пагинация (буллеты, дроби, прогресс-бар, кастомная).

**Опции:**
- `pagination` - включение и настройка пагинации

**Типы:**
- `bullets` - буллеты (по умолчанию)
- `fraction` - дроби (1 / 5)
- `progress` - прогресс-бар
- `custom` - кастомный рендеринг

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  pagination: {
    type: 'bullets',
    clickable: true,
    bulletClass: 'my-bullet',
    bulletActiveClass: 'active'
  }
})
```

#### DragModule

```javascript
Tvist.registerModule('drag', DragModule)
```

Перетаскивание мышью/тачем с поддержкой rubberband эффекта.

**Опции:**
- `drag` - включение перетаскивания
- `dragSpeed` - скорость
- `rubberband` - эффект резинки на краях

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  drag: true,
  dragSpeed: 1.5,
  rubberband: true
})
```

#### SlideStatesModule

```javascript
Tvist.registerModule('slide-states', SlideStatesModule)
```

Управление классами состояния слайдов (active, prev, next, visible).

**Автоматически применяет классы:**
- `.tvist__slide--active` - активный слайд
- `.tvist__slide--prev` - предыдущий слайд
- `.tvist__slide--next` - следующий слайд
- `.tvist__slide--visible` - видимый слайд

### Автоматизация

#### AutoplayModule

```javascript
Tvist.registerModule('autoplay', AutoplayModule)
```

Автоматическая прокрутка слайдов.

**Опции:**
- `autoplay` - задержка между переходами (мс) или `true` для дефолтной задержки
- `pauseOnHover` - пауза при наведении курсора
- `pauseOnInteraction` - пауза при взаимодействии
- `disableOnInteraction` - отключение после взаимодействия

**Методы модуля:**
- `start()` - запустить автопрокрутку
- `pause()` - приостановить
- `stop()` - остановить полностью

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pauseOnHover: true,
  pauseOnInteraction: true
})

// Управление через модуль
const autoplay = slider.getModule('autoplay')
autoplay.pause()
autoplay.start()
```

#### LoopModule

```javascript
Tvist.registerModule('loop', LoopModule)
```

Бесконечная прокрутка слайдов.

**Опции:**
- `loop` - включение бесконечной прокрутки

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  loop: true,
  perPage: 3
})
```

### Визуальные эффекты

#### EffectModule

```javascript
Tvist.registerModule('effect', EffectModule)
```

Эффекты переходов между слайдами.

**Опции:**
- `effect` - тип эффекта: `'slide'`, `'fade'`, `'cube'`
- `fadeEffect` - настройки fade эффекта
- `cubeEffect` - настройки cube эффекта

**Поддерживаемые эффекты:**

##### Fade (затухание)

```javascript
const slider = new Tvist('.slider', {
  effect: 'fade',
  fadeEffect: {
    crossFade: true
  }
})
```

##### Cube (3D куб)

```javascript
const slider = new Tvist('.slider', {
  effect: 'cube',
  cubeEffect: {
    slideShadows: true,
    shadow: true,
    shadowOffset: 20,
    shadowScale: 0.94,
    perspective: 800,
    perspectiveOriginY: 60,
    viewportPadding: 10
  }
})
```

#### GridModule

```javascript
Tvist.registerModule('grid', GridModule)
```

Сеточная раскладка слайдов.

**Опции:**
- `grid` - настройки сетки

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  grid: {
    rows: 2,
    cols: 3,
    gap: {
      row: 20,
      col: 10
    }
  }
})

// С динамическими размерами
const slider = new Tvist('.slider', {
  grid: {
    dimensions: [
      [2, 1], // первый слайд: 2 колонки x 1 ряд
      [1, 2], // второй слайд: 1 колонка x 2 ряда
      [1, 1], // третий слайд: 1 колонка x 1 ряд
    ]
  }
})
```

### Адаптивность

#### BreakpointsModule

```javascript
Tvist.registerModule('breakpoints', BreakpointsModule)
```

Адаптивные настройки в зависимости от размера экрана.

**Опции:**
- `breakpoints` - объект с настройками для разных разрешений
- `breakpointsBase` - база для расчёта: `'window'` или `'container'`

**Пример:**

```javascript
const slider = new Tvist('.slider', {
  // Базовые настройки
  perPage: 1,
  gap: 10,
  
  // Адаптивные настройки
  breakpoints: {
    640: {
      perPage: 2,
      gap: 15
    },
    1024: {
      perPage: 3,
      gap: 20
    },
    1440: {
      perPage: 4,
      gap: 30
    }
  },
  
  breakpointsBase: 'window' // или 'container'
})
```

### Связанные слайдеры

#### ThumbsModule

```javascript
Tvist.registerModule('thumbs', ThumbsModule)
```

Связь основного слайдера с миниатюрами.

**Опции:**
- `thumbs` - настройки связи с миниатюрами
- `isNavigation` - режим навигации для слайдера миниатюр

**Пример:**

```javascript
// Слайдер миниатюр
const thumbs = new Tvist('.thumbs-slider', {
  perPage: 5,
  gap: 10,
  isNavigation: true
})

// Основной слайдер
const main = new Tvist('.main-slider', {
  thumbs: {
    slider: thumbs
  }
})
```

## Создание собственных модулей

Вы можете создать собственный модуль, расширив базовый класс `Module`:

```typescript
import { Module } from 'tvist/modules'
import type { Tvist } from 'tvist'
import type { TvistOptions } from 'tvist'

export class MyCustomModule extends Module {
  // Уникальное имя модуля
  readonly name = 'myCustom'
  
  private intervalId?: number

  // Инициализация модуля
  init(): void {
    // Подписка на события
    this.on('slideChange', this.handleSlideChange)
    this.on('resize', this.handleResize)
    
    // Инициализация логики
    this.startCustomLogic()
  }

  // Очистка ресурсов
  destroy(): void {
    // Отписка от событий
    this.off('slideChange', this.handleSlideChange)
    this.off('resize', this.handleResize)
    
    // Очистка таймеров
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  // Обработчик смены слайда
  private handleSlideChange = (index: number) => {
    console.log('Слайд изменился:', index)
    // Ваша логика
  }

  // Обработчик изменения размера
  private handleResize = () => {
    console.log('Размер изменился')
    // Ваша логика
  }

  // Реакция на обновление (resize, update())
  onUpdate?(): void {
    console.log('Update вызван')
  }

  // Реакция на динамическое обновление опций
  onOptionsUpdate?(newOptions: Partial<TvistOptions>): void {
    if (newOptions.speed) {
      console.log('Скорость изменена на:', newOptions.speed)
    }
  }

  // Проверка активности модуля
  protected shouldBeActive(): boolean {
    // Можно добавить условия активации
    return this.options.myCustomOption !== false
  }

  // Кастомные методы
  private startCustomLogic() {
    this.intervalId = window.setInterval(() => {
      // Периодическая логика
    }, 1000)
  }

  // Публичные методы модуля
  public pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  public resume() {
    this.startCustomLogic()
  }
}

// Расширение типов опций (опционально)
declare module 'tvist' {
  interface TvistOptions {
    myCustomOption?: boolean
  }
}

// Регистрация модуля
Tvist.registerModule('myCustom', MyCustomModule)

// Использование
const slider = new Tvist('.slider', {
  myCustomOption: true
})

// Доступ к модулю
const customModule = slider.getModule('myCustom')
customModule?.pause()
customModule?.resume()
```

## Lifecycle hooks модуля

Модуль может реагировать на различные события:

```typescript
export class MyModule extends Module {
  readonly name = 'myModule'

  // Вызывается при создании модуля
  init(): void {
    // Инициализация
  }

  // Вызывается при уничтожении модуля
  destroy(): void {
    // Очистка
  }

  // Вызывается при update() слайдера
  onUpdate?(): void {
    // Реакция на обновление
  }

  // Вызывается при прокрутке
  onScroll?(): void {
    // Реакция на скролл
  }

  // Вызывается при resize
  onResize?(): void {
    // Реакция на изменение размера
  }

  // Вызывается при смене слайда
  onSlideChange?(index: number): void {
    // Реакция на смену слайда
  }

  // Вызывается при динамическом обновлении опций
  onOptionsUpdate?(newOptions: Partial<TvistOptions>): void {
    // Реакция на изменение опций
  }
}
```

## Получение доступа к модулям

```javascript
// Получить конкретный модуль
const autoplay = slider.getModule('autoplay')
if (autoplay) {
  autoplay.pause()
  autoplay.start()
}

// С типизацией (TypeScript)
import type { AutoplayModule } from 'tvist/modules'

const autoplay = slider.getModule<AutoplayModule>('autoplay')
if (autoplay) {
  autoplay.pause() // TypeScript знает все методы
}

// Проверка наличия модуля
if (slider.getModule('pagination')) {
  console.log('Pagination доступен')
}
```

## Модули и производительность

### Регистрируйте только нужные модули

```javascript
// ❌ Плохо: регистрировать все модули
import * as AllModules from 'tvist/modules'
Object.values(AllModules).forEach((Module, name) => {
  Tvist.registerModule(name, Module)
})

// ✅ Хорошо: только нужные
import { AutoplayModule, PaginationModule } from 'tvist/modules'
Tvist.registerModule('autoplay', AutoplayModule)
Tvist.registerModule('pagination', PaginationModule)
```

### Динамическая загрузка модулей

```javascript
// Загружать модули только когда они нужны
async function enableAutoplay() {
  const { AutoplayModule } = await import('tvist/modules/autoplay')
  Tvist.registerModule('autoplay', AutoplayModule)
  
  slider.updateOptions({ autoplay: 3000 })
}

// Вызвать при необходимости
document.querySelector('.enable-autoplay').addEventListener('click', enableAutoplay)
```
