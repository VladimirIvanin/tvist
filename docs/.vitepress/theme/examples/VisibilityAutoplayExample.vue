<template>
  <div class="example-container">
    <div class="controls">
      <button @click="toggleVisibility" class="toggle-btn">
        {{ isVisible ? 'Скрыть слайдер' : 'Показать слайдер' }}
      </button>
      <div class="status">
        Статус: <span :class="{ visible: isVisible, hidden: !isVisible }">
          {{ isVisible ? 'Виден' : 'Скрыт' }}
        </span>
      </div>
    </div>

    <div ref="sliderContainer" :style="{ display: isVisible ? 'block' : 'none' }">
      <div class="tvist-v1">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide" v-for="i in 5" :key="i">
            <div class="slide-content">
              Slide {{ i }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="info">
      <p><strong>Инструкция:</strong></p>
      <ul>
        <li>Нажмите "Скрыть слайдер" - autoplay приостановится</li>
        <li>Нажмите "Показать слайдер" - autoplay возобновится</li>
        <li>Откройте консоль, чтобы увидеть события</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Tvist from 'tvist'

const sliderContainer = ref<HTMLElement | null>(null)
const isVisible = ref(true)
let slider: Tvist | null = null

const toggleVisibility = () => {
  isVisible.value = !isVisible.value
}

onMounted(() => {
  if (sliderContainer.value) {
    const sliderElement = sliderContainer.value.querySelector('.tvist-v1')
    if (sliderElement) {
      slider = new Tvist(sliderElement as HTMLElement, {
        perPage: 1,
        gap: 20,
        autoplay: {
          delay: 2000,
        },
        visibility: true,
        on: {
          sliderHidden: () => {
            console.log('🙈 Слайдер скрыт - autoplay приостановлен')
          },
          sliderVisible: () => {
            console.log('👁️ Слайдер виден - autoplay возобновлен')
          },
        },
      })
    }
  }
})

onUnmounted(() => {
  slider?.destroy()
})
</script>

<style scoped>
.example-container {
  margin: 2rem 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: var(--vp-c-brand-2);
}

.status {
  font-size: 14px;
}

.status .visible {
  color: #10b981;
  font-weight: 600;
}

.status .hidden {
  color: #ef4444;
  font-weight: 600;
}

.slide-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 2rem;
  font-weight: bold;
  border-radius: 8px;
}

.info {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 14px;
}

.info ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.info li {
  margin: 0.25rem 0;
}
</style>
