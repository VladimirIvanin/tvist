# Tvist

> Слайдер с широким API для современного веба

[![npm version](https://img.shields.io/npm/v/tvist.svg)](https://www.npmjs.com/package/tvist)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/tvist)](https://bundlephobia.com/package/tvist)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📦 Установка

```bash
npm install tvist
```

### Скачать для браузера (без npm)

Минифицированная сборка для `<script>` находится в папке [browser-build/](browser-build/). Команда `npm run build:browser` выпускает одну полную пару `tvist.min.js` + `tvist.css` и gzip-копию `tvist.min.js.gz`. Размер gzip выводится при сборке. В JS включены все встроенные возможности; сборка проверяет лимит 100 000 байт до gzip/Brotli.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.min.js"></script>
```

Создавайте слайдер после загрузки JS. При использовании `defer` инициализируйте его в `DOMContentLoaded`. JS и CSS должны иметь одну версию. [Миграция с API расширений](docs/api/modules.md). [Размер и результаты проверок](docs/browser-build.md).

## ✨ Возможности

- 📖 **Широкое API** — десятки опций, методы, события и встроенные возможности
- 🖱️ **Drag & Drop** — touch/mouse с rubberband эффектом, free mode с momentum scroll
- 🎨 **Navigation** — стрелки с disabled состояниями
- 📊 **Pagination** — bullets, fraction, progress
- ⏰ **Autoplay** — с паузами и остановками
- 📱 **Responsive** — container-first: размеры и perPage от контейнера, breakpoints по окну или контейнеру
- 🔄 **Loop** — бесконечная прокрутка
- 🖼️ **LazyLoad** — ленивая загрузка изображений
- ✨ **Effects** — fade, cube эффекты переходов
- 🔗 **Thumbs** — связь основного слайдера с миниатюрами
- 📐 **Grid** — сеточная раскладка слайдов
- 🎬 **Marquee** — режим бегущей строки
- 📜 **Scrollbar** — кастомный скроллбар для навигации
- 0️⃣ **Zero deps** — нет внешних зависимостей

## 🚀 Быстрый старт

Разметка:

```html
<div id="slider" class="tvist-v1">
  <div class="tvist-v1__track">
    <div class="tvist-v1__container">
      <div class="tvist-v1__slide">Слайд 1</div>
      <div class="tvist-v1__slide">Слайд 2</div>
      <div class="tvist-v1__slide">Слайд 3</div>
    </div>
  </div>
</div>
```

Подключение и инициализация:

```typescript
import Tvist from 'tvist';
import 'tvist/dist/tvist.css';

const slider = new Tvist('#slider', {
  perPage: 3,
  gap: 20,
  drag: true,
  arrows: true,
  pagination: { type: 'bullets' },
  autoplay: 3000,
  breakpoints: {
    768: { perPage: 2 },
    480: { perPage: 1 }
  }
});
```

## 📖 Документация

### 🌐 Онлайн документация

Интерактивные примеры и документация доступны на GitHub Pages:

**[https://vladimirivanin.github.io/tvist/](https://vladimirivanin.github.io/tvist/)**

### 📚 Примеры

- **[Все примеры](https://vladimirivanin.github.io/tvist/examples-list.html)** - интерактивные примеры на одной странице
- **[Basic](https://vladimirivanin.github.io/tvist/examples/basic.html)** - базовый пример с основными функциями
- **[Modules Demo](https://vladimirivanin.github.io/tvist/examples/modules.html)** - демонстрация всех модулей
- **[Loop Mode](https://vladimirivanin.github.io/tvist/examples/loop.html)** - бесконечная прокрутка

### 💻 Локальная разработка

```bash
# Запустить Sandbox (песочница для экспериментов)
npm run dev

# Запустить документацию (включая примеры)
npm run docs:dev

# Собрать и просмотреть production версию документации
npm run docs:build
npm run docs:preview
```

## 🛠️ Разработка

### Быстрый старт для разработчиков

```bash
# Клонировать репозиторий
git clone https://github.com/VladimirIvanin/tvist.git
cd tvist

# Установить зависимости
npm install

# Запустить Sandbox
npm run dev
```

Dev-сервер откроется на `http://localhost:3000` с песочницей.
Документация доступна на `http://localhost:5173`.

### Доступные команды

```bash
npm run dev              # Запуск песочницы (sandbox)
npm run docs:dev         # Запуск документации и примеров
npm run dev:watch        # Dev + проверка типов
npm run build            # Production сборка библиотеки
npm run build:browser    # Только минифицированная сборка для браузера (browser-build/)
npm run docs:build       # Сборка документации и примеров
npm run test             # Запуск тестов
npm run test:ui          # UI для тестов
npm run test:coverage    # Покрытие кодом
npm run lint             # Проверка кода
npm run format           # Форматирование
npm run typecheck        # Проверка типов
```

### Структура проекта

```
tvist/
├── src/               # Исходники
│   ├── core/          # Ядро библиотеки
│   ├── modules/       # Модули
│   ├── utils/         # Утилиты
│   └── styles/        # SCSS стили
├── sandbox/           # Песочница для экспериментов
├── docs/              # Документация и примеры
│   ├── demos/         # Исходный код примеров
│   └── public/        # Статика
├── tests/             # Тесты
└── dist/              # Сборка библиотеки
```

## 🤝 Участие в разработке

Мы приветствуем ваш вклад! См. [CONTRIBUTING.md](CONTRIBUTING.md) для деталей.

## 📄 Лицензия

MIT © [Tvist Contributors](LICENSE)
