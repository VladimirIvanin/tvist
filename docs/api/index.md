# Справочник API

Параметры, методы, свойства, события и настройки модулей Tvist на одной странице. Имена записей — постоянные ссылки; пояснения и примеры доступны сразу.

## Инициализация {#initialization}

```javascript
import Tvist from 'tvist'
import 'tvist/dist/tvist.css'

const slider = new Tvist('.slider', {
  perPage: 3,
  gap: 20,
  arrows: true,
  pagination: true,
})

slider.next()
```

Первый аргумент — CSS-селектор или `HTMLElement`, второй — объект опций. Индексы слайдов начинаются с нуля. Полная сборка регистрирует встроенные модули автоматически.

[Разметка и быстрый старт](/guide/getting-started) · [Браузерная сборка](/guide/installation) · [Живые примеры](/examples-list) · [Конструктор](/builder)
