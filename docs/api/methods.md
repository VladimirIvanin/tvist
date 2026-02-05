# Методы

Все методы слайдера возвращают экземпляр `this` для поддержки цепочки вызовов.

## Список методов

### Навигация
- [`scrollTo()`](#scrollto) - Переход к указанному слайду
- [`next()`](#next) - Переход к следующему слайду
- [`prev()`](#prev) - Переход к предыдущему слайду

### Управление состоянием
- [`update()`](#update) - Обновление размеров и позиций
- [`updateOptions()`](#updateoptions) - Динамическое изменение опций
- [`destroy()`](#destroy) - Уничтожение экземпляра

### Работа с модулями
- [`getModule()`](#getmodule) - Получение экземпляра модуля

### Синхронизация
- [`sync()`](#sync) - Синхронизация с другим слайдером

### События
- [`on()`](#on) - Подписка на событие
- [`off()`](#off) - Отписка от события
- [`once()`](#once) - Подписка на одно срабатывание
- [`emit()`](#emit) - Вызов события

---

## Навигация

### scrollTo()

```typescript
scrollTo(index: number, instant?: boolean): this
```

Переход к указанному слайду.

**Параметры:**
- `index` - индекс целевого слайда (начиная с 0)
- `instant` - если `true`, переход будет мгновенным без анимации (по умолчанию `false`)

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.scrollTo(2) // Переход к третьему слайду с анимацией
slider.scrollTo(0, true) // Моментальный переход к первому слайду

// Цепочка вызовов
slider.scrollTo(2).scrollTo(4)
```

### next()

```typescript
next(): this
```

Переход к следующему слайду.

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.next()

// С условием
if (slider.canScrollNext) {
  slider.next()
}
```

### prev()

```typescript
prev(): this
```

Переход к предыдущему слайду.

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.prev()

// С условием
if (slider.canScrollPrev) {
  slider.prev()
}
```

## Управление состоянием

### update()

```typescript
update(): this
```

Принудительное обновление слайдера. Пересчитывает размеры, позиции слайдов и обновляет все модули. Используйте этот метод если изменилась DOM-структура или размеры контейнера.

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
// После изменения размера контейнера
document.querySelector('.slider').style.width = '800px'
slider.update()

// После добавления/удаления слайдов
slider.container.appendChild(newSlide)
slider.update()

// После изменения CSS
document.body.classList.toggle('mobile-view')
slider.update()
```

### updateOptions()

```typescript
updateOptions(newOptions: Partial<TvistOptions>): this
```

Динамическое обновление опций слайдера без пересоздания экземпляра. Аналог `swiper.updateParams()`.

**Параметры:**
- `newOptions` - объект с новыми опциями (можно передать только те опции, которые нужно изменить)

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Поддерживаемые опции для динамического изменения:**
- `perPage` - количество слайдов на странице
- `slideMinSize` - минимальный размер слайда
- `gap` - расстояние между слайдами
- `peek` - отступы слайдера
- `peekTrim` - обрезка peek на краях
- `speed` - скорость анимации
- `direction` - направление прокрутки
- `center` - центрирование активного слайда
- `drag`, `dragSpeed`, `rubberband` - настройки drag
- `autoplay`, `pauseOnHover`, `pauseOnInteraction` - настройки автопрокрутки
- `on` - обработчики событий (заменяют предыдущие)
- и другие опции модулей

**Примеры:**

```javascript
// Изменить количество слайдов
slider.updateOptions({ perPage: 3 })

// Изменить несколько опций сразу
slider.updateOptions({
  perPage: 2,
  gap: 30,
  speed: 500
})

// Изменить направление
slider.updateOptions({ direction: 'vertical' })

// Обновить обработчики событий
slider.updateOptions({
  on: {
    slideChange: (index) => {
      console.log('Новый обработчик:', index)
    }
  }
})

// Цепочка вызовов
slider
  .updateOptions({ perPage: 3 })
  .scrollTo(0)
```

**События:**

При вызове `updateOptions()` генерируется событие `optionsUpdated`:

```javascript
slider.on('optionsUpdated', (tvist, newOptions) => {
  console.log('Обновлены опции:', newOptions)
})
```

:::tip Динамическое изменение
Метод `updateOptions()` позволяет изменять большинство опций без пересоздания слайдера. Это значительно удобнее и производительнее, чем вызов `destroy()` и создание нового экземпляра.
:::

:::warning Ограничения
Некоторые опции, связанные с инициализацией DOM-структуры (например, создание модулей), могут потребовать полного пересоздания слайдера.
:::

### destroy()

```typescript
destroy(): this
```

Уничтожение экземпляра слайдера. Удаляет все обработчики событий, останавливает анимации, очищает модули и освобождает ресурсы.

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.destroy()

// С очисткой DOM
slider.destroy()
slider.root.remove()
```

## Работа с модулями

### getModule()

```typescript
getModule<T>(name: string): T | undefined
```

Получить экземпляр модуля по имени.

**Параметры:**
- `name` - имя модуля

**Возвращает:** экземпляр модуля или `undefined`

**Примеры:**

```javascript
// Получить модуль автопрокрутки
const autoplay = slider.getModule('autoplay')
if (autoplay) {
  autoplay.pause()
}

// С типизацией (TypeScript)
import type { AutoplayModule } from 'tvist/modules'

const autoplay = slider.getModule<AutoplayModule>('autoplay')
if (autoplay) {
  autoplay.pause()
  autoplay.start()
}

// Получить модуль пагинации
const pagination = slider.getModule('pagination')
if (pagination) {
  pagination.update()
}
```

## Синхронизация

### sync()

```typescript
sync(target: Tvist): this
```

Синхронизация с другим экземпляром Tvist. Используется для создания связанных слайдеров (например, основной слайдер + миниатюры).

**Параметры:**
- `target` - целевой экземпляр слайдера для синхронизации

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
const main = new Tvist('.main-slider', {
  perPage: 1
})

const thumbs = new Tvist('.thumbs-slider', {
  perPage: 5,
  gap: 10,
  isNavigation: true
})

// Синхронизируем слайдеры
main.sync(thumbs)

// Теперь при переключении в main автоматически переключается thumbs и наоборот
```

## События

### on()

```typescript
on(event: string, handler: Function): this
```

Подписаться на событие.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.on('slideChange', (index) => {
  console.log('Активный слайд:', index)
})

// Множественные подписки
slider
  .on('slideChange', handler1)
  .on('resize', handler2)
  .on('dragEnd', handler3)
```

### off()

```typescript
off(event: string, handler?: Function): this
```

Отписаться от события.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик (если не указана, удаляются все обработчики события)

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
const handler = (index) => console.log(index)

// Подписка
slider.on('slideChange', handler)

// Отписка от конкретного обработчика
slider.off('slideChange', handler)

// Отписка от всех обработчиков события
slider.off('slideChange')
```

### once()

```typescript
once(event: string, handler: Function): this
```

Подписаться на событие один раз.

**Параметры:**
- `event` - имя события
- `handler` - функция-обработчик

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
slider.once('slideChange', (index) => {
  console.log('Выполнится только один раз:', index)
})

// После первого срабатывания обработчик автоматически удаляется
```

### emit()

```typescript
emit(event: string, ...args: any[]): this
```

Вызвать событие программно.

**Параметры:**
- `event` - имя события
- `args` - аргументы для передачи обработчикам

**Возвращает:** экземпляр слайдера для цепочки вызовов

**Примеры:**

```javascript
// Вызвать пользовательское событие
slider.emit('customEvent', { data: 'value' })

// С обработчиком
slider.on('customEvent', (data) => {
  console.log(data) // { data: 'value' }
})
slider.emit('customEvent', { data: 'value' })
```

## Цепочка вызовов

Все методы поддерживают цепочку вызовов:

```javascript
slider
  .updateOptions({ perPage: 3 })
  .scrollTo(0)
  .on('slideChange', handler)
  .next()
```
