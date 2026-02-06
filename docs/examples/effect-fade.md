# Fade Effect

Плавный переход через прозрачность (Cross-fade).

<script setup>
import FadeExample from '../.vitepress/theme/examples/FadeExample.vue'
</script>

<FadeExample />

## Код примера

**HTML:**
```html
<div class="tvist">
  <div class="tvist-v0__container">
    <div class="tvist-v0__slide">Slide 1</div>
    <div class="tvist-v0__slide">Slide 2</div>
    <div class="tvist-v0__slide">Slide 3</div>
    <div class="tvist-v0__slide">Slide 4</div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  effect: 'fade',
  fadeEffect: {
    crossFade: false // или true для одновременного показа слайдов
  },
  speed: 600,
  loop: true
});
```

**CSS:**
```css
.tvist {
  width: 100%;
  height: 400px;
  background: #000;
  border-radius: 12px;
}

.tvist-v0__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: white;
}

.tvist-v0__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v0__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v0__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v0__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
```
