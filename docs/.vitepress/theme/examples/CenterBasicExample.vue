<template>
  <div class="center-basic-example">
    <div class="tvist" ref="slider">
      <div class="tvist-v0__container">
        <div 
          v-for="i in 7" 
          :key="i" 
          class="tvist-v0__slide"
        >
          <div class="slide-content">
            <span class="slide-number">{{ i }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button @click="prev" :disabled="!canPrev">Prev</button>
      <button @click="next" :disabled="!canNext">Next</button>
      <div class="info">
        Active: {{ activeIndex + 1 }} / {{ slideCount }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from 'tvist'

const slider = ref<HTMLElement>()
let tvist: Tvist | null = null
const activeIndex = ref(0)
const slideCount = ref(0)
const canPrev = ref(false)
const canNext = ref(false)

const updateState = () => {
  if (!tvist) return
  activeIndex.value = tvist.activeIndex
  slideCount.value = tvist.slides.length
  canPrev.value = tvist.canScrollPrev
  canNext.value = tvist.canScrollNext
}

const prev = () => tvist?.prev()
const next = () => tvist?.next()

onMounted(() => {
  if (!slider.value) return

  tvist = new Tvist(slider.value, {
    perPage: 3,
    gap: 20,
    center: true, // Центрирование активного слайда
    speed: 400,
    drag: true,
  })

  updateState()

  tvist.on('slideChange', updateState)
  tvist.on('slideChanged', updateState)
})

onBeforeUnmount(() => {
  tvist?.destroy()
})
</script>

<style scoped>
.center-basic-example {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.tvist {
  margin-bottom: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 40px 0;
}

.slide-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 60px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.slide-number {
  font-size: 48px;
}

/* Стили для активного слайда */
.tvist-v0__slide--active .slide-content {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* Стили для предыдущего и следующего слайдов */
.tvist-v0__slide--prev .slide-content,
.tvist-v0__slide--next .slide-content {
  opacity: 0.6;
  transform: scale(0.9);
}

/* Стили для невидимых слайдов */
.tvist-v0__slide:not(.tvist-v0__slide--visible) .slide-content {
  opacity: 0.3;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

button {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.info {
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 6px;
  font-weight: 500;
  color: #333;
}
</style>
