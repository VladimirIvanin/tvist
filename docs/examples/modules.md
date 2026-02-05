# Modules Demo

Демонстрация различных модулей Tvist.

<script setup>
import DragNavigationExample from '../.vitepress/theme/examples/DragNavigationExample.vue'
import AutoplayExample from '../.vitepress/theme/examples/AutoplayExample.vue'
</script>

## 1. Drag + Navigation

<DragNavigationExample />

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

<AutoplayExample />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  autoplay: 3000,
  pauseOnHover: true,
  pagination: {
    type: 'bullets',
    clickable: true
  }
});

// Управление автопрокруткой
slider.getModule('autoplay')?.getAutoplay().start();
slider.getModule('autoplay')?.getAutoplay().stop();
```
