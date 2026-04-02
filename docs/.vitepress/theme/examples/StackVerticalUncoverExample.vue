<template>
  <ExampleCard
    title="Stack uncover — вертикально"
    description="direction: vertical + peek сверху: видна полоска «нижних» карточек, переходы в режиме uncover"
  >
    <div class="v-stack-demo">
      <div ref="rootEl" class="tvist-v1 tvist-v1--stack-vertical-uncover">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div
              v-for="(item, i) in items"
              :key="i"
              class="tvist-v1__slide v-slide"
              :style="{ '--hue': item.hue }"
            >
              <span class="v-slide__num">{{ i + 1 }}</span>
              <span class="v-slide__label">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="v-stack-controls">
        <button type="button" @click="slider?.prev()">↑ Назад</button>
        <button type="button" @click="slider?.next()">Вперёд ↓</button>
      </div>

      <p class="v-stack-hint">
        <code>peek: { top: 48 }</code> оставляет зону сверху для края стопки. Для горизонтали тот же приём —
        <code>peek.left</code> (см.
        <a :href="withBase('/examples/stack-folders')">стопку папок</a>).
      </p>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const rootEl = ref(null)
const slider = ref(null)

const items = [
  { label: 'Верх', hue: 210 },
  { label: 'Второй', hue: 175 },
  { label: 'Третий', hue: 265 },
  { label: 'Четвёртый', hue: 32 },
  { label: 'Низ', hue: 340 },
]

function build() {
  if (!rootEl.value) return
  slider.value?.destroy()
  slider.value = new Tvist(rootEl.value, {
    direction: 'vertical',
    effect: 'stack',
    stackEffect: {
      mode: 'uncover',
      slideShadows: true,
      perSlideDepth: 34,
      perSlideScale: 0.04,
      rotate: false,
    },
    peek: { top: 48 },
    speed: 400,
    loop: true,
  })
}

onMounted(() => {
  build()
})

onUnmounted(() => {
  slider.value?.destroy()
})
</script>

<style scoped>
.v-stack-demo {
  margin: 16px 0;
}

.tvist-v1--stack-vertical-uncover {
  max-width: 320px;
  margin: 0 auto;
  height: 420px;
  border-radius: 14px;
  overflow: hidden;
  background: #e2e8f0;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.v-stack-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
}

.v-stack-controls button {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: #475569;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.v-stack-controls button:hover {
  background: #334155;
}

.v-stack-hint {
  max-width: 360px;
  margin: 14px auto 0;
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}

.v-stack-hint code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.tvist-v1--stack-vertical-uncover :deep(.tvist-v1__track),
.tvist-v1--stack-vertical-uncover :deep(.tvist-v1__container) {
  height: 100%;
}

.tvist-v1--stack-vertical-uncover :deep(.tvist-v1__slide) {
  height: 100%;
  padding: 10px 12px 12px;
  box-sizing: border-box;
}

.v-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  background: linear-gradient(
    145deg,
    hsl(var(--hue, 210), 62%, 52%) 0%,
    hsl(var(--hue, 210), 55%, 38%) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.v-slide__num {
  font-size: 56px;
  line-height: 1;
  opacity: 0.95;
}

.v-slide__label {
  font-size: 15px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  opacity: 0.9;
}
</style>
