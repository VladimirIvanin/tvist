/**
 * Выборка слайдов контейнера для экземпляра Tvist (без слайдов вложенных слайдеров).
 */

import { TVIST_CLASSES } from './constants'

/**
 * Слайд участвует в расчётах layout, если он не скрыт через CSS `display: none`
 * (аналогично {@link https://github.com/nolimits4web/swiper | Swiper}: `updateSlides` пропускает такие узлы).
 */
function isSlideIncludedInLayout(slide: HTMLElement): boolean {
  return globalThis.getComputedStyle(slide).display !== 'none'
}

/**
 * Слайды контейнера, принадлежащие экземпляру с root-элементом `root`.
 * Не включает `.slide` внутри вложенного Tvist (ближайший `TVIST_CLASSES.block` не совпадает с `root`).
 *
 * Режим **grid**: {@link GridModule} снимает класс `slide` с ячеек и оставляет его только у
 * wrapper-страниц (`slideGridPage`), поэтому здесь по-прежнему собираются именно «страницы», а не внутренние ячейки.
 *
 * Слайды с computed `display: none` (внешние стили, класс, inline) в список не попадают.
 */
export function getSlidesInTvistRoot(
  container: HTMLElement,
  root: HTMLElement
): HTMLElement[] {
  const blockSel = `.${TVIST_CLASSES.block}`
  const slideSel = `.${TVIST_CLASSES.slide}`
  return Array.from(container.querySelectorAll<HTMLElement>(slideSel)).filter(
    (el) => el.closest(blockSel) === root && isSlideIncludedInLayout(el)
  )
}
