<template>
  <div class="update-options-example">
    <div class="controls">
      <div class="control-group">
        <h3>Базовые настройки</h3>
        
        <div class="control">
          <label>
            perPage: <strong>{{ options.perPage }}</strong>
            <input 
              type="range" 
              v-model.number="options.perPage" 
              min="1" 
              max="5" 
              @input="updateSlider"
            />
          </label>
        </div>

        <div class="control">
          <label>
            gap: <strong>{{ options.gap }}px</strong>
            <input 
              type="range" 
              v-model.number="options.gap" 
              min="0" 
              max="50" 
              step="5"
              @input="updateSlider"
            />
          </label>
        </div>

        <div class="control">
          <label>
            speed: <strong>{{ options.speed }}ms</strong>
            <input 
              type="range" 
              v-model.number="options.speed" 
              min="100" 
              max="1000" 
              step="50"
              @input="updateSlider"
            />
          </label>
        </div>

        <div class="control">
          <label>
            <input 
              type="checkbox" 
              v-model="options.center"
              @change="updateSlider"
            />
            center (центрирование активного слайда)
          </label>
        </div>

        <div class="control">
          <label>
            direction:
            <select v-model="options.direction" @change="updateSlider">
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
          </label>
        </div>
      </div>

      <div class="control-group">
        <h3>Peek (отступы)</h3>
        
        <div class="control">
          <label>
            peek left/top: <strong>{{ peekStart }}px</strong>
            <input 
              type="range" 
              v-model.number="peekStart" 
              min="0" 
              max="100" 
              step="10"
              @input="updatePeek"
            />
          </label>
        </div>

        <div class="control">
          <label>
            peek right/bottom: <strong>{{ peekEnd }}px</strong>
            <input 
              type="range" 
              v-model.number="peekEnd" 
              min="0" 
              max="100" 
              step="10"
              @input="updatePeek"
            />
          </label>
        </div>

        <div class="control">
          <label>
            <input 
              type="checkbox" 
              v-model="options.peekTrim"
              @change="updateSlider"
            />
            peekTrim (прижимать края)
          </label>
        </div>
      </div>

      <div class="control-group">
        <h3>Автопрокрутка</h3>
        
        <div class="control">
          <label>
            <input 
              type="checkbox" 
              v-model="autoplayEnabled"
              @change="toggleAutoplay"
            />
            Включить автопрокрутку
          </label>
        </div>

        <div class="control" v-if="autoplayEnabled">
          <label>
            Задержка: <strong>{{ autoplayDelay }}ms</strong>
            <input 
              type="range" 
              v-model.number="autoplayDelay" 
              min="1000" 
              max="5000" 
              step="500"
              @input="updateAutoplay"
            />
          </label>
        </div>
      </div>

      <div class="control-group">
        <h3>Пресеты</h3>
        <div class="preset-buttons">
          <button @click="applyPreset('default')" class="preset-btn">По умолчанию</button>
          <button @click="applyPreset('mobile')" class="preset-btn">Мобильный</button>
          <button @click="applyPreset('desktop')" class="preset-btn">Десктоп</button>
          <button @click="applyPreset('gallery')" class="preset-btn">Галерея</button>
        </div>
      </div>

      <div class="info-panel">
        <h4>Текущее состояние:</h4>
        <div class="info-item">
          <span>Активный слайд:</span> 
          <strong>{{ currentIndex + 1 }} / {{ slideCount }}</strong>
        </div>
        <div class="info-item">
          <span>Обновлений:</span> 
          <strong>{{ updateCount }}</strong>
        </div>
      </div>
    </div>

    <div class="slider-wrapper">
      <div ref="sliderEl" class="tvist-v0" :class="{ 'tvist-v0--vertical': options.direction === 'vertical' }">
        <div class="tvist-v0__container">
          <div 
            v-for="i in 8" 
            :key="i" 
            class="tvist-v0__slide"
          >
            <div class="slide-content">
              <span class="slide-number">{{ i }}</span>
              <p class="slide-text">Слайд {{ i }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="slider-controls">
        <button @click="slider?.prev()" class="nav-btn" :disabled="!canScrollPrev">
          ← Prev
        </button>
        <button @click="slider?.next()" class="nav-btn" :disabled="!canScrollNext">
          Next →
        </button>
      </div>
    </div>

    <div class="code-example">
      <h3>Текущий вызов updateOptions():</h3>
      <pre><code>{{ currentCode }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Tvist } from '@/index'
import type { TvistOptions } from '@/core/types'

const sliderEl = ref<HTMLElement | null>(null)
const slider = ref<Tvist | null>(null)
const currentIndex = ref(0)
const slideCount = ref(8)
const updateCount = ref(0)
const canScrollNext = ref(true)
const canScrollPrev = ref(false)

const options = ref<Partial<TvistOptions>>({
  perPage: 3,
  gap: 20,
  speed: 300,
  direction: 'horizontal',
  center: false,
  peekTrim: true
})

const peekStart = ref(0)
const peekEnd = ref(0)
const autoplayEnabled = ref(false)
const autoplayDelay = ref(3000)

const currentCode = computed(() => {
  const opts: any = { ...options.value }
  
  // Добавляем peek если есть
  if (peekStart.value > 0 || peekEnd.value > 0) {
    if (options.value.direction === 'horizontal') {
      opts.peek = { left: peekStart.value, right: peekEnd.value }
    } else {
      opts.peek = { top: peekStart.value, bottom: peekEnd.value }
    }
  }
  
  // Добавляем autoplay если включен
  if (autoplayEnabled.value) {
    opts.autoplay = autoplayDelay.value
  }
  
  return `slider.updateOptions(${JSON.stringify(opts, null, 2)})`
})

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      ...options.value,
      drag: true,
      on: {
        slideChange: (index: number) => {
          currentIndex.value = index
          updateNavigationState()
        }
      }
    })
    
    slideCount.value = slider.value.slides.length
    updateNavigationState()
  }
})

onUnmounted(() => {
  slider.value?.destroy()
})

function updateSlider() {
  if (!slider.value) return
  
  const updateOpts: Partial<TvistOptions> = { ...options.value }
  
  // Добавляем peek если есть
  if (peekStart.value > 0 || peekEnd.value > 0) {
    if (options.value.direction === 'horizontal') {
      updateOpts.peek = { left: peekStart.value, right: peekEnd.value }
    } else {
      updateOpts.peek = { top: peekStart.value, bottom: peekEnd.value }
    }
  }
  
  slider.value.updateOptions(updateOpts)
  updateCount.value++
  updateNavigationState()
}

function updatePeek() {
  updateSlider()
}

function toggleAutoplay() {
  if (!slider.value) return
  
  slider.value.updateOptions({
    autoplay: autoplayEnabled.value ? autoplayDelay.value : false
  })
  updateCount.value++
}

function updateAutoplay() {
  if (!slider.value || !autoplayEnabled.value) return
  
  slider.value.updateOptions({
    autoplay: autoplayDelay.value
  })
  updateCount.value++
}

function updateNavigationState() {
  if (slider.value) {
    canScrollNext.value = slider.value.canScrollNext
    canScrollPrev.value = slider.value.canScrollPrev
  }
}

function applyPreset(preset: string) {
  switch (preset) {
    case 'default':
      options.value = {
        perPage: 3,
        gap: 20,
        speed: 300,
        direction: 'horizontal',
        center: false,
        peekTrim: true
      }
      peekStart.value = 0
      peekEnd.value = 0
      autoplayEnabled.value = false
      break
      
    case 'mobile':
      options.value = {
        perPage: 1,
        gap: 10,
        speed: 300,
        direction: 'horizontal',
        center: false,
        peekTrim: true
      }
      peekStart.value = 20
      peekEnd.value = 20
      autoplayEnabled.value = false
      break
      
    case 'desktop':
      options.value = {
        perPage: 4,
        gap: 30,
        speed: 400,
        direction: 'horizontal',
        center: false,
        peekTrim: true
      }
      peekStart.value = 0
      peekEnd.value = 0
      autoplayEnabled.value = false
      break
      
    case 'gallery':
      options.value = {
        perPage: 1,
        gap: 0,
        speed: 500,
        direction: 'horizontal',
        center: true,
        peekTrim: false
      }
      peekStart.value = 80
      peekEnd.value = 80
      autoplayEnabled.value = true
      autoplayDelay.value = 3000
      break
  }
  
  updateSlider()
  if (preset === 'gallery' && autoplayEnabled.value) {
    toggleAutoplay()
  }
}
</script>

<style scoped>
.update-options-example {
  margin: 2rem 0;
}

.controls {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.control-group {
  margin-bottom: 2rem;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-group h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--vp-c-brand-1);
  border-bottom: 2px solid var(--vp-c-brand-1);
  padding-bottom: 0.5rem;
}

.control {
  margin-bottom: 1rem;
}

.control label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.control input[type="range"] {
  flex: 1;
  min-width: 200px;
}

.control input[type="checkbox"] {
  width: auto;
}

.control select {
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.control strong {
  color: var(--vp-c-brand-1);
  min-width: 60px;
  display: inline-block;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.preset-btn:hover {
  background: var(--vp-c-brand-1);
  color: white;
}

.info-panel {
  background: var(--vp-c-bg);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1.5rem;
}

.info-panel h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.9rem;
}

.slider-wrapper {
  margin-bottom: 2rem;
  background: var(--vp-c-bg-soft);
  padding: 2rem;
  border-radius: 8px;
}

.tvist {
  overflow: hidden;
  margin-bottom: 1rem;
}

.tvist--vertical {
  height: 400px;
}

.tvist-v0__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.tvist-v0--vertical .tvist-v0__slide {
  min-height: auto;
}

.slide-content {
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-brand-2) 100%);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.slide-number {
  font-size: 3rem;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.slide-text {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

.slider-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.nav-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  background: var(--vp-c-brand-1);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.code-example {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.code-example h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.code-example pre {
  margin: 0;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  overflow-x: auto;
}

.code-example code {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .control label {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .control input[type="range"] {
    width: 100%;
  }
  
  .preset-buttons {
    flex-direction: column;
  }
  
  .preset-btn {
    width: 100%;
  }
}
</style>
