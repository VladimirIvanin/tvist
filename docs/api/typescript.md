# TypeScript

Tvist полностью типизирован с включенным strict mode. Все публичные API имеют типы, а опции строго проверяются на этапе компиляции.

## Основные типы

### TvistOptions

Интерфейс опций слайдера:

```typescript
import Tvist, { type TvistOptions } from 'tvist'

const options: TvistOptions = {
  perPage: 3,
  gap: 20,
  speed: 300,
  direction: 'horizontal',
  autoplay: 5000,
  on: {
    slideChange: (index: number) => {
      console.log(`Активный слайд: ${index}`)
    },
    optionsUpdated: (tvist: Tvist, newOptions: Partial<TvistOptions>) => {
      console.log('Обновлены опции:', newOptions)
    }
  }
}

const slider = new Tvist('.slider', options)
```

### Частичные опции (Partial)

Для метода `updateOptions()` используется `Partial<TvistOptions>`:

```typescript
// Можно передать только нужные опции
slider.updateOptions({
  perPage: 4,
  gap: 30
})

// TypeScript проверит типы
slider.updateOptions({
  perPage: '4' // ❌ Ошибка: Type 'string' is not assignable to type 'number'
})
```

### Module и ModuleConstructor

```typescript
import type { Module, ModuleConstructor } from 'tvist/modules'

// Тип модуля
const module: Module = slider.getModule('autoplay')!

// Тип конструктора модуля
const ModuleClass: ModuleConstructor = AutoplayModule
```

## Типизация событий

```typescript
import type { Tvist, TvistOptions } from 'tvist'

// Обработчики с типизированными параметрами
slider.on('slideChange', (index: number) => {
  console.log(index)
})

slider.on('created', (tvist: Tvist) => {
  console.log(tvist.slides.length)
})

slider.on('optionsUpdated', (tvist: Tvist, newOptions: Partial<TvistOptions>) => {
  console.log(newOptions)
})

slider.on('breakpoint', (breakpoint: number | null) => {
  if (breakpoint === null) {
    console.log('Базовые настройки')
  } else {
    console.log(`Breakpoint: ${breakpoint}px`)
  }
})
```

## Типизация модулей

### Получение модуля с типом

```typescript
import type { AutoplayModule } from 'tvist/modules'

// Generic типизация
const autoplay = slider.getModule<AutoplayModule>('autoplay')

if (autoplay) {
  autoplay.pause()  // TypeScript знает все методы AutoplayModule
  autoplay.start()
  // autoplay.unknownMethod() // ❌ Ошибка компиляции
}
```

### Создание типизированного модуля

```typescript
import { Module } from 'tvist/modules'
import type { Tvist, TvistOptions } from 'tvist'

export class MyModule extends Module {
  readonly name = 'myModule'
  
  private intervalId?: number

  constructor(tvist: Tvist, options: TvistOptions) {
    super(tvist, options)
  }

  init(): void {
    // Инициализация с полной типизацией
    this.on('slideChange', this.handleSlideChange)
  }

  destroy(): void {
    this.off('slideChange', this.handleSlideChange)
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  // Типизированные hooks
  onUpdate?(): void {
    console.log('Update')
  }

  onOptionsUpdate?(newOptions: Partial<TvistOptions>): void {
    console.log('Options updated', newOptions)
  }

  onSlideChange?(index: number): void {
    console.log('Slide changed', index)
  }

  // Приватные методы с типизацией
  private handleSlideChange = (index: number): void => {
    console.log(index)
  }

  // Публичные методы
  public pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
```

## Расширение типов опций

Если вы создаёте кастомный модуль с собственными опциями:

```typescript
// custom-module.ts
declare module 'tvist' {
  interface TvistOptions {
    myCustomOption?: {
      enabled?: boolean
      speed?: number
      direction?: 'up' | 'down'
    }
  }
}

export class CustomModule extends Module {
  readonly name = 'custom'

  init(): void {
    // TypeScript знает про myCustomOption
    const options = this.options.myCustomOption
    
    if (options?.enabled) {
      console.log('Custom module enabled')
      console.log('Speed:', options.speed)
      console.log('Direction:', options.direction)
    }
  }

  destroy(): void {
    // Cleanup
  }
}

// Использование
const slider = new Tvist('.slider', {
  myCustomOption: {
    enabled: true,
    speed: 100,
    direction: 'up'
  }
})
```

## Generic типы и утилиты

### Создание типизированной обёртки

```typescript
function createSlider<T extends HTMLElement>(
  element: T,
  options: TvistOptions
): Tvist {
  return new Tvist(element, options)
}

const container = document.querySelector<HTMLDivElement>('.slider')!
const slider = createSlider(container, { perPage: 3 })
```

### Типобезопасная конфигурация

```typescript
function configureSlider(options: Partial<TvistOptions>): TvistOptions {
  const defaults: TvistOptions = {
    perPage: 1,
    gap: 0,
    speed: 300,
    direction: 'horizontal',
    drag: true,
    start: 0,
    loop: false
  }
  
  return { ...defaults, ...options }
}

const config = configureSlider({ perPage: 3, gap: 20 })
const slider = new Tvist('.slider', config)
```

### Типизированный фабричный метод

```typescript
interface SliderConfig {
  selector: string
  options: TvistOptions
  modules?: string[]
}

class SliderFactory {
  static create(config: SliderConfig): Tvist {
    // Регистрация модулей если указаны
    if (config.modules) {
      this.registerModules(config.modules)
    }
    
    return new Tvist(config.selector, config.options)
  }
  
  private static registerModules(moduleNames: string[]): void {
    // Регистрация модулей
  }
}

const slider = SliderFactory.create({
  selector: '.slider',
  options: {
    perPage: 3,
    gap: 20
  },
  modules: ['autoplay', 'pagination']
})
```

## Типы для event handlers

### Строгая типизация событий

```typescript
type SliderEventMap = {
  slideChange: [index: number]
  slideChanged: [index: number]
  beforeSlideChange: [index: number]
  created: [tvist: Tvist]
  destroyed: [tvist: Tvist]
  optionsUpdated: [tvist: Tvist, options: Partial<TvistOptions>]
  resize: []
  dragStart: []
  drag: []
  dragEnd: []
  scroll: []
  breakpoint: [breakpoint: number | null]
  lock: []
  unlock: []
}

// Типобезопасная подписка на события
function on<K extends keyof SliderEventMap>(
  slider: Tvist,
  event: K,
  handler: (...args: SliderEventMap[K]) => void
): void {
  slider.on(event, handler)
}

// Использование
on(slider, 'slideChange', (index) => {
  console.log(index) // index автоматически типизирован как number
})

on(slider, 'optionsUpdated', (tvist, options) => {
  // tvist: Tvist, options: Partial<TvistOptions>
})
```

## Утилитарные типы

### Тип для опций модуля

```typescript
// Извлечь опции конкретного модуля
type AutoplayOptions = Required<TvistOptions>['autoplay']
type PaginationOptions = Required<TvistOptions>['pagination']
type BreakpointsConfig = Required<TvistOptions>['breakpoints']

// Использование
const autoplayConfig: AutoplayOptions = 3000 // number | boolean
const paginationConfig: PaginationOptions = {
  type: 'bullets',
  clickable: true
}
```

### Условные типы для опций

```typescript
type SliderOptionsWithAutoplay = TvistOptions & {
  autoplay: number | boolean
}

type SliderOptionsWithLoop = TvistOptions & {
  loop: boolean
}

function createAutoplaySlider(
  selector: string,
  options: SliderOptionsWithAutoplay
): Tvist {
  return new Tvist(selector, options)
}

// ✅ OK
createAutoplaySlider('.slider', {
  autoplay: 3000
})

// ❌ Ошибка: autoplay required
createAutoplaySlider('.slider', {
  perPage: 3
})
```

## Продвинутые паттерны

### Builder pattern с типизацией

```typescript
class SliderBuilder {
  private options: Partial<TvistOptions> = {}
  
  perPage(value: number): this {
    this.options.perPage = value
    return this
  }
  
  gap(value: number): this {
    this.options.gap = value
    return this
  }
  
  autoplay(value: number | boolean): this {
    this.options.autoplay = value
    return this
  }
  
  loop(value: boolean): this {
    this.options.loop = value
    return this
  }
  
  build(selector: string): Tvist {
    return new Tvist(selector, this.options)
  }
}

// Использование
const slider = new SliderBuilder()
  .perPage(3)
  .gap(20)
  .autoplay(3000)
  .loop(true)
  .build('.slider')
```

### Type guards для модулей

```typescript
import type { AutoplayModule, PaginationModule } from 'tvist/modules'

function isAutoplayModule(module: Module): module is AutoplayModule {
  return module.name === 'autoplay'
}

function isPaginationModule(module: Module): module is PaginationModule {
  return module.name === 'pagination'
}

// Использование
const module = slider.getModule('autoplay')

if (module && isAutoplayModule(module)) {
  module.pause()  // TypeScript знает что это AutoplayModule
  module.start()
}
```

### Декоратор для валидации опций

```typescript
function validateOptions(options: TvistOptions): void {
  if (options.perPage !== undefined && options.perPage < 1) {
    throw new Error('perPage must be >= 1')
  }
  
  if (options.speed !== undefined && options.speed < 0) {
    throw new Error('speed must be >= 0')
  }
  
  if (options.gap !== undefined && options.gap < 0) {
    throw new Error('gap must be >= 0')
  }
}

function createValidatedSlider(
  selector: string,
  options: TvistOptions
): Tvist {
  validateOptions(options)
  return new Tvist(selector, options)
}
```

## Интеграция с фреймворками

### React

```typescript
import { useEffect, useRef } from 'react'
import Tvist, { type TvistOptions } from 'tvist'

interface SliderProps {
  options?: TvistOptions
  children: React.ReactNode
}

export const Slider: React.FC<SliderProps> = ({ options, children }) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<Tvist | null>(null)

  useEffect(() => {
    if (sliderRef.current) {
      instanceRef.current = new Tvist(sliderRef.current, options)
      
      return () => {
        instanceRef.current?.destroy()
      }
    }
  }, [options])

  return (
    <div ref={sliderRef} className="tvist">
      <div className="tvist__container">
        {children}
      </div>
    </div>
  )
}
```

### Vue

```typescript
import { defineComponent, onMounted, onUnmounted, ref, PropType } from 'vue'
import Tvist, { type TvistOptions } from 'tvist'

export default defineComponent({
  name: 'Slider',
  props: {
    options: {
      type: Object as PropType<TvistOptions>,
      default: () => ({})
    }
  },
  setup(props) {
    const sliderRef = ref<HTMLElement | null>(null)
    let slider: Tvist | null = null

    onMounted(() => {
      if (sliderRef.value) {
        slider = new Tvist(sliderRef.value, props.options)
      }
    })

    onUnmounted(() => {
      slider?.destroy()
    })

    return { sliderRef }
  }
})
```

## Заключение

Tvist предоставляет полную типизацию для всех API:

- ✅ Строгая проверка типов опций
- ✅ Автодополнение в IDE
- ✅ Типобезопасные события
- ✅ Generic типы для модулей
- ✅ Расширяемые интерфейсы
- ✅ Type guards и утилиты
