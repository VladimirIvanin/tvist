# Loop Mode

Бесконечная прокрутка с клонами.

<script setup>
import LoopExample from '../.vitepress/theme/examples/LoopExample.vue'
</script>

<LoopExample />

## Код примера

**HTML:**
```html
<div class="tvist">
  <div class="tvist-v0__container">
    <div class="tvist-v0__slide">1</div>
    <div class="tvist-v0__slide">2</div>
    <div class="tvist-v0__slide">3</div>
    <div class="tvist-v0__slide">4</div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  perPage: 2,
  gap: 20,
  loop: true,
  drag: true,
  speed: 300
});
```

**CSS:**
```css
.tvist-v0__slide {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
}

.tvist-v0__slide:nth-child(4n+1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v0__slide:nth-child(4n+2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v0__slide:nth-child(4n+3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v0__slide:nth-child(4n+4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
```
