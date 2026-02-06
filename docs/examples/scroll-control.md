# Scroll Control

Модуль для управления слайдером через скролл колесика мыши и touch-жесты на мобильных устройствах.

## Базовый пример

Включите опцию `wheel: true` для активации модуля:

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  speed: 300
});
```

## Горизонтальный слайдер

<script setup>
import { ref, onMounted } from 'vue'
import Tvist from 'tvist'

const horizontalRef = ref(null)
const verticalRef = ref(null)

onMounted(() => {
  if (horizontalRef.value) {
    new Tvist(horizontalRef.value, {
      wheel: true,
      speed: 300,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
  if (verticalRef.value) {
    new Tvist(verticalRef.value, {
      direction: 'vertical',
      wheel: true,
      speed: 300,
      pagination: {
        type: 'bullets',
        clickable: true
      }
    })
  }
})
</script>

<div ref="horizontalRef" class="tvist" style="margin-bottom: 2rem; height: 300px;">
  <div class="tvist__container">
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 1
      <div style="position: absolute; bottom: 20px; font-size: 14px; opacity: 0.8;">
        Используйте колесико мыши или свайп
      </div>
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 2
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 3
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 4
    </div>
    <div class="tvist__slide" style="height: 300px; min-height: 300px; flex-shrink: 0; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 5
    </div>
  </div>
</div>

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  speed: 300
});
```

## Вертикальный слайдер

<div ref="verticalRef" class="tvist tvist--vertical" style="height: 400px; margin-bottom: 2rem;">
  <div class="tvist__container">
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 1
      <div style="position: absolute; bottom: 20px; font-size: 14px; opacity: 0.8;">
        Скроллите вертикально
      </div>
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 2
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 3
    </div>
    <div class="tvist__slide" style="height: 400px; min-height: 400px; flex-shrink: 0; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
      Слайд 4
    </div>
  </div>
</div>

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  wheel: true,
  speed: 300
});
```

## Расширенные настройки

Модуль поддерживает дополнительные параметры:

```javascript
const slider = new Tvist('.tvist', {
  wheel: {
    // Чувствительность (множитель для скорости скролла)
    sensitivity: 1,
    
    // Разрешить нативный скролл на краях слайдера
    // При true - на первом и последнем слайде страница будет скроллиться
    releaseOnEdges: true
  }
});
```

### Пример с releaseOnEdges: false

Когда `releaseOnEdges: false`, скролл блокируется на краях слайдера:

```javascript
const slider = new Tvist('.tvist', {
  wheel: {
    releaseOnEdges: false
  }
});
```

## Поддержка мобильных устройств

Модуль автоматически поддерживает touch-жесты на мобильных устройствах:

- **Горизонтальный слайдер**: свайп влево/вправо
- **Вертикальный слайдер**: свайп вверх/вниз

Минимальное расстояние для срабатывания свайпа: **50px**

## Особенности

1. **Throttle**: Модуль автоматически ограничивает частоту срабатывания wheel событий (50ms между событиями)
2. **Направление**: Модуль определяет основное направление скролла и игнорирует перпендикулярные движения
3. **Boundaries**: На краях слайдера можно разрешить или запретить нативный скролл страницы
4. **Touch support**: Полная поддержка touch событий для мобильных устройств

## API

### Опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `wheel` | `boolean \| object` | `false` | Включить модуль скролла |
| `wheel.sensitivity` | `number` | `1` | Чувствительность скролла |
| `wheel.releaseOnEdges` | `boolean` | `true` | Разрешить нативный скролл на краях |

### Примеры использования

#### Простая активация
```javascript
const slider = new Tvist('.tvist', {
  wheel: true
});
```

#### С настройками
```javascript
const slider = new Tvist('.tvist', {
  wheel: {
    sensitivity: 2,
    releaseOnEdges: false
  }
});
```

#### Вертикальный слайдер
```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  wheel: true
});
```

#### Динамическое изменение настроек
```javascript
const slider = new Tvist('.tvist', {
  wheel: true
});

// Изменение настроек в runtime
slider.updateOptions({
  wheel: {
    sensitivity: 3,
    releaseOnEdges: false
  }
});
```

## Совместимость с другими модулями

Модуль ScrollControl отлично работает с другими модулями:

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  drag: true,           // Drag + Scroll
  arrows: true,         // Navigation + Scroll
  pagination: true,     // Pagination + Scroll
  loop: true,          // Loop + Scroll
  autoplay: 3000       // Autoplay + Scroll
});
```

## Комбинация с Drag

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  drag: true,
  arrows: true,
  pagination: {
    type: 'bullets',
    clickable: true
  }
});
```

Пользователь может управлять слайдером:
- Скроллом колесика мыши
- Touch-жестами на мобильных
- Перетаскиванием (drag)
- Кнопками навигации
- Кликами по пагинации
