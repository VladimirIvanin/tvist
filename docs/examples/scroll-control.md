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

<ScrollControlDocExample show="horizontal" />

**Код:**
```javascript
const slider = new Tvist('.tvist', {
  wheel: true,
  speed: 300
});
```

## Вертикальный слайдер

<ScrollControlDocExample show="vertical" />

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
