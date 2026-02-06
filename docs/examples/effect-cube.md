# Cube Effect

3D трансформация в виде куба.

<script setup>
import CubeExample from '../.vitepress/theme/examples/CubeExample.vue'
</script>

<CubeExample />

## Код примера

**HTML:**
```html
<div class="cube-wrapper">
  <div class="tvist">
    <div class="tvist-v0__container">
      <div class="tvist-v0__slide">Slide 1</div>
      <div class="tvist-v0__slide">Slide 2</div>
      <div class="tvist-v0__slide">Slide 3</div>
      <div class="tvist-v0__slide">Slide 4</div>
    </div>
  </div>
</div>
```

**JavaScript:**
```javascript
const slider = new Tvist('.tvist', {
  effect: 'cube',
  cubeEffect: {
    slideShadows: true,
    shadow: true,
    shadowOffset: 20,
    shadowScale: 0.94
  },
  speed: 600,
  loop: true
});
```

**CSS:**
```css
.cube-wrapper {
  perspective: 1000px;
  width: 300px;
  height: 300px;
  margin: 0 auto;
}

.tvist-v0__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: white;
}

/* Используем data-атрибут вместо nth-child для корректной работы с loop */
.tvist-v0__slide[data-tvist-slide-index="0"] { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v0__slide[data-tvist-slide-index="1"] { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v0__slide[data-tvist-slide-index="2"] { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v0__slide[data-tvist-slide-index="3"] { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
```
