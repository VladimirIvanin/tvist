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
<div class="tvist main-slider">
  <div class="tvist__container">
    <div class="tvist__slide">1</div>
    <div class="tvist__slide">2</div>
    <div class="tvist__slide">3</div>
    <!-- ... -->
  </div>
</div>

<!-- Thumbnail Slider -->
<div class="tvist thumb-slider">
  <div class="tvist__container">
    <div class="tvist__slide">1</div>
    <div class="tvist__slide">2</div>
    <div class="tvist__slide">3</div>
    <!-- ... -->
  </div>
  <button class="tvist__arrow tvist__arrow--prev">‹</button>
  <button class="tvist__arrow tvist__arrow--next">›</button>
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
