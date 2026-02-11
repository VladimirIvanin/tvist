# Навигация

Управление слайдером: **стрелки** (prev/next) и **пагинация** (буллеты, дробь, прогресс, кастом). Оба блока можно размещать внутри корня слайдера или **за его пределами** — в любом месте страницы.

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Tvist from 'tvist'

// 1. По умолчанию (всё внутри root)
const defaultRef = ref(null)
// 2. Стрелки и пагинация снаружи
const outsideRef = ref(null)
let sliderDefault = null
let sliderOutside = null

onMounted(() => {
  if (defaultRef.value) {
    sliderDefault = new Tvist(defaultRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: { type: 'bullets', clickable: true }
    })
  }
  if (outsideRef.value) {
    sliderOutside = new Tvist(outsideRef.value, {
      perPage: 1,
      speed: 300,
      arrows: { prev: '#nav-outside-prev', next: '#nav-outside-next' },
      pagination: { container: '#nav-outside-pagination', type: 'fraction', clickable: true }
    })
  }
})

onUnmounted(() => {
  sliderDefault?.destroy()
  sliderOutside?.destroy()
})
</script>

## Навигация по умолчанию (внутри root)

Стрелки и пагинация лежат **внутри** корневого элемента слайдера. Кнопки ищутся по классам `.tvist-v1__arrow--prev` / `.tvist-v1__arrow--next`, контейнер пагинации — `.tvist-v1__pagination`.

<div ref="defaultRef" class="tvist-v1 nav-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
  <button class="tvist-v1__arrow tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
const slider = new Tvist('.slider', {
  arrows: true,
  pagination: { type: 'bullets', clickable: true }
})
```

```html
<div class="tvist-v1">
  <div class="tvist-v1__container">...</div>
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
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
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

<div ref="outsideRef" class="tvist-v1 nav-demo-slider" id="nav-outside-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
</div>

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
| `bulletActiveClass` | `string` | Класс активного буллета. | `bulletActiveClass: 'current'` |
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

<style>
.nav-demo-slider {
  max-width: 480px;
  margin: 0 auto 1.5rem;
  position: relative;
}
.nav-demo-slider .tvist-v1__slide {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
  border-radius: 8px;
}
.nav-demo-slider .tvist-v1__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.nav-demo-slider .tvist-v1__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.nav-demo-slider .tvist-v1__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.nav-demo-slider .tvist-v1__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.nav-demo-slider .tvist-v1__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

.nav-demo-slider :deep(.tvist-v1__arrow--prev),
.nav-demo-slider :deep(.tvist-v1__arrow--next) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #fff;
  cursor: pointer;
}
.nav-demo-slider :deep(.tvist-v1__arrow--prev) { left: 8px; }
.nav-demo-slider :deep(.tvist-v1__arrow--next) { right: 8px; }
.nav-demo-slider :deep(.tvist-v1__arrow--prev:hover),
.nav-demo-slider :deep(.tvist-v1__arrow--next:hover) { background: rgba(0,0,0,0.7); }
.nav-demo-slider :deep(.tvist-v1__arrow--prev.disabled),
.nav-demo-slider :deep(.tvist-v1__arrow--next.disabled) { opacity: 0.4; cursor: not-allowed; }
.nav-demo-slider :deep(.tvist-v1__pagination) {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.nav-demo-slider :deep(.tvist-v1__bullet) {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  border: none;
  cursor: pointer;
  padding: 0;
}
.nav-demo-slider :deep(.tvist-v1__bullet.active) { background: #333; }

.slider-controls.nav-outside-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 1rem 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}
.slider-controls.nav-outside-controls button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.slider-controls.nav-outside-controls button:hover { background: #eee; }
#nav-outside-pagination { font-variant-numeric: tabular-nums; min-width: 4ch; text-align: center; }
</style>
