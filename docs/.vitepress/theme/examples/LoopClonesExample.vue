<template>
  <ExampleCard
    title="Loop с объектной конфигурацией и клонами"
    description="Демонстрация нового синтаксиса loop: { enabled, withClones }"
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
        <button @click="slider?.prev()">← Prev</button>
        <button @click="slider?.next()">Next →</button>
      </div>

      <div class="info">
        <div><strong>activeIndex:</strong> {{ state.activeIndex }}</div>
        <div><strong>realIndex:</strong> {{ state.realIndex }}</div>
        <div><strong>loop.withClones:</strong> true</div>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { Tvist } from 'tvist';
import ExampleCard from '../ExampleCard.vue';

const sliderEl = ref<HTMLElement | null>(null);
const slider = ref<Tvist | null>(null);

const state = reactive({
  activeIndex: 0,
  realIndex: 0,
});

onMounted(() => {
  if (!sliderEl.value) return;

  slider.value = new Tvist(sliderEl.value, {
    perPage: 5,
    gap: 0,
    loop: {
      enabled: true,
      withClones: true,
    },
    // peek: 20,
    arrows: true,
    pagination: true,
    drag: true,
    on: {
      created(instance) {
        state.activeIndex = instance.activeIndex;
        state.realIndex = instance.realIndex ?? 0;
      },
      slideChangeEnd() {
        if (!slider.value) return;
        state.activeIndex = slider.value.activeIndex;
        state.realIndex = slider.value.realIndex ?? 0;
      },
    },
  });
});

onUnmounted(() => {
  slider.value?.destroy();
});
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
  margin-bottom: 16px;
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

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
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

.info {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #555;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.info strong {
  color: #667eea;
}
</style>
