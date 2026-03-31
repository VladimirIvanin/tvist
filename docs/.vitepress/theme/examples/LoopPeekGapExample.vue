<template>
  <ExampleCard
    title="Loop + perPage: 3, peek 120, 4 слайда"
    description="Кейс с 4 слайдами, peek по 120px слева/справа и бесконечным loop без дыр справа"
  >
    <div class="demo-wrapper">
      <div class="tvist-v1" ref="sliderEl">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">1</div>
          <div class="tvist-v1__slide">2</div>
          <div class="tvist-v1__slide">3</div>
          <div class="tvist-v1__slide">4</div>
        </div>
      </div>

      <div class="controls">
        <button @click="slider?.prev()">← Prev</button>
        <button @click="slider?.next()">Next →</button>
      </div>

      <p class="hint">
        В примере используется <code>perPage: 3</code>, <code>gap: 32</code>, <code>peek: 120</code>, <code>loop: true</code>.  
        Даже при 4 слайдах не должно появляться пустого пространства справа.
      </p>
    </div>
  </ExampleCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref<HTMLElement | null>(null)
const slider = ref<Tvist | null>(null)

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 3,
      gap: 32,
      loop: true,
      drag: true,
      speed: 300,
      peek: 120
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

.tvist-v1 {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.tvist-v1__slide {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  color: white;
  user-select: none;
}

.tvist-v1__slide[data-tvist-slide-index="0"] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tvist-v1__slide[data-tvist-slide-index="1"] {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.tvist-v1__slide[data-tvist-slide-index="2"] {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.tvist-v1__slide[data-tvist-slide-index="3"] {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 18px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

.hint {
  margin-top: 12px;
  font-size: 13px;
  color: #555;
}

.hint code {
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
}
</style>

