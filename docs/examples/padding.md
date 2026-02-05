---
title: Padding
description: Примеры использования padding для создания отступов слайдера
---

# Padding

Опция `padding` позволяет добавить отступы к слайдеру слева/справа (для горизонтальной ориентации) или сверху/снизу (для вертикальной). Это полезно для создания эффекта "peek" когда видны части соседних слайдов.

## Базовый пример

Одинаковый padding с обеих сторон:

<PaddingBasicExample />

```js
import Tvist from 'tvist'

new Tvist('.tvist', {
  padding: 50, // 50px с каждой стороны
  perPage: 1
})
```

## Padding в процентах

Можно использовать CSS единицы измерения:

<PaddingPercentExample />

```js
new Tvist('.tvist', {
  padding: '10%', // 10% от ширины контейнера
  perPage: 1
})
```

## Асимметричный padding

Разные значения для левой и правой стороны:

<PaddingAsymmetricExample />

```js
new Tvist('.tvist', {
  padding: { 
    left: 50, 
    right: 150 
  },
  perPage: 1
})
```

## Padding с несколькими слайдами

Padding работает вместе с `perPage`:

<PaddingPerPageExample />

```js
new Tvist('.tvist', {
  padding: 50,
  perPage: 3,
  gap: 20
})
```

## Вертикальный слайдер

Для вертикального слайдера используйте `top` и `bottom`:

<PaddingVerticalExample />

```js
new Tvist('.tvist', {
  direction: 'vertical',
  padding: { 
    top: 50, 
    bottom: 100 
  },
  perPage: 1
})
```

## Адаптивный padding

Padding можно изменять на разных breakpoints:

<PaddingBreakpointsExample />

```js
new Tvist('.tvist', {
  padding: 100,
  perPage: 3,
  gap: 20,
  breakpoints: {
    768: {
      padding: 50,
      perPage: 2
    },
    480: {
      padding: 20,
      perPage: 1
    }
  }
})
```

## Смешанные единицы

Можно комбинировать разные единицы измерения:

<PaddingMixedUnitsExample />

```js
new Tvist('.tvist', {
  padding: { 
    left: '2rem',  // rem
    right: 100     // px
  },
  perPage: 1
})
```

## Опции

### padding

- **Тип:** `number | string | object`
- **По умолчанию:** `undefined`

Устанавливает padding для слайдера.

**Форматы:**

```ts
// Число (пиксели)
padding: 50

// CSS строка
padding: '2rem'
padding: '10%'
padding: '3em'

// Объект для горизонтального слайдера
padding: { left: 50, right: 100 }
padding: { left: '2rem', right: '3rem' }

// Объект для вертикального слайдера
padding: { top: 50, bottom: 100 }
```

## Стилизация

При использовании padding стили применяются к контейнеру `.tvist__container`:

```css
/* Padding применяется через inline стили */
.tvist__container {
  padding-left: 50px;
  padding-right: 50px;
}
```

## Как это работает

1. Padding применяется к контейнеру слайдов
2. Доступная ширина для слайдов рассчитывается с учётом padding:
   ```
   Доступная ширина = Ширина root - padding left - padding right
   ```
3. Размер каждого слайда рассчитывается на основе доступной ширины:
   ```
   Размер слайда = (Доступная ширина - gap × (perPage - 1)) / perPage
   ```

## Примеры использования

### Эффект "Peek"

Показать части соседних слайдов для визуальной подсказки:

```js
new Tvist('.tvist', {
  padding: '15%',
  perPage: 1
})
```

### Центрированный слайд с фокусом

Небольшой padding создаёт эффект фокуса на активном слайде:

```js
new Tvist('.tvist', {
  padding: 40,
  perPage: 1
})
```

### Галерея с preview

Асимметричный padding для галереи с превью:

```js
new Tvist('.tvist', {
  padding: { 
    left: 100,  // больше места для preview слева
    right: 40   // меньше места справа
  },
  perPage: 1
})
```
