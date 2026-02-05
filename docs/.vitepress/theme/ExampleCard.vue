<template>
  <div class="example-card">
    <div class="example-card__header">
      <div class="example-card__title-row">
        <h3 class="example-card__title">{{ title }}</h3>
        <a v-if="detailsLink" :href="detailsLink" class="example-card__link">
          Смотреть код →
        </a>
      </div>
      <p class="example-card__description">{{ description }}</p>
    </div>
    <div class="example-card__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  detailsLink: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.example-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 40px;
}

.example-card__header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.example-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.example-card__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #667eea;
}

.example-card__link {
  font-size: 14px;
  color: #667eea;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s;
}

.example-card__link:hover {
  color: #5568d3;
  text-decoration: underline;
}

.example-card__description {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.example-card__content {
  padding: 0;
}

/* Убираем лишний padding у demo-wrapper внутри карточки */
.example-card__content :deep(.demo-wrapper) {
  border-radius: 0;
  border: none;
  box-shadow: none;
}

/* Блок с кодом */
.example-card__code {
  padding: 0 20px 20px;
}

/* Стили для details */
.example-card__content :deep(details) {
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.example-card__content :deep(details summary) {
  cursor: pointer;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  font-weight: 500;
  user-select: none;
  transition: background 0.2s;
  list-style: none;
  color: var(--vp-c-text-1);
}

.example-card__content :deep(details summary::-webkit-details-marker) {
  display: none;
}

.example-card__content :deep(details summary:hover) {
  background: var(--vp-c-bg-mute);
}

.example-card__content :deep(details[open] summary) {
  border-bottom: 1px solid var(--vp-c-divider);
  background: #667eea;
  color: white;
}

.example-card__content :deep(.details div[class*="language-"]) {
  margin: 0 !important;
  border-radius: 0 !important;
}

/* Делаем код более компактным */
.example-card__content :deep(pre) {
  margin: 0 !important;
}

.example-card__content :deep(.vp-code-group) {
  margin: 0 !important;
}
</style>
