<template>
  <ExampleCard title="Бесконечная прокрутка" description="Слайдер с бесконечным циклом и 2 слайдами на странице">
    <div class="demo-wrapper">
      <div class="tvist" ref="sliderEl">
        <div class="tvist__container">
          <div class="tvist__slide">1</div>
          <div class="tvist__slide">2</div>
          <div class="tvist__slide">3</div>
          <div class="tvist__slide">4</div>
        </div>
      </div>

      <div class="controls">
        <button @click="slider?.prev()">← Prev</button>
        <button @click="slider?.next()">Next →</button>
      </div>

      <div class="info">
        Real Index: <strong>{{ state.realIndex + 1 }}</strong> / Active: <strong>{{ state.activeIndex }}</strong>
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
const state = reactive({ activeIndex: 0, realIndex: 0 })

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 2,
      gap: 20,
      loop: true,
      drag: true,
      speed: 300,
      on: {
        slideChanged: () => {
          state.activeIndex = slider.value.activeIndex
          state.realIndex = slider.value.realIndex ?? 0
        },
        created: (instance) => {
          state.activeIndex = instance.activeIndex
          state.realIndex = instance.realIndex ?? 0
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
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
}

.tvist__slide:nth-child(4n+1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist__slide:nth-child(4n+2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist__slide:nth-child(4n+3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist__slide:nth-child(4n+4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

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
