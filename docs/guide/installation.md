# Установка

Tvist можно установить несколькими способами в зависимости от вашего проекта.

## NPM

```bash
npm install tvist
```

## Yarn

```bash
yarn add tvist
```

## PNPM

```bash
pnpm add tvist
```

## CDN

GitHub Actions собирает браузерные файлы и включает их в npm-архив в каталоге `browser-build/`. jsDelivr и UNPKG раздают эти файлы из опубликованного пакета npm.

`@latest` соответствует стабильной версии npm, `@next` — предварительной. Для фиксированной версии укажите номер, например `{{TVIST_VERSION}}`. CDN-ссылки на новую версию доступны после успешной публикации в npm.

Для магазина в production закрепите номер версии. Для UNPKG используйте тот же путь с базой `https://unpkg.com/tvist@{{TVIST_VERSION}}/`.

### Полная браузерная сборка

Все встроенные возможности находятся в одной паре `tvist.min.js` + `tvist.css`. После загрузки доступен конструктор `TvistV1`. Необходимые возможности включаются опциями; дополнительные JS-файлы не загружаются.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tvist@{{TVIST_VERSION}}/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/npm/tvist@{{TVIST_VERSION}}/browser-build/tvist.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { arrows: true, pagination: true, loop: true });
  });
</script>
```

JS и CSS должны иметь одну версию. В npm используйте `import Tvist from 'tvist'` и `import 'tvist/dist/tvist.css'`.

## Скачать файлы релиза

Те же файлы извлекаются из npm-архива и прикрепляются к GitHub Release. Можно скачать [JS](https://github.com/VladimirIvanin/tvist/releases/download/{{TVIST_VERSION_TAG}}/tvist.min.js), [CSS](https://github.com/VladimirIvanin/tvist/releases/download/{{TVIST_VERSION_TAG}}/tvist.css), [gzip JS](https://github.com/VladimirIvanin/tvist/releases/download/{{TVIST_VERSION_TAG}}/tvist.min.js.gz) или [npm-архив](https://github.com/VladimirIvanin/tvist/releases/download/{{TVIST_VERSION_TAG}}/tvist-{{TVIST_VERSION}}.tgz).

## Сборка

`npm run build:browser` выпускает полную пару `tvist.min.js` + `tvist.css` и gzip-копию `tvist.min.js.gz` в `browser-build/`. Сборка выводит размер gzip и проверяет, что полный JS вместе с баннером занимает не более 100 000 байт до gzip/Brotli. `npm run build` выпускает полную библиотеку в форматах ESM/CJS и определения типов в `dist/`.

`browser-build/` создаётся локально или в CI и добавлен в `.gitignore`. Перед локальным `npm pack` выполните обе команды сборки. Поле `files` в `package.json` включает этот каталог в npm-архив.

## Переход с раздельных сборок

Замените подключения core/modules одной парой `tvist.min.js` + `tvist.css`. Регистрация внешних компонентов и прямой доступ к движку удалены. [Изменения API](/api/modules).

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
