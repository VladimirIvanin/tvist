# 🚲 Velosiped - Примеры использования

Эта папка содержит примеры использования библиотеки Velosiped.

## 🛠️ Режим разработки

### Быстрый старт

```bash
# Запуск dev-сервера
npm run dev
```

Dev-сервер автоматически откроет браузер на `http://localhost:3000` с файлом `basic.html`.

### Что происходит в dev режиме?

1. **Vite** запускает dev-сервер с hot module replacement (HMR)
2. Исходники (`src/`) компилируются на лету
3. SCSS файлы обрабатываются автоматически
4. Изменения в коде мгновенно отображаются в браузере

### Особенности конфигурации

- **Root директория**: `examples/` - все HTML файлы открываются напрямую
- **Алиасы**: `velosiped` указывает на `src/index.ts` для импорта из исходников
- **Порт**: 3000 (можно изменить в `vite.config.ts`)
- **Auto-open**: браузер открывается автоматически

## 📝 Доступные примеры

### `basic.html`
Базовый пример с основными функциями:
- Инициализация слайдера
- Навигация (prev/next)
- Переход к конкретному слайду
- Отслеживание событий

## 🔧 Дополнительные команды

```bash
# Dev-сервер с проверкой типов
npm run dev:watch

# Только сборка (без dev-сервера)
npm run build

# Просмотр production сборки
npm run preview
```

## 📚 Создание нового примера

1. Создайте новый `.html` файл в папке `examples/`
2. Импортируйте Velosiped из исходников:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Мой пример</title>
  <!-- Стили загружаются автоматически через src/index.ts -->
  <style>
    /* Ваши кастомные стили */
  </style>
</head>
<body>
  <div id="slider" class="velosiped">
    <div class="velosiped__container">
      <div class="velosiped__slide">Slide 1</div>
      <div class="velosiped__slide">Slide 2</div>
    </div>
  </div>

  <script type="module">
    // Стили импортируются автоматически!
    import Velosiped from '../src/index.ts'

    const slider = new Velosiped('#slider', {
      perPage: 1,
      gap: 20
    })

    console.log('Slider ready!', slider)
  </script>
</body>
</html>
```

3. Откройте в браузере: `http://localhost:3000/your-example.html`

### 💡 Важно про стили

- **В dev режиме**: стили импортируются автоматически через `src/index.ts`
- **В production**: нужно подключить `<link rel="stylesheet" href="velosiped.css">`
- Не нужно вручную подключать SCSS файлы в HTML

## 🐛 Отладка

### Проверка в DevTools

В консоли браузера доступны:
- `slider` - экземпляр слайдера
- `Velosiped.VERSION` - версия библиотеки

### Sourcemaps

В dev режиме sourcemaps генерируются автоматически, что позволяет отлаживать TypeScript код прямо в браузере.

### Hot Module Replacement (HMR)

При изменении файлов `.ts` или `.scss` страница обновляется автоматически без полной перезагрузки.

## 💡 Советы

1. **CSS**: стили из `src/styles/velosiped.scss` применяются автоматически
2. **TypeScript**: можно импортировать любые типы из `src/`
3. **Модули**: изменения в модулях (`src/modules/`) тоже поддерживают HMR
4. **Алиасы**: используйте `@core`, `@utils`, `@modules` для удобства

## 📖 Дополнительная информация

- [Документация по API](../README.md)
- [Архитектура проекта](../work/ФИНАЛЬНАЯ-АРХИТЕКТУРА-VELOSIPED.md)
- [План разработки](../work/ДЕТАЛЬНЫЙ-ПЛАН-РАЗРАБОТКИ.md)

