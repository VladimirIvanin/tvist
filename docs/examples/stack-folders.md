# Stack: стопка папок

Горизонтальная стопка с **peek слева**: виден край предыдущих слайдов. Для спокойной анимации без логики «снятия карты» здесь используется **`cover`**. Вертикальный **`uncover`** с `peek.top` показан на той же странице, что и базовый stack: [Stack Effect](./effect-stack).

<script setup>
import StackFoldersExample from '../.vitepress/theme/examples/StackFoldersExample.vue'
</script>

<StackFoldersExample />

## Идея

1. **`peek: { left: 52 }`** — полоска слева с «корешком» стопки.
2. **`stackEffect.mode: 'cover'`** — обычное перекрытие, те же переходы, что у базового stack.
3. **Небольшие `perSlideDepth` / `perSlideScale`** и **`slideShadows`** — лёгкий объём без агрессивного масштаба.

## Код (суть)

```javascript
import { Tvist } from 'tvist'

const slider = new Tvist(root, {
  effect: 'stack',
  stackEffect: {
    mode: 'cover',
    slideShadows: true,
    perSlideDepth: 22,
    perSlideScale: 0.028,
    rotate: false,
  },
  peek: { left: 52 },
  speed: 360,
  loop: true,
})
```

## См. также

- [Stack Effect](./effect-stack) — режимы cover / uncover и опции `stackEffect`
- [Stack Effect](./effect-stack) — вертикальный uncover с `peek.top` на той же странице (второй блок демо)
