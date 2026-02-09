<template>
  <ExampleCard
    title="Auto Width"
    description="Ширина слайдов задаётся содержимым или CSS, слайдер не переопределяет размеры"
    :detailsLink="detailsLink"
  >
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v0">
        <div class="tvist-v0__container">
          <div
            v-for="(item, i) in slides"
            :key="i"
            class="tvist-v0__slide"
            :style="{ width: item.width }"
          >
            <span class="slide-label">{{ item.label }}</span>
            <span class="slide-size">{{ item.width }}</span>
          </div>
        </div>
      </div>
      <div class="controls">
        <button @click="slider?.prev()" :disabled="!slider?.canScrollPrev">
          ← Назад
        </button>
        <button @click="slider?.next()" :disabled="!slider?.canScrollNext">
          Вперёд →
        </button>
      </div>
      <div class="info">
        Слайд: <strong>{{ (slider?.activeIndex ?? 0) + 1 }}</strong> /
        <strong>{{ slides.length }}</strong>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

defineProps({
  detailsLink: { type: String, default: '' }
})

const sliderEl = ref(null)
const slider = ref(null)

const slides = [
  { label: 'Узкий', width: '180px' },
  { label: 'Средний', width: '280px' },
  { label: 'Широкий', width: '380px' },
  { label: 'Средний', width: '260px' },
  { label: 'Узкий', width: '200px' },
  { label: 'Широкий', width: '340px' }
]

onMounted(() => {
  if (!sliderEl.value) return
  slider.value = new Tvist(sliderEl.value, {
    autoWidth: true,
    gap: 16,
    perPage: 1,
    center: false,
    speed: 350,
    arrows: false
  })
})

onBeforeUnmount(() => {
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

.tvist-v0 {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.tvist-v0__slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  padding: 16px;
  box-sizing: border-box;
  border-radius: 8px;
  color: white;
  flex-shrink: 0;
}

.tvist-v0__slide:nth-child(6n + 1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tvist-v0__slide:nth-child(6n + 2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.tvist-v0__slide:nth-child(6n + 3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.tvist-v0__slide:nth-child(6n + 4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.tvist-v0__slide:nth-child(6n + 5) {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}
.tvist-v0__slide:nth-child(6n + 6) {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
}

.slide-label {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.slide-size {
  font-size: 12px;
  opacity: 0.9;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 15px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.info {
  background: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-top: 15px;
}

.info strong {
  color: #667eea;
}
</style>
