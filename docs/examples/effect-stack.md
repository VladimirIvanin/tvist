# Stack Effect

Новый слайд наезжает на предыдущий — эффект стопки карт. На корень вешается модификатор `tvist-v1--stack`; при `stackLayout: 'pile'` дополнительно `tvist-v1--stack-pile` (слайды в одном слоте вьюпорта).

<script setup>
import StackExample from '../.vitepress/theme/examples/StackExample.vue'
</script>

<StackExample />

На интерактивной странице три демо:

1. **Вертикальный** стек с переключением `cover` / `uncover` и ползунками декора (`rotate`, `slideShadows`, offset, scale, depth).
2. **Горизонтальная колода** — `stackLayout: 'pile'`, тени и смещение по глубине (как в примере кода ниже).
3. **Stack + scrollbar** — тот же эффект с модулем полосы прокрутки.

## Код примера (базовый)

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

По умолчанию направление горизонтальное; для вертикали задайте `direction: 'vertical'`.

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

У трека в режиме stack в стилях библиотеки `overflow: visible`, чтобы не обрезать тени и повороты; «рамку» задаёт обычно корневой элемент слайдера.

## Режим `mode`

| Значение | Поведение |
|----------|-----------|
| `cover` (по умолчанию) | Активный слайд сверху и движется поверх следующего, как лист поверх стопки. |
| `uncover` | В покое визуально как `cover`. При переходе **next** верхняя «карта» накрывает нижнюю; при **prev** верхний слой уезжает, открывая нижний (нижний остаётся на месте по оси стопки). |

## Раскладка `stackLayout`

| Значение | Поведение |
|----------|-----------|
| `track` (по умолчанию) | Ожидающие слайды стоят вдоль оси прокрутки на своих позициях (рельс), как у обычного слайдера. |
| `pile` | Ожидающие делят с активным текущий `translate` по оси: все карты в одном вьюпорте. Включается абсолютное позиционирование слайдов в контейнере; веер и глубина задаются `rotate`, `perSlideOffset`, `perSlideScale`, `perSlideDepth`. Смещение `perSlideOffset` в режиме `pile` идёт **поперёк** оси прокрутки (вертикаль: вправо, горизонталь: вниз), чтобы колода не разъезжалась вдоль рельса. |

## Опции `stackEffect`

Если не задавать декоративные поля, слайды просто перекрывают друг друга без дополнительных трансформаций.

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `mode` | `'cover' \| 'uncover'` | `'cover'` | См. таблицу выше. |
| `stackLayout` | `'track' \| 'pile'` | `'track'` | См. таблицу выше. |
| `slideShadows` | `boolean` | `false` | Градиентная тень поверх слайда (интенсивность от прогресса). |
| `rotate` | `boolean` | `false` | Лёгкий поворот слайдов стопки. |
| `perSlideRotate` | `number` | `2` | Угол поворота на каждый шаг стопки (градусы). |
| `perSlideOffset` | `number` | `0` | Смещение на слайд (px). В `pile` — только поперёк оси; можно задавать отрицательные значения (как в демо колоды). |
| `perSlideScale` | `number` | `0` | Уменьшение масштаба на слайд; `0` — без масштабирования. |
| `perSlideDepth` | `number` | `0` | Смещение по оси Z на слайд (px); для заметной глубины на трек часто добавляют `perspective` в своём CSS. |
| `viewportPadding` | `number` | не задаётся | Внутренний отступ трека (px), запас под поворот и тени без использования `peek` (аналог идеи `cubeEffect.viewportPadding`). |
| `zIndexProgressScale` | `number` | `1` | Масштаб только для расчёта z-index: чем меньше значение, тем раньше по ходу жеста переставляются слои (поведение в духе «cards»). |
| `slideTravelRatio` | `number` | `1` | Доля визуального смещения вдоль оси относительно полного хода движка для «верхнего» слоя в переходе; меньше `1` — короткий снос карты. Ограничивается сверху `1`, снизу положительным минимумом. |

## С опциями (эффект колоды на рельсе)

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

## Горизонтальная колода (`stackLayout: 'pile'`)

Близко к второму блоку на демо: одна «стопка» в центре, боковой запас под декор — через `peek` и/или `viewportPadding`.

```javascript
const slider = new Tvist(root, {
  direction: 'horizontal',
  effect: 'stack',
  peek: { top: 20 },
  stackEffect: {
    mode: 'cover',
    stackLayout: 'pile',
    slideShadows: true,
    rotate: false,
    perSlideOffset: -20,
    perSlideScale: 0.1,
    perSlideDepth: 50,
    zIndexProgressScale: 2,
    viewportPadding: 40,
  },
  speed: 400,
  loop: true,
})
```

Для `perSlideDepth` на треке можно задать перспективу, например:

```css
.tvist-v1--stack .tvist-v1__track {
  perspective: 880px;
}
```

Если корень слайдера с `overflow: hidden` обрезает тени или веер, для колоды иногда выставляют `overflow: visible` на корне (как в демо), сохраняя скругления на слайдах.

## Вертикальный режим

Первый блок на демо — вертикальный стек с переключаемым `mode`:

```javascript
const slider = new Tvist('.tvist-v1', {
  effect: 'stack',
  direction: 'vertical',
  speed: 400,
  loop: true,
})
```

Пример **uncover** с дополнительным «окном» сверху (`peek`) — если нужно оставить полоску под заголовок или индикатор:

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

## Stack и scrollbar

Третий блок на демо:

```javascript
const slider = new Tvist('.tvist-v1', {
  effect: 'stack',
  speed: 400,
  loop: true,
  scrollbar: {
    draggable: true,
  },
})
```

## Поведение и вёрстка

- **Клики и фокус:** неактивные слайды получают `pointer-events: none`, активный — `auto` (см. стили `--stack`), чтобы кликабельным оставался верхний слайд.
- **`perPage`:** эффект stack можно комбинировать с `perPage > 1`; геометрия считается от размеров и позиций слайдов движка.
- **Отладка:** при `debug: true` в консоль пишутся подробные логи расчёта stack (`[tvist stack] setTranslate`, …).
