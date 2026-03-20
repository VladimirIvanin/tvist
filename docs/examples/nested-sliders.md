# Вложенные слайдеры

Можно инициализировать второй экземпляр `Tvist` на отдельном root-элементе внутри слайда внешнего слайдера. Список слайдов и атрибут `data-tvist-slide-index` строятся **только для элементов, чей ближайший предок с классом блока (`tvist-v1`) совпадает с root этого экземпляра** — слайды внутри вложенного блока в родитель не попадают. Модуль **drag** у родителя не реагирует на жесты, начатые во вложенном блоке (ближайший к цели `.tvist-v1` получает приоритет).

<div class="example-card">
<NestedSlidersExample />
</div>

## Разметка

Вложенный слайдер — это полноценный блок с классом блока (например `tvist-v1`), вложенный в слайд родителя:

```html
<div class="tvist-v1" id="parent">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">
      <div class="tvist-v1" id="nested">
        <div class="tvist-v1__container">
          <div class="tvist-v1__slide">A</div>
          <div class="tvist-v1__slide">B</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Инициализация

Оба root должны уже быть в DOM. Порядок конструкторов обычно **снаружи внутрь** (родитель, затем вложенный), так проще рассуждать о разметке; технически важно лишь, чтобы к моменту `new Tvist('#nested', …)` узел `#nested` существовал.

По умолчанию **`parent.destroy()` не вызывает `destroy()` у вложенных** экземпляров — так можно безопасно убирать внешний слайдер (например отключать карусель на десктопе), оставляя живыми мини-слайдеры картинок в карточках. Если нужно снести всё поддерево слайдеров разом, передайте **`{ destroyNested: true }`**.

```js
const parent = new Tvist('#parent', { drag: true, perPage: 1 })
const nested = new Tvist('#nested', { drag: true, perPage: 1 })

// только внешний экземпляр — вложенный остаётся:
parent.destroy()
nested.destroy()

// или одним вызовом с каскадом:
parent.destroy({ destroyNested: true })
```

<script setup>
import NestedSlidersExample from '../.vitepress/theme/examples/NestedSlidersExample.vue'
</script>
