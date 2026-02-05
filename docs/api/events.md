# События

События можно подписывать двумя способами: через опцию `on` при инициализации или через метод `on()`.

## Подписка на события

### Через опцию `on`

```javascript
const slider = new Tvist('.slider', {
  on: {
    slideChange: (index) => {
      console.log('Слайд изменился:', index)
    },
    resize: () => {
      console.log('Размер изменился')
    }
  }
})
```

### Через метод `on()`

```javascript
slider.on('slideChange', (index) => {
  console.log('Слайд изменился:', index)
})

slider.on('resize', () => {
  console.log('Размер изменился')
})
```

### Отписка от событий

```javascript
const handler = (index) => console.log(index)

// Подписка
slider.on('slideChange', handler)

// Отписка от конкретного обработчика
slider.off('slideChange', handler)

// Отписка от всех обработчиков события
slider.off('slideChange')
```

### Подписка на одно срабатывание

```javascript
slider.once('slideChange', (index) => {
  console.log('Выполнится только один раз:', index)
})
```

## Lifecycle события

События жизненного цикла слайдера.

### created

```typescript
created: (tvist: Tvist) => void
```

Вызывается после создания и инициализации слайдера.

**Параметры:**
- `tvist` - экземпляр слайдера

**Примеры:**

```javascript
const slider = new Tvist('.slider', {
  on: {
    created: (tvist) => {
      console.log('Слайдер создан')
      console.log('Количество слайдов:', tvist.slides.length)
      
      // Инициализация дополнительной логики
      initCustomFeatures(tvist)
    }
  }
})
```

### destroyed

```typescript
destroyed: (tvist: Tvist) => void
```

Вызывается перед уничтожением слайдера.

**Параметры:**
- `tvist` - экземпляр слайдера

**Примеры:**

```javascript
slider.on('destroyed', (tvist) => {
  console.log('Слайдер уничтожен')
  
  // Очистка пользовательских ресурсов
  cleanupCustomFeatures(tvist)
})
```

### optionsUpdated

```typescript
optionsUpdated: (tvist: Tvist, newOptions: Partial<TvistOptions>) => void
```

Вызывается после динамического обновления опций через `updateOptions()`.

**Параметры:**
- `tvist` - экземпляр слайдера
- `newOptions` - объект с обновлёнными опциями

**Примеры:**

```javascript
slider.on('optionsUpdated', (tvist, newOptions) => {
  console.log('Обновлены опции:', newOptions)
  
  if (newOptions.perPage) {
    console.log('Изменено количество слайдов на:', newOptions.perPage)
  }
  
  if (newOptions.direction) {
    console.log('Изменено направление на:', newOptions.direction)
  }
})
```

## События навигации

События, связанные с переключением слайдов.

### beforeSlideChange

```typescript
beforeSlideChange: (index: number) => void
```

Вызывается перед началом смены слайда (до начала анимации).

**Параметры:**
- `index` - индекс целевого слайда

**Примеры:**

```javascript
slider.on('beforeSlideChange', (index) => {
  console.log('Начинается переход к слайду:', index)
  
  // Можно отменить действия или подготовить UI
  showLoadingIndicator()
})
```

### slideChange

```typescript
slideChange: (index: number) => void
```

Вызывается при начале смены слайда (начало анимации).

**Параметры:**
- `index` - индекс нового активного слайда

**Примеры:**

```javascript
slider.on('slideChange', (index) => {
  console.log(`Переход к слайду ${index + 1}`)
  
  // Обновление UI
  document.querySelector('.current-slide').textContent = index + 1
  
  // Обновление URL
  history.pushState(null, '', `#slide-${index}`)
})
```

### slideChanged

```typescript
slideChanged: (index: number) => void
```

Вызывается после завершения смены слайда (конец анимации).

**Параметры:**
- `index` - индекс нового активного слайда

**Примеры:**

```javascript
slider.on('slideChanged', (index) => {
  console.log('Завершён переход к слайду:', index)
  
  // Ленивая загрузка для следующего слайда
  const nextSlide = slider.slides[index + 1]
  if (nextSlide) {
    lazyLoadImages(nextSlide)
  }
  
  hideLoadingIndicator()
})
```

## События взаимодействия

События, связанные с пользовательским взаимодействием.

### dragStart

```typescript
dragStart: () => void
```

Вызывается при начале перетаскивания (mousedown или touchstart).

**Примеры:**

```javascript
slider.on('dragStart', () => {
  console.log('Начато перетаскивание')
  
  // Приостановить автопрокрутку
  slider.root.classList.add('is-dragging')
  
  // Отключить другие взаимодействия
  disableOtherInteractions()
})
```

### drag

```typescript
drag: () => void
```

Вызывается во время перетаскивания (mousemove или touchmove).

**Примеры:**

```javascript
slider.on('drag', () => {
  // Обновление индикаторов
  updateDragIndicator()
  
  // Отслеживание аналитики
  trackDragDistance()
})
```

### dragEnd

```typescript
dragEnd: () => void
```

Вызывается при завершении перетаскивания (mouseup или touchend).

**Примеры:**

```javascript
slider.on('dragEnd', () => {
  console.log('Завершено перетаскивание')
  
  slider.root.classList.remove('is-dragging')
  
  // Возобновить другие взаимодействия
  enableOtherInteractions()
})
```

## События обновления

События, связанные с изменением состояния слайдера.

### scroll

```typescript
scroll: () => void
```

Вызывается при прокрутке (во время анимации перехода между слайдами).

**Примеры:**

```javascript
slider.on('scroll', () => {
  // Обновление parallax эффекта
  updateParallax()
  
  // Обновление прогресс-бара
  const progress = Math.abs(slider.engine.location.get())
  updateProgressBar(progress)
})
```

### resize

```typescript
resize: () => void
```

Вызывается при изменении размера контейнера слайдера.

**Примеры:**

```javascript
slider.on('resize', () => {
  console.log('Размер контейнера изменился')
  
  // Адаптивное изменение настроек
  const width = slider.root.offsetWidth
  if (width < 768) {
    slider.updateOptions({ perPage: 1 })
  } else {
    slider.updateOptions({ perPage: 3 })
  }
})
```

### breakpoint

```typescript
breakpoint: (breakpoint: number | null) => void
```

Вызывается при смене breakpoint (активация адаптивных настроек).

**Параметры:**
- `breakpoint` - значение активного breakpoint в пикселях, или `null` для базовых настроек

**Примеры:**

```javascript
slider.on('breakpoint', (breakpoint) => {
  if (breakpoint === null) {
    console.log('Активны базовые настройки')
  } else {
    console.log(`Активен breakpoint: ${breakpoint}px`)
  }
  
  // Обновление UI в зависимости от breakpoint
  updateUIForBreakpoint(breakpoint)
})
```

### lock

```typescript
lock: () => void
```

Вызывается при блокировке слайдера (когда весь контент помещается в контейнер и прокрутка не нужна).

**Примеры:**

```javascript
slider.on('lock', () => {
  console.log('Слайдер заблокирован')
  
  // Скрыть навигационные элементы
  document.querySelector('.slider-nav').style.display = 'none'
  
  // Добавить класс
  slider.root.classList.add('is-locked')
})
```

### unlock

```typescript
unlock: () => void
```

Вызывается при разблокировке слайдера.

**Примеры:**

```javascript
slider.on('unlock', () => {
  console.log('Слайдер разблокирован')
  
  // Показать навигационные элементы
  document.querySelector('.slider-nav').style.display = ''
  
  // Убрать класс
  slider.root.classList.remove('is-locked')
})
```

## Примеры использования

### Ленивая загрузка изображений

```javascript
slider.on('slideChange', (index) => {
  const slide = slider.slides[index]
  const img = slide.querySelector('img[data-src]')
  
  if (img && img.dataset.src) {
    img.src = img.dataset.src
    delete img.dataset.src
  }
  
  // Предзагрузка следующего слайда
  const nextSlide = slider.slides[index + 1]
  if (nextSlide) {
    const nextImg = nextSlide.querySelector('img[data-src]')
    if (nextImg && nextImg.dataset.src) {
      nextImg.src = nextImg.dataset.src
      delete nextImg.dataset.src
    }
  }
})
```

### Отслеживание просмотров в аналитике

```javascript
slider.on('slideChanged', (index) => {
  // Google Analytics
  gtag('event', 'slide_view', {
    slide_index: index,
    slide_id: slider.slides[index].dataset.id
  })
  
  // Или любая другая аналитика
  analytics.track('Slide Viewed', {
    index: index,
    realIndex: slider.realIndex,
    timestamp: Date.now()
  })
})
```

### Синхронизация с другими элементами

```javascript
const thumbnails = document.querySelectorAll('.thumbnail')

slider.on('slideChange', (index) => {
  // Обновить активную миниатюру
  thumbnails.forEach((thumb, i) => {
    thumb.classList.toggle('active', i === index)
  })
  
  // Обновить текстовое описание
  const description = document.querySelector('.slide-description')
  description.textContent = slider.slides[index].dataset.description
})
```

### Управление видео

```javascript
slider.on('slideChange', (index) => {
  // Остановить видео на предыдущих слайдах
  slider.slides.forEach((slide, i) => {
    if (i !== index) {
      const video = slide.querySelector('video')
      if (video) {
        video.pause()
        video.currentTime = 0
      }
    }
  })
  
  // Воспроизвести видео на текущем слайде
  const currentVideo = slider.slides[index].querySelector('video')
  if (currentVideo) {
    currentVideo.play()
  }
})
```

### Прогресс-бар

```javascript
function updateProgress() {
  const total = slider.slides.length
  const current = slider.activeIndex
  const progress = ((current + 1) / total) * 100
  
  document.querySelector('.progress-bar').style.width = `${progress}%`
  document.querySelector('.progress-text').textContent = 
    `${current + 1} / ${total}`
}

slider.on('slideChange', updateProgress)
slider.on('created', updateProgress)
```

### Кастомная анимация элементов

```javascript
slider.on('slideChange', (index) => {
  const currentSlide = slider.slides[index]
  
  // Анимация заголовка
  const title = currentSlide.querySelector('.slide-title')
  if (title) {
    title.style.animation = 'none'
    setTimeout(() => {
      title.style.animation = 'fadeInUp 0.6s ease'
    }, 10)
  }
  
  // Анимация описания с задержкой
  const description = currentSlide.querySelector('.slide-description')
  if (description) {
    description.style.animation = 'none'
    setTimeout(() => {
      description.style.animation = 'fadeInUp 0.6s ease 0.2s'
    }, 10)
  }
})
```

### Автопауза при выходе из viewport

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      const autoplay = slider.getModule('autoplay')
      autoplay?.pause()
    } else {
      const autoplay = slider.getModule('autoplay')
      autoplay?.start()
    }
  })
})

slider.on('created', () => {
  observer.observe(slider.root)
})

slider.on('destroyed', () => {
  observer.disconnect()
})
```
