# Сценарий «Истории»


Сценарий «истории» можно собрать полностью на событиях Tvist без внешних таймеров:
- `autoplayProgress` — заполняет активный сегмент `0..1`
- `longPressStart` / `longPressEnd` — пауза/возобновление по удержанию
- `waitForVideo: true` — для HTML `<video>` переход по окончанию ролика
- `autoplayProgress` с `progress: 1` у последнего слайда — сигнал закрыть модалку или переключить внешний контейнер

`reachEnd` сообщает о переходе на последний слайд. Для историй дождитесь завершения его прогресса, чтобы показать последний кадр целиком.


## Интерактивный пример

<Demo id="stories" />

В примере три автора и восемь историй из прежней документации. Внешний слайдер переключает группы, а вложенные слайдеры показывают истории каждого автора. Автопрокрутка работает только у активной группы: после последней истории открывается следующий автор, после последнего автора показ останавливается.

Тап по левому или правому краю переключает историю. Удержание в любой части карточки приостанавливает прогресс, отпускание продолжает показ. Кнопки под карточкой позволяют переключать истории с клавиатуры, ставить показ на паузу и начинать сначала.

Истории и группы переключаются плавно, в том числе при доводке после отпускания свайпа. При ширине окна до 767 px группы переключаются с эффектом куба; его можно проверить кнопкой «Мобильный вид · 375 px». Сегменты прогресса находятся внутри каждой группы и вращаются вместе с её содержимым. Если включено уменьшение движения в настройках системы, автопрокрутка изначально на паузе, а переходы выполняются без анимации.

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
      if (progress === 1 && index === slider.slides.length - 1) {
        closeStoriesModal()
      }
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

В интерактивном примере зоны тапа вычисляются по координате касания на внутреннем слайдере. Это позволяет использовать `holdToPause` на всей карточке без перекрывающих её оверлеев. Короткий тап переключает историю, удержание и свайп не считаются тапом.
