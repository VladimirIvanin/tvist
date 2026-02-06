# Scrollbar

Модуль кастомного скроллбара для навигации по слайдеру. Поддерживает горизонтальное и вертикальное направление, drag & drop, автоматическое скрытие.

## Базовый пример

<script setup>
import { ref, onMounted } from 'vue'
import Tvist from 'tvist'

const basicRef = ref(null)
const verticalRef = ref(null)
const hiddenRef = ref(null)

onMounted(() => {
  if (basicRef.value) {
    new Tvist(basicRef.value, {
      perPage: 1,
      speed: 300,
      scrollbar: true,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
  
  if (verticalRef.value) {
    new Tvist(verticalRef.value, {
      direction: 'vertical',
      speed: 300,
      scrollbar: true
    })
  }
  
  if (hiddenRef.value) {
    new Tvist(hiddenRef.value, {
      perPage: 1,
      speed: 300,
      scrollbar: {
        hide: true,
        hideDelay: 1000
      }
    })
  }
})
</script>

### Горизонтальный слайдер

<div ref="basicRef" class="tvist" style="margin-bottom: 2rem; position: relative; height: 300px;">
  <div class="tvist__container">
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 1
      <div style="position: absolute; bottom: 60px; font-size: 14px; opacity: 0.8;">
        Используйте скроллбар внизу
      </div>
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 2
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 3
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 4
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 5
    </div>
  </div>
</div>

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: true,
  speed: 300
});
```

### Вертикальный слайдер

<div ref="verticalRef" class="tvist tvist--vertical" style="height: 400px; margin-bottom: 2rem; position: relative;">
  <div class="tvist__container">
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 1
      <div style="position: absolute; left: 20px; font-size: 14px; opacity: 0.8;">
        Скроллбар справа →
      </div>
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 2
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 3
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 4
    </div>
  </div>
</div>

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  scrollbar: true,
  speed: 300
});
```

### Автоматическое скрытие

Скроллбар автоматически скрывается при бездействии.

<div ref="hiddenRef" class="tvist" style="margin-bottom: 2rem; position: relative; height: 300px;">
  <div class="tvist__container">
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 1
      <div style="position: absolute; bottom: 60px; font-size: 14px; opacity: 0.8;">
        Наведите курсор, чтобы увидеть скроллбар
      </div>
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 2
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 3
    </div>
  </div>
</div>

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    hide: true,
    hideDelay: 1000 // скрывается через 1 секунду
  }
});
```

## Расширенные настройки

Модуль поддерживает множество параметров настройки:

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    // Кастомный контейнер для скроллбара
    container: '.my-scrollbar',
    
    // Автоматическое скрытие
    hide: true,
    hideDelay: 1500,
    
    // Кастомные CSS классы
    scrollbarClass: 'my-scrollbar',
    trackClass: 'my-scrollbar__track',
    thumbClass: 'my-scrollbar__thumb',
    
    // Возможность перетаскивания
    draggable: true
  }
});
```

## Возможности

### 1. Клик по треку

Кликните в любом месте скроллбара для быстрого перехода к соответствующему слайду.

### 2. Drag & Drop

Перетаскивайте ползунок мышью или пальцем для плавной навигации:

- **Мышь**: зажмите ползунок и перетащите
- **Тач**: работает на мобильных устройствах

### 3. Адаптивный размер

Размер ползунка автоматически рассчитывается в зависимости от количества видимых слайдов (`perPage`).

### 4. Автоматическое обновление

Позиция скроллбара обновляется при:
- Навигации кнопками
- Drag слайдера
- Программном переходе `slider.scrollTo()`
- Изменении размера окна

## Кастомизация стилей

Вы можете полностью настроить внешний вид скроллбара через CSS:

```css
/* Контейнер скроллбара */
.tvist__scrollbar {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

/* Горизонтальный скроллбар */
.tvist__scrollbar--horizontal {
  height: 8px;
  bottom: 15px;
}

/* Вертикальный скроллбар */
.tvist__scrollbar--vertical {
  width: 8px;
  right: 15px;
}

/* Ползунок */
.tvist__scrollbar-thumb {
  background: #667eea;
  border-radius: 8px;
}

.tvist__scrollbar-thumb:hover {
  background: #5568d3;
}

/* Состояние при перетаскивании */
.tvist__scrollbar--dragging .tvist__scrollbar-thumb {
  background: #4451b8;
}

/* Скрытое состояние */
.tvist__scrollbar--hidden {
  opacity: 0;
  pointer-events: none;
}
```

## Кастомный контейнер

Вы можете разместить скроллбар в любом месте страницы:

**HTML:**
```html
<div class="tvist">
  <div class="tvist__container">
    <!-- слайды -->
  </div>
</div>

<div class="custom-scrollbar-container"></div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    container: '.custom-scrollbar-container'
  }
});
```

**CSS:**
```css
.custom-scrollbar-container {
  width: 100%;
  height: 10px;
  margin-top: 20px;
  background: #f0f0f0;
  border-radius: 5px;
}
```

## API

### Опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `scrollbar` | `boolean \| object` | `false` | Включить модуль скроллбара |
| `scrollbar.container` | `string \| HTMLElement` | `undefined` | Кастомный контейнер |
| `scrollbar.hide` | `boolean` | `false` | Автоскрытие при бездействии |
| `scrollbar.hideDelay` | `number` | `1000` | Задержка перед скрытием (мс) |
| `scrollbar.scrollbarClass` | `string` | `'tvist__scrollbar'` | CSS класс скроллбара |
| `scrollbar.trackClass` | `string` | `'tvist__scrollbar-track'` | CSS класс трека |
| `scrollbar.thumbClass` | `string` | `'tvist__scrollbar-thumb'` | CSS класс ползунка |
| `scrollbar.draggable` | `boolean` | `true` | Возможность перетаскивания |

### Примеры использования

#### Простая активация
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: true
});
```

#### С автоскрытием
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    hide: true,
    hideDelay: 2000
  }
});
```

#### Вертикальный с кастомными стилями
```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  scrollbar: {
    scrollbarClass: 'custom-scrollbar',
    thumbClass: 'custom-thumb'
  }
});
```

#### С отключённым drag
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    draggable: false // только клики, без перетаскивания
  }
});
```

## Совместимость с другими модулями

Модуль Scrollbar отлично работает со всеми другими модулями:

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: true,
  drag: true,           // Drag + Scrollbar
  arrows: true,         // Navigation + Scrollbar
  pagination: true,     // Pagination + Scrollbar
  loop: true,          // Loop + Scrollbar
  autoplay: 3000,      // Autoplay + Scrollbar
  wheel: true          // Wheel + Scrollbar
});
```

## Полный пример

```javascript
const slider = new Tvist('.tvist', {
  perPage: 2,
  gap: 20,
  speed: 400,
  
  // Scrollbar с полной настройкой
  scrollbar: {
    hide: true,
    hideDelay: 1500,
    draggable: true,
    scrollbarClass: 'my-scrollbar',
    trackClass: 'my-scrollbar__track',
    thumbClass: 'my-scrollbar__thumb'
  },
  
  // Другие модули
  drag: true,
  arrows: true,
  pagination: {
    type: 'bullets',
    clickable: true
  }
});
```
