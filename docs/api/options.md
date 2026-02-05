# Опции слайдера

Полный справочник всех доступных опций для настройки Tvist слайдера.

<OptionsTable />

## Группировка опций

### Базовые настройки

Основные параметры, определяющие поведение слайдера:

- `perPage` - количество видимых слайдов
- `slideMinSize` - минимальный размер слайда для авто-расчёта
- `gap` - расстояние между слайдами
- `peek` - отступы, показывающие часть соседних слайдов (left/right или top/bottom)
- `speed` - скорость анимации
- `direction` - направление прокрутки
- `start` - начальный слайд

### Управление перетаскиванием

Настройки drag-функциональности:

- `drag` - включение/отключение перетаскивания
- `dragSpeed` - скорость перетаскивания
- `rubberband` - эффект резинки на краях
- `focusableElements` - элементы с сохранением фокуса

### Навигация

Элементы управления навигацией:

- `arrows` - навигационные стрелки
- `pagination` - пагинация (буллеты, дроби и т.д.)
- `keyboard` - управление с клавиатуры
- `wheel` - управление колёсиком мыши

### Автоматизация

Автоматическое поведение слайдера:

- `autoplay` - автоматическая прокрутка
- `pauseOnHover` - пауза при наведении
- `pauseOnInteraction` - пауза при взаимодействии
- `disableOnInteraction` - отключение после взаимодействия

### Режимы отображения

Специальные режимы работы:

- `loop` - бесконечная прокрутка
- `effect` - эффекты переходов
- `fadeEffect` - настройки fade эффекта
- `cubeEffect` - настройки cube эффекта
- `virtual` - виртуальные слайды

### Дополнительно

Прочие настройки:

- `lazy` - ленивая загрузка изображений
- `thumbs` - связь с миниатюрами
- `isNavigation` - режим навигации
- `breakpoints` - адаптивные настройки
- `breakpointsBase` - база для breakpoints
- `on` - обработчики событий

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
  autoplay: 3000,
  loop: true,
  pauseOnHover: true
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
  autoplay: 5000,
  pauseOnHover: true,
  loop: true,
  
  // Адаптивность
  breakpoints: {
    640: { perPage: 1, gap: 10 },
    1024: { perPage: 2, gap: 15 }
  },
  
  // События
  on: {
    slideChange: (index) => {
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
- `autoplay` - автопрокрутка
- `pauseOnHover` - пауза при наведении
- `pauseOnInteraction` - пауза при взаимодействии
- `disableOnInteraction` - отключение после взаимодействия

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
    slideChange: (index) => {
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
