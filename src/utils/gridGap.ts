import type { TvistOptions } from '../core/types'

/**
 * Число пикселей для margin/gap (число или строка вроде "12" / "12px").
 * Не используйте для rem/em — они дадут неверный результат.
 * Для произвольных CSS-единиц используйте resolveGapToPixels.
 */
export function gapToPixels(value: string | number): number {
  if (typeof value === 'number') return value
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * Преобразует значение gap в CSS-строку для margin.
 * Число → `${n}px`, строка передаётся как есть (rem, em, %, px и т.д.).
 */
export function gapCssForMargin(value: string | number | undefined): string {
  if (value === undefined || value === 0 || value === '') return ''
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * Читает вычисленный браузером gap в пикселях с первого слайда.
 * После того как margin задан через gapCssForMargin, computed style уже в px
 * (браузер сам переводит rem/em/% в абсолютные пиксели).
 *
 * @param slide - первый слайд трека (с которого читаем margin)
 * @param direction - направление слайдера
 */
export function resolveGapToPixels(
  slide: HTMLElement,
  direction: 'horizontal' | 'vertical'
): number {
  const prop = direction === 'vertical' ? 'marginBottom' : 'marginRight'
  const computed = window.getComputedStyle(slide)[prop]
  return parseFloat(computed) || 0
}

/**
 * Отступ сетки по оси (ряд / колонка), с теми же правилами, что в GridModule.
 */
export function resolveGridGapForAxis(
  grid: NonNullable<TvistOptions['grid']>,
  globalGap: number,
  axis: 'row' | 'col'
): number {
  const gridGap = grid.gap

  if (gridGap === undefined) {
    return gapToPixels(globalGap)
  }

  if (typeof gridGap === 'object') {
    const raw = gridGap[axis] ?? globalGap
    return gapToPixels(raw)
  }

  return gapToPixels(gridGap)
}

/**
 * Отступ между «страницами» трека при grid: если глобальный gap = 0, используем
 * колоночный компонент grid.gap (горизонталь) или строчный (вертикаль).
 */
export function resolveGridGapForTrack(
  grid: TvistOptions['grid'] | undefined,
  direction: 'horizontal' | 'vertical',
  globalGap: number
): number {
  if (!grid) return 0

  const axis = direction === 'horizontal' ? 'col' : 'row'
  const gridGap = grid.gap

  if (gridGap === undefined) {
    return 0
  }

  if (typeof gridGap === 'object') {
    const raw = gridGap[axis] ?? globalGap
    return gapToPixels(raw)
  }

  return gapToPixels(gridGap)
}

/**
 * Межстраничный зазор для grid: глобальный `gap`, иначе fallback из `grid.gap` по оси трека.
 * Возвращает число в px (только для числовых значений и строк вида "12px").
 * Для rem/em используйте resolveTrackGapCssFromOptions + computed style.
 * @deprecated Предпочтительнее resolveTrackGapCssFromOptions для поддержки rem/em.
 */
export function resolveTrackGapFromOptions(options: TvistOptions): number {
  const g = options.gap ?? 0
  if (g !== 0) return gapToPixels(g)

  const direction =
    options.direction === 'vertical' ? 'vertical' : 'horizontal'
  return resolveGridGapForTrack(options.grid, direction, 0)
}

/**
 * Межстраничный зазор для grid в виде CSS-строки.
 * Поддерживает rem, em, %, px и любые другие CSS-единицы.
 * Используется GridModule для установки margin между wrapper-слайдами.
 */
export function resolveTrackGapCssFromOptions(options: TvistOptions): string {
  const g = options.gap
  if (g !== undefined && g !== 0 && g !== '') {
    return gapCssForMargin(g)
  }

  const direction =
    options.direction === 'vertical' ? 'vertical' : 'horizontal'
  const axis = direction === 'horizontal' ? 'col' : 'row'
  const grid = options.grid
  if (!grid) return ''

  const gridGap = grid.gap
  if (gridGap === undefined) return ''

  if (typeof gridGap === 'object') {
    const raw = gridGap[axis]
    return raw !== undefined ? gapCssForMargin(raw) : ''
  }

  return gapCssForMargin(gridGap)
}
