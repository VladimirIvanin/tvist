<template>
  <div class="scroll-control-doc">
    <div v-if="show !== 'vertical'" ref="horizontalRef" class="tvist tvist--horizontal" style="margin-bottom: 2rem; height: 300px;">
      <div class="tvist-v0__container">
        <div class="tvist-v0__slide slide-1">
          <span class="slide-title">Слайд 1</span>
          <span class="slide-hint">Используйте колесико мыши или свайп</span>
        </div>
        <div class="tvist-v0__slide slide-2"><span class="slide-title">Слайд 2</span></div>
        <div class="tvist-v0__slide slide-3"><span class="slide-title">Слайд 3</span></div>
        <div class="tvist-v0__slide slide-4"><span class="slide-title">Слайд 4</span></div>
        <div class="tvist-v0__slide slide-5"><span class="slide-title">Слайд 5</span></div>
      </div>
    </div>

    <div v-if="show !== 'horizontal'" ref="verticalRef" class="tvist tvist--vertical" style="height: 400px; margin-bottom: 2rem;">
      <div class="tvist-v0__container">
        <div class="tvist-v0__slide slide-1">
          <span class="slide-title">Слайд 1</span>
          <span class="slide-hint">Скроллите вертикально</span>
        </div>
        <div class="tvist-v0__slide slide-2"><span class="slide-title">Слайд 2</span></div>
        <div class="tvist-v0__slide slide-3"><span class="slide-title">Слайд 3</span></div>
        <div class="tvist-v0__slide slide-4"><span class="slide-title">Слайд 4</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Tvist from 'tvist'

const props = defineProps({
  show: { type: String, default: 'both' } // 'horizontal' | 'vertical' | 'both'
})

const horizontalRef = ref(null)
const verticalRef = ref(null)
let horizontalSlider = null
let verticalSlider = null

onMounted(() => {
  if (horizontalRef.value && props.show !== 'vertical') {
    horizontalSlider = new Tvist(horizontalRef.value, {
      wheel: true,
      speed: 300,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
  if (verticalRef.value && props.show !== 'horizontal') {
    verticalSlider = new Tvist(verticalRef.value, {
      direction: 'vertical',
      wheel: true,
      speed: 300,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
})

onUnmounted(() => {
  horizontalSlider?.destroy()
  verticalSlider?.destroy()
})
</script>

<style scoped>
.scroll-control-doc {
  margin: 0;
}

.tvist-v0__slide {
  height: 300px;
  min-height: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
  position: relative;
}

.tvist-v0--vertical .tvist-v0__slide {
  height: 400px;
  min-height: 400px;
}

.slide-title {
  display: block;
}

.slide-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: normal;
  opacity: 0.9;
}

.tvist--vertical .slide-hint {
  left: 20px;
  transform: none;
}

.slide-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.slide-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.slide-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.slide-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.slide-5 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
</style>
