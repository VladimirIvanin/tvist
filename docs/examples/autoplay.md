# Autoplay

Автоматическая прокрутка слайдов с настраиваемой задержкой и поведением.

## Базовый пример

<script setup>
import AutoplayBasicExample from '../.vitepress/theme/examples/AutoplayBasicExample.vue'
import AutoplayRewindExample from '../.vitepress/theme/examples/AutoplayRewindExample.vue'
</script>

<AutoplayBasicExample />

```js
const slider = new Tvist('.tvist-v1', {
  autoplay: { delay: 3000, pauseOnHover: true, pauseOnInteraction: true },
  pagination: {
    type: 'bullets',
    clickable: true
  }
})
```

## Autoplay с Rewind

Когда достигнут последний слайд, автоматически возвращаемся к первому. Работает без режима `loop`.

<AutoplayRewindExample />

```js
const slider = new Tvist('.tvist-v1', {
  autoplay: { delay: 2000, pauseOnHover: true },
  rewind: true, // автоматический возврат к началу
  loop: false, // rewind работает без loop
})
```

## Управление через API

```js
const slider = new Tvist('.tvist-v1', {
  autoplay: 3000
})

// Получить API autoplay
const autoplay = slider.autoplay

// Управление
autoplay.start()  // запустить
autoplay.stop()   // остановить
autoplay.pause()  // пауза
autoplay.resume() // возобновить

// Проверка состояния
autoplay.isRunning() // работает ли
autoplay.isPaused()  // на паузе ли
autoplay.isStopped() // остановлен ли
```

## Опции

### `autoplay`
- **Тип:** `number | boolean | object`
- **По умолчанию:** `false`
- **Описание:** Включает автопрокрутку. Поддерживает сокращённую запись и объект настроек:
  - `autoplay: true` — дефолтная задержка 3000мс, все настройки по умолчанию
  - `autoplay: 5000` — число задаёт задержку в мс, остальное по умолчанию
  - `autoplay: { delay: 3000, pauseOnHover: true, pauseOnInteraction: true }` — полный контроль
- **Свойства объекта:**
  - `delay` — задержка между переходами (мс)
  - `pauseOnHover` — пауза при наведении курсора (по умолчанию `true`)
  - `pauseOnInteraction` — пауза при любом взаимодействии: drag, click (по умолчанию `true`)
  - `disableOnInteraction` — полностью отключить после первого взаимодействия (по умолчанию `false`)
  - `waitForVideo` — для видео-слайдов: ждать окончания видео вместо таймера (по умолчанию `false`)

### `rewind`
- **Тип:** `boolean`
- **По умолчанию:** `false`
- **Описание:** Автоматически возвращаться к первому слайду после достижения последнего (работает без `loop`)

## События

```js
slider.on('autoplayStart', () => {
  console.log('Autoplay запущен')
})

slider.on('autoplayStop', () => {
  console.log('Autoplay остановлен')
})

slider.on('autoplayPause', () => {
  console.log('Autoplay на паузе')
})

slider.on('autoplayResume', () => {
  console.log('Autoplay возобновлён')
})
```

## Примеры использования

### С динамическим изменением задержки

```js
const slider = new Tvist('.tvist-v1', {
  autoplay: 3000
})

// Изменить задержку
slider.updateOptions({ autoplay: 1000 })
```

### С отключением после взаимодействия

```js
const slider = new Tvist('.tvist-v1', {
  autoplay: { delay: 3000, disableOnInteraction: true } // остановится после первого drag/click
})
```

### Rewind с ручной навигацией

```js
const slider = new Tvist('.tvist-v1', {
  rewind: true,
  arrows: true
})

// При клике на "next" на последнем слайде
// автоматически вернётся к первому
```
