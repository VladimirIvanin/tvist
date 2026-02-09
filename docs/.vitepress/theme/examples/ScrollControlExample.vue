<template>
  <ExampleCard 
    title="Scroll Control" 
    description="Управление слайдером через скролл колесика мыши"
    :detailsLink="detailsLink"
  >
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v0">
        <div class="tvist-v0__container">
          <div class="tvist-v0__slide slide-1">
            <div class="slide-content">
              <div class="slide-title">Слайд 1</div>
              <div class="slide-hint">
                🖱️ Используйте колесико мыши
              </div>
            </div>
          </div>
          <div class="tvist-v0__slide slide-2">
            <div class="slide-content">
              <div class="slide-title">Слайд 2</div>
            </div>
          </div>
          <div class="tvist-v0__slide slide-3">
            <div class="slide-content">
              <div class="slide-title">Слайд 3</div>
            </div>
          </div>
          <div class="tvist-v0__slide slide-4">
            <div class="slide-content">
              <div class="slide-title">Слайд 4</div>
            </div>
          </div>
          <div class="tvist-v0__slide slide-5">
            <div class="slide-content">
              <div class="slide-title">Слайд 5</div>
            </div>
          </div>
        </div>
      </div>

      <div class="info">
        <div class="info-item">
          Текущий слайд: <strong>{{ state.current }}</strong> / <strong>5</strong>
        </div>
        <div class="info-item">
          Направление: <strong>{{ state.direction === 'horizontal' ? '←→ Горизонтальное' : '↑↓ Вертикальное' }}</strong>
        </div>
      </div>

      <div class="controls">
        <button @click="toggleDirection">
          {{ state.direction === 'horizontal' ? '↕️ Переключить на вертикальное' : '↔️ Переключить на горизонтальное' }}
        </button>
        <button @click="toggleReleaseOnEdges">
          {{ state.releaseOnEdges ? '🔓 ReleaseOnEdges: ON' : '🔒 ReleaseOnEdges: OFF' }}
        </button>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

defineProps({
  detailsLink: { type: String, default: '' }
})

const sliderEl = ref(null)
const slider = ref(null)
const state = reactive({ 
  current: 1,
  direction: 'horizontal',
  releaseOnEdges: true
})

function initSlider() {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      speed: 300,
      direction: state.direction,
      wheel: {
        releaseOnEdges: state.releaseOnEdges
      },
      pagination: {
        type: 'bullets',
        clickable: true
      },
      on: {
        slideChanged: () => {
          state.current = slider.value.activeIndex + 1
        },
        created: (instance) => {
          state.current = instance.activeIndex + 1
        }
      }
    })
  }
}

function toggleDirection() {
  state.direction = state.direction === 'horizontal' ? 'vertical' : 'horizontal'
  slider.value?.destroy()
  
  // Переключаем класс
  if (sliderEl.value) {
    if (state.direction === 'vertical') {
      sliderEl.value.classList.add('tvist--vertical')
      sliderEl.value.style.height = '400px'
    } else {
      sliderEl.value.classList.remove('tvist--vertical')
      sliderEl.value.style.height = 'auto'
    }
  }
  
  initSlider()
}

function toggleReleaseOnEdges() {
  state.releaseOnEdges = !state.releaseOnEdges
  slider.value?.updateOptions({
    wheel: {
      releaseOnEdges: state.releaseOnEdges
    }
  })
}

onMounted(() => {
  initSlider()
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

.tvist-v0 {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.tvist--vertical {
  height: 400px;
}

.tvist-v0__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  position: relative;
}

.tvist-v0--vertical .tvist-v0__slide {
  height: 400px;
}

.slide-content {
  text-align: center;
  z-index: 10;
  position: relative;
}

.slide-title {
  font-size: 36px;
  font-weight: bold;
  color: white;
  margin-bottom: 10px;
}

.slide-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.slide-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.slide-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.slide-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.slide-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.slide-5 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

.info {
  background: white;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}

.info-item {
  font-size: 14px;
  color: #666;
}

.info strong {
  color: #667eea;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
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
</style>
