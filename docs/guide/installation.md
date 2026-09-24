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

```html
<!-- jsDelivr — последний релиз GitHub -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.min.js"></script>

<!-- Закрепить версию (текущая {{TVIST_VERSION_TAG}}) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.min.js"></script>
```

Если магазину нужны все модули, используйте именно `tvist.min.js`: один JS-запрос и меньший общий объём, чем у `core` вместе с пакетом модулей. Подключайте его один раз и только на страницах, где есть слайдер. После загрузки скрипта доступен глобальный конструктор **`TvistV1`**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const slider = new TvistV1('.tvist-v1', { perPage: 1, gap: 20 });
});
```

### Сборка для обычной карусели

Для карусели со свайпом, стрелками и пагинацией используйте один `tvist.standard.min.js`. Он также включает breakpoints и классы состояний слайдов. Добавьте кнопки с классами `tvist-v1__arrow--prev` и `tvist-v1__arrow--next` внутрь слайдера.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.standard.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { arrows: true, pagination: true });
  });
</script>
```

### Лёгкая сборка и отдельные модули

`tvist.core.min.js` содержит ядро, drag и breakpoints. Для простого слайдера без стрелок и пагинации достаточно этого файла. Дополнительные функции подключаются обычными скриптами из `browser-build/modules/`. Загрузите нужные модули **до** создания `TvistV1`; порядок загрузки модулей и ядра не важен.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.core.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/modules/pagination.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { pagination: true });
  });
</script>
```

Доступные файлы модулей: `navigation`, `pagination`, `autoplay`, `loop`, `slide-states`, `thumbs`, `effect`, `grid`, `scroll-control`, `scrollbar`, `marquee`, `lazyload`, `video`, `visibility`. Файл `tvist.modules.min.js` подключает их все сразу. Если нужны многие функции, используйте полный `tvist.min.js`: он передаёт меньше кода, чем `core` и пакет модулей вместе. Выбирайте **одну** из сборок с конструктором (`core`, `standard` или полную) и загружайте её только на страницах со слайдером.

## Структура пакета

В публикуемом пакете ориентируйтесь на **`browser-build/`** (браузер: минифицированный JS и CSS):

```
tvist/
├── browser-build/
│   ├── tvist.min.js          # Сборка для <script> (глобаль TvistV1)
│   ├── tvist.css             # Стили
│   ├── tvist.core.min.js     # Ядро, drag и breakpoints
│   ├── tvist.standard.min.js # Типовая карусель одним файлом
│   ├── tvist.modules.min.js  # Все дополнительные модули одним файлом
│   └── modules/              # Дополнительные модули по одному
│       └── <name>.min.js
├── src/                      # Исходный код (если включён в пакет)
└── package.json
```

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
