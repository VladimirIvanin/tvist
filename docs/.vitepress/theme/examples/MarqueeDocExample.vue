<template>
  <div class="marquee-example">
    <h3>Базовый пример</h3>
    <div ref="basicSlider" class="tvist marquee-basic">
      <div class="tvist-v0__container">
        <div v-for="i in 8" :key="i" class="tvist-v0__slide">
          <div class="marquee-card">
            <div class="marquee-icon">🎨</div>
            <div class="marquee-text">Слайд {{ i }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button @click="togglePlay">{{ isPlaying ? 'Пауза' : 'Старт' }}</button>
      <button @click="changeDirection">
        Направление: {{ direction }}
      </button>
      <label>
        Скорость: {{ speed }} px/s
        <input
          type="range"
          v-model.number="speed"
          min="20"
          max="200"
          step="10"
          @input="updateSpeed"
        />
      </label>
    </div>

    <h3>Логотипы партнёров</h3>
    <div ref="logosSlider" class="tvist marquee-logos">
      <div class="tvist-v0__container">
        <div v-for="i in 6" :key="i" class="tvist-v0__slide">
          <div class="logo-card">
            <div class="logo-placeholder">Logo {{ i }}</div>
          </div>
        </div>
      </div>
    </div>

    <h3>Вертикальная бегущая строка</h3>
    <div ref="verticalSlider" class="tvist marquee-vertical">
      <div class="tvist-v0__container">
        <div v-for="i in 5" :key="i" class="tvist-v0__slide">
          <div class="news-item">
            <span class="news-icon">📢</span>
            <span class="news-text">Новость {{ i }}: Важное объявление</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from 'tvist'

const basicSlider = ref<HTMLElement>()
const logosSlider = ref<HTMLElement>()
const verticalSlider = ref<HTMLElement>()

let basicInstance: Tvist | null = null
let logosInstance: Tvist | null = null
let verticalInstance: Tvist | null = null

const isPlaying = ref(true)
const direction = ref<'left' | 'right'>('left')
const speed = ref(60)

onMounted(() => {
  // Базовый слайдер
  if (basicSlider.value) {
    basicInstance = new Tvist(basicSlider.value, {
      marquee: {
        speed: speed.value,
        direction: direction.value,
        pauseOnHover: true
      },
      gap: 20
    })

    // Подписываемся на события marquee для синхронизации состояния
    const marqueeModule = basicInstance.modules.get('marquee')
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

  // Логотипы
  if (logosSlider.value) {
    logosInstance = new Tvist(logosSlider.value, {
      marquee: {
        speed: 40,
        direction: 'left',
        pauseOnHover: true
      },
      gap: 40
    })
  }

  // Вертикальный
  if (verticalSlider.value) {
    verticalInstance = new Tvist(verticalSlider.value, {
      direction: 'vertical',
      marquee: {
        speed: 30,
        direction: 'up',
        pauseOnHover: true
      },
      gap: 15
    })
  }
})

onBeforeUnmount(() => {
  basicInstance?.destroy()
  logosInstance?.destroy()
  verticalInstance?.destroy()
})

function togglePlay() {
  const marquee = basicInstance?.modules.get('marquee')?.getMarquee?.()
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
  const directions: Array<'left' | 'right'> = ['left', 'right']
  const currentIndex = directions.indexOf(direction.value)
  const nextIndex = (currentIndex + 1) % directions.length
  direction.value = directions[nextIndex]

  const marquee = basicInstance?.modules.get('marquee')?.getMarquee?.()
  if (marquee) {
    marquee.setDirection(direction.value)
    // Синхронизируем состояние после смены направления
    isPlaying.value = marquee.isRunning()
  }
}

function updateSpeed() {
  const marquee = basicInstance?.modules.get('marquee')?.getMarquee?.()
  if (marquee) {
    marquee.setSpeed(speed.value)
  }
}
</script>

<style scoped>
.marquee-example {
  padding: 20px 0;
}

.marquee-example h3 {
  margin: 30px 0 15px;
  font-size: 18px;
  font-weight: 600;
}

.marquee-example h3:first-child {
  margin-top: 0;
}

/* Базовый слайдер */
.marquee-basic {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px 0;
  overflow: hidden;
}

.marquee-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 150px;
}

.marquee-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.marquee-text {
  font-weight: 600;
  color: #333;
}

/* Контролы */
.controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-top: 15px;
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

.controls label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
}

.controls input[type="range"] {
  width: 150px;
}

/* Логотипы */
.marquee-logos {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 30px 0;
  overflow: hidden;
}

.logo-card {
  background: white;
  border-radius: 8px;
  padding: 20px 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  min-width: 120px;
}

.logo-placeholder {
  font-weight: 700;
  color: #667eea;
  font-size: 18px;
  text-align: center;
}

/* Вертикальный слайдер */
.marquee-vertical {
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  height: 200px;
  overflow: hidden;
}

.news-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  background: linear-gradient(90deg, #f8f9fa 0%, #fff 100%);
  border-bottom: 1px solid #e0e0e0;
}

.news-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.news-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* Адаптивность */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .controls label {
    flex-direction: column;
    align-items: flex-start;
  }

  .controls input[type="range"] {
    width: 100%;
  }
}
</style>
