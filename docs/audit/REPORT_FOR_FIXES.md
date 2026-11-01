# Tvist: отчёт для чата исправлений

Дата: 1 ноября 2026, MSK. Ветка: **audit**. Проверена Tvist **1.20.1**, production commit `dea54d579239cd29224303c90646f00b577ec41c`. Ядро, модули, CSS библиотеки, версия и release-артефакты не изменялись. В main аудит не переносился.

**Результат: 39 воспроизводимых групп нарушений и одна запись с неясным контрактом в реестре из 40 записей.** Дополнительные вопросы контракта учитываются отдельно. Это группы связанных проявлений, а не доказательство ровно 39 независимых внутренних причин. Библиотека в этом аудите не исправлялась.

Для нового чата: «Работаем с Tvist по docs/audit/REPORT_FOR_FIXES.md в ветке audit. Выбери группу, проверь её минимальное воспроизведение, исправь библиотеку и сохрани содержательную регрессию. Не переноси весь исследовательский стенд в main; не ослабляй ожидания ради зелёного статуса».

## С чего начать исправления

1. **Состояния и обновления:** 001 once; 002 DOM collection; 004 перерасчёт опций; 018/019 loop; 024 active после instant navigation; 037 grid+clones. Эти причины блокируют много производных проверок.
2. **Медиа и таймеры:** 014 manual stop; 032 читающий listener меняет поведение; 033 владелец ended; 010/011 native video; 015/016 lazy.
3. **Ввод и controls:** 006 wheel; 007/008/009/035/038 scrollbar; 028 pointer owner; 003/029 thumbs; 034 breakpoint enable.
4. **Геометрия и движки:** 020–023, 025–027, 036; WebKit 039/040. Отдельно — пакет и типы 012/013, авторские ID 017, iframe 030 и effect normalization 031.

Не объединять автоматически 024 и 038: у scrollbar свой триггер прямой записи индекса. Не считать внутренние expected-value ошибки чужих библиотек контрактом Tvist.

## Что завершено

| Кампания | Фактически / план | Raw-статусы |
|---|---:|---|
| smoke | 1230/1230 | reproduced: 415; contract-gap: 54; pass: 740; unsupported: 12; test-harness-issue: 9 |
| matrix | 1264/1264 | pass: 946; reproduced: 271; contract-gap: 45; unsupported: 2 |
| deep | 900/900 | reproduced: 600; pass: 300 |
| R03 | 72/72 | pass: 36; reproduced: 36 |
| performance | 75/75 | pass: 75 |

Smoke включает 130 адресных кейсов × три движка × три повтора и 60 Chromium-последовательностей. Matrix включает desktop Chromium/Firefox/WebKit, выбранные mobile-профили Chromium/WebKit, геометрию, модули и рисковые тройки. Все terminal планы независимо сверены: нет пропущенных, лишних или повторных case/project/trial. Исторические и финальные запуски не суммируются в общий «успех».

В matrix две Chromium-строки R03 первоначально падали из-за abort изображения в teardown. Повтор R03 после исправления только fixture-cleanup выполнен 72/72. Для итогового покрытия подставлен его trial1: **948 pass, 269 reproduced, 45 contract-gap, 2 unsupported** вместо raw 946/271/45/2. Исходные строки сохранены.

В deep raw600 failures включают **18 ошибок генератора ID fixture**, которые не являются дублированием узлов библиотекой. Оставшиеся 582 наблюдения связаны с известными находками, с оговорками для dynamic grid. Исполнено **19071** команд, успешно проверено **18471**, **25929** команд осталось после первого нарушения. Остановленный хвост не считается проверенным. Smoke-последовательности: 701 начатая, 664 успешно проверенные команды, 499 в заблокированном хвосте.

Дополнительно:

- Исходный Vitest: 114 файлов, 1212 pass и 1 skip. Покрытие lines90,06%; core lines90,94%, branches90,83%, functions83,71%. Локальные пробелы по отдельным классам сохранены в test-quality.json.
- Неизменённый legacy E2E: **102/102** на трёх движках; существующие docs tests **23/23**.
- Core utility deep: **3000 последовательностей, 233055 команд**, все прошли.
- Slider unit deep: **3000 seeds**, 2386 pass, 614 model failures; 313351 команд начато, 312737 успешно проверено, 64181 в хвосте. Все первые расхождения разобраны; они связаны с 019/014/031.
- Финальный быстрый unit-аудит: **77 pass, 1 реальное нарушение once, 18 условно пропущенных deep tests**. Deep выполнены отдельными кампаниями. Проверки отрицательных fixtures/gate/oracles проходят. Typecheck и lint библиотеки и аудита проходят.
- Soak: **21/21** исторических source-reviewed наблюдений:100 lifecycle-циклов при1/10/50 экземплярах и четыре реальных десятиминутных режима на каждый движок. Fake clock в этом пути не используется. В старом формате нет execution plan/browser versions/покадровой истории каждого lifecycle-цикла; это ограничение доказательств.
- Heap Chromium: пять измерительных пакетов по100 lifecycle-циклов после прогрева, **0 удерживаемых root**, стабильные DOM/listener counts. Это не доказательство отсутствия любых утечек.
- Demos: **29×3=87**, 84 pass и3 locked limitations; две cleanup-записи стенда отдельно. Пакет:17 pass,4 ошибки типов с двумя причинами,2 ограничения.
- Адресное подтверждение новых рисков: **78/78**,18 pass/60 reproduced. Пять минимумов — по3 повтора в каждом desktop-движке. Cube WebKit —12/12 нарушений desktop/mobile, Chromium/Firefox12/12 pass; G22 ResizeObserver error —WebKit3/3, Chromium/Firefox6/6 pass.

## Покрытие сочетаний и его знаменатели

Геометрия: **192 строки /1917 заявленных допустимых пар и троек**; включение модулей: **27 строк /405 требований**. Независимая проверка генератора не обнаружила пропусков в этих конечных доменах. Это не полный декартов продукт всех документированных опций.

Десять обязательных семейств содержат **325 конечных троек**. Все325 вызваны в каждом desktop-движке. В таблице порядок — Chromium / Firefox / WebKit; «pass целиком» означает завершение всего сценария без первого нарушения.

| Семейство | Требований на движок | Вызвано C/F/W | Pass целиком C/F/W |
|---|---:|---|---|
| R01 | 192 | 192 / 192 / 192 | 142 / 142 / 142 |
| R02 | 24 | 24 / 24 / 24 | 16 / 16 / 16 |
| R03 | 8 | 8 / 8 / 8 | 4 / 4 / 4 |
| R04 | 27 | 27 / 27 / 27 | 21 / 21 / 21 |
| R05 | 12 | 12 / 12 / 12 | 9 / 9 / 9 |
| R06 | 18 | 18 / 18 / 18 | 18 / 18 / 16 |
| R07 | 12 | 12 / 12 / 12 | 6 / 6 / 6 |
| R08 | 12 | 12 / 12 / 12 | 8 / 8 / 8 |
| R09 | 8 | 8 / 8 / 8 | 8 / 8 / 8 |
| R10 | 12 | 12 / 12 / 12 | 3 / 3 / 3 |

Детальные уровни, свидетели, mobile subset и остатки — [interaction-coverage.json](D:/projects/tvist/docs/audit/interaction-coverage.json). Причины исключений/неясностей не подменяют падающие комбинации unsupported. Вызванная тройка с ранним failure не доказывает корректность остальных фаз.

## Реестр групп

005 имеет статус contract-gap и не входит в39 подтверждённых групп. Указанный приоритет — оценка влияния сценария, не число затронутых пользователей.

| ID | Приоритет | Проявление | Cases |
|---|---|---|---|
| 001 | P1 | Повторный emit внутри once вызывает callback несколько раз | EV01 |
| 002 | P1 | update() сохраняет устаревший список слайдов | LC01, LC02, LC03, CMT07 |
| 003 | P1 | thumbs:{slider} не создаёт обещанную связь | SY01, G24 |
| 004 | P1 | Изолированная смена autoWidth/autoHeight/grid пропускает перерасчёт | G08, G09, G19 |
| 005 | P1 | Не определено пространство индексов click-события | IN08 |
| 006 | P1 | Wheel throttle блокирует releaseOnEdges | CT01, NINPUT-003 |
| 007 | P1 | Отмена pointer-жеста не завершает drag scrollbar | CT03 |
| 008 | P1 | Scrollbar не переносится в новый container | CT05 |
| 009 | P1 | Scrollbar не достигает конца после resize | CMT05 |
| 010 | P1 | Запускается видео невидимой loop-копии | NATIVE-002 |
| 011 | P1 | Поздний ready запускает уже неактивное видео | NATIVE-003 |
| 012 | P1 | Декларации не разрешаются в Node16/NodeNext |  |
| 013 | P1 | CJS consumer получает несовместимую ESM-ветку типов |  |
| 014 | P1 | Ручной stop autoplay теряется и неправильно отражается в state | MEDIA-002, MEDIA-005, MEDIA-034 |
| 015 | P2 | Lazy оставляет шесть spinner после destroy | MEDIA-030 |
| 016 | P1 | Lazy loadAll пропускает изображения внутри ссылок | MEDIA-020 |
| 017 | P2 | Клоны форм дублируют авторские ID | MEDIA-026 |
| 018 | P1 | Автоматические клоны распознаются непоследовательно | G01, G26, SRC-G11 |
| 019 | P1 | Динамическое включение loop и смена хранения оставляют устаревшее состояние | G03, UREG-001 |
| 020 | P1 | При дробном perPage расходится идентичность конечной карточки | G06 |
| 021 | P1 | CSS calc/clamp gap расходится с шагом движения | G10 |
| 022 | P1 | Последний gap переставленной карточки оставляет щель | G15 |
| 023 | P2 | Смена оси сохраняет padding старого peek | G17 |
| 024 | P1 | Instant navigation не обновляет active-состояние | G07, G21, MEDIA-024 |
| 025 | P1 | Free inertia нарушает покрытие loop viewport | SRC-G03 |
| 026 | P2 | Grid+loop destroy меняет авторский порядок | SRC-G06 |
| 027 | P1 | AutoWidth loop не обеспечивает достаточный буфер | SRC-G10 |
| 028 | P1 | Чужой pointer изменяет и завершает текущий drag | IN02 |
| 029 | P1 | Клик выбранной переставленной миниатюры меняет main | SY02 |
| 030 | P1 | HTMLElement из iframe отвергается instanceof-проверкой | CMT11 |
| 031 | P1 | Повторное включение fade перестаёт нормализовать perPage | UREG-002 |
| 032 | P1 | Читающий videoEnded listener приводит к двойному переходу | EREG-001 |
| 033 | P1 | Ended неактивного видео используется после снятия паузы | RISK-07-009, RISK-07-010 |
| 034 | P1 | Контейнерный breakpoint не включает slider обратно | RISK-05-009, RISK-05-010, RISK-05-011 |
| 035 | P1 | Scrollbar отстаёт от реального free-drag положения | RISK-10-001, RISK-10-003, RISK-10-005 |
| 036 | P1 | Дальний scrollTo в fixedWidth loop оставляет пустую область | RISK-02-009, RISK-02-010 |
| 037 | P1 | Grid с клонами не назначает active публичной странице | RISK-08-002, RISK-08-005, RISK-08-008, RISK-08-011 |
| 038 | P1 | Drag scrollbar оставляет устаревший active-класс | RISK-10-001, RISK-10-003, RISK-10-005, RISK-10-007, RISK-10-009, RISK-10-011 |
| 039 | P2 | WebKit: смена эффектов создаёт ResizeObserver loop error | G22 |
| 040 | P1 | WebKit: resize во время cube убирает отрисованные грани | RISK-06-012, RISK-06-015 |

## Источники, контракты и качество измерений

Исследованы 44 сценария из issues Splide/Swiper и24 отобранных исправляющих diff; использованы идеи тестов Splide, Embla, egjs-flicking, Glide, react-slick, Flickity. Чужие suites не запускались; число их файлов не означает coverage Tvist. Issues классифицированы как16mapped/24partial/4gap, commits17mapped/6partial/1gap. Для SW02 отсутствует точная перенесённая percentage-height часть; для всех24diff не сохранён единый журнал проверки follow-up/revert/read-hunks. Перечень источников: [research.md](D:/projects/tvist/docs/audit/research.md), [sources.json](D:/projects/tvist/tests/audit/sources.json), [commits.json](D:/projects/tvist/docs/audit/commits.json).

Карта содержит53options,16builtins,36publicmembers,35events,27controlmethods. Это карта частичных связей с проверками, не полное подтверждение каждого контракта. В ней ещё есть uncovered/contract-gap и устаревающие привязки некоторых вновь добавленных R10-проверок. Нельзя объявить все пункты исходного масштабного плана полностью закрытыми. [contracts.json](D:/projects/tvist/tests/audit/contracts.json).

Просмотрены20 подозрительных старых тестов:6 имеют meaningful helper assertions,11 являются assertionless diagnostics,2TODO,1 пропущенный timing-placeholder. Старые проверки не ослаблялись. [test-quality.json](D:/projects/tvist/docs/audit/test-quality.json).

Проверки используют физическую DOM-геометрию, логическую идентичность, содержимое и controls. Negative fixtures подтверждают обнаружение дыр/неверного active/потерянных originals/ресурсов/движения. Было отдельно установлено, что Playwright page.clock принадлежит BrowserContext. Финальные кампании используют **новый контекст для каждого наблюдения** и проверяют чистые часы. Старые shared-context выводы о таймерах не используются как финальное доказательство.

## Что не объявлено исправным или полностью проверенным

- Нативное видео WebKit в этой Windows-среде: **9 preflight timeouts** при readyState0. Это test-harness/environment blocker, не ошибка VideoModule и не доказанная неподдержка кодека. Controlled media сценарии проверяют другие свойства.
- Chromium CDP touch действительно отправлен браузером; synthetic pointer/touch в Firefox/WebKit не равнозначен нативному touch-scroll. Реальные Safari/iPhone/Android не тестировались.
- Generated pagination keyboard entry, loop:auto, click index space, lostcapture и free pagination policy, retained controls afterdestroy и nested clones требуют решения контракта: [contract-questions.json](D:/projects/tvist/docs/audit/contract-questions.json). Fractional pagination2.5 сама по себе не признана багом; RTL API не выдумывался; autoHeight не приравнивался к адаптивной высоте горизонтального viewport.
- Browser deep family5 не генерирует fade/cube; family4 не содержит полной независимой модели autoplay. Его pass не отменяет адресные media failures. Дальнейшие хвосты после известных failures, все возможные DPR/единицы/опции и полный a11y screen-reader аудит не закрыты. Axe и клавиатурные проверки дают ограниченные свидетельства.
- Performance измерялась отдельно:75/75, по5 повторов, init/update/destroy, frames/longtasks/DOM writes. Для1000 карточек средний init C/F/W≈16,98/19,40/27ms; для50×100≈119,04/165,20/255,40ms. Это время синхронного вызова всей группы. На WebKit50×100 mean phasep95≈31,10ms; оно усредняет фазовые p95 и включает измерительный overhead, не является pooled percentile/гарантией60FPS. [performance.md](D:/projects/tvist/docs/audit/performance.md).

## Воспроизведение и организация ветки

Все исходники аудита и этот отчёт сохраняются только в audit. Workflow аудита отсутствует, существующие CI workflows не менялись, описания audit-команд в README нет. Тяжёлые артефакты и генерируемый20MB AST-каталог остаются локальными/игнорируемыми. В чистом checkout ветки для каталога выполните `npm ci`, затем `npm run audit:catalogue`; для native-video fixture — `npm run audit:fixture` (нужен доступный encoder; не подменять preflight успех фиктивным media event).

Примеры команд из корня репозитория:

```text
npm run audit -- --case=EV01 --project=all --repeat=3
npm run audit -- --case=RISK-06-012 --project=webkit --repeat=3
npm run audit -- --profile=smoke
npm run audit -- --replay=<saved-case.json>
npm run audit:unit
npm run audit:gate
```

Raw-аудит ожидаемо возвращает ненулевой код при нарушениях. Gate использует отдельные точные reviewed fingerprints и не пополняет реестр автоматически. Не все новые40групп имеют gate-entry для каждой длинной последовательности; gate не объявляется зелёным за счёт blanket skip/xfail. Неожиданное исчезновение старого нарушения требует повторной проверки. До будущих исправлений gate не является готовым обязательным CI-условием. Финальный запуск gate вернул exit1 по существующим нарушениям/ограничениям; unitEvidenceErrors=[] и executionPlanErrors=[] — привязка результатов и планы валидны. Журнал локально: .tmp/audit/gate-final.log.

Локальные доказательства: **D:/projects/tvist/.tmp/audit**. Resumed observations ссылаются на родительские каталоги; нельзя переносить только terminal directory. Канонический выбор кампаний: [authoritative-results.json](D:/projects/tvist/docs/audit/authoritative-results.json); подробный разбор deep: [deep-review.md](D:/projects/tvist/docs/audit/deep-review.md); независимое ревью: [final-review.md](D:/projects/tvist/docs/audit/final-review.md). Старые research/triage журналы содержат исторические срезы и не заменяют эти итоговые числа.

Практические разборы с точными параметрами и местами изменения: [геометрия](D:/projects/tvist/docs/audit/geometry-handoff.md), [ввод и lifecycle](D:/projects/tvist/docs/audit/input-handoff.md), [медиа](D:/projects/tvist/docs/audit/media-handoff.md).

## Подробности для исправления каждой группы

Первые записи сохраняют исходные технические формулировки registry. Точные fixtures/actions/assertions находятся в указанных case IDs в tests/audit; source-ссылки относятся к проверенному production commit.

### TVIST-AUDIT-001: Повторный emit внутри once вызывает callback несколько раз

Статус: **reproduced**, P1. Cases: EV01.

Триггер: once callback emits the same event once under a guard.

Ожидание: one invocation. Наблюдение: 3 invocations.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=EV01 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-002: update() сохраняет устаревший список слайдов

Статус: **reproduced**, P1. Cases: LC01, LC02, LC03, CMT07.

Триггер: append/remove/filter DOM, then public update().

Ожидание: collection and controls reflect current slides. Наблюдение: stale collection; appended lazy image is not discovered.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=LC01 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-003: thumbs:{slider} не создаёт обещанную связь

Статус: **reproduced**, P1. Cases: SY01, G24.

Триггер: create main with thumbs:{slider}, click a thumbnail.

Ожидание: main selects the clicked original. Наблюдение: main remains at previous index.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=SY01 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-004: Изолированная смена autoWidth/autoHeight/grid пропускает перерасчёт

Статус: **reproduced**, P1. Cases: G08, G09, G19.

Триггер: change only autoWidth/autoHeight/grid through updateOptions.

Ожидание: new layout matches requested mode. Наблюдение: old dimensions or grid wrappers remain.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=G08 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-005: Не определено пространство индексов click-события

Статус: **contract-gap**, P1. Cases: IN08.

Триггер: clone loop, click a visible original identity.

Ожидание: callback logical index matches original. Наблюдение: callback index follows DOM position.

Основание и предел вывода: Measured click index is physical DOM index; documentation does not specify its coordinate space. It is not counted as a confirmed API defect. See input-triage.md.

Повтор: `npm run audit -- --case=IN08 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-006: Wheel throttle блокирует releaseOnEdges

Статус: **reproduced**, P1. Cases: CT01, NINPUT-003.

Триггер: rapid backward wheel at the beginning, releaseOnEdges true.

Ожидание: edge events permit native page scroll. Наблюдение: throttled event is defaultPrevented.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=CT01 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-007: Отмена pointer-жеста не завершает drag scrollbar

Статус: **reproduced**, P1. Cases: CT03.

Триггер: thumb pointerdown/move then pointercancel, move without pressing.

Ожидание: dragging ends and subsequent move has no effect. Наблюдение: drag state persists.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=CT03 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-008: Scrollbar не переносится в новый container

Статус: **reproduced**, P1. Cases: CT05.

Триггер: updateOptions scrollbar container A→B.

Ожидание: new container has working control, old one is detached. Наблюдение: new container remains empty.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=CT05 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-009: Scrollbar не достигает конца после resize

Статус: **reproduced**, P1. Cases: CMT05.

Триггер: last slide, resize custom scrollbar, public update.

Ожидание: thumb remains aligned with new track end. Наблюдение: thumb offset exceeds resized end.

Основание и предел вывода: Explicitly reviewed contract and targeted assertions; related cases grouped by cause. No production fix.

Повтор: `npm run audit -- --case=CMT05 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-010: Запускается видео невидимой loop-копии

Статус: **reproduced**, P1. Cases: NATIVE-002.

Ожидание: exactly the physically visible video plays. Наблюдение: the playing card-0 copy is outside the viewport.

Основание и предел вывода: Manually reviewed source and repeated targeted native/controlled cases; package diagnostics independently repeated.

Повтор: `npm run audit -- --case=NATIVE-002 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-011: Поздний ready запускает уже неактивное видео

Статус: **reproduced**, P1. Cases: NATIVE-003.

Ожидание: pauseOnLeave keeps old video paused after delayed readiness. Наблюдение: loaded readiness restarts the old video.

Основание и предел вывода: Manually reviewed source and repeated targeted native/controlled cases; package diagnostics independently repeated.

Повтор: `npm run audit -- --case=NATIVE-003 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-012: Декларации не разрешаются в Node16/NodeNext

Статус: **reproduced**, P1. Cases: .

Ожидание: published type declarations resolve through package exports. Наблюдение: TS2834 extensionless declaration imports.

Основание и предел вывода: Manually reviewed source and repeated targeted native/controlled cases; package diagnostics independently repeated.

Повтор: `npm run audit:package`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-013: CJS consumer получает несовместимую ESM-ветку типов

Статус: **reproduced**, P1. Cases: .

Ожидание: CJS require consumer resolves compatible declaration branch. Наблюдение: TS1471 package types point to ESM .d.ts.

Основание и предел вывода: Manually reviewed source and repeated targeted native/controlled cases; package diagnostics independently repeated.

Повтор: `npm run audit:package`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-014: Ручной stop autoplay теряется и неправильно отражается в state

Статус: **reproduced**, P1. Cases: MEDIA-002, MEDIA-005, MEDIA-034.

Ожидание: stop/isStopped persist through hover/hold/visibility. Наблюдение: hover or release resumes stopped motion; stopped state false.

Основание и предел вывода: Manually reviewed source and repeated targeted native/controlled cases; package diagnostics independently repeated.

Повтор: `npm run audit -- --case=MEDIA-002 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-015: Lazy оставляет шесть spinner после destroy

Статус: **reproduced**, P2. Cases: MEDIA-030.

Ожидание: destroy removes module-owned spinner elements. Наблюдение: 6 spinners remain after destroy.

Основание и предел вывода: media-triage.md; LazyLoad clears entries before iterating spinner cleanup

Повтор: `npm run audit -- --case=MEDIA-030 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-016: Lazy loadAll пропускает изображения внутри ссылок

Статус: **reproduced**, P1. Cases: MEDIA-020.

Ожидание: loadAll loads all slide images with data-src as described by module README. Наблюдение: all 7 nested images retain data-src.

Основание и предел вывода: media-triage.md; registration uses immediate children only

Повтор: `npm run audit -- --case=MEDIA-020 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-017: Клоны форм дублируют авторские ID

Статус: **reproduced**, P2. Cases: MEDIA-026.

Ожидание: connected input IDs remain unique after cloning. Наблюдение: 3 valid unique author IDs become 9 connected inputs with only 3 IDs.

Основание и предел вывода: registry-review.md and media-triage.md; confirmed HTML identifier uniqueness violation. Actual label activation was not tested; the browser first-match target behavior is not itself ambiguous.

Повтор: `npm run audit -- --case=MEDIA-026 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-018: Автоматические клоны распознаются непоследовательно

Статус: **reproduced**, P1. Cases: G01, G26, SRC-G11.

Ожидание: fallback clone storage preserves one active physical copy, correct adjacent identity and safe instant target. Наблюдение: duplicate active copies, wrong eager neighbour, first head clone selected with a large viewport hole.

Основание и предел вывода: geometry-triage.md; shared raw-options-versus-runtime-storage cause; later all-pairs branches blocked

Повтор: `npm run audit -- --case=G01 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-019: Динамическое включение loop и смена хранения оставляют устаревшее состояние

Статус: **reproduced**, P1. Cases: G03, UREG-001.

Ожидание: updateOptions can switch ordinary loop to explicit clone storage. Наблюдение: no clones created after loop true -> {withClones:true}.

Места для проверки: [src/core/Engine.ts:550](D:/projects/tvist/src/core/Engine.ts:550); [src/core/engine/Layout.ts:768](D:/projects/tvist/src/core/engine/Layout.ts:768); [src/core/Counter.ts:64](D:/projects/tvist/src/core/Counter.ts:64).

Основание и предел вывода: geometry-triage.md; initialized LoopModule returns before reconfiguration

Повтор: `npm run audit -- --case=G03 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-020: При дробном perPage расходится идентичность конечной карточки

Статус: **reproduced**, P1. Cases: G06.

Ожидание: visible selected card, active state and realIndex stay coherent at the finite end. Наблюдение: physical end reached while realIndex becomes 0 and active card remains 2 outside viewport.

Основание и предел вывода: geometry-triage.md; does not impose an integer pagination total or final-card policy

Повтор: `npm run audit -- --case=G06 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-021: CSS calc/clamp gap расходится с шагом движения

Статус: **reproduced**, P1. Cases: G10.

Ожидание: browser CSS gap and movement positions agree within 1px. Наблюдение: 18px CSS margin is omitted from navigation stride.

Основание и предел вывода: geometry-triage.md; calc(1rem + 2px), not a claim about every CSS expression

Повтор: `npm run audit -- --case=G10 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-022: Последний gap переставленной карточки оставляет щель

Статус: **reproduced**, P1. Cases: G15.

Триггер: loop reorder with perPage sizing, gap13.5, roundLengths:false.

Ожидание: loop reorder preserves configured spacing at the selected card. Наблюдение: active card displaced by exactly the 13.5px gap.

Основание и предел вывода: geometry-triage.md; fixed/perPage branch does not refresh the previous last-slide margin

Повтор: `npm run audit -- --case=G15 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-023: Смена оси сохраняет padding старого peek

Статус: **reproduced**, P2. Cases: G17.

Ожидание: module-owned old-axis padding is removed when changing direction. Наблюдение: horizontal 16/64px padding remains in vertical mode.

Основание и предел вывода: geometry-triage.md; fixture has no author padding to preserve

Повтор: `npm run audit -- --case=G17 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-024: Instant navigation не обновляет active-состояние

Статус: **reproduced**, P1. Cases: G07, G21, MEDIA-024.

Ожидание: instant scrollTo updates selected DOM identity with the public index. Наблюдение: index and geometry change while old slide keeps active class.

Основание и предел вывода: geometry-triage.md and media-triage.md; instant path omits start event used for active-state refresh

Повтор: `npm run audit -- --case=G07 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-025: Free inertia нарушает покрытие loop viewport

Статус: **reproduced**, P1. Cases: SRC-G03.

Ожидание: settled infinite loop has no large unexplained empty intervals. Наблюдение: WebKit produces leading holes hundreds of pixels wide after reverse drags.

Основание и предел вывода: geometry-triage.md; RAF inertia path differs from pointer-move coverage checks; timing affects magnitude

Повтор: `npm run audit -- --case=SRC-G03 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-026: Grid+loop destroy меняет авторский порядок

Статус: **reproduced**, P2. Cases: SRC-G06.

Ожидание: destroy restores original author node order. Наблюдение: 7 cards restored as 5,6,0,1,2,3,4.

Основание и предел вывода: geometry-triage.md; grid captures originals after loop initial reorder; N9 phase blocked

Повтор: `npm run audit -- --case=SRC-G06 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-027: AutoWidth loop не обеспечивает достаточный буфер

Статус: **reproduced**, P1. Cases: SRC-G10.

Ожидание: variable-width infinite loop with sufficient total content covers required viewport. Наблюдение: 146px empty tail despite gap12 and more than one viewport of authored content.

Основание и предел вывода: geometry-triage.md; loop buffer uses perPage1 instead of measured visible span

Повтор: `npm run audit -- --case=SRC-G10 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-028: Чужой pointer изменяет и завершает текущий drag

Статус: **reproduced**, P1. Cases: IN02.

Ожидание: only the owning pointer controls its active gesture. Наблюдение: foreign pointer moves transform -140 to -500 and its up ends the drag.

Основание и предел вывода: input-triage.md; synthetic pointer sequence plus independent second pointer-down probe

Повтор: `npm run audit -- --case=IN02 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-029: Клик выбранной переставленной миниатюры меняет main

Статус: **reproduced**, P1. Cases: SY02.

Триггер: explicit sync(), loop reorder and instant thumb navigation; click the already-selected logical thumb whose DOM index differs.

Ожидание: clicking an original thumbnail selects that original on the main slider. Наблюдение: logical thumb0 is DOM1 and click leaves main1 instead of selecting0.

Основание и предел вывода: input-triage.md; click captured logical index compares to DOM activeIndex. Ordinary thumbnail paths and SRC-L06 passing do not refute this trigger.

Повтор: `npm run audit -- --case=SY02 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-030: HTMLElement из iframe отвергается instanceof-проверкой

Статус: **reproduced**, P1. Cases: CMT11.

Ожидание: passed same-origin control retains identity and handles activation. Наблюдение: foreign button ignored and 2 replacement arrows created; direct and generated navigation work.

Основание и предел вывода: input-triage.md; parent-window instanceof guard, not options/defaults merge

Повтор: `npm run audit -- --case=CMT11 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-031: Повторное включение fade перестаёт нормализовать perPage

Статус: **reproduced**, P1. Cases: UREG-002.

Триггер: new Tvist(root,{effect:'fade',perPage:3,speed:0}); updateOptions({effect:'fade',perPage:3}).

Ожидание: Effective perPage remains 1, as on initialization and first switch to fade.. Наблюдение: Initialization normalizes perPage to 1; reapplying the same fade options leaves public options.perPage at 3..

Места для проверки: [src/modules/effects/EffectModule.ts:37](D:/projects/tvist/src/modules/effects/EffectModule.ts:37); [src/modules/effects/EffectModule.ts:63](D:/projects/tvist/src/modules/effects/EffectModule.ts:63); [src/core/runtime.ts:439](D:/projects/tvist/src/core/runtime.ts:439).

Основание и предел вывода: Direct public-options contract, corroborated by paired fresh initialization/update controls and minimized slider-unit scenario. No claim that this assertion alone establishes visual fade corruption.

Не проверенный остаток: The paired second variant that starts with slide and switches twice may be blocked by the first failing variant in the official case; separate crosscheck contains both.

Повтор: `npm run audit -- --case=UREG-002 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-032: Читающий videoEnded listener приводит к двойному переходу

Статус: **reproduced**, P1. Cases: EREG-001.

Триггер: Three HTML video slides, speed:0, video:{autoplay:false}, autoplay:{waitForVideo:true,delay:5000}; subscribe on('videoEnded', payload=>log.push(payload.index)); dispatch one controlled DOM ended to active video 0..

Ожидание: Identical single transition 0→1 with and without a read-only public subscriber.. Наблюдение: Control produces changes [1]. Read-only subscriber variant produces [1,2], realIndex 2, with one DOM ended and one public payload index 0..

Места для проверки: [src/core/EventEmitter.ts:58](D:/projects/tvist/src/core/EventEmitter.ts:58); [src/modules/autoplay/AutoplayModule.ts:465](D:/projects/tvist/src/modules/autoplay/AutoplayModule.ts:465).

Основание и предел вывода: Paired scenario validates active, ready/playing owner and single DOM event. EventEmitter iterates a live Set while autoplay re-registers its handler. Controlled media events establish event/state behavior; native decoding is tested separately.

Не проверенный остаток: Assertion follows capture of both paired outcomes; no second physical ended is required to reproduce.

Повтор: `npm run audit -- --case=EREG-001 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-033: Ended неактивного видео используется после снятия паузы

Статус: **reproduced**, P1. Cases: RISK-07-009, RISK-07-010.

Триггер: Three HTML videos; active index 0; autoplay:{waitForVideo:true,pauseOnHover:true,pauseOnFocus:true}. Hold hover+focus, send controlled ended from video 1, then release both holds..

Ожидание: Index remains 0 because active video 0 has not ended; releasing one pause reason must retain the other.. Наблюдение: After final release autoplay advances 0→1 using ended from inactive video 1. Separate no-pause/no-public-subscriber crosscheck also advances on inactive ended..

Места для проверки: [src/modules/video/VideoModule.ts:374](D:/projects/tvist/src/modules/video/VideoModule.ts:374); [src/modules/autoplay/AutoplayModule.ts:498](D:/projects/tvist/src/modules/autoplay/AutoplayModule.ts:498); [src/modules/autoplay/AutoplayModule.ts:882](D:/projects/tvist/src/modules/autoplay/AutoplayModule.ts:882).

Основание и предел вывода: Owner-specific waitForVideo contract. Positive active-owner R07-006/007 controls pass; this is distinct from manual-stop014 and subscriber-dependent032.

Не проверенный остаток: The final-release assertion fails; later case teardown still belongs to finally. Native decoder/real playback not claimed by this controlled event scenario.

Повтор: `npm run audit -- --case=RISK-07-009 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-034: Контейнерный breakpoint не включает slider обратно

Статус: **reproduced**, P1. Cases: RISK-05-009, RISK-05-010, RISK-05-011.

Триггер: enabled:true, breakpointsBase:'container', breakpoints:{600:{enabled:false,...modules}}. Root width 800→500→480→800 CSS px..

Ожидание: After measured root width returns to 800, original enabled:true is restored, as in window-based controls.. Наблюдение: isEnabled stays false for the 2 s observation after returning to 800. Controls, autoplay and lazy module variants all show the same failure..

Места для проверки: [src/core/runtime.ts:341](D:/projects/tvist/src/core/runtime.ts:341); [src/core/runtime.ts:423](D:/projects/tvist/src/core/runtime.ts:423); [src/modules/breakpoints/BreakpointsModule.ts:129](D:/projects/tvist/src/modules/breakpoints/BreakpointsModule.ts:129).

Основание и предел вывода: ResizeObserver calls update(), but update returns while disabled before modules.onResize can re-evaluate container breakpoint. Window-based matchMedia takes another path and passes. Width crossing is independently measured.

Не проверенный остаток: First roundtrip fails; second planned roundtrip and post-reenable module interactions are blocked.

Повтор: `npm run audit -- --case=RISK-05-009 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-035: Scrollbar отстаёт от реального free-drag положения

Статус: **reproduced**, P1. Cases: RISK-10-001, RISK-10-003, RISK-10-005.

Триггер: Seven cards, viewport480px, drag:'free',freeSnap:false,flickPower:0,scrollbar:true,speed:120; drag deck330px and hold300ms before release..

Ожидание: Thumb follows actual physical progress, independent of the unspecified unsnapped pagination-index policy.. Наблюдение: Deck offset330px; scrollbar track460px,thumb65.70px; expected thumb offset≈45.18px, observed0px (tolerance1.5px)..

Места для проверки: [src/modules/drag/DragModule.ts:648](D:/projects/tvist/src/modules/drag/DragModule.ts:648); [src/modules/drag/DragModule.ts:996](D:/projects/tvist/src/modules/drag/DragModule.ts:996); [src/modules/drag/DragModule.ts:1032](D:/projects/tvist/src/modules/drag/DragModule.ts:1032); [src/modules/scrollbar/ScrollbarModule.ts:181](D:/projects/tvist/src/modules/scrollbar/ScrollbarModule.ts:181).

Основание и предел вывода: Measured DOM geometry, not derived solely from internal index. Slow release avoids momentum scroll event; scrollbar listens to scroll while ordinary free movement emits drag. Distinct from resize009 and later scrollbar-active038.

Не проверенный остаток: R10 accumulates stage observations through further thumb drag, exact navigation and teardown; the first thumb error does not certify later assertions as pass. Consult RISK_INPUT_EVIDENCE and aggregate error.

Повтор: `npm run audit -- --case=RISK-10-001 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-036: Дальний scrollTo в fixedWidth loop оставляет пустую область

Статус: **reproduced**, P1. Cases: RISK-02-009, RISK-02-010.

Триггер: Nine cards, viewport600px,loop:true,fixedWidth:170,gap:12,speed:80. center:true or peek:{left:24,right:48}; ordinary scrollTo(3)..

Ожидание: Selected original3 is coherent and required loop viewport remains covered, apart from allowed gaps/peek.. Наблюдение: Order [5,6,7,8,0,1,2,3,4] leaves only card4 after selected3. Settled trailing holes are33px(center) and176px(peek). Internal gaps remain12px..

Места для проверки: [src/core/engine/Motion.ts:140](D:/projects/tvist/src/core/engine/Motion.ts:140); [src/modules/loop/LoopModule.ts:96](D:/projects/tvist/src/modules/loop/LoopModule.ts:96); [src/modules/loop/LoopModule.ts:180](D:/projects/tvist/src/modules/loop/LoopModule.ts:180).

Основание и предел вывода: Fixed widths, enough original content, ordinary animation without drag/inertia. Target index emitted by Motion is ignored by Loop beforeTransition handler when preparing buffer around source. Keep separate from inertia025 and auto-width027 until fixes prove shared cause.

Не проверенный остаток: Fails at middle coverage; later transition to8 and seam navigation remain untested in these rows.

Повтор: `npm run audit -- --case=RISK-02-009 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-037: Grid с клонами не назначает active публичной странице

Статус: **reproduced**, P1. Cases: RISK-08-002, RISK-08-005, RISK-08-008, RISK-08-011.

Триггер: Seven cards,600×300px,grid:{rows:2,cols:2},loop:{withClones:true},perPage:1,gap:12. Inspect initial public slider.slides before navigation; cols3 also reproduces..

Ожидание: Exactly one public physical grid page is active and has rendered content.. Наблюдение: Grid2×2 yields6physical pages,zero active pages; original inner card0 retains active+grid-item. Grid2×3 yields4pages with same symptom. Wide MATRIX/MODULE witnesses also include ordinary loop/locked grid configurations..

Места для проверки: [src/modules/builtins.ts:25](D:/projects/tvist/src/modules/builtins.ts:25); [src/modules/grid/GridModule.ts:194](D:/projects/tvist/src/modules/grid/GridModule.ts:194); [src/modules/grid/GridModule.ts:377](D:/projects/tvist/src/modules/grid/GridModule.ts:377); [src/modules/slide-states/SlideStatesModule.ts:230](D:/projects/tvist/src/modules/slide-states/SlideStatesModule.ts:230).

Основание и предел вывода: Initial page/card identity, independent of destroy-order026. Loop and SlideStates initialize before Grid; physical card/clone selection must map to new page wrapper. Do not infer full cause equality for all broad witnesses until fixes checked.

Не проверенный остаток: Initial active-page assertion blocks hide/return, later navigation and destroy in R08 clone variants. Fractional-grid support is not inferred.

Повтор: `npm run audit -- --case=RISK-08-002 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-038: Drag scrollbar оставляет устаревший active-класс

Статус: **reproduced**, P1. Cases: RISK-10-001, RISK-10-003, RISK-10-005, RISK-10-007, RISK-10-009, RISK-10-011.

Триггер: Seven cards,viewport480px,drag:'free',scrollbar:true; drag deck, then native mouse drag thumb180px. freeSnap true and false both reproduce..

Ожидание: At settled snapped position selected physical card, realIndex and active class agree.. Наблюдение: After thumb drag physical offset1440px and nearest=realIndex=3, active DOM identity remains stale. Later ordinary navigation to5 can restore coherence..

Места для проверки: [src/modules/scrollbar/ScrollbarModule.ts:381](D:/projects/tvist/src/modules/scrollbar/ScrollbarModule.ts:381); [src/modules/scrollbar/ScrollbarModule.ts:420](D:/projects/tvist/src/modules/scrollbar/ScrollbarModule.ts:420); [src/modules/slide-states/SlideStatesModule.ts:80](D:/projects/tvist/src/modules/slide-states/SlideStatesModule.ts:80); [src/core/engine/Motion.ts:71](D:/projects/tvist/src/core/engine/Motion.ts:71).

Основание и предел вывода: R10 records each stage, including second active-identity errors in raw rows whose first assertion is thumb-position035. Scrollbar writes engine index during drag, then requests ordinary scrollTo of same index; slideChangeStart does not fire. Distinct trigger from instant-navigation024.

Не проверенный остаток: Aggregate R10 errors explicitly include after-scrollbar-drag; exact-navigation and cleanup are executed afterward. No blanket expected failure is applied.

Повтор: `npm run audit -- --case=RISK-10-001 --project=all --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-039: WebKit: смена эффектов создаёт ResizeObserver loop error

Статус: **reproduced**, P2. Cases: G22.

Триггер: Five cards,720×360px,perPage:1,speed:0. updateOptions effect fade→cube→slide; scrollTo(2) after each switch..

Ожидание: Effect roundtrip preserves geometry, cleans effect styles and does not produce unexpected browser errors.. Наблюдение: All final geometry/active/effect-style cleanup assertions finish, then raw runner rejects pageerror:ResizeObserver loop completed with undelivered notifications. Observed3/3 on WebKit, Chromium/Firefox controls pass..

Места для проверки: [src/core/runtime.ts:341](D:/projects/tvist/src/core/runtime.ts:341); [src/core/runtime.ts:354](D:/projects/tvist/src/core/runtime.ts:354); [src/modules/effects/EffectModule.ts:98](D:/projects/tvist/src/modules/effects/EffectModule.ts:98); [src/modules/effects/EffectModule.ts:121](D:/projects/tvist/src/modules/effects/EffectModule.ts:121).

Основание и предел вывода: Separate browser-reported observer-delivery failure as required by audit contract. Code observes track and updates layout synchronously through leading throttle; cube toggles observed-track padding/boxSizing. Exact callback/source cause needs trace; no claim of infinite loop, visible corruption, or a native Safari reproduction.

Не проверенный остаток: No functional-case assertion remains after the return; unexpected pageerror is checked separately by runner. Precise time of browser observer error is not stored in original error artifact.

Повтор: `npm run audit -- --case=G22 --project=webkit --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).

### TVIST-AUDIT-040: WebKit: resize во время cube убирает отрисованные грани

Статус: **reproduced**, P1. Cases: RISK-06-012, RISK-06-015.

Триггер: Five button cards,480×300px,effect:'cube',perPage:1,speed:1200,gap:0,cubeEffect:{slideShadows:true,perspective:900}; next(); observe actual intermediate transform/shadow phase; resize root/track to360×240,update(). Both horizontal and vertical configurations reproduce..

Ожидание: At each enabled sampled frame, cube has a rendered and interactive face covering viewport center after resize/interruption.. Наблюдение: WebKit has positive360×240 viewport and activecard1, but all five physical slide DOMRects have width0 after update. All12postresize RAF observations hit track rather than a face or button; elementsFromPoint contains no slide. Captured screenshot is blank. Initial and pre-resize samples hit card0 correctly..

Места для проверки: [src/modules/effects/cube.ts:36](D:/projects/tvist/src/modules/effects/cube.ts:36); [src/modules/effects/cube.ts:84](D:/projects/tvist/src/modules/effects/cube.ts:84); [src/styles/modules/_cube.scss:15](D:/projects/tvist/src/styles/modules/_cube.scss:15); [src/styles/core/_base.scss:62](D:/projects/tvist/src/styles/core/_base.scss:62).

Основание и предел вывода: Confirmed DOM geometry and blank screenshot, not merely a restrictive hit-test expectation. Cube transforms/3D composition under WebKit after update require investigation; exact source cause is not established and no library fix was tried. C/F controls pass. Desktop and mobile are browser emulation of WebKit26.5 on Windows, not physical Safari/iPhone.

Не проверенный остаток: Fails after measured intermediate phase and twelve post-interruption RAF samples, before stable final-selection and subsequent navigation/cleanup assertions. This establishes a165–182ms observed blank span in focused reruns; no claim that it stays blank indefinitely.

Повтор: `npm run audit -- --case=RISK-06-012 --project=webkit --repeat=3`. Детальные options, observations и пути к доказательствам — в записи [findings.json](D:/projects/tvist/docs/audit/findings.json).
