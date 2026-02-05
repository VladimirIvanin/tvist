<template>
  <ExampleCard 
    title="Адаптивный слайдер (Responsive)" 
    description="Container-first: размеры и perPage считаются от контейнера слайдера. Breakpoints и slideMinSize подстраивают количество слайдов под ширину контейнера (или окна — по умолчанию)."
  >
    <div class="demo-wrapper">
      <!-- Breakpoints Example -->
      <div class="demo-section">
        <h3>С использованием breakpoints (по умолчанию — по окну)</h3>
        <p class="description">
          Breakpoints по умолчанию привязаны к ширине окна (viewport). Количество слайдов:
          <strong>≥1200px</strong> — 4 слайда,
          <strong>≥992px</strong> — 3 слайда,
          <strong>≥768px</strong> — 2 слайда,
          <strong>&lt;768px</strong> — 1 слайд.
          Размеры слайдов всегда считаются от контейнера.
        </p>
        <div ref="slider1El" class="tvist">
          <div class="tvist__container">
            <div v-for="i in 12" :key="i" class="tvist__slide">
              <div class="slide-content">
                <span class="slide-number">{{ i }}</span>
                <span class="slide-label">Slide {{ i }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider1?.prev()" :disabled="!slider1?.canScrollPrev">← Prev</button>
          <span class="slide-info">
            {{ state1.current }} / {{ state1.total }}
            <span class="breakpoint-info" v-if="state1.breakpoint">
              (по {{ state1.perPage }})
            </span>
          </span>
          <button @click="slider1?.next()" :disabled="!slider1?.canScrollNext">Next →</button>
        </div>
        <div class="current-breakpoint">
          Текущий breakpoint: 
          <strong>{{ state1.breakpoint || 'default' }}</strong>
          | perPage: <strong>{{ state1.perPage }}</strong>
        </div>
      </div>

      <!-- slideMinSize Example -->
      <div class="demo-section">
        <h3>С использованием slideMinSize (container-first)</h3>
        <p class="description">
          perPage считается от ширины контейнера: минимальная ширина слайда = 250px.
          При изменении размера контейнера (окно, сайдбар, grid) слайдер обновляется автоматически.
        </p>
        <div ref="slider2El" class="tvist slider-minsize">
          <div class="tvist__container">
            <div v-for="i in 12" :key="i" class="tvist__slide">
              <div class="slide-content">
                <span class="slide-number">{{ i }}</span>
                <span class="slide-label">Slide {{ i }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider2?.prev()" :disabled="!slider2?.canScrollPrev">← Prev</button>
          <span class="slide-info">
            {{ state2.current }} / {{ state2.total }}
            <span class="breakpoint-info" v-if="state2.perPage">
              (по {{ state2.perPage }})
            </span>
          </span>
          <button @click="slider2?.next()" :disabled="!slider2?.canScrollNext">Next →</button>
        </div>
        <div class="current-breakpoint">
          Автоматически: perPage = <strong>{{ state2.perPage }}</strong>
        </div>
      </div>

      <!-- Container-based breakpoints -->
      <div class="demo-section">
        <h3>Container-based breakpoints</h3>
        <p class="description">
          Breakpoints основаны на ширине контейнера, а не окна браузера.
          Этот слайдер находится в узком контейнере.
        </p>
        <div class="narrow-container">
          <div ref="slider3El" class="tvist">
            <div class="tvist__container">
              <div v-for="i in 8" :key="i" class="tvist__slide">
                <div class="slide-content">
                  <span class="slide-number">{{ i }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button @click="slider3?.prev()" :disabled="!slider3?.canScrollPrev">← Prev</button>
          <span class="slide-info">
            {{ state3.current }} / {{ state3.total }}
            (по {{ state3.perPage }})
          </span>
          <button @click="slider3?.next()" :disabled="!slider3?.canScrollNext">Next →</button>
        </div>
        <div class="current-breakpoint">
          Container width breakpoint | perPage: <strong>{{ state3.perPage }}</strong>
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

const slider1 = ref(null)
const slider2 = ref(null)
const slider3 = ref(null)

const state1 = reactive({ current: 1, total: 12, breakpoint: null, perPage: 4 })
const state2 = reactive({ current: 1, total: 12, perPage: 1 })
const state3 = reactive({ current: 1, total: 8, perPage: 1 })

const updateState = (slider, state, total) => {
  if (slider) {
    state.current = slider.activeIndex + 1
    state.total = total
    state.perPage = slider.options.perPage || 1
  }
}

onMounted(() => {
  // Slider 1: Breakpoints (window-based)
  if (slider1El.value) {
    slider1.value = new Tvist(slider1El.value, {
      perPage: 4,
      gap: 20,
      speed: 300,
      drag: true,
      breakpoints: {
        1200: {
          perPage: 3,
          gap: 16
        },
        992: {
          perPage: 2,
          gap: 16
        },
        768: {
          perPage: 1,
          gap: 0
        }
      },
      on: {
        slideChanged: () => updateState(slider1.value, state1, 12),
        created: (instance) => updateState(instance, state1, 12),
        breakpoint: (bp) => {
          state1.breakpoint = bp
          updateState(slider1.value, state1, 12)
        }
      }
    })
  }

  // Slider 2: slideMinSize (auto-calculation)
  if (slider2El.value) {
    slider2.value = new Tvist(slider2El.value, {
      slideMinSize: 250,
      gap: 16,
      speed: 300,
      drag: true,
      on: {
        slideChanged: () => updateState(slider2.value, state2, 12),
        created: (instance) => updateState(instance, state2, 12),
        resize: () => updateState(slider2.value, state2, 12)
      }
    })
  }

  // Slider 3: Container-based breakpoints
  if (slider3El.value) {
    slider3.value = new Tvist(slider3El.value, {
      perPage: 2,
      gap: 12,
      speed: 300,
      drag: true,
      breakpointsBase: 'container',
      breakpoints: {
        600: {
          perPage: 1,
          gap: 0
        },
        400: {
          perPage: 1,
          gap: 0
        }
      },
      on: {
        slideChanged: () => updateState(slider3.value, state3, 8),
        created: (instance) => updateState(instance, state3, 8),
        breakpoint: () => updateState(slider3.value, state3, 8),
        resize: () => updateState(slider3.value, state3, 8)
      }
    })
  }
})

onUnmounted(() => {
  slider1.value?.destroy()
  slider2.value?.destroy()
  slider3.value?.destroy()
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
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.description {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.description strong {
  color: #667eea;
  font-weight: 600;
}

.tvist {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.narrow-container {
  max-width: 600px;
  margin: 0 auto;
}

.tvist__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  position: relative;
  user-select: none;
}

.slide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: white;
}

.slide-number {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
}

.slide-label {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 500;
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
  margin-bottom: 12px;
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
  min-width: 80px;
  text-align: center;
}

.breakpoint-info {
  color: #667eea;
  font-size: 12px;
  display: block;
  margin-top: 2px;
}

.current-breakpoint {
  background: white;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  color: #666;
}

.current-breakpoint strong {
  color: #667eea;
  font-weight: 600;
}
</style>
