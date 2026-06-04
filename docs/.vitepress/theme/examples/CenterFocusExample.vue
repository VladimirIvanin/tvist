<template>
  <div class="center-focus-example">
    <div class="demo-section">
      <h4>Край: первый слайд прижат к началу</h4>
      <p>На краях нет пустот — центрирование только когда есть место.</p>
      <div class="tvist-v1" ref="edgeSlider">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div v-for="i in 6" :key="`e-${i}`" class="tvist-v1__slide">
              <div class="slide-content">{{ i }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="controls">
        <button @click="edgePrev" :disabled="!edgeCanPrev">Prev</button>
        <button @click="edgeNext" :disabled="!edgeCanNext">Next</button>
        <span class="info">Слайд {{ edgeIndex + 1 }} / 6</span>
      </div>
    </div>

    <div class="demo-section">
      <h4>Середина: активный по центру</h4>
      <p>Листайте к слайдам 3–4 — активный визуально по центру viewport.</p>
      <div class="tvist-v1" ref="midSlider">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div v-for="i in 6" :key="`m-${i}`" class="tvist-v1__slide">
              <div class="slide-content">{{ i }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="controls">
        <button @click="midGo(2)">К слайду 3</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Tvist } from 'tvist'

const edgeSlider = ref<HTMLElement>()
const midSlider = ref<HTMLElement>()

let edgeTvist: Tvist | null = null
let midTvist: Tvist | null = null

const edgeIndex = ref(0)
const edgeCanPrev = ref(false)
const edgeCanNext = ref(false)

const focusOptions = {
  perPage: 3,
  gap: 16,
  center: { focus: true },
  speed: 350,
  loop: false,
  drag: true,
} as const

const updateEdge = () => {
  if (!edgeTvist) return
  edgeIndex.value = edgeTvist.activeIndex
  edgeCanPrev.value = edgeTvist.canScrollPrev
  edgeCanNext.value = edgeTvist.canScrollNext
}

const edgePrev = () => edgeTvist?.prev()
const edgeNext = () => edgeTvist?.next()
const midGo = (index: number) => midTvist?.scrollTo(index)

onMounted(() => {
  if (edgeSlider.value) {
    edgeTvist = new Tvist(edgeSlider.value, { ...focusOptions, start: 0 })
    updateEdge()
    edgeTvist.on('slideChangeStart', updateEdge)
    edgeTvist.on('slideChangeEnd', updateEdge)
  }

  if (midSlider.value) {
    midTvist = new Tvist(midSlider.value, { ...focusOptions, start: 2 })
  }
})

onBeforeUnmount(() => {
  edgeTvist?.destroy()
  midTvist?.destroy()
})
</script>

<style scoped>
.center-focus-example {
  display: grid;
  gap: 20px;
}

.demo-section h4 {
  margin: 0 0 6px;
}

.demo-section p {
  margin: 0 0 12px;
  color: #666;
  font-size: 14px;
}

.tvist-v1 {
  background: #f6f7fb;
  border-radius: 10px;
  padding: 20px 0;
}

.slide-content {
  margin: 0 6px;
  border-radius: 8px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tvist-v1__slide[data-tvist-slide-index="1"] .slide-content,
.tvist-v1__slide[data-tvist-slide-index="4"] .slide-content {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.tvist-v1__slide[data-tvist-slide-index="2"] .slide-content,
.tvist-v1__slide[data-tvist-slide-index="5"] .slide-content {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.controls {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.info {
  font-size: 14px;
  color: #555;
}

button {
  border: 0;
  border-radius: 6px;
  background: #667eea;
  color: #fff;
  padding: 8px 18px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
