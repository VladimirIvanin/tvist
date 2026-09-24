# Vertical Examples

Примеры использования вертикальной ориентации.


## 1. Простой вертикальный слайдер

<Demo id="vertical" />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  perPage: 2,
  gap: 15,
  loop: false
});
```

## 2. Вертикальные миниатюры (Gallery)

Сложный кейс: вертикальная лента миниатюр слева синхронизирована с основным горизонтальным слайдером.
У миниатюр включен `slideMinSize` для адаптивности.

<Demo id="vertical-thumbs" />

**Код:**
```javascript
// Вертикальные миниатюры
const thumbsVertical = new Tvist('.tvist-thumbs', {
  direction: 'vertical',
  slideMinSize: 90,
  gap: 10,
  isNavigation: true
});

// Основной горизонтальный слайдер
const mainHorizontal = new Tvist('.tvist-main', {
  direction: 'horizontal',
  perPage: 1,
  gap: 10,
  speed: 500
});

// Синхронизация
mainHorizontal.sync(thumbsVertical);
```
