<template>
  <div class="example">
    <div ref="sliderRef" class="tvist-v1 loop-images">
      <div class="tvist-v1__container">
        <div v-for="i in 5" :key="i" class="tvist-v1__slide">
          <img
            :src="`https://picsum.photos/800/450?random=${i}`"
            :alt="`Слайд ${i}`"
            class="slide-image"
          >
        </div>
      </div>
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
      gap: 0,
      perPage: 1,
      loop: true,
      arrows: true,
      pagination: true,
      drag: true
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

.tvist-v1 {
  width: 100%;
  height: 320px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.tvist-v1__container {
  height: 100%;
}

.tvist-v1__slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
