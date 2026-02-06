<template>
  <div class="example">
    <div ref="sliderRef" class="tvist peek-vertical">
      <div class="tvist-v0__container">
        <div v-for="i in 5" :key="i" class="tvist-v0__slide">
          <div class="slide-content">
            {{ i }}
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <span class="badge top">Top: 50px</span>
      <span class="badge bottom">Bottom: 100px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from 'tvist'

const sliderRef = ref<HTMLElement>()
let slider: Tvist | null = null

onMounted(() => {
  if (sliderRef.value) {
    slider = new Tvist(sliderRef.value, {
      direction: 'vertical',
      peek: { top: 50, bottom: 100 },
      perPage: 1,
      arrows: true,
      pagination: true
    })
  }
})

onBeforeUnmount(() => {
  slider?.destroy()
})
</script>

<style scoped>
.tvist {
  width: 100%;
  height: 400px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.tvist-v0__container {
  height: 100%;
}

.tvist-v0__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content {
  width: 90%;
  height: 100%;
  background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.info {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge.top {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge.bottom {
  background: #fff3e0;
  color: #e65100;
}
</style>
