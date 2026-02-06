<template>
  <div class="example">
    <div ref="sliderRef" class="tvist peek-mixed">
      <div class="tvist-v0__container">
        <div v-for="i in 5" :key="i" class="tvist-v0__slide">
          <div class="slide-content">
            {{ i }}
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <span class="badge">Left: 2rem</span>
      <span class="badge">Right: 100px</span>
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
      peek: { left: '2rem', right: 100 },
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
  height: 300px;
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
  width: 100%;
  height: 90%;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%);
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
  background: #f3e5f5;
  color: #7b1fa2;
}
</style>
