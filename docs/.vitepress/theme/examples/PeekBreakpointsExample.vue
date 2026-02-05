<template>
  <div class="example">
    <div ref="sliderRef" class="tvist peek-breakpoints">
      <div class="tvist__container">
        <div v-for="i in 9" :key="i" class="tvist__slide">
          <div class="slide-content">
            {{ i }}
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <span class="badge">Desktop: peek 100px, 3 slides</span>
      <span class="badge">Tablet: peek 50px, 2 slides</span>
      <span class="badge">Mobile: peek 20px, 1 slide</span>
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
      peek: 100,
      perPage: 3,
      gap: 20,
      arrows: true,
      pagination: true,
      breakpoints: {
        768: {
          peek: 50,
          perPage: 2
        },
        480: {
          peek: 20,
          perPage: 1
        }
      }
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

.tvist__container {
  height: 100%;
}

.tvist__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content {
  width: 100%;
  height: 90%;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 32px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.info {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e3f2fd;
  color: #1976d2;
}
</style>
