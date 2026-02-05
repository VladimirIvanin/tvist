# PerPage Example

Демонстрация опции `perPage` для отображения нескольких слайдов одновременно.

<script setup>
import PerPageExample from '../.vitepress/theme/examples/PerPageExample.vue'
</script>

<PerPageExample />

## Описание

Опция `perPage` определяет, сколько слайдов будет видно одновременно на экране. Это основной способ создания слайдеров с несколькими элементами в видимой области.

### Основные возможности

- **Фиксированное количество слайдов**: задайте `perPage: 2`, `perPage: 3` и т.д.
- **Автоматический расчет размеров**: слайды равномерно распределяются по ширине контейнера
- **Работа с зазорами**: используйте `gap` для создания отступов между слайдами
- **Навигация**: переключение происходит группами слайдов (по `perPage` за раз)

## Код примеров

### perPage: 1 (по умолчанию)

```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  speed: 300,
  drag: true
});
```

Классический слайдер "один слайд на экран". Подходит для главных баннеров, галерей изображений в полную ширину.

### perPage: 2

```javascript
const slider = new Tvist('.tvist', {
  perPage: 2,
  gap: 16,
  speed: 300,
  drag: true
});
```

Показывает два слайда одновременно. Идеально для карточек товаров, портфолио, списков статей.

### perPage: 3 с зазором

```javascript
const slider = new Tvist('.tvist', {
  perPage: 3,
  gap: 20,
  speed: 300,
  drag: true
});
```

Три слайда с увеличенным зазором. Отлично подходит для каталогов, галерей миниатюр, списков категорий.

### perPage: 4 (grid-style)

```javascript
const slider = new Tvist('.tvist', {
  perPage: 4,
  gap: 12,
  speed: 300,
  drag: true
});
```

Четыре слайда в grid-стиле. Подходит для плотных списков, логотипов партнеров, большого количества элементов.

## HTML разметка

```html
<div class="tvist">
  <div class="tvist__container">
    <div class="tvist__slide">1</div>
    <div class="tvist__slide">2</div>
    <div class="tvist__slide">3</div>
    <div class="tvist__slide">4</div>
    <div class="tvist__slide">5</div>
    <div class="tvist__slide">6</div>
    <div class="tvist__slide">7</div>
    <div class="tvist__slide">8</div>
  </div>
</div>
```

## CSS стили

```css
.tvist__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 32px;
  font-weight: bold;
  color: white;
}
```

## Важные моменты

1. **Навигация по группам**: при `perPage: 3` слайдер будет листать по 3 слайда за раз
2. **Gap и размеры**: зазор `gap` учитывается при расчете ширины слайдов автоматически
3. **Последняя группа**: если слайдов меньше чем `perPage`, они все равно отобразятся корректно
4. **Drag**: при включенном `drag` можно свободно перетаскивать слайды, не ограничиваясь группами

## Когда использовать

- **perPage: 1** — главные баннеры, hero-секции, полноэкранные галереи
- **perPage: 2** — карточки товаров, портфолио, сравнение
- **perPage: 3** — списки статей, категории, средние каталоги
- **perPage: 4+** — логотипы, теги, большие списки элементов

## Связанные примеры

- [Responsive Example](./responsive.md) — адаптивное изменение `perPage` на разных экранах
- [Loop Mode](./loop.md) — бесконечная прокрутка с несколькими слайдами
- [Drag Navigation](./modules.md) — перетаскивание с `perPage`
