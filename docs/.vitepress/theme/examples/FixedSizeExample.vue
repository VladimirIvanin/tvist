<template>
  <ExampleCard
    title="Фиксированный размер слайда"
    description="Опции fixedWidth и fixedHeight: фиксированные размеры в px или CSS; при пересчёте layout число слайдов на экране (perPage) подбирается автоматически"
    :detailsLink="detailsLink"
  >
    <div class="demo-wrapper">
      <div class="demo-section">
        <h3>Горизонтально: fixedWidth</h3>
        <p class="hint">
          Ширина каждого слайда 180px, зазор 12px. Поле «на экране» показывает актуальное
          <code>perPage</code> после расчёта (меняется при изменении ширины окна).
        </p>
        <div ref="hEl" class="tvist-v1 tvist-v1--bounded">
          <div class="tvist-v1__track">
            <div class="tvist-v1__container">
              <div v-for="i in 10" :key="i" class="tvist-v1__slide">
                <span>{{ i }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button type="button" @click="hSlider?.prev()" :disabled="!hSlider?.canScrollPrev">
            ← Назад
          </button>
          <span class="meta">
            Слайд {{ (hSlider?.activeIndex ?? 0) + 1 }} / 10 · на экране:
            <strong>{{ hPerPage }}</strong>
          </span>
          <button type="button" @click="hSlider?.next()" :disabled="!hSlider?.canScrollNext">
            Вперёд →
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h3>Вертикально: fixedHeight</h3>
        <p class="hint">
          Высота области 360px, высота слайда 100px — слайдер сам выставляет
          <code>perPage</code> по вертикали.
        </p>
        <div ref="vEl" class="tvist-v1 tvist-v1--vertical">
          <div class="tvist-v1__track">
            <div class="tvist-v1__container">
              <div v-for="i in 8" :key="i" class="tvist-v1__slide">
                <span>{{ i }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button type="button" @click="vSlider?.prev()" :disabled="!vSlider?.canScrollPrev">
            ↑ Назад
          </button>
          <span class="meta">
            Слайд {{ (vSlider?.activeIndex ?? 0) + 1 }} / 8 · на экране:
            <strong>{{ vPerPage }}</strong>
          </span>
          <button type="button" @click="vSlider?.next()" :disabled="!vSlider?.canScrollNext">
            Вперёд ↓
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h3>Горизонтально: только fixedHeight</h3>
        <p class="hint">
          Ширина по <code>perPage: 2</code>, высота слайдов фиксирована строкой
          <code>'8rem'</code>.
        </p>
        <div ref="hHeightEl" class="tvist-v1">
          <div class="tvist-v1__track">
            <div class="tvist-v1__container">
              <div v-for="i in 6" :key="i" class="tvist-v1__slide tvist-v1__slide--tall-label">
                <span>{{ i }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="controls">
          <button type="button" @click="hhSlider?.prev()" :disabled="!hhSlider?.canScrollPrev">
            ← Назад
          </button>
          <button type="button" @click="hhSlider?.next()" :disabled="!hhSlider?.canScrollNext">
            Вперёд →
          </button>
        </div>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

defineProps({
  detailsLink: { type: String, default: '' },
})

const hEl = ref(null)
const vEl = ref(null)
const hHeightEl = ref(null)
const hSlider = ref(null)
const vSlider = ref(null)
const hhSlider = ref(null)

const hPerPage = ref(1)
const vPerPage = ref(1)

const syncPerPage = (instance, targetRef) => {
  targetRef.value = instance.options.perPage ?? 1
}

onMounted(() => {
  if (hEl.value) {
    hSlider.value = new Tvist(hEl.value, {
      fixedWidth: 180,
      gap: 12,
      speed: 300,
      drag: true,
      arrows: false,
      on: {
        created: (inst) => syncPerPage(inst, hPerPage),
        refresh: (inst) => syncPerPage(inst, hPerPage),
      },
    })
  }

  if (vEl.value) {
    vSlider.value = new Tvist(vEl.value, {
      direction: 'vertical',
      fixedHeight: 100,
      gap: 8,
      speed: 300,
      drag: true,
      arrows: false,
      on: {
        created: (inst) => syncPerPage(inst, vPerPage),
        refresh: (inst) => syncPerPage(inst, vPerPage),
      },
    })
  }

  if (hHeightEl.value) {
    hhSlider.value = new Tvist(hHeightEl.value, {
      perPage: 2,
      gap: 16,
      fixedHeight: '8rem',
      speed: 300,
      drag: true,
      arrows: false,
    })
  }
})

onBeforeUnmount(() => {
  hSlider.value?.destroy()
  vSlider.value?.destroy()
  hhSlider.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.demo-section {
  margin-bottom: 40px;
}

.demo-section:last-child {
  margin-bottom: 0;
}

.demo-section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.hint {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}

.hint code {
  font-size: 13px;
  padding: 1px 6px;
  background: #e8e8ef;
  border-radius: 4px;
}

.tvist-v1 {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.tvist-v1--bounded {
  max-width: 100%;
}

.tvist-v1--vertical {
  height: 360px;
}

.tvist-v1__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: white;
  position: relative;
  user-select: none;
}

.tvist-v1__slide--tall-label {
  font-size: 32px;
}

.tvist-v1__slide span {
  position: relative;
  z-index: 1;
}

.tvist-v1__slide[data-tvist-slide-index='0'],
.tvist-v1__slide[data-tvist-slide-index='10'],
.tvist-v1__slide[data-tvist-slide-index='20'] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tvist-v1__slide[data-tvist-slide-index='1'],
.tvist-v1__slide[data-tvist-slide-index='11'],
.tvist-v1__slide[data-tvist-slide-index='21'] {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.tvist-v1__slide[data-tvist-slide-index='2'],
.tvist-v1__slide[data-tvist-slide-index='12'],
.tvist-v1__slide[data-tvist-slide-index='22'] {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.tvist-v1__slide[data-tvist-slide-index='3'],
.tvist-v1__slide[data-tvist-slide-index='13'],
.tvist-v1__slide[data-tvist-slide-index='23'] {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.tvist-v1__slide[data-tvist-slide-index='4'],
.tvist-v1__slide[data-tvist-slide-index='14'],
.tvist-v1__slide[data-tvist-slide-index='24'] {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}
.tvist-v1__slide[data-tvist-slide-index='5'],
.tvist-v1__slide[data-tvist-slide-index='15'],
.tvist-v1__slide[data-tvist-slide-index='25'] {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}
.tvist-v1__slide[data-tvist-slide-index='6'],
.tvist-v1__slide[data-tvist-slide-index='16'],
.tvist-v1__slide[data-tvist-slide-index='26'] {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}
.tvist-v1__slide[data-tvist-slide-index='7'],
.tvist-v1__slide[data-tvist-slide-index='17'],
.tvist-v1__slide[data-tvist-slide-index='27'] {
  background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);
}
.tvist-v1__slide[data-tvist-slide-index='8'],
.tvist-v1__slide[data-tvist-slide-index='18'],
.tvist-v1__slide[data-tvist-slide-index='28'] {
  background: linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%);
}
.tvist-v1__slide[data-tvist-slide-index='9'],
.tvist-v1__slide[data-tvist-slide-index='19'],
.tvist-v1__slide[data-tvist-slide-index='29'] {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
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

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.meta {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.meta strong {
  color: #667eea;
}
</style>
