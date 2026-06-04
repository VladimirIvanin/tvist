<script setup lang="ts">
const version = __TVIST_VERSION__
</script>

<template>
  <span class="tvist-version-badge">v{{ version }}</span>
</template>

<style scoped>
.tvist-version-badge {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
  border-radius: 10px;
}
</style>
