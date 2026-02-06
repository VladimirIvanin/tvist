# Свойства

Все свойства слайдера доступны только для чтения.

## Список свойств

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

## Доступ к элементам

### root

```typescript
readonly root: HTMLElement
```

Корневой элемент слайдера (элемент, переданный в конструктор).

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

Контейнер слайдов (элемент с классом `.tvist-v0__container`).

**Примеры:**

```javascript
// Получить размеры контейнера
console.log(slider.container.offsetWidth)

// Добавить слайд
const newSlide = document.createElement('div')
newSlide.className = 'tvist-v0__slide'
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
  slide.classList.contains('tvist-v0__slide--active')
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

slider.on('slideChange', updateNavButtons)
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

slider.on('slideChange', updateCounter)
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

slider.on('slideChange', updateButtons)
updateButtons()
```

### Отображение прогресса

```javascript
function updateProgress() {
  const progress = (slider.activeIndex / (slider.slides.length - 1)) * 100
  document.querySelector('.progress-bar').style.width = `${progress}%`
}

slider.on('slideChange', updateProgress)
updateProgress()
```

### Применение классов к активному слайду

```javascript
slider.on('slideChange', (index) => {
  // Убрать класс у всех слайдов
  slider.slides.forEach(slide => {
    slide.classList.remove('is-active')
  })
  
  // Добавить класс активному слайду
  slider.slides[index]?.classList.add('is-active')
})
```

### Адаптивное поведение на основе размеров

```javascript
slider.on('resize', () => {
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
