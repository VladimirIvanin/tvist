import type { TvistOptions } from '../core/types'

/**
 * Преобразует значение gap в CSS-строку для margin.
 * Число → `${n}px`, строка передаётся как есть (rem, em, %, px и т.д.).
 * Пустое/нулевое значение → пустая строка (margin не устанавливается).
 */
export function gapCssForMargin(value: string | number | undefined): string {
  if (value === undefined || value === 0 || value === '') return ''
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * Читает вычисленный браузером margin в пикселях с элемента.
 * Используется как fallback для редких CSS-единиц (vw, vh и т.д.).
 * Для rem/em/% Engine вычисляет значение напрямую без DOM-запроса.
 *
 * @param slide - слайд трека (с уже применённым margin)
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
 * Межстраничный зазор для grid в виде CSS-строки.
 * Поддерживает rem, em, %, px и любые другие CSS-единицы.
 * Логика: если задан глобальный `gap` — берём его, иначе fallback из `grid.gap` по оси трека.
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
