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

Браузерная сборка лежит в репозитории в каталоге **`browser-build/`** (не в `dist/` на npm). Подключение через CDN — **jsDelivr (GitHub)** или **raw.githubusercontent.com**.

`@latest` в jsDelivr соответствует **последнему релизу на GitHub**; для фиксированной версии укажите тег (например `{{TVIST_VERSION_TAG}}`). Острие ветки `main`: замените `@latest` на `@main`.

Для магазина в production закрепите тег или разместите файлы на своём домене с долгим кешированием и версией в URL. Проверяйте фактические заголовки `Cache-Control` в браузере.

### Полная браузерная сборка

Все встроенные возможности находятся в одной паре `tvist.min.js` + `tvist.css`. После загрузки доступен конструктор `TvistV1`. Необходимые возможности включаются опциями; дополнительные JS-файлы не загружаются.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { arrows: true, pagination: true, loop: true });
  });
</script>
```

JS и CSS должны иметь одну версию. В npm используйте `import Tvist from 'tvist'` и `import 'tvist/dist/tvist.css'`.

## Сборка

`npm run build:browser` выпускает полную пару `tvist.min.js` + `tvist.css` и gzip-копию `tvist.min.js.gz` в `browser-build/`. Сборка выводит размер gzip и проверяет, что полный JS вместе с баннером занимает не более 100 000 байт до gzip/Brotli. `npm run build` выпускает полную библиотеку в форматах ESM/CJS и определения типов в `dist/`.

## Переход с раздельных сборок

Замените подключения core/modules одной парой `tvist.min.js` + `tvist.css`. Регистрация внешних компонентов и прямой доступ к движку удалены. [Изменения API](/api/modules).

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
