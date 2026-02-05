---
title: Peek
description: Примеры использования peek — показ части соседних слайдов, чтобы было видно, что есть ещё слайды
---

# Peek

**Peek** создаёт видимый зазор для предыдущих и следующих слайдов — отступы слева/справа (или сверху/снизу для вертикального слайдера), чтобы было видно, что есть ещё слайды. **Peek trim** (опция `peekTrim`) — отрезание концовки: последний слайд прижимается к краю без дыры; в начале зазор (peek) остаётся.

## Базовый пример

Одинаковый peek с обеих сторон:

<PaddingBasicExample />

```js
import Tvist from 'tvist'

new Tvist('.tvist', {
  peek: 50, // 50px с каждой стороны
  perPage: 1
})
```

## Peek в процентах

Можно использовать CSS единицы измерения:

<PaddingPercentExample />

```js
new Tvist('.tvist', {
  peek: '10%', // 10% от ширины контейнера
  perPage: 1
})
```

## Асимметричный peek

Разные значения для левой и правой стороны:

<PaddingAsymmetricExample />

```js
new Tvist('.tvist', {
  peek: {
    left: 50,
    right: 150
  },
  perPage: 1
})
```

## Peek с несколькими слайдами

Peek работает вместе с `perPage`:

<PaddingPerPageExample />

```js
new Tvist('.tvist', {
  peek: 50,
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
  peek: {
    top: 50,
    bottom: 100
  },
  perPage: 1
})
```

## Адаптивный peek

Peek можно изменять на разных breakpoints:

<PaddingBreakpointsExample />

```js
new Tvist('.tvist', {
  peek: 100,
  perPage: 3,
  gap: 20,
  breakpoints: {
    768: {
      peek: 50,
      perPage: 2
    },
    480: {
      peek: 20,
      perPage: 1
    }
  }
})
```

## peekTrim (отрезание концовки)

**Peek** создаёт видимый зазор для предыдущих и следующих слайдов. **Peek trim** — отрезание: при `peekTrim: true` (по умолчанию) концовка прижимается к краю, без дыры справа; в начале зазор (peek) остаётся. Сравните:

<PeekTrimExample />

```js
// peekTrim: true — конец прижат к краю
new Tvist('.tvist', { peek: 40, perPage: 1, peekTrim: true })

// peekTrim: false — справа остаётся зазор
new Tvist('.tvist', { peek: 40, perPage: 1, peekTrim: false })
```

## Смешанные единицы

Можно комбинировать разные единицы измерения:

<PaddingMixedUnitsExample />

```js
new Tvist('.tvist', {
  peek: {
    left: '2rem',  // rem
    right: 100     // px
  },
  perPage: 1
})
```

## Опции

### peek

- **Тип:** `number | string | object`
- **По умолчанию:** `undefined`

Задаёт отступы, показывающие часть соседних слайдов (реализуется через padding контейнера).

**Форматы:**

```ts
peek: 50
peek: '2rem'
peek: '10%'
peek: { left: 50, right: 100 }
peek: { top: 50, bottom: 100 }
```

### peekTrim

- **Тип:** `boolean`
- **По умолчанию:** `true`

Peek trim (отрезание): при `true` концовка прижимается к краю — последний слайд без дыры справа. При `false` последний слайд выравнивается по левому краю, справа остаётся зазор. Peek создаёт зазор для соседних слайдов; в начале зазор слева — нормально.

```ts
peekTrim: true   // по умолчанию — отрезание концовки
peekTrim: false  // зазор справа на последнем слайде
```

## Стилизация

Peek применяется к контейнеру `.tvist__container` через CSS padding:

```css
.tvist__container {
  padding-left: 50px;
  padding-right: 50px;
}
```

## Как это работает

1. Peek применяется к контейнеру слайдов (padding)
2. Доступная ширина для слайдов = ширина root − peek left − peek right
3. **peekTrim** (отрезание): по умолчанию концовка прижата к краю. **peek** — зазор для соседних слайдов; в начале зазор слева остаётся. Чтобы справа на последнем слайде оставался зазор, задайте `peekTrim: false`.
