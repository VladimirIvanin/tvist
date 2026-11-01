# Измерения производительности

Separate idle campaign after fixture warmup; synchronous bulk API-call timings, not paint completion. 5 repeats per engine/count/instance configuration. Frame p95 here averages 10 per-phase p95 values, not a pooled percentile. Root MutationObserver and computed-style RAF sampling add overhead; extra peers can be offscreen, all receive movement. No universal FPS or heap guarantee.

Среда: 11th Gen Intel(R) Core(TM) i7-11700K @ 3.60GHz; 16 logical CPUs; Windows 10.0.19045; Node v22.23.1. Bundle 63f82928b9db2be2374e2824c62021aa8b7558d02658b8a2b8f87a421c234550.

В таблице средние времена пяти повторов, миллисекунды. Для нескольких экземпляров это время всей группы. Последняя колонка усредняет p95 десяти наблюдаемых фаз движения и включает стоимость измерителя.

| Engine | Slides/instance | Instances | Init ms | Update ms | Destroy ms | Mean phase p95 ms |
|---|---:|---:|---:|---:|---:|---:|
| chromium | 10 | 1 | 0.78 | 0.42 | 0.12 | 16.73 |
| chromium | 100 | 1 | 2.30 | 0.90 | 0.14 | 16.73 |
| chromium | 1000 | 1 | 16.98 | 9.06 | 0.42 | 16.74 |
| chromium | 100 | 10 | 23.24 | 11.88 | 0.88 | 16.72 |
| chromium | 100 | 50 | 119.04 | 44.02 | 2.22 | 16.72 |
| firefox | 10 | 1 | 2.00 | 1.00 | 0.00 | 16.68 |
| firefox | 100 | 1 | 2.60 | 2.20 | 0.20 | 16.68 |
| firefox | 1000 | 1 | 19.40 | 9.80 | 0.60 | 16.68 |
| firefox | 100 | 10 | 37.40 | 18.80 | 1.40 | 16.68 |
| firefox | 100 | 50 | 165.20 | 89.20 | 4.40 | 16.68 |
| webkit | 10 | 1 | 1.80 | 0.80 | 0.20 | 16.90 |
| webkit | 100 | 1 | 4.80 | 2.00 | 0.00 | 17.20 |
| webkit | 1000 | 1 | 27.00 | 11.00 | 0.40 | 17.70 |
| webkit | 100 | 10 | 56.40 | 27.40 | 1.00 | 17.60 |
| webkit | 100 | 50 | 255.40 | 140.40 | 5.20 | 31.10 |

75/75 измерительных сценариев завершились. Это означает, что движение и заявленные измерения действительно выполнены; норматив 60 FPS этим не подтверждён. Полные frames/positions, long tasks, DOM/style writes и разделение subscribed/unsubscribed находятся по rawMetrics в [JSON](performance-results.json). Чистота ресурсов и collectability проверяются отдельно в soak/heap, а не выводятся из этих времён.
