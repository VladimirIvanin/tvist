# Stack uncover — вертикально

Вертикальная стопка с режимом **`uncover`**: сверху за счёт **`peek.top`** виден край уже пройденных слайдов (аналог `peek.left` у горизонтальной [стопки папок](./stack-folders)).

<script setup>
import StackVerticalUncoverExample from '../.vitepress/theme/examples/StackVerticalUncoverExample.vue'
</script>

<StackVerticalUncoverExample />

## Код

```javascript
import { Tvist } from 'tvist'

const slider = new Tvist(root, {
  direction: 'vertical',
  effect: 'stack',
  stackEffect: {
    mode: 'uncover',
    slideShadows: true,
    perSlideDepth: 34,
    perSlideScale: 0.04,
    rotate: false,
  },
  peek: { top: 48 },
  speed: 400,
  loop: true,
})
```

## См. также

- [Stack Effect](./effect-stack) — опции `stackEffect`, горизонтальный и вертикальный режимы
- [Stack: папки](./stack-folders) — горизонтальная стопка с `peek.left` и спокойным `cover`
