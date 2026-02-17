# Свойства

Все свойства слайдера доступны только для чтения.

## Список свойств

### Идентификация
- [`id`](#id) - Уникальный ID инстанса
- [`tvistInstance`](#tvistinstance) - Доступ к инстансу через root элемент

### Доступ к элементам
- [`root`](#root) - Корневой элемент слайдера
- [`container`](#container) - Контейнер слайдов
- [`slides`](#slides) - Массив всех слайдов

### Состояние
- [`activeIndex`](#activeindex) - Текущий индекс активного слайда
- [`realIndex`](#realindex) - Реальный индекс (для loop режима)
- [`canScrollNext`](#canscrollnext) - Можно ли листать вперёд
- [`canScrollPrev`](#canscrollprev) - Можно ли листать назад

### Ядро
- [`engine`](#engine) - Экземпляр Engine (ядро расчётов)
- [`options`](#options) - Текущие опции слайдера

---

## Идентификация

### id

```typescript
readonly id: string
```

Уникальный идентификатор инстанса слайдера. Генерируется автоматически при создании в формате `tvist-{UUID}`.

**Особенности:**
- ID гарантированно уникален (использует UUID v4)
- В современных браузерах использует `crypto.randomUUID()` для криптографически стойкой генерации
- Fallback для старых браузеров: генерация UUID v4 через `Math.random()`
- Уникальность гарантирована даже при:
  - Двойном подключении скриптов
  - Использовании разных версий библиотеки на одной странице
  - Быстром создании множества инстансов
  - Работе в iframe
- Формат: `tvist-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Вероятность коллизии: практически нулевая (~1 на 5.3×10³⁶)

**Примеры:**

```javascript
const slider1 = new Tvist('.slider-1')
const slider2 = new Tvist('.slider-2')

console.log(slider1.id) // 'tvist-a1b2c3d4-e5f6-4789-a012-3456789abcde'
console.log(slider2.id) // 'tvist-f7e8d9c0-b1a2-4345-6789-0abcdef12345'

// Использование для аналитики
slider1.on('slideChangeStart', (index) => {
  analytics.track('slide_change', {
    sliderId: slider1.id,
    slideIndex: index
  })
})

// Использование для отладки
console.log(`[${slider1.id}] Active index: ${slider1.activeIndex}`)

// Хранение инстансов в Map
const sliders = new Map()
sliders.set(slider1.id, slider1)
sliders.set(slider2.id, slider2)

// Получение инстанса по ID
const slider = sliders.get('tvist-a1b2c3d4-e5f6-4789-a012-3456789abcde')
```

### tvistInstance

```typescript
// Доступ через root элемент
element.tvistInstance?: Tvist | null
```

Ссылка на инстанс Tvist, сохранённая в свойстве `tvistInstance` корневого элемента. Позволяет получить доступ к слайдеру через DOM элемент.

**Примеры:**

```javascript
// Создание слайдера
const slider = new Tvist('.slider')

// Получение инстанса через DOM элемент
const element = document.querySelector('.slider')
const sliderInstance = element.tvistInstance

console.log(sliderInstance.id) // 'tvist-a1b2c3d4-e5f6-4789-a012-3456789abcde'
console.log(sliderInstance === slider) // true

// Использование в обработчиках событий
document.querySelectorAll('.slider').forEach(element => {
  element.addEventListener('click', () => {
    const slider = element.tvistInstance
    if (slider) {
      console.log(`Clicked on slider ${slider.id}`)
      slider.next()
    }
  })
})

// Проверка существования инстанса
const element = document.querySelector('.slider')
if (element.tvistInstance) {
  console.log('Слайдер уже инициализирован')
  element.tvistInstance.update()
} else {
  // Создаём новый инстанс
  new Tvist(element)
}

// Получение инстанса из события
slider.root.addEventListener('custom-event', (e) => {
  const slider = e.currentTarget.tvistInstance
  if (slider) {
    console.log(`Event from slider ${slider.id}`)
  }
})
```

**Важно:**
- При создании нового инстанса на том же элементе старый автоматически уничтожается
- После вызова `destroy()` свойство `tvistInstance` устанавливается в `null`
- Это свойство полезно для избежания повторной инициализации

```javascript
// Безопасная инициализация
function initSlider(element) {
  // Если инстанс уже существует, не создаём новый
  if (element.tvistInstance) {
    return element.tvistInstance
  }
  
  return new Tvist(element, {
    perPage: 3,
    gap: 20
  })
}

// Переинициализация с новыми опциями
function reinitSlider(element, newOptions) {
  // Уничтожаем старый инстанс если есть
  if (element.tvistInstance) {
    element.tvistInstance.destroy()
  }
  
  // Создаём новый
  return new Tvist(element, newOptions)
}
```

## Доступ к элементам

### root

```typescript
readonly root: HTMLElement
```

Корневой элемент слайдера (элемент, переданный в конструктор).

#### Классы состояний на root

Слайдер автоматически добавляет на `root` BEM-модификаторы в зависимости от состояния. Префикс берётся из `Tvist.CLASSES` (например, `tvist-v1`).

| Класс | Когда появляется |
|-------|-------------------|
| `tvist-v1--created` | Сразу после инициализации слайдера (до события `created`). Остаётся до вызова `destroy()`. |
| `tvist-v1--destroyed` | При вызове `destroy()`; класс добавляется в начале уничтожения и остаётся на элементе. |
| `tvist-v1--locked` | Когда контент полностью помещается в видимую область и прокрутка не нужна (стрелки отключаются, drag не стартует). Снимается при изменении размеров/опций, когда появляется возможность прокрутки. В режиме `loop: true` блокировка не применяется. |

Проверка в коде или стилях:

```javascript
// Проверка состояний
slider.root.classList.contains(Tvist.CLASSES.created)   // true после создания
slider.root.classList.contains(Tvist.CLASSES.destroyed) // true после destroy()
slider.root.classList.contains(Tvist.CLASSES.locked)   // true, если слайдер заблокирован
```

```css
/* Стили по состоянию */
.tvist-v1--created { /* слайдер инициализирован */ }
.tvist-v1--destroyed { /* слайдер уничтожен, можно скрыть или очистить */ }
.tvist-v1--locked { /* прокрутка недоступна */ }
```

**Примеры:**

```javascript
// Добавить класс к корневому элементу
slider.root.classList.add('custom-class')

// Получить размеры
console.log(slider.root.offsetWidth)
console.log(slider.root.offsetHeight)

// Применить стили
slider.root.style.maxWidth = '1200px'
```

### container

```typescript
readonly container: HTMLElement
```

Контейнер слайдов (элемент с классом `.tvist-v1__container`).

**Примеры:**

```javascript
// Получить размеры контейнера
console.log(slider.container.offsetWidth)

// Добавить слайд
const newSlide = document.createElement('div')
newSlide.className = 'tvist-v1__slide'
newSlide.textContent = 'Новый слайд'
slider.container.appendChild(newSlide)
slider.update()

// Применить стили к контейнеру
slider.container.style.willChange = 'transform'
```

### slides

```typescript
readonly slides: HTMLElement[]
```

Массив всех слайдов (только для чтения).

**Примеры:**

```javascript
// Количество слайдов
console.log(slider.slides.length)

// Перебор слайдов
slider.slides.forEach((slide, index) => {
  slide.classList.add('custom-slide-class')
  slide.dataset.index = String(index)
})

// Получить конкретный слайд
const firstSlide = slider.slides[0]
const lastSlide = slider.slides[slider.slides.length - 1]

// Найти слайд с условием
const activeSlide = slider.slides.find(slide => 
  slide.classList.contains('tvist-v1__slide--active')
)
```

## Состояние

### activeIndex

```typescript
readonly activeIndex: number
```

Текущий индекс активного слайда (начиная с 0).

**Примеры:**

```javascript
console.log(slider.activeIndex) // 0, 1, 2, ...

// Использование в условиях
if (slider.activeIndex === 0) {
  console.log('Первый слайд активен')
}

// Отображение номера слайда
document.querySelector('.slide-counter').textContent = 
  `${slider.activeIndex + 1} / ${slider.slides.length}`

// Проверка на последний слайд
if (slider.activeIndex === slider.slides.length - 1) {
  console.log('Это последний слайд')
}
```

### realIndex

```typescript
readonly realIndex?: number
```

Реальный (логический) индекс слайда. Используется в режиме `loop` для получения истинного индекса без учёта клонированных слайдов. В обычном режиме совпадает с `activeIndex`.

**Примеры:**

```javascript
// В loop режиме
console.log(slider.activeIndex) // Может быть -1, 0, 1, ..., length, length+1 (с клонами)
console.log(slider.realIndex)   // Всегда в диапазоне 0..length-1

// Использование для аналитики
analytics.track('slide_view', {
  logicalIndex: slider.realIndex,
  physicalIndex: slider.activeIndex
})

// В обычном режиме (без loop)
console.log(slider.activeIndex === slider.realIndex) // true
```

### canScrollNext

```typescript
readonly canScrollNext: boolean
```

Проверяет, можно ли листать вперёд.

**Примеры:**

```javascript
// Простая проверка
if (slider.canScrollNext) {
  slider.next()
}

// Управление UI
const nextBtn = document.querySelector('.next-btn')
nextBtn.disabled = !slider.canScrollNext

// Автоматическая прокрутка с проверкой
setInterval(() => {
  if (slider.canScrollNext) {
    slider.next()
  } else {
    slider.scrollTo(0) // Вернуться к началу
  }
}, 3000)
```

### canScrollPrev

```typescript
readonly canScrollPrev: boolean
```

Проверяет, можно ли листать назад.

**Примеры:**

```javascript
// Простая проверка
if (slider.canScrollPrev) {
  slider.prev()
}

// Управление UI
const prevBtn = document.querySelector('.prev-btn')
prevBtn.disabled = !slider.canScrollPrev

// Обновление состояния кнопок
function updateNavButtons() {
  prevBtn.disabled = !slider.canScrollPrev
  nextBtn.disabled = !slider.canScrollNext
}

slider.on('slideChangeStart', updateNavButtons)
```

## Ядро

### engine

```typescript
readonly engine: Engine
```

Экземпляр Engine - ядро расчёта позиций и анимаций (только для чтения). Используется для продвинутой работы с внутренними механизмами.

**Примеры:**

```javascript
// Получить размер слайда
console.log(slider.engine.slideSizeValue)

// Получить размер контейнера
console.log(slider.engine.containerSizeValue)

// Получить позицию слайда
const position = slider.engine.getSlidePosition(2)

// Проверить блокировку
if (slider.engine.isLocked) {
  console.log('Слайдер заблокирован (контент помещается в контейнер)')
}

// Получить границы прокрутки
const minScroll = slider.engine.getMinScrollPosition()
const maxScroll = slider.engine.getMaxScrollPosition()
```

### options

```typescript
readonly options: TvistOptions
```

Текущие опции слайдера (только для чтения). Для изменения опций используйте метод `updateOptions()`.

**Примеры:**

```javascript
// Чтение опций
console.log(slider.options.perPage)
console.log(slider.options.gap)
console.log(slider.options.speed)

// Проверка настроек
if (slider.options.loop) {
  console.log('Включен режим loop')
}

// ❌ Не делайте так (не будет работать)
slider.options.perPage = 3

// ✅ Используйте updateOptions
slider.updateOptions({ perPage: 3 })

// Сохранение конфигурации
const config = { ...slider.options }
localStorage.setItem('sliderConfig', JSON.stringify(config))
```

## Примеры использования свойств

### Создание счётчика слайдов

```javascript
function updateCounter() {
  const counter = document.querySelector('.slide-counter')
  counter.textContent = `${slider.activeIndex + 1} / ${slider.slides.length}`
}

slider.on('slideChangeStart', updateCounter)
updateCounter()
```

### Управление состоянием кнопок навигации

```javascript
const prevBtn = document.querySelector('.prev-btn')
const nextBtn = document.querySelector('.next-btn')

function updateButtons() {
  prevBtn.disabled = !slider.canScrollPrev
  nextBtn.disabled = !slider.canScrollNext
  
  // Визуальные классы
  prevBtn.classList.toggle('disabled', !slider.canScrollPrev)
  nextBtn.classList.toggle('disabled', !slider.canScrollNext)
}

slider.on('slideChangeStart', updateButtons)
updateButtons()
```

### Отображение прогресса

```javascript
function updateProgress() {
  const progress = (slider.activeIndex / (slider.slides.length - 1)) * 100
  document.querySelector('.progress-bar').style.width = `${progress}%`
}

slider.on('slideChangeStart', updateProgress)
updateProgress()
```

### Применение классов к активному слайду

```javascript
// SlideStatesModule уже проставляет .tvist-v1__slide--active.
// Если нужно своё поведение:
const activeClass = 'tvist-v1__slide--active'
slider.on('slideChangeStart', (index) => {
  slider.slides.forEach(slide => slide.classList.remove(activeClass))
  slider.slides[index]?.classList.add(activeClass)
})
```

### Адаптивное поведение на основе размеров

```javascript
slider.on('resized', () => {
  const width = slider.root.offsetWidth
  
  if (width < 768) {
    slider.updateOptions({ perPage: 1, gap: 10 })
  } else if (width < 1024) {
    slider.updateOptions({ perPage: 2, gap: 20 })
  } else {
    slider.updateOptions({ perPage: 3, gap: 30 })
  }
})
```

### Управление несколькими слайдерами через ID

```javascript
// Создаём несколько слайдеров
const sliders = new Map()

document.querySelectorAll('.slider').forEach(element => {
  const slider = new Tvist(element, {
    perPage: 3,
    gap: 20
  })
  
  // Сохраняем по ID
  sliders.set(slider.id, slider)
  
  console.log(`Создан слайдер ${slider.id}`)
})

// Получение слайдера по ID
const slider = sliders.get('tvist-1')
if (slider) {
  slider.next()
}

// Управление всеми слайдерами
sliders.forEach((slider, id) => {
  console.log(`Слайдер ${id}: активный слайд ${slider.activeIndex}`)
})
```

### Получение инстанса через DOM элемент

```javascript
// Инициализация слайдеров
document.querySelectorAll('.slider').forEach(element => {
  new Tvist(element, {
    perPage: 2,
    gap: 15
  })
})

// Позже получаем инстанс через элемент
const element = document.querySelector('.slider')
const slider = element.tvistInstance

if (slider) {
  console.log(`Слайдер ${slider.id} найден`)
  slider.scrollTo(2)
}

// Безопасная переинициализация
function reinitSlider(selector, newOptions) {
  const element = document.querySelector(selector)
  
  if (element.tvistInstance) {
    console.log(`Уничтожаем старый слайдер ${element.tvistInstance.id}`)
    element.tvistInstance.destroy()
  }
  
  return new Tvist(element, newOptions)
}

// Использование
const slider = reinitSlider('.slider', {
  perPage: 4,
  gap: 30
})
```

### Аналитика и отладка с использованием ID

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,
  autoplay: 3000
})

// Логирование с ID слайдера
slider.on('slideChangeStart', (index) => {
  console.log(`[${slider.id}] Переход на слайд ${index}`)
})

// Отправка аналитики
slider.on('slideChangeStart', (index) => {
  analytics.track('slide_view', {
    sliderId: slider.id,
    slideIndex: index,
    timestamp: Date.now()
  })
})

// Отладка нескольких слайдеров
const sliders = [
  new Tvist('.slider-1'),
  new Tvist('.slider-2'),
  new Tvist('.slider-3')
]

sliders.forEach(slider => {
  slider.on('slideChangeStart', (index) => {
    console.log(`[${slider.id}] activeIndex: ${index}`)
  })
})
```

### Синхронизация слайдеров с отслеживанием

```javascript
const mainSlider = new Tvist('.main-slider', {
  perPage: 1
})

const thumbsSlider = new Tvist('.thumbs-slider', {
  perPage: 5,
  gap: 10
})

console.log(`Главный слайдер: ${mainSlider.id}`)
console.log(`Превью слайдер: ${thumbsSlider.id}`)

// Синхронизация
mainSlider.sync(thumbsSlider)

// Отслеживание синхронизации
mainSlider.on('slideChangeStart', (index) => {
  console.log(`[${mainSlider.id}] → [${thumbsSlider.id}]: слайд ${index}`)
})
```
