# Cube Effect

3D трансформация в виде куба.

Переключайте грани стрелками или перетаскиванием. Счётчик показывает текущую грань; кнопка мобильного вида позволяет проверить эффект на ширине 375 px.

При `loop: false` первый и последний слайды также замыкают соседние грани куба, чтобы при перетаскивании за край не появлялась пустота. Навигация останавливается на первом и последнем слайдах.


<Demo id="effect-cube" />

## Размеры контейнера

Грани куба позиционируются абсолютно и не задают высоту родителю. Задайте размер слайдера через `height` или `aspect-ratio`, а треку — `height: 100%`. В примере используется квадрат шириной до 280 px, который уменьшается на узких экранах.

Стрелки и контейнер счётчика находятся в HTML и передаются в опциях `arrows` и `pagination`. Полный код рабочего примера доступен во вкладках под демонстрацией.

## Код примера

**HTML:**
```html
<div class="cube-wrapper">
  <div class="tvist-v1">
    <div class="tvist-v1__track">
      <div class="tvist-v1__container">
        <div class="tvist-v1__slide">Slide 1</div>
        <div class="tvist-v1__slide">Slide 2</div>
        <div class="tvist-v1__slide">Slide 3</div>
        <div class="tvist-v1__slide">Slide 4</div>
      </div>
    </div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  effect: 'cube',
  cubeEffect: {
    slideShadows: true,
    shadow: true,
    shadowOffset: 20,
    shadowScale: 0.94
  },
  speed: 600,
  loop: true
});
```

**CSS:**
```css
.cube-wrapper {
  perspective: 1000px;
  width: 300px;
  height: 300px;
  margin: 0 auto;
}

.tvist-v1__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: white;
}

/* Используем data-атрибут вместо nth-child для корректной работы с loop */
.tvist-v1__slide[data-tvist-slide-index="0"] { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v1__slide[data-tvist-slide-index="1"] { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v1__slide[data-tvist-slide-index="2"] { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v1__slide[data-tvist-slide-index="3"] { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
```

## Картинки с `loading="lazy"`

Если в слайдах стоят обычные `<img src="..." loading="lazy">`, браузер может не начать загрузку до появления изображения у края viewport. На вращающейся грани куба это иногда даёт пустой кадр на долю секунды.

Включите опцию **`nativeLazyAdjacent`** (по умолчанию срабатывает **в начале перехода** к целевому слайду; соседей при первой отрисовке страницы можно добавить через `onInit: true`):

```javascript
const slider = new Tvist('.tvist', {
  effect: 'cube',
  speed: 600,
  loop: true,
  nativeLazyAdjacent: true,
})
```

Подробности и все варианты — в [справочнике опций: nativeLazyAdjacent](/api/options#native-lazy-adjacent).
