<template>
  <ExampleCard title="Autoplay с Rewind" description="Автоматический возврат к первому слайду после последнего">
    <div class="demo-wrapper">
      <div ref="sliderEl" class="tvist-v1">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">1</div>
              <div class="slide-text">Первый</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">2</div>
              <div class="slide-text">Второй</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">3</div>
              <div class="slide-text">Третий</div>
            </div>
          </div>
          <div class="tvist-v1__slide">
            <div class="slide-content">
              <div class="slide-number">4</div>
              <div class="slide-text">Последний</div>
            </div>
          </div>
        </div>
        <div class="tvist-v1__pagination"></div>
        <button class="tvist-v1__arrow tvist-v1__arrow--prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button class="tvist-v1__arrow tvist-v1__arrow--next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      <div class="info">
        <p>🔄 После 4-го слайда автоматически возвращается к 1-му</p>
        <p>💡 Rewind работает и с ручной навигацией (кнопки)</p>
        <p>⚡ Без режима loop — более быстрый переход</p>
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

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 1,
      gap: 0,
      autoplay: 2000,
      rewind: true,
      loop: false,
      pauseOnHover: true,
      arrows: true,
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

.info {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-top: 20px;
}

.info p {
  margin: 5px 0;
}
</style>
