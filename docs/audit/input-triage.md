> Исторический разбор отдельных когорт. Финальные числа, статусы и ограничения: [REPORT_FOR_FIXES.md](REPORT_FOR_FIXES.md).

# Независимый разбор input/lifecycle failures

Проверено 1 ноября 2026. Production commit `dea54d579239cd29224303c90646f00b577ec41c`, UMD SHA-256 `63f82928b9db2be2374e2824c62021aa8b7558d02658b8a2b8f87a421c234550`. Production-код не изменён. Разбор включает **все падавшие IN/CT/LC/EV/SY cases** в выбранных ниже кампаниях и отдельно CMT11.

Использованы сохранённые результаты, исходники сценариев и реализации, а также короткие уточняющие проверки через public API/DOM на UMD из snapshot основной кампании. Большие кампании повторно не запускались. Уточняющие проверки не прибавляются к числам основных прогонов.

## Как читать доказательства

| Кампания | Полный размер | Рассмотренная часть | Pass / fail в исходном журнале |
|---|---:|---:|---:|
| [Основная](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/results.json) | 303 | 26 input cases + CMT11, каждый в трёх движках: 81 | 44 / 37 |
| [Повтор input](../../.tmp/audit/2026-10-31T19-47-55-201Z-smoke/results.json) | 774 | 26 cases × 3 движка × 3 повтора: 234 | 132 / 102 |
| [Повтор commits](../../.tmp/audit/2026-10-31T19-58-17-107Z-smoke/results.json) | 108 | CMT11 × 3 движка × 3 повтора: 9 | 0 / 9 |

Raw `reproduced` означает нарушение прежнего ожидания теста, а не окончательную классификацию бага. Старые журналы не переписаны. После разбора IN06 исправлен как test-oracle, IN08 переведён в `CONTRACT_GAP`. По этой области остаются **11 case IDs с подтверждёнными нарушениями**, относящиеся к **9 группам причин**, один contract-gap и один ошибочный oracle. Это не количество новых багов: шесть подтверждённых групп уже входят в [findings.json](findings.json).

`3/3` ниже — три движка в основной кампании; `9/9` — три повтора в каждом движке. Для CMT11 повтор взят из отдельной commits-кампании.

## Полный реестр падавших случаев

| Case | Fail: основной / повтор | Итог | Группа причины | Наблюдение и основание |
|---|---:|---|---|---|
| **IN02** | 3/3 · 9/9 | **confirmed-bug** | Отсутствует владелец обычного drag; новая группа | Чужой pointer меняет translate `-140 → -500`; чужой pointerup завершает жест первого pointer. Уточняющий probe добавил полноценный pointerdown второго указателя вне слайдера и подтвердил оба эффекта. |
| **IN06** | 1/3 · 3/9, только WebKit | **test-oracle**, исправлен | Невидимая первая ссылка после допустимого flick | Первый anchor полностью обрезан track после перехода к карточке 1. Timeout при его клике не доказывает потерю кликов. Клик реально видимой активной ссылки работает. |
| **IN08** | 3/3 · 9/9 | **contract-gap** | Пространство индекса click; пересмотр TVIST-AUDIT-005 | Callback возвращает DOM index `7/11/13/8` для original indices `0/4/6/1`. Payload указывает правильный DOM-элемент. Публичный контракт click не определяет DOM versus logical index. |
| **CT01** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-006 | При `releaseOnEdges:true` первая wheel-попытка на краю не отменяется, следующие девять в throttle-окне отменяются. Проверка throttle выполняет preventDefault раньше проверки края. |
| **CT03** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-007 | После реального drag scrollbar и явно синтетического pointercancel остаётся `scrollbar--dragging`. Документные обработчики подписаны на move/up, но не cancel. |
| **CT05** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-008 | После `updateOptions({scrollbar:{container:B}})` thumb в B отсутствует. Обновляются hide/draggable/cache, но контейнер и слушатели не перепривязываются. |
| **SY01** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-003, вместе с G24 | Документированная `thumbs:{slider}` не связывает экземпляры: click thumb 2 оставляет main 0. Рабочий `.sync()` проверяется отдельными проходящими cases и не был вызван вместо проверяемой опции. |
| **SY02** | 3/3 · 9/9 | **confirmed-bug** | Логический индекс сравнивается с DOM activeIndex в Thumbs; новая группа | После reorder и instant-перехода thumbnail 0 находится в DOM-позиции 1. Клик уже выбранной миниатюры не вызывает необходимую синхронизацию main. С ожиданием settle воспроизводится так же. |
| **LC01** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-002 | Append + public update сохраняет count 3, не включает новый элемент и ограничивает переход старым последним индексом 2 вместо 3. Документация прямо показывает этот append/update путь. |
| **LC02** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-002 | Удаление активного DOM-узла + update оставляет count 4 и disconnected active/public slide вместо трёх подключённых узлов. |
| **LC03** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-002 | После `display:none` + update остаются пять slides вместо трёх; скрытые узлы остаются в public layout collection. Это противоречит явно заданному правилу выборки `getSlidesInTvistRoot`, исключающему computed display:none. |
| **EV01** | 3/3 · 9/9 | **confirmed-bug** | TVIST-AUDIT-001 | Ограниченный рекурсивный emit из once вызывает callback трижды. Wrapper снимает подписку после вызова пользовательского handler, поэтому повторный вход ещё видит подписку. |
| **CMT11** | 3/3 · 9/9 | **confirmed-bug** | Проверка HTMLElement через неправильное окно в Navigation; новая группа | Идентичность root/options/arrows сохранена, defaults и perPage правильные. Переданные iframe-кнопки проигнорированы из-за `instanceof HTMLElement` родительского окна; вместо них созданы другие кнопки. Это не потеря cross-realm options. |

IN01, IN03, IN04, IN05, IN07, CT02, CT04, SY03, SY04, SY05, LC04, LC05, EV02 и EV03 проходят в обеих input-кампаниях. Их успех не означает полноту покрытия семейства. Например, CT02 проверяет одиночный настоящий wheel на краю, а CT01 — burst внутри throttle-окна.

## IN02: чужой pointer действительно перехватывает текущий drag

[Основное доказательство](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/IN02-chromium.json). В [DragModule](../../src/modules/drag/DragModule.ts) обычный `local_onPointerMove` проверяет только potential/dragging, а `local_onPointerUp` завершает текущее состояние независимо от pointerId. Проверки идентификатора имеются у отдельного hold-to-pause пути, но не у обычного drag.

Чтобы исключить возражение об отсутствующем pointerdown второго указателя в исходном тесте, уточняющий probe добавил кнопку вне root и полную последовательность:

1. pointerdown 1 внутри root; pointermove 1 начинает и продолжает drag.
2. pointerdown 2 на внешней кнопке, затем pointermove 2 на document.
3. pointerup 2, затем pointerup 1 для завершения fixture.

```json
{"before":-140,"after":-500,"ownerStillDragging":false}
```

Это подтверждение ошибки обработки входящих Pointer Events. События синтетические; реальный аппаратный multitouch этим не сертифицирован. В реестре нужно сохранить именно этот уровень доказательств, не превращая его в утверждение о проверенных физических touch-устройствах.

## SY02: выбранная миниатюра и DOM-позиция — разные индексы

[Основное доказательство](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/SY02-chromium.json). После loop-навигации порядок исходных узлов становится `[6,0,1,2,3,4,5]`. `scrollTo(0,true)` выбирает logical 0 / DOM 1; main остаётся на 1, поскольку instant-путь не отправляет slideChangeStart. Затем клик по оригинальной миниатюре 0 должен запустить уже предусмотренную в Thumbs ветку синхронизации выбранной миниатюры.

[ThumbsModule](../../src/modules/thumbs/ThumbsModule.ts) сохраняет исходный индекс узла при init и сравнивает его с текущим `activeIndex`, который после reorder относится к DOM. При `0 !== 1` вызывается scrollTo того же logical 0, переход не происходит, новый slideChangeStart отсутствует. Уточняющее измерение:

```json
{
  "requested": 0,
  "logical": 0,
  "activeDom": 1,
  "thumbReal": 0,
  "mainReal": 1,
  "mainAfterClick": 1,
  "changeStarts": []
}
```

Отдельное ожидание settle перед кликом не меняет результат. Ошибка не сводится к слишком быстрым вызовам в одном evaluate. Это также не утверждение, что любой thumbnail click после reorder не работает: SRC-L06 проходит при клике по другой видимой миниатюре после синхронного перехода обоих slider. Точный проблемный путь — click уже выбранной thumbnail после изменения её позиции без синхронизирующего события.

Это отдельная причина от SY01: SY02 явно вызывает `.sync()`, поэтому отсутствие обработки `thumbs.slider` не объясняет его падение.

## CMT11: элементы другого окна, а не сломанное слияние options

[Основное доказательство](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/CMT11-chromium.json). Исходный case возвращает `rootIdentity:true`, `nextIdentity:true`, `perPage:2`, `defaultDirection:'horizontal'`, count 5. Единственное расхождение — index после переданной next-кнопки остаётся 0.

Короткая контрольная проверка на том же UMD дала:

```json
{
  "foreignIsParentHTMLElement": false,
  "foreignIsOwnerHTMLElement": true,
  "passedButtonIdentity": true,
  "initialIndex": 0,
  "generatedButtons": 2,
  "generatedNextIndex": 1,
  "directNextIndex": 1,
  "foreignOptionsParentControlsIndex": 1
}
```

В [NavigationModule](../../src/modules/navigation/NavigationModule.ts) переданные controls принимаются только при `arrows.next/prev instanceof HTMLElement` текущего окна. Настоящие HTMLElement из iframe не проходят эту проверку. Затем модуль создаёт запасные кнопки; их click и прямой `slider.next()` работают. Foreign-realm Object с parent-realm controls также работает.

Таким образом, название группы должно относиться к **foreign-realm custom navigation elements**, а не к потере options/defaults. Проверка не утверждает, что все операции экземпляра между разными документами уже поддержаны; она изолирует конкретный ложный отказ в обработке принятого DOM-reference.

## IN06 и IN08: исправление классификации

У [старого IN06 WebKit](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/IN06-webkit.json) locator click не получал pointer events. После короткого flick измерены index 1, пустой hash, bounds первой ссылки `[-712,8]` при track `[8,728]`; пересечение по горизонтали равно нулю. Клик видимой active-ссылки приводит к `#audit-destination`. Это ожидаемая обрезка старого слайда, а не продолжающееся подавление кликов.

Исправленный IN06 выбирает фактически выбранный public active slide, проверяет положительное пересечение ссылки с track, делает настоящий click и проверяет hash вместе с неизменным slider index. Короткий delta-прогон на сохранённой UMD: Chromium PASS, Firefox PASS, WebKit PASS.

У [IN08](../../.tmp/audit/2026-10-31T20-36-46-141Z-smoke-all-d79084db/IN08-chromium.json) измерение корректно, прежний oracle навязывал недокументированное пространство index. [runtime click handler](../../src/core/runtime.ts) явно берёт позицию `slides.indexOf(slide)`. [Публичный тип click](../../src/core/types.ts) не обещает logical index, в отличие от явно документированного slideChangeStart. Клики фактически выполняются по **оригиналам в clone-режиме**, а не обязательно по самим клонам: новые наблюдения содержат `isClone:false` и правильную target identity.

Теперь case проверяет четыре payload/target identity и при расхождении DOM/logical index выдаёт `CONTRACT_GAP` с данными события. Chromium, Firefox и WebKit дают один и тот же результат. TVIST-AUDIT-005 следует хранить как наблюдение и вопрос публичного контракта, не включать в подтверждённые production bugs до решения API-политики.

SRC-L03 относится к тому же правилу строгого отделения факта от требования, но к другой политике: неподвижное прерывание seam-перехода возвращает 6 вместо ожидаемой цели 0; код пытается возобновить сохранённую цель, однако public resume-target versus nearest-snap контракт не определён. Его согласованная классификация — contract-gap, не новая подтверждённая input-группа.

## Основания для существующих групп

- **TVIST-AUDIT-001 / EV01:** [EventEmitter.once](../../src/core/EventEmitter.ts) снимает wrapper после пользовательского callback. Ограничитель рекурсии в тесте предотвращает зависание и не создаёт повторную подписку.
- **TVIST-AUDIT-002 / LC01–03:** [public update contract](../api/reference.md#methodupdate) требует update после изменения содержимого/DOM. [runtime.update](../../src/core/runtime.ts) обновляет engine/modules, но не выполняет свежую выборку slides. [getSlidesInTvistRoot](../../src/core/tvistSlides.ts) явно исключает display:none. Поэтому append, disconnected active и stale hidden nodes — три проявления одной причины. Сюда же относится CMT07 lazy append, рассмотренный в общем реестре.
- **TVIST-AUDIT-003 / SY01:** [thumbs option](../../src/core/types.ts) описывает связь с экземпляром миниатюр, но [ThumbsModule](../../src/modules/thumbs/ThumbsModule.ts) реагирует на isNavigation и не использует `thumbs.slider`; runtime связывает экземпляры только через отдельно вызванный sync.
- **TVIST-AUDIT-006 / CT01:** [ScrollControlModule](../../src/modules/scroll-control/ScrollControlModule.ts) отменяет wheel в throttle-ветке раньше releaseOnEdges. Синтетический burst изолирует порядок проверок; одиночный native wheel не опровергает эту ошибку.
- **TVIST-AUDIT-007 / CT03:** [ScrollbarModule](../../src/modules/scrollbar/ScrollbarModule.ts) при pointerdown подписывает document на pointermove/up, но не pointercancel. Сбой остаётся после корректного начала настоящим mouse input и относится к завершению жеста.
- **TVIST-AUDIT-008 / CT05:** тот же модуль в onOptionsUpdate перечитывает hide/hideDelay/draggable, но не создаёт DOM в новом container и не переносит существующий DOM. [updateOptions contract](../api/reference.md#methodupdateoptions) не объявляет container исключением из динамического обновления.

Raw-артефакты сохраняют прежние labels и fingerprints. Этот документ уточняет причинную группировку и классификацию; он не подменяет повторный финальный delta-прогон координатора и не меняет known-failures автоматически.
