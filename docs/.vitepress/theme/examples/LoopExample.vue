<template>
  <ExampleCard
    title="Бесконечная прокрутка + пагинация"
    description="Проверка: после loop-перехода с края клик по кружку должен открыть именно этот слайд"
  >
    <div class="demo-wrapper">
      <div class="tvist-v1 loop-pagination-demo" ref="sliderEl">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide">1</div>
            <div class="tvist-v1__slide">2</div>
            <div class="tvist-v1__slide">3</div>
            <div class="tvist-v1__slide">4</div>
            <div class="tvist-v1__slide">5</div>
          </div>
        </div>
        <div class="tvist-v1__pagination"></div>
      </div>

      <div class="controls">
        <button type="button" @click="slider?.prev()">← Prev (loop)</button>
        <button type="button" @click="slider?.next()">Next → (loop)</button>
        <button type="button" class="btn-secondary" @click="goToFirst">На слайд 1</button>
        <button type="button" class="btn-secondary" @click="goToLast">На слайд 5</button>
      </div>

      <ol class="checklist">
        <li>Нажмите «На слайд 1», затем <strong>← Prev</strong> — должен открыться слайд 5.</li>
        <li>Кликните кружок <strong>3</strong> — активен кружок 3, на экране слайд 3 (не 2 или 4).</li>
        <li>Нажмите «На слайд 5», затем <strong>Next →</strong> — должен открыться слайд 1.</li>
        <li>Кликните кружок <strong>4</strong> — активен кружок 4, на экране слайд 4.</li>
      </ol>

      <div class="info" :class="{ 'info--ok': isSynced, 'info--bad': !isSynced }">
        <span>Слайд: <strong>{{ state.realIndex + 1 }}</strong> / 5</span>
        <span>Кружок пагинации: <strong>{{ state.activeBullet >= 0 ? state.activeBullet + 1 : '—' }}</strong></span>
        <span>activeIndex (DOM): <strong>{{ state.activeIndex }}</strong></span>
        <span v-if="isSynced" class="status">✓ совпадает</span>
        <span v-else class="status status--bad">✗ рассинхрон</span>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const SLIDE_COUNT = 5
const BULLET_ACTIVE_CLASS = 'tvist-v1__bullet--active'

const sliderEl = ref<HTMLElement | null>(null)
const slider = ref<Tvist | null>(null)
const state = reactive({
  activeIndex: 0,
  realIndex: 0,
  activeBullet: 0,
})

const isSynced = computed(() => state.activeBullet === state.realIndex)

function readActiveBullet(root: HTMLElement): number {
  const bullets = root.querySelectorAll('.tvist-v1__bullet')
  return Array.from(bullets).findIndex((b) => b.classList.contains(BULLET_ACTIVE_CLASS))
}

function syncState(): void {
  const instance = slider.value
  const root = sliderEl.value
  if (!instance || !root) return

  state.activeIndex = instance.activeIndex
  state.realIndex = instance.realIndex ?? 0
  state.activeBullet = readActiveBullet(root)
}

function goToFirst(): void {
  slider.value?.scrollTo(0, true)
  syncState()
}

function goToLast(): void {
  slider.value?.scrollTo(SLIDE_COUNT - 1, true)
  syncState()
}

onMounted(() => {
  if (!sliderEl.value) return

  slider.value = new Tvist(sliderEl.value, {
    perPage: 1,
    gap: 16,
    loop: true,
    drag: true,
    speed: 300,
    pagination: {
      clickable: true,
    },
    on: {
      created: () => syncState(),
      slideChangeEnd: () => syncState(),
      loopFix: () => syncState(),
      transitionEnd: () => syncState(),
    },
  })

  syncState()
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

.loop-pagination-demo {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.loop-pagination-demo :deep(.tvist-v1__pagination) {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0 4px;
}

.tvist-v1__slide {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
  user-select: none;
}

.tvist-v1__slide[data-tvist-slide-index='0'] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tvist-v1__slide[data-tvist-slide-index='1'] {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.tvist-v1__slide[data-tvist-slide-index='2'] {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.tvist-v1__slide[data-tvist-slide-index='3'] {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.tvist-v1__slide[data-tvist-slide-index='4'] {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 18px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button.btn-secondary {
  background: #e8eaf6;
  color: #4a5568;
}

button:hover:not(:disabled) {
  filter: brightness(0.95);
}

.checklist {
  margin: 0 0 14px;
  padding-left: 1.25rem;
  font-size: 13px;
  line-height: 1.55;
  color: #555;
}

.checklist strong {
  color: #667eea;
}

.info {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  justify-content: center;
  align-items: center;
  border: 2px solid transparent;
}

.info strong {
  color: #667eea;
}

.info--ok {
  border-color: #86efac;
  background: #f0fdf4;
}

.info--bad {
  border-color: #fca5a5;
  background: #fef2f2;
}

.status {
  font-weight: 600;
  color: #16a34a;
}

.status--bad {
  color: #dc2626;
}
</style>
