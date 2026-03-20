<template>
  <ExampleCard
    title="Вложенные слайдеры"
    description="Отдельный Tvist на root внутри слайда родителя. Drag во вложенном не прокручивает внешний слайдер."
    :detailsLink="detailsLink"
  >
    <div class="demo-wrapper">
      <div ref="parentEl" class="tvist-v1 parent-slider">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide parent-slide--nested">
            <span class="parent-slide__label">Внешний слайд 1</span>
            <div ref="nestedEl" class="tvist-v1 nested-slider">
              <div class="tvist-v1__container">
                <div class="tvist-v1__slide">Внутр. A</div>
                <div class="tvist-v1__slide">Внутр. B</div>
                <div class="tvist-v1__slide">Внутр. C</div>
              </div>
            </div>
          </div>
          <div class="tvist-v1__slide">Внешний 2</div>
          <div class="tvist-v1__slide">Внешний 3</div>
        </div>
      </div>

      <div class="controls">
        <div class="controls__group">
          <span class="controls__label">Внешний</span>
          <button type="button" @click="parentSlider?.prev()" :disabled="!parentSlider?.canScrollPrev">←</button>
          <button type="button" @click="parentSlider?.next()" :disabled="!parentSlider?.canScrollNext">→</button>
        </div>
        <div class="controls__group">
          <span class="controls__label">Вложенный</span>
          <button type="button" @click="nestedSlider?.prev()" :disabled="!nestedSlider?.canScrollPrev">←</button>
          <button type="button" @click="nestedSlider?.next()" :disabled="!nestedSlider?.canScrollNext">→</button>
        </div>
      </div>

      <div class="info">
        Внешний: <strong>{{ state.parent }}</strong> / 3 · Вложенный: <strong>{{ state.nested }}</strong> / 3
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

defineProps({
  detailsLink: { type: String, default: '' },
})

const parentEl = ref(null)
const nestedEl = ref(null)
const parentSlider = ref(null)
const nestedSlider = ref(null)
const state = reactive({ parent: 1, nested: 1 })

onMounted(() => {
  if (!parentEl.value || !nestedEl.value) return

  parentSlider.value = new Tvist(parentEl.value, {
    perPage: 1,
    gap: 12,
    speed: 300,
    loop: false,
    drag: true,
    on: {
      slideChangeEnd: () => {
        state.parent = parentSlider.value.activeIndex + 1
      },
      created: (instance) => {
        state.parent = instance.activeIndex + 1
      },
    },
  })

  nestedSlider.value = new Tvist(nestedEl.value, {
    perPage: 1,
    gap: 8,
    speed: 280,
    loop: false,
    drag: true,
    on: {
      slideChangeEnd: () => {
        state.nested = nestedSlider.value.activeIndex + 1
      },
      created: (instance) => {
        state.nested = instance.activeIndex + 1
      },
    },
  })
})

onUnmounted(() => {
  nestedSlider.value?.destroy()
  parentSlider.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f0f2f8;
  border-radius: 12px;
}

.parent-slider.tvist-v1 {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
}

.parent-slider .tvist-v1__slide {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
  min-height: 320px;
  padding: 16px;
  box-sizing: border-box;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.parent-slider .tvist-v1__slide[data-tvist-slide-index='0'] {
  background: linear-gradient(160deg, #5b67d8 0%, #7c3aed 100%);
}
.parent-slider .tvist-v1__slide[data-tvist-slide-index='1'] {
  background: linear-gradient(160deg, #0d9488 0%, #059669 100%);
}
.parent-slider .tvist-v1__slide[data-tvist-slide-index='2'] {
  background: linear-gradient(160deg, #c2410c 0%, #ea580c 100%);
}

.parent-slide__label {
  flex-shrink: 0;
  text-align: center;
}

.nested-slider.tvist-v1 {
  flex: 1;
  min-height: 200px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

.nested-slider .tvist-v1__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.nested-slider .tvist-v1__slide[data-tvist-slide-index='0'] {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
.nested-slider .tvist-v1__slide[data-tvist-slide-index='1'] {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
}
.nested-slider .tvist-v1__slide[data-tvist-slide-index='2'] {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  align-items: center;
}

.controls__group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controls__label {
  font-size: 13px;
  color: #64748b;
  margin-right: 4px;
}

button {
  background: #5b67d8;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #4c56c4;
}

button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.info {
  background: #fff;
  padding: 14px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
  margin-top: 16px;
}

.info strong {
  color: #5b67d8;
}
</style>
