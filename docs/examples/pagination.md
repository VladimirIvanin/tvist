# Пагинация

Типы пагинации: **bullets** (точки), **fraction** (дробь «текущий / всего»), **progress** (прогресс-бар) и **custom** (собственный HTML через функцию).


## Bullets (точки)

Классические кликабельные точки. Опция `clickable: true` включает переход по клику.

<Demo id="pagination" />

```javascript
pagination: {
  type: 'bullets',
  clickable: true
}
```

---

## Fraction (дробь)

Отображение в виде «текущий / всего» (например, 2 / 5). Можно переопределить разметку через `renderFraction(current, total)`.

<Demo id="pagination-fraction" />

```javascript
pagination: {
  type: 'fraction'
}
```

---

## Progress (прогресс-бар)

Горизонтальная полоса, заполняющаяся по мере перехода к последнему слайду.

<Demo id="pagination-progress" />

```javascript
pagination: {
  type: 'progress'
}
```

---

## Custom (кастомный рендер)

Тип `custom` с функцией `renderCustom(current, total)` — вы возвращаете произвольный HTML (например, текст «Слайд 3 из 6» или свою разметку).

<Demo id="pagination-custom" />

```javascript
pagination: {
  type: 'custom',
  renderCustom: (current, total) =>
    `<span class="pagination-custom">Слайд ${current} из ${total}</span>`
}
```


---

## Лимит точек (Bullets Limit)

Для слайдеров с большим количеством слайдов можно ограничить количество отображаемых точек и объединить слайды в группы. Поддерживаются две стратегии распределения:

### Равномерное распределение (Even Strategy)

Каждая точка представляет равное количество слайдов. Например, 10 слайдов с лимитом 5 точек: каждая точка = 2 слайда.

<Demo id="pagination-even" />

```javascript
pagination: {
  type: 'bullets',
  limit: 5,
  strategy: 'even'
}
```

#### Стратегия распределения остатка

Когда слайды не делятся нацело на количество точек, остаток можно распределить по-разному:

- `'left'` — остаток добавляется к левым точкам
- `'center'` (по умолчанию) — остаток добавляется к центральным точкам
- `'right'` — остаток добавляется к правым точкам

Пример: 7 слайдов, лимит 2, стратегия центр → [3, 4] слайда на точку.

<Demo id="pagination-even-center" />

```javascript
pagination: {
  type: 'bullets',
  limit: 2,
  strategy: 'even',
  remainderStrategy: 'center' // остаток распределяется в центре (правая точка)
}
```

### Центральное распределение (Center Strategy)

Симметричное распределение: крайние точки представляют по одному слайду с каждого края, центральные точки группируют все остальные слайды.

<Demo id="pagination-center" />

```javascript
pagination: {
  type: 'bullets',
  limit: 5,
  strategy: 'center'
}
```

#### Примеры распределения:

**10 слайдов, limit 5 (нечётное):**
- Точка 0: слайд 0
- Точка 1: слайд 1
- Точка 2: слайды 2-7 (центральная группа)
- Точка 3: слайд 8
- Точка 4: слайд 9

**9 слайдов, limit 4 (чётное):**
- Точка 0: слайд 0
- Точка 1: слайды 1-4 (центр левый)
- Точка 2: слайды 5-7 (центр правый)
- Точка 3: слайд 8

**7 слайдов, limit 3:**
- Точка 0: слайд 0
- Точка 1: слайды 1-5 (центр)
- Точка 2: слайд 6

При **нечётном** количестве точек (3, 5, 7...) создаётся одна центральная группа.
При **чётном** количестве точек (4, 6, 8...) центральные слайды делятся на две группы

---

## Пагинация и брейкпоинты

Пагинация полностью реагирует на смену брейкпоинта. Можно как включать/выключать её на разных разрешениях, так и менять параметры (`limit`, `type` и др.):

```javascript
// Пагинация только на мобиле
new Tvist('.tvist', {
  perPage: 3,
  pagination: false,
  breakpoints: {
    768: {
      perPage: 1,
      pagination: true  // Появляется при ≤ 768px
    }
  }
})
```

```javascript
// Адаптивный limit точек
new Tvist('.tvist', {
  perPage: 3,
  pagination: { limit: 7, clickable: true },
  breakpoints: {
    992: { pagination: { limit: 5, clickable: true } },
    768: { pagination: { limit: 3, clickable: true } }
  }
})
```

## Опции пагинации

| Опция | Тип | Описание |
|-------|-----|----------|
| `type` | `'bullets' \| 'fraction' \| 'progress' \| 'custom'` | Тип пагинации |
| `clickable` | `boolean` | Клики по буллетам переключают слайд (по умолчанию `true` для bullets) |
| `bulletClass` | `string` | CSS-класс буллета |
| `bulletActiveClass` | `string` | CSS-класс активного буллета (по умолчанию `'tvist-v1__bullet--active'`, BEM) |
| `container` | `string \| HTMLElement` | Селектор или элемент-контейнер для пагинации |
| `renderBullet` | `(index, className) => string` | Кастомный HTML буллета |
| `renderFraction` | `(current, total) => string` | Кастомный HTML для fraction |
| `renderCustom` | `(current, total) => string` | Кастомный HTML для типа `custom` |
| `limit` | `number` | Максимальное количество видимых точек (только для `type: 'bullets'`) |
| `strategy` | `'even' \| 'center'` | Стратегия распределения слайдов по точкам при использовании `limit` (по умолчанию `'even'`) |
| `remainderStrategy` | `'left' \| 'center' \| 'right'` | Стратегия распределения остатка при равномерном делении (только для `strategy: 'even'`, по умолчанию `'center'`) |

Контейнер по умолчанию — элемент с классом `.tvist-v1__pagination` внутри корня слайдера.
