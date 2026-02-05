# Примеры использования

Изучите возможности Tvist через живые примеры. Все примеры показаны на одной странице для удобства.

<script setup>
import BasicExample from './.vitepress/theme/examples/BasicExample.vue'
import PerPageExample from './.vitepress/theme/examples/PerPageExample.vue'
import ResponsiveExample from './.vitepress/theme/examples/ResponsiveExample.vue'
import LoopExample from './.vitepress/theme/examples/LoopExample.vue'
import FadeExample from './.vitepress/theme/examples/FadeExample.vue'
import CubeExample from './.vitepress/theme/examples/CubeExample.vue'
import VerticalExample from './.vitepress/theme/examples/VerticalExample.vue'
import VerticalThumbsExample from './.vitepress/theme/examples/VerticalThumbsExample.vue'
import DragNavigationExample from './.vitepress/theme/examples/DragNavigationExample.vue'
import AutoplayExample from './.vitepress/theme/examples/AutoplayExample.vue'
import ThumbsExample from './.vitepress/theme/examples/ThumbsExample.vue'
</script>

<div class="examples-page">

## 1. Базовый слайдер

<BasicExample />

## 2. PerPage: несколько слайдов на экран

<PerPageExample />

## 3. Адаптивный слайдер (Responsive)

<ResponsiveExample />

## 4. Loop Mode

<LoopExample />

## 5. Fade Effect

<FadeExample />

## 6. Cube Effect

<CubeExample />

## 7. Вертикальный

<VerticalExample />

## 8. Вертикальные миниатюры (Gallery)

<VerticalThumbsExample />

## 9. Drag + Navigation

<DragNavigationExample />

## 10. Autoplay + Pagination

<AutoplayExample />

## 11. Thumbs Sync

<ThumbsExample />

</div>

<style scoped>
.examples-page {
  display: grid;
  gap: 48px;
  margin-top: 32px;
}

.examples-page h2 {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 600;
}
</style>
