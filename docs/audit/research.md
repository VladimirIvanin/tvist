# Источники аудита Tvist

Исследование от 31 октября 2026. Репорты чужих библиотек используются как источники воспроизводимых сценариев. Они не подтверждают баг Tvist; закрытый issue также не гарантирует исправление исходной проблемы. Машинный реестр: [sources.json](../../tests/audit/sources.json); исследования исправляющих diff хранятся отдельно в [commits.json](commits.json).

## Проверенный корпус

- [Splidejs/splide @ d7e1f08](https://github.com/Splidejs/splide/tree/d7e1f08e6b4f4b02a7c6ccbfbeb2d569d85715e6): 102 test/spec; Jest + jsdom. Переносимые подходы: Controller loop, Layout axis variants, Sync event counts, LazyLoad positive and negative assertions, Elements attribute restoration.
- [davidjerleke/embla-carousel @ 0423b61](https://github.com/davidjerleke/embla-carousel/tree/0423b61463dd6f095d7aca810a49bbf194d6c291): 41 test/spec; 37 core, 3 SSR, 1 reactive-utils; Jest + jsdom. Переносимые подходы: 37 measured geometry fixtures, Loop threshold ±0.01px, Content overflow boundaries, Resize batching and teardown, Reinitialization after changed content.
- [naver/egjs-flicking @ 357f14a](https://github.com/naver/egjs-flicking/tree/357f14a5cd8270eaf58f4e785e53a4b77df3a984): 82 slider specs; 23 unit, 7 plugins, 5 cross-framework, 47 E2E; Vitest browser + Playwright Chromium. Переносимые подходы: Interrupted animation, Click suppression, Nested gestures, Sync, Fractional geometry, Late image loading.
- [glidejs/glide @ 5a153fc](https://github.com/glidejs/glide/tree/5a153fce1ea78c0f79d144bfc2afa9021c0fb15e): 16 test files; Jest + jsdom. Переносимые подходы: Clone buffer boundaries, Update options, Destroy cleanup, Event frequency.
- [akiran/react-slick @ 9744231](https://github.com/akiran/react-slick/tree/97442318e9a442bd4a84eb25133ef62087f98232): 19 16 Jest + 3 Playwright CT; Jest + jsdom; Playwright Chromium. Переносимые подходы: count equals perPage, One-slide disabled state, Nonzero initial index, Vertical height, Breakpoint round trips.
- [metafizzy/flickity @ a64cc33](https://github.com/metafizzy/flickity/tree/a64cc33052150417bb84c724b937097308519d6e): 24 browser QUnit files; Manual browser runner; observed CI only lints. Переносимые подходы: Empty→append→destroy→reinit, Loop after content growth, Resize preserves selected card.
- [nolimits4web/swiper @ 82cb393](https://github.com/nolimits4web/swiper/tree/82cb393aaf3793c92bd31ae23006215c813ab984): 9 7 runtime test.mjs + 2 test-d.ts; separate consumer-types runner; node:test/happy-dom/type fixtures. Переносимые подходы: Few-slide loop table, Hidden grid update, Cross-realm options, Dist contract, Consumer type resolution.

Количество файлов не означает coverage или число успешно исполненных проверок: чужие suites здесь не запускались. Актуальный egjs-flicking существенно новее локального work/reference-plugins/egjs-flicking-master; для адаптации используется указанный upstream SHA. Некоторые E2E доноров проверяют только существование элементов или index >= 0: в Tvist нужны более сильные проверки движения, геометрии и изоляции родителя.

## Каталог 44 внешних сценариев

| ID | Источник | Риск | Адаптация к Tvist |
|---|---|---|---|
| S01 | [Splidejs/splide #1384](https://github.com/Splidejs/splide/issues/1384) | autoWidth/breakpoint leaves inline widths | autoWidth true → false/perPage 1 → true, repeat resize |
| S02 | [Splidejs/splide #1193](https://github.com/Splidejs/splide/issues/1193) | Updating finite slider to loop | fixedWidth + gap + updateOptions loop, navigate across seams |
| S03 | [Splidejs/splide #1362](https://github.com/Splidejs/splide/issues/1362) | Few slides with loop and autoplay | N near perPage, lock/unlock through breakpoints |
| S04 | [Splidejs/splide #1208](https://github.com/Splidejs/splide/issues/1208) | Two-slide loop and long drag | N=2, short flick vs long multi-viewport drag |
| S05 | [Splidejs/splide #851](https://github.com/Splidejs/splide/issues/851) | Free snap with fixedWidth | drag free + freeSnap + fixedWidth, incomplete last viewport |
| S06 | [Splidejs/splide #810](https://github.com/Splidejs/splide/issues/810) | Free drag desynchronizes pagination | drag beyond finite boundaries; verify index, geometry and controls |
| S07 | [Splidejs/splide #1268](https://github.com/Splidejs/splide/issues/1268) | Sync after breakpoint destruction | disable thumbs at breakpoint, navigate main, re-enable thumbs |
| S08 | [Splidejs/splide #649](https://github.com/Splidejs/splide/issues/649) | Rapid thumbnail clicks | multiple clicks within one transition; check accepted navigation |
| S09 | [Splidejs/splide #561](https://github.com/Splidejs/splide/issues/561) | Nested sliders in loop clones | outer loop, inner slider, both initialization orders |
| S10 | [Splidejs/splide #1260](https://github.com/Splidejs/splide/issues/1260) | Checkboxes and duplicate clone IDs | label/for and controls through explicit and fallback clones |
| S11 | [Splidejs/splide #1365](https://github.com/Splidejs/splide/issues/1365) | Touch blocks document scrolling | horizontal swipe then vertical page scroll, cancel and edge gestures |
| S12 | [Splidejs/splide #1364](https://github.com/Splidejs/splide/issues/1364) | Dynamic peek at end boundary | change peek on final slide and resize |
| S13 | [Splidejs/splide #1125](https://github.com/Splidejs/splide/issues/1125) | Subpixel translation | fractional dimensions, roundLengths and DPR |
| S14 | [Splidejs/splide #575](https://github.com/Splidejs/splide/issues/575) | Hidden vertical initialization | display none at init, show, resize, disable/enable |
| S15 | [Splidejs/splide #461](https://github.com/Splidejs/splide/issues/461) | Fade/lazy and dynamic slides | fade + lazy + update after DOM changes |
| S16 | [Splidejs/splide #527](https://github.com/Splidejs/splide/issues/527) | Lazy loading during free drag | stop between snaps; load genuinely visible images |
| S17 | [Splidejs/splide #117](https://github.com/Splidejs/splide/issues/117) | Autoplay focus and interaction pauses | overlapping pause reasons and manual stop |
| S18 | [Splidejs/splide #1307](https://github.com/Splidejs/splide/issues/1307) | Destroy leaves tabindex | disable and destroy preserve author focus settings |
| S19 | [Splidejs/splide #1185](https://github.com/Splidejs/splide/issues/1185) | Author tabindex is lost | hidden/visible and loop must preserve tabindex -1 |
| S20 | [Splidejs/splide #1359](https://github.com/Splidejs/splide/issues/1359) | aria-hidden retains focus | focused link + fast drag through loop seam |
| S21 | [Splidejs/splide #1289](https://github.com/Splidejs/splide/issues/1289) | Grid thumbnail mapping | click every grid cell and verify logical original index |
| S22 | [Splidejs/splide #408](https://github.com/Splidejs/splide/issues/408) | Firefox image drag and vertical sizing | drag from image/text/link; cancel and vertical fixedHeight |
| SW01 | [nolimits4web/swiper #6559](https://github.com/nolimits4web/swiper/issues/6559) | Auto-width loop center and nth-child | width identity under DOM reorder; style by stable logical index |
| SW02 | [nolimits4web/swiper #7964](https://github.com/nolimits4web/swiper/issues/7964) | Few-slide loop with percentage height | N near perPage; both loop modes and auto |
| SW03 | [nolimits4web/swiper #2942](https://github.com/nolimits4web/swiper/issues/2942) | Free auto-width loop can freeze | fast direction reversals, long speed, freeSnap modes |
| SW04 | [nolimits4web/swiper #6472](https://github.com/nolimits4web/swiper/issues/6472) | Incomplete grouped loop pagination | N 7/8/10, perPage/group 3, arbitrary bullet paths |
| SW05 | [nolimits4web/swiper #7981](https://github.com/nolimits4web/swiper/issues/7981) | Auto widths and group pagination | last bullet → drag → first after changing group |
| SW06 | [nolimits4web/swiper #6113](https://github.com/nolimits4web/swiper/issues/6113) | Loop breakpoints change groups | resize near seam preserving logical identity |
| SW07 | [nolimits4web/swiper #8027](https://github.com/nolimits4web/swiper/issues/8027) | Resize cycles accumulate pagination | 20 round-trip breakpoint cycles |
| SW08 | [nolimits4web/swiper #6263](https://github.com/nolimits4web/swiper/issues/6263) | Navigation handlers duplicate after breakpoints | arrows false/object through breakpoint and enabled cycles |
| SW09 | [nolimits4web/swiper #8171](https://github.com/nolimits4web/swiper/issues/8171) | Grid and fractional visible count | complete page ±1 cell, fractional view or peek |
| SW10 | [nolimits4web/swiper #7870](https://github.com/nolimits4web/swiper/issues/7870) | Grid order changes during loop | multiple full circles with identifiable cards |
| SW11 | [nolimits4web/swiper #8065](https://github.com/nolimits4web/swiper/issues/8065) | Filtering hidden grid slides | display none groups + update + restore |
| SW12 | [nolimits4web/swiper #7702](https://github.com/nolimits4web/swiper/issues/7702) | Deep nested initialization order | three levels, both init orders, same/cross axes |
| SW13 | [nolimits4web/swiper #8118](https://github.com/nolimits4web/swiper/issues/8118) | Thumbnail clicks intermittently ignored | click → tiny drag → click, resize and boundaries |
| SW14 | [nolimits4web/swiper #7614](https://github.com/nolimits4web/swiper/issues/7614) | Autoplay hover at long speed | overlapping hover/focus/visibility reasons |
| SW15 | [nolimits4web/swiper #3846](https://github.com/nolimits4web/swiper/issues/3846) | Autoplay after slide count changes | 1→5→1→0→3, preserve manual stop |
| SW16 | [nolimits4web/swiper #8036](https://github.com/nolimits4web/swiper/issues/8036) | Callbacks after destroy | late autoplay start/media/load/RAF/resize; remount same root |
| SW17 | [nolimits4web/swiper #8078](https://github.com/nolimits4web/swiper/issues/8078) | Vertical fade autoplay scrolls page | check document scroll and focus during autoplay |
| SW18 | [nolimits4web/swiper #7656](https://github.com/nolimits4web/swiper/issues/7656) | Fade flashes on resize | resize/orientation during transition, intermediate frames |
| SW19 | [nolimits4web/swiper #8168](https://github.com/nolimits4web/swiper/issues/8168) | Cube WebKit face rendering | shadows, axes, loop, content, intermediate rotation |
| SW20 | [nolimits4web/swiper #7664](https://github.com/nolimits4web/swiper/issues/7664) | Safari video and text move separately | inline video and text geometry during transition |
| SW21 | [nolimits4web/swiper #6684](https://github.com/nolimits4web/swiper/issues/6684) | Native lazy adjacent preloading | nonzero start, prev/seam, symmetric neighbor loading |
| SW22 | [nolimits4web/swiper #2914](https://github.com/nolimits4web/swiper/issues/2914) | CSS grid/flex oversizing | 1fr/flex ancestor with and without min-width 0 |

## Правила адаптации

- Ожидаемое поведение определяется публичным контрактом Tvist. padding Splide соответствует peek, perMove — slidesPerGroup, snap — freeSnap. autoHeight Tvist относится к естественной высоте вертикальных слайдов.
- Не переносить Swiper virtual/cssMode/grid.fill/nested/coverflow и framework wrappers как обязательные возможности Tvist. keyboard и некоторые shadow/crossFade настройки у Tvist документированы как неработающие: это ограничения, а не автоматически подтверждённые регрессии.
- Swiper #6559 связан с CSS :nth-child при перестановке DOM. В fixtures сохранять размеры по data-tvist-slide-index. Репорт #7857 исключён из каталога как синтаксическая ошибка исходного примера.
- Loop:true у Tvist может автоматически перейти на клоны при малом количестве слайдов. Формы, вложенные слайдеры, медиа и события проверять в явном clone-режиме и при автоматическом переходе.
- Независимые browser assertions используют фактические DOM-границы, идентичность содержимого, публичные события и controls; не сравнивают приватную функцию с другим результатом того же движка.
- Новый media corpus использует локальные data-изображения и контролируемые HTMLMediaElement события. Такие проверки обнаруживают ошибки состояния/подписок, но не доказывают работу кодеков, реальное видео и compositor Safari/iOS.
- Пользователь ограничил эту работу доступной автоматизацией: Chromium, Firefox, WebKit и мобильная эмуляция. Реальные устройства не считаются проверенными.

## Заимствование и проверка качества

Embla, egjs-flicking, Glide, react-slick и Splide полезны как источники идей и fixtures. При буквальном переносе существенного MIT-кода сохранять copyright/permission notices и SHA источника. Flickity имеет GPL-3.0 в проверенном package.json: здесь используются только самостоятельно реализованные идеи.

Полезные первоисточники инфраструктуры: [fast-check model based testing](https://fast-check.dev/docs/advanced/model-based-testing/), [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing/), [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). Автоматические a11y-проверки не являются полной сертификацией доступности.

В исходном Tvist обнаружены диагностические тесты без assertions, stub-only observer mocks и factory-probes, переписывающий вызовы функций. Они дополняются проверками собранной библиотеки. Базовый прогон перед аудитом: 114 файлов, 1212 passed, 1 skipped; четыре существующие браузерные регрессии прошли в трёх engines (12 запусков). Это начальное состояние, а не результат нового полного аудита.
