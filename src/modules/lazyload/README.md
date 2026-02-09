# LazyLoad Module

Модуль ленивой загрузки изображений для Tvist.

## Возможности

- ✅ Автоматическая загрузка изображений при приближении к видимой области
- ✅ Предзагрузка соседних слайдов
- ✅ Поддержка `srcset` для адаптивных изображений
- ✅ Spinner/loader во время загрузки
- ✅ События загрузки и ошибок
- ✅ Публичное API для ручной загрузки
- ✅ Работает с loop режимом

## Использование

```javascript
const slider = new Tvist('.slider', {
  lazy: true // или { preloadPrevNext: 2 }
})
```

HTML разметка:

```html
<div class="tvist-v0__slide">
  <img data-src="image.jpg" data-srcset="image-400.jpg 400w, image-800.jpg 800w" alt="Description">
</div>
```

## Опции

### `lazy`

- **Тип**: `boolean | { preloadPrevNext?: number }`
- **По умолчанию**: `false`

```typescript
// Включить с дефолтными настройками
lazy: true

// С кастомными настройками
lazy: {
  preloadPrevNext: 2 // Загружать 2 слайда до и после текущего
}
```

## События

### `lazyLoaded`

Вызывается когда изображение успешно загружено.

```javascript
slider.on('lazyLoaded', (img, slideIndex) => {
  console.log('Загружено:', img, slideIndex)
})
```

### `lazyLoadError`

Вызывается при ошибке загрузки изображения.

```javascript
slider.on('lazyLoadError', (img, slideIndex) => {
  console.error('Ошибка:', img, slideIndex)
  // Можно заменить на placeholder
  img.src = '/placeholder.jpg'
})
```

## Публичное API

```javascript
const lazyModule = slider.modules.get('lazyload')

// Загрузить все оставшиеся изображения
lazyModule.loadAll()

// Загрузить изображения конкретного слайда
lazyModule.loadSlide(5)
```

## CSS классы

- `.tvist-v0__spinner` - индикатор загрузки
- `.tvist-v0__slide--loading` - класс слайда во время загрузки

## Кастомизация

CSS переменные:

```css
.tvist-v0 {
  --tvist-v0-spinner-size: 50px;
  --tvist-v0-spinner-color: rgba(0, 0, 0, 0.3);
  --tvist-v0-loading-overlay: rgba(255, 255, 255, 0.7);
}
```

## Принцип работы

1. При создании слайдера модуль находит все изображения с `data-src` или `data-srcset`
2. Создаёт спиннер для каждого изображения
3. Загружает изображения в видимой области + соседние слайды (по `preloadPrevNext`)
4. При прокрутке/смене слайда проверяет, какие изображения попали в зону загрузки
5. Загружает изображения, удаляет спиннер и вызывает события

## Совместимость

Работает со всеми модулями Tvist:

- ✅ Loop
- ✅ Autoplay
- ✅ Thumbs
- ✅ Grid
- ✅ Effects (fade, cube)
- ✅ Responsive/Breakpoints
