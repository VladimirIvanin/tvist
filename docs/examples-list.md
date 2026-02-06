# Примеры использования

Изучите возможности Tvist через живые примеры. Все примеры показаны на одной странице для удобства.

<script setup>
import BasicExample from './.vitepress/theme/examples/BasicExample.vue'
import PerPageExample from './.vitepress/theme/examples/PerPageExample.vue'
import PeekBasicExample from './.vitepress/theme/examples/PeekBasicExample.vue'
import CenterBasicExample from './.vitepress/theme/examples/CenterBasicExample.vue'
import CenterPerPage2Example from './.vitepress/theme/examples/CenterPerPage2Example.vue'
import ResponsiveExample from './.vitepress/theme/examples/ResponsiveExample.vue'
import LoopExample from './.vitepress/theme/examples/LoopExample.vue'
import FadeExample from './.vitepress/theme/examples/FadeExample.vue'
import CubeExample from './.vitepress/theme/examples/CubeExample.vue'
import VerticalExample from './.vitepress/theme/examples/VerticalExample.vue'
import VerticalThumbsExample from './.vitepress/theme/examples/VerticalThumbsExample.vue'
import DragNavigationExample from './.vitepress/theme/examples/DragNavigationExample.vue'
import AutoplayExample from './.vitepress/theme/examples/AutoplayExample.vue'
import ThumbsExample from './.vitepress/theme/examples/ThumbsExample.vue'
import GridExample from './.vitepress/theme/examples/GridExample.vue'
import GridDimensionsExample from './.vitepress/theme/examples/GridDimensionsExample.vue'
import UpdateOptionsExample from './.vitepress/theme/examples/UpdateOptionsExample.vue'
import ScrollControlExample from './.vitepress/theme/examples/ScrollControlExample.vue'
import ScrollbarExample from './.vitepress/theme/examples/ScrollbarExample.vue'
</script>

<div class="examples-page">

## 1. Базовый слайдер

<BasicExample detailsLink="./examples/basic" />

## 2. PerPage: несколько слайдов на экран

<PerPageExample detailsLink="./examples/perpage" />

## 3. Peek: часть соседних слайдов

<PeekBasicExample detailsLink="./examples/peek" />

## 4. Center: центрирование активного слайда

<CenterBasicExample detailsLink="./examples/center" />

## 5. Center с perPage: 2 (половинки по бокам)

<CenterPerPage2Example detailsLink="./examples/center" />

## 6. Адаптивный слайдер (Responsive)

<ResponsiveExample detailsLink="./examples/responsive" />

## 7. Update Options: динамическое изменение

::: tip 
Интерактивная демонстрация динамического изменения опций слайдера. [Открыть полную версию →](./examples/update-options)
:::

## 8. Loop Mode

<LoopExample detailsLink="./examples/loop" />

## 9. Fade Effect

<FadeExample detailsLink="./examples/effect-fade" />

## 10. Cube Effect

<CubeExample detailsLink="./examples/effect-cube" />

## 11. Вертикальный

<VerticalExample detailsLink="./examples/vertical" />

## 12. Вертикальные миниатюры (Gallery)

<VerticalThumbsExample detailsLink="./examples/vertical" />

## 13. Drag + Navigation

<DragNavigationExample detailsLink="./examples/modules" />

## 14. Autoplay + Pagination

<AutoplayExample detailsLink="./examples/modules" />

## 15. Thumbs Sync

<ThumbsExample detailsLink="./examples/thumbs" />

## 16. Grid Layout

<GridExample detailsLink="./examples/grid" />

## 17. Grid Dimensions

<GridDimensionsExample detailsLink="./examples/grid" />

## 18. Scroll Control

<ScrollControlExample detailsLink="./examples/scroll-control" />

## 19. Scrollbar

<ScrollbarExample detailsLink="./examples/scrollbar" />

</div>

<style scoped>
.examples-page {
  display: grid;
  gap: 48px;
  margin-top: 32px;
  max-width: 100%;
  overflow-x: hidden;
}

/* Дочерние элементы не растягивают грид */
.examples-page > * {
  min-width: 0;
}

.examples-page h2 {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 600;
}
</style>
