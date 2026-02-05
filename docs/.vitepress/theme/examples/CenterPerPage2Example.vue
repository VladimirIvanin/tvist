<template>
  <div class="center-perpage2-example">
    <div class="description">
      <p>
        <strong>perPage: 2, center: true</strong> - активный слайд по центру, 
        половинки предыдущего и следующего слайдов по бокам
      </p>
    </div>

    <div class="tvist" ref="slider">
      <div class="tvist__container">
        <div 
          v-for="i in 9" 
          :key="i" 
          class="tvist__slide"
        >
          <div class="slide-content">
            <span class="slide-label">Slide</span>
            <span class="slide-number">{{ i }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button @click="prev" :disabled="!canPrev">← Previous</button>
      <div class="info">
        <div class="active-index">{{ activeIndex + 1 }} / {{ slideCount }}</div>
        <div class="state-legend">
          <span class="legend-item active">■ Active</span>
          <span class="legend-item prev-next">■ Prev/Next</span>
          <span class="legend-item visible">■ Visible</span>
        </div>
      </div>
      <button @click="next" :disabled="!canNext">Next →</button>
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
    perPage: 2,
    gap: 16,
    center: true,
    speed: 350,
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
.center-perpage2-example {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.description {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.description p {
  margin: 0;
  color: #555;
  line-height: 1.6;
}

.tvist {
  margin-bottom: 24px;
  background: #fafafa;
  border-radius: 12px;
  padding: 48px 0;
  overflow: hidden;
}

.slide-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-height: 180px;
}

.slide-label {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.slide-number {
  font-size: 56px;
  font-weight: 700;
}

/* Активный слайд - выделяется */
.tvist__slide--active .slide-content {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  z-index: 10;
}

/* Предыдущий и следующий - полупрозрачные */
.tvist__slide--prev .slide-content,
.tvist__slide--next .slide-content {
  opacity: 0.7;
  transform: scale(0.95);
}

/* Видимые, но не активные/prev/next */
.tvist__slide--visible:not(.tvist__slide--active):not(.tvist__slide--prev):not(.tvist__slide--next) .slide-content {
  opacity: 0.4;
  transform: scale(0.9);
}

/* Невидимые слайды */
.tvist__slide:not(.tvist__slide--visible) .slide-content {
  opacity: 0.2;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

button {
  padding: 12px 28px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.active-index {
  padding: 10px 20px;
  background: #fff;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-weight: 600;
  color: #667eea;
  font-size: 18px;
}

.state-legend {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
}

.legend-item.active {
  color: #f5576c;
}

.legend-item.prev-next {
  color: #764ba2;
}

.legend-item.visible {
  color: #667eea;
}

@media (max-width: 640px) {
  .controls {
    flex-direction: column;
  }
  
  .state-legend {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
