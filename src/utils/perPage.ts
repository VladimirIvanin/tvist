import type { TvistOptions } from '../core/types'

/**
 * Числовое `perPage` для расчётов в модулях и движке.
 * После `Engine.resolvePerPage` в `options.perPage` всегда лежит число.
 */
export function getOptionsPerPage(options: TvistOptions): number {
  const p = options.perPage
  return typeof p === 'number' ? p : 1
}
