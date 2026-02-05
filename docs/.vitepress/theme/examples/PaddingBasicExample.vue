<template>
  <div class="example">
    <div ref="sliderRef" class="tvist padding-basic">
      <div class="tvist__container">
        <div v-for="i in 5" :key="i" class="tvist__slide">
          <div class="slide-content">
            {{ i }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Tvist } from '../../../../src/index.ts'
import '../../../../src/styles/tvist.scss'

const sliderRef = ref<HTMLElement>()
let slider: Tvist | null = null

onMounted(() => {
  if (sliderRef.value) {
    slider = new Tvist(sliderRef.value, {
      padding: {
        left: 0,
        right: 60
      },
      gap: 20,
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
.example {
  width: 100%;
}

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
