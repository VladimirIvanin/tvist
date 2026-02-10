# Drag Free Mode

Режим свободного перетаскивания позволяет прокручивать слайдер без привязки к позициям слайдов, как обычный скролл.

<script setup>
import DragFreeDocExample from '../.vitepress/theme/examples/DragFreeDocExample.vue'
</script>

## Основные возможности

- ✅ Свободная прокрутка без snap к слайдам
- ✅ **Momentum scroll** — инерционное движение после свайпа (как в нативных приложениях)
- ✅ Опциональный snap после остановки
- ✅ Настройка скорости и friction
- ✅ Rubberband эффект на границах

## Что такое Momentum Scroll?

**Momentum scroll** (инерционная прокрутка) — это эффект, когда после быстрого свайпа контент продолжает движение по инерции, плавно замедляясь.

### Как это работает:

1. **Быстрый свайп** — проведите пальцем/мышью быстро и отпустите
2. **Инерция** — слайдер продолжает двигаться в том же направлении
3. **Затухание** — скорость плавно уменьшается (friction)
4. **Остановка** — движение прекращается естественным образом

**Пример:** Чем быстрее вы делаете свайп, тем дальше "улетит" слайдер — точно как при прокрутке списка в iPhone или Android!

## Интерактивная демонстрация

<DragFreeDocExample />

## Базовый пример

```typescript
import Tvist from 'tvist'

const slider = new Tvist('.slider', {
  drag: 'free', // Включить free mode
  perPage: 3,
  gap: 20
})
```

## Free mode с snap

Вы можете включить автоматическую привязку к ближайшему слайду после окончания momentum scroll:

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  freeSnap: true, // Snap к ближайшему слайду после остановки
  perPage: 3,
  gap: 20
})
```

## Настройка скорости

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  dragSpeed: 1.5, // Увеличить чувствительность перетаскивания
  perPage: 3,
  gap: 20
})
```

## Отключение rubberband

По умолчанию включён эффект "резинки" на границах. Вы можете его отключить:

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  rubberband: false, // Отключить эффект резинки
  perPage: 3,
  gap: 20
})
```

## Обычный drag mode

Для сравнения, обычный режим с автоматическим snap к слайдам:

```typescript
const slider = new Tvist('.slider', {
  drag: true, // Обычный режим (по умолчанию)
  perPage: 3,
  gap: 20
})
```

## Сравнение режимов

### Free Mode (`drag: 'free'`)

- Свободная прокрутка без ограничений
- Momentum scroll с плавным затуханием
- Можно остановиться между слайдами
- Идеально для галерей и каталогов

### Free Mode + Snap (`drag: 'free'` + `freeSnap: true`)

- Свободная прокрутка с инерцией
- Автоматическое выравнивание после остановки
- Лучшее из двух миров
- Подходит для списков товаров

### Normal Mode (`drag: true`)

- Переключение слайдов свайпом
- Snap во время перетаскивания
- Чёткие переходы между слайдами
- Классическое поведение слайдера

## События

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  on: {
    dragStart: () => console.log('Начало перетаскивания'),
    drag: () => console.log('Перетаскивание'),
    dragEnd: () => console.log('Конец перетаскивания'),
    scroll: () => console.log('Прокрутка')
  }
})
```

## Использование с другими модулями

### С Peek

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  freeSnap: true,
  peek: { left: 20, right: 20 },
  gap: 15
})
```

### С Center

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  freeSnap: true,
  center: true,
  perPage: 3,
  gap: 20
})
```

### С Loop

```typescript
const slider = new Tvist('.slider', {
  drag: 'free',
  loop: true,
  perPage: 3,
  gap: 20
})
```

## Адаптивность

Вы можете переключать режимы на разных экранах:

```typescript
new Tvist('.slider', {
  drag: true, // На мобильных обычный режим
  perPage: 1,
  gap: 10,
  breakpoints: {
    768: {
      drag: 'free', // На планшетах free mode
      freeSnap: true,
      perPage: 2,
      gap: 15
    },
    1024: {
      drag: 'free', // На десктопах free mode без snap
      freeSnap: false,
      perPage: 4,
      gap: 20
    }
  }
})
```

## Примеры использования

### Галерея изображений

```html
<div class="gallery">
  <div class="tvist-v1">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">
        <img src="photo1.jpg" alt="Photo 1">
      </div>
      <div class="tvist-v1__slide">
        <img src="photo2.jpg" alt="Photo 2">
      </div>
      <div class="tvist-v1__slide">
        <img src="photo3.jpg" alt="Photo 3">
      </div>
      <!-- ... -->
    </div>
  </div>
</div>
```

```typescript
new Tvist('.gallery .tvist', {
  drag: 'free',
  perPage: 3,
  gap: 15,
  peek: 50
})
```

### Каталог товаров

```typescript
new Tvist('.products-slider', {
  drag: 'free',
  freeSnap: true, // Выравнивание после прокрутки
  perPage: 4,
  gap: 20,
  peek: { left: 30, right: 30 }
})
```

## Особенности

### Производительность

Free mode использует `requestAnimationFrame` для плавной анимации и `translate3d` для аппаратного ускорения.

### Focusable элементы

По умолчанию drag не работает на интерактивных элементах:

```typescript
new Tvist('.slider', {
  drag: 'free',
  focusableElements: 'button, a, input, select, textarea' // По умолчанию
})
```

### Touch и Mouse

Drag module поддерживает как touch события (на мобильных), так и mouse события (на десктопе).
