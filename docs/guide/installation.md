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

### Core для обычной карусели

`tvist.core.min.js` включает Drag, Breakpoints, Navigation, Pagination, SlideStates, Autoplay, Loop и Visibility. Его стили находятся в `tvist.core.css`. После загрузки доступен глобальный конструктор **`TvistV1`**.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.core.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.core.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { arrows: true, pagination: true, loop: true });
  });
</script>
```

### Дополнительные модули

`tvist.modules.min.js` добавляет Thumbs, Effects (Fade/Cube), Grid, ScrollControl, Scrollbar, Marquee, LazyLoad и Video. Для их оформления подключите `tvist.modules.css` после CSS core.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.core.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.modules.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.core.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.modules.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { effect: 'cube', perPage: 1, arrows: true });
  });
</script>
```

Все четыре файла должны иметь одну версию. Загружайте необходимые JS **до** создания слайдера; опции не подгружают модули автоматически. При `defer` инициализируйте слайдер в `DOMContentLoaded`. Очередь регистрации позволяет загрузить modules до core; повторное подключение modules не дублирует регистрацию.

Modules дополняет core и не содержит отдельного конструктора. Общая CSS-сборка для npm доступна через `import 'tvist/dist/tvist.css'`; также доступны отдельные CSS-экспорты `tvist/browser-build/tvist.core.css` и `tvist/browser-build/tvist.modules.css`.

### Полная сборка

`tvist.min.js` включает ядро и все 16 модулей; `tvist.css` объединяет стили core и modules. Эта пара заменяет отдельные пары core и modules. Глобальный конструктор остаётся `TvistV1`.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.css">
<script defer src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    new TvistV1('.tvist-v1', { effect: 'cube', perPage: 1, arrows: true });
  });
</script>
```

JS и CSS должны иметь одну версию. При использовании полной сборки отдельно загружать дополнительные модули не требуется. Полные браузерные стили также доступны через `import 'tvist/browser-build/tvist.css'`.

## Структура пакета

`npm run build:browser` и `npm run build:browser:split` создают все шесть файлов в `browser-build/`:

```text
tvist/
├── browser-build/
│   ├── tvist.core.min.js     # Основная сборка, глобаль TvistV1
│   ├── tvist.core.css        # Базовые стили, стрелки и пагинация
│   ├── tvist.modules.min.js  # Дополнительные модули
│   ├── tvist.modules.css    # Стили дополнительных модулей
│   ├── tvist.min.js         # Ядро и все 16 модулей, глобаль TvistV1
│   └── tvist.css            # Полные браузерные стили
├── dist/                    # Npm-сборка и полные стили tvist.css
├── src/
└── package.json
```

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
