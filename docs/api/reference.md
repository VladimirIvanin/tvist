# Пояснения к справочнику API

## option:perPage

При `autoWidth`, `autoHeight`, `fixedWidth` или `fixedHeight` количество видимых слайдов определяется геометрией. Не задавайте дробное значение для сетки.

```javascript
const slider = new Tvist('.slider', { perPage: 3, gap: 20 })
```

## option:slidesPerGroup

Задаёт шаг `next()` и `prev()`. Прямой переход `scrollTo(index)` использует указанный индекс.

## option:peek

Числа задаются в пикселях, строки — в CSS-единицах. Для горизонтального слайдера используйте `left`/`right`, для вертикального — `top`/`bottom`.

[Живые примеры peek](/examples/peek).

## option:fixedWidth

```javascript
const slider = new Tvist('.slider', { fixedWidth: '12rem', gap: 16 })
```

[Пример фиксированных размеров](/examples/fixed-size).

## option:fixedHeight

Для вертикального направления задайте высоту viewport в CSS, чтобы слайдер мог рассчитать число видимых рядов.

## option:center

[Примеры центрирования](/examples/center).

## option:drag

```javascript
const slider = new Tvist('.slider', {
  drag: 'free',
  freeSnap: true,
  flickPower: 600,
})
```

[Свободное перетаскивание](/examples/drag-free).

## option:arrows

Пользовательские элементы сохраняются после `destroy()`. Кнопки могут находиться вне слайдера.

```javascript
const slider = new Tvist('.slider', {
  arrows: { prev: '#prev', next: '#next', addIcons: false },
})
```

[Примеры навигации](/examples/navigation).

## option:pagination

Внешний контейнер можно передать селектором или элементом.

```javascript
const slider = new Tvist('.slider', {
  pagination: { type: 'bullets', limit: 5, strategy: 'even' },
})
```

[Все варианты пагинации](/examples/pagination).

## option:pagination.renderBullet

Возвращаемый HTML должен содержать переданный `className`. Индекс начинается с нуля.

```javascript
const slider = new Tvist('.slider', {
  pagination: {
    renderBullet: (index, className) =>
      `<button class="${className}">${index + 1}</button>`,
  },
})
```

## option:autoplay

Число задаёт задержку в миллисекундах. Управлять работающей автопрокруткой можно через `slider.autoplay`; без активного модуля это свойство возвращает `undefined`.

```javascript
const slider = new Tvist('.slider', {
  loop: true,
  autoplay: { delay: 3000, pauseOnHover: true },
})
slider.autoplay?.pause()
slider.autoplay?.resume()
```

[Примеры автопрокрутки](/examples/autoplay).

## option:video

Поддерживаются HTML `<video>` и iframe YouTube/Vimeo. Автовоспроизведение зависит от политики браузера; для HTML-video обычно нужен выключенный звук.

```javascript
const slider = new Tvist('.slider', {
  video: { autoplay: true, muted: true },
  autoplay: { waitForVideo: true },
})
```

[Примеры видео](/examples/video).

## option:holdToPause

Удержание приостанавливает autoplay и при настройке `video.pauseOnHold` — видео. Помимо событий экземпляра на слайде отправляются DOM-события из `TVIST_DOM_EVENTS` с `detail: { index, pointerType }`, без всплытия.

[Пример историй](/examples/stories).

## option:loop

В обычном loop слайды переставляются в DOM. При `withClones: true` создаются клоны; для логического индекса используйте `realIndex`, для числа оригиналов — `originalSlideCount`.

```javascript
const slider = new Tvist('.slider', {
  loop: { enabled: true, withClones: true },
})
```

[Варианты loop](/examples/loop).

## option:rewind

Используется без loop. Для возврата перетаскиванием дополнительно включите `rewindByDrag`.

## option:breakpoints

Ключ — **максимальная** ширина в пикселях. При совпадении нескольких условий применяется наименьший подходящий breakpoint; за пределами условий восстанавливаются базовые опции.

```javascript
const slider = new Tvist('.slider', {
  perPage: 3,
  breakpoints: {
    1024: { perPage: 2 },
    640: { perPage: 1 },
  },
})
```

[Подробности breakpoints](/api/breakpoints) · [Живой пример](/examples/responsive).

## option:enabled

При `false` слайдер показывает статичный контент. Управлять состоянием можно через `enable()`, `disable()` и `updateOptions({ enabled })`.

## option:on

```javascript
const slider = new Tvist('.slider', {
  on: { slideChangeEnd: index => console.log(index) },
})
```

Имена событий и аргументы перечислены в [таблице событий](#events).

## option:nativeLazyAdjacent

В отличие от `lazy`, работает с обычными `<img src="…" loading="lazy">`: переводит подходящие изображения в eager. Это помогает избежать пустой соседней грани во время cube-перехода.

| Значение | Когда подгружает |
| --- | --- |
| `false` / не задано | Не изменяет нативную загрузку |
| `true` / `{}` | Целевой слайд при начале перехода, включая `speed: 0` |
| `{ onInit: true }` | Дополнительно соседей активного слайда после инициализации |
| `{ onInit: true, onTransitionStart: false }` | Только соседей после инициализации |

Для ручной подгрузки экспортируется утилита `forceEagerLoadingForLazyImages`: `import { forceEagerLoadingForLazyImages } from 'tvist'`. Она переводит изображения с `loading="lazy"` внутри переданного элемента в eager.

## option:lazy

Используйте `data-src` и `data-srcset`, чтобы загрузкой управлял модуль. Для стандартного `loading="lazy"` используйте `nativeLazyAdjacent`.

[Пример lazy loading](/examples/lazyload).

## option:marquee

Автоматически включает loop. При объектной форме пауза при наведении включается явно.

```javascript
const slider = new Tvist('.slider', {
  marquee: { speed: 50, direction: 'left', pauseOnHover: true },
})
```

[Пример бегущей строки](/examples/marquee).

## option:grid

```javascript
const slider = new Tvist('.slider', {
  grid: { rows: 2, cols: 3, gap: { row: 12, col: 16 } },
})
```

Размеры `dimensions` задаются парами `[colSpan, rowSpan]`. [Примеры сетки](/examples/grid).

## method:scrollTo

Индекс логический (`realIndex`), начиная с нуля. `instant: true` отключает анимацию перехода.

```javascript
slider.scrollTo(2)
slider.scrollTo(0, true)
```

## method:next

```javascript
if (slider.canScrollNext) slider.next()
```

## method:prev

```javascript
if (slider.canScrollPrev) slider.prev()
```

## method:update

Вызывайте после изменения содержимого или DOM-структуры слайдов. Изменение размеров контейнера отслеживается автоматически.

```javascript
slider.container.appendChild(newSlide)
slider.update()
```

## method:updateOptions

Передавайте только изменённые параметры. Вложенный объект опции заменяется целиком; для сохранения его полей передайте их снова. Исключение — поля `browserFixes`, которые объединяются с текущими. После обновления вызывается `optionsUpdated`.

```javascript
slider.updateOptions({ perPage: 4, gap: 30 })
slider.updateOptions({ autoplay: { delay: 5000, pauseOnHover: true } })
```

[Живой пример обновления опций](/examples/update-options).

## method:destroy

Отписывается от событий, уничтожает модули и очищает созданные элементы управления. По умолчанию вложенные слайдеры продолжают работать.

```javascript
slider.destroy({ destroyNested: true })
```

## method:disable

```javascript
slider.disable()
```

## method:enable

```javascript
slider.enable()
```

## method:sync

Для двусторонней связи вызовите метод на обоих экземплярах. Настройка `syncOnDrag` управляет синхронизацией при перетаскивании.

```javascript
main.sync(thumbs)
thumbs.sync(main)
```

## method:on

```javascript
const handler = index => console.log(index)
slider.on('slideChangeEnd', handler)
```

При поздней подписке некоторые события инициализации воспроизводят последние аргументы: `created`, `refresh`, `setTranslate`, `progress`, `navigation:mounted`, `pagination:mounted`, `breakpoint`. Для `lock`/`unlock` воспроизводится текущее состояние.

## method:off

Без второго аргумента снимает все обработчики указанного события.

```javascript
slider.off('slideChangeEnd', handler)
slider.off('slideChangeEnd')
```

## method:once

```javascript
slider.once('slideChangeEnd', index => console.log(index))
```

Если для события доступно сохранённое состояние инициализации, обработчик выполняется сразу один раз.

## method:emit

```javascript
slider.emit('customEvent', { source: 'button' })
```

## property:root

На root выставляются классы из `Tvist.CLASSES`:

| Класс | Состояние |
| --- | --- |
| `created` | Добавлен до события `created`; снимается при уничтожении |
| `destroyed` | Добавлен после `beforeDestroy`; остаётся после уничтожения |
| `locked` | Контент помещается в viewport; прокрутка не требуется |

```javascript
slider.root.classList.contains(Tvist.CLASSES.locked)
```

## property:root.tvistInstance

Позволяет получить экземпляр через DOM. После `destroy()` ссылка очищается; повторное создание на том же root корректно заменяет экземпляр.

```javascript
const element = document.querySelector('.slider')
element?.tvistInstance?.next()
```

## property:slides

Порядок соответствует текущему DOM; loop может его менять. Для стилей определённого слайда используйте `data-tvist-slide-index`, а не `:nth-child()`.

## property:activeIndex

Индекс в текущем DOM. Для логического индекса исходного слайда при loop используйте `realIndex`.

## property:realIndex

```javascript
slider.on('slideChangeEnd', () => console.log(slider.realIndex))
```

## property:options

Ссылка только для чтения; для изменения конфигурации используйте `updateOptions()`.

## property:autoplay

Доступно при активном модуле autoplay. [Методы управления](#module-autoplay).

## property:video

Доступно при активном модуле video. [Методы управления](#module-video).

## event:created

К этому моменту на root уже установлен `Tvist.CLASSES.created`.

```javascript
slider.on('created', tvist => console.log(tvist.slides.length))
```

## event:beforeDestroy

Вызывается до очистки модулей и DOM, перед добавлением класса `destroyed`.

## event:destroyed

К этому моменту на root установлен `Tvist.CLASSES.destroyed`.

## event:optionsUpdated

```javascript
slider.on('optionsUpdated', (tvist, newOptions) => console.log(newOptions))
```

## event:slideChangeStart

`data?.isDrag` показывает, связан ли переход с drag. При loop индекс события учитывает логический исходный слайд.

## event:slideChangeEnd

```javascript
slider.on('slideChangeEnd', index => {
  counter.textContent = String(index + 1)
})
```

## event:visible

Во время одного перехода событие может прийти для нескольких слайдов. Ориентируйтесь на аргумент `index`; для текущего активного слайда используйте `slideChangeEnd`.

## event:progress

Вызывается только без loop; значение в диапазоне 0..1.

## event:autoplayProgress

`segmentIndex` и `segmentProgress` описывают активный сегмент; `totalSegments` — общее количество. Подходит для прогресса историй.

## event:longPressStart

Требуется включённый `holdToPause`. На слайде также отправляется DOM `CustomEvent` из `TVIST_DOM_EVENTS` без всплытия.

## event:longPressEnd

Отправляется при завершении или отмене удержания, включая начало drag.

## event:enabled

Аргументы: `(tvist: Tvist)`

После вызова `enable()` и восстановления работы слайдера.

## event:disabled

Аргументы: `(tvist: Tvist)`

После вызова `disable()` и перехода к статичному контенту.

## event:autoplayStart

Аргументы: `()`

Автопрокрутка запущена.

## event:autoplayStop

Аргументы: `()`

Автопрокрутка остановлена.

## event:autoplayPause

Аргументы: `()`

Автопрокрутка поставлена на паузу.

## event:autoplayResume

Аргументы: `()`

Автопрокрутка продолжена после паузы.

## event:marqueeStart

Аргументы: `()`

Бегущая строка запущена.

## event:marqueeStop

Аргументы: `()`

Бегущая строка остановлена.

## event:marqueePause

Аргументы: `()`

Бегущая строка поставлена на паузу.

## event:marqueeResume

Аргументы: `()`

Бегущая строка продолжена после паузы.

## event:navigation:mounted

Аргументы: `()`

Кнопки навигации смонтированы.

## event:pagination:mounted

Аргументы: `()`

Пагинация смонтирована.

## event:navigation:click

Аргументы: `(index: number)`

Пользователь выбрал слайд в слайдере-миниатюрах.

## event:setTranslate

Аргументы: `(tvist: Tvist, position: number)`

Перед применением transform к контейнеру. Используется собственными эффектами.

## event:beforeLoopFix

Аргументы: `()`

Перед перестановкой слайдов для коррекции loop. Событие для расширений.

## event:loopFix

Аргументы: `()`

После коррекции loop. Событие для расширений.

## event:lazyLoaded

Аргументы: `(img: HTMLImageElement, slideIndex: number)`

Изображение с `data-src` успешно загружено модулем LazyLoad.

```javascript
slider.on('lazyLoaded', (img, slideIndex) => {
  img.classList.add('loaded')
})
```

## event:lazyLoadError

Аргументы: `(img: HTMLImageElement, slideIndex: number)`

Загрузка изображения модулем LazyLoad завершилась ошибкой. Можно показать запасное изображение.

## module:drag

Настройки `drag`, `dragSpeed`, `rubberband`, `freeSnap`, `flickPower` и `flickMaxPages` находятся в общей таблице. Ниже — настройки долгого удержания.

## module:autoplay

Методы вызываются через `slider.autoplay?.pause()` и другие методы этого свойства. При паузе сохраняется оставшееся время, а `start()` запускает цикл заново.

## module:video

Методы вызываются через `slider.video?.play()`. Аргумент `index` необязателен; без него используется активный слайд.

## module:marquee

```javascript
const marquee = slider.marquee
marquee?.pause()
marquee?.resume()
```

Тип интерфейса управления выводится из `slider.marquee`.

## module:lazyload

```javascript
const lazy = slider.lazyload
lazy?.loadSlide(2)
lazy?.loadAll()
```

Используйте `slider.lazyload` без импорта внутренних компонентов.

## module:breakpoints

Текущий breakpoint доступен в `slider.currentBreakpoint`; без совпадения возвращается `null`.

[Подробное руководство](/api/breakpoints).

## module:visibility

Управление видимостью доступно через `slider.visibility`. Используйте события `sliderVisible` и `sliderHidden`, чтобы реагировать на изменения.

## module:thumbs

```javascript
const thumbs = new Tvist('.thumbs', { perPage: 4, isNavigation: true })
const main = new Tvist('.main', { thumbs: { slider: thumbs } })
```

[Пример миниатюр](/examples/thumbs).

## module:effects

Задайте `effect: 'fade'` или `effect: 'cube'`. Для cube viewport должен иметь размеры. Некоторые объявленные настройки эффектов пока не используются — это отмечено в описаниях полей.

[Fade](/examples/effect-fade) · [Cube](/examples/effect-cube).

## module:scroll-control

Модуль использует `wheel`. Настройки `keyboard` присутствуют в типах, но обработчики клавиатуры в текущей версии не реализованы.

[Пример управления колёсиком](/examples/scroll-control).

## module:scrollbar

```javascript
const slider = new Tvist('.slider', {
  scrollbar: { draggable: true, hide: true, hideDelay: 1000 },
})
```

[Примеры скроллбара](/examples/scrollbar).

## module:slide-states

Выставляет классы активного и видимого слайда, а также состояния root. Для нестандартного оформления используйте `Tvist.CLASSES`.

## property:marquee

`slider.marquee` возвращает управление непрерывной прокруткой: start/stop, pause/resume, проверки состояния, setSpeed/getSpeed и setDirection/getDirection. Если marquee отключён, возвращается `undefined`.

## property:lazyload

`slider.lazyload?.loadSlide(2)` загружает изображения выбранного слайда, `slider.lazyload?.loadAll()` — всех слайдов. Если lazy отключён, возвращается `undefined`.

## property:visibility

`slider.visibility?.isVisible()` возвращает состояние видимости; `slider.visibility?.check()` принудительно проверяет видимость. При отключённой опции возвращается `undefined`.

## property:currentBreakpoint

Номер активного брейкпоинта либо `null`, если совпадений нет.
