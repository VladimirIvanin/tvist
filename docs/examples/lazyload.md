# LazyLoad - Ленивая загрузка изображений

Модуль **LazyLoad** реализует ленивую загрузку изображений в слайдах. Изображения загружаются только когда слайд становится видимым или близок к видимой области. Это значительно улучшает производительность и ускоряет первоначальную загрузку страницы.

## Основные возможности

- ✅ Автоматическая загрузка изображений при приближении к видимой области
- ✅ Предзагрузка соседних слайдов
- ✅ Поддержка `srcset` для адаптивных изображений
- ✅ Spinner/loader во время загрузки
- ✅ События загрузки и ошибок
- ✅ Публичное API для ручной загрузки

## Использование

### Базовая настройка

Для использования LazyLoad нужно:

1. Включить опцию `lazy`
2. Заменить атрибуты `src` и `srcset` на `data-src` и `data-srcset`

```html
<div class="tvist-v0">
  <div class="tvist-v0__container">
    <div class="tvist-v0__slide">
      <img data-src="image1.jpg" alt="Slide 1">
    </div>
    <div class="tvist-v0__slide">
      <img data-src="image2.jpg" alt="Slide 2">
    </div>
    <div class="tvist-v0__slide">
      <img data-src="image3.jpg" alt="Slide 3">
    </div>
  </div>
</div>
```

```javascript
const slider = new Tvist('.tvist-v0', {
  lazy: true
})
```

### С адаптивными изображениями (srcset)

```html
<div class="tvist-v0__slide">
  <img 
    data-src="image-800.jpg" 
    data-srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
    sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
    alt="Адаптивное изображение">
</div>
```

### Расширенные настройки

```javascript
const slider = new Tvist('.tvist-v0', {
  lazy: {
    // Количество слайдов для предзагрузки с каждой стороны
    preloadPrevNext: 2
  },
  perPage: 1
})
```

## Опции

### `lazy`

- **Тип**: `boolean | { preloadPrevNext?: number }`
- **По умолчанию**: `false`

Включает ленивую загрузку изображений.

```typescript
// Простое включение
lazy: true

// С настройками
lazy: {
  preloadPrevNext: 2 // Загружать 2 слайда до и после текущего
}
```

### `lazy.preloadPrevNext`

- **Тип**: `number`
- **По умолчанию**: `1`

Количество соседних слайдов для предзагрузки с каждой стороны от активного слайда.

## События

### `lazyLoaded`

Вызывается когда изображение успешно загружено.

```javascript
slider.on('lazyLoaded', (img, slideIndex) => {
  console.log('Изображение загружено:', img, 'в слайде:', slideIndex)
})
```

**Параметры:**
- `img` (`HTMLImageElement`) - загруженное изображение
- `slideIndex` (`number`) - индекс слайда

### `lazyLoadError`

Вызывается при ошибке загрузки изображения.

```javascript
slider.on('lazyLoadError', (img, slideIndex) => {
  console.error('Ошибка загрузки:', img, 'в слайде:', slideIndex)
})
```

**Параметры:**
- `img` (`HTMLImageElement`) - изображение с ошибкой
- `slideIndex` (`number`) - индекс слайда

## Публичное API

### `loadAll()`

Загружает все оставшиеся изображения немедленно.

```javascript
const lazyModule = slider.modules.get('lazyload')
lazyModule.loadAll()
```

### `loadSlide(index)`

Загружает изображения конкретного слайда.

```javascript
const lazyModule = slider.modules.get('lazyload')
lazyModule.loadSlide(5) // Загрузить изображения 5-го слайда
```

## CSS-классы

### `.tvist-v0__spinner`

Индикатор загрузки (spinner), отображается во время загрузки изображения.

### `.tvist-v0__slide--loading`

Класс применяется к слайду во время загрузки изображения.

## Кастомизация стилей

Вы можете настроить внешний вид спиннера и состояния загрузки через CSS-переменные:

```css
.tvist-v0 {
  /* Размер спиннера */
  --tvist-v0-spinner-size: 50px;
  
  /* Цвет спиннера */
  --tvist-v0-spinner-color: rgba(0, 0, 0, 0.3);
  
  /* Оверлей во время загрузки */
  --tvist-v0-loading-overlay: rgba(255, 255, 255, 0.7);
}
```

Или переопределить стили напрямую:

```css
.tvist-v0__spinner {
  /* Ваши стили для спиннера */
}

.tvist-v0__slide--loading {
  /* Ваши стили для слайда в процессе загрузки */
  opacity: 0.5;
}
```

## Примеры использования

### С autoplay

```javascript
const slider = new Tvist('.tvist-v0', {
  lazy: true,
  autoplay: 3000,
  loop: true
})
```

### С галереей и thumbnails

```javascript
const mainSlider = new Tvist('.main-slider', {
  lazy: {
    preloadPrevNext: 1
  }
})

const thumbsSlider = new Tvist('.thumbs-slider', {
  perPage: 5,
  gap: 10,
  lazy: true,
  isNavigation: true
})

mainSlider.updateOptions({
  thumbs: { slider: thumbsSlider }
})
```

### Обработка ошибок загрузки

```javascript
const slider = new Tvist('.tvist-v0', {
  lazy: true,
  on: {
    lazyLoadError: (img, slideIndex) => {
      // Заменить на изображение-заглушку
      img.src = '/images/placeholder.jpg'
      console.warn(`Не удалось загрузить изображение в слайде ${slideIndex}`)
    }
  }
})
```

## Производительность

LazyLoad значительно улучшает производительность:

- ⚡ Быстрая первоначальная загрузка страницы
- 📉 Меньше трафика для пользователей
- 🎯 Загрузка только нужных изображений
- 💾 Экономия памяти браузера

## Совместимость с другими модулями

LazyLoad отлично работает с:

- ✅ Loop - корректная загрузка клонированных слайдов
- ✅ Autoplay - изображения загружаются до перехода
- ✅ Thumbs - ленивая загрузка для обоих слайдеров
- ✅ Grid - поддержка grid layout
- ✅ Effects (fade, cube) - загрузка перед эффектами

## Интерактивный пример

<script setup>
import LazyLoadDocExample from '../.vitepress/theme/examples/LazyLoadDocExample.vue'
</script>

<LazyLoadDocExample />
