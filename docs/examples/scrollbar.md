# Scrollbar

Модуль кастомного скроллбара для навигации по слайдеру. Поддерживает горизонтальное и вертикальное направление, drag & drop, автоматическое скрытие.

## Базовый пример


### Горизонтальный слайдер

<Demo id="scrollbar" />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  scrollbar: true,
  speed: 300
});
```

### Вертикальный слайдер

<Demo id="scrollbar-vertical" />

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

<Demo id="scrollbar-hidden" />

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
.tvist-v1__scrollbar {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

/* Горизонтальный скроллбар */
.tvist-v1__scrollbar--horizontal {
  height: 8px;
  bottom: 15px;
}

/* Вертикальный скроллбар */
.tvist-v1__scrollbar--vertical {
  width: 8px;
  right: 15px;
}

/* Ползунок */
.tvist-v1__scrollbar-thumb {
  background: #667eea;
  border-radius: 8px;
}

.tvist-v1__scrollbar-thumb:hover {
  background: #5568d3;
}

/* Состояние при перетаскивании */
.tvist-v1__scrollbar--dragging .tvist-v1__scrollbar-thumb {
  background: #4451b8;
}

/* Скрытое состояние */
.tvist-v1__scrollbar--hidden {
  opacity: 0;
  pointer-events: none;
}
```

## Кастомный контейнер

Вы можете разместить скроллбар в любом месте страницы:

**HTML:**
```html
<div class="tvist-v1">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">
      <!-- слайды -->
    </div>
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
| `scrollbar.scrollbarClass` | `string` | `'tvist-v1__scrollbar'` | CSS класс скроллбара |
| `scrollbar.trackClass` | `string` | `'tvist-v1__scrollbar-track'` | CSS класс трека |
| `scrollbar.thumbClass` | `string` | `'tvist-v1__scrollbar-thumb'` | CSS класс ползунка |
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
