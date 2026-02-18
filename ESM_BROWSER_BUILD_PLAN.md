# ESM Browser Build с динамической загрузкой модулей

## Контекст и цель

**Проблема:** `browser-build/tvist.min.js` весит 108 KB raw / 26 KB gzip. Весь код
всегда загружается целиком, даже если пользователь использует только базовый слайдер.

**Решение:** Добавить второй формат сборки — ESM с code splitting. Браузер загружает
только ядро (~45 KB raw / ~12 KB gzip), а нишевые модули подгружаются динамически
только если соответствующая опция задана.

**Что остаётся без изменений:**
- `browser-build/tvist.min.js` — UMD, всё в одном файле, как сейчас
- `dist/tvist.esm.js`, `dist/tvist.cjs.js` — npm-пакет, без изменений
- Публичный API Tvist — никаких breaking changes

**Новый артефакт:**
- `browser-build/esm/tvist.js` — ESM ядро
- `browser-build/esm/modules/pagination.js` — чанк пагинации
- `browser-build/esm/modules/autoplay.js` — чанк автоплея
- ... и т.д.
- `browser-build/esm/tvist.css` — стили (без изменений)

---

## Текущая архитектура (важно понять перед изменениями)

### Как сейчас регистрируются модули

Каждый `src/modules/*/index.ts` при импорте вызывает side-effect:

```typescript
// src/modules/drag/index.ts
import { Tvist } from '../../core/Tvist'
import { DragModule } from './DragModule'
Tvist.MODULES.set('drag', DragModule)  // <-- side effect при импорте
```

`src/index.ts` импортирует все модули:

```typescript
import './modules/drag'       // регистрирует DragModule
import './modules/navigation' // регистрирует NavigationModule
// ... 13 модулей
```

### Как Tvist инициализирует модули (src/core/Tvist.ts, метод initModules)

```typescript
private initModules(): void {
  Tvist.MODULES.forEach((ModuleClass, name) => {
    const module = new ModuleClass(this, this.options)
    if (module.shouldBeActive?.() !== false) {
      this.modules.set(name, module)
      module.init()
    }
  })
}
```

Метод `shouldBeActive()` в каждом модуле проверяет опции:

```typescript
// PaginationModule
public override shouldBeActive(): boolean {
  return !!this.options.pagination
}

// AutoplayModule
public override shouldBeActive(): boolean {
  return this.options.autoplay !== false && this.options.autoplay !== undefined
}
```

### Размеры модулей (rendered bytes в минифицированном бандле)

| Модуль | Rendered | Gzip |
|---|---|---|
| DragModule | 30.0 KB | 6.6 KB |
| Engine | 26.2 KB | 5.7 KB |
| PaginationModule | 22.6 KB | 4.7 KB |
| Tvist | 20.1 KB | 4.9 KB |
| VideoModule | 19.3 KB | 4.5 KB |
| AutoplayModule | 18.3 KB | 4.0 KB |
| ScrollbarModule | 13.6 KB | 2.7 KB |
| MarqueeModule | 11.5 KB | 2.7 KB |
| LoopModule | 11.3 KB | 2.7 KB |
| GridModule | 8.8 KB | 2.2 KB |
| NavigationModule | 8.2 KB | 2.0 KB |
| VisibilityModule | 7.7 KB | 1.9 KB |
| SlideStatesModule | 7.4 KB | 2.2 KB |
| LazyLoadModule | 6.2 KB | 1.7 KB |
| BreakpointsModule | 4.7 KB | 1.4 KB |
| ScrollControlModule | 3.6 KB | 1.1 KB |
| EffectModule + cube + fade | 6.2 KB | 1.7 KB |
| utils (dom, math, peek, breakpoints, browser) | 7.8 KB | 2.0 KB |
| EventEmitter + Animator + Counter + Vector1D | 9.4 KB | 2.4 KB |
| constants | 2.5 KB | 0.9 KB |

**Ядро (всегда нужно):** Engine + Tvist + Drag + Breakpoints + SlideStates + utils + core = ~106 KB
**Опциональные:** Pagination + Autoplay + Video + Scrollbar + Marquee + Loop + Grid + Navigation + Visibility + LazyLoad + ScrollControl + Effects = ~138 KB

> Важно: DragModule (30 KB) входит в ядро — drag нужен почти всегда.
> VisibilityModule (7.7 KB) тоже в ядро — используется по умолчанию (options.visibility = true).

### Разбивка ядро vs опциональные

**Ядро (~106 KB rendered / ~26 KB gzip):**
- Engine, Tvist, Animator, EventEmitter, Counter, Vector1D, constants
- utils: dom, math, peek, breakpoints, browser
- DragModule (drag: true по умолчанию)
- BreakpointsModule (всегда нужен)
- SlideStatesModule (всегда нужен)
- VisibilityModule (visibility: true по умолчанию)

**Опциональные (~138 KB rendered / ~34 KB gzip):**
- PaginationModule — только если `options.pagination` задан
- AutoplayModule — только если `options.autoplay` задан
- LoopModule — только если `options.loop === true`
- NavigationModule — только если `options.navigation` задан
- VideoModule — только если `options.video` задан
- ScrollbarModule — только если `options.scrollbar` задан
- MarqueeModule — только если `options.marquee` задан
- GridModule — только если `options.grid` задан
- LazyLoadModule — только если `options.lazyload` задан
- ScrollControlModule — только если `options.scrollControl` задан
- ThumbsModule — только если `options.thumbs` задан
- EffectModule + cube/fade — только если `options.effect` задан

---

## Архитектура решения

### Ключевая идея

Tvist при инициализации смотрит на опции и делает `import()` только для нужных модулей.
Это работает в ESM-браузере нативно — браузер кэширует загруженные чанки.

```typescript
// Псевдокод нового initModules (async)
private async initModulesAsync(): Promise<void> {
  // Ядро уже зарегистрировано синхронно (drag, breakpoints, slide-states, visibility)
  
  // Опциональные — грузим только если нужны
  if (this.options.pagination) {
    const { PaginationModule } = await import('./modules/pagination/PaginationModule.js')
    Tvist.MODULES.set('pagination', PaginationModule)
  }
  if (this.options.autoplay) {
    const { AutoplayModule } = await import('./modules/autoplay/AutoplayModule.js')
    Tvist.MODULES.set('autoplay', AutoplayModule)
  }
  // ...
  
  // Инициализируем все зарегистрированные модули
  this.initModules()
}
```

### Проблема: конструктор не может быть async

`new Tvist(el, options)` — синхронный вызов. Нельзя сделать конструктор async.

**Решение:** Фабричный метод `Tvist.create()`:

```typescript
// Новый способ (ESM):
const slider = await Tvist.create(el, options)

// Старый способ (UMD, без изменений):
const slider = new Tvist(el, options)  // все модули уже зарегистрированы синхронно
```

Для UMD-сборки `Tvist.create()` просто вызывает `new Tvist()` синхронно (все модули
уже зарегистрированы через side-effect импорты в `src/index.ts`).

---

## Пошаговый план реализации

### Шаг 1: Новый entry point для ESM-сборки

Создать `src/index.esm.ts` — без side-effect импортов модулей:

```typescript
// src/index.esm.ts
import './styles/tvist.scss'

// Core (синхронно)
export { Tvist, type TvistRootElement } from './core/Tvist'
export { TVIST_CSS_PREFIX, TVIST_CLASSES } from './core/constants'

// Регистрируем только ядро синхронно
import './modules/drag'         // drag: true по умолчанию
import './modules/breakpoints'  // всегда нужен
import './modules/slide-states' // всегда нужен
import './modules/visibility'   // visibility: true по умолчанию

// Опциональные модули НЕ импортируем — они грузятся динамически

export type { TvistOptions } from './core/types'
export type { Module, ModuleConstructor } from './modules/Module'
```

**Файлы для создания/изменения:**
- Создать: `src/index.esm.ts`

---

### Шаг 2: Статический метод `Tvist.create()` в `src/core/Tvist.ts`

Добавить статический async метод, который загружает нужные модули и создаёт инстанс:

```typescript
// src/core/Tvist.ts — добавить статический метод

/**
 * Фабричный метод для ESM-сборки с динамической загрузкой модулей.
 * В UMD-сборке эквивалентен new Tvist() (все модули уже зарегистрированы).
 */
static async create(
  target: string | HTMLElement,
  options: TvistOptions = {}
): Promise<Tvist> {
  await Tvist.loadModulesForOptions(options)
  return new Tvist(target, options)
}

/**
 * Загружает только те модули, которые нужны для данных опций.
 * В UMD-сборке это no-op (модули уже зарегистрированы).
 */
static async loadModulesForOptions(options: TvistOptions): Promise<void> {
  const loads: Promise<void>[] = []

  if (options.pagination) {
    loads.push(
      import('../modules/pagination/index.js').then(() => {})
    )
  }
  if (options.autoplay !== false && options.autoplay !== undefined) {
    loads.push(
      import('../modules/autoplay/index.js').then(() => {})
    )
  }
  if (options.loop) {
    loads.push(
      import('../modules/loop/index.js').then(() => {})
    )
  }
  if (options.navigation) {
    loads.push(
      import('../modules/navigation/index.js').then(() => {})
    )
  }
  if (options.video !== false && options.video !== undefined) {
    loads.push(
      import('../modules/video/index.js').then(() => {})
    )
  }
  if (options.scrollbar) {
    loads.push(
      import('../modules/scrollbar/index.js').then(() => {})
    )
  }
  if (options.marquee !== false && options.marquee !== undefined) {
    loads.push(
      import('../modules/marquee/index.js').then(() => {})
    )
  }
  if (options.grid) {
    loads.push(
      import('../modules/grid/index.js').then(() => {})
    )
  }
  if (options.lazyload !== false && options.lazyload !== undefined) {
    loads.push(
      import('../modules/lazyload/index.js').then(() => {})
    )
  }
  if (options.scrollControl !== false && options.scrollControl !== undefined) {
    loads.push(
      import('../modules/scroll-control/index.js').then(() => {})
    )
  }
  if (options.thumbs) {
    loads.push(
      import('../modules/thumbs/index.js').then(() => {})
    )
  }
  if (options.effect) {
    loads.push(
      import('../modules/effects/index.js').then(() => {})
    )
  }

  await Promise.all(loads)
}
```

**Важно:** В UMD-сборке (`src/index.ts`) все модули уже зарегистрированы через
side-effect импорты, поэтому `loadModulesForOptions` будет вызывать `import()` на
уже загруженные модули — Rollup/браузер вернёт кэшированный результат мгновенно.
Метод `create()` в UMD работает корректно, просто без выигрыша в размере.

**Файлы для изменения:**
- `src/core/Tvist.ts` — добавить `static create()` и `static loadModulesForOptions()`

---

### Шаг 3: Новый Vite конфиг для ESM-сборки

Создать `vite.esm.config.ts`:

```typescript
// vite.esm.config.ts
import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    outDir: 'browser-build/esm',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.esm.ts'),
      formats: ['es'],
      fileName: () => 'tvist.js',
    },
    rollupOptions: {
      output: {
        // Разбиваем на чанки по модулям
        manualChunks: {
          'modules/pagination': ['./src/modules/pagination/PaginationModule.ts'],
          'modules/autoplay':   ['./src/modules/autoplay/AutoplayModule.ts'],
          'modules/loop':       ['./src/modules/loop/LoopModule.ts'],
          'modules/navigation': ['./src/modules/navigation/NavigationModule.ts'],
          'modules/video':      ['./src/modules/video/VideoModule.ts'],
          'modules/scrollbar':  ['./src/modules/scrollbar/ScrollbarModule.ts'],
          'modules/marquee':    ['./src/modules/marquee/MarqueeModule.ts'],
          'modules/grid':       ['./src/modules/grid/GridModule.ts'],
          'modules/lazyload':   ['./src/modules/lazyload/LazyLoadModule.ts'],
          'modules/scroll-control': ['./src/modules/scroll-control/ScrollControlModule.ts'],
          'modules/thumbs':     ['./src/modules/thumbs/ThumbsModule.ts'],
          'modules/effects':    [
            './src/modules/effects/EffectModule.ts',
            './src/modules/effects/cube.ts',
            './src/modules/effects/fade.ts',
          ],
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tvist.css'
          return assetInfo.name || ''
        },
        chunkFileNames: '[name].js',
        entryFileNames: 'tvist.js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      format: { comments: false },
    },
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        // $tvist-block берётся из package.json major версии
        additionalData: `$tvist-block: 'tvist-v1';`,
      },
    },
  },

  plugins: [
    visualizer({
      filename: 'browser-build/esm/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
```

**Файлы для создания:**
- Создать: `vite.esm.config.ts`

---

### Шаг 4: Добавить скрипт в package.json

```json
"build:esm": "tsc && vite build --config vite.esm.config.ts"
```

**Файлы для изменения:**
- `package.json` — добавить `build:esm` в `scripts`

---

### Шаг 5: Обновить .gitignore (опционально)

Если `browser-build/` не в .gitignore, добавить исключение для `stats.html`:

```
browser-build/stats.html
browser-build/esm/stats.html
```

---

## Ожидаемые результаты

### Размеры ESM-сборки

| Файл | Raw | Gzip |
|---|---|---|
| `tvist.js` (ядро) | ~45 KB | ~12 KB |
| `modules/pagination.js` | ~22 KB | ~4.7 KB |
| `modules/autoplay.js` | ~18 KB | ~4.0 KB |
| `modules/loop.js` | ~11 KB | ~2.7 KB |
| `modules/video.js` | ~19 KB | ~4.5 KB |
| `modules/scrollbar.js` | ~13 KB | ~2.7 KB |
| `modules/marquee.js` | ~11 KB | ~2.7 KB |
| `modules/navigation.js` | ~8 KB | ~2.0 KB |
| `modules/grid.js` | ~8 KB | ~2.2 KB |
| `modules/lazyload.js` | ~6 KB | ~1.7 KB |
| `modules/scroll-control.js` | ~3 KB | ~1.1 KB |
| `modules/thumbs.js` | ~1 KB | ~0.5 KB |
| `modules/effects.js` | ~6 KB | ~1.7 KB |

### Реальный выигрыш для пользователей

**Базовый слайдер** (drag, breakpoints, slide-states):
- Сейчас: 108 KB / 26 KB gzip
- После: ~45 KB / ~12 KB gzip → **-54%**

**Слайдер с pagination + autoplay + loop** (типичный use case):
- Сейчас: 108 KB / 26 KB gzip (всё сразу)
- После: 45 + 22 + 18 + 11 = 96 KB raw, но загружается параллельно и кэшируется

**Полный набор** (все модули):
- Суммарно те же ~245 KB raw, но разбито на чанки

---

## Использование пользователем

### Главное правило ESM-сборки

> **В ESM-сборке (`browser-build/esm/`) нужно использовать `Tvist.create()` вместо
> `new Tvist()`. Если использовать `new Tvist()` напрямую — опциональные модули
> (pagination, autoplay, loop и др.) не будут загружены и не будут работать.**

```javascript
// ❌ НЕПРАВИЛЬНО в ESM-сборке — pagination, autoplay, loop не загрузятся
const slider = new Tvist('#my-slider', {
  pagination: true,
  autoplay: 3000,
  loop: true,
})

// ✅ ПРАВИЛЬНО — Tvist.create() загружает нужные модули перед созданием
const slider = await Tvist.create('#my-slider', {
  pagination: true,
  autoplay: 3000,
  loop: true,
})
```

Это ограничение касается **только ESM-сборки** (`browser-build/esm/tvist.js`).
В UMD-сборке (`browser-build/tvist.min.js`) `new Tvist()` работает как прежде —
все модули уже включены в файл.

**Что работает без `Tvist.create()` (всегда в ядре):**
- Drag (свайп/перетаскивание) — `drag: true` по умолчанию
- Breakpoints (адаптивность) — всегда активен
- SlideStates (классы active/prev/next/visible) — всегда активен
- Visibility (пауза при скрытии вкладки) — `visibility: true` по умолчанию

**Что требует `Tvist.create()` (опциональные модули):**
- `pagination` — буллеты, fraction, progress
- `autoplay` — автопрокрутка
- `loop` — бесконечная прокрутка
- `navigation` — кнопки prev/next
- `video` — управление видео
- `scrollbar` — кастомный скроллбар
- `marquee` — режим бегущей строки
- `grid` — сеточный режим
- `lazyload` — ленивая загрузка
- `scrollControl` — управление скроллом
- `thumbs` — миниатюры
- `effect` — эффекты (fade, cube)

---

### Вариант 1: Через CDN (рекомендуемый)

```html
<script type="module">
  import { Tvist } from 'https://cdn.example.com/tvist/esm/tvist.js'

  const slider = await Tvist.create('#my-slider', {
    pagination: true,
    autoplay: 3000,
    loop: true,
  })
  // Браузер автоматически загрузил только pagination.js, autoplay.js, loop.js
</script>
```

### Вариант 2: Локально

```html
<link rel="stylesheet" href="/tvist/esm/tvist.css">
<script type="module">
  import { Tvist } from '/tvist/esm/tvist.js'

  const slider = await Tvist.create('#my-slider', {
    pagination: { type: 'bullets' },
  })
</script>
```

### Вариант 3: Preload для критических модулей

```html
<!-- Подсказываем браузеру загрузить заранее -->
<link rel="modulepreload" href="/tvist/esm/tvist.js">
<link rel="modulepreload" href="/tvist/esm/modules/pagination.js">

<script type="module">
  import { Tvist } from '/tvist/esm/tvist.js'
  const slider = await Tvist.create('#slider', { pagination: true })
</script>
```

### Вариант 4: Если нужен синхронный `new Tvist()` в ESM

Если по какой-то причине нельзя использовать `await`, можно вручную предзагрузить
нужные модули:

```javascript
import { Tvist } from '/tvist/esm/tvist.js'

// Предзагружаем нужные модули вручную
await Tvist.loadModulesForOptions({ pagination: true, autoplay: 3000 })

// Теперь new Tvist() работает — модули уже зарегистрированы
const slider = new Tvist('#my-slider', { pagination: true, autoplay: 3000 })
```

---

## Потенциальные сложности

### 1. Динамические импорты в Tvist.ts нарушат tree-shaking для npm-пакета

`import('../modules/pagination/index.js')` в `src/core/Tvist.ts` — это строковые
пути. Rollup при сборке npm-пакета (ESM/CJS) может не разрезать их корректно.

**Решение:** Метод `loadModulesForOptions` помечать как `/* @__PURE__ */` или
выносить в отдельный файл `src/core/lazy-loader.ts`, который импортируется только
в `src/index.esm.ts`, но не в `src/index.ts`.

### 2. Расширения `.js` в import() путях

В TypeScript нужно писать `.js` в динамических импортах (даже для `.ts` файлов):

```typescript
import('../modules/pagination/index.js')  // правильно для ESM output
```

### 3. CSS не разбивается по модулям

Все стили идут в один `tvist.css`. Это нормально — CSS уже маленький (8.8 KB / 2 KB gzip).

### 4. Совместимость с updateOptions()

Если пользователь вызывает `slider.updateOptions({ pagination: true })` после
инициализации — модуль пагинации ещё не загружен. Нужно обработать этот случай
в методе `updateOptions` аналогично `create()`.

**Решение:** В `updateOptions` добавить аналогичную логику:

```typescript
async updateOptionsAsync(newOptions: Partial<TvistOptions>): Promise<void> {
  await Tvist.loadModulesForOptions({ ...this.options, ...newOptions })
  this.updateOptions(newOptions)
}
```

---

## Файлы, которые нужно создать/изменить

| Файл | Действие | Описание |
|---|---|---|
| `src/index.esm.ts` | Создать | Entry point без side-effect импортов опциональных модулей |
| `src/core/Tvist.ts` | Изменить | Добавить `static create()` и `static loadModulesForOptions()` |
| `vite.esm.config.ts` | Создать | Конфиг Vite для ESM-сборки с manualChunks |
| `package.json` | Изменить | Добавить скрипт `build:esm` |

**Итого: 2 новых файла + изменения в 2 существующих.**

---

## Порядок работы

1. Создать `src/index.esm.ts`
2. Добавить `static create()` и `static loadModulesForOptions()` в `src/core/Tvist.ts`
3. Создать `vite.esm.config.ts`
4. Добавить `build:esm` в `package.json`
5. Запустить `npm run build:esm` и проверить размеры чанков
6. Проверить в sandbox: `sandbox/index.html` — заменить `<script src>` на `<script type=module>` с `Tvist.create()`
7. Убедиться что UMD-сборка (`npm run build:browser`) не сломалась
8. Убедиться что тесты проходят (`npm run test`)

---

## Текущее состояние (на момент создания плана)

- `browser-build/tvist.min.js`: 108.75 KB raw / 26.06 KB gzip
- `browser-build/tvist.css`: 8.82 KB / 2.04 KB gzip
- `vite.browser.config.ts`: настроен, включён visualizer, агрессивный Terser
- `src/styles/core/_base.scss`: восстановлен из git
- `rollup-plugin-visualizer`: установлен в devDependencies
- `browser-build/stats.html`: генерируется при каждом `npm run build:browser`
