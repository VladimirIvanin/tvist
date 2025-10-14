# 🚲 Velosiped

> Модульный и легковесный слайдер для современного веба

[![npm version](https://img.shields.io/npm/v/velosiped.svg)](https://www.npmjs.com/package/velosiped)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/velosiped)](https://bundlephobia.com/package/velosiped)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🚧 В разработке

Velosiped находится в активной разработке. Следите за обновлениями!

### Roadmap

- [x] Настройка проекта
- [ ] Core Engine (в процессе)
- [ ] Базовые модули
- [ ] Продвинутые фичи
- [ ] Документация и примеры

## 📦 Установка

```bash
npm install velosiped
```

## 🚀 Быстрый старт

```typescript
import Velosiped from 'velosiped';
import 'velosiped/dist/velosiped.css';

const slider = new Velosiped('#slider', {
  perPage: 3,
  gap: 20,
  drag: true,
  arrows: true
});
```

## 📖 Документация

Документация будет доступна после первого релиза.

## 🛠️ Разработка

### Быстрый старт для разработчиков

```bash
# Клонировать репозиторий
git clone https://github.com/yourusername/velosiped.git
cd velosiped

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
velosiped/
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

MIT © [Velosiped Contributors](LICENSE)

