# Карточки товаров: сетка → слайдер

Практический пример адаптивного поведения: на десктопе карточки отображаются статичной сеткой, на мобильных устройствах автоматически превращаются в интерактивный слайдер.

<script setup>
import ProductCardsExample from '../.vitepress/theme/examples/ProductCardsExample.vue'
</script>

<ProductCardsExample />

## Описание

Частая задача в e-commerce: показывать карточки товаров сеткой на больших экранах (без слайдера) и переключаться на слайдер для удобной навигации на мобильных устройствах.

**Ключевые особенности:**
- На десктопе (≥768px) — статичная CSS Grid сетка (`enabled: false`)
- На мобильных (<768px) — полноценный Tvist слайдер с drag и pagination (`enabled: true`)
- Встроенная опция `enabled` в breakpoints — Tvist сам управляет переключением
- Нет необходимости вручную создавать/уничтожать слайдер
- Одна инициализация, вся логика внутри библиотеки

## Реализация

### HTML структура

Стандартная разметка Tvist (всегда одинаковая):

```html
<div class="tvist">
  <div class="tvist__container">
    <div class="tvist__slide product-card">
      <div class="product-image">
        <div class="product-badge">ХИТ</div>
      </div>
      <div class="product-info">
        <h4 class="product-title">Смартфон Galaxy X</h4>
        <p class="product-description">Флагманский смартфон</p>
        <div class="product-footer">
          <span class="product-price">49 990 ₽</span>
          <button class="product-btn">В корзину</button>
        </div>
      </div>
    </div>
    <!-- Остальные карточки -->
  </div>
</div>
```

### CSS стили

```css
/* Контейнер слайдера */
.tvist {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* Когда слайдер отключен (десктоп) - показываем как сетку */
.tvist.tvist--disabled .tvist__container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
  transform: none !important; /* Отменяем transform от слайдера */
}

.tvist.tvist--disabled .tvist__slide {
  width: auto !important; /* Отменяем фиксированную ширину */
  margin: 0 !important;    /* Отменяем margin от gap */
}

/* Планшеты: 2 колонки */
@media (max-width: 1024px) and (min-width: 768px) {
  .tvist.tvist--disabled .tvist__container {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* Карточка товара */
.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

/* В режиме сетки (disabled) - добавляем тень и hover */
.tvist.tvist--disabled .product-card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tvist.tvist--disabled .product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

/* В режиме слайдера убираем эффекты */
.tvist:not(.tvist--disabled) .product-card {
  box-shadow: none;
  border-radius: 0;
}

.tvist:not(.tvist--disabled) .product-card:hover {
  transform: none;
}
```

**Ключевой момент:** Класс `.tvist--disabled` автоматически добавляется/удаляется Tvist при изменении `enabled` опции.

### JavaScript логика

#### Vanilla JS

```javascript
// Инициализация слайдера с опцией enabled
const slider = new Tvist('.tvist', {
  // По умолчанию (десктоп) - слайдер отключен
  enabled: false,
  perPage: 1,
  gap: 16,
  speed: 300,
  drag: true,
  pagination: {
    type: 'bullets',
    clickable: true
  },
  // Breakpoints: на мобильных включаем слайдер
  breakpoints: {
    767: {
      enabled: true,  // Включаем слайдер на экранах ≤767px
      perPage: 1,
      gap: 16
    }
  },
  on: {
    enabled: () => {
      console.log('Слайдер включен (мобильный режим)');
      updateUI(true);
    },
    disabled: () => {
      console.log('Слайдер отключен (десктоп режим)');
      updateUI(false);
    },
    breakpoint: (bp) => {
      console.log('Breakpoint изменился:', bp);
    }
  }
});

function updateUI(isSliderMode) {
  const statusBadge = document.querySelector('.status-badge');
  if (statusBadge) {
    statusBadge.textContent = isSliderMode ? '📱 Режим слайдера' : '🖥️ Режим сетки';
    statusBadge.classList.toggle('is-slider', isSliderMode);
  }
}

// Cleanup при уходе со страницы
window.addEventListener('beforeunload', () => {
  slider.destroy();
});
```

**Вот и всё!** Больше не нужно вручную управлять созданием/уничтожением слайдера. Tvist делает это автоматически на основе `enabled` опции в breakpoints.

#### Vue 3

```vue
<template>
  <div class="tvist">
    <div class="tvist__container">
      <div v-for="product in products" :key="product.id" class="tvist__slide product-card">
        <!-- Контент карточки -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'

const slider = ref(null)
const isSliderMode = ref(false)

onMounted(() => {
  slider.value = new Tvist('.tvist', {
    // По умолчанию (десктоп) - слайдер отключен
    enabled: false,
    perPage: 1,
    gap: 16,
    speed: 300,
    drag: true,
    pagination: {
      type: 'bullets',
      clickable: true
    },
    // Breakpoints: на мобильных включаем слайдер
    breakpoints: {
      767: {
        enabled: true,
        perPage: 1,
        gap: 16
      }
    },
    on: {
      created: (instance) => {
        isSliderMode.value = instance.isEnabled
      },
      enabled: () => {
        isSliderMode.value = true
      },
      disabled: () => {
        isSliderMode.value = false
      },
      breakpoint: () => {
        if (slider.value) {
          isSliderMode.value = slider.value.isEnabled
        }
      }
    }
  })
})

onUnmounted(() => {
  slider.value?.destroy()
})
</script>
```

#### React

```jsx
import { useEffect, useRef, useState } from 'react'
import Tvist from 'tvist'

function ProductCards() {
  const sliderRef = useRef(null)
  const [isSliderMode, setIsSliderMode] = useState(false)

  useEffect(() => {
    sliderRef.current = new Tvist('.tvist', {
      // По умолчанию (десктоп) - слайдер отключен
      enabled: false,
      perPage: 1,
      gap: 16,
      speed: 300,
      drag: true,
      pagination: {
        type: 'bullets',
        clickable: true
      },
      // Breakpoints: на мобильных включаем слайдер
      breakpoints: {
        767: {
          enabled: true,
          perPage: 1,
          gap: 16
        }
      },
      on: {
        created: (instance) => {
          setIsSliderMode(instance.isEnabled)
        },
        enabled: () => {
          setIsSliderMode(true)
        },
        disabled: () => {
          setIsSliderMode(false)
        },
        breakpoint: () => {
          if (sliderRef.current) {
            setIsSliderMode(sliderRef.current.isEnabled)
          }
        }
      }
    })

    return () => {
      sliderRef.current?.destroy()
    }
  }, [])

  return (
    <div className="tvist">
      <div className="tvist__container">
        {products.map(product => (
          <div key={product.id} className="tvist__slide product-card">
            {/* Контент карточки */}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Ключевые моменты

### 1. Опция `enabled`

Новая опция в Tvist для полного отключения/включения слайдера:

```javascript
{
  enabled: false  // Слайдер отключен (статичный контент)
}
```

При `enabled: false`:
- Убирается `transform` с контейнера
- Очищаются инлайн-стили со слайдов
- Отключаются все модули (drag, pagination, arrows и т.д.)
- Добавляется класс `.tvist--disabled` для CSS стилизации

### 2. Использование в breakpoints

Можно задавать `enabled` для разных разрешений:

```javascript
{
  enabled: false,  // По умолчанию отключен (десктоп)
  breakpoints: {
    767: {
      enabled: true  // Включен на мобильных (≤767px)
    }
  }
}
```

Tvist автоматически переключается между режимами при изменении размера окна.

### 3. События enabled/disabled

Отслеживайте переключение режимов:

```javascript
{
  on: {
    enabled: () => {
      console.log('Слайдер включен')
    },
    disabled: () => {
      console.log('Слайдер отключен')
    }
  }
}
```

### 4. CSS класс `.tvist--disabled`

Автоматически добавляется при `enabled: false`:

```css
/* Режим сетки */
.tvist.tvist--disabled .tvist__container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  transform: none !important;
}

/* Режим слайдера */
.tvist:not(.tvist--disabled) {
  /* Стили слайдера */
}
```

### 5. Методы API

Программное управление состоянием:

```javascript
slider.disable()  // Отключить слайдер
slider.enable()   // Включить слайдер
slider.isEnabled  // Проверить состояние (геттер)
```

## Альтернативные подходы

### ❌ Вариант 1: Ручное создание/уничтожение (старый подход)

```javascript
// НЕ рекомендуется - слишком сложно
function initSlider() {
  // Создание DOM структуры
  // Инициализация Tvist
}

function destroySlider() {
  // Уничтожение слайдера
  // Восстановление DOM
}

window.addEventListener('resize', () => {
  if (isMobile && !slider) initSlider()
  else if (!isMobile && slider) destroySlider()
})
```

**Проблемы:**
- Много кода для управления DOM
- Сложная логика создания/уничтожения
- Риск утечек памяти
- Нужно вручную очищать стили

### ❌ Вариант 2: Два отдельных блока

```html
<div class="desktop-only"><!-- Сетка --></div>
<div class="mobile-only"><!-- Слайдер --></div>
```

**Проблемы:**
- Дублирование контента в DOM
- Хуже для SEO
- Больше памяти
- Сложнее поддерживать

### ✅ Рекомендуемый подход: `enabled` в breakpoints

```javascript
new Tvist('.tvist', {
  enabled: false,
  breakpoints: {
    767: { enabled: true }
  }
})
```

**Преимущества:**
- Одна инициализация
- Вся логика внутри библиотеки
- Минимум кода
- Автоматическое управление состоянием
- Нет дублирования контента

## Производительность

**Оптимизации:**
- Throttle для resize событий (150ms)
- Слайдер инициализируется только на мобильных
- Минимальные манипуляции с DOM
- Очистка всех слушателей при unmount

**Метрики:**
- Инициализация слайдера: ~10-20ms
- Уничтожение слайдера: ~5-10ms
- Переключение режимов: ~30-50ms

## Практические рекомендации

1. **Выбор breakpoint:** 768px — стандарт для мобильных/десктоп, но можно настроить под дизайн
2. **Throttle delay:** 150ms оптимален для баланса отзывчивости и производительности
3. **Анимации:** Отключайте CSS transitions при программном изменении структуры
4. **SEO:** Используйте семантичную разметку одинаковую для обоих режимов
5. **Accessibility:** Добавьте ARIA атрибуты для навигации в режиме слайдера

## Связанные примеры

- [Responsive Example](./responsive.md) — адаптивность через breakpoints
- [Grid Example](./grid.md) — сетка слайдов (не путать с CSS Grid)
- [Basic Example](./basic.md) — основы работы со слайдером
- [Modules](./modules.md) — подключение дополнительных модулей
