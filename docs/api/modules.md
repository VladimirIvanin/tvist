# Встроенные возможности и миграция

Tvist поставляется одной полной библиотекой. Drag, navigation, pagination, autoplay, breakpoints, loop, visibility, thumbs, эффекты, grid, scroll control, scrollbar, marquee, lazyload и video включаются пользовательскими опциями. Внутренние компоненты создаются и уничтожаются автоматически при изменении опций и брейкпоинтов.

```javascript
import Tvist from 'tvist'
import 'tvist/dist/tvist.css'

const slider = new Tvist('.tvist-v1', {
  arrows: true,
  pagination: true,
  autoplay: { delay: 3000 },
  loop: true,
})
slider.autoplay?.pause()
slider.updateOptions({ autoplay: false })
```

## Миграция

Вместо браузерных core/modules подключите одну пару `tvist.min.js` + `tvist.css`. npm ESM/CJS также включают все возможности.

Глобальный реестр, registerModule/unregisterModule/getRegisteredModules, getModule/removeModule, наследование от Module и экспорт внутренних классов удалены. Движок и внутреннее состояние больше не доступны на публичном экземпляре. Для управления используйте пользовательские методы, опции и события.

| Старый доступ | Новый доступ |
|---|---|
| getModule('autoplay').getAutoplay() | slider.autoplay |
| getModule('video').getVideo() | slider.video |
| getModule('marquee').getMarquee() | slider.marquee |
| getModule('lazyload').loadAll/loadSlide | slider.lazyload.loadAll/loadSlide |
| getModule('visibility').getVisibility() | slider.visibility |
| getModule('breakpoints').getCurrentBreakpoint() | slider.currentBreakpoint |

Интерфейсы отключённых возможностей возвращают `undefined`. `currentBreakpoint` без совпадения возвращает `null`. Методы marquee, video и autoplay сохраняют своё поведение; события и их аргументы также сохранены. Пользовательские расширения подключайте через публичные события, без доступа к внутреннему движку.
