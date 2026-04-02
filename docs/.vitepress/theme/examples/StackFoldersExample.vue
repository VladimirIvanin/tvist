<template>
  <ExampleCard
    title="Стопка папок"
    description="Peek слева + stack cover: виден край предыдущих слайдов, переходы ровные как у обычной стопки"
  >
    <div class="folder-demo">
      <div ref="rootEl" class="tvist-v1 tvist-v1--folder-stack">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div v-for="(name, i) in folders" :key="i" class="tvist-v1__slide folder-slide">
              <div class="folder-inner">
                <div class="folder-tab">{{ name }}</div>
                <div class="folder-body">
                  <p class="folder-title">{{ name }}</p>
                  <p class="folder-meta">{{ i + 1 }} / {{ folders.length }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="folder-controls">
        <button type="button" @click="slider?.prev()">← Назад</button>
        <button type="button" @click="slider?.next()">Вперёд →</button>
      </div>

      <p class="folder-hint">
        Здесь <code>mode: 'cover'</code> — без логики «снятия карты» из uncover, зато без рывков. Глубина —
        лёгкие <code>perSlideDepth</code> / <code>perSlideScale</code>; слева —
        <code>peek.left</code>.
      </p>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const rootEl = ref(null)
const slider = ref(null)

const folders = ['Документы', 'Фото 2025', 'Черновики', 'Архив', 'Общий доступ']

function build() {
  if (!rootEl.value) return
  slider.value?.destroy()
  slider.value = new Tvist(rootEl.value, {
    effect: 'stack',
    stackEffect: {
      mode: 'cover',
      slideShadows: true,
      perSlideDepth: 22,
      perSlideScale: 0.028,
      rotate: false,
    },
    peek: { left: 52 },
    speed: 360,
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
.folder-demo {
  margin: 16px 0;
}

.tvist-v1--folder-stack {
  max-width: 480px;
  margin: 0 auto;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  background: #eceff4;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.folder-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
}

.folder-controls button {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: #4a5568;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.folder-controls button:hover {
  background: #2d3748;
}

.folder-hint {
  max-width: 480px;
  margin: 14px auto 0;
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}

.folder-hint code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.tvist-v1--folder-stack :deep(.tvist-v1__track),
.tvist-v1--folder-stack :deep(.tvist-v1__container) {
  height: 100%;
}

.tvist-v1--folder-stack :deep(.tvist-v1__slide) {
  height: 100%;
  padding: 12px 12px 14px;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
}

.folder-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.folder-tab {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #334155;
  background: #fcd34d;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.folder-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 16px;
  background: #fafafa;
}

.folder-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.folder-meta {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}
</style>
