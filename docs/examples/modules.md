# Modules Demo

Демонстрация различных модулей Tvist.


## 1. Drag + Navigation

<Demo id="modules" />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  rubberband: true,
  speed: 300
});
```

## 2. Autoplay + Pagination

<Demo id="modules-autoplay" />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  autoplay: { delay: 3000, pauseOnHover: true },
  pagination: {
    type: 'bullets',
    clickable: true
  }
});

// Управление автопрокруткой
slider.getModule('autoplay')?.getAutoplay().start();
slider.getModule('autoplay')?.getAutoplay().stop();
```
