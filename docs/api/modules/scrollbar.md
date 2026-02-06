# Scrollbar Module

Модуль кастомного скроллбара для визуальной навигации по слайдеру.

## Особенности

- ✅ Горизонтальное и вертикальное направление
- ✅ Drag & Drop для навигации
- ✅ Клик по треку для быстрого перехода
- ✅ Автоматическое скрытие при бездействии
- ✅ Адаптивный размер ползунка
- ✅ Полная кастомизация через CSS
- ✅ Поддержка мобильных устройств (touch)

## Использование

```javascript
import Tvist from 'tvist'

const slider = new Tvist('.tvist', {
  scrollbar: true
})
```

## Опции

```typescript
interface ScrollbarOptions {
  // Селектор или элемент для контейнера скроллбара
  container?: string | HTMLElement
  
  // Автоматически скрывать скроллбар при бездействии
  hide?: boolean
  
  // Задержка перед скрытием (мс)
  hideDelay?: number
  
  // CSS класс для скроллбара
  scrollbarClass?: string
  
  // CSS класс для трека скроллбара
  trackClass?: string
  
  // CSS класс для ползунка
  thumbClass?: string
  
  // Возможность перетаскивания ползунка
  draggable?: boolean
}
```

## Примеры

### Базовое использование

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: true
})
```

### С автоскрытием

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    hide: true,
    hideDelay: 1500
  }
})
```

### Вертикальный слайдер

```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  scrollbar: true
})
```

### Кастомный контейнер

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    container: '.my-scrollbar-container'
  }
})
```

### Кастомные CSS классы

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    scrollbarClass: 'custom-scrollbar',
    trackClass: 'custom-track',
    thumbClass: 'custom-thumb'
  }
})
```

### Только клики (без drag)

```javascript
const slider = new Tvist('.tvist', {
  scrollbar: {
    draggable: false
  }
})
```

## CSS классы

### Базовые классы

- `.tvist__scrollbar` - контейнер скроллбара
- `.tvist__scrollbar-track` - трек скроллбара
- `.tvist__scrollbar-thumb` - ползунок

### Модификаторы

- `.tvist__scrollbar--horizontal` - горизонтальное направление
- `.tvist__scrollbar--vertical` - вертикальное направление
- `.tvist__scrollbar--hidden` - скрытое состояние
- `.tvist__scrollbar--dragging` - состояние при перетаскивании

## Кастомизация стилей

```css
/* Контейнер */
.tvist__scrollbar {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

/* Ползунок */
.tvist__scrollbar-thumb {
  background: #667eea;
  border-radius: 8px;
}

.tvist__scrollbar-thumb:hover {
  background: #5568d3;
}

/* При перетаскивании */
.tvist__scrollbar--dragging .tvist__scrollbar-thumb {
  background: #4451b8;
}
```

## Совместимость

Модуль работает со всеми другими модулями:

- ✅ Drag
- ✅ Navigation (Arrows)
- ✅ Pagination
- ✅ Autoplay
- ✅ Loop
- ✅ Wheel/ScrollControl
- ✅ Effects

## Ссылки

- [Полная документация](/examples/scrollbar)
- [Примеры использования](/examples-list#scrollbar)
