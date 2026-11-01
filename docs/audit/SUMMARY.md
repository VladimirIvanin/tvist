# Итог аудита Tvist

Канонический отчёт для исправлений: [REPORT_FOR_FIXES.md](REPORT_FOR_FIXES.md). Проверена1.20.1, commit dea54d579239cd29224303c90646f00b577ec41c; production не менялся. Ветка audit, без audit CI и изменений main.

39 воспроизводимых групп +1contract-gap в40записях findings.json. Завершены smoke1230/1230, matrix1264/1264, browserdeep900/900, два unitdeep по3000seeds, performance75/75 и адресный повтор78/78. Это не число независимых багов и не полностью зелёный аудит.

Все статусы, фактически исполненные команды, blocked tails, ограничения WebKit media/контрактов/soak и независимое ревью перечислены в основном отчёте. Raw traces и snapshots локальны в .tmp/audit; ссылки родительских resumed запусков нужно сохранять.
