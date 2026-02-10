# Thumbs Sync

Синхронизация с галереей превью (Thumbs).

<script setup>
import ThumbsExample from '../.vitepress/theme/examples/ThumbsExample.vue'
</script>

<ThumbsExample />

## Код примера

**HTML:**
```html
<!-- Main Slider -->
<div class="tvist-v1 main-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <!-- ... -->
  </div>
</div>

<!-- Thumbnail Slider -->
<div class="tvist-v1 thumb-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <!-- ... -->
  </div>
  <button class="tvist-v1__arrow tvist-v1__arrow--prev">‹</button>
  <button class="tvist-v1__arrow tvist-v1__arrow--next">›</button>
</div>
```

**JavaScript:**
```javascript
// Основной слайдер
const mainSlider = new Tvist('.main-slider', {
  perPage: 1,
  gap: 10,
  arrows: false,
  pagination: false
});

// Слайдер миниатюр
const thumbSlider = new Tvist('.thumb-slider', {
  perPage: 4,
  gap: 10,
  isNavigation: true,
  pagination: false,
  arrows: true
});

// Синхронизация
mainSlider.sync(thumbSlider);
```
