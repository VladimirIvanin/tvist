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

Для быстрого прототипирования можно использовать CDN:

```html
<!-- Последняя версия -->
<link rel="stylesheet" href="https://unpkg.com/tvist/dist/tvist.css">
<script src="https://unpkg.com/tvist/dist/tvist.umd.js"></script>

<!-- Конкретная версия (рекомендуется) -->
<link rel="stylesheet" href="https://unpkg.com/tvist@1.0.0/dist/tvist.css">
<script src="https://unpkg.com/tvist@1.0.0/dist/tvist.umd.js"></script>
```

При использовании через CDN, Tvist будет доступен как глобальная переменная `Tvist`:

```javascript
const slider = new Tvist.Tvist('.tvist', {
  slidesPerView: 1
});
```

## Структура пакета

После установки у вас будет доступ к следующим файлам:

```
tvist/
├── dist/
│   ├── tvist.js          # ES модуль
│   ├── tvist.umd.js      # UMD сборка для браузера
│   ├── tvist.css         # Базовые стили
│   └── tvist.css.map     # Source map для стилей
├── src/                  # Исходный код (TypeScript)
└── package.json
```

## TypeScript

Tvist написан на TypeScript и включает полные определения типов. Они подключаются автоматически при установке через npm/yarn/pnpm.

## Что дальше?

Переходите к разделу [Быстрый старт](/guide/getting-started), чтобы создать свой первый слайдер.
