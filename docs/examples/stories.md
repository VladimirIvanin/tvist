# Сценарий «Истории»

Сценарий «истории» можно собрать полностью на событиях Tvist без внешних таймеров:
- `autoplayProgress` — заполняет активный сегмент `0..1`
- `longPressStart` / `longPressEnd` — пауза/возобновление по удержанию
- `waitForVideo: true` — для HTML `<video>` переход по окончанию ролика
- `reachEnd` — сигнал закрыть модалку или переключить внешний контейнер

<script setup>
import StoriesDocExample from '../.vitepress/theme/examples/StoriesDocExample.vue'
</script>

## Интерактивный пример

<StoriesDocExample />

## Базовая конфигурация

```js
const slider = new Tvist('.tvist-v1', {
  holdToPause: {
    enabled: true,
    threshold: 100,
    root: 'slider',
    exclude: '[data-tvist-no-hold]',
    cancelOnDrag: true,
  },
  autoplay: {
    delay: 5000,        // используется для не-видео слайдов
    waitForVideo: true, // видео ждём до конца
  },
  video: {
    autoplay: true,
    muted: true,
    pauseOnHold: true,
  },
  on: {
    autoplayProgress: ({ progress, index }) => {
      renderStorySegments(index, progress)
    },
    reachEnd: () => {
      closeStoriesModal()
    },
  },
})
```

## Сегменты прогресса

```js
const segments = [...document.querySelectorAll('.story-segment')]

function renderStorySegments(activeIndex, activeProgress) {
  segments.forEach((el, i) => {
    if (i < activeIndex) {
      el.style.transform = 'scaleX(1)'
      return
    }
    if (i > activeIndex) {
      el.style.transform = 'scaleX(0)'
      return
    }
    el.style.transform = `scaleX(${activeProgress})`
  })
}
```

## Зоны тапа «назад / вперёд»

Внешние зоны можно оставить вне root слайдера:

```js
document.querySelector('[data-story-prev]')?.addEventListener('click', () => {
  slider.prev()
})

document.querySelector('[data-story-next]')?.addEventListener('click', () => {
  slider.next()
})
```

Если в этих элементах не нужно удержание, добавьте `data-tvist-no-hold` и укажите `exclude` в `holdToPause`.

## Вложенные слайдеры

Рекомендуемый паттерн:
- внешний слайдер групп: `autoplay: false`
- внутренний слайдер медиа: `autoplay + holdToPause + waitForVideo`

Это упрощает синхронизацию и исключает конфликт таймеров между уровнями. Для hold на внутреннем слайдере `pointerdown` не всплывает к родителю; дополнительно на слайде можно слушать DOM `CustomEvent` из `TVIST_DOM_EVENTS` ([события API](/api/events#longpressstart)).

Если поверх карточки лежат свои зоны «назад / вперёд», они перехватывают касания — удержание для паузы сработает только там, где событие доходит до root внутреннего слайдера (например центральная полоса, если боковые заняты оверлеями).
