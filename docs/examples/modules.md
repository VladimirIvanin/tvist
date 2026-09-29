# Встроенные возможности

Все возможности входят в полный Tvist и активируются опциями. Для обычной карусели со стрелками, пагинацией и автопрокруткой достаточно одного экземпляра:

```javascript
const slider = new TvistV1('.tvist-v1', {
  perPage: 2,
  gap: 16,
  arrows: true,
  pagination: true,
  autoplay: { delay: 3000, pauseOnHover: true },
})
slider.autoplay?.pause()
slider.autoplay?.resume()
```

Изменяйте опции через `updateOptions()`: компоненты активируются и очищают ресурсы автоматически. [Публичные интерфейсы и миграция](/api/modules).
