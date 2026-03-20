import type { TvistOptions } from '../core/types'

/**
 * Число пикселей для margin/gap (число или строка вроде "12" / "12px").
 */
export function gapToPixels(value: string | number): number {
  if (typeof value === 'number') return value
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
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
 * Используется GridModule (margin между страницами) и DragModule (slideWithGap).
 * Engine опирается только на `options.gap` и не вызывает эту функцию — позиции grid
 * выравниваются по DOM в {@link GridModule.fixEnginePositions}.
 */
export function resolveTrackGapFromOptions(options: TvistOptions): number {
  const g = options.gap ?? 0
  if (g !== 0) return g

  const direction =
    options.direction === 'vertical' ? 'vertical' : 'horizontal'
  return resolveGridGapForTrack(options.grid, direction, g)
}
