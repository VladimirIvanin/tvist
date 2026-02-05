<template>
  <ExampleCard title="Драг и стрелки" description="Перетаскивание мышью/тачем + стрелки навигации">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">1</div>
          <div class="tvist__slide">2</div>
          <div class="tvist__slide">3</div>
          <div class="tvist__slide">4</div>
          <div class="tvist__slide">5</div>
        </div>
        <button class="tvist__arrow tvist__arrow--prev">‹</button>
        <button class="tvist__arrow tvist__arrow--next">›</button>
      </div>
    </div>

    <template #code>
      <details>
        <summary>📋 Показать код</summary>

**HTML:**
```html
<div class="tvist">
  <div class="tvist__container">
    <div class="tvist__slide">1</div>
    <div class="tvist__slide">2</div>
    <div class="tvist__slide">3</div>
    <div class="tvist__slide">4</div>
    <div class="tvist__slide">5</div>
  </div>
  <button class="tvist__arrow tvist__arrow--prev">‹</button>
  <button class="tvist__arrow tvist__arrow--next">›</button>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  rubberband: true,
  speed: 300
});
```

**CSS:**
```css
.tvist__slide {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
}

.tvist__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
```
      </details>
    </template>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref(null)
const slider = ref(null)

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      drag: true,
      arrows: true,
      rubberband: true,
      speed: 300
    })
  }
})

onUnmounted(() => {
  slider.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.tvist {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  position: relative;
}

.tvist__slide {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
}

.tvist__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
</style>
