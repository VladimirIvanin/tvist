# GitHub Pages - Быстрый старт

## 🚀 Публикация документации

Документация автоматически публикуется на GitHub Pages при каждом push в ветку `main`.

### Адрес документации

После первого деплоя документация будет доступна по адресу:

**https://vladimiranin.github.io/tvist/**

## 📝 Что было настроено

### 1. Структура файлов

```
examples/
├── index.html              # Главная страница
├── style.css               # Стили главной страницы
├── script.js               # Скрипт главной страницы
├── basic/                  # Базовый пример
│   ├── index.html
│   ├── style.css
│   └── script.js
├── modules-demo/           # Демо модулей
│   ├── index.html
│   ├── style.css
│   └── script.js
├── loop-demo/              # Loop режим
│   ├── index.html
│   ├── style.css
│   └── script.js
└── shared/                 # Общие компоненты
    └── header.js           # Навигационная шапка
```

### 2. Конфигурация Vite

`vite.docs.config.ts` - специальная конфигурация для сборки документации:
- `base: '/tvist/'` - базовый путь для GitHub Pages
- Multi-page app с 4 точками входа
- Минификация и оптимизация

### 3. GitHub Actions

`.github/workflows/deploy-docs.yml` - автоматический деплой:
1. Собирает библиотеку (`npm run build`)
2. Собирает документацию (`npm run build:docs`)
3. Публикует на GitHub Pages

## 🛠️ Локальная разработка

### Dev-режим (с HMR)

```bash
npm run dev
```

Откроется `http://localhost:3000` с hot reload.

### Preview production сборки

```bash
# Собрать документацию
npm run build:docs

# Запустить preview
npm run preview:docs
```

Откроется `http://localhost:4173/tvist/` - точная копия того, что будет на GitHub Pages.

## ✏️ Редактирование примеров

### Изменение HTML

Редактируйте файлы `examples/*/index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мой пример</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <!-- Ваш контент -->
  <script type="module" src="./script.js"></script>
</body>
</html>
```

### Изменение JavaScript

Редактируйте файлы `examples/*/script.js`:

```javascript
import '../shared/header.js'
import Tvist from '../../src/index.ts'

const slider = new Tvist('#slider', {
  perPage: 1,
  gap: 20
})
```

### Изменение стилей

Каждый пример имеет свой `style.css` файл:
- `examples/style.css` - стили главной страницы
- `examples/basic/style.css` - стили базового примера
- `examples/modules-demo/style.css` - стили демо модулей
- `examples/loop-demo/style.css` - стили loop режима

## 📦 Добавление нового примера

1. Создайте папку `examples/my-example/`

2. Создайте `examples/my-example/index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мой пример - Tvist</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <div class="container">
    <h1>Мой пример</h1>
    <div id="slider" class="tvist">
      <div class="tvist__container">
        <div class="tvist__slide">Slide 1</div>
        <div class="tvist__slide">Slide 2</div>
      </div>
    </div>
  </div>
  <script type="module" src="./script.js"></script>
</body>
</html>
```

3. Создайте `examples/my-example/script.js`:

```javascript
import '../shared/header.js'
import Tvist from '../../src/index.ts'

const slider = new Tvist('#slider', {
  perPage: 1
})
```

4. Создайте `examples/my-example/style.css`:

```css
body {
  font-family: sans-serif;
  padding: 40px;
  background: #f5f5f5;
}

.tvist__slide {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

5. Добавьте в `vite.docs.config.ts`:

```typescript
rollupOptions: {
  input: {
    main: resolve(__dirname, 'examples/index.html'),
    basic: resolve(__dirname, 'examples/basic/index.html'),
    modules: resolve(__dirname, 'examples/modules-demo/index.html'),
    loop: resolve(__dirname, 'examples/loop-demo/index.html'),
    myExample: resolve(__dirname, 'examples/my-example/index.html'), // Добавьте
  },
}
```

6. Добавьте карточку на главную страницу (`examples/index.html`):

```html
<a href="my-example/" class="example-card">
  <span class="example-icon">✨</span>
  <h3 class="example-title">Мой пример</h3>
  <p class="example-description">
    Описание примера
  </p>
  <span class="status-badge status-ready">✓ Готов</span>
</a>
```

5. Соберите и проверьте:

```bash
npm run build:docs
npm run preview:docs
```

## 🔄 Процесс публикации

1. Внесите изменения в файлы `examples/`
2. Закоммитьте изменения:
   ```bash
   git add .
   git commit -m "docs: обновление примеров"
   ```
3. Запушьте в `main`:
   ```bash
   git push origin main
   ```
4. GitHub Actions автоматически соберет и опубликует изменения
5. Через 1-2 минуты изменения будут доступны на https://vladimiranin.github.io/tvist/

## 📊 Проверка статуса деплоя

1. Откройте вкладку `Actions` в репозитории
2. Найдите последний workflow `Deploy Documentation to GitHub Pages`
3. Проверьте статус:
   - ✅ Зеленая галочка - успешно
   - ❌ Красный крестик - ошибка (смотрите логи)
   - 🟡 Желтый круг - в процессе

## 💡 Советы

### Проверка перед публикацией

Всегда проверяйте изменения локально:

```bash
npm run build:docs && npm run preview:docs
```

### Отладка проблем

Если что-то не работает:

1. Проверьте логи в `Actions` вкладке
2. Убедитесь что `base` в `vite.docs.config.ts` правильный
3. Проверьте что все файлы импортируются корректно
4. Убедитесь что нет inline `<style>` или `<script>` тегов в HTML

### Кэширование браузера

Если изменения не отображаются:
1. Очистите кэш браузера (Ctrl+Shift+R)
2. Откройте в режиме инкогнито
3. Подождите несколько минут (CDN может кэшировать)

## 📚 Дополнительная информация

Подробная документация по настройке и использованию GitHub Pages находится в файле `DOCS-SETUP.md` в корне проекта.
