<template>
  <ExampleCard title="Video" description="Управление видео в слайдах с автовоспроизведением и прогрессом">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v1">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">
            <video
              src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"
              muted
              playsinline
            ></video>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">2</div>
              <div class="slide-text">Фото-слайд (2 сек)</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <video
              src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"
              muted
              playsinline
            ></video>
          </div>
        </div>
        <div class="tvist-v1__pagination"></div>
      </div>

      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: progress * 100 + '%' }"></div>
      </div>

      <div class="controls">
        <button @click="toggleMute">{{ isMuted ? 'Включить звук' : 'Выключить звук' }}</button>
        <button @click="handlePlay">Play</button>
        <button @click="handlePause">Pause</button>
      </div>

      <div class="info">
        <p>Видео-слайды воспроизводятся автоматически. Фото-слайды показываются 5 секунд.</p>
        <p>waitForVideo: переход после окончания видео</p>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref(null)
const slider = ref(null)
const progress = ref(0)
const isMuted = ref(true)

const toggleMute = () => {
  if (isMuted.value) {
    slider.value?.video?.unmute()
    isMuted.value = false
  } else {
    slider.value?.video?.mute()
    isMuted.value = true
  }
}

const handlePlay = () => {
  slider.value?.video?.play()
}

const handlePause = () => {
  slider.value?.video?.pause()
}

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      loop: true,
      video: {
        autoplay: true,
        muted: true,
        playsinline: true,
        pauseOnLeave: true,
        resetOnLeave: true,
      },
      autoplay: {
        delay: 2000,
        pauseOnHover: true,
        waitForVideo: true,
      },
      pagination: {
        type: 'bullets',
        clickable: true,
      },
    })

    // Прогресс видео
    slider.value.on('videoProgress', (data) => {
      progress.value = data.progress
    })

    // Прогресс autoplay (для фото-слайдов)
    slider.value.on('autoplayProgress', (data) => {
      progress.value = data.progress
    })

    // Сброс при смене слайда
    slider.value.on('slideChange', (index) => {
      console.log('🎬 Example: slideChange event received, index =', index)
      progress.value = 0
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
  margin-bottom: 10px;
  overflow: hidden;
  position: relative;
}

.tvist-v1__slide {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tvist-v1__slide video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slide-content {
  text-align: center;
  color: white;
}

.slide-number {
  font-size: 72px;
  font-weight: bold;
  margin-bottom: 10px;
}

.slide-text {
  font-size: 24px;
  opacity: 0.9;
}

.tvist-v1__slide { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin-bottom: 15px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: #667eea;
  border-radius: 2px;
  transition: width 0.1s linear;
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
  font-weight: 500;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

.info {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}

.info p {
  margin: 5px 0;
}
</style>
