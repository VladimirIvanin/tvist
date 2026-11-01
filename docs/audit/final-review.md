# Независимое финальное ревью доказательств аудита

Срез: 1 ноября 2026. Проверена Tvist 1.20.1, production commit `dea54d579239cd29224303c90646f00b577ec41c`. JS SHA-256: `63f82928b9db2be2374e2824c62021aa8b7558d02658b8a2b8f87a421c234550`; CSS SHA-256: `ffbc0e34077c94370133145d71e0d48026f142d0adf4c25339b7a44ff2d9b51e`.

Это независимое чтение исходников стенда, execution plans, raw JSON и артефактов. Ревьюер не менял библиотеку и не запускал дополнительные браузеры. Проверки завершены с воспроизводимыми нарушениями, вопросами контракта и явно ограниченным покрытием. Зелёное исходное состояние не является заключением о надёжности.

## Полнота финальных кампаний

| Кампания | Итоговый каталог в локальной `.tmp/audit/` | Наблюдения | Raw pass / reproduced / contract-gap / unsupported / harness |
|---|---|---:|---|
| Smoke | `2026-11-01T07-10-45-885Z-smoke-all-6aebdbf8` | 1230 / 1230 | 740 / 415 / 54 / 12 / 9 |
| Matrix | `2026-11-01T07-10-46-231Z-matrix-all-f6ee692f` | 1264 / 1264 | 946 / 271 / 45 / 2 / 0 |
| Browser deep | `2026-11-01T07-10-46-269Z-deep-all-bf7210aa` | 900 / 900 | 300 / 600 / 0 / 0 / 0 |
| R03 после исправления очистки fixture | `2026-10-31T22-24-43-947Z-smoke-all-aec8de17` | 72 / 72 | 36 / 36 / 0 / 0 / 0 |

У всех четырёх каталогов есть `complete.json`. Независимо сопоставлены все ключи case/project/trial с execution plan: нет пропусков, лишних строк или дубликатов. Все ссылки raw rows на metrics, traces и failure JSON/PNG существуют, включая ссылки на каталоги до resume. Это проверка наличия артефактов, не доказательство содержательности каждого metrics-файла: некоторые содержат только trial.

Локальный машиночитаемый результат сверки с SHA-256 manifest/plan/results/complete — `.tmp/audit/final-independent-evidence.json`; воспроизводящий read-only скрипт — `.tmp/audit/verify-final-evidence.cjs`. Эти файлы и тяжёлые raw артефакты остаются вне Git. Для переноса evidence нужны исходные каталоги и их resume-предки; копирование только последнего каталога теряет часть файлов.

Raw числа нельзя читать как количество дефектов. Например, две унаследованные Chromium R03 строки полной матрицы — ошибки teardown стенда, а не продукта. В композитной сводке их заменяет отдельный R03 повтор: matrix становится 948 pass / 269 reproduced / 45 contract-gap / 2 unsupported. Raw JSON не переписывается.

Пять shutdown rows прежних прерванных каталогов (matrix RISK-04-000 WebKit-mobile и deep DEEP-1-13…16 WebKit) исключены из resume-input, сохранены исторически и повторены. В итоговых четырёх каталогах нет `Target page, context or browser has been closed`.

## Действительно выполненные команды

Smoke включает 130 фиксированных кейсов × 3 движка × 3 повтора и 60 Chromium последовательностей: шесть семейств × 10 seeds, максимум 20 команд. Из 1200 запланированных последовательных команд попытались выполнить 701, проверили 664; 499 команд хвоста заблокированы. Последовательности дали 23 pass / 37 first failures. Это не 1200 успешно проверенных действий.

Browser deep содержит шесть семейств × 50 seeds × 3 движка, максимум 50 команд. Из 45000 запланированных команд попытались выполнить **19071**, проверили **18471**, хвост **25929** заблокирован. Для всех 900 строк длина сохранённой history совпадает с pass.commands либо failure.step+1. Первый failure не подтверждает оставшуюся часть последовательности.

| Browser family | Seeds во всех движках | Pass | Связанные нарушения | Ошибки oracle fixture | Проверено команд / заблокировано |
|---|---:|---:|---:|---:|---|
| Loop/navigation | 150 | 0 | 150 | 0 | 1071 / 6279 |
| Gestures/controls | 150 | 150 | 0 | 0 | 7500 / 0 |
| Sync/nesting | 150 | 0 | 150 | 0 | 615 / 6735 |
| Breakpoints/layout | 150 | 0 | 150 | 0 | 1242 / 6108 |
| Media/visibility | 150 | 150 | 0 | 0 | 7500 / 0 |
| Grid/lifecycle | 150 | 0 | 132 | 18 | 543 / 6807 |

Итого human triage: 300 pass / 582 связанных product failures / 18 harness issues при raw 300/600. Последние 18 — столкновение `data-case-id`, создаваемое append fixture из текущего количества подключённых узлов после hide/rebuild. Это не доказанное дублирование original nodes библиотекой. Raw сохраняется. Для этих oracle хвост остаётся непроверенным; не заявляется, что все требования исходного плана закрыты.

Loop/sync/breakpoint первые failures в основном блокирует instant navigation active-state; это не 450 самостоятельных ошибок этих модулей. Media family проверяет общие инварианты, не полную модель причин паузы. Grid family не содержит fade/cube, которые проверены отдельно. Поштучная карта `.tmp/audit/handoff-deep-mapping.json` проверена: её 600 failure artifact paths существуют и сохраняют исходные директории унаследованных observations.

Отдельные unit кампании: утилитарные 3000 sequences / 233055 commands прошли; модели реального слайдера — 3000 seeds, 2386 pass, 614 model failures, 0 harness errors, 312737 verified commands и 64181 blocked tail. Все 614 первых model failures классифицированы по триггеру: 122 dynamic-loop navigation, 250 manual-stop, 242 effect/perPage normalization. Минимумы проверены браузерными paired cases. Happy-dom, управляемые часы и mocked geometry не доказывают нативный ввод или отрисовку.

## Матрица и независимые проверки результата

У всех десяти обязательных семейств есть конечный знаменатель: 325 tuples, включая 192 loop/count/group. Все 325 вызваны в каждом desktop engine. Декларации проверяются независимым перечислителем. Для mobile выполняется объявленный subset; 325 не его знаменатель.

После R03 supersession completedPass по каждому desktop engine: R01 142/192, R02 16/24, R03 4/8, R04 21/27, R05 9/12, R07 6/12, R08 8/12, R09 8/8, R10 3/12. R06 Chromium/Firefox 18/18, WebKit 16/18. Invocation означает начало кейса; failed/gap/unsupported не означают завершение всех его действий. Геометрическая и межмодульная pairwise/triple декларации имеют 1917 и 405 требований; это заявленные конечные уровни, не все настройки вещественного пространства.

Oracles используют интервалы DOMRect, identity оригинальных карточек, фактический transform и controls. Внешние min/max не заменяют поиск внутренней дыры. Учитываются авторские gap/peek, конечная auto-size граница и original-span без инфляции клонами. Есть controls на намеренно испорченные fixtures: внутренние дыры, потерянный original, неверный active, лишний listener и незавершённое движение. Gate/integrity controls проверяют повреждённые данные, пропуски/дубликаты и несовместимый resume. Они подтверждают чувствительность конкретных проверок, а не отсутствие всех blind spots.

## Изоляция часов и подтверждение новых WebKit путей

`Page.clock` принадлежит BrowserContext. Локальные controls Chromium/WebKit доказали, что новый page прежнего context наследует fake Date; новый context имеет настоящие часы и работающий RAF. Финальные кампании используют **отдельный BrowserContext для каждого observation/trial/sequence** и preflight Date.isFake. Исторические shared-context результаты clock-sensitive ветвей не используются как финальное доказательство.

Дополнительная focused диагностика `.tmp/audit/r06-diagnostic/results.json` имеет 78 уникальных case/project/trial, все JSON/HTML/PNG сохранены. Проверяется тот же JS hash и official runners из сохранённого matrix snapshot. Она даёт:

- Пять risk минимумов RISK-02-009/05-009/07-009/08-002/10-001: 45/45 подтверждений, по 3 повтора в каждом движке; второе scrollbar active-stage нарушение также записано во всех девяти R10-001.
- G22 fade→cube→slide: Chromium/Firefox 6 pass; WebKit 3/3 неожиданных `ResizeObserver loop completed with undelivered notifications` после завершения функциональных assertions. Это finding 039, без утверждения о бесконечном цикле.
- Cube+resize RISK-06-012/015: Chromium/Firefox 12 pass; WebKit desktop/mobile 12/12 failures. До resize center попадает в кнопку; после resize viewport положительный, но все пять face DOMRect имеют width0, hit stack содержит track и не содержит граней. Наблюдён пустой span 165–182ms. Это finding 040; бесконечная пустота и физический Safari не утверждаются.

В исходном R06 frame-массив не сохранялся. Focused диагностика устраняет этот evidence gap для двух найденных случаев; она не создаёт измерения задним числом для всех исходных R06.

## Soak, производительность, ресурсы

21/21 исторических soak observations: на каждом движке 100 lifecycle cycles с 1/10/50 одновременно созданными экземплярами (6100 init/destroy на движок) и четыре десятиминутных motion режима. Исходники snapshots не вызывают clock.install в soak; проблема наследования часов к этим runs неприменима. Все 12 motion metrics содержат elapsed 600004–601492ms и наблюдённое движение.

Ограничения: старые soak не имеют execution-plan.json/browserVersions и сохранённых per-cycle resource samples для lifecycle части; там есть pass rows, commands и snapshot assertions. Режимы работают параллельно, geometry sampling добавляет нагрузку и не исключает кратковременные проблемы между samples. Эти данные нельзя называть latest strict-integrity campaign либо полным доказательством отсутствия утечек.

Performance `2026-10-31T21-54-54-421Z-performance-all-c02b98f9`: complete 75/75, execution plan и версии движков сохранены, по пять повторов пяти нагрузок на движок. Реальные transitions подтверждены movedFrames и finalIndex для путей с публичным scroll subscriber и без него. Fake clocks не используются. Init/update/destroy — synchronous bulk timing; создание fixture вне init, style/DOM mutation counts только primary root, peers в основном вне viewport. Frame timing включает instrumentation. Среднее фазовых p95 не является pooled percentile; отсутствие Long Tasks API не означает нулевое число long tasks. Универсальное >60FPS не доказано.

Chromium heap experiment: 5 warmup + 5 measured batches × 100 lifecycle cycles, 0 retained roots, стабильные 11 DOM nodes / 16 JS listeners. Это ограниченное наблюдение в указанной среде. Heap size без retaining path не подтверждает отсутствие любой утечки Tvist.

## Каталог источников, API и пределы заключения

[Источники](research.md) классифицируют 44 issue: 16 mapped / 24 partial / 4 contract-gap; 24 выбранных коммита: 17 mapped / 6 partial / 1 contract-gap. Чужие suites не запускались, количество файлов доноров не является покрытием. SW02/Swiper7964 остаётся частичным: процентная высота исходного триггера не адаптирована. SHA/parent/mechanism/upstreamTest каталогизированы; систематическое чтение всех follow-up/revert и точные read-hunks по каждому коммиту в финальном каталоге не доказаны.

Карта API имеет 53 опции, 16 builtins, 36 public members, 35 events и 27 control methods. Mapped означает частичные named assertions. В исходном curated map были uncovered 13 опций/6 public members/28 events/15 control methods и 2 contract-gap options; некоторые новые risk cases появились позднее карты, например freeSnap/flickPower. Поэтому эти числа описывают отсутствие связи в карте, а не гарантированное отсутствие любого executable coverage. Полная верификация всех публичных контрактов исходного плана не заявляется.

20 legacy test candidates разобраны: 6 meaningful helper assertions, 11 assertionless diagnostics, 2 TODO, 1 skipped timing placeholder. Исходный полный baseline после перепроверки: 1212 pass / 1 skip; полный legacy browser E2E 102/102. Coverage не равно силе assertions: recursive core lines90.94 / branches90.83 / functions83.71; Layout functions73.33 и отдельные modules lines<80 остаются видимыми. Factory probes и mocks baseline ограничивают выводы.

Свежий smoke содержит **9 WebKit native-media preflight timeouts** до создания Tvist: canPlayType=probably, readyState0, без media error/play rejection. Это fixture/environment harness limitation, не product finding и не доказанный unsupported codec. Старый isolated NotSupportedError не меняет причину этих девяти наблюдений. Chromium CDP touch и synthetic Firefox/WebKit input учитываются отдельно. Мобильная эмуляция не равна устройствам; настоящие iPhone/Android/Safari и screen readers не проверены. Axe не подтверждает полную доступность.

Демонстрации: 87 визитов (29×3), 84 pass / 3 locked limitations и отдельные cleanup records. Пакет: 17 pass / 4 type failures с двумя первопричинами / 2 unsupported. Это не 23 разных дефекта.

Реестр содержит 40 записей: 39 воспроизводимых групп и одну неясность click index-space; дополнительные contract questions отделены. Fingerprint gate сопоставляет устойчивую сигнатуру, но не доказывает неизменность причины. Raw results остаются красными при нарушении, известное первое падение не проверяет хвост. Объяснённые harness failures и blocked native layer сохранены, а не превращены в pass.

## Передача

Пользователь выбрал ветку `audit` и разрешил сохранять в ней curated отчёты. Тяжёлые `.tmp/audit` artifacts остаются локальными. Production-код, release artifacts и `main` не изменялись. Audit workflow отсутствует; README не содержит описаний audit commands. Ветка не добавляет автоматические запуски аудита в CI.

Предыдущая версия этого ревью с историческими цифрами архивирована локально как `.tmp/audit/final-review-historical.md`. Настоящий файл заменяет её выводы о финальных cohort counts, BrowserContext isolation, CI и ветке хранения. Итоговый реестр и отчёт передают воспроизводимые проблемы для последующих исправлений; они не объявляют библиотеку исправленной или все пункты исходного охвата полностью проверенными.
