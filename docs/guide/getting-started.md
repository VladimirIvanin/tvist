# Быстрый старт

Создадим базовый слайдер за несколько минут. Все примеры ниже — для использования в браузере через CDN (без сборки и импортов).

## HTML разметка

Создайте HTML структуру для слайдера:

```html
<div class="tvist-v1">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">
      <img src="slide-1.jpg" alt="Slide 1">
    </div>
    <div class="tvist-v1__slide">
      <img src="slide-2.jpg" alt="Slide 2">
    </div>
    <div class="tvist-v1__slide">
      <img src="slide-3.jpg" alt="Slide 3">
    </div>
  </div>
</div>
```

## Подключение через CDN

Подключите стили и скрипт Tvist (после загрузки скрипта доступна глобальная переменная `TvistV1`):

```html
<link rel="stylesheet" href="https://unpkg.com/tvist@1.0.0/dist/tvist.css">
<script src="https://unpkg.com/tvist@1.0.0/dist/tvist.umd.js"></script>
```

## JavaScript

### Базовая инициализация

```javascript
var slider = new TvistV1('.tvist-v1', {
  perPage: 1,
  gap: 20
});
```

### С навигацией и пагинацией

Добавим стрелки, пагинацию и автопрокрутку. Модули уже входят в сборку:

```javascript
var slider = new TvistV1('.tvist-v1', {
  perPage: 1,
  gap: 20,
  arrows: {
    next: '.tvist-button-next',
    prev: '.tvist-button-prev'
  },
  pagination: {
    container: '.tvist-pagination',
    clickable: true
  },
  autoplay: 3000
});
```

HTML с элементами навигации:

```html
<div class="tvist-v1">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">Slide 1</div>
    <div class="tvist-v1__slide">Slide 2</div>
    <div class="tvist-v1__slide">Slide 3</div>
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
var slider = new TvistV1('.tvist-v1', {
  // Базовые настройки
  perPage: 1,                 // Количество слайдов на экране
  gap: 20,                    // Отступ между слайдами (px)
  direction: 'horizontal',    // 'horizontal' или 'vertical'
  speed: 300,                 // Скорость анимации (ms)
  
  // Навигация
  loop: false,                // Бесконечная прокрутка
  
  // Responsive
  breakpoints: {
    640: {
      perPage: 2
    },
    1024: {
      perPage: 3
    }
  }
});
```

## События

Подписка на события слайдера:

```javascript
var slider = new TvistV1('.tvist-v1', {
  perPage: 1
});

// Смена слайда
slider.on('slideChange', function () {
  console.log('Активный слайд:', slider.activeIndex);
});

// Инициализация завершена
slider.on('init', function () {
  console.log('Слайдер готов!');
});

// Достигнут конец
slider.on('reachEnd', function () {
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
  <link rel="stylesheet" href="https://unpkg.com/tvist@1.0.0/dist/tvist.css">
  <style>
    .tvist-v1 {
      max-width: 800px;
      margin: 0 auto;
    }
    .tvist-v1__slide {
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
  <div class="tvist-v1">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">Слайд 1</div>
      <div class="tvist-v1__slide">Слайд 2</div>
      <div class="tvist-v1__slide">Слайд 3</div>
    </div>
    <div class="tvist-button-prev">←</div>
    <div class="tvist-button-next">→</div>
    <div class="tvist-pagination"></div>
  </div>

  <script src="https://unpkg.com/tvist@1.0.0/dist/tvist.umd.js"></script>
  <script>
    var TvistV1 = window.TvistV1 || (window.Tvist && (window.Tvist.TvistV1 || window.Tvist.default || window.Tvist));
    var slider = new TvistV1('.tvist-v1', {
      perPage: 1,
      gap: 20,
      arrows: {
        next: '.tvist-button-next',
        prev: '.tvist-button-prev'
      },
      pagination: {
        container: '.tvist-pagination',
        clickable: true
      }
    });

    slider.on('slideChange', function () {
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
