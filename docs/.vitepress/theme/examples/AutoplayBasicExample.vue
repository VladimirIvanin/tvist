<template>
  <ExampleCard title="Базовый Autoplay" description="Автоматическая смена слайдов с паузой при наведении">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v1">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">1</div>
              <div class="slide-text">Первый слайд</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">2</div>
              <div class="slide-text">Второй слайд</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">3</div>
              <div class="slide-text">Третий слайд</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">4</div>
              <div class="slide-text">Четвёртый слайд</div>
            </div>
          </div>
        </div>
        <div class="tvist-v1__pagination"></div>
      </div>
      <div class="controls">
        <button @click="handleStart">▶ Start</button>
        <button @click="handleStop">⏹ Stop</button>
        <button @click="handlePause">⏸ Pause</button>
        <button @click="handleResume">▶▶ Resume</button>
      </div>
      <div class="info">
        <p>💡 Наведите курсор на слайдер — autoplay автоматически остановится</p>
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

const handleStart = () => {
  slider.value?.autoplay?.start()
}

const handleStop = () => {
  slider.value?.autoplay?.stop()
}

const handlePause = () => {
  slider.value?.autoplay?.pause()
}

const handleResume = () => {
  slider.value?.autoplay?.resume()
}

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      autoplay: { delay: 3000, pauseOnHover: true, pauseOnInteraction: true },
      pagination: {
        type: 'bullets',
        clickable: true
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
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.tvist-v1__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v1__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v1__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v1__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

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
