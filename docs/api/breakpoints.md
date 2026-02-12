# Breakpoints API

Система адаптивности позволяет настраивать слайдер под разные размеры экрана.

## Desktop-first подход (max-width)

Tvist использует **desktop-first** подход с `max-width` media queries:

- Breakpoint `768` означает "при ширине **≤768px**"
- Breakpoint `1200` означает "при ширине **≤1200px**"

```typescript
new Tvist('.slider', {
  perPage: 4,        // Базовое значение (desktop)
  gap: 20,
  breakpoints: {
    1200: {          // При ширине ≤1200px
      perPage: 3,
      gap: 16
    },
    992: {           // При ширине ≤992px
      perPage: 2,
      gap: 12
    },
    768: {           // При ширине ≤768px
      perPage: 1,
      gap: 0
    }
  }
})
```

## Логика применения

### Выбор breakpoint

При ширине **800px** и breakpoints `{1200: {...}, 992: {...}, 768: {...}}`:

1. `800 ≤ 1200` ✅ — подходит
2. `800 ≤ 992` ✅ — подходит  
3. `800 ≤ 768` ❌ — не подходит

**Применяется ближайший подходящий:** `992`

### Мёрдж опций

Опции из breakpoint **мёрджатся** с базовыми:

```typescript
new Tvist('.slider', {
  perPage: 4,
  gap: 20,
  speed: 500,
  drag: true,
  breakpoints: {
    768: {
      perPage: 1,
      gap: 0
      // speed и drag наследуются из базовых опций
    }
  }
})
```

При ширине ≤768px:
- `perPage: 1` — из breakpoint
- `gap: 0` — из breakpoint
- `speed: 500` — из базовых опций
- `drag: true` — из базовых опций

## Window vs Container

### Window-based (по умолчанию)

Breakpoints считаются от **ширины окна браузера**:

```typescript
new Tvist('.slider', {
  perPage: 4,
  breakpoints: {
    768: { perPage: 1 }
  }
  // breakpointsBase: 'window' — по умолчанию
})
```

### Container-based

Breakpoints считаются от **ширины контейнера слайдера**:

```typescript
new Tvist('.slider', {
  perPage: 3,
  breakpointsBase: 'container',  // ← Важно!
  breakpoints: {
    500: { perPage: 2 },
    400: { perPage: 1 }
  }
})
```

**Когда использовать:**
- Слайдер в узкой колонке (sidebar, grid)
- Адаптивность зависит от размера родителя, а не окна

## Вложенные опции

Можно переопределять вложенные объекты (pagination, arrows):

```typescript
new Tvist('.slider', {
  perPage: 3,
  pagination: {
    limit: 7,
    clickable: true
  },
  breakpoints: {
    992: {
      pagination: {
        limit: 5  // Остальные опции pagination наследуются
      }
    },
    768: {
      pagination: {
        limit: 3
      }
    }
  }
})
```

## Lock/Unlock при breakpoints

Слайдер автоматически блокируется/разблокируется при смене `perPage`:

```typescript
new Tvist('.slider', {
  perPage: 2,  // 2 слайда, perPage 2 → locked
  breakpointsBase: 'container',
  breakpoints: {
    768: {
      perPage: 1  // 2 слайда, perPage 1 → unlocked
    }
  }
})
```

**Пример:** 2 слайда
- Desktop (perPage: 2) → одна страница → стрелки скрыты
- Mobile (perPage: 1) → две страницы → стрелки появляются

## События

### breakpoint

Срабатывает при смене breakpoint:

```typescript
new Tvist('.slider', {
  breakpoints: {
    768: { perPage: 1 }
  },
  on: {
    breakpoint: (bp) => {
      console.log('Breakpoint changed:', bp)  // 768 или null
    }
  }
})
```

**Параметры:**
- `bp: number | null` — номер breakpoint или `null` (базовые опции)

## slideMinSize

Альтернатива breakpoints — автоматический расчёт `perPage`:

```typescript
new Tvist('.slider', {
  slideMinSize: 250,  // Минимальная ширина слайда
  gap: 16
})
```

**Как работает:**
- perPage = floor((containerWidth + gap) / (slideMinSize + gap))
- Автоматически подстраивается при resize

**Когда использовать:**
- Нужна плавная адаптивность без фиксированных breakpoints
- Слайды должны быть примерно одного размера

## Примеры

### Базовый responsive

```typescript
new Tvist('.slider', {
  perPage: 4,
  gap: 20,
  breakpoints: {
    1200: { perPage: 3, gap: 16 },
    992: { perPage: 2, gap: 12 },
    768: { perPage: 1, gap: 0 }
  }
})
```

### Container-based для sidebar

```typescript
new Tvist('.sidebar-slider', {
  perPage: 2,
  gap: 12,
  breakpointsBase: 'container',
  breakpoints: {
    400: { perPage: 1, gap: 0 }
  }
})
```

### Pagination limit по breakpoints

```typescript
new Tvist('.slider', {
  perPage: 3,
  pagination: { limit: 7 },
  breakpoints: {
    992: { pagination: { limit: 5 } },
    768: { pagination: { limit: 3 } }
  }
})
```

### slideMinSize для fluid layout

```typescript
new Tvist('.slider', {
  slideMinSize: 250,
  gap: 16,
  drag: true
})
```

## Типы

```typescript
interface TvistOptions {
  /** Breakpoints (desktop-first, max-width) */
  breakpoints?: Record<number, Partial<TvistOptions>>
  
  /** База для breakpoints: 'window' (по умолчанию) или 'container' */
  breakpointsBase?: 'window' | 'container'
  
  /** Минимальная ширина слайда для авто-расчёта perPage */
  slideMinSize?: number
  
  on?: {
    /** Событие смены breakpoint */
    breakpoint?: (breakpoint: number | null) => void
  }
}
```

## См. также

- [Responsive пример](/examples/responsive)
- [slideMinSize](/api/options#slideminsize)
- [События](/api/events)
