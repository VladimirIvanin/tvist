<template>
  <div class="drag-free-example">
    <h3>Режимы перетаскивания</h3>
    
    <div class="mode-selector">
      <button 
        v-for="mode in modes" 
        :key="mode.value"
        @click="changeMode(mode.value)"
        :class="{ active: currentMode === mode.value }"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="settings">
      <label v-if="currentMode === 'free' || currentMode === 'freeSnap'">
        <input type="checkbox" v-model="rubberband" @change="updateSettings" />
        Rubberband эффект
      </label>
      <label>
        Скорость: {{ dragSpeed }}x
        <input
          type="range"
          v-model.number="dragSpeed"
          min="0.5"
          max="3"
          step="0.1"
          @input="updateSettings"
        />
      </label>
    </div>

    <div class="current-mode-info">
      <strong>Текущий режим:</strong> {{ modeDescription }}
    </div>
    
    <div class="momentum-explanation">
      <div class="momentum-icon">💫</div>
      <div class="momentum-text">
        <strong>Что такое Momentum Scroll?</strong>
        <p>Сделайте быстрый свайп и отпустите — слайдер продолжит движение по инерции, плавно замедляясь. Чем быстрее свайп, тем дальше улетит!</p>
      </div>
    </div>

    <div ref="sliderRef" class="tvist-v1 drag-free-slider">
      <div class="tvist-v1__track">
        <div class="tvist-v1__container">
          <div v-for="i in 10" :key="i" class="tvist-v1__slide">
            <div class="slide-card">
              <div class="slide-number">{{ i }}</div>
              <div class="slide-title">Слайд {{ i }}</div>
              <div class="slide-description">
                {{ currentMode === 'free' ? 'Свободная прокрутка' : 
                  currentMode === 'freeSnap' ? 'Free + Snap' : 
                  'Обычный режим' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tvist-v1__pagination"></div>
    </div>

    <div class="drag-hint">
      💡 Попробуйте перетащить слайды мышью или пальцем
    </div>

    <h3 style="margin-top: 40px;">Free + autoWidth (без snap)</h3>
    <p class="section-note">
      Ширина слайдов задаётся в CSS — удобно для карточек разного размера. Свободная прокрутка без
      выравнивания к слайду после отпускания.
    </p>
    <div ref="autoWidthFreeRef" class="tvist-v1 drag-free-autowidth-slider">
      <div class="tvist-v1__track">
        <div class="tvist-v1__container">
          <div
            v-for="(item, i) in autoWidthSlides"
            :key="i"
            class="tvist-v1__slide"
            :style="{ width: item.width }"
          >
            <div class="autowidth-card">
              <span class="autowidth-label">{{ item.label }}</span>
              <span class="autowidth-size">{{ item.width }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin-top: 32px;">Free + Snap + autoWidth</h3>
    <p class="section-note">
      Те же слайды переменной ширины: после инерции позиция «прилипает» к ближайшему слайду.
    </p>
    <div ref="autoWidthSnapRef" class="tvist-v1 drag-free-autowidth-slider drag-free-autowidth-slider--snap">
      <div class="tvist-v1__track">
        <div class="tvist-v1__container">
          <div
            v-for="(item, i) in autoWidthSlides"
            :key="'snap-' + i"
            class="tvist-v1__slide"
            :style="{ width: item.width }"
          >
            <div class="autowidth-card autowidth-card--alt">
              <span class="autowidth-label">{{ item.label }}</span>
              <span class="autowidth-size">{{ item.width }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin-top: 40px;">Free mode + пагинация</h3>
    <p class="section-note">
      Клик по точке перелистывает на соответствующую «страницу» (здесь по одному слайду на экран).
    </p>
    <div ref="paginationSliderRef" class="tvist-v1 drag-free-pagination-slider">
      <div class="tvist-v1__track">
        <div class="tvist-v1__container">
          <div v-for="i in 6" :key="'p-' + i" class="tvist-v1__slide">
            <div class="pagination-slide-card">
              <span class="pagination-slide-num">{{ i }}</span>
              <span class="pagination-slide-text">Слайд {{ i }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="tvist-v1__pagination"></div>
    </div>

    <!-- Пример с peek -->
    <h3 style="margin-top: 40px;">Free mode с Peek</h3>
    <div ref="peekSliderRef" class="tvist-v1 drag-free-peek-slider">
      <div class="tvist-v1__track">
        <div class="tvist-v1__container">
          <div v-for="i in 8" :key="i" class="tvist-v1__slide">
            <div class="peek-card">
              <div class="peek-icon">🎨</div>
              <div class="peek-title">Карточка {{ i }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Tvist } from 'tvist'

const sliderRef = ref<HTMLElement>()
const peekSliderRef = ref<HTMLElement>()
const autoWidthFreeRef = ref<HTMLElement>()
const autoWidthSnapRef = ref<HTMLElement>()
const paginationSliderRef = ref<HTMLElement>()

let sliderInstance: Tvist | null = null
let peekSliderInstance: Tvist | null = null
let autoWidthFreeInstance: Tvist | null = null
let autoWidthSnapInstance: Tvist | null = null
let paginationSliderInstance: Tvist | null = null

const autoWidthSlides = [
  { label: 'Узкий', width: '160px' },
  { label: 'Средний', width: '240px' },
  { label: 'Широкий', width: '320px' },
  { label: 'Средний', width: '220px' },
  { label: 'Узкий', width: '180px' },
  { label: 'Широкий', width: '300px' }
] as const

const currentMode = ref<'normal' | 'free' | 'freeSnap'>('free')
const rubberband = ref(true)
const dragSpeed = ref(1)

const modes = [
  { value: 'normal', label: 'Normal' },
  { value: 'free', label: 'Free' },
  { value: 'freeSnap', label: 'Free + Snap' }
]

const modeDescription = computed(() => {
  switch (currentMode.value) {
    case 'normal':
      return 'Переключение слайдов с автоматическим snap'
    case 'free':
      return 'Свободная прокрутка с momentum scroll'
    case 'freeSnap':
      return 'Свободная прокрутка с выравниванием после остановки'
    default:
      return ''
  }
})

onMounted(() => {
  if (sliderRef.value) {
    initSlider()
  }

  if (peekSliderRef.value) {
    peekSliderInstance = new Tvist(peekSliderRef.value, {
      drag: 'free',
      freeSnap: true,
      perPage: 3,
      gap: 15,
      peek: { left: 20, right: 20 }
    })
  }

  if (autoWidthFreeRef.value) {
    autoWidthFreeInstance = new Tvist(autoWidthFreeRef.value, {
      drag: 'free',
      freeSnap: false,
      autoWidth: true,
      perPage: 1,
      gap: 16,
      rubberband: true
    })
  }

  if (autoWidthSnapRef.value) {
    autoWidthSnapInstance = new Tvist(autoWidthSnapRef.value, {
      drag: 'free',
      freeSnap: true,
      autoWidth: true,
      perPage: 1,
      gap: 16,
      rubberband: true
    })
  }

  if (paginationSliderRef.value) {
    paginationSliderInstance = new Tvist(paginationSliderRef.value, {
      drag: 'free',
      freeSnap: true,
      perPage: 1,
      gap: 0,
      speed: 400,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
})

onBeforeUnmount(() => {
  sliderInstance?.destroy()
  peekSliderInstance?.destroy()
  autoWidthFreeInstance?.destroy()
  autoWidthSnapInstance?.destroy()
  paginationSliderInstance?.destroy()
})

function initSlider() {
  if (!sliderRef.value) return

  sliderInstance?.destroy()

  const drag = currentMode.value === 'normal' ? true : 'free'
  const freeSnap = currentMode.value === 'freeSnap'

  sliderInstance = new Tvist(sliderRef.value, {
    drag,
    freeSnap,
    rubberband: rubberband.value,
    dragSpeed: dragSpeed.value,
    perPage: 3,
    gap: 20,
    debug: true, // Включаем отладку
    pagination: {
      type: 'bullets',
      clickable: true
    }
  })
}

function changeMode(mode: 'normal' | 'free' | 'freeSnap') {
  currentMode.value = mode
  initSlider()
}

function updateSettings() {
  initSlider()
}
</script>

<style scoped>
.drag-free-example {
  padding: 20px 0;
}

.drag-free-example h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
}

/* Mode selector */
.mode-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.mode-selector button {
  padding: 10px 20px;
  background: #f0f0f0;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s;
}

.mode-selector button:hover {
  background: #e0e0e0;
}

.mode-selector button.active {
  background: #667eea;
  color: white;
  border-color: #5568d3;
}

/* Settings */
.settings {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.settings label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
}

.settings input[type="checkbox"] {
  cursor: pointer;
}

.settings input[type="range"] {
  width: 120px;
}

/* Current mode info */
.current-mode-info {
  padding: 12px 16px;
  background: #f8f9fa;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #555;
}

/* Slider */
.drag-free-slider {
  background: #fff;
  border-radius: 12px;
  padding: 20px 0;
  overflow: hidden;
  margin-bottom: 15px;
}

.slide-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 250px;
  user-select: none;
}

.slide-number {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 10px;
  opacity: 0.9;
}

.slide-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.slide-description {
  font-size: 14px;
  opacity: 0.85;
}

/* Drag hint */
.drag-hint {
  text-align: center;
  font-size: 14px;
  color: #888;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

/* Momentum explanation */
.momentum-explanation {
  display: flex;
  gap: 15px;
  align-items: flex-start;
  padding: 20px;
  margin-top: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-radius: 12px;
  border: 2px solid #90caf9;
}

.momentum-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.momentum-text {
  flex: 1;
}

.momentum-text strong {
  display: block;
  margin-bottom: 8px;
  color: #1976d2;
  font-size: 16px;
}

.momentum-text p {
  margin: 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.section-note {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: #666;
}

/* AutoWidth + free */
.drag-free-autowidth-slider {
  background: #fff;
  border-radius: 12px;
  padding: 20px 0;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
}

.drag-free-autowidth-slider :deep(.tvist-v1__slide) {
  flex-shrink: 0;
  box-sizing: border-box;
}

.autowidth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  user-select: none;
}

.autowidth-card--alt {
  background: linear-gradient(135deg, #4568dc 0%, #b06ab3 100%);
}

.autowidth-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.autowidth-size {
  font-size: 12px;
  opacity: 0.9;
}

/* Pagination demo */
.drag-free-pagination-slider {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
}

.drag-free-pagination-slider :deep(.tvist-v1__pagination) {
  padding: 14px 0 18px;
  justify-content: center;
}

.pagination-slide-card {
  height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  user-select: none;
}

.pagination-slide-num {
  font-size: 56px;
  font-weight: 700;
  opacity: 0.95;
}

.pagination-slide-text {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.9;
}

.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='0']),
.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='3']) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='1']),
.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='4']) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='2']),
.drag-free-pagination-slider
  :deep(.tvist-v1__slide[data-tvist-slide-index='5']) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* Peek slider */
.drag-free-peek-slider {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  padding: 30px 0;
  overflow: hidden;
}

.peek-card {
  background: white;
  border-radius: 10px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  user-select: none;
}

.peek-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.peek-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* Адаптивность */
@media (max-width: 768px) {
  .settings {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings input[type="range"] {
    width: 100%;
  }

  .drag-free-slider :deep(.tvist-v1__slide) {
    min-width: 80%;
  }
}
</style>
