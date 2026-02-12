# Опции слайдера

Полный справочник всех доступных опций для настройки Tvist слайдера.

<OptionsTable />

## Группировка опций

Таблица выше содержит все опции; ниже они сгруппированы по смыслу.

### Базовые настройки

- `perPage` — количество видимых слайдов
- `slidesPerGroup` — количество слайдов, пролистываемых за раз (next/prev)
- `slideMinSize` — минимальный размер слайда для авто-расчёта perPage
- `center` — центрирование активного слайда
- `autoWidth` — ширина слайдов по содержимому (горизонтальный слайдер)
- `autoHeight` — высота слайдов по содержимому (вертикальный слайдер)
- `gap` — расстояние между слайдами
- `peek` — отступы, показывающие часть соседних слайдов (число, строка или объект `left`/`right` / `top`/`bottom`)
- `peekTrim` — прижатие концовки к краю при peek (по умолчанию `true`; при loop не применяется)
- `speed` — скорость анимации (мс)
- `direction` — направление прокрутки (`horizontal` | `vertical`)
- `start` — индекс начального слайда
- `debug` — режим отладки (предупреждения в консоль только при `debug: true`)

### Управление перетаскиванием

- `drag` — включение/отключение перетаскивания (`true` | `false` | `'free'`)
- `dragSpeed` — множитель скорости перетаскивания
- `rubberband` — эффект резинки на краях
- `freeSnap` — snap к слайдам в режиме `drag: 'free'`
- `flickPower` — сила инерции (множитель для momentum scroll)
- `flickMaxPages` — максимум страниц за один flick
- `focusableElements` — CSS-селектор элементов, сохраняющих фокус при перетаскивании
- `preventClicks` — блокировать клики по слайдам во время перетаскивания
- `preventClicksPropagation` — не всплывать клику во время анимации

### Навигация

- `arrows` — стрелки (true или объект с `prev`, `next`, `disabledClass`, `hiddenClass`, `addIcons`, `hideWhenSinglePage`; селекторы/элементы могут быть **вне root**, см. [Примеры навигации](/examples/navigation))
- `pagination` — пагинация (true или объект с `container`, `type`, `clickable`, `bulletClass`, `bulletActiveClass`, `renderBullet` / `renderFraction` / `renderCustom`, `hideWhenSinglePage`, `limit`, `strategy`, `remainderStrategy`; `container` может быть **вне root**)
- `keyboard` — управление с клавиатуры (true или объект с `enabled`, `onlyInViewport`)
- `wheel` — управление колёсиком мыши (true или объект с `sensitivity`, `releaseOnEdges`)
- `scrollbar` — кастомный скроллбар (true или объект с `container`, `hide`, `hideDelay`, `scrollbarClass`, `trackClass`, `thumbClass`, `draggable`)

### Автоматизация и медиа

- `autoplay` — автопрокрутка (`false` | `true` | число мс или объект с `delay`, `pauseOnHover`, `pauseOnInteraction`, `disableOnInteraction`, `waitForVideo`)
- `video` — управление видео в слайдах (`false` | `true` или объект с `autoplay`, `muted`, `loop`, `playsinline`, `pauseOnLeave`, `resetOnLeave`)
- `visibility` — учёт видимости слайдера в viewport для паузы autoplay/marquee (`true` по умолчанию или объект с `pauseAutoplay`, `pauseMarquee`, `threshold`)

### Режимы отображения

- `autoWidth` / `autoHeight` — размер слайдов по содержимому
- `loop` — бесконечная прокрутка (`true` | `false` | `'auto'`)
- `rewind` — возврат к первому слайду после последнего (без loop)
- `effect` — эффект перехода (`slide` | `fade` | `cube` | `card`)
- `fadeEffect` — настройки fade (например `crossFade`)
- `cubeEffect` — настройки cube (`slideShadows`, `shadow`, `shadowOffset`, `shadowScale`, `perspective`, `perspectiveOriginY`, `viewportPadding`)
- `virtual` — виртуальные слайды (объект с `addSlidesBefore`, `addSlidesAfter`, `renderSlide`)
- `grid` — сетка (объект с `rows`, `cols`, `gap`, `dimensions`)
- `marquee` — бегущая строка (`true` | объект с `speed`, `direction`, `pauseOnHover`)

### Дополнительно

- `enabled` — включение/отключение слайдера (при `false` — статичный контент)
- `lazy` — ленивая загрузка изображений (true или объект с `preloadPrevNext`)
- `thumbs` — связь с слайдером-миниатюрами (`{ slider: Tvist }`)
- `isNavigation` — режим навигации (клики по слайдам переключают слайд)
- `breakpoints` — адаптивные настройки (ключ — ширина в px, в т.ч. `enabled` внутри брейкпоинта)
- `breakpointsBase` — база для расчёта breakpoints (`'window'` | `'container'`)
- `on` — объект с обработчиками событий (см. [События](/api/events))

## Примеры использования

### Базовая конфигурация

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,
  gap: 20,
  speed: 400,
  arrows: true,
  pagination: true
})
```

### С автопрокруткой и loop

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  autoplay: { delay: 3000, pauseOnHover: true },
  loop: true
})
```

### Drag Free Mode

```javascript
// Свободная прокрутка без snap
const slider = new Tvist('.slider', {
  drag: 'free',
  perPage: 3,
  gap: 20
})

// Свободная прокрутка с автоматическим snap
const sliderWithSnap = new Tvist('.slider', {
  drag: 'free',
  freeSnap: true, // Выравнивание к слайду после остановки
  perPage: 3,
  gap: 20
})
```

### Адаптивный слайдер

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  gap: 10,
  breakpoints: {
    640: {
      perPage: 2,
      gap: 15
    },
    1024: {
      perPage: 3,
      gap: 20
    }
  }
})
```

### Сетка на десктопе, слайдер на мобильных

```javascript
const slider = new Tvist('.slider', {
  // По умолчанию (десктоп) - отключен
  enabled: false,
  perPage: 1,
  gap: 16,
  drag: true,
  pagination: true,
  
  // На мобильных - включен
  breakpoints: {
    767: {
      enabled: true  // Слайдер активен на экранах ≤767px
    }
  }
})
```

### С эффектами

```javascript
const slider = new Tvist('.slider', {
  effect: 'fade',
  fadeEffect: {
    crossFade: true
  },
  speed: 600
})
```

### Полная конфигурация

```javascript
const slider = new Tvist('.slider', {
  // Базовые
  perPage: 3,
  gap: 20,
  speed: 400,
  direction: 'horizontal',
  start: 0,
  
  // Управление
  drag: true,
  dragSpeed: 1,
  rubberband: true,
  
  // Навигация
  arrows: true,
  pagination: {
    type: 'bullets',
    clickable: true
  },
  keyboard: true,
  
  // Автоматизация
  autoplay: { delay: 5000, pauseOnHover: true },
  loop: true,
  
  // Адаптивность
  breakpoints: {
    640: { perPage: 1, gap: 10 },
    1024: { perPage: 2, gap: 15 }
  },
  
  // События
  on: {
    slideChangeStart: (index) => {
      console.log('Активный слайд:', index)
    }
  }
})
```

## Приоритет опций

При использовании `breakpoints`, опции из соответствующего breakpoint переопределяют базовые опции. Например:

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,  // Базовое значение
  breakpoints: {
    640: {
      perPage: 1  // На экранах >= 640px будет 1 слайд
    }
  }
})
```

## Динамическое изменение опций

Tvist поддерживает динамическое изменение большинства опций без пересоздания слайдера. Используйте метод `updateOptions()` для обновления настроек на лету.

### Метод updateOptions()

```javascript
// Изменить одну опцию
slider.updateOptions({ perPage: 3 })

// Изменить несколько опций
slider.updateOptions({
  perPage: 2,
  gap: 30,
  speed: 500
})

// Цепочка вызовов
slider
  .updateOptions({ perPage: 3 })
  .scrollTo(0)
```

### Поддерживаемые опции

Метод `updateOptions()` поддерживает изменение следующих опций:

#### Базовые настройки
- `perPage` - количество слайдов на странице
- `slideMinSize` - минимальный размер слайда
- `gap` - расстояние между слайдами
- `peek` - отступы слайдера
- `peekTrim` - обрезка peek на краях
- `speed` - скорость анимации
- `direction` - направление прокрутки (`horizontal` / `vertical`)
- `center` - центрирование активного слайда

#### Drag
- `drag` - включение/отключение перетаскивания
- `dragSpeed` - скорость перетаскивания
- `rubberband` - эффект резинки

#### Autoplay
- `autoplay` - автопрокрутка (число, `true`, `false` или объект с `delay`, `pauseOnHover`, `pauseOnInteraction`, `disableOnInteraction`, `waitForVideo`)

#### События
- `on` - обработчики событий (заменяют предыдущие)

### Примеры использования

#### Адаптация под размер экрана

```javascript
const updateSliderForScreen = () => {
  const width = window.innerWidth
  
  if (width < 768) {
    slider.updateOptions({ perPage: 1, gap: 10 })
  } else if (width < 1024) {
    slider.updateOptions({ perPage: 2, gap: 20 })
  } else {
    slider.updateOptions({ perPage: 3, gap: 30 })
  }
}

window.addEventListener('resize', updateSliderForScreen)
updateSliderForScreen()
```

#### Переключение направления

```javascript
const toggleDirection = () => {
  const current = slider.options.direction
  slider.updateOptions({
    direction: current === 'horizontal' ? 'vertical' : 'horizontal'
  })
}

document.querySelector('.toggle-btn').addEventListener('click', toggleDirection)
```

#### Управление автопрокруткой

```javascript
// Включить автопрокрутку
slider.updateOptions({ autoplay: 3000 })

// Отключить автопрокрутку
slider.updateOptions({ autoplay: false })

// Изменить скорость
slider.updateOptions({ autoplay: 5000 })
```

#### Динамическое изменение gap и peek

```javascript
// Изменить отступы
slider.updateOptions({
  gap: 40,
  peek: { left: 20, right: 20 }
})

// Убрать peek
slider.updateOptions({ peek: 0 })
```

#### Обновление обработчиков событий

```javascript
slider.updateOptions({
  on: {
    slideChangeStart: (index) => {
      console.log('Новый обработчик:', index)
      // Новая логика
    }
  }
})
```

### Событие optionsUpdated

При вызове `updateOptions()` генерируется событие `optionsUpdated`:

```javascript
slider.on('optionsUpdated', (tvist, newOptions) => {
  console.log('Обновлены опции:', newOptions)
  
  // Выполнить дополнительную логику
  if (newOptions.perPage) {
    updatePaginationUI()
  }
})
```

### Пересоздание слайдера (legacy подход)

Если вам нужно изменить опции, которые не поддерживают динамическое обновление (например, регистрация новых модулей), используйте старый подход с пересозданием:

```javascript
// Сохраняем текущее состояние
const currentIndex = slider.activeIndex

// Уничтожаем старый экземпляр
slider.destroy()

// Создаём новый с другими опциями
const newSlider = new Tvist('.slider', {
  perPage: 4,
  gap: 30,
  start: currentIndex // Восстанавливаем позицию
})
```

### Ограничения

Некоторые опции не могут быть изменены динамически, так как они влияют на инициализацию модулей:

- Регистрация новых модулей требует пересоздания слайдера
- Изменение `loop` может работать некорректно (требуется пересоздание)
- Опции, связанные с DOM-структурой модулей

Для таких случаев используйте подход с `destroy()` и созданием нового экземпляра.
