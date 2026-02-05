<template>
  <div class="example">
    <div ref="sliderRef" class="tvist peek-asymmetric">
      <div class="tvist__container">
        <div v-for="i in 5" :key="i" class="tvist__slide">
          <div class="slide-content">
            {{ i }}
          </div>
        </div>
      </div>
    </div>
    <div class="info">
      <span class="badge left">Left: 50px</span>
      <span class="badge right">Right: 150px</span>
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
      peek: { left: 50, right: 150 },
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
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
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

.badge.left {
  background: #e3f2fd;
  color: #1976d2;
}

.badge.right {
  background: #fce4ec;
  color: #c2185b;
}
</style>
