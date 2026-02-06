# Быстрый старт

Создадим базовый слайдер за несколько минут.

## HTML разметка

Создайте HTML структуру для слайдера:

```html
<div class="tvist">
  <div class="tvist-v0__wrapper">
    <div class="tvist-v0__slide">
      <img src="slide-1.jpg" alt="Slide 1">
    </div>
    <div class="tvist-v0__slide">
      <img src="slide-2.jpg" alt="Slide 2">
    </div>
    <div class="tvist-v0__slide">
      <img src="slide-3.jpg" alt="Slide 3">
    </div>
  </div>
</div>
```

## CSS

Подключите стили Tvist:

```css
@import 'tvist/dist/tvist.css';
```

Или через `<link>` в HTML:

```html
<link rel="stylesheet" href="node_modules/tvist/dist/tvist.css">
```

## JavaScript

### Базовая инициализация

```javascript
import { Tvist } from 'tvist';

const slider = new Tvist('.tvist', {
  slidesPerView: 1,
  spaceBetween: 20
});
```

### С модулями

Добавим навигацию, пагинацию и автоплей:

```javascript
import { Tvist } from 'tvist';
import { NavigationModule } from 'tvist/modules/navigation';
import { PaginationModule } from 'tvist/modules/pagination';
import { AutoplayModule } from 'tvist/modules/autoplay';

const slider = new Tvist('.tvist', {
  slidesPerView: 1,
  spaceBetween: 20,
  modules: [NavigationModule, PaginationModule, AutoplayModule],
  navigation: {
    nextEl: '.tvist-button-next',
    prevEl: '.tvist-button-prev'
  },
  pagination: {
    el: '.tvist-pagination',
    clickable: true
  },
  autoplay: {
    delay: 3000
  }
});
```

HTML с элементами навигации:

```html
<div class="tvist">
  <div class="tvist-v0__wrapper">
    <div class="tvist-v0__slide">Slide 1</div>
    <div class="tvist-v0__slide">Slide 2</div>
    <div class="tvist-v0__slide">Slide 3</div>
  </div>
  
  <!-- Стрелки навигации -->
  <div class="tvist-button-prev">←</div>
  <div class="tvist-button-next">→</div>
  
  <!-- Пагинация -->
  <div class="tvist-pagination"></div>
</div>
```

## Опции

Основные опции для настройки слайдера:

```javascript
const slider = new Tvist('.tvist', {
  // Базовые настройки
  slidesPerView: 1,           // Количество слайдов на экране
  spaceBetween: 20,           // Отступ между слайдами (px)
  direction: 'horizontal',    // 'horizontal' или 'vertical'
  speed: 300,                 // Скорость анимации (ms)
  
  // Навигация
  loop: false,                // Бесконечная прокрутка
  
  // Responsive
  breakpoints: {
    640: {
      slidesPerView: 2
    },
    1024: {
      slidesPerView: 3
    }
  }
});
```

## События

Подписка на события слайдера:

```javascript
const slider = new Tvist('.tvist', {
  slidesPerView: 1
});

// Смена слайда
slider.on('slideChange', () => {
  console.log('Активный слайд:', slider.activeIndex);
});

// Инициализация завершена
slider.on('init', () => {
  console.log('Слайдер готов!');
});

// Достигнут конец
slider.on('reachEnd', () => {
  console.log('Последний слайд');
});
```

## API методы

```javascript
// Навигация
slider.slideNext();           // Следующий слайд
slider.slidePrev();           // Предыдущий слайд
slider.slideTo(2);           // Перейти к слайду по индексу

// Управление
slider.update();             // Пересчитать размеры
slider.destroy();            // Уничтожить экземпляр

// Получение информации
console.log(slider.activeIndex);   // Индекс активного слайда
console.log(slider.slides.length); // Количество слайдов
```

## Полный пример

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мой первый Tvist слайдер</title>
  <link rel="stylesheet" href="node_modules/tvist/dist/tvist.css">
  <style>
    .tvist {
      max-width: 800px;
      margin: 0 auto;
    }
    .tvist-v0__slide {
      height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      font-size: 32px;
    }
  </style>
</head>
<body>
  <div class="tvist">
    <div class="tvist-v0__wrapper">
      <div class="tvist-v0__slide">Слайд 1</div>
      <div class="tvist-v0__slide">Слайд 2</div>
      <div class="tvist-v0__slide">Слайд 3</div>
    </div>
    <div class="tvist-button-prev">←</div>
    <div class="tvist-button-next">→</div>
    <div class="tvist-pagination"></div>
  </div>

  <script type="module">
    import { Tvist } from './node_modules/tvist/dist/tvist.js';
    import { NavigationModule } from './node_modules/tvist/dist/tvist.js';
    import { PaginationModule } from './node_modules/tvist/dist/tvist.js';

    const slider = new Tvist('.tvist', {
      slidesPerView: 1,
      spaceBetween: 20,
      modules: [NavigationModule, PaginationModule],
      navigation: {
        nextEl: '.tvist-button-next',
        prevEl: '.tvist-button-prev'
      },
      pagination: {
        el: '.tvist-pagination',
        clickable: true
      }
    });

    slider.on('slideChange', () => {
      console.log('Активный слайд:', slider.activeIndex);
    });
  </script>
</body>
</html>
```

## Что дальше?

- Изучите [примеры](/examples-list) для различных сценариев использования
- Посмотрите пример использования [модулей](/examples/modules)
- Узнайте больше в разделе [установки](/guide/installation)
