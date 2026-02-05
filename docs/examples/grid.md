# Grid Layout

Tvist позволяет располагать слайды в виде сетки (Grid). Это удобно для создания галерей или списков карточек.

<div class="example-card">
<GridExample />
</div>

## Использование

Для включения режима сетки используйте опцию `grid`.

```js
new Tvist('.slider', {
  grid: {
    rows: 2,
    cols: 2,
    gap: {
      row: 10,
      col: 10
    }
  }
})
```

### Размеры ячеек (Dimensions)

Вы можете задавать индивидуальные размеры (span) для каждого слайда с помощью опции `dimensions`.
Массив размеров `[colSpan, rowSpan]` применяется циклически.

<div class="example-card">
<GridDimensionsExample />
</div>

```js
new Tvist('.slider', {
  grid: {
    rows: 2,
    cols: 2,
    gap: 10,
    dimensions: [
      [2, 2], // 1й слайд: 2 колонки, 2 ряда
      [1, 1], // 2й слайд: 1 колонка, 1 ряд
      [1, 1], // 3й слайд...
      [1, 2]  // 4й слайд: 1 колонка, 2 ряда
    ]
  }
})
```

## Опции Grid

| Опция | Тип | По умолчанию | Описание |
| :--- | :--- | :--- | :--- |
| `rows` | `number` | `1` | Количество строк в сетке |
| `cols` | `number` | `1` | Количество колонок в сетке |
| `gap` | `number \| { row, col }` | `0` | Отступы между ячейками. Можно задать отдельно для строк и колонок. |
| `dimensions` | `Array<[number, number]>` | `undefined` | Массив размеров `[colSpan, rowSpan]` для слайдов. |

<script setup>
import GridExample from '../.vitepress/theme/examples/GridExample.vue'
import GridDimensionsExample from '../.vitepress/theme/examples/GridDimensionsExample.vue'
</script>
