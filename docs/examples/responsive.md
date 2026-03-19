# Responsive Example

Адаптивный слайдер с автоматической подстройкой под разные размеры экрана.

<script setup>
import ResponsiveExample from '../.vitepress/theme/examples/ResponsiveExample.vue'
</script>

<ResponsiveExample />

## Container-first

Tvist — **container-first** слайдер: размеры слайдов и расчёт `perPage` всегда основаны на **ширине контейнера** (корневого элемента слайдера), а не окна браузера.

- **ResizeObserver** следит за контейнером: при изменении его размера (окно, сайдбар, grid, модалка) слайдер пересчитывает размеры и обновляется.
- **slideMinSize** — `perPage` считается от ширины контейнера.
- **Breakpoints** по умолчанию привязаны к **окну** (viewport) для удобства; при необходимости можно переключить на ширину контейнера через `breakpointsBase: 'container'`.

Это позволяет корректно работать слайдеру внутри узких колонок, модальных окон и любых контекстов, где ширина контейнера не совпадает с шириной окна.

## Описание

Адаптивность — ключевая функция современных слайдеров. Tvist предлагает несколько способов сделать слайдер отзывчивым:

1. **Breakpoints** — явно задайте настройки для разных ширин (по умолчанию — окна; опционально — контейнера)
2. **slideMinSize** — автоматический расчёт `perPage` от ширины контейнера
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
- Tvist автоматически рассчитывает, сколько слайдов поместится в **контейнер** (container-first)
- Формула: `perPage = floor((containerWidth + gap) / (slideMinSize + gap))`
- При изменении размера контейнера (ResizeObserver) `perPage` пересчитывается автоматически
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
<div class="tvist-v1">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">Slide 1</div>
    <div class="tvist-v1__slide">Slide 2</div>
    <div class="tvist-v1__slide">Slide 3</div>
    <div class="tvist-v1__slide">Slide 4</div>
    <div class="tvist-v1__slide">Slide 5</div>
    <div class="tvist-v1__slide">Slide 6</div>
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

## Модули и брейкпоинты

Модули (`pagination`, `arrows` и др.) полностью реагируют на смену брейкпоинта: при переходе в брейкпоинт модуль инициализируется, при выходе — уничтожается.

Это позволяет, например, показывать пагинацию только на мобильных устройствах:

```javascript
new Tvist('.tvist', {
  perPage: 3,
  pagination: false,  // На десктопе пагинации нет
  breakpoints: {
    768: {
      perPage: 1,
      pagination: true  // На мобиле пагинация появляется
    }
  }
})
```

Аналогично работает для стрелок (`arrows`), автоплея (`autoplay`) и любых других модулей.

### Адаптивная пагинация (limit по breakpoints)

В breakpoints можно менять не только `perPage` и `gap`, но и опции модулей, например **pagination.limit** — максимальное количество видимых точек. На десктопе можно показывать 7 точек, на планшете 5, на мобиле 3:

```javascript
new Tvist('.tvist', {
  perPage: 3,
  pagination: {
    limit: 7,
    clickable: true
  },
  breakpoints: {
    992: { pagination: { limit: 5, clickable: true } },
    768: { pagination: { limit: 3, clickable: true } }
  }
})
```

При смене breakpoint вызывается `update()`, пагинация перерисовывается с новым limit.

## Lock на десктопе, листание на мобиле

Если на десктопе слайдов ровно на одну страницу (например `perPage: 2` и 2 слайда), слайдер «заблокирован» — одна страница, листать нечего. При включённом **hideWhenSinglePage** (по умолчанию) стрелки и пагинация автоматически скрываются. На мобиле при `perPage: 1` те же 2 слайда дают две страницы — стрелки и пагинация появляются, слайдер листается.

```javascript
new Tvist('.tvist', {
  perPage: 2,
  arrows: true,
  pagination: true,
  breakpoints: {
    768: { perPage: 1 }
  }
})
```

Итого: на широком экране блок статичен (без стрелок и точек), на узком — полноценный слайдер.

## Связанные примеры

- [PerPage Example](./perpage.md) — базовое использование `perPage`
- [Basic Example](./basic.md) — основы слайдера
- [Modules](./modules.md) — комбинирование с другими модулями
