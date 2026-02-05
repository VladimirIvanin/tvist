<template>
  <ExampleCard title="Grid Dimensions" description="Разные размеры ячеек в сетке" :detailsLink="detailsLink">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">1 (2x2)</div>
          <div class="tvist__slide">2 (1x1)</div>
          <div class="tvist__slide">3 (1x1)</div>
          <div class="tvist__slide">4 (1x2)</div>
          <div class="tvist__slide">5 (1x1)</div>
          <div class="tvist__slide">6 (1x1)</div>
        </div>
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
        rows: 2,
        cols: 2, // Обязательно указывать cols для корректной работы Dimensions
        gap: 10,
        dimensions: [
          [2, 2], // 1й слайд занимает 2x2
          [1, 1], // 2й слайд
          [1, 1], // 3й слайд
          [1, 2], // 4й слайд занимает 1 колонку и 2 ряда
          [1, 1], // 5й слайд
          [1, 1]  // 6й слайд
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
  font-size: 18px;
  font-weight: bold;
  color: white;
  border-radius: 8px;
}

.tvist__slide:nth-child(1) { background: #667eea; }
.tvist__slide:nth-child(2) { background: #764ba2; }
.tvist__slide:nth-child(3) { background: #f093fb; }
.tvist__slide:nth-child(4) { background: #f5576c; }
.tvist__slide:nth-child(5) { background: #4facfe; }
.tvist__slide:nth-child(6) { background: #00f2fe; }
</style>
