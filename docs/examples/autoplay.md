# Autoplay

Автоматическая прокрутка слайдов с настраиваемой задержкой и поведением.

## Базовый пример

<script setup>
import AutoplayBasicExample from '../.vitepress/theme/examples/AutoplayBasicExample.vue'
import AutoplayRewindExample from '../.vitepress/theme/examples/AutoplayRewindExample.vue'
</script>

<AutoplayBasicExample />

```js
const slider = new Tvist('.tvist-v0', {
  autoplay: 3000, // задержка в миллисекундах
  pauseOnHover: true, // пауза при наведении
  pauseOnInteraction: true, // пауза при взаимодействии
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
const slider = new Tvist('.tvist-v0', {
  autoplay: 2000,
  rewind: true, // автоматический возврат к началу
  loop: false, // rewind работает без loop
  pauseOnHover: true
})
```

## Управление через API

```js
const slider = new Tvist('.tvist-v0', {
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
- **Тип:** `number | boolean`
- **По умолчанию:** `false`
- **Описание:** Включает автопрокрутку. Число - задержка в миллисекундах, `true` - дефолтная задержка 3000мс

### `rewind`
- **Тип:** `boolean`
- **По умолчанию:** `false`
- **Описание:** Автоматически возвращаться к первому слайду после достижения последнего (работает без `loop`)

### `pauseOnHover`
- **Тип:** `boolean`
- **По умолчанию:** `true`
- **Описание:** Ставить автопрокрутку на паузу при наведении курсора

### `pauseOnInteraction`
- **Тип:** `boolean`
- **По умолчанию:** `true`
- **Описание:** Ставить автопрокрутку на паузу при любом взаимодействии (drag, click)

### `disableOnInteraction`
- **Тип:** `boolean`
- **По умолчанию:** `false`
- **Описание:** Полностью отключить автопрокрутку после первого взаимодействия пользователя

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
const slider = new Tvist('.tvist-v0', {
  autoplay: 3000
})

// Изменить задержку
slider.updateOptions({ autoplay: 1000 })
```

### С отключением после взаимодействия

```js
const slider = new Tvist('.tvist-v0', {
  autoplay: 3000,
  disableOnInteraction: true // остановится после первого drag/click
})
```

### Rewind с ручной навигацией

```js
const slider = new Tvist('.tvist-v0', {
  rewind: true,
  arrows: true
})

// При клике на "next" на последнем слайде
// автоматически вернётся к первому
```
