<template>
  <ExampleCard title="3D Куб" description="3D трансформация в виде куба">
    <div class="demo-wrapper">
      <div class="cube-wrapper">
        <div ref="sliderEl" class="tvist">
          <div class="tvist__container">
            <div class="tvist__slide">Slide 1</div>
            <div class="tvist__slide">Slide 2</div>
            <div class="tvist__slide">Slide 3</div>
            <div class="tvist__slide">Slide 4</div>
          </div>
        </div>
      </div>
      
      <div class="controls">
        <button @click="slider?.prev()">← Previous</button>
        <button @click="slider?.next()">Next →</button>
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
      effect: 'cube',
      cubeEffect: {
        slideShadows: true,
        shadow: true,
        shadowOffset: 20,
        shadowScale: 0.94
      },
      speed: 600,
      loop: true
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

.cube-wrapper {
  perspective: 1000px;
  width: 300px;
  height: 300px;
  margin: 0 auto 20px;
}

.tvist {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

.tvist__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: white;
}

.tvist :deep(.tvist__slide[data-tvist-slide-index="0"]) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist :deep(.tvist__slide[data-tvist-slide-index="1"]) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist :deep(.tvist__slide[data-tvist-slide-index="2"]) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist :deep(.tvist__slide[data-tvist-slide-index="3"]) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 15px;
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
</style>
