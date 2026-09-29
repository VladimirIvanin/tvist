# TypeScript

Пакет содержит строгие определения пользовательских опций, событий и публичного Tvist. Типы доступны из основного импорта:

```typescript
import Tvist, { type TvistOptions, type AutoplayOptions, type VideoOptions } from 'tvist'
import 'tvist/dist/tvist.css'

const options: TvistOptions = {
  perPage: 3,
  loop: true,
  autoplay: { delay: 3000 },
  on: {
    slideChangeEnd(index) { console.log(index) },
  },
}
const slider = new Tvist('.tvist-v1', options)
slider.autoplay?.pause()
slider.marquee?.setSpeed(30)
slider.lazyload?.loadAll()
const breakpoint: number | null = slider.currentBreakpoint
```

Типы управления autoplay/video/marquee/visibility выводятся из соответствующих свойств экземпляра. Все возможности уже входят в библиотеку; импортировать или регистрировать внутренние компоненты не требуется. [Справочник API](/api/reference) и [миграция](/api/modules).
