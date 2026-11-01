# Выбранные результаты аудита

Финальный отчёт: [REPORT_FOR_FIXES.md](REPORT_FOR_FIXES.md). Машинная сводка: [authoritative-results.json](authoritative-results.json).

| Кампания | Фактически / план | Raw-статусы |
|---|---:|---|
| smoke | 1230/1230 | reproduced: 415; contract-gap: 54; pass: 740; unsupported: 12; test-harness-issue: 9 |
| matrix | 1264/1264 | pass: 946; reproduced: 271; contract-gap: 45; unsupported: 2 |
| deep | 900/900 | reproduced: 600; pass: 300 |
| R03 | 72/72 | pass: 36; reproduced: 36 |
| performance | 75/75 | pass: 75 |

Исторический общий журнал находится локально в .tmp/audit/RESULTS-historical.md и не используется для суммирования финального покрытия.
