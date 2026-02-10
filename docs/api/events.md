# События

События можно подписывать двумя способами: через опцию `on` при инициализации или через метод `on()`.

## Список событий

Единая концепция: каждое событие — одно явление, без дубликатов (например, только `created`, только `resized`).

### Жизненный цикл
- [`created`](#created) — после создания и инициализации
- [`beforeDestroy`](#beforedestroy) — перед уничтожением
- [`destroyed`](#destroyed) — при уничтожении
- [`refresh`](#refresh) — вызван `update()` (пересчёт размеров/позиций)
- [`optionsUpdated`](#optionsupdated) — обновлены опции через `updateOptions()`

### Смена слайда
- [`beforeSlideChange`](#beforeslidechange) — перед сменой слайда
- [`slideChange`](#slidechange) — начало смены (старт анимации)
- [`slideChanged`](#slidechanged) — смена завершена
- [`beforeTransitionStart`](#beforetransitionstart) — перед началом анимации перехода (для loop)
- [`transitionStart`](#transitionstart) — начало анимации перехода
- [`transitionEnd`](#transitionend) — конец анимации перехода
- [`scroll`](#scroll) — во время прокрутки (тики анимации / драг)
- [`progress`](#progress) — прогресс прокрутки 0..1 (только при `!loop`)
- [`reachBeginning`](#reachbeginning) — достигнут первый слайд
- [`reachEnd`](#reachend) — достигнут последний слайд

### Взаимодействие
- [`click`](#click) — клик по слайду
- [`dragStart`](#dragstart) — начало перетаскивания
- [`drag`](#drag) — во время перетаскивания
- [`dragEnd`](#dragend) — конец перетаскивания

### Состояние и обновления
- [`resized`](#resized) — завершилось изменение размера контейнера
- [`breakpoint`](#breakpoint) — смена breakpoint
- [`lock`](#lock) — слайдер заблокирован
- [`unlock`](#unlock) — слайдер разблокирован

### Видимость слайдов
- [`visible`](#visible) — слайд вошёл в видимую область
- [`hidden`](#hidden) — слайд вышел из видимой области

### Ленивая загрузка
- [`lazyLoaded`](#lazyloaded) — изображение успешно загружено
- [`lazyLoadError`](#lazyloaderror) — ошибка загрузки изображения

### Модули (при наличии опций)
- `navigation:mounted` — стрелки смонтированы
- `pagination:mounted` — пагинация смонтирована

---

## Подписка на события

### Через опцию `on`

```javascript
const slider = new Tvist('.slider', {
  on: {
    slideChange: (index) => {
      console.log('Слайд изменился:', index)
    },
    resized: () => {
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

slider.on('resized', () => {
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

### beforeDestroy

```typescript
beforeDestroy: (tvist: Tvist) => void
```

Вызывается перед уничтожением (до очистки модулей и DOM).

### destroyed

```typescript
destroyed: (tvist: Tvist) => void
```

Вызывается при уничтожении слайдера.

**Параметры:**
- `tvist` — экземпляр слайдера

**Примеры:**

```javascript
slider.on('beforeDestroy', (tvist) => {
  // Сохранить состояние перед очисткой
  saveState(tvist)
})

slider.on('destroyed', (tvist) => {
  console.log('Слайдер уничтожен')
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

### click

```typescript
click: (index: number, slide: HTMLElement, event: MouseEvent) => void
```

Клик по слайду (делегирование с контейнера). Аргументы: индекс слайда, элемент слайда, объект события.

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

Вызывается во время прокрутки (тики анимации или при драге). Для прогресса 0..1 используйте событие `progress`.

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

### resized

```typescript
resized: () => void
```

Вызывается после завершения изменения размера контейнера (throttle).

**Примеры:**

```javascript
slider.on('resized', () => {
  console.log('Размер контейнера изменился')
  
  const width = slider.root.offsetWidth
  if (width < 768) {
    slider.updateOptions({ perPage: 1 })
  } else {
    slider.updateOptions({ perPage: 3 })
  }
})
```

### refresh

```typescript
refresh: () => void
```

Вызывается при вызове `update()` — пересчитаны размеры и позиции.

### beforeTransitionStart

```typescript
beforeTransitionStart: (data: { index: number; direction: 'next' | 'prev' }) => void
```

Вызывается перед началом анимации перехода. Используется внутренне для loop (коррекция индекса). Полезно для синхронизации с другими слайдерами или кастомной логики по направлению.

### transitionStart / transitionEnd

```typescript
transitionStart: (index: number) => void
transitionEnd: (index: number) => void
```

Начало и конец анимации перехода к слайду. При мгновенном переходе (`instant: true`) не вызываются.

### progress

```typescript
progress: (progress: number) => void
```

Прогресс прокрутки от 0 до 1. Вызывается только при `loop: false` (в loop нет однозначного прогресса).

### reachBeginning / reachEnd

```typescript
reachBeginning: () => void
reachEnd: () => void
```

Вызываются при достижении первого или последнего слайда (после `slideChanged`).

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

### visible / hidden

```typescript
visible: (slide: HTMLElement, index: number) => void
hidden: (slide: HTMLElement, index: number) => void
```

Слайд вошёл в видимую область или вышел из неё (по viewport контейнера). Эмитит модуль slide-states.

## События LazyLoad модуля

События модуля ленивой загрузки изображений (требуется опция `lazy: true`).

### lazyLoaded

```typescript
lazyLoaded: (img: HTMLImageElement, slideIndex: number) => void
```

Вызывается когда изображение успешно загружено.

**Параметры:**
- `img` (`HTMLImageElement`) - загруженное изображение
- `slideIndex` (`number`) - индекс слайда, в котором находится изображение

**Примеры:**

```javascript
const slider = new Tvist('.slider', {
  lazy: true,
  on: {
    lazyLoaded: (img, slideIndex) => {
      console.log(`Изображение загружено в слайде ${slideIndex}`)
      
      // Добавить класс для анимации появления
      img.classList.add('loaded')
      
      // Отслеживание в аналитике
      analytics.track('Image Loaded', {
        src: img.src,
        slideIndex: slideIndex,
        loadTime: performance.now()
      })
      
      // Показать уведомление
      showNotification(`Слайд ${slideIndex + 1} готов к просмотру`)
    }
  }
})
```

**Пример с анимацией:**

```javascript
slider.on('lazyLoaded', (img, slideIndex) => {
  // Плавное появление изображения
  img.style.opacity = '0'
  img.style.transition = 'opacity 0.3s ease'
  
  setTimeout(() => {
    img.style.opacity = '1'
  }, 10)
})
```

**Пример со счётчиком:**

```javascript
let loadedCount = 0
const totalImages = document.querySelectorAll('img[data-src]').length

slider.on('lazyLoaded', (img, slideIndex) => {
  loadedCount++
  
  const progress = (loadedCount / totalImages) * 100
  document.querySelector('.load-progress').textContent = 
    `Загружено: ${loadedCount} из ${totalImages} (${progress.toFixed(0)}%)`
  
  if (loadedCount === totalImages) {
    console.log('✅ Все изображения загружены!')
    hideLoader()
  }
})
```

### lazyLoadError

```typescript
lazyLoadError: (img: HTMLImageElement, slideIndex: number) => void
```

Вызывается при ошибке загрузки изображения (404, network error и т.д.).

**Параметры:**
- `img` (`HTMLImageElement`) - изображение, которое не удалось загрузить
- `slideIndex` (`number`) - индекс слайда, в котором находится изображение

**Примеры:**

```javascript
const slider = new Tvist('.slider', {
  lazy: true,
  on: {
    lazyLoadError: (img, slideIndex) => {
      console.error(`Ошибка загрузки в слайде ${slideIndex}`)
      
      // Установить изображение-заглушку
      img.src = '/images/placeholder.jpg'
      img.alt = 'Изображение недоступно'
      
      // Добавить класс ошибки
      img.classList.add('load-error')
      
      // Логирование в систему мониторинга
      errorLogger.log({
        type: 'lazy_load_error',
        slide: slideIndex,
        src: img.dataset.src,
        timestamp: Date.now()
      })
    }
  }
})
```

**Пример с повторной попыткой:**

```javascript
const MAX_RETRIES = 3
const retryCount = new WeakMap()

slider.on('lazyLoadError', (img, slideIndex) => {
  const attempts = retryCount.get(img) || 0
  
  if (attempts < MAX_RETRIES) {
    retryCount.set(img, attempts + 1)
    
    console.log(`Попытка ${attempts + 1} из ${MAX_RETRIES}`)
    
    // Повторная попытка через 2 секунды
    setTimeout(() => {
      const originalSrc = img.dataset.src
      if (originalSrc) {
        img.src = originalSrc + `?retry=${attempts + 1}`
      }
    }, 2000)
  } else {
    // После всех попыток показать placeholder
    img.src = '/images/error-placeholder.jpg'
    showErrorMessage(`Не удалось загрузить изображение в слайде ${slideIndex + 1}`)
  }
})
```

**Пример с альтернативными источниками:**

```javascript
slider.on('lazyLoadError', (img, slideIndex) => {
  // Попробовать альтернативные CDN
  const fallbackCDNs = [
    'https://cdn1.example.com',
    'https://cdn2.example.com',
    'https://cdn3.example.com'
  ]
  
  const originalSrc = img.dataset.src
  const currentCDN = img.dataset.currentCdn || 0
  
  if (currentCDN < fallbackCDNs.length) {
    const newSrc = originalSrc.replace(/^https?:\/\/[^\/]+/, fallbackCDNs[currentCDN])
    img.dataset.currentCdn = currentCDN + 1
    img.src = newSrc
    
    console.log(`Пробуем CDN ${currentCDN + 1}: ${newSrc}`)
  } else {
    // Все CDN не работают
    img.src = '/images/placeholder.jpg'
    notifyAdmin(`Image load failed for slide ${slideIndex}`, originalSrc)
  }
})
```

**Комбинированный пример:**

```javascript
const imageStats = {
  loaded: 0,
  errors: 0,
  total: 0
}

slider.on('created', () => {
  imageStats.total = document.querySelectorAll('img[data-src]').length
})

slider.on('lazyLoaded', (img, slideIndex) => {
  imageStats.loaded++
  updateLoadStats()
  
  // Добавить fade-in эффект
  img.style.animation = 'fadeIn 0.3s ease'
})

slider.on('lazyLoadError', (img, slideIndex) => {
  imageStats.errors++
  updateLoadStats()
  
  // Показать placeholder
  img.src = '/images/placeholder.jpg'
  img.classList.add('error')
  
  // Уведомление пользователю
  if (imageStats.errors > 3) {
    showNotification('Проблемы с загрузкой изображений. Проверьте подключение к интернету.')
  }
})

function updateLoadStats() {
  const total = imageStats.total
  const loaded = imageStats.loaded
  const errors = imageStats.errors
  const pending = total - loaded - errors
  
  console.log(`📊 Статистика: загружено ${loaded}, ошибок ${errors}, ожидает ${pending}`)
  
  document.querySelector('.stats').innerHTML = `
    <div>✅ Загружено: ${loaded}</div>
    <div>❌ Ошибки: ${errors}</div>
    <div>⏳ Ожидает: ${pending}</div>
  `
}
```

## Примеры использования

### Ленивая загрузка изображений (с модулем LazyLoad)

```javascript
// Используйте встроенный модуль LazyLoad
const slider = new Tvist('.slider', {
  lazy: {
    preloadPrevNext: 1 // Предзагрузка соседних слайдов
  },
  on: {
    lazyLoaded: (img, slideIndex) => {
      console.log(`Изображение загружено в слайде ${slideIndex}`)
      
      // Плавное появление
      img.style.opacity = '0'
      setTimeout(() => {
        img.style.opacity = '1'
      }, 10)
    },
    lazyLoadError: (img, slideIndex) => {
      // Замена на placeholder при ошибке
      img.src = '/images/placeholder.jpg'
      console.error(`Ошибка загрузки в слайде ${slideIndex}`)
    }
  }
})

// Публичное API для ручной загрузки
const lazyModule = slider.modules.get('lazyload')

// Загрузить все оставшиеся изображения
lazyModule.loadAll()

// Загрузить конкретный слайд
lazyModule.loadSlide(5)
```

**HTML разметка:**

```html
<div class="tvist-v0__slide">
  <img 
    data-src="image.jpg" 
    data-srcset="image-400.jpg 400w, image-800.jpg 800w"
    alt="Описание"
  >
</div>
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
