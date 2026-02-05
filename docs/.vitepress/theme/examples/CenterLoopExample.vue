<template>
  <div class="center-loop-example">
    <div class="tvist" ref="slider">
      <div class="tvist__container">
        <div 
          v-for="i in 7" 
          :key="i" 
          class="tvist__slide"
        >
          <div class="slide-content">
            <span class="slide-number">{{ i }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button @click="prev">Prev</button>
      <button @click="next">Next</button>
      <div class="info">
        Active: {{ activeIndex + 1 }} / {{ slideCount }} (Loop)
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

const updateState = () => {
  if (!tvist) return
  // Используем realIndex если он доступен (в loop режиме)
  // @ts-ignore
  const index = tvist.realIndex !== undefined ? tvist.realIndex : tvist.activeIndex
  activeIndex.value = index
  slideCount.value = tvist.slides.length
}

const prev = () => tvist?.prev()
const next = () => tvist?.next()

onMounted(() => {
  if (!slider.value) return

  tvist = new Tvist(slider.value, {
    perPage: 3,
    gap: 20,
    center: true,
    loop: true,
    speed: 400,
  })

  // В loop режиме количество слайдов берется из оригинала
  // @ts-ignore
  slideCount.value = tvist.getModule('loop')?.getOriginalSlidesCount() || 7

  updateState()

  tvist.on('slideChange', updateState)
  tvist.on('slideChanged', updateState)
})

onBeforeUnmount(() => {
  tvist?.destroy()
})
</script>

<style scoped>
.center-loop-example {
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
.tvist__slide--active .slide-content {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  z-index: 2;
}

/* Стили для предыдущего и следующего слайдов */
.tvist__slide--prev .slide-content,
.tvist__slide--next .slide-content {
  opacity: 0.6;
  transform: scale(0.9);
}

/* Стили для невидимых слайдов */
.tvist__slide:not(.tvist__slide--visible) .slide-content {
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
  background: #11998e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover {
  background: #0d7a71;
  transform: translateY(-1px);
}

.info {
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 6px;
  font-weight: 500;
  color: #333;
}
</style>
