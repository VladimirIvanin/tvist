# Опции слайдера

Полный справочник всех доступных опций для настройки Tvist слайдера.

<OptionsTable />

## Группировка опций

### Базовые настройки

Основные параметры, определяющие поведение слайдера:

- `perPage` - количество видимых слайдов
- `slideMinSize` - минимальный размер слайда для авто-расчёта
- `gap` - расстояние между слайдами
- `padding` - отступы слайдера (left/right или top/bottom)
- `speed` - скорость анимации
- `direction` - направление прокрутки
- `start` - начальный слайд

### Управление перетаскиванием

Настройки drag-функциональности:

- `drag` - включение/отключение перетаскивания
- `dragSpeed` - скорость перетаскивания
- `rubberband` - эффект резинки на краях
- `focusableElements` - элементы с сохранением фокуса

### Навигация

Элементы управления навигацией:

- `arrows` - навигационные стрелки
- `pagination` - пагинация (буллеты, дроби и т.д.)
- `keyboard` - управление с клавиатуры
- `wheel` - управление колёсиком мыши

### Автоматизация

Автоматическое поведение слайдера:

- `autoplay` - автоматическая прокрутка
- `pauseOnHover` - пауза при наведении
- `pauseOnInteraction` - пауза при взаимодействии
- `disableOnInteraction` - отключение после взаимодействия

### Режимы отображения

Специальные режимы работы:

- `loop` - бесконечная прокрутка
- `effect` - эффекты переходов
- `fadeEffect` - настройки fade эффекта
- `cubeEffect` - настройки cube эффекта
- `virtual` - виртуальные слайды

### Дополнительно

Прочие настройки:

- `lazy` - ленивая загрузка изображений
- `thumbs` - связь с миниатюрами
- `isNavigation` - режим навигации
- `breakpoints` - адаптивные настройки
- `breakpointsBase` - база для breakpoints
- `on` - обработчики событий

## Примеры использования

### Базовая конфигурация

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,
  gap: 20,
  speed: 400,
  arrows: true,
  pagination: true
})
```

### С автопрокруткой и loop

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  autoplay: 3000,
  loop: true,
  pauseOnHover: true
})
```

### Адаптивный слайдер

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  gap: 10,
  breakpoints: {
    640: {
      perPage: 2,
      gap: 15
    },
    1024: {
      perPage: 3,
      gap: 20
    }
  }
})
```

### С эффектами

```javascript
const slider = new Tvist('.slider', {
  effect: 'fade',
  fadeEffect: {
    crossFade: true
  },
  speed: 600
})
```

### Полная конфигурация

```javascript
const slider = new Tvist('.slider', {
  // Базовые
  perPage: 3,
  gap: 20,
  speed: 400,
  direction: 'horizontal',
  start: 0,
  
  // Управление
  drag: true,
  dragSpeed: 1,
  rubberband: true,
  
  // Навигация
  arrows: true,
  pagination: {
    type: 'bullets',
    clickable: true
  },
  keyboard: true,
  
  // Автоматизация
  autoplay: 5000,
  pauseOnHover: true,
  loop: true,
  
  // Адаптивность
  breakpoints: {
    640: { perPage: 1, gap: 10 },
    1024: { perPage: 2, gap: 15 }
  },
  
  // События
  on: {
    slideChange: (index) => {
      console.log('Активный слайд:', index)
    }
  }
})
```

## Приоритет опций

При использовании `breakpoints`, опции из соответствующего breakpoint переопределяют базовые опции. Например:

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,  // Базовое значение
  breakpoints: {
    640: {
      perPage: 1  // На экранах >= 640px будет 1 слайд
    }
  }
})
```

## Динамическое изменение

Большинство опций нельзя изменить после инициализации. Для изменения настроек нужно пересоздать слайдер:

```javascript
// Уничтожаем старый
slider.destroy()

// Создаём новый с другими опциями
const newSlider = new Tvist('.slider', {
  perPage: 4,
  gap: 30
})
```

Для динамических изменений без пересоздания используйте события и методы API.
