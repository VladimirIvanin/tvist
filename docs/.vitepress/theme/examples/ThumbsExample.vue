<template>
  <ExampleCard title="Синхронизация с галереей" description="Главный слайдер + миниатюры">
    <div class="demo-wrapper">
      <div ref="mainSliderEl" class="tvist-v1 main-slider">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">1</div>
          <div class="tvist-v1__slide">2</div>
          <div class="tvist-v1__slide">3</div>
          <div class="tvist-v1__slide">4</div>
          <div class="tvist-v1__slide">5</div>
          <div class="tvist-v1__slide">6</div>
        </div>
      </div>

      <div ref="thumbSliderEl" class="tvist-v1 thumb-slider">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">1</div>
          <div class="tvist-v1__slide">2</div>
          <div class="tvist-v1__slide">3</div>
          <div class="tvist-v1__slide">4</div>
          <div class="tvist-v1__slide">5</div>
          <div class="tvist-v1__slide">6</div>
        </div>
        <button class="tvist-v1__arrow tvist-v1__arrow--prev">‹</button>
        <button class="tvist-v1__arrow tvist-v1__arrow--next">›</button>
      </div>
    </div>

    <template #code>
      <details>
        <summary>📋 Показать код</summary>

**HTML:**
```html
<!-- Main Slider -->
<div class="tvist-v1 main-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
    <div class="tvist-v1__slide">6</div>
  </div>
</div>

<!-- Thumbnail Slider -->
<div class="tvist-v1 thumb-slider">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">1</div>
    <div class="tvist-v1__slide">2</div>
    <div class="tvist-v1__slide">3</div>
    <div class="tvist-v1__slide">4</div>
    <div class="tvist-v1__slide">5</div>
    <div class="tvist-v1__slide">6</div>
  </div>
  <button class="tvist-v1__arrow tvist-v1__arrow--prev">‹</button>
  <button class="tvist-v1__arrow tvist-v1__arrow--next">›</button>
</div>
```

**JavaScript:**
```javascript
// Main Slider
const mainSlider = new Tvist('.main-slider', {
  perPage: 1,
  gap: 10
});

// Thumbnail Slider
const thumbSlider = new Tvist('.thumb-slider', {
  perPage: 4,
  gap: 10,
  isNavigation: true,
  arrows: true
});

// Sync
mainSlider.sync(thumbSlider);
```

**CSS:**
```css
.main-slider .tvist-v1__slide {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: white;
  font-weight: bold;
}

.thumb-slider .tvist-v1__slide {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
  opacity: 0.6;
  cursor: pointer;
}

.thumb-slider .tvist-v1__slide.is-active {
  opacity: 1;
  border: 3px solid #333;
}

.tvist-v1__slide:nth-child(1) { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
.tvist-v1__slide:nth-child(2) { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
.tvist-v1__slide:nth-child(3) { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); }
.tvist-v1__slide:nth-child(4) { background: linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); }
.tvist-v1__slide:nth-child(5) { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
.tvist-v1__slide:nth-child(6) { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); }
```
      </details>
    </template>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const mainSliderEl = ref(null)
const thumbSliderEl = ref(null)
const mainSlider = ref(null)
const thumbSlider = ref(null)

onMounted(() => {
  if (mainSliderEl.value && thumbSliderEl.value) {
    mainSlider.value = new Tvist(mainSliderEl.value, {
      perPage: 1,
      gap: 10
    })

    thumbSlider.value = new Tvist(thumbSliderEl.value, {
      perPage: 4,
      gap: 10,
      isNavigation: true,
      arrows: true
    })

    mainSlider.value.sync(thumbSlider.value)
  }
})

onUnmounted(() => {
  mainSlider.value?.destroy()
  thumbSlider.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.main-slider {
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.main-slider :deep(.tvist-v1__slide) {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: white;
  font-weight: bold;
}

.thumb-slider {
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.thumb-slider :deep(.tvist-v1__slide) {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
  opacity: 0.6;
  transition: opacity 0.3s;
  cursor: pointer;
}

.thumb-slider :deep(.tvist-v1__slide.is-active) {
  opacity: 1;
  border: 3px solid #333;
}

.tvist-v1__slide:nth-child(1) { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
.tvist-v1__slide:nth-child(2) { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
.tvist-v1__slide:nth-child(3) { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); }
.tvist-v1__slide:nth-child(4) { background: linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); }
.tvist-v1__slide:nth-child(5) { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
.tvist-v1__slide:nth-child(6) { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); }
</style>
