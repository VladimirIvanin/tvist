# Как собирается документация

Документация Tvist — статический многостраничный сайт на Vite. Исходный текст находится в Markdown-файлах `docs/guide/`, `docs/api/` и `docs/examples/`; страницы создаёт `scripts/build-docs.ts`.

## Команды

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

При сборке `scripts/generate-options-meta.ts` читает JSDoc из `src/core/types.ts` и обновляет `docs/site/options-meta.json`. Эти метаданные используются таблицей API и формой конструктора.

## Живые примеры

Для каждой опубликованной демонстрации есть `docs/site/demos/<id>/markup.html`, `style.css` и `script.js`. Предпросмотр исполняет эти файлы в отдельном iframe, а посетитель видит и копирует их исходный текст. Каталог формируется из `docs/site/demos.json`.

Статические страницы сохраняют привычные адреса вида `/tvist/examples/basic.html`. Готовый сайт находится в `docs/dist/` и публикуется на GitHub Pages.
