<template>
  <ExampleCard 
    title="LazyLoad - Ленивая загрузка изображений" 
    description="Изображения загружаются только при приближении к видимой области. Откройте консоль браузера, чтобы увидеть события загрузки."
    :detailsLink="detailsLink"
  >
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v1">
        <div class="tvist-v1__container">
          <div v-for="i in 10" :key="i" class="tvist-v1__slide">
            <img 
              :data-src="`https://picsum.photos/800/600?random=${i}`"
              :alt="`Slide ${i}`"
              class="lazy-image"
            >
            <div class="slide-label">Slide {{ i }}</div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="slider?.prev()" :disabled="!slider?.canScrollPrev">← Назад</button>
        <button @click="slider?.next()" :disabled="!slider?.canScrollNext">Вперёд →</button>
        <button @click="loadAll" class="load-all">Загрузить всё</button>
      </div>

      <div class="info">
        <div class="info-row">
          <span>Текущий слайд:</span>
          <strong>{{ state.current }} / 10</strong>
        </div>
        <div class="info-row">
          <span>Загружено изображений:</span>
          <strong class="loaded-count">{{ state.loadedCount }}</strong>
        </div>
        <div class="info-row">
          <span>Предзагрузка соседних:</span>
          <strong>{{ state.preloadPrevNext }}</strong>
        </div>
      </div>

      <div class="settings">
        <h4>Настройки</h4>
        <div class="setting-item">
          <label>
            Предзагружать слайдов:
            <input 
              type="number" 
              v-model.number="state.preloadPrevNext" 
              min="0" 
              max="3"
              @change="updatePreload"
            >
          </label>
        </div>
      </div>

      <div class="log">
        <h4>Лог событий:</h4>
        <div class="log-content">
          <div 
            v-for="(log, index) in state.logs" 
            :key="index" 
            :class="['log-item', log.type]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="state.logs.length === 0" class="log-empty">
            События загрузки появятся здесь...
          </div>
        </div>
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
  loadedCount: 0,
  preloadPrevNext: 1,
  logs: []
})

const addLog = (message, type = 'info') => {
  const time = new Date().toLocaleTimeString('ru-RU')
  state.logs.unshift({ time, message, type })
  // Ограничиваем количество логов
  if (state.logs.length > 10) {
    state.logs.pop()
  }
}

const loadAll = () => {
  const lazyModule = slider.value?.modules?.get('lazyload')
  if (lazyModule) {
    lazyModule.loadAll()
    addLog('Загружаем все оставшиеся изображения', 'success')
  }
}

const updatePreload = () => {
  slider.value?.updateOptions({
    lazy: {
      preloadPrevNext: state.preloadPrevNext
    }
  })
  addLog(`Обновлена предзагрузка: ${state.preloadPrevNext} слайдов`, 'info')
}

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 20,
      speed: 300,
      loop: true,
      arrows: true,
      lazy: {
        preloadPrevNext: state.preloadPrevNext
      },
      on: {
        slideChanged: () => {
          state.current = slider.value.activeIndex + 1
        },
        created: (instance) => {
          state.current = instance.activeIndex + 1
          addLog('Слайдер создан', 'success')
        },
        lazyLoaded: (img, slideIndex) => {
          state.loadedCount++
          addLog(`Загружено изображение в слайде ${slideIndex + 1}`, 'success')
          console.log('LazyLoad: изображение загружено', img, slideIndex)
        },
        lazyLoadError: (img, slideIndex) => {
          addLog(`Ошибка загрузки в слайде ${slideIndex + 1}`, 'error')
          console.error('LazyLoad: ошибка загрузки', img, slideIndex)
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

.tvist-v1 {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
}

.tvist-v1__slide {
  position: relative;
  height: 400px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-label {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
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

button.load-all {
  background: #43e97b;
}

button.load-all:hover {
  background: #38d66c;
}

.info {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row strong {
  color: #667eea;
  font-weight: 600;
}

.loaded-count {
  color: #43e97b !important;
}

.settings {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.settings h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.setting-item {
  margin-bottom: 10px;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
}

.setting-item input[type="number"] {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 60px;
}

.log {
  background: white;
  padding: 15px;
  border-radius: 8px;
}

.log h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
}

.log-item {
  padding: 6px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: center;
  background: white;
}

.log-item.success {
  border-left: 3px solid #43e97b;
}

.log-item.error {
  border-left: 3px solid #f5576c;
  background: #fff5f5;
}

.log-item.info {
  border-left: 3px solid #667eea;
}

.log-time {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
}

.log-message {
  color: #333;
  flex: 1;
}

.log-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
}

/* Кастомизация спиннера */
:deep(.tvist-v1__spinner) {
  --tvist-v1-spinner-size: 50px;
  --tvist-v1-spinner-color: #667eea;
}

:deep(.tvist-v1__slide--loading) {
  --tvist-v1-loading-overlay: rgba(255, 255, 255, 0.8);
}

@media (max-width: 768px) {
  .tvist-v1__slide {
    height: 300px;
  }

  .slide-label {
    font-size: 16px;
    bottom: 10px;
    left: 10px;
  }
}
</style>
