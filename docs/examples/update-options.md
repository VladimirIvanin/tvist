# updateOptions - Динамическое изменение

Метод `updateOptions()` позволяет изменять настройки слайдера на лету без необходимости пересоздания экземпляра. Это аналог `swiper.updateParams()`.

<script setup>
import UpdateOptionsExample from '../.vitepress/theme/examples/UpdateOptionsExample.vue'
</script>

## Интерактивная демонстрация

Попробуйте изменять параметры в реальном времени и наблюдайте за изменениями слайдера:

<UpdateOptionsExample />

## Описание метода

```typescript
updateOptions(newOptions: Partial<TvistOptions>): this
```

**Возвращает:** экземпляр слайдера для цепочки вызовов

### Поддерживаемые опции

Метод поддерживает динамическое изменение большинства опций:

#### Базовые настройки
- `perPage` - количество слайдов на странице
- `slideMinSize` - минимальный размер слайда
- `gap` - расстояние между слайдами
- `peek` - отступы слайдера
- `peekTrim` - обрезка peek на краях
- `speed` - скорость анимации
- `direction` - направление прокрутки
- `center` - центрирование активного слайда

#### Управление
- `drag` - включение/отключение перетаскивания
- `dragSpeed` - скорость перетаскивания
- `rubberband` - эффект резинки

#### Автопрокрутка
- `autoplay` - включение/настройка автопрокрутки
- `pauseOnHover` - пауза при наведении
- `pauseOnInteraction` - пауза при взаимодействии

#### События
- `on` - обработчики событий (заменяют предыдущие)

## Примеры использования

### Простое изменение опций

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  gap: 10
})

// Изменить количество слайдов
slider.updateOptions({ perPage: 3 })

// Изменить несколько опций
slider.updateOptions({
  perPage: 2,
  gap: 30,
  speed: 500
})
```

### Адаптация под размер экрана

```javascript
function updateSliderForScreen() {
  const width = window.innerWidth
  
  if (width < 768) {
    slider.updateOptions({ 
      perPage: 1, 
      gap: 10,
      peek: { left: 20, right: 20 }
    })
  } else if (width < 1024) {
    slider.updateOptions({ 
      perPage: 2, 
      gap: 20,
      peek: 0
    })
  } else {
    slider.updateOptions({ 
      perPage: 3, 
      gap: 30,
      peek: 0
    })
  }
}

window.addEventListener('resize', updateSliderForScreen)
updateSliderForScreen()
```

### Переключение направления

```javascript
const toggleBtn = document.querySelector('.toggle-direction')

toggleBtn.addEventListener('click', () => {
  const current = slider.options.direction
  slider.updateOptions({
    direction: current === 'horizontal' ? 'vertical' : 'horizontal'
  })
})
```

### Управление автопрокруткой

```javascript
// Включить автопрокрутку
document.querySelector('.enable-autoplay').addEventListener('click', () => {
  slider.updateOptions({ autoplay: 3000 })
})

// Отключить автопрокрутку
document.querySelector('.disable-autoplay').addEventListener('click', () => {
  slider.updateOptions({ autoplay: false })
})

// Изменить скорость
document.querySelector('.speed-slider').addEventListener('input', (e) => {
  slider.updateOptions({ autoplay: parseInt(e.target.value) })
})
```

### Динамическое изменение peek

```javascript
const peekSlider = document.querySelector('.peek-control')

peekSlider.addEventListener('input', (e) => {
  const value = parseInt(e.target.value)
  
  slider.updateOptions({
    peek: { left: value, right: value }
  })
})
```

### Обновление обработчиков событий

```javascript
// Изначальный обработчик
const slider = new Tvist('.slider', {
  on: {
    slideChange: (index) => {
      console.log('Слайд 1:', index)
    }
  }
})

// Заменить обработчик
slider.updateOptions({
  on: {
    slideChange: (index) => {
      console.log('Слайд 2:', index)
      // Новая логика
      updateAnalytics(index)
    }
  }
})
```

### Цепочка вызовов

```javascript
slider
  .updateOptions({ perPage: 3, gap: 20 })
  .scrollTo(0)
  .updateOptions({ speed: 500 })
```

## События

### optionsUpdated

При вызове `updateOptions()` генерируется событие `optionsUpdated`:

```javascript
slider.on('optionsUpdated', (tvist, newOptions) => {
  console.log('Обновлены опции:', newOptions)
  
  // Выполнить дополнительную логику
  if (newOptions.perPage) {
    console.log('Изменено количество слайдов на:', newOptions.perPage)
    updatePaginationUI()
  }
  
  if (newOptions.direction) {
    console.log('Изменено направление на:', newOptions.direction)
    updateLayoutClasses()
  }
})
```

## Пресеты конфигураций

Удобно создавать пресеты для разных сценариев:

```javascript
const presets = {
  mobile: {
    perPage: 1,
    gap: 10,
    peek: { left: 20, right: 20 }
  },
  
  tablet: {
    perPage: 2,
    gap: 20,
    peek: 0
  },
  
  desktop: {
    perPage: 4,
    gap: 30,
    peek: 0
  },
  
  gallery: {
    perPage: 1,
    gap: 0,
    center: true,
    peek: { left: 80, right: 80 },
    autoplay: 3000
  }
}

// Применить пресет
function applyPreset(name) {
  slider.updateOptions(presets[name])
}

// Использование
applyPreset('mobile')
applyPreset('gallery')
```

## Сравнение с пересозданием

### ❌ Старый подход (пересоздание)

```javascript
// Уничтожаем
const currentIndex = slider.activeIndex
slider.destroy()

// Создаём заново
slider = new Tvist('.slider', {
  perPage: 4,
  gap: 30,
  start: currentIndex // Восстанавливаем позицию
})
```

### ✅ Новый подход (updateOptions)

```javascript
// Просто обновляем
slider.updateOptions({
  perPage: 4,
  gap: 30
})
// Позиция сохраняется автоматически
```

**Преимущества:**
- ⚡ Быстрее (нет пересоздания DOM)
- 💾 Сохраняет состояние (позиция, активные модули)
- 🎯 Проще в использовании
- 🔄 Поддерживает цепочку вызовов

## Ограничения

Некоторые опции требуют полного пересоздания слайдера:

- Изменение `loop` (требуется реинициализация клонов)
- Регистрация новых модулей
- Опции, связанные с изначальной DOM-структурой

Для таких случаев используйте подход с `destroy()` и созданием нового экземпляра.

## React интеграция

```typescript
import { useEffect, useRef } from 'react'
import Tvist from 'tvist'

function Slider({ perPage, gap, speed }) {
  const sliderRef = useRef<Tvist | null>(null)

  // Создание слайдера
  useEffect(() => {
    sliderRef.current = new Tvist('.slider', {
      perPage,
      gap,
      speed
    })
    
    return () => sliderRef.current?.destroy()
  }, [])

  // Обновление опций при изменении props
  useEffect(() => {
    sliderRef.current?.updateOptions({ perPage, gap, speed })
  }, [perPage, gap, speed])

  return <div className="slider">...</div>
}
```

## Vue интеграция

```vue
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Tvist from 'tvist'

const props = defineProps({
  perPage: { type: Number, default: 3 },
  gap: { type: Number, default: 20 },
  speed: { type: Number, default: 300 }
})

const sliderEl = ref(null)
let slider = null

onMounted(() => {
  slider = new Tvist(sliderEl.value, {
    perPage: props.perPage,
    gap: props.gap,
    speed: props.speed
  })
})

onUnmounted(() => {
  slider?.destroy()
})

// Обновление при изменении props
watch(() => [props.perPage, props.gap, props.speed], ([perPage, gap, speed]) => {
  slider?.updateOptions({ perPage, gap, speed })
})
</script>

<template>
  <div ref="sliderEl" class="tvist">
    <slot />
  </div>
</template>
```

## Полезные ссылки

- [Методы API](/api/methods) - Все методы слайдера
- [Опции](/api/options) - Полный список опций
- [События](/api/events) - Работа с событиями
