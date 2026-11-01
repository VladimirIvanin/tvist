# Аудит Tvist

Проверки используют публичный API свежей минифицированной сборки. Production-код не исправляется. Красный raw-прогон является результатом аудита; реестр известных дефектов не заполняется автоматически.

## Запуск

```sh
npm run audit:typecheck
npm run audit:lint
npm run audit:unit
npm run audit:unit:deep
npm run audit:unit:slider
npm run audit:catalogue -- --check --self-test
npm run audit:e2e
npm run audit:heap
npm run audit:package
npm run audit:docs
npm run audit -- --profile=smoke
npm run audit -- --profile=matrix
npm run audit -- --profile=deep
npm run audit -- --profile=soak
npm run audit -- --profile=performance
npm run audit -- --case=G01 --project=webkit
npm run audit -- --manual=G01 --project=chromium
npm run audit -- --profile=matrix --risk-only=true
npm run audit:report
npm run audit:report -- --all
npm run audit:gate
```

У raw-команд ненулевой exit code при обнаружении нарушения. `audit:gate` сравнивает реальные результаты с вручную проверенным `known-failures.json`: совпадение требует case ID, движок и fingerprint. Unit-нарушения классифицируются отдельно по `known-unit-failures.json`, без изменения raw JSON. Неожиданное падение и неожиданное прохождение известного дефекта требуют разбора. Реестр не заменяет raw-отчёт.

Каждый запуск создаёт `.tmp/audit/<timestamp-profile-project-uuid>/`: изолированный snapshot, build.log, manifest с hash JS/CSS/harness, версии браузеров, cases, results, screenshots и trace. Повторы имеют отдельные trial и файлы. До выполнения сохраняется `execution-plan.json`; перед `complete.json` и в gate проверяются недостающие, лишние и дублированные trials. `audit:report` сохраняет сводку последнего запуска. `--all` подключает исторический журнал. Отсутствующие профили не считаются выполненными.

Полный `audit:unit` запускается через wrapper без фильтров и связывает raw JSON, terminal log, весь inventory тестов и hashes исходников. Изменение кода после unit-прогона делает evidence устаревшим. Узкие Vitest-прогоны сохраняйте с другим `--outputFile`.

Матрица хранит конечные домены, строки и знаменатель пар/троек. Независимый verifier проверяет наличие свидетеля для каждого требования. Нормализация fade/cube к perPage=1 учитывается явно. Остальные падения не исключаются из домена.

Исследовательские файлы `*.audit.ts` запускаются отдельно от исходного Vitest-набора, без factory-probes. Browser-кейсы находятся в geometry/input/media. Синтетические media/pointer события в названиях и описаниях не подтверждают нативный мобильный scroll или playback.

## Границы заключения

Доступны Chromium/Firefox/WebKit на Windows и мобильная эмуляция. Реальные устройства, screen reader assessment и Safari compositor не входят в охват. FPS/heap относятся к измеренной среде. `keyboard`, неиспользуемые effect-параметры и спорные комбинации фиксируются как capability/contract gaps, не реализуются в ходе аудита.

`--manual=ID` открывает выбранный case в видимом браузере через существующий `sandbox/index.html?case=ID` на собственном audit-сервере и оставляет состояние для инспекции. Завершение — закрыть браузер или Ctrl+C. Дополнительные sandbox HTML не создаются.

## Объём и результаты

- 263 зарегистрированных browser cases: 130 адресных и 133 новых кортежа обязательных троек. Default smoke исключает RISK-кортежи, выполняет адресные cases в трёх движках и 10 фиксированных последовательностей до 20 команд для каждого из шести семейств в Chromium.
- Геометрическая матрица: 192 строки, 1917 допустимых пар/троек. Модули: 27 строк, 405 требований. Дополнительно 24 boundary cases.
- Десять обязательных риск-семейств имеют 325 конечных кортежей: 192 свидетеля R01 в основной матрице и 133 новых R02–R10. Отдельный verifier проверяет полный продукт каждого заявленного домена. Для mobile выбраны 36 новых CSS/синтетических input-кортежей и три native-input case на профиль. `--risk-only=true` является частичным запуском дополнительных троек; R01 в нём не выполняется.
- `catalogue.json` содержит typed metadata и AST-привязки к настоящим factories, опциям, fixtures, callbacks, actions и assertions. Вычисляемые выражения и циклы явно `partial`, а configured browser не означает подтверждённую поддержку.
- Карта контрактов: 53 options, 16 builtins, 36 public members, 35 events, 27 methods controls. `mapped` означает конкретную частичную проверку, а не доказательство всех сочетаний; `uncovered` остаётся видимым.
- `findings.json` — вручную рассмотренные группы дефектов; `findings.md` — дополнительные факты и история исключённых ложных предположений; `RESULTS.md` — журнал фактических запусков.
- `package-results.json` и `docs-results.json` — независимые проверки опубликованного состава и 29 демонстраций. Внешние fonts/images заменяются локальными fixtures; ограничения перечислены в результатах.
- Классические тесты не изменялись: новые failures относятся к исходной версии библиотеки или к явно записанным инфраструктурным ограничениям.

## Повтор и минимизация

```sh
npm run audit -- --case=EV01 --project=webkit --repeat=3
npm run audit -- --prefix=CMT --repeat=3
npm run audit -- --case=G15 --project=chromium --dpr=1.25
npm run audit -- --profile=deep --project=firefox --family=1
npm run audit -- --profile=deep --resume=.tmp/audit/RUN
node --import tsx scripts/audit-shrink.ts --run=.tmp/audit/DEEP-RUN
npm run audit -- --replay=.tmp/audit/DEEP-RUN/minimized/CASE/minimal.json
```

Shrinking использует конкретные сохранённые команды, сохраняет исходную ошибку, принимает только тот же oracle и проверяет минимальный случай в трёх независимых браузерах. Реестр минимальных воспроизведений — `minimal-repros.json`. Запускайте минимизацию разных кампаний последовательно. В resume допускается только совпадающий build hash; сохранённые результаты остаются в исходном журнале.

Длительные motion-soak сценарии работают в отдельных страницах одновременно, каждый не менее 10 минут. Ресурсные проверки 1/10/50 экземпляров выполняют по 100 lifecycle cycles. Performance запускается отдельно от стрессовых кампаний; raw RAF-измерения включают собственную стоимость чтения transform.

Исторические interrupted/superseded прогоны сохраняются как доказательства развития стенда, не входят в утверждение о завершённом покрытии. Падения ожиданий не равны числу независимых багов. Поставляемые traces и HTML располагаются в `.tmp/audit`, поэтому для передачи вне рабочей машины сохраняйте соответствующую директорию целиком.

Матрица включает grid×effects и waitForVideo без VideoModule как исследуемые сочетания; они не исключаются лишь из-за неизвестной семантики. Остаются только документированные ограничения дробной grid и нормализация effects к perPage=1.

Для native smoke автоматически создаётся локальный WebM; генерация без загрузок: `npm run audit:fixture`. WebKit Windows отклоняет используемый VP9 в независимом decoder preflight до Tvist; это `unsupported`, а не баг VideoModule. Chromium CDP touch и browser wheel в NINPUT отличаются от synthetic pointer/touch и не означают проверку реального телефона. GC probe: 5 warmup batches, затем 5×100 lifecycle cycles; файл heap-results.json.

Полная deep-кампания состоит из `audit:unit:deep` (core utilities), `audit:unit:slider` (шесть public slider models) и browser `audit -- --profile=deep`. Slider unit driver использует отдельные процессы не более чем по 100 seeds, сохраняет каждый JSONL и минимизирует по одному первому примеру на family/oracle. Повтор конкретного unit-минимума: `npm run audit:unit:slider -- --replay=<minimal.json>`. Native rendering/media и жесты моделями happy-dom не подтверждаются.
