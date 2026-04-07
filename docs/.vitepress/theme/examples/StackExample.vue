<template>
  <ExampleCard title="Stack Effect — вертикальный" description="Новый слайд выезжает поверх предыдущего (direction: 'vertical')">
    <div class="demo-wrapper demo-wrapper--vertical-stack">
      <div ref="sliderEl" class="tvist-v1 tvist-v1--vertical-stack">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide">1</div>
            <div class="tvist-v1__slide">2</div>
            <div class="tvist-v1__slide">3</div>
            <div class="tvist-v1__slide">4</div>
            <div class="tvist-v1__slide">5</div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="slider?.prev()">↑ Назад</button>
        <button @click="slider?.next()">Вперёд ↓</button>
      </div>

      <div class="options">
        <div class="option option--mode">
          <button
            :class="['mode-btn', { active: mode === 'cover' }]"
            @click="mode = 'cover'; rebuild()"
          >cover</button>
          <button
            :class="['mode-btn', { active: mode === 'uncover' }]"
            @click="mode = 'uncover'; rebuild()"
          >uncover</button>
        </div>
        <label class="option">
          <input type="checkbox" v-model="rotate" @change="rebuild" />
          rotate
        </label>
        <label class="option">
          <input type="checkbox" v-model="slideShadows" @change="rebuild" />
          slideShadows
        </label>
        <label class="option">
          perSlideOffset
          <input type="range" min="0" max="20" step="1" v-model.number="perSlideOffset" @input="rebuild" />
          {{ perSlideOffset }}px
        </label>
        <label class="option">
          perSlideScale
          <input type="range" min="0" max="0.2" step="0.01" v-model.number="perSlideScale" @input="rebuild" />
          {{ perSlideScale }}
        </label>
        <label class="option">
          perSlideDepth
          <input type="range" min="0" max="150" step="10" v-model.number="perSlideDepth" @input="rebuild" />
          {{ perSlideDepth }}px
        </label>
      </div>
    </div>
  </ExampleCard>

  <ExampleCard
    title="Stack Effect — горизонтальная колода"
    description="direction: 'horizontal', stackLayout: 'pile', cover + веер (rotate, offset, depth) — карты в одном слоте по горизонтали"
  >
    <div class="demo-wrapper demo-wrapper--horizontal-pile">
      <div ref="sliderVEl" class="tvist-v1 tvist-v1--horizontal-pile">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div
              v-for="(item, i) in pileItems"
              :key="i"
              class="tvist-v1__slide pile-slide"
              :style="{ '--pile-hue': item.hue }"
            >
              <span class="pile-slide__num">{{ i + 1 }}</span>
              <span class="pile-slide__label">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="sliderV?.prev()">← Назад</button>
        <button @click="sliderV?.next()">Вперёд →</button>
      </div>

      <p class="stack-pile-hint">
        Колода в режиме <code>stackLayout: 'pile'</code> с теми же декоративными опциями, что и «эффект колоды» в документации:
        <code>peek</code> слева и справа оставляет место под веер и тени.
      </p>
    </div>
  </ExampleCard>

  <ExampleCard title="Stack Effect + Scrollbar" description="С полосой прокрутки">
    <div class="demo-wrapper">
      <div ref="sliderSEl" class="tvist-v1 tvist-v1--horizontal-stack" style="position: relative;">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide">1</div>
            <div class="tvist-v1__slide">2</div>
            <div class="tvist-v1__slide">3</div>
            <div class="tvist-v1__slide">4</div>
            <div class="tvist-v1__slide">5</div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button @click="sliderS?.prev()">← Назад</button>
        <button @click="sliderS?.next()">Вперёд →</button>
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
const sliderVEl = ref(null)
const sliderV = ref(null)
const sliderSEl = ref(null)
const sliderS = ref(null)

const mode = ref('uncover')
const rotate = ref(false)
const slideShadows = ref(false)
const perSlideOffset = ref(0)
const perSlideScale = ref(0)
const perSlideDepth = ref(0)

const pileItems = [
  { label: 'Слева', hue: 210 },
  { label: 'Второй', hue: 175 },
  { label: 'Третий', hue: 265 },
  { label: 'Четвёртый', hue: 32 },
  { label: 'Справа', hue: 340 },
]

function build() {
  if (!sliderEl.value) return
  slider.value = new Tvist(sliderEl.value, {
    effect: 'stack',
    direction: 'vertical',
    stackEffect: {
      mode: mode.value,
      rotate: rotate.value,
      slideShadows: slideShadows.value,
      perSlideOffset: perSlideOffset.value,
      perSlideScale: perSlideScale.value,
      perSlideDepth: perSlideDepth.value,
    },
    speed: 400,
    loop: true,
  })
}

function buildHorizontalPile() {
  if (!sliderVEl.value) return
  sliderV.value?.destroy()
  sliderV.value = new Tvist(sliderVEl.value, {
    direction: 'horizontal',
    effect: 'stack',
    peek: { top: 20 },
    stackEffect: {
      mode: 'cover',
      stackLayout: 'pile',
      slideShadows: true,
      rotate: false,
      perSlideOffset: -20,
      perSlideScale: 0.1,
      perSlideDepth: 50,
      zIndexProgressScale: 2,
      viewportPadding: 40,
    },
    speed: 400,
    loop: true,
  })
}

function buildScrollbar() {
  if (!sliderSEl.value) return
  sliderS.value = new Tvist(sliderSEl.value, {
    effect: 'stack',
    speed: 400,
    loop: true,
    scrollbar: {
      draggable: true,
    },
  })
}

function rebuild() {
  slider.value?.destroy()
  build()
}

onMounted(() => {
  build()
  buildHorizontalPile()
  buildScrollbar()
})

onUnmounted(() => {
  slider.value?.destroy()
  sliderV.value?.destroy()
  sliderS.value?.destroy()
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
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.tvist-v1--horizontal-stack {
  height: 360px;
}

.demo-wrapper--vertical-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tvist-v1--vertical-stack {
  width: 100%;
  max-width: 320px;
  height: 420px;
  margin-left: auto;
  margin-right: auto;
  background: #e2e8f0;
}

.tvist-v1--vertical-stack :deep(.tvist-v1__track),
.tvist-v1--vertical-stack :deep(.tvist-v1__container) {
  height: 100%;
}

.tvist-v1--vertical-stack :deep(.tvist-v1__slide) {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  font-weight: 800;
  color: white;
  border-radius: 16px;
}

.tvist-v1--vertical-stack :deep(.tvist-v1__slide[data-tvist-slide-index="0"]) { background: linear-gradient(135deg, #667eea, #764ba2); }
.tvist-v1--vertical-stack :deep(.tvist-v1__slide[data-tvist-slide-index="1"]) { background: linear-gradient(135deg, #f093fb, #f5576c); }
.tvist-v1--vertical-stack :deep(.tvist-v1__slide[data-tvist-slide-index="2"]) { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.tvist-v1--vertical-stack :deep(.tvist-v1__slide[data-tvist-slide-index="3"]) { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.tvist-v1--vertical-stack :deep(.tvist-v1__slide[data-tvist-slide-index="4"]) { background: linear-gradient(135deg, #fa709a, #fee140); }

.demo-wrapper--horizontal-pile {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tvist-v1--horizontal-pile {
  width: 100%;
  max-width: 560px;
  height: 360px;
  margin-left: auto;
  margin-right: auto;
  background: #e2e8f0;
  overflow: visible !important;
}

/* Глубина колоды: translateZ на слайдах читается мягче с перспективой трека */
.tvist-v1--horizontal-pile :deep(.tvist-v1__track) {
  perspective: 880px;
}

.tvist-v1--horizontal-pile :deep(.tvist-v1__track),
.tvist-v1--horizontal-pile :deep(.tvist-v1__container) {
  height: 100%;
}

.tvist-v1--horizontal-pile :deep(.tvist-v1__slide) {
  height: 100%;
  padding: 10px 12px 12px;
  box-sizing: border-box;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
  border-radius: 12px;
}

.pile-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  background: linear-gradient(
    145deg,
    hsl(var(--pile-hue, 210), 62%, 52%) 0%,
    hsl(var(--pile-hue, 210), 55%, 38%) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.pile-slide__num {
  font-size: 52px;
  line-height: 1;
}

.pile-slide__label {
  font-size: 14px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  opacity: 0.9;
}

.stack-pile-hint {
  max-width: 420px;
  margin: 0 auto;
  padding: 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #666;
  text-align: center;
}

.stack-pile-hint code {
  font-size: 11px;
  background: #eee;
  padding: 2px 5px;
  border-radius: 4px;
}

.tvist-v1--horizontal-stack :deep(.tvist-v1__track),
.tvist-v1--horizontal-stack :deep(.tvist-v1__container) {
  height: 100%;
}

.tvist-v1--horizontal-stack :deep(.tvist-v1__slide) {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  font-weight: 800;
  color: white;
  border-radius: 16px;
}

.tvist-v1--horizontal-stack :deep(.tvist-v1__slide[data-tvist-slide-index="0"]) { background: linear-gradient(135deg, #667eea, #764ba2); }
.tvist-v1--horizontal-stack :deep(.tvist-v1__slide[data-tvist-slide-index="1"]) { background: linear-gradient(135deg, #f093fb, #f5576c); }
.tvist-v1--horizontal-stack :deep(.tvist-v1__slide[data-tvist-slide-index="2"]) { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.tvist-v1--horizontal-stack :deep(.tvist-v1__slide[data-tvist-slide-index="3"]) { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.tvist-v1--horizontal-stack :deep(.tvist-v1__slide[data-tvist-slide-index="4"]) { background: linear-gradient(135deg, #fa709a, #fee140); }

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 24px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #5568d3;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  font-size: 13px;
  color: #555;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.option--mode {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #667eea;
}

.mode-btn {
  background: transparent;
  color: #667eea;
  border: none;
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.mode-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.mode-btn.active {
  background: #667eea;
  color: white;
}

input[type="range"] {
  width: 80px;
}
</style>
