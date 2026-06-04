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

```html
<!-- jsDelivr — последний релиз GitHub -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.css">
<script src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@latest/browser-build/tvist.min.js"></script>

<!-- Закрепить версию (текущая {{TVIST_VERSION_TAG}}) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.css">
<script src="https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@{{TVIST_VERSION_TAG}}/browser-build/tvist.min.js"></script>
```

После загрузки скрипта доступен глобальный конструктор **`TvistV1`**:

```javascript
const slider = new TvistV1('.tvist-v1', {
  perPage: 1,
  gap: 20,
});
```

## Структура пакета

В публикуемом пакете ориентируйтесь на **`browser-build/`** (браузер: минифицированный JS и CSS):

```
tvist/
├── browser-build/
│   ├── tvist.min.js          # Сборка для <script> (глобаль TvistV1)
│   ├── tvist.css             # Стили
│   ├── tvist.core.min.js     # Опционально: только ядро
│   └── tvist.modules.min.js  # Опционально: модули отдельно
├── src/                      # Исходный код (если включён в пакет)
└── package.json
```

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
