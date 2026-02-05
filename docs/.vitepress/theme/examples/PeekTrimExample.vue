<template>
  <div class="example peek-trim">
    <div class="section">
      <div class="section-title">Без loop</div>
      <div class="row">
        <div class="col">
          <div class="label">peekTrim: true — конец прижат к краю</div>
          <div ref="sliderTrimRef" class="tvist">
            <div class="tvist__container">
              <div v-for="i in 5" :key="i" class="tvist__slide">
                <div class="slide-content">{{ i }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="label">peekTrim: false — справа остаётся зазор</div>
          <div ref="sliderNoTrimRef" class="tvist">
            <div class="tvist__container">
              <div v-for="i in 5" :key="i" class="tvist__slide">
                <div class="slide-content">{{ i }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">С loop — peek тоже применяется (виден зазор соседних слайдов)</div>
      <div class="row">
        <div class="col">
          <div class="label">loop: true, peek: 40</div>
          <div ref="sliderLoopRef" class="tvist">
            <div class="tvist__container">
              <div v-for="i in 5" :key="i" class="tvist__slide">
                <div class="slide-content">{{ i }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="label">loop: true, peek: 60, perPage: 2</div>
          <div ref="sliderLoopPerPageRef" class="tvist">
            <div class="tvist__container">
              <div v-for="i in 6" :key="i" class="tvist__slide">
                <div class="slide-content">{{ i }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from '../../../../src/index.ts'
import '../../../../src/styles/tvist.scss'

const sliderTrimRef = ref<HTMLElement>()
const sliderNoTrimRef = ref<HTMLElement>()
const sliderLoopRef = ref<HTMLElement>()
const sliderLoopPerPageRef = ref<HTMLElement>()
let sliderTrim: Tvist | null = null
let sliderNoTrim: Tvist | null = null
let sliderLoop: Tvist | null = null
let sliderLoopPerPage: Tvist | null = null

const commonOptions = {
  peek: 40,
  perPage: 1,
  gap: 16,
  arrows: true,
  pagination: true
}

onMounted(() => {
  if (sliderTrimRef.value) {
    sliderTrim = new Tvist(sliderTrimRef.value, {
      ...commonOptions,
      peekTrim: true
    })
  }
  if (sliderNoTrimRef.value) {
    sliderNoTrim = new Tvist(sliderNoTrimRef.value, {
      ...commonOptions,
      peekTrim: false
    })
  }
  if (sliderLoopRef.value) {
    sliderLoop = new Tvist(sliderLoopRef.value, {
      ...commonOptions,
      loop: true
    })
  }
  if (sliderLoopPerPageRef.value) {
    sliderLoopPerPage = new Tvist(sliderLoopPerPageRef.value, {
      peek: 60,
      perPage: 2,
      gap: 16,
      loop: true,
      arrows: true,
      pagination: true
    })
  }
})

onBeforeUnmount(() => {
  sliderTrim?.destroy()
  sliderNoTrim?.destroy()
  sliderLoop?.destroy()
  sliderLoopPerPage?.destroy()
})
</script>

<style scoped>
.example {
  width: 100%;
}

.section {
  margin-bottom: 32px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}

.col {
  min-width: 0;
}

.label {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.tvist {
  width: 100%;
  height: 260px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.tvist__container {
  height: 100%;
}

.tvist__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content {
  width: 100%;
  height: 85%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 42px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
