# Basic Example

Базовый пример использования слайдера.

<script setup>
import BasicExample from '../.vitepress/theme/examples/BasicExample.vue'
</script>

<BasicExample />

## Код примера

**HTML:**
```html
<div class="tvist">
  <div class="tvist-v0__container">
    <div class="tvist-v0__slide">Slide 1</div>
    <div class="tvist-v0__slide">Slide 2</div>
    <div class="tvist-v0__slide">Slide 3</div>
    <div class="tvist-v0__slide">Slide 4</div>
    <div class="tvist-v0__slide">Slide 5</div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 1,
  gap: 0,
  speed: 300,
  loop: false
});
```

**CSS:**
```css
.tvist-v0__slide {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.tvist-v0__slide:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v0__slide:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v0__slide:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v0__slide:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist-v0__slide:nth-child(5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
```
