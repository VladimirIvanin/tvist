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

<BasicExample detailsLink="./examples/basic" />

## 2. PerPage: несколько слайдов на экран

<PerPageExample detailsLink="./examples/perpage" />

## 3. Адаптивный слайдер (Responsive)

<ResponsiveExample detailsLink="./examples/responsive" />

## 4. Loop Mode

<LoopExample detailsLink="./examples/loop" />

## 5. Fade Effect

<FadeExample detailsLink="./examples/effect-fade" />

## 6. Cube Effect

<CubeExample detailsLink="./examples/effect-cube" />

## 7. Вертикальный

<VerticalExample detailsLink="./examples/vertical" />

## 8. Вертикальные миниатюры (Gallery)

<VerticalThumbsExample detailsLink="./examples/vertical" />

## 9. Drag + Navigation

<DragNavigationExample detailsLink="./examples/modules" />

## 10. Autoplay + Pagination

<AutoplayExample detailsLink="./examples/modules" />

## 11. Thumbs Sync

<ThumbsExample detailsLink="./examples/thumbs" />

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
