# Навигация

Управление слайдером: **стрелки** (prev/next) и **пагинация** (буллеты, дробь, прогресс, кастом). Оба блока можно размещать внутри корня слайдера или **за его пределами** — в любом месте страницы.


## Навигация по умолчанию (внутри root)

Стрелки и пагинация лежат **внутри** корневого элемента слайдера. Кнопки ищутся по классам `.tvist-v1__arrow--prev` / `.tvist-v1__arrow--next`, контейнер пагинации — `.tvist-v1__pagination`.

<Demo id="navigation" />

```javascript
const slider = new Tvist('.slider', {
  arrows: true,
  pagination: { type: 'bullets', clickable: true }
})
```

```html
<div class="tvist-v1">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">...</div>
  </div>
  <button class="tvist-v1__arrow tvist-v1__arrow--prev"></button>
  <button class="tvist-v1__arrow tvist-v1__arrow--next"></button>
  <div class="tvist-v1__pagination"></div>
</div>
```

---

## Навигация за пределами root

Стрелки и пагинация могут находиться **вне** корня слайдера: в шапке, футере, боковой панели. Указываете селекторы (или DOM-элементы) — Tvist ищет их через `document.querySelector`, то есть по всему документу.

**HTML:** слайдер и блок управления разделены.

```html
<!-- Блок управления — снаружи слайдера -->
<div class="slider-controls">
  <button id="nav-outside-prev" type="button">← Назад</button>
  <span id="nav-outside-pagination"></span>
  <button id="nav-outside-next" type="button">Вперёд →</button>
</div>

<div class="tvist-v1" id="my-slider">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">1</div>
      <div class="tvist-v1__slide">2</div>
      <div class="tvist-v1__slide">3</div>
      <div class="tvist-v1__slide">4</div>
      <div class="tvist-v1__slide">5</div>
    </div>
  </div>
</div>
```

**Опции:** привязка по селекторам.

```javascript
const slider = new Tvist('#my-slider', {
  arrows: {
    prev: '#nav-outside-prev',
    next: '#nav-outside-next'
  },
  pagination: {
    container: '#nav-outside-pagination',
    type: 'fraction',
    clickable: true
  }
})
```

Ниже — тот же пример вживую: кнопки и счётчик слайдов расположены **над** слайдером и не входят в его root.

<div class="slider-controls nav-outside-controls">
  <button id="nav-outside-prev" type="button" aria-label="Предыдущий">← Назад</button>
  <span id="nav-outside-pagination"></span>
  <button id="nav-outside-next" type="button" aria-label="Следующий">Вперёд →</button>
</div>

<Demo id="navigation-outside" />

---

## Опции стрелок (arrows)

| Опция | Тип | Описание | Пример |
|-------|-----|----------|--------|
| `prev` | `string \| HTMLElement` | Селектор или элемент кнопки «назад». По умолчанию ищется `.tvist-v1__arrow--prev` внутри root. **Может быть вне root.** | `prev: '#my-prev-btn'` |
| `next` | `string \| HTMLElement` | Селектор или элемент кнопки «вперёд». **Может быть вне root.** | `next: '.sidebar-next'` |
| `disabledClass` | `string` | Класс для неактивной стрелки (по умолчанию `'disabled'`). | `disabledClass: 'is-disabled'` |
| `hiddenClass` | `string` | Класс для скрытой стрелки (по умолчанию `'hidden'`). | `hiddenClass: 'is-hidden'` |
| `addIcons` | `boolean` | Подставлять ли SVG-иконки в пустые кнопки (по умолчанию `true`). | `addIcons: false` |

**Примеры:**

```javascript
// Только включить стрелки (разметка с классами внутри root)
arrows: true

// Стрелки снаружи по id
arrows: { prev: '#prev', next: '#next' }

// Свои классы и без авто-иконок
arrows: {
  prev: '.custom-prev',
  next: '.custom-next',
  disabledClass: 'is-disabled',
  addIcons: false
}
```

---

## Опции пагинации (pagination)

| Опция | Тип | Описание | Пример |
|-------|-----|----------|--------|
| `container` | `string \| HTMLElement` | Селектор или элемент, куда рендерить пагинацию. По умолчанию — `.tvist-v1__pagination` внутри root. **Может быть вне root.** | `container: '#pagination'` |
| `type` | `'bullets' \| 'fraction' \| 'progress' \| 'custom'` | Тип: точки, дробь, прогресс-бар, кастомный HTML. | `type: 'fraction'` |
| `clickable` | `boolean` | Клик по буллету переключает слайд. | `clickable: true` |
| `bulletClass` | `string` | Класс буллета. | `bulletClass: 'dot'` |
| `bulletActiveClass` | `string` | Класс активного буллета (по умолчанию BEM `tvist-v1__bullet--active`). | `bulletActiveClass: 'current'` |
| `renderBullet` | `(index, className) => string` | Кастомный HTML буллета. | см. [Pagination](./pagination.md) |
| `renderFraction` | `(current, total) => string` | Кастомный HTML для типа `fraction`. | см. [Pagination](./pagination.md) |
| `renderCustom` | `(current, total) => string` | Кастомный HTML для типа `custom`. | см. [Pagination](./pagination.md) |

**Примеры:**

```javascript
// Пагинация по умолчанию (контейнер внутри root)
pagination: true

// Контейнер снаружи + дробь
pagination: {
  container: '#pagination',
  type: 'fraction',
  clickable: true
}

// Буллеты в футере страницы
pagination: {
  container: document.querySelector('.footer-dots'),
  type: 'bullets',
  clickable: true
}
```

Подробнее про типы пагинации (bullets, fraction, progress, custom) и стратегии отображения — на странице [Pagination](./pagination.md).

---

## Кратко

- **Стрелки:** `arrows: true` — кнопки с классами `.tvist-v1__arrow--prev` / `--next` внутри root. Для кнопок **вне root** задайте `arrows: { prev: '#id-prev', next: '#id-next' }` (селекторы ищутся по всему документу).
- **Пагинация:** по умолчанию контейнер — `.tvist-v1__pagination` внутри root. Чтобы вывести пагинацию **вне root**, укажите `pagination: { container: '#id-pagination', ... }`.
