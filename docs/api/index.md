# API Документация

Полный справочник по API библиотеки Tvist.

## Быстрая навигация

### [📋 Опции](/api/options)
Полный список всех доступных опций для настройки слайдера: базовые параметры, навигация, автоматизация, эффекты, адаптивность и обработчики событий.

### [⚡ Методы](/api/methods)
Все методы для управления слайдером: навигация между слайдами, обновление состояния, динамическое изменение опций, работа с модулями и событиями.

### [🎯 Свойства](/api/properties)
Доступные свойства экземпляра слайдера: элементы DOM, текущее состояние, информация о слайдах и конфигурация.

### [📡 События](/api/events)
События жизненного цикла, навигации, взаимодействия и обновления. Примеры подписки и использования.

### [🔧 Статические методы](/api/static)
Статические методы и свойства класса Tvist: версия библиотеки, регистрация модулей, управление реестром.

### [🧩 Модули](/api/modules)
Встроенные модули и создание собственных: навигация, автопрокрутка, эффекты, адаптивность, grid, thumbs и другие.

### [📘 TypeScript](/api/typescript)
Полная типизация, generic типы, расширение интерфейсов, интеграция с фреймворками.

---

## Обзор API

### Создание слайдера

```javascript
import Tvist from 'tvist'
import 'tvist/dist/tvist.css'

const slider = new Tvist('.slider', {
  perPage: 3,
  gap: 20,
  speed: 300,
  autoplay: 3000,
  pagination: true,
  arrows: true
})
```

### Основные методы

```javascript
// Навигация
slider.next()
slider.prev()
slider.scrollTo(2)

// Управление состоянием
slider.update()
slider.updateOptions({ perPage: 4 })
slider.destroy()

// Работа с событиями
slider.on('slideChange', (index) => {
  console.log('Активный слайд:', index)
})

// Получение модуля
const autoplay = slider.getModule('autoplay')
autoplay?.pause()
```

### Доступ к свойствам

```javascript
// Текущее состояние
console.log(slider.activeIndex)
console.log(slider.slides.length)

// Проверка возможности навигации
if (slider.canScrollNext) {
  slider.next()
}

// Доступ к элементам
slider.root.classList.add('custom-class')
slider.container.style.padding = '20px'
```

### Регистрация модулей

```javascript
import { 
  AutoplayModule, 
  PaginationModule, 
  LoopModule 
} from 'tvist/modules'

// Глобальная регистрация
Tvist.registerModule('autoplay', AutoplayModule)
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('loop', LoopModule)

// Использование
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true
})
```

## Опции слайдера

Tvist предоставляет обширный набор опций для настройки слайдера под ваши нужды. Подробнее см. [страницу Опции](/api/options).

<OptionsTable />

## Примеры использования

### Базовая настройка

```javascript
const slider = new Tvist('.slider', {
  // Отображение
  perPage: 3,
  gap: 20,
  speed: 300,
  
  // Навигация
  arrows: true,
  pagination: { type: 'bullets' },
  
  // Автоматизация
  autoplay: 3000,
  loop: true
})
```

### Адаптивный слайдер

```javascript
const slider = new Tvist('.slider', {
  perPage: 1,
  gap: 10,
  
  breakpoints: {
    640: { perPage: 2, gap: 15 },
    1024: { perPage: 3, gap: 20 },
    1440: { perPage: 4, gap: 30 }
  }
})
```

### С событиями

```javascript
const slider = new Tvist('.slider', {
  on: {
    created: (tvist) => {
      console.log('Слайдер создан')
    },
    slideChange: (index) => {
      console.log('Переход к слайду:', index)
    },
    resize: () => {
      console.log('Размер изменился')
    }
  }
})
```

### Динамическое изменение

```javascript
// Изменение опций на лету
slider.updateOptions({ perPage: 4, gap: 30 })

// Адаптация под размер экрана
window.addEventListener('resize', () => {
  const width = window.innerWidth
  
  if (width < 768) {
    slider.updateOptions({ perPage: 1 })
  } else if (width < 1024) {
    slider.updateOptions({ perPage: 2 })
  } else {
    slider.updateOptions({ perPage: 3 })
  }
})
```

### Управление автопрокруткой

```javascript
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pauseOnHover: true
})

const autoplay = slider.getModule('autoplay')

// Управление
document.querySelector('.pause-btn').addEventListener('click', () => {
  autoplay?.pause()
})

document.querySelector('.play-btn').addEventListener('click', () => {
  autoplay?.start()
})
```

## Полезные ссылки

- [Примеры](/examples-list) - Интерактивные примеры использования
- [Быстрый старт](/guide/getting-started) - Начало работы с библиотекой
- [GitHub](https://github.com/VladimirIvanin/tvist) - Исходный код и Issues
