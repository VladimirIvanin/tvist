# Responsive Example

Адаптивный слайдер с автоматической подстройкой под разные размеры экрана.

<script setup>
import ResponsiveExample from '../.vitepress/theme/examples/ResponsiveExample.vue'
</script>

<ResponsiveExample />

## Описание

Адаптивность — ключевая функция современных слайдеров. Tvist предлагает несколько способов сделать слайдер отзывчивым:

1. **Breakpoints** — явно задайте настройки для разных ширин экрана
2. **slideMinSize** — автоматический расчет `perPage` на основе минимального размера слайда
3. **breakpointsBase** — breakpoints относительно окна или контейнера

## Способ 1: Breakpoints

### Window-based breakpoints (по умолчанию)

```javascript
const slider = new Tvist('.tvist', {
  perPage: 4,
  gap: 20,
  speed: 300,
  drag: true,
  
  // Настройки для разных ширин окна
  breakpoints: {
    1200: {  // При ширине ≤ 1200px
      perPage: 3,
      gap: 16
    },
    992: {   // При ширине ≤ 992px
      perPage: 2,
      gap: 16
    },
    768: {   // При ширине ≤ 768px
      perPage: 1,
      gap: 0
    }
  },
  
  // Обработчик смены breakpoint
  on: {
    breakpoint: (bp) => {
      console.log('Текущий breakpoint:', bp);
    }
  }
});
```

**Как это работает:**
- Базовые настройки (`perPage: 4`) применяются по умолчанию (на больших экранах)
- При ширине окна ≤ 1200px применяются настройки из `breakpoints[1200]`
- Breakpoints работают по принципу `max-width` (как в CSS media queries)
- Используется native `matchMedia` API для оптимальной производительности

### Container-based breakpoints

```javascript
const slider = new Tvist('.tvist', {
  perPage: 2,
  gap: 12,
  speed: 300,
  
  // Breakpoints относительно КОНТЕЙНЕРА, а не окна
  breakpointsBase: 'container',
  
  breakpoints: {
    600: {  // При ширине контейнера ≤ 600px
      perPage: 1,
      gap: 0
    }
  }
});
```

**Когда использовать:**
- Слайдер в боковой колонке
- Модальные окна переменной ширины
- Компоненты в grid-layout
- Любые случаи, где ширина контейнера не равна ширине окна

## Способ 2: slideMinSize (автоматический расчет)

```javascript
const slider = new Tvist('.tvist', {
  // Вместо фиксированного perPage
  slideMinSize: 250,  // Минимальная ширина слайда в пикселях
  
  gap: 16,
  speed: 300,
  drag: true,
  
  on: {
    resize: () => {
      // При resize пересчитывается perPage автоматически
      console.log('Текущий perPage:', slider.options.perPage);
    }
  }
});
```

**Как это работает:**
- Tvist автоматически рассчитывает, сколько слайдов поместится в контейнер
- Формула: `perPage = floor((containerWidth + gap) / (slideMinSize + gap))`
- При resize окна `perPage` пересчитывается автоматически
- Минимум: `perPage = 1`

**Преимущества:**
- Не нужно вручную прописывать все breakpoints
- Плавная адаптация под любые размеры экрана
- Идеально для fluid/responsive дизайна

## Комбинирование подходов

Можно комбинировать `slideMinSize` с `breakpoints` для тонкой настройки:

```javascript
const slider = new Tvist('.tvist', {
  slideMinSize: 250,  // База для расчета
  gap: 16,
  
  breakpoints: {
    768: {
      slideMinSize: 200,  // На мобильных — меньше
      gap: 12
    },
    480: {
      perPage: 1,  // На очень маленьких — форсируем 1 слайд
      gap: 0
    }
  }
});
```

## HTML разметка

```html
<div class="tvist">
  <div class="tvist__container">
    <div class="tvist__slide">Slide 1</div>
    <div class="tvist__slide">Slide 2</div>
    <div class="tvist__slide">Slide 3</div>
    <div class="tvist__slide">Slide 4</div>
    <div class="tvist__slide">Slide 5</div>
    <div class="tvist__slide">Slide 6</div>
  </div>
</div>
```

## Практические рекомендации

### Desktop First стратегия

```javascript
{
  perPage: 4,        // Desktop (>1200px)
  breakpoints: {
    1200: { perPage: 3 },  // Tablet landscape
    992: { perPage: 2 },   // Tablet portrait
    768: { perPage: 1 }    // Mobile
  }
}
```

### Mobile First стратегия

```javascript
{
  perPage: 1,        // Mobile (базовое)
  breakpoints: {
    // Используем min-width логику через инверсию
    // Или полагаемся на то, что на больших экранах база применится
  }
}
```

**Примечание:** Tvist использует `max-width` логику, поэтому Desktop First подход более естественен.

### Адаптивные gaps

```javascript
{
  perPage: 4,
  gap: 24,
  breakpoints: {
    992: { 
      perPage: 3,
      gap: 20  // Меньший gap на средних экранах
    },
    768: { 
      perPage: 2,
      gap: 16  // Еще меньше
    },
    480: { 
      perPage: 1,
      gap: 0   // Без gap на мобильных
    }
  }
}
```

## События и callbacks

```javascript
const slider = new Tvist('.tvist', {
  // ... настройки
  
  on: {
    breakpoint: (bp) => {
      console.log('Изменился breakpoint:', bp);
      console.log('Новый perPage:', slider.options.perPage);
      
      // Можно динамически менять UI
      if (bp <= 768) {
        // Мобильная версия
      }
    },
    
    resize: () => {
      // Вызывается при resize окна
      // Полезно для slideMinSize режима
    }
  }
});
```

## Производительность

**Оптимизации в Tvist:**
- `matchMedia` API используется для window-based breakpoints (нет постоянных проверок)
- Container-based режим использует throttled resize observer
- Пересчеты происходят только при реальном изменении breakpoint
- События `breakpoint` и `resize` дебаунсятся

## Сравнение подходов

| Подход | Плюсы | Минусы | Когда использовать |
|--------|-------|--------|-------------------|
| **Breakpoints** | Полный контроль, предсказуемость | Нужно задавать вручную | Дизайн с четкими breakpoints |
| **slideMinSize** | Автоматика, гибкость | Менее предсказуемо | Fluid дизайн, много размеров |
| **Container-based** | Работает в любом контексте | Больше ресурсов | Боковые панели, модальные окна |

## Связанные примеры

- [PerPage Example](./perpage.md) — базовое использование `perPage`
- [Basic Example](./basic.md) — основы слайдера
- [Modules](./modules.md) — комбинирование с другими модулями
