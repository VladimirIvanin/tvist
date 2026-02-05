# Tvist - Правила разработки

## Структура проекта

- `src/core/` - ядро библиотеки (Engine, Animator, Vector1D, Counter, EventEmitter)
- `src/modules/` - модули (Arrows, Pagination, Autoplay, Drag, etc.)
- `src/utils/` - утилиты (dom, math)
- `src/styles/` - SCSS стили
- `sandbox/` - песочница для экспериментов
- `docs/` - документация и примеры
- `tests/` - тесты (unit, integration)
- `dist/` - собранная библиотека

## Команды разработки

```bash
npm run dev              # Запуск Sandbox (порт 3000)
npm run docs:dev         # Запуск документации и примеров
npm run build           # Production сборка библиотеки
npm run test            # Запуск тестов
npm run lint            # Проверка кода
npm run typecheck       # Проверка типов
```

## Правила кодирования

### TypeScript
- Строгая типизация (strict mode)
- JSDoc комментарии для публичного API
- Интерфейсы для всех опций
- Экспорт типов из `src/core/types.ts`

### Тестирование
- Покрытие > 80% для core модулей
- Unit тесты для каждого класса
- Тестовые данные в отдельных файлах
- Используем Vitest + happy-dom

### Стили
- BEM нотация: `.tvist__element--modifier`
- SCSS с modern-compiler API
- Переменные в `_variables.scss`
- Базовые стили в `_base.scss`

### Код
- ESLint + Prettier
- Функциональное программирование где возможно
- Избегаем мутаций (используем immutable подходы)
- Производительность > 60 FPS

## Архитектура

### Core принципы
1. **Separation of Concerns** - Engine отделён от DOM
2. **Composition over Inheritance** - модульность
3. **Performance First** - RAF, throttle, оптимизации
4. **Type Safety** - TypeScript строгий режим

### Модули
- Независимы друг от друга
- Подключаются опционально
- Используют EventEmitter для связи
- Не зависят от внутренностей Engine
