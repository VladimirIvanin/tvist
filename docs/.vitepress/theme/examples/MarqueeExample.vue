<template>
  <ExampleCard 
    title="Бегущая строка (Marquee)" 
    description="Непрерывная прокрутка с настраиваемой скоростью и направлением"
  >
    <div class="demo-wrapper">
      <div class="tvist-v0 marquee-demo" ref="sliderEl">
        <div class="tvist-v0__container">
          <div v-for="i in 6" :key="i" class="tvist-v0__slide">
            <div class="marquee-item">
              <div class="marquee-icon">{{ getIcon(i) }}</div>
              <div class="marquee-label">Элемент {{ i }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="togglePlay">{{ isPlaying ? '⏸ Пауза' : '▶ Старт' }}</button>
        <button @click="changeDirection">Направление: {{ direction }}</button>
      </div>

      <div class="info">
        Скорость: <strong>{{ speed }} px/s</strong>
        <input 
          type="range" 
          v-model.number="speed" 
          min="20" 
          max="150" 
          step="10"
          @input="updateSpeed"
          class="speed-slider"
        />
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref(null)
let slider = null

const isPlaying = ref(true)
const direction = ref('left')
const speed = ref(60)

const icons = ['🎨', '🎭', '🎪', '🎬', '🎮', '🎯']

function getIcon(index) {
  return icons[(index - 1) % icons.length]
}

onMounted(() => {
  if (sliderEl.value) {
    slider = new Tvist(sliderEl.value, {
      marquee: {
        speed: speed.value,
        direction: direction.value,
        pauseOnHover: true
      },
      gap: 20
    })

    // Подписываемся на события marquee для синхронизации состояния
    const marqueeModule = slider.modules.get('marquee')
    if (marqueeModule) {
      marqueeModule.on('marqueeStart', () => {
        isPlaying.value = true
      })
      marqueeModule.on('marqueeResume', () => {
        isPlaying.value = true
      })
      marqueeModule.on('marqueePause', () => {
        isPlaying.value = false
      })
      marqueeModule.on('marqueeStop', () => {
        isPlaying.value = false
      })
    }
  }
})

onUnmounted(() => {
  slider?.destroy()
})

function togglePlay() {
  const marquee = slider?.modules.get('marquee')?.getMarquee?.()
  if (!marquee) return

  if (isPlaying.value) {
    marquee.pause()
  } else {
    marquee.resume()
  }
  // isPlaying обновится автоматически через события
}

function changeDirection() {
  // Только left и right для горизонтального слайдера
  const directions = ['left', 'right']
  const currentIndex = directions.indexOf(direction.value)
  const nextIndex = (currentIndex + 1) % directions.length
  direction.value = directions[nextIndex]

  const marquee = slider?.modules.get('marquee')?.getMarquee?.()
  if (marquee) {
    marquee.setDirection(direction.value)
    // Синхронизируем состояние после смены направления
    isPlaying.value = marquee.isRunning()
  }
}

function updateSpeed() {
  const marquee = slider?.modules.get('marquee')?.getMarquee?.()
  if (marquee) {
    marquee.setSpeed(speed.value)
  }
}
</script>

<style scoped>
.demo-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.marquee-demo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px 0;
  overflow: hidden;
}

.marquee-item {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
}

.marquee-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.marquee-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.controls button {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.controls button:hover {
  background: #5568d3;
}

.info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.speed-slider {
  flex: 1;
  max-width: 200px;
}

@media (max-width: 640px) {
  .controls {
    flex-direction: column;
  }
  
  .controls button {
    width: 100%;
  }
  
  .info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .speed-slider {
    width: 100%;
    max-width: 100%;
  }
}
</style>
