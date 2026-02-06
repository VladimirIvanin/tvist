/**
 * Константы Tvist
 * Версия в имени класса/переменной позволяет использовать несколько версий в одной странице (браузер, без модулей)
 */

/** Основная версия из semver (major). Используется для префикса CSS и имени глобальной переменной в браузере */
export const TVIST_VERSION_MAJOR = 0

/** Префикс BEM-блока для CSS: tvist-v0 → .tvist-v0, .tvist-v0__container, .tvist-v0__slide */
export const TVIST_CSS_PREFIX = `tvist-v${TVIST_VERSION_MAJOR}` as const

const P = TVIST_CSS_PREFIX

/**
 * Карта BEM-классов. Использовать для селекторов и classList, чтобы не дублировать строки.
 * @example
 * querySelector(`.${TVIST_CLASSES.container}`)
 * element.classList.add(TVIST_CLASSES.slideActive)
 */
export const TVIST_CLASSES = {
  block: P,
  container: `${P}__container`,
  slide: `${P}__slide`,
  vertical: `${P}--vertical`,
  disabled: `${P}--disabled`,
  dragging: `${P}--dragging`,
  locked: `${P}--locked`,
  nav: `${P}--nav`,
  cube: `${P}--cube`,

  scrollbar: `${P}__scrollbar`,
  scrollbarHorizontal: `${P}__scrollbar--horizontal`,
  scrollbarVertical: `${P}__scrollbar--vertical`,
  scrollbarHidden: `${P}__scrollbar--hidden`,
  scrollbarDragging: `${P}__scrollbar--dragging`,
  scrollbarTrack: `${P}__scrollbar-track`,
  scrollbarThumb: `${P}__scrollbar-thumb`,

  arrowPrev: `${P}__arrow--prev`,
  arrowNext: `${P}__arrow--next`,

  pagination: `${P}__pagination`,
  bullet: `${P}__bullet`,
  paginationCurrent: `${P}__pagination-current`,
  paginationSeparator: `${P}__pagination-separator`,
  paginationTotal: `${P}__pagination-total`,
  paginationProgress: `${P}__pagination-progress`,
  paginationProgressBar: `${P}__pagination-progress-bar`,

  slideActive: `${P}__slide--active`,
  slidePrev: `${P}__slide--prev`,
  slideNext: `${P}__slide--next`,
  slideVisible: `${P}__slide--visible`,
  slideClone: `${P}__slide--clone`,
  slideMarqueeClone: `${P}__slide--marquee-clone`,
  slideNavActive: `${P}__slide--nav-active`,

  slideGridPage: `${P}__slide--grid-page`,
  gridRow: `${P}__grid-row`,
  gridCol: `${P}__grid-col`,
  gridItem: `${P}__grid-item`,

  shadow: `${P}-shadow`,
} as const
