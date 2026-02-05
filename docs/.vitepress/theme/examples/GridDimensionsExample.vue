<template>
  <ExampleCard title="Grid Dimensions" description="Разные размеры страниц в сетке" :detailsLink="detailsLink">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">1</div>
          <div class="tvist__slide">2</div>
          <div class="tvist__slide">3</div>
          <div class="tvist__slide">4</div>
          <div class="tvist__slide">5</div>
          <div class="tvist__slide">6</div>
          <div class="tvist__slide">7</div>
          <div class="tvist__slide">8</div>
          <div class="tvist__slide">9</div>
          <div class="tvist__slide">10</div>
        </div>
      </div>
      
      <div class="info">
        <p><strong>Страница 1:</strong> 2×2 (4 слайда)</p>
        <p><strong>Страница 2:</strong> 1×2 (2 слайда)</p>
        <p><strong>Страница 3:</strong> 2×2 (4 слайда)</p>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

defineProps({
  detailsLink: { type: String, default: '' }
})

const sliderEl = ref(null)
const slider = ref(null)

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      grid: {
        gap: {
          row: 10,
          col: 10
        },
        dimensions: [
          [2, 2], // 1-я страница: 2 ряда × 2 колонки = 4 слайда
          [1, 2], // 2-я страница: 1 ряд × 2 колонки = 2 слайда
          [2, 2], // 3-я страница: 2 ряда × 2 колонки = 4 слайда
          // Цикл повторяется, если слайдов больше
        ]
      }
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
  margin-bottom: 20px;
  overflow: hidden;
  height: 400px;
}

.tvist__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
  border-radius: 8px;
}

.tvist__slide:nth-child(1) .tvist__grid-item { background: #667eea; }
.tvist__slide:nth-child(2) .tvist__grid-item { background: #764ba2; }
.tvist__slide:nth-child(3) .tvist__grid-item { background: #f093fb; }
.tvist__slide:nth-child(4) .tvist__grid-item { background: #f5576c; }
.tvist__slide:nth-child(5) .tvist__grid-item { background: #4facfe; }
.tvist__slide:nth-child(6) .tvist__grid-item { background: #00f2fe; }
.tvist__slide:nth-child(7) .tvist__grid-item { background: #43e97b; }
.tvist__slide:nth-child(8) .tvist__grid-item { background: #fa709a; }
.tvist__slide:nth-child(9) .tvist__grid-item { background: #fee140; }
.tvist__slide:nth-child(10) .tvist__grid-item { background: #30cfd0; }

.info {
  padding: 15px;
  background: white;
  border-radius: 8px;
  font-size: 14px;
}

.info p {
  margin: 8px 0;
}

.info strong {
  color: #667eea;
}
</style>
