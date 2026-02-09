# Changelog - API Documentation

## 2026-02-09

### Добавлено

- ✅ Опция `freeSnap` - автоматическое выравнивание к слайду в free режиме
- ✅ Страница документации `/examples/drag-free` с интерактивными примерами
- ✅ Vue компонент `DragFreeDocExample.vue` с 3 режимами drag
- ✅ Тестовая страница `sandbox/drag-free-test.html`

### Функционал freeSnap

#### Режимы перетаскивания:

```js
// Обычный режим - snap во время drag
drag: true

// Free mode - свободная прокрутка
drag: 'free'

// Free mode + Snap - свободная прокрутка с выравниванием
drag: 'free',
freeSnap: true
```

#### Примеры:

- Free mode без snap - momentum scroll без ограничений
- Free mode с snap - плавная прокрутка с автоматическим выравниванием
- Normal mode - классическое поведение слайдера
- Динамическое переключение режимов
- Free mode с peek и center

### Изменено

- 📝 Обновлён `src/core/types.ts` - добавлен тип `freeSnap`
- 📝 Обновлён `src/modules/drag/DragModule.ts` - поддержка snap в free режиме
- 📝 Обновлён `docs/api/options.md` - документация опции freeSnap
- 📝 Обновлён `docs/.vitepress/config.ts` - добавлена навигация к примеру

### Документация

- Интерактивные примеры с переключением режимов
- Описание всех трёх режимов drag
- Примеры использования с другими модулями
- Адаптивные настройки с breakpoints

## 2026-02-05 (Update 2)

### Добавлено

- ✅ Опция `padding` - отступы слайдера (left/right или top/bottom)
- ✅ Утилиты для работы с padding в `src/utils/padding.ts`
- ✅ 32 теста для функционала padding (unit + integration)
- ✅ Страница документации `/examples/padding` с 7 живыми примерами
- ✅ Vue компоненты примеров padding

### Функционал padding

#### Поддерживаемые форматы:

```js
// Число (пиксели)
padding: 50

// CSS строка
padding: '2rem'
padding: '10%'

// Объект для горизонтального слайдера
padding: { left: 50, right: 100 }

// Объект для вертикального слайдера
padding: { top: 50, bottom: 100 }
```

#### Примеры:

- Базовый padding
- Padding в процентах
- Асимметричный padding
- Padding с несколькими слайдами
- Вертикальный слайдер с padding
- Адаптивный padding с breakpoints
- Смешанные единицы измерения

### Изменено

- 📝 Обновлён `src/core/types.ts` - добавлен тип padding
- 📝 Обновлён `src/core/Engine.ts` - учёт padding при расчётах
- 📝 Обновлён `docs/api/options.md` - добавлена информация о padding
- 📝 Обновлён `docs/.vitepress/options-meta.json` - метаданные padding

### Тесты

- ✅ 17 unit тестов для утилит padding
- ✅ 15 integration тестов для Engine с padding
- ✅ Все существующие тесты проходят (278 tests)

## 2026-02-05 (Update 1)

### Добавлено

- ✅ Автоматически генерируемая таблица настроек слайдера
- ✅ Компонент `OptionsTable.vue` с поиском и раскрытием вложенных свойств
- ✅ Страница `/api/` с полной API документацией
- ✅ Страница `/api/options` с детальным справочником опций
- ✅ Метаданные опций в `options-meta.json`
- ✅ JSDoc комментарии для всех опций в `types.ts`
- ✅ Скрипт автоматической генерации метаданных (экспериментальный)

### Изменено

- 📝 Обновлён `src/core/types.ts` с детальными описаниями всех опций
- 📝 Обновлена конфигурация VitePress с разделом API
- 📝 Закомментирована опция `marquee` (не реализована)

### Функционал

#### Таблица опций

- Поиск по названию, типу, описанию
- Раскрытие/скрытие вложенных свойств
- Автоматическое раскрытие при поиске
- Адаптивный дизайн

#### Генерация

```bash
# Автоматическая генерация метаданных из types.ts
npm run docs:generate-meta

# Запуск dev сервера
npm run docs:dev

# Продакшн сборка (с автоматической генерацией)
npm run docs:build
```

### Структура файлов

```
docs/
├── .vitepress/
│   ├── config.ts              # Обновлена конфигурация
│   ├── options-meta.json      # Метаданные опций
│   └── theme/
│       ├── index.ts           # Зарегистрирован OptionsTable
│       └── OptionsTable.vue   # Новый компонент таблицы
├── api/
│   ├── index.md              # API документация
│   ├── options.md            # Справочник опций
│   ├── README.md             # Инструкции
│   └── CHANGELOG.md          # Этот файл
scripts/
└── generate-options-meta.ts  # Скрипт генерации
src/
└── core/
    └── types.ts              # Обновлены JSDoc комментарии
```

### Исключённые опции

- `marquee` - ещё не реализована, закомментирована в типах

### Ссылки

- [Документация](/api/)
- [Таблица опций](/api/options)
- [Репозиторий](https://github.com/VladimirIvanin/tvist)
