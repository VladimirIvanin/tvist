# Статические методы и свойства

Статические методы и свойства класса Tvist доступны без создания экземпляра слайдера.

## Свойства

### VERSION

```typescript
static readonly VERSION: string
```

Версия библиотеки (только для чтения).

**Примеры:**

```javascript
import Tvist from 'tvist'

console.log(Tvist.VERSION) // '1.0.0'

// Проверка версии
if (Tvist.VERSION.startsWith('1.')) {
  console.log('Используется версия 1.x')
}

// Отображение в UI
document.querySelector('.version').textContent = `v${Tvist.VERSION}`
```

### MODULES

```typescript
static readonly MODULES: Map<string, ModuleConstructor>
```

Глобальный реестр модулей (только для чтения). Map с именами и конструкторами зарегистрированных модулей.

**Примеры:**

```javascript
// Количество зарегистрированных модулей
console.log(Tvist.MODULES.size)

// Проверка наличия модуля
if (Tvist.MODULES.has('autoplay')) {
  console.log('Модуль autoplay зарегистрирован')
}

// Получить все зарегистрированные модули
Tvist.MODULES.forEach((ModuleClass, name) => {
  console.log(`Модуль: ${name}`)
})
```

## Методы

### registerModule()

```typescript
static registerModule(name: string, ModuleClass: ModuleConstructor): void
```

Регистрация модуля в глобальном реестре. После регистрации модуль будет автоматически доступен во всех новых экземплярах слайдера.

**Параметры:**
- `name` - уникальное имя модуля
- `ModuleClass` - класс модуля (конструктор)

**Примеры:**

```javascript
import Tvist from 'tvist'
import { 
  AutoplayModule, 
  PaginationModule, 
  LoopModule,
  NavigationModule 
} from 'tvist/modules'

// Регистрация одного модуля
Tvist.registerModule('autoplay', AutoplayModule)

// Регистрация нескольких модулей
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('loop', LoopModule)
Tvist.registerModule('navigation', NavigationModule)

// Теперь можно использовать модули
const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true,
  arrows: true
})
```

**Повторная регистрация:**

```javascript
// При попытке повторной регистрации будет выведено предупреждение
Tvist.registerModule('autoplay', AutoplayModule) // OK
Tvist.registerModule('autoplay', AutoplayModule) // Warning: Module "autoplay" is already registered
```

### unregisterModule()

```typescript
static unregisterModule(name: string): void
```

Удаление модуля из глобального реестра.

**Параметры:**
- `name` - имя модуля

**Примеры:**

```javascript
// Удалить модуль из реестра
Tvist.unregisterModule('autoplay')

// После удаления модуль не будет доступен в новых экземплярах
const slider = new Tvist('.slider', {
  autoplay: 3000 // Не сработает, так как модуль удалён
})

// Можно зарегистрировать модуль заново
Tvist.registerModule('autoplay', AutoplayModule)
```

**Использование для переключения модулей:**

```javascript
// Удалить стандартный модуль
Tvist.unregisterModule('autoplay')

// Зарегистрировать кастомную версию
Tvist.registerModule('autoplay', CustomAutoplayModule)
```

### getRegisteredModules()

```typescript
static getRegisteredModules(): string[]
```

Получить список имён всех зарегистрированных модулей.

**Возвращает:** массив имён модулей

**Примеры:**

```javascript
// Получить список модулей
const modules = Tvist.getRegisteredModules()
console.log(modules) 
// ['drag', 'navigation', 'pagination', 'autoplay', 'breakpoints', ...]

// Проверка наличия модуля
if (modules.includes('autoplay')) {
  console.log('Autoplay доступен')
}

// Вывод списка в UI
const modulesList = document.querySelector('.modules-list')
modulesList.innerHTML = modules.map(name => 
  `<li>${name}</li>`
).join('')

// Подсчёт модулей
console.log(`Зарегистрировано модулей: ${modules.length}`)
```

## Примеры использования

### Регистрация всех необходимых модулей

```javascript
import Tvist from 'tvist'
import {
  AutoplayModule,
  PaginationModule,
  LoopModule,
  NavigationModule,
  BreakpointsModule,
  DragModule,
  EffectModule,
  GridModule,
  ThumbsModule
} from 'tvist/modules'

// Регистрируем все модули которые будем использовать
const modules = [
  ['autoplay', AutoplayModule],
  ['pagination', PaginationModule],
  ['loop', LoopModule],
  ['navigation', NavigationModule],
  ['breakpoints', BreakpointsModule],
  ['drag', DragModule],
  ['effect', EffectModule],
  ['grid', GridModule],
  ['thumbs', ThumbsModule]
]

modules.forEach(([name, ModuleClass]) => {
  Tvist.registerModule(name, ModuleClass)
})

// Теперь все модули доступны
```

### Условная регистрация модулей

```javascript
// Регистрировать модули только если они нужны
const config = {
  useAutoplay: true,
  useLoop: true,
  usePagination: false
}

if (config.useAutoplay) {
  Tvist.registerModule('autoplay', AutoplayModule)
}

if (config.useLoop) {
  Tvist.registerModule('loop', LoopModule)
}

if (config.usePagination) {
  Tvist.registerModule('pagination', PaginationModule)
}
```

### Проверка доступности функций

```javascript
function checkFeatures() {
  const modules = Tvist.getRegisteredModules()
  
  return {
    hasAutoplay: modules.includes('autoplay'),
    hasLoop: modules.includes('loop'),
    hasPagination: modules.includes('pagination'),
    hasEffects: modules.includes('effect')
  }
}

const features = checkFeatures()

if (!features.hasAutoplay) {
  console.warn('Autoplay недоступен. Зарегистрируйте AutoplayModule')
}
```

### Динамическая загрузка модулей

```javascript
// Загружать модули по требованию
async function loadModule(moduleName) {
  const moduleMap = {
    autoplay: () => import('tvist/modules/autoplay'),
    pagination: () => import('tvist/modules/pagination'),
    loop: () => import('tvist/modules/loop')
  }
  
  if (!moduleMap[moduleName]) {
    throw new Error(`Unknown module: ${moduleName}`)
  }
  
  const module = await moduleMap[moduleName]()
  Tvist.registerModule(moduleName, module.default)
}

// Использование
await loadModule('autoplay')
await loadModule('pagination')

const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true
})
```

### Создание плагина-обёртки

```javascript
// Создать функцию для удобной регистрации набора модулей
function useTvistPlugins(plugins) {
  const moduleMap = {
    autoplay: AutoplayModule,
    pagination: PaginationModule,
    loop: LoopModule,
    navigation: NavigationModule,
    breakpoints: BreakpointsModule,
    drag: DragModule,
    effect: EffectModule,
    grid: GridModule,
    thumbs: ThumbsModule
  }
  
  plugins.forEach(pluginName => {
    if (moduleMap[pluginName]) {
      Tvist.registerModule(pluginName, moduleMap[pluginName])
    } else {
      console.warn(`Unknown plugin: ${pluginName}`)
    }
  })
}

// Использование
useTvistPlugins(['autoplay', 'pagination', 'loop'])

const slider = new Tvist('.slider', {
  autoplay: 3000,
  pagination: true,
  loop: true
})
```

### Отображение информации о библиотеке

```javascript
function showLibraryInfo() {
  console.log('=== Tvist Library Info ===')
  console.log(`Version: ${Tvist.VERSION}`)
  console.log(`Registered modules: ${Tvist.getRegisteredModules().join(', ')}`)
  console.log(`Total modules: ${Tvist.MODULES.size}`)
  console.log('========================')
}

showLibraryInfo()
// === Tvist Library Info ===
// Version: 1.0.0
// Registered modules: drag, navigation, pagination, autoplay, breakpoints
// Total modules: 5
// ========================
```

### Замена модулей на кастомные версии

```javascript
// Удалить стандартный модуль
Tvist.unregisterModule('pagination')

// Зарегистрировать кастомную версию с расширенным функционалом
class CustomPaginationModule extends PaginationModule {
  // Расширенная логика
  init() {
    super.init()
    // Дополнительные функции
  }
}

Tvist.registerModule('pagination', CustomPaginationModule)

// Теперь все новые экземпляры будут использовать кастомную пагинацию
const slider = new Tvist('.slider', {
  pagination: {
    type: 'custom',
    // Кастомные опции
  }
})
```
