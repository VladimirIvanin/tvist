# Browser deep и slider unit deep: независимая проверка результата

Завершённый browser deep: **900/900 уникальных case/project/trial**, по 50 seeds шести семейств на Chromium, Firefox и WebKit. Сверены execution plan, `complete.json`, raw results, история всех 900 наблюдений и реальные пути к артефактам с учётом resume. Новых видов первого failure по сравнению с рассмотренной Chromium/Firefox выборкой не появилось. Это **300 pass, 600 raw assertion failures**; 18 из этих failures относятся к самому fixture, остальные 582 связаны с уже описанными находками. Эти числа не означают 582 отдельных доказанных бага.

Точная поштучная классификация, источники, SHA результатов и проверка ссылок: [deep-review.json](./deep-review.json). Raw evidence остаётся локально в `.tmp/audit`, в том числе у предков resumed запуска. Публикация этой сводки не публикует сами trace/PNG/metrics.

Проверяемая библиотека: Tvist 1.20.1, commit `dea54d579239cd29224303c90646f00b577ec41c`, UMD SHA-256 `63f82928b9db2be2374e2824c62021aa8b7558d02658b8a2b8f87a421c234550`. Проверенный terminal run: `.tmp/audit/2026-11-01T07-10-46-269Z-deep-all-bf7210aa`, завершён 1 ноября 2026 в 10:16:11 MSK. Reused observations сохраняют ссылки на первоначальные артефакты запуска `2026-10-31T22-13-00-696Z-deep-all-d3adad1f`.

## Фактически исполненные команды

| Browser family, 150 seeds каждая | Pass | Связанные расхождения | Ошибка fixture | Команд начато | Успешно проверено | Неисполненный хвост |
|---|---:|---:|---:|---:|---:|---:|
| 0 loop/navigation | 0 | 150 | 0 | 1221 | 1071 | 6279 |
| 1 gestures/controls | 150 | 0 | 0 | 7500 | 7500 | 0 |
| 2 sync/nesting | 0 | 150 | 0 | 765 | 615 | 6735 |
| 3 breakpoints/layout | 0 | 150 | 0 | 1392 | 1242 | 6108 |
| 4 media/visibility | 150 | 0 | 0 | 7500 | 7500 | 0 |
| 5 grid/lifecycle | 0 | 132 | 18 | 693 | 543 | 6807 |
| **Всего** | **300** | **582** | **18** | **19071** | **18471** | **25929** |

Всего запланировано 45000 команд. Арифметика независимо сверена: `45000 = 19071 attempted + 25929 blocked`; `19071 = 18471 verified + 600 failing commands`. У каждой из 900 строк длина сохранённой `history` совпадает с количеством начатых команд. У pass возвращено `commands:50`, у failure использован сохранённый `step+1`, а для verified — `step`. Нет пропущенных, лишних или дублирующихся observation keys. В четырёх прерванных WebKit-строках исходного запуска браузер был закрыт извне; их исключили из resume seed и повторили. В terminal cohort closure failures отсутствуют. Исторические closure-записи сохранены отдельно и не объявлены дефектом библиотеки.

## Первый failure и связь с находками

Распределения для каждого движка одинаковы:

- **TVIST-AUDIT-024**: 47/50 seeds family0, все 50 family2, все 50 family3 падают на stale active identity после instant navigation. Family0/3 прямо вызывают `scrollTo(index,true)` в `jump`. В family2 обе падающие команды тоже содержат instant main navigation: `child-drag` сначала возвращает main на ноль, `thumb-cycle` меняет main при выключенных thumbnails. Первым падает `active-identity`, а не отдельный sync/nested oracle. Эти строки не доказывают новые поломки nested, sync или breakpoints.
- **TVIST-AUDIT-019/018**: остальные три loop seeds `35/46/49` сначала включают explicit clones, затем меняют loop на `true`; physical clones остаются, несколько копий получают active. История и HTML показывают взаимодействие смены хранения и clone recognition. Отдельная новая первопричина не установлена.
- **TVIST-AUDIT-004**: 10 grid-shape failures на движок ожидают четыре страницы вместо трёх. Семь seeds `11/16/31/37/39/44/49` вообще не содержат filter. Это уже описанное отсутствие перерасчёта при изолированной смене `grid`. В трёх остальных ожидаемое число страниц также остаётся четыре независимо от сохранения скрытых карточек.
- **TVIST-AUDIT-002 с ограничением grid-контракта**: 19 append failures на движок сохраняют старое число страниц после вставки original card в exposed container и `update()`. Ещё шесть `STATEFUL_APPENDED_CARD_PRESERVED` показывают потерю нового узла при применении отложенного grid rebuild. `removeGrid` очищает container и возвращает cached originals. Это combined dynamic collection/grid update path, связанный с 002/004; точные правила вставки в работающую grid-структуру документированы слабее обычных слайдов.
- Ещё девять grid failures на движок — stale active identity после `filter` или `axis`, когда pending grid rebuild создал новые public page wrappers, а active-класс остался на inner original. Например `DEEP-5-4` сохраняет active на card-0 внутри первой неактивной wrapper page. Это связано с порядком grid update; в этом сценарии нет клонов, поэтому его не следует автоматически объединять с clone-specific 037. Сам по себе oracle не доказывает обязательность repack при скрытии произвольной inner card.

Связь сложной истории с известной находкой не гарантирует, что все последующие команды пройдут после её исправления. Неисполненные суффиксы остаются непроверенными.

## Ошибочный duplicate oracle в fixture

**18 raw failures (seeds family5 `0/2/19/25/42/46` × три движка) классифицированы как `test-harness-issue`.** Новый узел получает ID `card-${cards.length}`, где cards — текущие подключённые узлы. После предшествующего hide/rebuild/cycle их становится 10 или 11, но старый `card-10`/`card-11` ещё существует. Fixture присваивает новому самостоятельному узлу то же имя, затем сравнивает `new Set(dataset.caseId).size` с количеством узлов. Столкновение имён создано тестом; это не доказательство, что Tvist дублировал original node.

HTML подтверждает 11 узлов/10 имён в seed0 и 12 узлов/11 имён в seed2, одинаково в трёх движках. Дальнейшее исправление fixture требует монотонных IDs либо сохранённых ссылок на original nodes. В рамках этого финального ревью source не менялся. Предшествующее исчезновение/исключение скрытых карточек следует рассматривать отдельно от ложного duplicate assertion.

## Границы browser-модели

Реальные шесть семейств программы: loop-navigation, gestures-controls, sync-nesting, breakpoints-layout, media-visibility, grid-lifecycle. Family5 не генерирует fade/cube; эти эффекты покрыты отдельными адресными сценариями. Family4 проверяет команды и общие инварианты finite values/active identity, но не реализует полную независимую модель причин autoplay-паузы, актуальности `ended`, media time или результата manual stop. Его pass не опровергают адресные autoplay/video failures.

Общее `check()` не проверяет отсутствие внутренних дыр в геометрии, корректность semantic snap target, промежуточную opacity/projection или ресурсный baseline. Для этого предназначены отдельные geometry/risk/resource проверки. Слово verified в таблице означает успешно завершённые assertions именно этой модели, а не полную проверку всех свойств слайдера.

## Slider unit deep: все 614 первых model failures разобраны

Отдельная happy-dom кампания `.tmp/audit/slider-deep/2026-10-31T21-40-45-686Z-full-v7jneT/summary.json` завершена: 3000 seeds, 2386 pass, 614 model failures, 0 harnessErrors; 312737 verified commands и 64181 blocked tail. Геометрия и observers в ней подменены, scheduling управляется часами; она не доказывает реальную отрисовку или native input.

| Family | Failure count | Oracle | Связь |
|---|---:|---|---|
| 0 | 122 | `SLIDER_UNIT_NAV_INDEX` | 019, loop включён после finite init |
| 4 | 250 | `SLIDER_UNIT_AUTOPLAY_STOPPED` | 014, manual stop state |
| 5 | 242 | `SLIDER_UNIT_EFFECT_PERPAGE` | 031, повторная нормализация effect/perPage |

У **всех 122 navigation failures** последняя recreate-эпоха началась с `loop:false`, а при failure `loop:true` и enabled:true. У 106 последним loop update был false→true; у 16 redundant true→true после более раннего включения. 90 падают на prev, 32 — на next. Официальный UREG001 отдельно уменьшает этот trigger до finite init→enable loop→prev и подтверждает его в трёх браузерах.

Все **250 autoplay failures** стоят непосредственно на stop. Половина seed-профилей намеренно hover-only и проходит; доля упавших seeds не оценивает долю затронутых пользователей.

Все **242 effect failures** возникают при уже включённом fade/cube: 64 fade→fade, 54 cube→cube, 65 fade→cube, 59 cube→fade. Запрошенный `perPage:3` сохраняется вместо ограничивающего `1`. Поэтому 031 относится шире к нормализации при уже активном ограничивающем эффекте. UREG002 доказывает browser minimum redundant fade; cube и cross-effect здесь остаются unit-модельными наблюдениями без отдельного адресного browser minimum.

Группировка объясняет первые сохранённые расхождения. Она не доказывает, что эти 614 последовательностей имеют ровно три внутренние первопричины или что весь их остаток будет зелёным после трёх исправлений.
