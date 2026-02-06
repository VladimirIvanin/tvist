# Scroll Control Module

Модуль для управления слайдером через скролл колесика мыши и touch-жесты на мобильных устройствах.

## Особенности

- ✅ Управление колесиком мыши (wheel events)
- ✅ Touch-жесты для мобильных устройств
- ✅ Горизонтальное и вертикальное направление
- ✅ Автоматическое определение направления скролла
- ✅ Throttle для предотвращения частых срабатываний
- ✅ Release on edges (разрешение нативного скролла на краях)

## Использование

```javascript
import Tvist from 'tvist'

const slider = new Tvist('.tvist', {
  wheel: true
})
```

## Опции

```typescript
interface WheelOptions {
  // Чувствительность (множитель для скорости скролла)
  sensitivity?: number
  
  // Разрешить нативный скролл на краях слайдера
  releaseOnEdges?: boolean
}
```

## Примеры

### Базовое использование

```javascript
const slider = new Tvist('.tvist', {
  wheel: true
})
```

### С настройками

```javascript
const slider = new Tvist('.tvist', {
  wheel: {
    sensitivity: 2,
    releaseOnEdges: false
  }
})
```

### Вертикальный слайдер

```javascript
const slider = new Tvist('.tvist', {
  direction: 'vertical',
  wheel: true
})
```

### Динамическое изменение

```javascript
const slider = new Tvist('.tvist', {
  wheel: true
})

// Изменение настроек
slider.updateOptions({
  wheel: {
    sensitivity: 3,
    releaseOnEdges: false
  }
})
```

## Поведение

### Desktop (Mouse Wheel)

- **Горизонтальный слайдер**: использует `deltaY` (обычный скролл вниз/вверх) для навигации
- **Вертикальный слайдер**: также использует `deltaY` для навигации
- **Trackpad**: поддерживает `deltaX` при shift + wheel или жестах трекпада

### Mobile (Touch)

- **Горизонтальный слайдер**: свайп влево/вправо
- **Вертикальный слайдер**: свайп вверх/вниз
- **Минимальное расстояние**: 50px для срабатывания

### Release on Edges

Когда `releaseOnEdges: true` (по умолчанию):
- На первом слайде разрешает скролл назад (страница скроллится)
- На последнем слайде разрешает скролл вперёд

Когда `releaseOnEdges: false`:
- Скролл блокируется на краях слайдера

## Технические детали

### Throttle

Модуль автоматически ограничивает частоту обработки wheel событий (50ms между событиями) для предотвращения слишком частых переключений.

### Определение направления

Модуль автоматически определяет основное направление скролла:
- Если скролл в перпендикулярном направлении больше, событие игнорируется
- Это позволяет избежать конфликтов при диагональном скролле

### Блокировка во время анимации

Во время анимации перехода к следующему слайду новые события игнорируются до завершения анимации.

## Совместимость

Модуль работает со всеми другими модулями:

- ✅ Drag (можно использовать оба способа навигации)
- ✅ Navigation (Arrows)
- ✅ Pagination
- ✅ Autoplay
- ✅ Loop
- ✅ Scrollbar
- ✅ Effects

## Примеры комбинаций

### С Drag и Navigation

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  drag: true,
  arrows: true
})
```

### С Autoplay

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  autoplay: 3000,
  pauseOnInteraction: true
})
```

### С Loop

```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  loop: true
})
```

## Ссылки

- [Полная документация](/examples/scroll-control)
- [Примеры использования](/examples-list#scroll-control)
