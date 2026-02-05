<template>
  <ExampleCard title="Basic Slider" description="Простой слайдер с навигацией и информацией о текущем слайде">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist">
        <div class="tvist__container">
          <div class="tvist__slide">Slide 1</div>
          <div class="tvist__slide">Slide 2</div>
          <div class="tvist__slide">Slide 3</div>
          <div class="tvist__slide">Slide 4</div>
          <div class="tvist__slide">Slide 5</div>
        </div>
      </div>

      <div class="controls">
        <button @click="slider?.prev()" :disabled="!slider?.canScrollPrev">← Previous</button>
        <button @click="slider?.next()" :disabled="!slider?.canScrollNext">Next →</button>
      </div>

      <div class="info">
        Current: <strong>{{ state.current }}</strong> / <strong>5</strong>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from '../../../../src/index.ts'
import '../../../../src/styles/tvist.scss'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref(null)
const slider = ref(null)
const state = reactive({ current: 1 })

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      speed: 300,
      loop: false,
      on: {
        slideChanged: () => {
          state.current = slider.value.activeIndex + 1
        },
        created: () => {
          state.current = 1
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
}

.tvist__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  color: white;
  height: 300px;
}

.tvist__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

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
