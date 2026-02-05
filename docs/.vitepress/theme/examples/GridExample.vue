<template>
  <ExampleCard title="Grid Layout" description="Сетка слайдов с настройкой строк и колонок" :detailsLink="detailsLink">
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
      perPage: 1, // Важно для сетки (один экран с сеткой)
      grid: {
        rows: 2, // 2 ряда
        cols: 2, // 2 колонки - создает страницы 2x2
        gap: {
          row: 10,
          col: 10
        }
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
  height: 300px;
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

.tvist__slide:nth-child(1) { background: #667eea; }
.tvist__slide:nth-child(2) { background: #764ba2; }
.tvist__slide:nth-child(3) { background: #f093fb; }
.tvist__slide:nth-child(4) { background: #f5576c; }
.tvist__slide:nth-child(5) { background: #4facfe; }
.tvist__slide:nth-child(6) { background: #00f2fe; }
.tvist__slide:nth-child(7) { background: #43e97b; }
.tvist__slide:nth-child(8) { background: #38f9d7; }
</style>
