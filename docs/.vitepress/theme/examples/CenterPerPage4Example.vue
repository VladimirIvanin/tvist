<template>
  <div class="center-perpage4-example">
    <div class="description">
      <p>
        <strong>perPage: 4, center: true</strong> - активный по центру, 
        видны предыдущий, следующий и кусочки других слайдов
      </p>
    </div>

    <div class="tvist" ref="slider">
      <div class="tvist-v0__container">
        <div 
          v-for="i in 12" 
          :key="i" 
          class="tvist-v0__slide"
        >
          <div class="slide-content">
            <div class="slide-inner">
              <span class="slide-number">{{ i }}</span>
              <span 
                v-if="i === activeIndex + 1" 
                class="slide-badge"
              >
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button @click="goTo(0)">First</button>
      <button @click="prev" :disabled="!canPrev">← Prev</button>
      <div class="pagination">
        <button
          v-for="i in slideCount"
          :key="i"
          :class="['dot', { active: i - 1 === activeIndex }]"
          @click="goTo(i - 1)"
          :aria-label="`Go to slide ${i}`"
        />
      </div>
      <button @click="next" :disabled="!canNext">Next →</button>
      <button @click="goTo(slideCount - 1)">Last</button>
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
const goTo = (index: number) => tvist?.scrollTo(index)

onMounted(() => {
  if (!slider.value) return

  tvist = new Tvist(slider.value, {
    perPage: 4,
    gap: 12,
    center: true,
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
.center-perpage4-example {
  width: 100%;
  max-width: 1000px;
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
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 12px;
  padding: 40px 0;
}

.slide-content {
  background: white;
  border-radius: 10px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  min-height: 140px;
}

.slide-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.slide-number {
  font-size: 48px;
  font-weight: 700;
  color: #667eea;
  transition: all 0.35s;
}

.slide-badge {
  position: absolute;
  bottom: 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f5576c;
  background: #f5576c15;
  padding: 4px 10px;
  border-radius: 4px;
}

/* Активный слайд */
.tvist-v0__slide--active .slide-content {
  transform: scale(1.08);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  border-color: #667eea;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  z-index: 10;
}

.tvist-v0__slide--active .slide-number {
  color: #f5576c;
  font-size: 56px;
}

/* Предыдущий и следующий */
.tvist-v0__slide--prev .slide-content,
.tvist-v0__slide--next .slide-content {
  opacity: 0.85;
  transform: scale(0.98);
  border-color: #667eea30;
}

.tvist-v0__slide--prev .slide-number,
.tvist-v0__slide--next .slide-number {
  color: #764ba2;
}

/* Видимые, но не активные/prev/next */
.tvist-v0__slide--visible:not(.tvist-v0__slide--active):not(.tvist-v0__slide--prev):not(.tvist-v0__slide--next) .slide-content {
  opacity: 0.5;
  transform: scale(0.94);
}

/* Невидимые */
.tvist-v0__slide:not(.tvist-v0__slide--visible) .slide-content {
  opacity: 0.25;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.pagination {
  display: flex;
  gap: 8px;
  padding: 0 12px;
}

.dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 50%;
  background: #d0d0d0;
  transition: all 0.2s;
}

.dot:hover {
  background: #a0a0a0;
  transform: scale(1.2);
}

.dot.active {
  background: #f5576c;
  width: 24px;
  border-radius: 5px;
  transform: none;
}

@media (max-width: 768px) {
  .controls {
    gap: 8px;
  }
  
  button {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>
