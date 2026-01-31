# Tvist

> Модульный и легковесный слайдер для современного веба

[![npm version](https://img.shields.io/npm/v/tvist.svg)](https://www.npmjs.com/package/tvist)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/tvist)](https://bundlephobia.com/package/tvist)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✅ Статус разработки

### Завершено

- [x] **ЭТАП 1: MVP Core** - Engine, Animator, Vector1D, Counter, EventEmitter
- [x] **ЭТАП 2: Essential Modules** - Drag, Navigation, Pagination, Autoplay, Breakpoints

### Roadmap

- [ ] **ЭТАП 3: Advanced Features** - Loop, LazyLoad, Effects, Thumbs
- [ ] **ЭТАП 4: Polish & Production** - Документация, тесты, оптимизация

## 📦 Установка

```bash
npm install tvist
```

## ✨ Возможности

- ⚡ **Легковесный** - всего 6.3kb gzip (с модулями!)
- 🎯 **Модульный** - Engine + Modules архитектура
- 🖱️ **Drag & Drop** - touch/mouse с rubberband эффектом
- 🎨 **Navigation** - стрелки с disabled состояниями
- 📊 **Pagination** - bullets, fraction, progress
- ⏰ **Autoplay** - с паузами и остановками
- 📱 **Responsive** - breakpoints для адаптивности
- 🚀 **60 FPS** - производительность на первом месте
- 💎 **TypeScript** - strict mode, полные типы
- 0️⃣ **Zero deps** - нет внешних зависимостей

## 🚀 Быстрый старт

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

Документация будет доступна после первого релиза.

## 🛠️ Разработка

### Быстрый старт для разработчиков

```bash
# Клонировать репозиторий
git clone https://github.com/VladimirIvanin/tvist.git
cd tvist

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev
```

Dev-сервер откроется на `http://localhost:3000` с примерами.

### Доступные команды

```bash
npm run dev              # Dev-сервер с HMR
npm run dev:watch        # Dev + проверка типов
npm run build           # Production сборка
npm run test            # Запуск тестов
npm run test:ui         # UI для тестов
npm run test:coverage   # Покрытие кодом
npm run lint            # Проверка кода
npm run format          # Форматирование
npm run typecheck       # Проверка типов
```

### Структура проекта

```
tvist/
├── src/               # Исходники
│   ├── core/         # Ядро библиотеки
│   ├── modules/      # Модули (в разработке)
│   ├── utils/        # Утилиты
│   └── styles/       # SCSS стили
├── examples/         # Примеры использования
├── tests/           # Тесты
└── dist/            # Сборка
```

## 🤝 Участие в разработке

Мы приветствуем ваш вклад! См. [CONTRIBUTING.md](CONTRIBUTING.md) для деталей.

## 📄 Лицензия

MIT © [Tvist Contributors](LICENSE)
