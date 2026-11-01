# 🤝 Участие в разработке Tvist

Спасибо за интерес к проекту! Мы приветствуем любой вклад в развитие библиотеки.

## 🚀 Быстрый старт

### Подготовка окружения

1. Fork репозитория
2. Клонируйте ваш fork:
```bash
git clone https://github.com/your-username/tvist.git
cd tvist
```

3. Установите зависимости:
```bash
npm install
```

4. Запустите тесты:
```bash
npm test
```

## 🔧 Разработка

### Структура проекта

```
tvist/
├── src/
│   ├── core/         # Ядро библиотеки
│   ├── modules/      # Модули (drag, pagination, etc.)
│   ├── utils/        # Утилиты
│   └── styles/       # SCSS стили
├── tests/            # Тесты
├── examples/         # Примеры использования
└── docs/             # Документация
```

### Скрипты

- `npm run dev` - Запуск в dev режиме
- `npm run build` - Сборка production
- `npm test` - Запуск тестов
- `npm run test:coverage` - Тесты с coverage
- `npm run lint` - Проверка кода
- `npm run lint:fix` - Автофикс проблем
- `npm run format` - Форматирование кода

### Workflow

1. Создайте ветку для вашей фичи:
```bash
git checkout -b feature/my-new-feature
```

2. Внесите изменения и напишите тесты

3. Убедитесь, что тесты проходят:
```bash
npm test
npm run lint
npm run typecheck
```

4. Закоммитьте изменения:
```bash
git commit -m "feat: add new feature"
```

5. Push и создайте Pull Request

## ✅ Требования к коду

### TypeScript

- Используйте strict mode
- Все публичные API должны быть типизированы
- Избегайте `any`, используйте `unknown` если необходимо

### Тесты

- Coverage должен быть > 80%
- Пишите unit тесты для всего функционала
- Добавляйте integration тесты для модулей

### Стиль кода

- Следуйте конфигурации ESLint и Prettier
- Используйте meaningful имена переменных
- Комментируйте сложную логику

### Коммиты

Используйте Conventional Commits:

- `feat:` - новая фича
- `fix:` - исправление бага
- `docs:` - изменения в документации
- `style:` - форматирование кода
- `refactor:` - рефакторинг
- `test:` - добавление тестов
- `chore:` - изменения в сборке/CI

## 📝 Pull Requests

### Checklist

- [ ] Тесты написаны и проходят
- [ ] Coverage не упал
- [ ] Lint проходит без ошибок
- [ ] Документация обновлена
- [ ] CHANGELOG.md обновлен (если нужно)

### Описание PR

Опишите:
- Что изменено и почему
- Как протестировать
- Screenshots (если UI изменения)
- Breaking changes (если есть)

## 🐛 Баг репорты

Используйте GitHub Issues. Укажите:
- Версию библиотеки
- Шаги для воспроизведения
- Ожидаемое и фактическое поведение
- Браузер и ОС

## 💡 Идеи и предложения

Создайте Issue с меткой `enhancement` и опишите:
- Проблему, которую решает предложение
- Предлагаемое решение
- Альтернативы
- Примеры использования

## Публикация в npm

В [настройках пакета tvist](https://www.npmjs.com/package/tvist/access) добавьте GitHub Actions как Trusted Publisher. Укажите владельца `VladimirIvanin`, репозиторий `tvist` и файл workflow `publish.yml`. Оставьте Environment пустым и разрешите `npm publish`. GitHub Actions получит доступ через OIDC. [Инструкция npm](https://docs.npmjs.com/trusted-publishers/)

1. Убедитесь, что в `package.json` и `package-lock.json` указана нужная версия и она свободна в npm. Чтобы поднять версию, используйте, например, `npm version patch --no-git-tag-version` и включите оба файла в релизный коммит.
2. На GitHub создайте Release с тегом `v<версия>` на этом коммите. Для предварительного выпуска отметьте **Set as a pre-release**.
3. Нажмите **Publish release**. В разделе **Actions → Publish to npm** можно проверить сборку, тесты и публикацию. Стабильный релиз получает npm-тег `latest`, предварительный — `next`.

## 📄 Лицензия

Внося вклад, вы соглашаетесь с тем, что ваш код будет распространяться под лицензией MIT.

---

Спасибо за вклад в развитие Tvist! 🚲

