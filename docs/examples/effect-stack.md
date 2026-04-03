# Stack Effect

Новый слайд выезжает поверх предыдущего — эффект стопки карт.

<script setup>
import StackExample from '../.vitepress/theme/examples/StackExample.vue'
</script>

<StackExample />

## Код примера

**HTML:**
```html
<div class="tvist-v1">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">1</div>
      <div class="tvist-v1__slide">2</div>
      <div class="tvist-v1__slide">3</div>
    </div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist-v1', {
  effect: 'stack',
  speed: 400,
  loop: true,
})
```

**CSS:**
```css
.tvist-v1 {
  width: 100%;
  height: 360px;
  border-radius: 16px;
  overflow: hidden;
}

.tvist-v1__slide {
  height: 100%;
}
```

## Опции `stackEffect`

По умолчанию все эффекты стопки выключены — слайды просто перекрывают друг друга без каких-либо дополнительных трансформаций.

| Опция | Тип | По умолчанию | Описание |
|---|---|---|---|
| `slideShadows` | `boolean` | `false` | Тень на слайдах стопки |
| `rotate` | `boolean` | `false` | Лёгкий поворот слайдов |
| `perSlideRotate` | `number` | `2` | Угол поворота на слайд (градусы) |
| `perSlideOffset` | `number` | `0` | Смещение стопки вниз/вправо на слайд (px). `0` — без смещения |
| `perSlideScale` | `number` | `0` | Уменьшение масштаба на слайд. `0` — без масштабирования |
| `perSlideDepth` | `number` | `0` | Смещение по Z на слайд (px). `0` — без глубины |

## С опциями (эффект колоды)

```javascript
const slider = new Tvist('.tvist-v1', {
  effect: 'stack',
  stackEffect: {
    slideShadows: true,
    rotate: true,
    perSlideRotate: 3,
    perSlideOffset: 8,
    perSlideScale: 0.08,
    perSlideDepth: 80,
  },
  speed: 400,
  loop: true,
})
```

## Стопка папок (peek + глубина)

Пример визуала «папок» с видимым краем предыдущих слайдов: [Stack: стопка папок](./stack-folders).

## Вертикальный режим

Базовый вариант — только направление:

```javascript
const slider = new Tvist('.tvist-v1', {
  effect: 'stack',
  direction: 'vertical',
  speed: 400,
  loop: true,
})
```

На демо выше второй блок — **вертикальный uncover** с `peek: { top: 48 }` и `stackEffect.mode: 'uncover'`:

```javascript
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
