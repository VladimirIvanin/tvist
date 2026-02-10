# Marquee (Бегущая строка)

Модуль `Marquee` реализует режим бегущей строки с непрерывной прокруткой контента.

<script setup>
import MarqueeDocExample from '../.vitepress/theme/examples/MarqueeDocExample.vue'
</script>

## Основные возможности

- ✅ Непрерывная прокрутка без остановок
- ✅ Настраиваемая скорость (пиксели в секунду)
- ✅ Поддержка всех направлений: left, right, up, down
- ✅ Пауза при наведении курсора
- ✅ Автоматическое включение Loop для бесшовной прокрутки
- ✅ Публичное API для управления

## Интерактивная демонстрация

<MarqueeDocExample />

## Базовый пример

```typescript
import Tvist from 'tvist'

const slider = new Tvist('.slider', {
  marquee: true, // Включить режим бегущей строки
  gap: 20
})
```

## Настройка скорости и направления

```typescript
const slider = new Tvist('.slider', {
  marquee: {
    speed: 100, // 100 пикселей в секунду
    direction: 'left', // left | right | up | down
    pauseOnHover: true // Пауза при наведении
  },
  gap: 20
})
```

## Направления

### Горизонтальная прокрутка

```typescript
// Прокрутка влево (по умолчанию для horizontal)
new Tvist('.slider', {
  marquee: { direction: 'left' }
})

// Прокрутка вправо
new Tvist('.slider', {
  marquee: { direction: 'right' }
})
```

### Вертикальная прокрутка

```typescript
// Прокрутка вверх (по умолчанию для vertical)
new Tvist('.slider', {
  direction: 'vertical',
  marquee: { direction: 'up' }
})

// Прокрутка вниз
new Tvist('.slider', {
  direction: 'vertical',
  marquee: { direction: 'down' }
})
```

## Публичное API

```typescript
const slider = new Tvist('.slider', {
  marquee: true
})

// Получить модуль
const marquee = slider.modules.get('marquee')?.getMarquee()

// Управление
marquee.start()   // Запустить
marquee.stop()    // Остановить
marquee.pause()   // Пауза
marquee.resume()  // Возобновить

// Статус
marquee.isRunning() // true/false
marquee.isPaused()  // true/false
marquee.isStopped() // true/false

// Изменение параметров
marquee.setSpeed(200)           // Изменить скорость
marquee.setDirection('right')   // Изменить направление
marquee.getSpeed()              // Получить текущую скорость
marquee.getDirection()          // Получить текущее направление
```

## События

```typescript
const slider = new Tvist('.slider', {
  marquee: true,
  on: {
    marqueeStart: () => console.log('Marquee started'),
    marqueeStop: () => console.log('Marquee stopped'),
    marqueePause: () => console.log('Marquee paused'),
    marqueeResume: () => console.log('Marquee resumed')
  }
})
```

## Динамическое включение/выключение

```typescript
const slider = new Tvist('.slider', {
  marquee: false
})

// Включить marquee
slider.updateOptions({
  marquee: {
    speed: 80,
    direction: 'left'
  }
})

// Выключить marquee
slider.updateOptions({
  marquee: false
})
```

## Примеры использования

### Логотипы партнёров

```html
<div class="partners-slider">
  <div class="tvist-v1">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">
        <img src="logo1.png" alt="Partner 1">
      </div>
      <div class="tvist-v1__slide">
        <img src="logo2.png" alt="Partner 2">
      </div>
      <div class="tvist-v1__slide">
        <img src="logo3.png" alt="Partner 3">
      </div>
      <!-- ... -->
    </div>
  </div>
</div>
```

```typescript
new Tvist('.partners-slider .tvist', {
  marquee: {
    speed: 50,
    pauseOnHover: true
  },
  gap: 40
})
```

### Бегущая строка новостей

```html
<div class="news-ticker">
  <div class="tvist-v1">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">
        <span class="news-item">🔥 Новость 1</span>
      </div>
      <div class="tvist-v1__slide">
        <span class="news-item">📢 Новость 2</span>
      </div>
      <div class="tvist-v1__slide">
        <span class="news-item">⚡ Новость 3</span>
      </div>
    </div>
  </div>
</div>
```

```typescript
new Tvist('.news-ticker .tvist', {
  marquee: {
    speed: 100,
    direction: 'left',
    pauseOnHover: false // Не останавливать при наведении
  },
  gap: 60
})
```

### Вертикальная бегущая строка

```typescript
new Tvist('.vertical-ticker', {
  direction: 'vertical',
  marquee: {
    speed: 30,
    direction: 'up'
  },
  gap: 20
})
```

## Особенности

### Автоматическое клонирование

Модуль автоматически клонирует все слайды для создания бесшовного эффекта бегущей строки. Вам не нужно дублировать контент вручную.

### Отключение drag

В режиме marquee перетаскивание (drag) автоматически отключается, так как это противоречит концепции непрерывной прокрутки.

### Производительность

Модуль использует `requestAnimationFrame` для плавной анимации с частотой 60 FPS и `translate3d` для аппаратного ускорения.

## Совместимость с другими модулями

Модуль Marquee **не совместим** с:
- Drag (автоматически отключается)
- Loop (marquee сам реализует loop)
- Autoplay (marquee - это уже автоматическая прокрутка)

Модуль Marquee **совместим** с:
- Breakpoints (можно включать/выключать на разных экранах)
- Grid (для создания многорядных бегущих строк)

## Адаптивность

```typescript
new Tvist('.slider', {
  marquee: false, // По умолчанию выключен
  breakpoints: {
    768: {
      marquee: {
        speed: 50,
        direction: 'left'
      }
    },
    1024: {
      marquee: {
        speed: 80,
        direction: 'left'
      }
    }
  }
})
```
