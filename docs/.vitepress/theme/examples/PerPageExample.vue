<template>
  <ExampleCard 
    title="PerPage: несколько слайдов на экран" 
    description="Демонстрация опции perPage для показа нескольких слайдов одновременно"
  >
    <div class="demo-wrapper">
      <!-- perPage: 1 -->
      <div class="demo-section">
        <h3>perPage: 1 (по умолчанию)</h3>
        <div ref="slider1El" class="tvist">
          <div class="tvist__container">
            <div v-for="i in 8" :key="i" class="tvist__slide">
              <span>{{ i }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- perPage: 2 -->
      <div class="demo-section">
        <h3>perPage: 2</h3>
        <div ref="slider2El" class="tvist">
          <div class="tvist__container">
            <div v-for="i in 8" :key="i" class="tvist__slide">
              <span>{{ i }}</span>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider2?.prev()" :disabled="!slider2?.canScrollPrev">← Prev</button>
          <span class="slide-info">{{ state2.current }} / {{ state2.total }}</span>
          <button @click="slider2?.next()" :disabled="!slider2?.canScrollNext">Next →</button>
        </div>
      </div>

      <!-- perPage: 3 -->
      <div class="demo-section">
        <h3>perPage: 3 с зазором</h3>
        <div ref="slider3El" class="tvist">
          <div class="tvist__container">
            <div v-for="i in 8" :key="i" class="tvist__slide">
              <span>{{ i }}</span>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider3?.prev()" :disabled="!slider3?.canScrollPrev">← Prev</button>
          <span class="slide-info">{{ state3.current }} / {{ state3.total }}</span>
          <button @click="slider3?.next()" :disabled="!slider3?.canScrollNext">Next →</button>
        </div>
      </div>

      <!-- perPage: 4 -->
      <div class="demo-section">
        <h3>perPage: 4 (grid-style)</h3>
        <div ref="slider4El" class="tvist">
          <div class="tvist__container">
            <div v-for="i in 12" :key="i" class="tvist__slide">
              <span>{{ i }}</span>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider4?.prev()" :disabled="!slider4?.canScrollPrev">← Prev</button>
          <span class="slide-info">{{ state4.current }} / {{ state4.total }}</span>
          <button @click="slider4?.next()" :disabled="!slider4?.canScrollNext">Next →</button>
        </div>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const slider1El = ref(null)
const slider2El = ref(null)
const slider3El = ref(null)
const slider4El = ref(null)

const slider1 = ref(null)
const slider2 = ref(null)
const slider3 = ref(null)
const slider4 = ref(null)

const state2 = reactive({ current: 1, total: 8 })
const state3 = reactive({ current: 1, total: 8 })
const state4 = reactive({ current: 1, total: 12 })

const updateState = (slider, state, total) => {
  if (slider) {
    state.current = slider.activeIndex + 1
    state.total = total
  }
}

onMounted(() => {
  // Slider 1: perPage = 1
  if (slider1El.value) {
    slider1.value = new Tvist(slider1El.value, {
      perPage: 1,
      gap: 0,
      speed: 300,
      drag: true
    })
  }

  // Slider 2: perPage = 2
  if (slider2El.value) {
    slider2.value = new Tvist(slider2El.value, {
      perPage: 2,
      gap: 16,
      speed: 300,
      drag: true,
      on: {
        slideChanged: () => updateState(slider2.value, state2, 8),
        created: (instance) => updateState(instance, state2, 8)
      }
    })
  }

  // Slider 3: perPage = 3
  if (slider3El.value) {
    slider3.value = new Tvist(slider3El.value, {
      perPage: 3,
      gap: 20,
      speed: 300,
      drag: true,
      on: {
        slideChanged: () => updateState(slider3.value, state3, 8),
        created: (instance) => updateState(instance, state3, 8)
      }
    })
  }

  // Slider 4: perPage = 4
  if (slider4El.value) {
    slider4.value = new Tvist(slider4El.value, {
      perPage: 4,
      gap: 12,
      speed: 300,
      drag: true,
      on: {
        slideChanged: () => updateState(slider4.value, state4, 12),
        created: (instance) => updateState(instance, state4, 12)
      }
    })
  }
})

onUnmounted(() => {
  slider1.value?.destroy()
  slider2.value?.destroy()
  slider3.value?.destroy()
  slider4.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.demo-section {
  margin-bottom: 40px;
}

.demo-section:last-child {
  margin-bottom: 0;
}

.demo-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.tvist {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.tvist__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  height: 200px;
  position: relative;
  user-select: none;
}

.tvist__slide span {
  position: relative;
  z-index: 1;
}

/* Градиенты для слайдов - используем nth-child для повторяющегося паттерна */
.tvist__slide:nth-child(12n+1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist__slide:nth-child(12n+2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist__slide:nth-child(12n+3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist__slide:nth-child(12n+4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist__slide:nth-child(12n+5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.tvist__slide:nth-child(12n+6) { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
.tvist__slide:nth-child(12n+7) { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
.tvist__slide:nth-child(12n+8) { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); }
.tvist__slide:nth-child(12n+9) { background: linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%); }
.tvist__slide:nth-child(12n+10) { background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); }
.tvist__slide:nth-child(12n+11) { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
.tvist__slide:nth-child(12n+12) { background: linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%); }

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
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

.slide-info {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}
</style>
