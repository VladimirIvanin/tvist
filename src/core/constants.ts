/**
 * Константы Tvist
 * Версия в имени класса/переменной позволяет использовать несколько версий в одной странице (браузер, без модулей)
 */

import pkg from '../../package.json' with { type: 'json' }

/** Основная версия из semver (major). Используется для префикса CSS и имени глобальной переменной в браузере */
const versionStr = String(pkg?.version ?? '0.0.0')
export const TVIST_VERSION_MAJOR = parseInt(versionStr.split('.')[0] ?? '0', 10) || 0

/** Префикс BEM-блока для CSS: tvist-v1 → .tvist-v1, .tvist-v1__container, .tvist-v1__slide */
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
  draggable: `${P}--draggable`,
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

/**
 * SVG иконка для кнопок навигации (стрелка вправо).
 * Для prev кнопки поворачивается через CSS: transform: rotate(180deg)
 * Использует currentColor для автоматического наследования цвета от родителя
 */
export const NAVIGATION_ARROW_SVG = `<svg class="${P}__arrow-icon" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor"/></svg>` as const
