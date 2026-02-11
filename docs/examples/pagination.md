# Пагинация

Типы пагинации: **bullets** (точки), **fraction** (дробь «текущий / всего»), **progress** (прогресс-бар) и **custom** (собственный HTML через функцию).

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Tvist from 'tvist'

const bulletsRef = ref(null)
const fractionRef = ref(null)
const progressRef = ref(null)
const customRef = ref(null)
const evenRef = ref(null)
const evenCenterRef = ref(null)
const centerRef = ref(null)

let sliderBullets = null
let sliderFraction = null
let sliderProgress = null
let sliderCustom = null
let sliderEven = null
let sliderEvenCenter = null
let sliderCenter = null

onMounted(() => {
  if (bulletsRef.value) {
    sliderBullets = new Tvist(bulletsRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: { type: 'bullets', clickable: true }
    })
  }
  if (fractionRef.value) {
    sliderFraction = new Tvist(fractionRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: { type: 'fraction' }
    })
  }
  if (progressRef.value) {
    sliderProgress = new Tvist(progressRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: { type: 'progress' }
    })
  }
  if (customRef.value) {
    sliderCustom = new Tvist(customRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: {
        type: 'custom',
        renderCustom: (current, total) =>
          `<span class="pagination-custom">Слайд ${current} из ${total}</span>`
      }
    })
  }
  if (evenRef.value) {
    sliderEven = new Tvist(evenRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: {
        type: 'bullets',
        limit: 5,
        strategy: 'even'
      }
    })
  }
  if (evenCenterRef.value) {
    sliderEvenCenter = new Tvist(evenCenterRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: {
        type: 'bullets',
        limit: 2,
        strategy: 'even',
        remainderStrategy: 'center'
      }
    })
  }
  if (centerRef.value) {
    sliderCenter = new Tvist(centerRef.value, {
      perPage: 1,
      speed: 300,
      arrows: true,
      pagination: {
        type: 'bullets',
        limit: 5,
        strategy: 'center'
      }
    })
  }
})

onUnmounted(() => {
  sliderBullets?.destroy()
  sliderFraction?.destroy()
  sliderProgress?.destroy()
  sliderCustom?.destroy()
  sliderEven?.destroy()
  sliderEvenCenter?.destroy()
  sliderCenter?.destroy()
})
</script>

## Bullets (точки)

Классические кликабельные точки. Опция `clickable: true` включает переход по клику.

<div ref="bulletsRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'bullets',
  clickable: true
}
```

---

## Fraction (дробь)

Отображение в виде «текущий / всего» (например, 2 / 5). Можно переопределить разметку через `renderFraction(current, total)`.

<div ref="fractionRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'fraction'
}
```

---

## Progress (прогресс-бар)

Горизонтальная полоса, заполняющаяся по мере перехода к последнему слайду.

<div ref="progressRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'progress'
}
```

---

## Custom (кастомный рендер)

Тип `custom` с функцией `renderCustom(current, total)` — вы возвращаете произвольный HTML (например, текст «Слайд 3 из 6» или свою разметку).

<div ref="customRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'custom',
  renderCustom: (current, total) =>
    `<span class="pagination-custom">Слайд ${current} из ${total}</span>`
}
```

<style scoped>
.pagination-demo-slider {
  position: relative;
  margin-bottom: 2rem;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  min-height: 200px;
}

.pagination-demo-slider .tvist-v1__container {
  display: flex;
}

.pagination-demo-slider .tvist-v1__slide {
  height: 200px;
  min-height: 200px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: white;
}

.pagination-demo-slider .tvist-v1__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(6) { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(7) { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(8) { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(9) { background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); }
.pagination-demo-slider .tvist-v1__slide:nth-child(10) { background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); }

/* Стрелки — позиция поверх слайда */
.pagination-demo-slider :deep(.tvist-v1__arrow--prev),
.pagination-demo-slider :deep(.tvist-v1__arrow--next) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 11;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.3);
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.pagination-demo-slider :deep(.tvist-v1__arrow--prev) { left: 10px; }
.pagination-demo-slider :deep(.tvist-v1__arrow--next) { right: 10px; }

/* Пагинация — внизу по центру, поверх слайда */
.pagination-demo-slider .tvist-v1__pagination {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 0;
}

/* Bullets: круги, без маркеров темы */
.pagination-demo-slider :deep(.tvist-v1__bullet) {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transition: background 0.2s, width 0.2s;
  cursor: pointer;
  list-style: none;
  border: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.pagination-demo-slider :deep(.tvist-v1__bullet::before),
.pagination-demo-slider :deep(.tvist-v1__bullet::after) {
  display: none !important;
}
.pagination-demo-slider :deep(.tvist-v1__bullet.active) {
  background: #fff;
  width: 24px;
  border-radius: 4px;
}

/* Fraction — читаемый текст на градиенте */
.pagination-demo-slider :deep(.tvist-v1__pagination-current),
.pagination-demo-slider :deep(.tvist-v1__pagination-separator),
.pagination-demo-slider :deep(.tvist-v1__pagination-total) {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* Progress bar */
.pagination-demo-slider :deep(.tvist-v1__pagination-progress) {
  width: 120px;
  max-width: 200px;
  height: 4px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  overflow: hidden;
}

.pagination-demo-slider :deep(.tvist-v1__pagination-progress-bar) {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.3s ease;
  box-shadow: 0 0 4px rgba(0,0,0,0.2);
}

.pagination-custom {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
</style>

---

## Лимит точек (Bullets Limit)

Для слайдеров с большим количеством слайдов можно ограничить количество отображаемых точек и объединить слайды в группы. Поддерживаются две стратегии распределения:

### Равномерное распределение (Even Strategy)

Каждая точка представляет равное количество слайдов. Например, 10 слайдов с лимитом 5 точек: каждая точка = 2 слайда.

<div ref="evenRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide" v-for="i in 10" :key="i">{{i}}</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

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

Пример: 7 слайдов, лимит 2, стратегия центр → [4, 3] слайда на точку.

<div ref="evenCenterRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide" v-for="i in 7" :key="i">{{i}}</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'bullets',
  limit: 2,
  strategy: 'even',
  remainderStrategy: 'center' // левая точка получает остаток
}
```

### Центральное распределение (Center Strategy)

Крайние точки (первая и последняя) представляют по одному слайду, остальные слайды группируются в центральных точках.

<div ref="centerRef" class="tvist-v1 pagination-demo-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide" v-for="i in 10" :key="i">{{i}}</div>
  </div>
  <button class="tvist-v1__arrow--prev" aria-label="Предыдущий"></button>
  <button class="tvist-v1__arrow--next" aria-label="Следующий"></button>
  <div class="tvist-v1__pagination"></div>
</div>

```javascript
pagination: {
  type: 'bullets',
  limit: 5,
  strategy: 'center'
}
```

В этом примере (10 слайдов, 5 точек):
- Точка 1: слайд 0
- Точки 2-4: слайды 1-8 (центральная группа)
- Точка 5: слайд 9

---

## Опции пагинации

| Опция | Тип | Описание |
|-------|-----|----------|
| `type` | `'bullets' \| 'fraction' \| 'progress' \| 'custom'` | Тип пагинации |
| `clickable` | `boolean` | Клики по буллетам переключают слайд (по умолчанию `true` для bullets) |
| `bulletClass` | `string` | CSS-класс буллета |
| `bulletActiveClass` | `string` | CSS-класс активного буллета (по умолчанию `'active'`) |
| `container` | `string \| HTMLElement` | Селектор или элемент-контейнер для пагинации |
| `renderBullet` | `(index, className) => string` | Кастомный HTML буллета |
| `renderFraction` | `(current, total) => string` | Кастомный HTML для fraction |
| `renderCustom` | `(current, total) => string` | Кастомный HTML для типа `custom` |
| `limit` | `number` | Максимальное количество видимых точек (только для `type: 'bullets'`) |
| `strategy` | `'even' \| 'center'` | Стратегия распределения слайдов по точкам при использовании `limit` (по умолчанию `'even'`) |
| `remainderStrategy` | `'left' \| 'center' \| 'right'` | Стратегия распределения остатка при равномерном делении (только для `strategy: 'even'`, по умолчанию `'center'`) |

Контейнер по умолчанию — элемент с классом `.tvist-v1__pagination` внутри корня слайдера.
