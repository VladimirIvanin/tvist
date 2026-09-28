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

Минифицированная сборка для `<script>` — папка [browser-build/](browser-build/) в репозитории (после `npm run build:browser`). В браузере глобальный конструктор — **`TvistV1`**.

CDN (файлы из `browser-build/`): **`@latest`** в jsDelivr указывает на [последний релиз GitHub](https://github.com/VladimirIvanin/tvist/releases); для острия ветки `main` замените `@latest` на `@main`.

Для production закрепите тег релиза или разместите файлы на своём домене с долгим кешированием.

`npm run build:browser` (или `npm run build:browser:split`) выпускает три пары JS/CSS: core, modules и полную сборку. Выберите полную пару либо core с нужными дополнениями.

Для обычной карусели подключите core: он включает свайпы, брейкпоинты, стрелки, пагинацию, классы состояний, autoplay, loop и visibility.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.core.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.core.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('#slider', { arrows: true, pagination: true, loop: true });
  });
</script>
```

Для миниатюр, эффектов Fade/Cube, Grid, ScrollControl, Scrollbar, Marquee, LazyLoad или Video добавьте пару modules:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.core.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.modules.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.core.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.modules.min.js"></script>
```

Используйте одну версию всех файлов. CSS modules подключайте после CSS core. Создавайте слайдер после загрузки нужных JS; с `defer` — в `DOMContentLoaded`. Modules также может загрузиться до core благодаря очереди регистрации.

Для всех возможностей в одном JS и одном CSS подключите полную сборку:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.min.js"></script>
```

Полная сборка включает все 16 модулей и использует тот же конструктор `TvistV1`. Подключайте её вместо пар core и modules; инициализируйте слайдер после загрузки JS.

[Состав сборок и способы подключения](docs/guide/installation.md#cdn).

## ✨ Возможности

- 📖 **Широкое API** — десятки опций, методы, события и подключаемые модули под полный контроль
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
npm run build:docs
npm run preview:docs
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
npm run build:docs       # Сборка документации и примеров
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
