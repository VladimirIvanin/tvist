# Video

Управление видео (`<video>` и iframe YouTube/Vimeo) внутри слайдов.

<script setup>
import VideoDocExample from '../.vitepress/theme/examples/VideoDocExample.vue'
</script>

## Интерактивный пример

<VideoDocExample />

## Базовое использование

Видео внутри слайдов — просто содержимое, без data-атрибутов:

```html
<div class="tvist-v1">
  <div class="tvist-v1__container">
    <div class="tvist-v1__slide">
      <video src="hero.mp4" muted playsinline></video>
    </div>
    <div class="tvist-v1__slide">
      <img src="photo.jpg" alt="Фото" />
    </div>
  </div>
</div>
```

```js
const slider = new Tvist('.tvist-v1', {
  video: true, // все настройки по умолчанию
})
```

## Опции video

```js
const slider = new Tvist('.tvist-v1', {
  video: {
    autoplay: true,       // воспроизводить при активации слайда (default: true)
    muted: true,          // начинать с выключенным звуком (default: true)
    loop: false,          // зациклить видео (default: false)
    playsinline: true,    // playsinline для iOS (default: true)
    pauseOnLeave: true,   // пауза при уходе со слайда (default: true)
    resetOnLeave: false,  // сбрасывать на начало (default: false)
  }
})
```

## Autoplay + видео

Ключевая возможность — `waitForVideo`: автопрокрутка ждёт окончания видео на видео-слайдах, а для фото-слайдов использует стандартный таймер.

```js
const slider = new Tvist('.tvist-v1', {
  video: true,
  autoplay: {
    delay: 5000,           // 5 сек для фото-слайдов
    waitForVideo: true,    // для видео — ждём окончания
    pauseOnHover: true,
  }
})
```

## Hero-баннер с фоновым видео

```js
// Одно зацикленное видео на весь экран
const slider = new Tvist('.tvist-v1', {
  video: {
    autoplay: true,
    muted: true,
    loop: true,
    playsinline: true,
  },
  // autoplay слайдера не нужен — видео крутится само
})
```

## Управление звуком

Все видео стартуют с `muted: true` — это обязательно для автовоспроизведения в браузерах. Звук можно включить после жеста пользователя:

```js
const slider = new Tvist('.tvist-v1', {
  video: true,
})

// Кнопка включения звука
document.querySelector('.sound-btn').addEventListener('click', () => {
  if (slider.video.isMuted()) {
    slider.video.unmute()
  } else {
    slider.video.mute()
  }
})
```

## Прогресс-бар

Используйте события `videoProgress` и `autoplayProgress` для отображения прогресса:

```js
const slider = new Tvist('.tvist-v1', {
  video: true,
  autoplay: { delay: 5000, waitForVideo: true },
})

const progressBar = document.querySelector('.progress-fill')

// Прогресс видео (0..1)
slider.on('videoProgress', ({ progress }) => {
  progressBar.style.width = progress * 100 + '%'
})

// Прогресс таймера autoplay для фото-слайдов (0..1)
slider.on('autoplayProgress', ({ progress }) => {
  progressBar.style.width = progress * 100 + '%'
})

// Сброс при смене слайда
slider.on('slideChangeStart', () => {
  progressBar.style.width = '0%'
})
```

## YouTube / Vimeo iframe

Для iframe-видео управление только через GET-параметры. Модуль автоматически добавит нужные параметры:

```html
<div class="tvist-v1__slide">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
</div>
<div class="tvist-v1__slide">
  <iframe src="https://player.vimeo.com/video/123456"></iframe>
</div>
```

```js
const slider = new Tvist('.tvist-v1', {
  video: true, // автоматически добавит ?autoplay=1&mute=1 и allow="autoplay"
})
```

::: warning Ограничения iframe
- Нет доступа к прогрессу и событию `ended` (ограничение CORS)
- `waitForVideo` работает только с HTML `<video>`, для iframe используется fallback на таймер
- Управление только через перезагрузку `src` с GET-параметрами
:::

## События

```js
slider.on('videoReady', ({ slide, video, index }) => {
  console.log('Видео готово:', index)
})

slider.on('videoPlay', ({ slide, video, index }) => {
  console.log('Видео играет:', index)
})

slider.on('videoPause', ({ slide, video, index }) => {
  console.log('Видео на паузе:', index)
})

slider.on('videoEnded', ({ slide, video, index }) => {
  console.log('Видео закончилось:', index)
})

slider.on('videoProgress', ({ slide, video, index, progress, currentTime, duration }) => {
  console.log(`Прогресс: ${(progress * 100).toFixed(1)}%`)
})
```

## Публичное API

```js
const slider = new Tvist('.tvist-v1', { video: true })

// Управление воспроизведением
slider.video.play()         // воспроизвести на текущем слайде
slider.video.play(2)        // воспроизвести на слайде #2
slider.video.pause()        // пауза на текущем слайде
slider.video.pause(2)       // пауза на слайде #2

// Звук
slider.video.mute()         // выключить звук
slider.video.unmute()       // включить звук (после жеста)
slider.video.isMuted()      // проверить состояние
```

## Как выключить autoplay

| Способ | Описание |
|--------|----------|
| `autoplay: false` | Полностью выключен (по умолчанию) |
| Не указывать `autoplay` | Эквивалентно `false` |
| `slider.autoplay.stop()` | Программно остановить |
| `slider.autoplay.pause()` | Пауза (потом `resume()`) |
| `updateOptions({ autoplay: false })` | Динамическое выключение |
| `autoplay: { disableOnInteraction: true }` | Выключится после первого взаимодействия |

## Подводные камни

### Autoplay Policy браузеров
Видео может автоматически воспроизводиться только если оно `muted`. Всегда стартуйте с `muted: true` и предоставляйте кнопку для включения звука.

### iOS Safari
- Требует атрибут `playsinline`, иначе видео открывается на весь экран
- После unmute нужен хак с `currentTime` (модуль делает это автоматически)
- В Low Power Mode autoplay может быть отключён

### play() Promise
`video.play()` возвращает Promise. При быстром переключении слайдов может возникнуть `AbortError` — модуль обрабатывает это автоматически.
