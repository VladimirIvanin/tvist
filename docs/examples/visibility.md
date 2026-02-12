# Visibility - Отслеживание видимости

Модуль `visibility` автоматически приостанавливает работу autoplay и marquee, когда слайдер скрыт через CSS (`display: none`, `visibility: hidden`), и возобновляет их при появлении.

## Зачем это нужно?

Когда слайдер скрыт (например, в табе, модальном окне или на мобильных устройствах), autoplay и marquee продолжают работать в фоне, потребляя ресурсы процессора. Модуль `visibility` решает эту проблему, автоматически приостанавливая их работу.

## Базовое использование

```typescript
import Tvist from 'tvist'

const slider = new Tvist('.tvist-v1', {
  autoplay: 3000,
  visibility: true, // Включаем отслеживание видимости
})
```

## Опции

```typescript
interface VisibilityOptions {
  /**
   * Приостанавливать autoplay когда слайдер скрыт
   * @default true
   */
  pauseAutoplay?: boolean

  /**
   * Приостанавливать marquee когда слайдер скрыт
   * @default true
   */
  pauseMarquee?: boolean

  /**
   * Порог видимости для IntersectionObserver (0..1)
   * 0 = считается видимым если хоть что-то видно
   * 1 = считается видимым только если виден полностью
   * @default 0
   */
  threshold?: number
}
```

## Примеры использования

<script setup>
import VisibilityAutoplayExample from '../.vitepress/theme/examples/VisibilityAutoplayExample.vue'
import VisibilityMarqueeExample from '../.vitepress/theme/examples/VisibilityMarqueeExample.vue'
</script>

### С Autoplay

<VisibilityAutoplayExample />

### С Marquee

<VisibilityMarqueeExample />

## Как это работает

Модуль использует два механизма отслеживания:

1. **IntersectionObserver** - отслеживает, находится ли слайдер в видимой области viewport
2. **Периодическая проверка CSS** - проверяет каждые 500ms свойства `display` и `visibility` у слайдера и всех его родителей

Когда слайдер скрывается, модуль:
- Приостанавливает autoplay (если `pauseAutoplay: true`)
- Приостанавливает marquee (если `pauseMarquee: true`)
- Эмитит событие `sliderHidden`

Когда слайдер появляется, модуль:
- Возобновляет autoplay (если он был запущен)
- Возобновляет marquee (если он был запущен)
- Эмитит событие `sliderVisible`

## События

```typescript
const slider = new Tvist('.tvist-v1', {
  visibility: true,
  on: {
    sliderHidden: () => {
      console.log('Слайдер скрыт')
    },
    sliderVisible: () => {
      console.log('Слайдер виден')
    },
  },
})
```

## API

```typescript
const visibilityModule = slider.modules.get('visibility')
const api = visibilityModule?.getVisibility()

// Проверить текущую видимость
const isVisible = api.isVisible()

// Принудительно проверить видимость
api.check()
```

## Производительность

Модуль использует эффективные механизмы отслеживания:
- IntersectionObserver работает асинхронно и не блокирует основной поток
- Проверка CSS выполняется только каждые 500ms
- При скрытии слайдера autoplay и marquee полностью останавливают свои таймеры/RAF

Это позволяет значительно снизить нагрузку на процессор, особенно когда на странице несколько слайдеров или слайдер находится в скрытом табе.
