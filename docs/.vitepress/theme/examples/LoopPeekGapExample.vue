<template>
  <ExampleCard
    title="Loop + perPage: 3, peek 120, 4 слайда"
    description="Кейс с 4 слайдами, peek по 120px слева/справа и бесконечным loop без дыр справа"
  >
    <div class="demo-wrapper">
      <div class="tvist-v1" ref="sliderEl">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">1</div>
          <div class="tvist-v1__slide">2</div>
          <div class="tvist-v1__slide">3</div>
          <div class="tvist-v1__slide">4</div>
        </div>
      </div>

      <div class="controls">
        <button @click="handlePrev">← Prev</button>
        <button @click="handleNext">Next →</button>
      </div>

      <p class="hint">
        В примере используется <code>perPage: 3</code>, <code>gap: 32</code>, <code>peek: 120</code>, <code>loop: true</code>.  
        Даже при 4 слайдах не должно появляться пустого пространства справа.
      </p>

      <div class="debug">
        <div><strong>activeIndex:</strong> {{ debugState.activeIndex }}</div>
        <div><strong>realIndex:</strong> {{ debugState.realIndex }}</div>
        <div><strong>location:</strong> {{ debugState.location.toFixed(2) }}</div>
        <div><strong>containerSize:</strong> {{ debugState.containerSize }}</div>
        <div><strong>leftGap:</strong> {{ debugState.leftGap.toFixed(2) }}</div>
        <div><strong>rightGap:</strong> {{ debugState.rightGap.toFixed(2) }}</div>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const sliderEl = ref<HTMLElement | null>(null)
const slider = ref<Tvist | null>(null)

const debugState = reactive({
  activeIndex: 0,
  realIndex: 0,
  location: 0,
  containerSize: 0,
  leftGap: 0,
  rightGap: 0,
})

function updateDebugState(source: string) {
  const s = slider.value
  const root = sliderEl.value
  if (!s || !root) return

  const location = s.engine.location.get()
  const containerSize = s.engine.containerSizeValue

  const vpLeft = -location
  const vpRight = vpLeft + containerSize

  let contentLeft = Infinity
  let contentRight = -Infinity

  for (let i = 0; i < s.slides.length; i++) {
    const pos = s.engine.getSlidePosition(i)
    const size = s.engine.getSlideSize(i)
    if (pos < contentLeft) contentLeft = pos
    if (pos + size > contentRight) contentRight = pos + size
  }

  const leftGap = Math.max(0, contentLeft - vpLeft)
  const rightGap = Math.max(0, vpRight - contentRight)

  debugState.activeIndex = s.activeIndex
  debugState.realIndex = (s as any).realIndex ?? 0
  debugState.location = location
  debugState.containerSize = containerSize
  debugState.leftGap = leftGap
  debugState.rightGap = rightGap

  // Логируем в консоль для наглядной отладки
  // eslint-disable-next-line no-console
  console.table({
    source,
    activeIndex: debugState.activeIndex,
    realIndex: debugState.realIndex,
    location: debugState.location,
    containerSize: debugState.containerSize,
    leftGap: debugState.leftGap,
    rightGap: debugState.rightGap,
  })
}

function handlePrev() {
  slider.value?.prev()
  updateDebugState('prev()')
}

function handleNext() {
  slider.value?.next()
  updateDebugState('next()')
}

onMounted(() => {
  if (sliderEl.value) {
    slider.value = new Tvist(sliderEl.value, {
      perPage: 3,
      gap: 32,
      loop: true,
      drag: true,
      speed: 300,
      peek: 120
    })

    slider.value.on('created', () => updateDebugState('created'))
    slider.value.on('slideChangeEnd', () => updateDebugState('slideChangeEnd'))

    // Детальный лог дега: начало/конец, delta, позиция
    slider.value.on('dragStart', () => {
      updateDebugState('dragStart')
      // eslint-disable-next-line no-console
      console.log('[LoopPeekGapExample] dragStart', {
        activeIndex: slider.value?.activeIndex,
        realIndex: (slider.value as any)?.realIndex,
        location: slider.value?.engine.location.get(),
      })
    })

    slider.value.on('drag', () => {
      updateDebugState('drag')
    })

    slider.value.on('dragEnd', () => {
      updateDebugState('dragEnd')
      // eslint-disable-next-line no-console
      console.log('[LoopPeekGapExample] dragEnd', {
        activeIndex: slider.value?.activeIndex,
        realIndex: (slider.value as any)?.realIndex,
        location: slider.value?.engine.location.get(),
      })
    })

    // Лог перестройки слайдов в loopFix
    const loopModule = slider.value.getModule
      ? (slider.value.getModule('loop') as any | undefined)
      : undefined

    if (loopModule?.on) {
      loopModule.on('beforeLoopFix', () => {
        if (!slider.value) return
        const state = loopModule.getTransformState?.() ?? {}
        // eslint-disable-next-line no-console
        console.log('[LoopPeekGapExample] beforeLoopFix', {
          activeIndex: slider.value.activeIndex,
          realIndex: (slider.value as any).realIndex,
          location: slider.value.engine.location.get(),
          slidesOrder: state.slidesOrder ?? slider.value.slides.map(el =>
            el.getAttribute('data-tvist-slide-index') ?? '?',
          ),
        })
      })

      loopModule.on('loopFix', () => {
        if (!slider.value) return
        const state = loopModule.getTransformState?.() ?? {}
        // eslint-disable-next-line no-console
        console.log('[LoopPeekGapExample] loopFix', {
          activeIndex: slider.value.activeIndex,
          realIndex: (slider.value as any).realIndex,
          location: slider.value.engine.location.get(),
          slidesOrder: state.slidesOrder ?? slider.value.slides.map(el =>
            el.getAttribute('data-tvist-slide-index') ?? '?',
          ),
        })
      })
    }
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.tvist-v1__slide {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  color: white;
  user-select: none;
}

.tvist-v1__slide[data-tvist-slide-index="0"] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tvist-v1__slide[data-tvist-slide-index="1"] {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.tvist-v1__slide[data-tvist-slide-index="2"] {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.tvist-v1__slide[data-tvist-slide-index="3"] {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 18px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

.hint {
  margin-top: 12px;
  font-size: 13px;
  color: #555;
}

.hint code {
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
}
</style>

