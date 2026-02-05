# Center Mode (Центрирование)

Режим центрирования позволяет располагать активный слайд по центру контейнера. Это полезно когда нужно выделить текущий слайд, показывая части соседних слайдов по бокам.

## Основные возможности

- **Центрирование активного слайда** - активный слайд всегда находится по центру
- **Классы состояний** - автоматическое применение классов для активного, предыдущего, следующего и видимых слайдов
- **Гибкая настройка** - работает с любым значением `perPage`
- **Плавная анимация** - smooth переходы между слайдами

## Базовый пример

<ExampleCard title="Базовое центрирование" description="perPage: 3, center: true">
  <CenterBasicExample />
</ExampleCard>

```js
new Tvist('.tvist', {
  perPage: 3,
  gap: 20,
  center: true, // Активный слайд по центру
  speed: 400,
})
```

## PerPage: 2 (Половинки по бокам)

Когда `perPage: 2` и `center: true`, активный слайд находится по центру, а половинки предыдущего и следующего слайдов видны по бокам.

<ExampleCard title="Center с perPage: 2" description="Активный слайд по центру, половинки по бокам">
  <CenterPerPage2Example />
</ExampleCard>

```js
new Tvist('.tvist', {
  perPage: 2,
  gap: 16,
  center: true,
  speed: 350,
})
```

## PerPage: 4 (Множественные видимые слайды)

При `perPage: 4` видны активный, предыдущий, следующий и кусочки других слайдов.

<ExampleCard title="Center с perPage: 4" description="Множественные видимые слайды с активным по центру">
  <CenterPerPage4Example />
</ExampleCard>

```js
new Tvist('.tvist', {
  perPage: 4,
  gap: 12,
  center: true,
  speed: 400,
})
```

## Классы состояний слайдов

Модуль `SlideStatesModule` автоматически применяет следующие классы:

### CSS классы

- `.tvist__slide--active` - активный слайд (по центру)
- `.tvist__slide--prev` - предыдущий слайд
- `.tvist__slide--next` - следующий слайд
- `.tvist__slide--visible` - видимые слайды (полностью или частично)

### Пример стилизации

```css
/* Активный слайд - увеличен и выделен */
.tvist__slide--active .slide-content {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* Предыдущий и следующий - слегка уменьшены */
.tvist__slide--prev .slide-content,
.tvist__slide--next .slide-content {
  opacity: 0.7;
  transform: scale(0.95);
}

/* Видимые, но не активные - еще более уменьшены */
.tvist__slide--visible:not(.tvist__slide--active):not(.tvist__slide--prev):not(.tvist__slide--next) .slide-content {
  opacity: 0.4;
  transform: scale(0.9);
}

/* Невидимые слайды */
.tvist__slide:not(.tvist__slide--visible) .slide-content {
  opacity: 0.2;
}
```

## Как это работает

### Логика центрирования

Центрирование реализовано по принципу Splide (`focus: 'center'`) и Swiper (`centeredSlides`):

1. **Расчет offset** - вычисляется смещение для центрирования:
   ```ts
   offset = (containerSize - slideSize) / 2
   ```

2. **Позиционирование** - к базовой позиции добавляется offset:
   ```ts
   position = -slidePosition + centerOffset
   ```

3. **Обновление классов** - при каждом изменении слайда обновляются классы состояний

### Управление состояниями

`SlideStatesModule` отслеживает:

- **Активный индекс** - определяет текущий слайд
- **Видимость** - проверяет пересечение слайдов с контейнером через `getBoundingClientRect()`
- **Соседние слайды** - вычисляет prev/next с учетом loop режима

## Совместимость с другими опциями

### С Loop

```js
new Tvist('.tvist', {
  perPage: 3,
  center: true,
  loop: true, // Бесконечная прокрутка
})
```

### С Drag

```js
new Tvist('.tvist', {
  perPage: 2,
  center: true,
  drag: true, // Перетаскивание включено
})
```

### С Breakpoints

```js
new Tvist('.tvist', {
  perPage: 4,
  center: true,
  breakpoints: {
    768: {
      perPage: 2, // На мобильных меньше слайдов
    },
    480: {
      perPage: 1,
      center: false, // Отключаем центрирование на маленьких экранах
    },
  },
})
```

## Преимущества

1. **Фокус на активном слайде** - пользователь видит, какой слайд текущий
2. **Контекст** - видны соседние слайды для лучшей навигации
3. **Гибкость** - работает с любым `perPage`
4. **Performance** - эффективная работа через классы CSS

## Отличия от обычного режима

| Параметр | Обычный режим | Center режим |
|----------|---------------|--------------|
| Позиция активного | Слева/сверху | По центру |
| EndIndex | `slideCount - perPage` | `slideCount - 1` |
| Навигация | По страницам | По слайдам |
| Классы состояний | Нет | Да (active, prev, next, visible) |

## API

### Опции

```ts
interface TvistOptions {
  /**
   * Центрирование активного слайда
   * @default false
   */
  center?: boolean
}
```

### События

Классы обновляются автоматически на следующих событиях:

- `slideChange` - начало смены слайда
- `slideChanged` - завершение смены слайда
- `scroll` - во время прокрутки (обновление видимости)

### Методы

Все стандартные методы работают в center режиме:

```js
const tvist = new Tvist('.tvist', { center: true })

tvist.next()        // Следующий слайд
tvist.prev()        // Предыдущий слайд
tvist.scrollTo(5)   // К конкретному слайду
```

## Best Practices

1. **Используйте четное perPage** - `2, 4, 6` для симметричного вида
2. **Стилизуйте активный слайд** - сделайте его заметным через CSS
3. **Добавьте gap** - расстояние между слайдами улучшает читаемость
4. **Тестируйте на разных размерах** - используйте breakpoints для адаптивности

## Troubleshooting

### Активный слайд не по центру

Проверьте, что:
- `center: true` указан в опциях
- Контейнер имеет достаточную ширину для `perPage` слайдов
- CSS не переопределяет позиционирование

### Классы не применяются

Убедитесь, что:
- Модуль `SlideStatesModule` зарегистрирован (автоматически при импорте Tvist)
- Нет CSS конфликтов с классами `.tvist__slide--*`
