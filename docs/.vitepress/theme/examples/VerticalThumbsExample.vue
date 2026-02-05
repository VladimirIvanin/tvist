<template>
  <ExampleCard title="Вертикальные миниатюры (Gallery)" description="Вертикальная лента миниатюр слева синхронизирована с основным горизонтальным слайдером. У миниатюр включен slideMinSize для адаптивности">
    <div class="demo-wrapper">
      <div class="gallery-wrapper">
        <div ref="thumbsVerticalEl" class="tvist tvist-thumbs">
          <div class="tvist__container">
            <div class="tvist__slide">1</div>
            <div class="tvist__slide">2</div>
            <div class="tvist__slide">3</div>
            <div class="tvist__slide">4</div>
            <div class="tvist__slide">5</div>
            <div class="tvist__slide">6</div>
          </div>
        </div>
        <div ref="mainHorizontalEl" class="tvist tvist-main">
          <div class="tvist__container">
            <div class="tvist__slide">Slide 1</div>
            <div class="tvist__slide">Slide 2</div>
            <div class="tvist__slide">Slide 3</div>
            <div class="tvist__slide">Slide 4</div>
            <div class="tvist__slide">Slide 5</div>
            <div class="tvist__slide">Slide 6</div>
          </div>
        </div>
      </div>
    </div>

    <template #code>
      <details>
        <summary>📋 Показать код</summary>

**HTML:**
```html
<div class="gallery-wrapper">
  <!-- Vertical Thumbnails (left) -->
  <div class="tvist tvist-thumbs">
    <div class="tvist__container">
      <div class="tvist__slide">1</div>
      <div class="tvist__slide">2</div>
      <div class="tvist__slide">3</div>
      <div class="tvist__slide">4</div>
      <div class="tvist__slide">5</div>
      <div class="tvist__slide">6</div>
    </div>
  </div>
  
  <!-- Main Horizontal Slider (right) -->
  <div class="tvist tvist-main">
    <div class="tvist__container">
      <div class="tvist__slide">Slide 1</div>
      <div class="tvist__slide">Slide 2</div>
      <div class="tvist__slide">Slide 3</div>
      <div class="tvist__slide">Slide 4</div>
      <div class="tvist__slide">Slide 5</div>
      <div class="tvist__slide">Slide 6</div>
    </div>
  </div>
</div>
```

**JavaScript:**
```javascript
// Вертикальные миниатюры с адаптивностью
const thumbsVertical = new Tvist('.tvist-thumbs', {
  direction: 'vertical',
  slideMinSize: 90,        // Минимальный размер слайда
  gap: 10,
  isNavigation: true       // Это навигационный слайдер
});

// Основной горизонтальный слайдер
const mainHorizontal = new Tvist('.tvist-main', {
  direction: 'horizontal',
  perPage: 1,
  gap: 10,
  speed: 500
});

// Синхронизация
mainHorizontal.sync(thumbsVertical);
```

**CSS:**
```css
.gallery-wrapper {
  display: flex;
  gap: 20px;
  height: 500px;
}

/* Вертикальные миниатюры */
.tvist-thumbs {
  width: 120px;
  height: 100%;
}

.tvist-thumbs .tvist__slide {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s, border-color 0.3s;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
}

.tvist-thumbs .tvist__slide.is-active,
.tvist-thumbs .tvist__slide--nav-active {
  opacity: 1;
  border-color: #333;
}

/* Основной слайдер */
.tvist-main {
  flex: 1;
  height: 100%;
}

.tvist-main .tvist__slide {
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

/* Цвета */
.tvist__slide:nth-child(1) { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
.tvist__slide:nth-child(2) { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
.tvist__slide:nth-child(3) { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); }
.tvist__slide:nth-child(4) { background: linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); }
.tvist__slide:nth-child(5) { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
.tvist__slide:nth-child(6) { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); }
```
      </details>
    </template>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const thumbsVerticalEl = ref(null)
const mainHorizontalEl = ref(null)
const thumbsVertical = ref(null)
const mainHorizontal = ref(null)

onMounted(() => {
  if (thumbsVerticalEl.value && mainHorizontalEl.value) {
    // Вертикальные миниатюры
    thumbsVertical.value = new Tvist(thumbsVerticalEl.value, {
      direction: 'vertical',
      slideMinSize: 90,
      gap: 10,
      isNavigation: true,
    })

    // Основной горизонтальный слайдер
    mainHorizontal.value = new Tvist(mainHorizontalEl.value, {
      direction: 'horizontal',
      perPage: 1,
      gap: 10,
      speed: 500,
    })

    // Синхронизация
    mainHorizontal.value.sync(thumbsVertical.value)
  }
})

onUnmounted(() => {
  thumbsVertical.value?.destroy()
  mainHorizontal.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.gallery-wrapper {
  display: flex;
  gap: 20px;
  height: 500px;
}

/* Вертикальные миниатюры */
.tvist-thumbs {
  width: 120px !important;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tvist-thumbs :deep(.tvist__slide) {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s, border-color 0.3s;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
}

.tvist-thumbs :deep(.tvist__slide.is-active),
.tvist-thumbs :deep(.tvist__slide--nav-active) {
  opacity: 1;
  border-color: #333;
}

/* Основной слайдер */
.tvist-main {
  flex: 1;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tvist-main .tvist__container {
  height: 100%;
}

.tvist-main :deep(.tvist__slide) {
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

/* Цвета слайдов */
.tvist__slide:nth-child(1) { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
.tvist__slide:nth-child(2) { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
.tvist__slide:nth-child(3) { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); }
.tvist__slide:nth-child(4) { background: linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); }
.tvist__slide:nth-child(5) { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
.tvist__slide:nth-child(6) { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); }
</style>
