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

## Отладка в песочнице

**Всегда используй `sandbox/index.html` для отладки и экспериментов.**

Не создавай дополнительные HTML-файлы в песочнице — все тесты и дебаг делай в основном `index.html`.

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

#### Тестирование window-based брейкпоинтов

Window-based брейкпоинты (по умолчанию) работают в тестах благодаря кастомному моку `window.matchMedia` в `tests/setup.ts`.

**Как это работает:**

```typescript
// В tests/setup.ts настроен динамический мок matchMedia
// который реагирует на изменения window.innerWidth

// В тестах просто изменяй window.innerWidth:
window.innerWidth = 800  // Автоматически триггерит matchMedia события

const slider = new Tvist(root, {
  breakpoints: {
    999: { enabled: true, perPage: 1 }
  }
  // breakpointsBase по умолчанию 'window' - работает!
})

// Слайдер автоматически отреагирует на изменение ширины
```

**Альтернатива:** Container-based брейкпоинты:

```typescript
const slider = new Tvist(root, {
  breakpointsBase: 'container',
  breakpoints: {
    767: { perPage: 1 }
  }
})

// Изменяем размер контейнера
resizeSlider(root, 600) // из fixtures
slider['modules'].get('breakpoints')?.['checkBreakpoints']()
```

**Важно:** Мок `matchMedia` в `tests/setup.ts` поддерживает только `max-width` queries. Если нужны другие типы queries, обнови мок.

### Стили
- BEM нотация: `.tvist-v1__element--modifier`
- SCSS с modern-compiler API
- Переменные в `_variables.scss`
- Базовые стили в `_base.scss`
- **Слайды по индексу:** не использовать `:nth-child()` — при loop порядок в DOM меняется. Использовать селекторы по атрибуту: `.tvist-v1__slide[data-tvist-slide-index="0"]`, `[data-tvist-slide-index="1"]` и т.д. (индекс с 0).

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

## Документация

### Структура документации
- `docs/` - VitePress документация
- `docs/examples/` - примеры использования в Markdown
- `docs/.vitepress/theme/examples/` - интерактивные Vue компоненты примеров

### Добавление нового примера в навигацию
При создании нового модуля или примера необходимо:

1. Создать файл документации: `docs/examples/название.md`
2. Создать интерактивный компонент (опционально): `docs/.vitepress/theme/examples/НазваниеDocExample.vue`
3. **Добавить в навигацию** в файле `docs/.vitepress/config.ts`:
   ```typescript
   {
     text: 'Примеры',
     items: [
       // ... существующие примеры
       { text: 'Название', link: '/examples/название' },
     ]
   }
   ```

### Порядок примеров в навигации
Примеры располагаются в логическом порядке:
1. Базовые примеры (basic, perpage, peek, center)
2. Адаптивность (responsive)
3. Практические примеры (product-cards)
4. Динамические возможности (update-options)
5. Специальные модули (loop, marquee)
6. Эффекты (fade, cube)
7. Направления (vertical)
8. Управление (scroll-control, scrollbar)
9. Расширенные возможности (modules, thumbs, grid)
