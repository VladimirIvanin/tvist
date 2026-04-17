<template>
  <div class="center-justify-locked-example">
    <div class="demo-section">
      <h4>Locked: слайды выровнены по центру</h4>
      <p>2 слайда при perPage: 3 → lock активен, контент визуально по центру.</p>
      <div class="tvist-v1" ref="lockedSlider">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div v-for="i in 2" :key="`l-${i}`" class="tvist-v1__slide">
              <div class="slide-content">{{ i }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h4>Unlocked: обычное поведение</h4>
      <p>6 слайдов при perPage: 3 → lock снят, слайды ведут себя стандартно.</p>
      <div class="tvist-v1" ref="unlockedSlider">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div v-for="i in 6" :key="`u-${i}`" class="tvist-v1__slide">
              <div class="slide-content">{{ i }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="prev" :disabled="!canPrev">Prev</button>
        <button @click="next" :disabled="!canNext">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Tvist } from 'tvist'

const lockedSlider = ref<HTMLElement>()
const unlockedSlider = ref<HTMLElement>()

let lockedTvist: Tvist | null = null
let unlockedTvist: Tvist | null = null

const canPrev = ref(false)
const canNext = ref(false)

const updateState = () => {
  if (!unlockedTvist) return
  canPrev.value = unlockedTvist.canScrollPrev
  canNext.value = unlockedTvist.canScrollNext
}

const prev = () => unlockedTvist?.prev()
const next = () => unlockedTvist?.next()

onMounted(() => {
  if (lockedSlider.value) {
    lockedTvist = new Tvist(lockedSlider.value, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 350,
      loop: false,
      drag: true,
    })
  }

  if (unlockedSlider.value) {
    unlockedTvist = new Tvist(unlockedSlider.value, {
      perPage: 3,
      gap: 16,
      center: { justify: true },
      speed: 350,
      loop: false,
      drag: true,
    })
    updateState()
    unlockedTvist.on('slideChangeStart', updateState)
    unlockedTvist.on('slideChangeEnd', updateState)
  }
})

onBeforeUnmount(() => {
  lockedTvist?.destroy()
  unlockedTvist?.destroy()
})
</script>

<style scoped>
.center-justify-locked-example {
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
  justify-content: center;
  gap: 10px;
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
